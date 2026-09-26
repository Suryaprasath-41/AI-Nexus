import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getProvider, ProviderError } from '@/lib/providers'
import type { ChatMessage } from '@/lib/providers'
import { resolveApiKey, checkPlatformQuota, getUserPlanLimits, recordUsage, type ApiSource } from '@/lib/usage'
import { logSystem } from '@/lib/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/chat — streaming chat completion (Server-Sent Events).
 *
 * Body:
 *   conversationId, providerId, modelId, messages: ChatMessage[],
 *   apiSource: 'platform' | 'byok', temperature, maxTokens
 *
 * Emits SSE lines:
 *   data: {"type":"start","messageId":"..."}
 *   data: {"type":"delta","delta":"..."}
 *   data: {"type":"usage","inputTokens":N,"outputTokens":N,"cost":N,"source":"platform"}
 *   data: {"type":"done"}
 *   data: {"type":"error","message":"...","code":"...","actions":[...]}
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const body = await req.json().catch(() => null)
  if (!body) return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const { conversationId, providerId, modelId, messages, temperature, maxTokens } = body as {
    conversationId?: string
    providerId: string
    modelId: string
    messages: ChatMessage[]
    temperature?: number
    maxTokens?: number
  }
  const apiSource: ApiSource = body.apiSource === 'byok' ? 'byok' : 'platform'

  if (!providerId || !modelId || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'providerId, modelId and messages are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const provider = await db.provider.findUnique({ where: { id: providerId } })
  const model = await db.model.findFirst({ where: { id: modelId, providerId } })
  if (!provider || provider.status !== 'active') {
    return new Response(JSON.stringify({ error: 'This provider is currently unavailable.' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }
  if (!model || model.status !== 'active') {
    return new Response(JSON.stringify({ error: 'This model is currently unavailable.' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }

  // Quota check for platform source
  const { limits } = await getUserPlanLimits(user.id)
  if (apiSource === 'platform') {
    const quota = await checkPlatformQuota(user.id, providerId, limits)
    if (!quota.ok) {
      const actions =
        quota.reason === 'provider_not_allowed'
          ? ['upgrade']
          : ['byok', 'upgrade', 'switch_model']
      const payload = JSON.stringify({ type: 'error', message: quota.message ?? 'Quota exceeded.', code: quota.reason, actions })
      return new Response(`data: ${payload}\n\ndata: [DONE]\n\n`, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      })
    }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      // persist the user message if conversation exists
      let conversation: { id: string } | null = null
      if (conversationId) {
        conversation = await db.conversation.findFirst({ where: { id: conversationId, userId: user.id } })
        if (conversation) {
          const lastUserMsg = messages[messages.length - 1]
          if (lastUserMsg && lastUserMsg.role === 'user') {
            await db.message.create({
              data: {
                conversationId: conversation.id,
                role: 'user',
                content: lastUserMsg.content,
                apiSource,
                providerId,
                modelName: model.modelName,
                status: 'complete',
              },
            })
            // auto-title from first user message
            const count = await db.message.count({ where: { conversationId: conversation.id } })
            if (count === 1) {
              await db.conversation.update({ where: { id: conversation.id }, data: { title: lastUserMsg.content.slice(0, 60), providerId, modelId, apiSource } })
            } else {
              await db.conversation.update({ where: { id: conversation.id }, data: { providerId, modelId, apiSource, updatedAt: new Date() } })
            }
          }
        }
      }

      // Create the assistant message placeholder
      const assistantMessage = conversation
        ? await db.message.create({
            data: {
              conversationId: conversation.id,
              role: 'assistant',
              content: '',
              apiSource,
              providerId,
              modelName: model.modelName,
              status: 'streaming',
            },
          })
        : null

      send({ type: 'start', messageId: assistantMessage?.id })

      // resolve credential
      let apiKey: string
      try {
        const res = await resolveApiKey(user.id, providerId, apiSource)
        apiKey = res.apiKey
      } catch (e) {
        const err = e as ProviderError
        send({ type: 'error', message: err.message, code: err.code, actions: err.code === 'no_byok_key' ? ['byok', 'switch_model'] : ['switch_model'] })
        if (assistantMessage) await db.message.update({ where: { id: assistantMessage.id }, data: { status: 'error', errorMessage: err.message } })
        await recordUsage({ userId: user.id, providerId, modelName: model.modelName, modelId: model.id, apiSource, inputTokens: 0, outputTokens: 0, status: 'error', errorMessage: err.message, conversationId: conversation?.id })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
        return
      }

      const adapter = getProvider(provider)
      let fullContent = ''
      let inputTokens = 0
      let outputTokens = 0
      let latencyMs = 0
      let errorMessage: string | null = null
      let errCode = 'provider_error'

      try {
        const res = await adapter.streamMessage(
          { model: model.modelName, messages, temperature, maxTokens, stream: true },
          apiKey,
          (chunk) => {
            if (chunk.delta) {
              fullContent += chunk.delta
              send({ type: 'delta', delta: chunk.delta })
            }
          }
        )
        inputTokens = res.inputTokens
        outputTokens = res.outputTokens
        latencyMs = res.latencyMs
      } catch (e) {
        const err = e as ProviderError
        errorMessage = err.message
        errCode = err.code
        if (err.code === 'auth_error') {
          errorMessage = `Your ${provider.displayName} API key could not be authenticated. Please verify it in Settings → API Keys.`
        } else if (err.code === 'rate_limited') {
          errorMessage = `${provider.displayName} is rate-limiting requests. Please wait a moment and try again.`
        }
      }

      // Health signal
      if (errorMessage) {
        await db.providerHealth.create({ data: { providerId, status: errCode === 'auth_error' ? 'operational' : 'degraded', message: errorMessage } }).catch(() => {})
      } else {
        await db.providerHealth.create({ data: { providerId, status: 'operational', latencyMs } }).catch(() => {})
      }

      const cost = (inputTokens / 1_000_000) * model.inputPrice + (outputTokens / 1_000_000) * model.outputPrice

      if (errorMessage) {
        send({ type: 'error', message: errorMessage, code: errCode, actions: ['switch_model'] })
        if (assistantMessage) {
          await db.message.update({ where: { id: assistantMessage.id }, data: { status: 'error', errorMessage } })
        }
        await recordUsage({ userId: user.id, providerId, modelName: model.modelName, modelId: model.id, apiSource, inputTokens, outputTokens, status: 'error', errorMessage, conversationId: conversation?.id })
        await logSystem('warn', 'provider', `${provider.name} chat error: ${errorMessage}`, { code: errCode })
      } else {
        send({ type: 'usage', inputTokens, outputTokens, cost: Math.round(cost * 1_000_000) / 1_000_000, source: apiSource, latencyMs, model: model.displayName, provider: provider.displayName })
        if (assistantMessage) {
          await db.message.update({
            where: { id: assistantMessage.id },
            data: { content: fullContent, status: 'complete', inputTokens, outputTokens, latencyMs },
          })
        }
        await recordUsage({ userId: user.id, providerId, modelName: model.modelName, modelId: model.id, apiSource, inputTokens, outputTokens, status: 'success', conversationId: conversation?.id, estimatedCost: cost })
        send({ type: 'done' })
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

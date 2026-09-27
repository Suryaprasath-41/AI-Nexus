import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getProvider, ProviderError } from '@/lib/providers'
import type { ChatMessage } from '@/lib/providers'
import { resolveApiKey, checkPlatformQuota, getUserPlanLimits, recordUsage, type ApiSource } from '@/lib/usage'
import { logSystem } from '@/lib/log'
import type { Provider, Model } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface FallbackCandidate {
  provider: Provider
  model: Model
  apiKey: string
  source: ApiSource
}

async function getFallbackCandidates(
  userId: string,
  excludeProviderId: string,
  preferredSource: ApiSource
): Promise<FallbackCandidate[]> {
  const providers = await db.provider.findMany({
    where: { status: 'active', id: { not: excludeProviderId } },
    include: { models: { where: { status: 'active' } } },
  })

  // Priority order: Groq (ultra fast, high limits), DeepSeek (deep reasoning, high throughput), OpenAI, Anthropic, Gemini, Mistral, Qwen
  const priorityOrder = ['groq', 'deepseek', 'openai', 'anthropic', 'gemini', 'mistral', 'qwen']
  providers.sort((a, b) => {
    const ia = priorityOrder.indexOf(a.name)
    const ib = priorityOrder.indexOf(b.name)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  const candidates: FallbackCandidate[] = []

  for (const prov of providers) {
    if (!prov.models.length) continue

    const candidateModel =
      prov.name === 'groq'
        ? (prov.models.find((m) => m.modelName === 'openai/gpt-oss-120b') || prov.models.find((m) => m.modelName === 'openai/gpt-oss-20b') || prov.models[0])
        : (prov.models.find((m) => m.tags?.includes('fast')) || prov.models.find((m) => m.tags?.includes('flagship')) || prov.models[0])

    const sourcesToTry: ApiSource[] = preferredSource === 'byok' ? ['byok', 'platform'] : ['platform', 'byok']
    for (const src of sourcesToTry) {
      try {
        const resolved = await resolveApiKey(userId, prov.id, src)
        if (resolved.apiKey) {
          candidates.push({
            provider: prov,
            model: candidateModel,
            apiKey: resolved.apiKey,
            source: resolved.source,
          })
          break
        }
      } catch {
        // no key for this source, continue
      }
    }
  }

  return candidates
}

/**
 * POST /api/chat — streaming chat completion with Automatic Limit Fallback.
 *
 * When an AI API key runs out of credits, hits rate limits, or exceeds quota:
 * The server automatically switches to another available AI (e.g. OpenAI -> Groq -> DeepSeek)
 * to ensure project creation and chat completions are finished without interruption.
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
    autoFallback?: boolean
  }
  const apiSource: ApiSource = body.apiSource === 'byok' ? 'byok' : 'platform'
  const autoFallback = body.autoFallback !== false

  if (!providerId || !modelId || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'providerId, modelId and messages are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const provider = await db.provider.findFirst({
    where: {
      OR: [{ id: providerId }, { name: providerId }],
    },
  })
  if (!provider || provider.status !== 'active') {
    return new Response(JSON.stringify({ error: 'This provider is currently unavailable.' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }
  const model = await db.model.findFirst({
    where: {
      providerId: provider.id,
      OR: [{ id: modelId }, { modelName: modelId }],
    },
  })
  if (!model || model.status !== 'active') {
    return new Response(JSON.stringify({ error: 'This model is currently unavailable.' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }

  // Quota check for platform source
  const { limits } = await getUserPlanLimits(user.id)
  let initialQuotaExceeded = false
  if (apiSource === 'platform') {
    const quota = await checkPlatformQuota(user.id, provider.id, limits)
    if (!quota.ok) {
      initialQuotaExceeded = true
      if (!autoFallback) {
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
                providerId: provider.id,
                modelName: model.modelName,
                status: 'complete',
              },
            })
            // auto-title from first user message
            const count = await db.message.count({ where: { conversationId: conversation.id } })
            if (count === 1) {
              await db.conversation.update({ where: { id: conversation.id }, data: { title: lastUserMsg.content.slice(0, 60), providerId: provider.id, modelId: model.id, apiSource } })
            } else {
              await db.conversation.update({ where: { id: conversation.id }, data: { providerId: provider.id, modelId: model.id, apiSource, updatedAt: new Date() } })
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
              providerId: provider.id,
              modelName: model.modelName,
              status: 'streaming',
            },
          })
        : null

      send({ type: 'start', messageId: assistantMessage?.id })

      // Build list of provider attempts (primary + fallbacks)
      interface Attempt {
        provider: typeof provider
        model: typeof model
        apiKey: string
        source: ApiSource
        isFallback: boolean
      }

      const attempts: Attempt[] = []

      // If initial quota was not exceeded, try resolving the primary provider key
      if (!initialQuotaExceeded) {
        try {
          const res = await resolveApiKey(user.id, provider.id, apiSource)
          if (res.apiKey) {
            attempts.push({
              provider,
              model,
              apiKey: res.apiKey,
              source: res.source,
              isFallback: false,
            })
          }
        } catch (e) {
          if (!autoFallback) {
            const err = e as ProviderError
            send({ type: 'error', message: err.message, code: err.code, actions: err.code === 'no_byok_key' ? ['byok', 'switch_model'] : ['switch_model'] })
            if (assistantMessage) await db.message.update({ where: { id: assistantMessage.id }, data: { status: 'error', errorMessage: err.message } })
            await recordUsage({ userId: user.id, providerId: provider.id, modelName: model.modelName, modelId: model.id, apiSource, inputTokens: 0, outputTokens: 0, status: 'error', errorMessage: err.message, conversationId: conversation?.id })
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            return
          }
        }
      }

      // If autoFallback is enabled, populate fallback alternatives
      if (autoFallback) {
        const fallbacks = await getFallbackCandidates(user.id, provider.id, apiSource)
        for (const fb of fallbacks) {
          attempts.push({
            provider: fb.provider,
            model: fb.model,
            apiKey: fb.apiKey,
            source: fb.source,
            isFallback: true,
          })
        }
      }

      if (attempts.length === 0) {
        const msg = 'No working API credentials found for any available AI provider. Please configure an API key in Settings → API Keys.'
        send({ type: 'error', message: msg, code: 'no_credentials', actions: ['byok'] })
        if (assistantMessage) await db.message.update({ where: { id: assistantMessage.id }, data: { status: 'error', errorMessage: msg } })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
        return
      }

      let activeProvider = provider
      let activeModel = model
      let activeSource = apiSource
      let fullContent = ''
      let inputTokens = 0
      let outputTokens = 0
      let latencyMs = 0
      let succeeded = false
      let lastErrorMessage = ''
      let lastErrCode = 'provider_error'
      let fallbackEventSent = false

      for (let i = 0; i < attempts.length; i++) {
        const attempt = attempts[i]

        if (attempt.isFallback) {
          fallbackEventSent = true
          send({
            type: 'fallback',
            fromProvider: activeProvider.displayName,
            fromModel: activeModel.displayName,
            toProvider: attempt.provider.displayName,
            toModel: attempt.model.displayName,
            toProviderId: attempt.provider.id,
            reason: `${activeProvider.displayName} API limit/quota was reached. Switched to ${attempt.provider.displayName} (${attempt.model.displayName}) to finish your project seamlessly.`,
          })

          if (fullContent.length < 100) {
            // Very early failure: clean reset to stream full answer from fallback
            fullContent = ''
          } else {
            // Already generated partial answer: append note and continue
            const transitionNote = `\n\n> ⚡ *[Switched to ${attempt.provider.displayName} (${attempt.model.displayName}) — previous AI reached limit]*\n\n`
            fullContent += transitionNote
            send({ type: 'delta', delta: transitionNote })
          }

          activeProvider = attempt.provider
          activeModel = attempt.model
          activeSource = attempt.source
        }

        const startAttempt = Date.now()
        try {
          const adapter = getProvider(attempt.provider)
          const requestMessages = fullContent.length > 0 && attempt.isFallback
            ? [
                ...messages,
                { role: 'assistant' as const, content: fullContent },
                { role: 'user' as const, content: 'Please continue and complete the remaining response from where it left off.' }
              ]
            : messages

          const res = await adapter.streamMessage(
            { model: attempt.model.modelName, messages: requestMessages, temperature, maxTokens, stream: true },
            attempt.apiKey,
            (chunk) => {
              if (chunk.delta) {
                fullContent += chunk.delta
                send({ type: 'delta', delta: chunk.delta })
              }
            }
          )

          inputTokens += res.inputTokens
          outputTokens += res.outputTokens
          latencyMs += (Date.now() - startAttempt)
          succeeded = true

          await db.providerHealth.create({
            data: { providerId: attempt.provider.id, status: 'operational', latencyMs: res.latencyMs }
          }).catch(() => {})

          break
        } catch (e) {
          const err = e as ProviderError
          lastErrorMessage = err.message || 'Unknown error'
          lastErrCode = err.code || 'provider_error'

          await db.providerHealth.create({
            data: {
              providerId: attempt.provider.id,
              status: lastErrCode === 'auth_error' ? 'operational' : 'degraded',
              message: lastErrorMessage
            }
          }).catch(() => {})

          await logSystem('warn', 'provider', `${attempt.provider.name} stream error: ${lastErrorMessage}`, { code: lastErrCode })

          if (!autoFallback) break
        }
      }

      if (!succeeded) {
        send({ type: 'error', message: lastErrorMessage, code: lastErrCode, actions: ['switch_model', 'byok'] })
        if (assistantMessage) {
          await db.message.update({ where: { id: assistantMessage.id }, data: { status: 'error', errorMessage: lastErrorMessage } })
        }
        await recordUsage({
          userId: user.id,
          providerId: activeProvider.id,
          modelName: activeModel.modelName,
          modelId: activeModel.id,
          apiSource: activeSource,
          inputTokens,
          outputTokens,
          status: 'error',
          errorMessage: lastErrorMessage,
          conversationId: conversation?.id
        })
      } else {
        const cost = (inputTokens / 1_000_000) * activeModel.inputPrice + (outputTokens / 1_000_000) * activeModel.outputPrice
        send({
          type: 'usage',
          inputTokens,
          outputTokens,
          cost: Math.round(cost * 1_000_000) / 1_000_000,
          source: activeSource,
          latencyMs,
          model: activeModel.displayName,
          provider: activeProvider.displayName
        })

        if (assistantMessage) {
          await db.message.update({
            where: { id: assistantMessage.id },
            data: {
              content: fullContent,
              status: 'complete',
              inputTokens,
              outputTokens,
              latencyMs,
              providerId: activeProvider.id,
              modelName: activeModel.modelName,
              apiSource: activeSource,
            },
          })
        }

        if (conversation && fallbackEventSent) {
          await db.conversation.update({
            where: { id: conversation.id },
            data: {
              providerId: activeProvider.id,
              modelId: activeModel.id,
              apiSource: activeSource,
              updatedAt: new Date()
            }
          }).catch(() => {})
        }

        await recordUsage({
          userId: user.id,
          providerId: activeProvider.id,
          modelName: activeModel.modelName,
          modelId: activeModel.id,
          apiSource: activeSource,
          inputTokens,
          outputTokens,
          status: 'success',
          conversationId: conversation?.id,
          estimatedCost: cost
        })

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

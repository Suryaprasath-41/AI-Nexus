import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProvider, ProviderError, type ChatMessage } from '@/lib/providers'
import { resolveApiKey, recordUsage, getUserPlanLimits, type ApiSource } from '@/lib/usage'

export const runtime = 'nodejs'

/**
 * POST /api/compare — send one prompt to multiple selected models, return all responses.
 * Each model is fetched concurrently. BYOK or platform source per selection.
 *
 * Body: { prompt: string, selections: [{ providerId, modelId, apiSource }] }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { limits } = await getUserPlanLimits(user.id)
  if (!limits.compareAccess) {
    return NextResponse.json({ error: 'AI Comparison is available on the Pro plan and above. Upgrade to compare models side-by-side.', code: 'plan_required' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const prompt = String(body.prompt || '').trim()
  const selections: Array<{ providerId: string; modelId: string; apiSource: ApiSource }> = Array.isArray(body.selections) ? body.selections : []
  if (!prompt || selections.length === 0) {
    return NextResponse.json({ error: 'prompt and selections are required' }, { status: 400 })
  }
  if (selections.length > 4) {
    return NextResponse.json({ error: 'You can compare up to 4 models at once.' }, { status: 400 })
  }

  const messages: ChatMessage[] = [{ role: 'user', content: prompt }]

  const results = await Promise.all(
    selections.map(async (sel) => {
      const start = Date.now()
      try {
        const provider = await db.provider.findUnique({ where: { id: sel.providerId } })
        const model = await db.model.findFirst({ where: { id: sel.modelId, providerId: sel.providerId } })
        if (!provider || !model) throw new ProviderError('Provider or model not found', 404)
        const { apiKey } = await resolveApiKey(user.id, sel.providerId, sel.apiSource)
        const adapter = getProvider(provider)
        const res = await adapter.sendMessage({ model: model.modelName, messages, temperature: 0.7 }, apiKey)
        const cost = (res.inputTokens / 1_000_000) * model.inputPrice + (res.outputTokens / 1_000_000) * model.outputPrice
        await recordUsage({ userId: user.id, providerId: provider.id, modelName: model.modelName, modelId: model.id, apiSource: sel.apiSource, inputTokens: res.inputTokens, outputTokens: res.outputTokens, status: 'success', estimatedCost: cost })
        return {
          providerId: provider.id,
          provider: provider.displayName,
          color: provider.color,
          modelId: model.id,
          model: model.displayName,
          apiSource: sel.apiSource,
          content: res.content,
          inputTokens: res.inputTokens,
          outputTokens: res.outputTokens,
          latencyMs: Date.now() - start,
          cost: Math.round(cost * 1_000_000) / 1_000_000,
          status: 'success' as const,
        }
      } catch (e) {
        const err = e as ProviderError
        await recordUsage({ userId: user.id, providerId: sel.providerId, modelName: '', apiSource: sel.apiSource, inputTokens: 0, outputTokens: 0, status: 'error', errorMessage: err.message }).catch(() => {})
        return {
          providerId: sel.providerId,
          provider: '',
          color: '#888',
          modelId: sel.modelId,
          model: '',
          apiSource: sel.apiSource,
          content: '',
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - start,
          cost: 0,
          status: 'error' as const,
          errorMessage: err.message,
        }
      }
    })
  )

  return NextResponse.json({ results })
}

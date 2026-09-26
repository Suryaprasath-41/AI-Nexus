/**
 * Credential resolution & quota enforcement.
 *
 * Flow (per spec §5, §6, §27, §28):
 *   1. Determine API source (platform | byok)
 *   2. If BYOK  -> decrypt user's stored key, allow (subject to provider limits)
 *   3. If Platform -> check subscription plan limits, then use platform credential
 *   4. Execute, record usage, return
 */
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { ProviderError } from '@/lib/providers'

export type ApiSource = 'platform' | 'byok'

export interface PlanLimits {
  monthlyRequests: number
  maxTokens: number
  maxApiKeys: number
  maxConversations: number
  maxFileSizeMb: number
  compareAccess: boolean
  routerAccess: boolean
  priorityProcessing: boolean
  availableProviders: string[] | null // null = all
}

export const DEFAULT_FREE_LIMITS: PlanLimits = {
  monthlyRequests: 100,
  maxTokens: 100000,
  maxApiKeys: 10,
  maxConversations: 50,
  maxFileSizeMb: 5,
  compareAccess: false,
  routerAccess: false,
  priorityProcessing: false,
  availableProviders: null,
}

export function parsePlanLimits(limitsJson: string | null | undefined): PlanLimits {
  if (!limitsJson) return { ...DEFAULT_FREE_LIMITS }
  try {
    return { ...DEFAULT_FREE_LIMITS, ...(JSON.parse(limitsJson) as Partial<PlanLimits>) }
  } catch {
    return { ...DEFAULT_FREE_LIMITS }
  }
}

export async function getUserPlanLimits(userId: string): Promise<{ plan: { name: string; displayName: string; id: string } | null; limits: PlanLimits }> {
  const user = await db.user.findUnique({ where: { id: userId }, include: { plan: true } })
  if (!user?.plan) return { plan: null, limits: { ...DEFAULT_FREE_LIMITS } }
  return { plan: { name: user.plan.name, displayName: user.plan.displayName, id: user.plan.id }, limits: parsePlanLimits(user.plan.limitsJson) }
}

/** Count platform requests this month for a user */
export async function getMonthlyPlatformUsage(userId: string): Promise<{ count: number; inputTokens: number; outputTokens: number }> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const rows = await db.usageRecord.aggregate({
    where: { userId, apiSource: 'platform', createdAt: { gte: startOfMonth }, status: 'success' },
    _sum: { inputTokens: true, outputTokens: true },
    _count: true,
  })
  return {
    count: rows._count,
    inputTokens: rows._sum.inputTokens ?? 0,
    outputTokens: rows._sum.outputTokens ?? 0,
  }
}

export interface QuotaCheck {
  ok: boolean
  reason?: 'quota_exceeded' | 'token_limit' | 'provider_not_allowed' | 'no_credential'
  message?: string
  remaining?: number
}

export async function checkPlatformQuota(userId: string, providerId: string, limits: PlanLimits): Promise<QuotaCheck> {
  // provider allowed by plan?
  if (limits.availableProviders && limits.availableProviders.length > 0) {
    const provider = await db.provider.findUnique({ where: { id: providerId } })
    if (provider && !limits.availableProviders.includes(provider.name)) {
      return { ok: false, reason: 'provider_not_allowed', message: 'This provider is not available on your plan.' }
    }
  }
  const usage = await getMonthlyPlatformUsage(userId)
  if (limits.monthlyRequests > 0 && usage.count >= limits.monthlyRequests) {
    return {
      ok: false,
      reason: 'quota_exceeded',
      message: 'Your platform AI quota has been reached.',
      remaining: 0,
    }
  }
  return { ok: true, remaining: Math.max(0, limits.monthlyRequests - usage.count) }
}

/** Resolve the actual API key to use for a request, based on source. */
export async function resolveApiKey(userId: string, providerId: string, source: ApiSource): Promise<{ apiKey: string; source: ApiSource }> {
  if (source === 'byok') {
    const userKey = await db.userApiKey.findFirst({
      where: { userId, providerId, status: 'active', isValid: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    if (!userKey) {
      throw new ProviderError(
        "You don't have a connected API key for this provider. Add your own key in Settings → API Keys, or switch to Platform API.",
        403,
        'no_byok_key'
      )
    }
    await db.userApiKey.update({ where: { id: userKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
    return { apiKey: decrypt(userKey.encryptedKey), source: 'byok' }
  }

  // Platform source: resolve from env first, then DB vault
  const provider = await db.provider.findUnique({ where: { id: providerId } })
  if (!provider) throw new ProviderError('Unknown provider', 404, 'unknown_provider')

  const envName = `PLATFORM_${provider.name.toUpperCase()}_API_KEY`
  const envVal = process.env[envName]
  if (envVal && envVal.trim()) return { apiKey: envVal.trim(), source: 'platform' }

  const cred = await db.platformCredential.findFirst({ where: { providerId, status: 'active' } })
  if (cred) return { apiKey: decrypt(cred.encryptedKey), source: 'platform' }

  throw new ProviderError(
    'Platform API is not configured for this provider. Please use your own API key (BYOK) or ask an administrator to configure platform credentials.',
    503,
    'no_platform_credential'
  )
}

export interface UsageRecordInput {
  userId: string
  providerId: string
  modelName: string
  modelId?: string | null
  apiSource: ApiSource
  inputTokens: number
  outputTokens: number
  status: 'success' | 'error' | 'rate_limited' | 'quota_exceeded'
  errorMessage?: string
  conversationId?: string
  estimatedCost?: number
}

export async function recordUsage(input: UsageRecordInput) {
  const totalTokens = input.inputTokens + input.outputTokens
  let cost = input.estimatedCost ?? 0
  if (!cost && input.modelId) {
    const model = await db.model.findUnique({ where: { id: input.modelId } })
    if (model) {
      cost = (input.inputTokens / 1_000_000) * model.inputPrice + (input.outputTokens / 1_000_000) * model.outputPrice
    }
  }
  return db.usageRecord.create({
    data: {
      userId: input.userId,
      providerId: input.providerId,
      modelName: input.modelName,
      modelId: input.modelId ?? undefined,
      apiSource: input.apiSource,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      totalTokens,
      estimatedCost: Math.round(cost * 1_000_000) / 1_000_000,
      status: input.status,
      errorMessage: input.errorMessage,
      conversationId: input.conversationId,
    },
  })
}

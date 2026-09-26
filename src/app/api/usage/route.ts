import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getUserPlanLimits, getMonthlyPlatformUsage } from '@/lib/usage'

export const runtime = 'nodejs'

/** GET /api/usage — usage dashboard data. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { plan, limits } = await getUserPlanLimits(user.id)
  const month = await getMonthlyPlatformUsage(user.id)

  // last 30 days daily aggregation
  const since = new Date()
  since.setDate(since.getDate() - 29)
  since.setHours(0, 0, 0, 0)
  const records = await db.usageRecord.findMany({
    where: { userId: user.id, createdAt: { gte: since } },
    select: { createdAt: true, apiSource: true, inputTokens: true, outputTokens: true, estimatedCost: true, providerId: true, modelName: true, status: true },
    orderBy: { createdAt: 'asc' },
  })

  // by provider
  const byProvider = new Map<string, { count: number; tokens: number; cost: number }>()
  const bySource = { platform: { count: 0, tokens: 0, cost: 0 }, byok: { count: 0, tokens: 0, cost: 0 } }
  const daily: Record<string, { date: string; platform: number; byok: number; cost: number }> = {}
  let totalCost = 0
  let totalRequests = 0
  for (const r of records) {
    totalCost += r.estimatedCost
    totalRequests += 1
    const tokens = r.inputTokens + r.outputTokens
    const pKey = r.providerId
    const p = byProvider.get(pKey) ?? { count: 0, tokens: 0, cost: 0 }
    p.count += 1
    p.tokens += tokens
    p.cost += r.estimatedCost
    byProvider.set(pKey, p)

    if (r.apiSource === 'platform') {
      bySource.platform.count += 1
      bySource.platform.tokens += tokens
      bySource.platform.cost += r.estimatedCost
    } else {
      bySource.byok.count += 1
      bySource.byok.tokens += tokens
      bySource.byok.cost += r.estimatedCost
    }

    const day = r.createdAt.toISOString().slice(0, 10)
    if (!daily[day]) daily[day] = { date: day, platform: 0, byok: 0, cost: 0 }
    if (r.apiSource === 'platform') daily[day].platform += 1
    else daily[day].byok += 1
    daily[day].cost += r.estimatedCost
  }

  // attach provider names
  const providerIds = Array.from(byProvider.keys())
  const providers = providerIds.length ? await db.provider.findMany({ where: { id: { in: providerIds } }, select: { id: true, displayName: true, color: true } }) : []
  const providerMap = new Map(providers.map((p) => [p.id, p]))

  return NextResponse.json({
    plan: plan ? { name: plan.name, displayName: plan.displayName } : { name: 'FREE', displayName: 'Free' },
    limits,
    month: { ...month, limit: limits.monthlyRequests },
    summary: {
      totalRequests,
      totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
      bySource,
      byProvider: Array.from(byProvider.entries()).map(([id, v]) => ({
        providerId: id,
        provider: providerMap.get(id)?.displayName ?? 'Unknown',
        color: providerMap.get(id)?.color ?? '#888',
        ...v,
      })),
      daily: Object.values(daily),
    },
  })
}

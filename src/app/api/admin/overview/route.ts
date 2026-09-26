import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const [users, providers, models, conversations, messages, usageRecords, payments, platformCreds] = await Promise.all([
    db.user.count(),
    db.provider.count(),
    db.model.count(),
    db.conversation.count(),
    db.message.count(),
    db.usageRecord.count(),
    db.payment.aggregate({ _sum: { amount: true } }),
    db.platformCredential.count(),
  ])
  const since = new Date()
  since.setDate(since.getDate() - 29)
  const recentUsage = await db.usageRecord.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, apiSource: true, providerId: true, estimatedCost: true, status: true, inputTokens: true, outputTokens: true },
  })
  const byDay: Record<string, { date: string; count: number; cost: number }> = {}
  let totalCost = 0
  for (const r of recentUsage) {
    totalCost += r.estimatedCost
    const d = r.createdAt.toISOString().slice(0, 10)
    byDay[d] = byDay[d] ?? { date: d, count: 0, cost: 0 }
    byDay[d].count += 1
    byDay[d].cost += r.estimatedCost
  }
  const providersList = await db.provider.findMany({ include: { _count: { select: { models: true } }, healthEvents: { orderBy: { checkedAt: 'desc' }, take: 1 } } })
  return NextResponse.json({
    counts: { users, providers, models, conversations, messages, usageRecords, platformCreds },
    revenue: payments._sum.amount ?? 0,
    totalCost: Math.round(totalCost * 100) / 100,
    daily: Object.values(byDay),
    providers: providersList.map((p) => ({ id: p.id, name: p.name, displayName: p.displayName, color: p.color, status: p.status, health: p.healthEvents[0]?.status ?? 'unknown', modelCount: p._count.models })),
  })
}

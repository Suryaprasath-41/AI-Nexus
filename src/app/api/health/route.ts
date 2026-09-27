import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

/** GET /api/health — provider health overview. */
export async function GET() {
  const providers = await db.provider.findMany({
    where: { status: { in: ['active', 'beta'] } },
    include: { healthEvents: { orderBy: { checkedAt: 'desc' }, take: 5 } },
    orderBy: { displayName: 'asc' },
  })
  const rows = providers.map((p) => {
    const latest = p.healthEvents[0]
    return {
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      color: p.color,
      status: latest?.status ?? 'unknown',
      latencyMs: latest?.latencyMs ?? 0,
      errorRate: latest?.errorRate ?? 0,
      message: latest?.message,
      checkedAt: latest?.checkedAt,
    }
  })
  return NextResponse.json({ providers: rows })
}

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

/** GET /api/subscription/plans — public list of plans. */
export async function GET() {
  const plans = await db.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' },
  })
  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      description: p.description,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      currency: p.currency,
      features: JSON.parse(p.featuresJson || '[]'),
      limits: JSON.parse(p.limitsJson || '{}'),
    })),
  })
}

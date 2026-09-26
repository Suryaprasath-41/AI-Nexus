import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { audit } from '@/lib/log'

export const runtime = 'nodejs'

/** GET current subscription/plan for the user. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const plan = user.planId ? await db.subscriptionPlan.findUnique({ where: { id: user.planId } }) : null
  const subscription = await db.subscription.findFirst({ where: { userId: user.id, status: 'active' }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    plan: plan ? { id: plan.id, name: plan.name, displayName: plan.displayName, description: plan.description, priceMonthly: plan.priceMonthly, features: JSON.parse(plan.featuresJson || '[]'), limits: JSON.parse(plan.limitsJson || '{}') } : null,
    subscription: subscription ? { id: subscription.id, status: subscription.status, periodStart: subscription.periodStart, periodEnd: subscription.periodEnd, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd } : null,
  })
}

/**
 * POST — "subscribe" to a plan.
 * Uses the mock payment adapter (clean adapter architecture; swap for Stripe later).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const planId = String(body.planId || '')
  const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } })
  if (!plan || !plan.isActive) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  // Mock payment adapter
  const paymentAdapter = process.env.AI_NEXUS_PAYMENT_ADAPTER || 'mock'
  const payment = await db.payment.create({
    data: {
      userId: user.id,
      amount: plan.priceMonthly,
      currency: plan.currency,
      status: 'succeeded',
      provider: paymentAdapter,
      externalId: `mock_${Date.now()}`,
    },
  })

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const sub = await db.subscription.create({
    data: {
      userId: user.id,
      planId: plan.id,
      status: 'active',
      periodStart: now,
      periodEnd,
      payments: { connect: { id: payment.id } },
    },
  })
  await db.user.update({ where: { id: user.id }, data: { planId: plan.id } })
  await audit(user.id, 'subscription.create', { targetType: 'plan', targetId: plan.id, meta: { amount: plan.priceMonthly } })
  return NextResponse.json({ subscription: sub, plan: { name: plan.name, displayName: plan.displayName } })
}

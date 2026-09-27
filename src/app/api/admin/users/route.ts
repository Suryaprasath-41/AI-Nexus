import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, status: true, planId: true, createdAt: true, _count: { select: { usageRecords: true, conversations: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const plans = await db.subscriptionPlan.findMany({ select: { id: true, displayName: true } })
  const planMap = new Map(plans.map((p) => [p.id, p.displayName]))
  return NextResponse.json({
    users: users.map((u) => ({ ...u, planName: u.planId ? planMap.get(u.planId) ?? null : null })),
  })
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const data: Record<string, unknown> = {}
  if (body.role) data.role = body.role
  if (body.status) data.status = body.status
  if (body.planId !== undefined) data.planId = body.planId || null
  const user = await db.user.update({ where: { id }, data })
  return NextResponse.json({ user: { id: user.id, role: user.role, status: user.status, planId: user.planId } })
}

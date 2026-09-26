import { NextResponse } from 'next/server'
import { getCurrentSafeUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentSafeUser()
  if (!user) return NextResponse.json({ user: null })
  const plan = user.planId ? await db.subscriptionPlan.findUnique({ where: { id: user.planId } }) : null
  return NextResponse.json({ user, plan: plan ? { id: plan.id, name: plan.name, displayName: plan.displayName } : null })
}

import { NextResponse } from 'next/server'
import { getCurrentUser, logoutCurrentSession } from '@/lib/auth'
import { audit } from '@/lib/log'

export const runtime = 'nodejs'

export async function POST() {
  const user = await getCurrentUser()
  if (user) await audit(user.id, 'user.logout')
  await logoutCurrentSession()
  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { createOrGetGuestUser, createSession, setSessionCookie, toSafeUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const user = await createOrGetGuestUser()
    const token = await createSession(user)
    await setSessionCookie(token)
    return NextResponse.json({ user: toSafeUser(user) })
  } catch (error) {
    console.error('Guest login failed:', error)
    return NextResponse.json({ error: 'Failed to initialize guest session' }, { status: 500 })
  }
}

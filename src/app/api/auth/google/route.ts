import { NextRequest, NextResponse } from 'next/server'
import { createOrGetGoogleUser, createSession, setSessionCookie, toSafeUser } from '@/lib/auth'
import { audit } from '@/lib/log'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const body = await req.json().catch(() => ({}))
    
    // Allow either custom user Google email or default Google user
    let email = String(body.email || '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      email = 'google.user@gmail.com'
    }
    const name = body.name ? String(body.name).trim() : email.split('@')[0]

    const user = await createOrGetGoogleUser(email, name)
    const token = await createSession(user)
    await setSessionCookie(token)
    await audit(user.id, 'user.login', { ip, meta: { via: 'google' } })

    return NextResponse.json({ user: toSafeUser(user) })
  } catch (error) {
    console.error('Google login failed:', error)
    return NextResponse.json({ error: 'Failed to complete Google authentication' }, { status: 500 })
  }
}

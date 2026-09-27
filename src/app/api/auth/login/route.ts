import { NextRequest, NextResponse } from 'next/server'
import { authenticate, createSession, setSessionCookie } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/log'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = rateLimit(`login:${ip}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 })
  }
  const body = await req.json().catch(() => ({}))
  const email = String(body.email || '').trim()
  const password = String(body.password || '')

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const user = await authenticate(email, password)
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }
  if (user.status === 'suspended') {
    return NextResponse.json({ error: 'Your account is suspended. Contact support.' }, { status: 403 })
  }
  const token = await createSession(user)
  await setSessionCookie(token)
  await audit(user.id, 'user.login', { ip, meta: { via: 'login' } })

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, planId: user.planId, status: user.status },
  })
}

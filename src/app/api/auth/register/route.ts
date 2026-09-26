import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createUser, createSession, setSessionCookie } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/log'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = rateLimit(`register:${ip}`, 5, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }
  const body = await req.json().catch(() => ({}))
  const email = String(body.email || '').trim()
  const password = String(body.password || '')
  const name = String(body.name || '').trim() || null

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const exists = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (exists) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const user = await createUser({ email, name, password })
  const token = await createSession(user)
  await setSessionCookie(token)
  await audit(user.id, 'user.login', { ip, meta: { via: 'register' } })

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, planId: user.planId, status: user.status },
  })
}

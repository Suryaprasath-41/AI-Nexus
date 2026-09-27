/**
 * Session-based authentication with signed httpOnly cookies.
 * Sessions are stored in DB and looked up by token.
 */
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { randomToken, hashPassword, verifyPassword } from '@/lib/crypto'
import type { User } from '@prisma/client'

export const SESSION_COOKIE = 'ai_nexus_session'
const SESSION_TTL_DAYS = 30

export type SafeUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'planId' | 'status'>

export function toSafeUser(u: User): SafeUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role, planId: u.planId, status: u.status }
}

export async function hashPwd(p: string) {
  return hashPassword(p)
}

export async function createUser({ email, name, password, role = 'user' }: { email: string; name?: string; password: string; role?: string }) {
  // Ensure a default plan exists
  const freePlan = await db.subscriptionPlan.findFirst({ where: { name: 'FREE' } })
  const user = await db.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name?.trim() || null,
      passwordHash: await hashPassword(password),
      role,
      planId: freePlan?.id ?? null,
    },
  })
  await db.auditLog.create({ data: { userId: user.id, action: 'user.register' } })
  return user
}

export async function createOrGetGuestUser(): Promise<User> {
  const guestEmail = 'guest@ainexus.local'
  let user = await db.user.findUnique({ where: { email: guestEmail } })
  if (!user) {
    const freePlan = await db.subscriptionPlan.findFirst({ where: { name: 'FREE' } })
    user = await db.user.create({
      data: {
        email: guestEmail,
        name: 'Guest User',
        role: 'guest',
        planId: freePlan?.id ?? null,
        status: 'active',
      },
    })
  }
  return user
}

export async function createOrGetGoogleUser(email: string, name?: string): Promise<User> {
  const normEmail = email.toLowerCase().trim()
  let user = await db.user.findUnique({ where: { email: normEmail } })
  if (!user) {
    const freePlan = await db.subscriptionPlan.findFirst({ where: { name: 'FREE' } })
    const randomHash = await hashPassword(randomToken(16))
    user = await db.user.create({
      data: {
        email: normEmail,
        name: name?.trim() || 'Google User',
        role: 'user',
        passwordHash: randomHash,
        planId: freePlan?.id ?? null,
        status: 'active',
      },
    })
    await db.auditLog.create({ data: { userId: user.id, action: 'user.register' } }).catch(() => {})
  }
  return user
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user || !user.passwordHash) return null
  if (user.status === 'banned') return null
  if (!verifyPassword(password, user.passwordHash)) return null
  return user
}

export async function createSession(user: User): Promise<string> {
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  })
  return token
}

export async function setSessionCookie(token: string) {
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (!token) return null
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session) return null
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }
    return session.user
  } catch {
    return null
  }
}

export async function getCurrentSafeUser(): Promise<SafeUser | null> {
  const u = await getCurrentUser()
  return u ? toSafeUser(u) : null
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser()
  if (!u) throw new Error('UNAUTHORIZED')
  return u
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser()
  if (u.role !== 'admin') throw new Error('FORBIDDEN')
  return u
}

export async function logoutCurrentSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {})
  }
  await clearSessionCookie()
}

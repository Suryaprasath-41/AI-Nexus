import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { encrypt, maskKey } from '@/lib/crypto'
import { audit } from '@/lib/log'

export const runtime = 'nodejs'

/** GET — list platform credentials (masked only, never plaintext). */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const creds = await db.platformCredential.findMany({ include: { provider: { select: { id: true, displayName: true, name: true } } }, orderBy: { createdAt: 'desc' } })
  // detect env-configured providers
  const providers = await db.provider.findMany()
  const envProviders = providers.filter((p) => process.env[`PLATFORM_${p.name.toUpperCase()}_API_KEY`]).map((p) => ({ id: p.id, name: p.name, displayName: p.displayName, envVar: `PLATFORM_${p.name.toUpperCase()}_API_KEY` }))
  return NextResponse.json({
    credentials: creds.map((c) => ({ id: c.id, provider: c.provider, keyHint: c.keyHint, status: c.status, notes: c.notes, envVar: c.envVar, createdAt: c.createdAt, updatedAt: c.updatedAt })),
    envProviders,
  })
}

/** POST — store a platform credential (encrypted). */
export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const providerId = String(body.providerId || '')
  const apiKey = String(body.apiKey || '').trim()
  if (!providerId || !apiKey) return NextResponse.json({ error: 'providerId and apiKey required' }, { status: 400 })
  const provider = await db.provider.findUnique({ where: { id: providerId } })
  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  // upsert (one active credential per provider)
  const existing = await db.platformCredential.findFirst({ where: { providerId } })
  const encrypted = encrypt(apiKey)
  const keyHint = maskKey(apiKey)
  let cred
  if (existing) {
    cred = await db.platformCredential.update({ where: { id: existing.id }, data: { encryptedKey: encrypted, keyHint, status: 'active' } })
  } else {
    cred = await db.platformCredential.create({ data: { providerId, encryptedKey: encrypted, keyHint, status: 'active' } })
  }
  await audit(admin.id, 'platform_key.upsert', { targetType: 'provider', targetId: providerId, meta: { hint: keyHint } })
  return NextResponse.json({ credential: { id: cred.id, providerId, keyHint, status: cred.status } })
}

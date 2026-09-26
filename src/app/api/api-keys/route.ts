import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { encrypt, maskKey } from '@/lib/crypto'
import { getProvider } from '@/lib/providers'
import { getUserPlanLimits } from '@/lib/usage'
import { audit } from '@/lib/log'

export const runtime = 'nodejs'

/** GET /api/api-keys — list user's BYOK keys (masked, never plaintext). */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const keys = await db.userApiKey.findMany({
    where: { userId: user.id },
    include: { provider: { select: { id: true, name: true, displayName: true, color: true, apiFormat: true } } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  // never return encryptedKey
  const safe = keys.map((k) => ({
    id: k.id,
    provider: k.provider,
    label: k.label,
    keyHint: k.keyHint,
    status: k.status,
    isValid: k.isValid,
    isDefault: k.isDefault,
    lastUsedAt: k.lastUsedAt,
    validatedAt: k.validatedAt,
    createdAt: k.createdAt,
  }))
  return NextResponse.json({ keys: safe })
}

/** POST /api/api-keys — add a new BYOK key (encrypts at rest). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const providerId = String(body.providerId || '')
  const apiKey = String(body.apiKey || '').trim()
  const label = String(body.label || '').trim() || null
  const validate = body.validate !== false

  if (!providerId || !apiKey) {
    return NextResponse.json({ error: 'providerId and apiKey are required.' }, { status: 400 })
  }

  const provider = await db.provider.findUnique({ where: { id: providerId } })
  if (!provider) return NextResponse.json({ error: 'Provider not found.' }, { status: 404 })

  // Enforce plan limit on number of keys
  const { limits } = await getUserPlanLimits(user.id)
  const existingCount = await db.userApiKey.count({ where: { userId: user.id } })
  if (existingCount >= limits.maxApiKeys) {
    return NextResponse.json({ error: `You've reached the maximum of ${limits.maxApiKeys} API keys on your plan.`, code: 'limit' }, { status: 403 })
  }

  // Optional validation against the provider
  let isValid = false
  let validatedAt: Date | null = null
  if (validate) {
    try {
      const adapter = getProvider(provider)
      const result = await adapter.validateApiKey(apiKey)
      isValid = result.valid
      validatedAt = result.valid ? new Date() : null
      if (!result.valid) {
        return NextResponse.json({ error: `API key validation failed: ${result.message ?? 'invalid key'}`, code: 'invalid' }, { status: 400 })
      }
    } catch {
      // If validation endpoint is unreachable, store the key but mark unverified
      isValid = false
    }
  }

  const encrypted = encrypt(apiKey)
  const keyHint = maskKey(apiKey)

  // If first key for this provider, make it default
  const hasExisting = await db.userApiKey.findFirst({ where: { userId: user.id, providerId } })
  const isDefault = !hasExisting

  const key = await db.userApiKey.create({
    data: {
      userId: user.id,
      providerId,
      label,
      encryptedKey: encrypted,
      keyHint,
      isValid,
      validatedAt,
      isDefault,
      status: 'active',
    },
  })
  await audit(user.id, 'api_key.create', { targetType: 'provider', targetId: providerId, meta: { hint: keyHint } })
  return NextResponse.json({
    key: { id: key.id, providerId, keyHint, isValid, isDefault, status: key.status, validatedAt: key.validatedAt, createdAt: key.createdAt },
  })
}

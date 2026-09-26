import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getProvider } from '@/lib/providers'
import { audit } from '@/lib/log'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const key = await db.userApiKey.findFirst({ where: { id, userId: user.id } })
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (typeof body.status === 'string') data.status = body.status
  if (typeof body.isDefault === 'boolean') {
    if (body.isDefault) {
      await db.userApiKey.updateMany({ where: { userId: user.id, providerId: key.providerId }, data: { isDefault: false } })
    }
    data.isDefault = body.isDefault
  }
  if (typeof body.label === 'string') data.label = body.label || null

  // re-validate on demand
  if (body.revalidate === true) {
    const provider = await db.provider.findUnique({ where: { id: key.providerId } })
    if (provider) {
      try {
        const adapter = getProvider(provider)
        const plain = decrypt(key.encryptedKey)
        const result = await adapter.validateApiKey(plain)
        data.isValid = result.valid
        data.validatedAt = new Date()
        data.status = result.valid ? 'active' : 'invalid'
      } catch {
        data.isValid = false
        data.status = 'invalid'
      }
    }
  }

  const updated = await db.userApiKey.update({ where: { id }, data })
  await audit(user.id, 'api_key.update', { targetType: 'api_key', targetId: id })
  return NextResponse.json({ key: { id: updated.id, status: updated.status, isValid: updated.isValid, isDefault: updated.isDefault, validatedAt: updated.validatedAt } })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const key = await db.userApiKey.findFirst({ where: { id, userId: user.id } })
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.userApiKey.delete({ where: { id } })
  await audit(user.id, 'api_key.delete', { targetType: 'api_key', targetId: id })
  return NextResponse.json({ ok: true })
}

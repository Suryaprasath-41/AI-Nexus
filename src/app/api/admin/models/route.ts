import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { audit } from '@/lib/log'

export const runtime = 'nodejs'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const models = await db.model.findMany({ include: { provider: { select: { id: true, displayName: true, color: true } } }, orderBy: [{ provider: { displayName: 'asc' } }, { displayName: 'asc' }] })
  return NextResponse.json({ models })
}

export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const model = await db.model.create({
    data: {
      providerId: String(body.providerId || ''),
      modelName: String(body.modelName || '').trim(),
      displayName: String(body.displayName || body.modelName || '').trim(),
      contextWindow: Number(body.contextWindow || 8192),
      maxOutput: Number(body.maxOutput || 4096),
      capabilities: String(body.capabilities || 'chat'),
      inputPrice: Number(body.inputPrice || 0),
      outputPrice: Number(body.outputPrice || 0),
      tags: body.tags ? String(body.tags) : null,
      status: String(body.status || 'active'),
    },
  })
  await audit(admin.id, 'model.create', { targetType: 'model', targetId: model.id })
  return NextResponse.json({ model })
}

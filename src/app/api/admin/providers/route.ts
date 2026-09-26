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
  const providers = await db.provider.findMany({ include: { _count: { select: { models: true } } }, orderBy: { displayName: 'asc' } })
  return NextResponse.json({ providers })
}

export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const provider = await db.provider.create({
    data: {
      name: String(body.name || '').trim().toLowerCase().replace(/\s+/g, '-'),
      displayName: String(body.displayName || body.name || '').trim(),
      description: String(body.description || '').trim() || null,
      color: String(body.color || '#6366f1').trim(),
      baseUrl: String(body.baseUrl || '').trim() || null,
      authType: String(body.authType || 'bearer'),
      apiFormat: String(body.apiFormat || 'openai-compatible'),
      documentationUrl: String(body.documentationUrl || '').trim() || null,
      status: String(body.status || 'active'),
      isCustom: true,
    },
  })
  await audit(admin.id, 'provider.create', { targetType: 'provider', targetId: provider.id })
  return NextResponse.json({ provider })
}

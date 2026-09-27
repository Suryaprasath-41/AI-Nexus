import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const conv = await db.conversation.findFirst({ where: { id, userId: user.id } })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ conversation: conv, messages })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.title === 'string') data.title = body.title.slice(0, 120)
  if (typeof body.pinned === 'boolean') data.pinned = body.pinned
  if (body.providerId !== undefined) data.providerId = body.providerId || null
  if (body.modelId !== undefined) data.modelId = body.modelId || null
  if (body.apiSource !== undefined) data.apiSource = body.apiSource
  if (typeof body.temperature === 'number') data.temperature = body.temperature
  const conv = await db.conversation.updateMany({ where: { id, userId: user.id }, data })
  if (conv.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  await db.conversation.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ ok: true })
}

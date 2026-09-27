import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

/** GET messages for a conversation. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const conv = await db.conversation.findFirst({ where: { id, userId: user.id } })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const messages = await db.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ messages })
}

/** PATCH a message (edit content). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const conv = await db.conversation.findFirst({ where: { id, userId: user.id } })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!body.messageId || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'messageId and content required' }, { status: 400 })
  }
  const updated = await db.message.update({ where: { id: body.messageId }, data: { content: body.content } })
  return NextResponse.json({ message: updated })
}

/** DELETE a message. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const url = new URL(req.url)
  const messageId = url.searchParams.get('messageId')
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })
  const conv = await db.conversation.findFirst({ where: { id, userId: user.id } })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.message.delete({ where: { id: messageId } })
  return NextResponse.json({ ok: true })
}

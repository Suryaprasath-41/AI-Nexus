import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

/** GET /api/conversations — list current user's conversations (sidebar). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const search = url.searchParams.get('q')?.trim()
  const where: Record<string, unknown> = { userId: user.id }
  if (search) where.title = { contains: search }
  const conversations = await db.conversation.findMany({
    where,
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    take: 200,
    select: {
      id: true,
      title: true,
      pinned: true,
      providerId: true,
      modelId: true,
      apiSource: true,
      updatedAt: true,
      project: true,
      _count: { select: { messages: true } },
    },
  })
  return NextResponse.json({ conversations })
}

/** POST /api/conversations — create a new conversation. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const title = String(body.title || 'New chat').slice(0, 120)
  const conv = await db.conversation.create({
    data: {
      userId: user.id,
      title,
      providerId: body.providerId || null,
      modelId: body.modelId || null,
      apiSource: body.apiSource === 'byok' ? 'byok' : 'platform',
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    },
  })
  return NextResponse.json({ conversation: conv })
}

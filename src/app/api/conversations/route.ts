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

/** POST /api/conversations — create a new conversation or project. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const isProject = Boolean(body.project || body.isProject)
  const project = body.project
    ? String(body.project).slice(0, 100).trim()
    : body.isProject
      ? String(body.title || 'Project').slice(0, 100).trim()
      : null

  if (isProject && user.role === 'guest') {
    return NextResponse.json({
      error: 'Guests can chat, but an account is required to create and save projects. Please sign in or register.',
      code: 'guest_restricted',
    }, { status: 403 })
  }

  const title = String(body.title || (project ? `Project: ${project}` : 'New chat')).slice(0, 120)
  const conv = await db.conversation.create({
    data: {
      userId: user.id,
      title,
      project,
      providerId: body.providerId || null,
      modelId: body.modelId || null,
      apiSource: body.apiSource === 'byok' ? 'byok' : 'platform',
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    },
  })
  return NextResponse.json({ conversation: conv })
}

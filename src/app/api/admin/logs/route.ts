import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

/** GET /api/admin/logs — recent system + audit logs. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const url = new URL(req.url)
  const kind = url.searchParams.get('kind') || 'system'
  const limit = Math.min(200, Number(url.searchParams.get('limit') || 100))
  if (kind === 'audit') {
    const logs = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit, include: { user: { select: { email: true } } } })
    return NextResponse.json({ logs })
  }
  const logs = await db.systemLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
  return NextResponse.json({ logs })
}

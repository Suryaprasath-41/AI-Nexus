import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProvider } from '@/lib/providers'

export const runtime = 'nodejs'

/** POST /api/api-keys/validate — validate a key for a provider without saving it. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const providerId = String(body.providerId || '')
  const apiKey = String(body.apiKey || '').trim()
  if (!providerId || !apiKey) return NextResponse.json({ error: 'providerId and apiKey required' }, { status: 400 })
  const provider = await db.provider.findUnique({ where: { id: providerId } })
  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  const adapter = getProvider(provider)
  const result = await adapter.validateApiKey(apiKey)
  return NextResponse.json(result)
}

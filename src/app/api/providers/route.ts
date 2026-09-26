import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

/** GET /api/providers — list active providers with their models and health. */
export async function GET() {
  const providers = await db.provider.findMany({
    where: { status: { in: ['active', 'beta'] } },
    orderBy: { displayName: 'asc' },
    include: {
      models: { where: { status: 'active' }, orderBy: { displayName: 'asc' } },
      healthEvents: { orderBy: { checkedAt: 'desc' }, take: 1 },
    },
  })
  const rows = providers.map((p) => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    description: p.description,
    color: p.color,
    logoUrl: p.logoUrl,
    documentationUrl: p.documentationUrl,
    apiFormat: p.apiFormat,
    status: p.status,
    isCustom: p.isCustom,
    health: p.healthEvents[0]?.status ?? 'unknown',
    models: p.models.map((m) => ({
      id: m.id,
      modelName: m.modelName,
      displayName: m.displayName,
      contextWindow: m.contextWindow,
      maxOutput: m.maxOutput,
      capabilities: m.capabilities.split(',').filter(Boolean),
      inputPrice: m.inputPrice,
      outputPrice: m.outputPrice,
      tags: m.tags?.split(',').filter(Boolean) ?? [],
      status: m.status,
    })),
  }))
  return NextResponse.json({ providers: rows })
}

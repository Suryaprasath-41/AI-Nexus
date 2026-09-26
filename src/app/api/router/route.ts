import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export type TaskCategory = 'coding' | 'mathematics' | 'writing' | 'summarization' | 'reasoning' | 'translation' | 'data_analysis' | 'general'

interface CategoryRule {
  category: TaskCategory
  label: string
  keywords: string[]
}

const RULES: CategoryRule[] = [
  { category: 'coding', label: 'Coding', keywords: ['code', 'function', 'bug', 'error', 'typescript', 'python', 'javascript', 'react', 'api', 'sql', 'compile', 'regex', 'algorithm', 'debug', 'class', 'import', 'npm', 'git'] },
  { category: 'mathematics', label: 'Mathematics', keywords: ['calculate', 'equation', 'solve', 'integral', 'derivative', 'matrix', 'probability', 'theorem', 'algebra', 'geometry', 'arithmetic', 'sum', 'product'] },
  { category: 'reasoning', label: 'Reasoning', keywords: ['why', 'explain', 'analyze', 'compare', 'evaluate', 'because', 'therefore', 'conclude', 'logic', 'deduce', 'infer'] },
  { category: 'summarization', label: 'Summarization', keywords: ['summarize', 'summary', 'tl;dr', 'condense', 'brief', 'shorten', 'key points', 'overview'] },
  { category: 'translation', label: 'Translation', keywords: ['translate', 'translation', 'in french', 'in spanish', 'in german', 'in chinese', 'in japanese', 'language'] },
  { category: 'data_analysis', label: 'Data Analysis', keywords: ['data', 'chart', 'graph', 'statistics', 'average', 'mean', 'median', 'trend', 'correlation', 'dataset', 'csv'] },
  { category: 'writing', label: 'Writing', keywords: ['write', 'essay', 'article', 'story', 'poem', 'email', 'blog', 'content', 'draft', 'narrative', 'creative'] },
  { category: 'general', label: 'General Chat', keywords: [] },
]

export function classifyTask(prompt: string): { category: TaskCategory; label: string; confidence: number } {
  const text = prompt.toLowerCase()
  const scores = new Map<TaskCategory, number>()
  for (const rule of RULES) {
    let score = 0
    for (const kw of rule.keywords) {
      if (text.includes(kw)) score += 1
    }
    if (score > 0) scores.set(rule.category, score)
  }
  if (scores.size === 0) return { category: 'general', label: 'General Chat', confidence: 0.5 }
  let best: TaskCategory = 'general'
  let bestScore = 0
  for (const [cat, s] of scores) {
    if (s > bestScore) {
      best = cat
      bestScore = s
    }
  }
  const total = Array.from(scores.values()).reduce((a, b) => a + b, 0)
  return { category: best, label: RULES.find((r) => r.category === best)!.label, confidence: Math.min(0.95, 0.5 + bestScore / (total + 2)) }
}

/**
 * POST /api/router — suggest a model for a prompt.
 * Respects: user's BYOK keys, platform availability, plan limits.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const prompt = String(body.prompt || '').trim()
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  const classification = classifyTask(prompt)

  // available providers = active providers
  const providers = await db.provider.findMany({
    where: { status: 'active' },
    include: { models: { where: { status: 'active' } } },
  })
  // user's BYOK keys
  const userKeys = await db.userApiKey.findMany({ where: { userId: user.id, status: 'active', isValid: true }, select: { providerId: true } })
  const byokProviderIds = new Set(userKeys.map((k) => k.providerId))

  // Build candidate models with their usable source
  interface Candidate { providerId: string; provider: string; color: string; modelId: string; modelName: string; modelDisplayName: string; capabilities: string[]; inputPrice: number; outputPrice: number; contextWindow: number; tags: string[]; source: 'platform' | 'byok' }
  const candidates: Candidate[] = []
  for (const p of providers) {
    const hasByok = byokProviderIds.has(p.id)
    // platform source available only if env or DB credential exists
    const hasPlatform = !!process.env[`PLATFORM_${p.name.toUpperCase()}_API_KEY`] || (await db.platformCredential.findFirst({ where: { providerId: p.id, status: 'active' } })) !== null
    const source: 'platform' | 'byok' | null = hasByok ? 'byok' : hasPlatform ? 'platform' : null
    if (!source) continue
    for (const m of p.models) {
      candidates.push({
        providerId: p.id,
        provider: p.displayName,
        color: p.color || '#888',
        modelId: m.id,
        modelName: m.modelName,
        modelDisplayName: m.displayName,
        capabilities: m.capabilities.split(',').filter(Boolean),
        inputPrice: m.inputPrice,
        outputPrice: m.outputPrice,
        contextWindow: m.contextWindow,
        tags: m.tags?.split(',').filter(Boolean) ?? [],
        source,
      })
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      classification,
      recommendation: null,
      reason: 'No models are currently available to you. Connect an API key (BYOK) or ask an admin to configure platform credentials.',
      candidates: [],
    })
  }

  // Score candidates by category fit
  const capabilityNeeds: Record<TaskCategory, string[]> = {
    coding: ['tools', 'reasoning'],
    mathematics: ['reasoning'],
    reasoning: ['reasoning'],
    writing: ['chat'],
    summarization: ['chat'],
    translation: ['chat'],
    data_analysis: ['tools', 'reasoning'],
    general: ['chat'],
  }
  const needed = capabilityNeeds[classification.category]
  const scored = candidates.map((c) => {
    let score = 0
    // tag bonuses
    if (c.tags.includes('flagship')) score += 2
    if (c.tags.includes('reasoning') && (classification.category === 'reasoning' || classification.category === 'mathematics' || classification.category === 'coding')) score += 4
    if (c.tags.includes('fast') && (classification.category === 'general' || classification.category === 'summarization' || classification.category === 'translation')) score += 2
    // capability match
    for (const cap of needed) if (c.capabilities.includes(cap)) score += 1
    // prefer BYOK (no platform quota concern) slightly for cost-sensitive tasks
    if (c.source === 'byok') score += 0.5
    // context window helps for long prompts
    if (prompt.length > 8000 && c.contextWindow > 60000) score += 1
    return { ...c, score }
  })
  scored.sort((a, b) => b.score - a.score || a.inputPrice - b.inputPrice)

  const recommendation = scored[0]
  return NextResponse.json({
    classification,
    recommendation: {
      providerId: recommendation.providerId,
      provider: recommendation.provider,
      modelId: recommendation.modelId,
      model: recommendation.modelDisplayName,
      source: recommendation.source,
      reason: reasonFor(classification.category, recommendation),
    },
    candidates: scored.slice(0, 6).map((c) => ({
      providerId: c.providerId,
      provider: c.provider,
      modelId: c.modelId,
      model: c.modelDisplayName,
      source: c.source,
      score: Math.round(c.score * 10) / 10,
      inputPrice: c.inputPrice,
      outputPrice: c.outputPrice,
    })),
  })
}

function reasonFor(cat: TaskCategory, c: { provider: string; model: string; tags: string[]; source: string }): string {
  const via = c.source === 'byok' ? 'your connected API key' : 'platform API'
  switch (cat) {
    case 'coding': return `${c.model} is strong at code generation and tool use. Routed via ${via}.`
    case 'mathematics': return `${c.model} has reasoning capability suited for math. Routed via ${via}.`
    case 'reasoning': return `${c.model} is a reasoning-capable model. Routed via ${via}.`
    case 'writing': return `${c.model} produces natural, high-quality writing. Routed via ${via}.`
    case 'summarization': return `${c.model} is fast and accurate for summarization. Routed via ${via}.`
    case 'translation': return `${c.model} handles translation well. Routed via ${via}.`
    case 'data_analysis': return `${c.model} supports tool use for structured data analysis. Routed via ${via}.`
    default: return `${c.model} is a great general-purpose choice. Routed via ${via}.`
  }
}

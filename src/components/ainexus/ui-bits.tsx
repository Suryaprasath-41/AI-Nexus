'use client'

import { cn } from '@/lib/utils'
import type { ProviderInfo } from '@/lib/store/app'

const FALLBACK_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d97757',
  gemini: '#4285f4',
  deepseek: '#4d6bce',
  groq: '#f55036',
  mistral: '#ff7000',
  qwen: '#615ced',
}

export function ProviderAvatar({ provider, size = 28, className }: { provider?: { name: string; displayName: string; color?: string | null } | null; size?: number; className?: string }) {
  const color = provider?.color || FALLBACK_COLORS[provider?.name || ''] || '#a855f7'
  const initial = (provider?.displayName || provider?.name || 'AI').charAt(0).toUpperCase()
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-lg font-semibold text-white shrink-0', className)}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}cc)`, fontSize: size * 0.45 }}
      title={provider?.displayName}
    >
      {initial}
    </span>
  )
}

export function HealthDot({ status }: { status: string }) {
  const color =
    status === 'operational' ? 'bg-emerald-500' :
    status === 'degraded' ? 'bg-amber-500' :
    status === 'outage' ? 'bg-red-500' : 'bg-muted-foreground'
  return <span className={cn('inline-block h-2 w-2 rounded-full', color, status === 'operational' && 'animate-pulse')} />
}

export function ProviderBadge({ provider, size = 'sm' }: { provider: ProviderInfo; size?: 'sm' | 'md' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <ProviderAvatar provider={provider} size={size === 'sm' ? 18 : 22} />
      <span className="font-medium">{provider.displayName}</span>
    </span>
  )
}

export function formatPrice(p: number): string {
  if (p === 0) return 'Free'
  if (p < 0.01) return `$${p.toFixed(3)}`
  return `$${p.toFixed(2)}`
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

export function formatCost(c: number): string {
  if (c === 0) return '$0.00'
  if (c < 0.001) return `$${c.toFixed(5)}`
  return `$${c.toFixed(4)}`
}

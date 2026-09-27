'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store/app'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ProviderAvatar, HealthDot, formatPrice } from '../ui-bits'
import { Search, Cpu, Sparkles, Zap, Brain, Eye, Wrench, KeyRound, Zap as ZapIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const CAPABILITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chat: Cpu, vision: Eye, tools: Wrench, reasoning: Brain,
}
const TAG_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  flagship: { icon: Sparkles, color: 'text-amber-500' },
  fast: { icon: Zap, color: 'text-cyan-500' },
  reasoning: { icon: Brain, color: 'text-violet-500' },
  cheap: { icon: ZapIcon, color: 'text-emerald-500' },
}

export function ModelsView() {
  const { providers, byokProviders, setSelection, setView, providerId, modelId } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'byok' | 'flagship' | 'reasoning'>('all')

  const filtered = providers
    .map((p) => ({
      ...p,
      models: p.models.filter((m) => {
        const q = query.toLowerCase()
        const matchesQuery = !q || m.displayName.toLowerCase().includes(q) || m.modelName.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q)
        const matchesFilter =
          filter === 'all' ? true :
          filter === 'byok' ? byokProviders.has(p.id) :
          filter === 'flagship' ? m.tags.includes('flagship') :
          filter === 'reasoning' ? m.capabilities.includes('reasoning') : true
        return matchesQuery && matchesFilter
      }),
    }))
    .filter((p) => p.models.length > 0)

  const selectModel = (providerId: string, modelId: string, hasByok: boolean) => {
    setSelection({ providerId, modelId, apiSource: hasByok ? 'byok' : 'platform' })
    setView('chat')
    toast.success('Model selected — switch to Chat to start.')
  }

  return (
    <div className="h-full overflow-y-auto custom-scroll">
      <div className="max-w-5xl mx-auto p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Cpu className="h-6 w-6 text-primary" /> Model Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">{providers.length} providers · {providers.reduce((n, p) => n + p.models.length, 0)} models available. Database-driven — new providers can be added without code changes.</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models…" className="pl-8 glass" />
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-0.5 bg-card/50">
            {(['all', 'flagship', 'reasoning', 'byok'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors', filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {f === 'byok' ? 'My Keys' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Provider groups */}
        <div className="space-y-5">
          {filtered.map((p) => (
            <div key={p.id}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <ProviderAvatar provider={p} size={22} />
                <span className="font-semibold">{p.displayName}</span>
                <HealthDot status={p.health} />
                <span className="text-xs text-muted-foreground capitalize">{p.health}</span>
                {byokProviders.has(p.id) && <Badge variant="outline" className="h-5 gap-0.5 text-[10px] text-emerald-600 border-emerald-500/30"><KeyRound className="h-2.5 w-2.5" /> Key connected</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">{p.models.length} models</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {p.models.map((m) => {
                  const active = m.id === modelId && p.id === providerId
                  const hasByok = byokProviders.has(p.id)
                  return (
                    <Card key={m.id} className={cn('p-3.5 glass hover:border-primary/40 transition-colors cursor-pointer', active && 'border-primary')}
                      onClick={() => selectModel(p.id, m.id, hasByok)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm">{m.displayName}</span>
                            {m.tags.map((t) => {
                              const tg = TAG_ICONS[t]
                              if (!tg) return null
                              const Icon = tg.icon
                              return <Icon key={t} className={cn('h-3 w-3', tg.color)} />
                            })}
                          </div>
                          <code className="text-[10px] text-muted-foreground font-mono">{m.modelName}</code>
                        </div>
                        <Button size="sm" variant={active ? 'default' : 'outline'} className="h-7 text-xs shrink-0" onClick={(e) => { e.stopPropagation(); selectModel(p.id, m.id, hasByok) }}>
                          {active ? 'Selected' : 'Use'}
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {m.capabilities.map((c) => {
                          const Icon = CAPABILITY_ICONS[c] || Cpu
                          return <Badge key={c} variant="secondary" className="h-5 gap-0.5 text-[10px] capitalize"><Icon className="h-2.5 w-2.5" /> {c}</Badge>
                        })}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2.5 text-[11px] text-muted-foreground">
                        <div><span className="text-foreground font-medium">{(m.contextWindow / 1000).toFixed(0)}K</span> ctx</div>
                        <div><span className="text-foreground font-medium">{formatPrice(m.inputPrice)}</span>/M in</div>
                        <div><span className="text-foreground font-medium">{formatPrice(m.outputPrice)}</span>/M out</div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

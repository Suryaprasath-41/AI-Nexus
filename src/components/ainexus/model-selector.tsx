'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/store/app'
import { ProviderAvatar } from './ui-bits'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Check, ChevronDown, Search, Sparkles, Zap, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ModelSelector() {
  const { providers, providerId, modelId, apiSource, byokProviders, setSelection } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const currentProvider = providers.find((p) => p.id === providerId)
  const currentModel = currentProvider?.models.find((m) => m.id === modelId)

  const filtered = useMemo(() => {
    if (!query.trim()) return providers
    const q = query.toLowerCase()
    return providers
      .map((p) => ({
        ...p,
        models: p.models.filter(
          (m) => m.displayName.toLowerCase().includes(q) || m.modelName.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q)
        ),
      }))
      .filter((p) => p.models.length > 0)
  }, [providers, query])

  function selectModel(pid: string, mid: string) {
    const provider = providers.find((p) => p.id === pid)
    // pick BYOK if user has a key for this provider, else platform
    const source = provider && byokProviders.has(provider.id) ? 'byok' : 'platform'
    setSelection({ providerId: pid, modelId: mid, apiSource: source })
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 px-2.5 glass">
          <ProviderAvatar provider={currentProvider} size={20} />
          <span className="text-sm font-medium">{currentModel?.displayName ?? 'Select model'}</span>
          {apiSource === 'byok' && <Badge variant="secondary" className="h-4 text-[10px] px-1 py-0">BYOK</Badge>}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0 glass-strong" align="start">
        <div className="p-2 border-b border-border/50">
          <div className="flex items-center gap-2 px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search models…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="h-[360px]">
          <div className="p-1.5">
            {filtered.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No models found.</p>}
            {filtered.map((p) => (
              <div key={p.id} className="mb-1">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <ProviderAvatar provider={p} size={16} />
                  {p.displayName}
                  {byokProviders.has(p.id) && <Badge variant="outline" className="h-4 text-[9px] px-1 py-0 ml-auto">Key</Badge>}
                </div>
                {p.models.map((m) => {
                  const active = m.id === modelId && p.id === providerId
                  return (
                    <button
                      key={m.id}
                      onClick={() => selectModel(p.id, m.id)}
                      className={cn(
                        'w-full flex items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/50',
                        active && 'bg-accent'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate">{m.displayName}</span>
                          {m.tags.includes('flagship') && <Sparkles className="h-3 w-3 text-amber-500" />}
                          {m.tags.includes('fast') && <Zap className="h-3 w-3 text-cyan-500" />}
                          {m.tags.includes('reasoning') && <Brain className="h-3 w-3 text-violet-500" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {(m.contextWindow / 1000).toFixed(0)}K ctx · ${m.inputPrice.toFixed(2)}/M in · ${m.outputPrice.toFixed(2)}/M out
                        </div>
                      </div>
                      {active && <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="p-2 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>{providers.length} providers · {providers.reduce((n, p) => n + p.models.length, 0)} models</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Registry live
          </span>
        </div>
      </PopoverContent>
    </Popover>
  )
}

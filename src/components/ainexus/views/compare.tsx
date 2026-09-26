'use client'

import { useState } from 'react'
import { useApp, type ProviderInfo } from '@/lib/store/app'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Markdown } from '../markdown'
import { ProviderAvatar, formatCost, formatTokens } from '../ui-bits'
import { toast } from 'sonner'
import { GitCompareArrows, Play, Loader2, Zap, KeyRound, Clock, Coins, Hash, Sparkles, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Selection { providerId: string; modelId: string; apiSource: 'platform' | 'byok' }
interface CompareResult {
  providerId: string
  provider: string
  color: string
  modelId: string
  model: string
  apiSource: string
  content: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  cost: number
  status: 'success' | 'error'
  errorMessage?: string
}

const SAMPLE_PROMPTS = [
  'Explain quantum entanglement to a 10-year-old.',
  'Write a haiku about the ocean.',
  'What are 3 pros and 3 cons of remote work?',
]

export function CompareView() {
  const { providers, byokProviders } = useApp()
  const [prompt, setPrompt] = useState('')
  const [selections, setSelections] = useState<Selection[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<CompareResult[]>([])

  function toggleSelection(s: Selection) {
    setSelections((prev) => {
      const exists = prev.find((x) => x.providerId === s.providerId && x.modelId === s.modelId)
      if (exists) return prev.filter((x) => !(x.providerId === s.providerId && x.modelId === s.modelId))
      if (prev.length >= 4) {
        toast.error('You can compare up to 4 models at once.')
        return prev
      }
      return [...prev, s]
    })
  }

  async function run() {
    if (!prompt.trim()) { toast.error('Enter a prompt to compare.'); return }
    if (selections.length < 2) { toast.error('Select at least 2 models to compare.'); return }
    setLoading(true)
    setResults([])
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, selections }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Comparison failed')
        return
      }
      setResults(data.results)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Prompt bar */}
      <div className="border-b border-border p-4 shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2"><GitCompareArrows className="h-5 w-5 text-primary" /> AI Comparison</h1>
              <p className="text-xs text-muted-foreground">Send one prompt to multiple models. Compare responses side-by-side — you decide which is best.</p>
            </div>
            <Badge variant="outline" className="gap-1">{selections.length}/4 selected</Badge>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt to send to all selected models…"
              className="min-h-[60px] max-h-[120px] resize-none glass"
            />
            <Button onClick={run} disabled={loading || !prompt.trim() || selections.length < 2} className="self-end gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {loading ? 'Comparing…' : 'Compare'}
            </Button>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {SAMPLE_PROMPTS.map((p) => (
              <button key={p} onClick={() => setPrompt(p)} className="text-[11px] px-2 py-1 rounded-md bg-muted/50 hover:bg-accent/50 transition-colors text-muted-foreground">{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Model picker */}
      <div className="border-b border-border p-4 shrink-0">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select models to compare</p>
          <div className="flex gap-2 overflow-x-auto custom-scroll pb-1">
            {providers.flatMap((p) =>
              p.models.map((m) => {
                const selected = selections.some((s) => s.providerId === p.id && s.modelId === m.id)
                const hasByok = byokProviders.has(p.id)
                return (
                  <button
                    key={`${p.id}-${m.id}`}
                    onClick={() => toggleSelection({ providerId: p.id, modelId: m.id, apiSource: hasByok ? 'byok' : 'platform' })}
                    className={cn(
                      'shrink-0 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-all',
                      selected ? 'border-primary bg-primary/10' : 'border-border bg-card/40 hover:border-primary/40'
                    )}
                  >
                    <ProviderAvatar provider={p} size={18} />
                    <span className="font-medium">{m.displayName}</span>
                    {hasByok && <KeyRound className="h-2.5 w-2.5 text-emerald-500" />}
                    {!hasByok && <Zap className="h-2.5 w-2.5 text-amber-500" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1 custom-scroll">
        <div className="max-w-5xl mx-auto p-4">
          {results.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-chart-3 mx-auto mb-4 flex items-center justify-center glow animate-float">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <p className="font-medium">Select models, enter a prompt, and compare</p>
              <p className="text-sm text-muted-foreground mt-1">Responses stream in side-by-side with token counts, latency, and cost.</p>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selections.map((s) => {
                const p = providers.find((x) => x.id === s.providerId)!
                const m = p?.models.find((x) => x.id === s.modelId)
                return (
                  <Card key={`${s.providerId}-${s.modelId}`} className="p-4 glass">
                    <div className="flex items-center gap-2 mb-3">
                      <ProviderAvatar provider={p} size={24} />
                      <span className="font-medium text-sm">{m?.displayName}</span>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-auto" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 bg-muted/50 rounded animate-pulse" />
                      <div className="h-3 bg-muted/50 rounded animate-pulse w-5/6" />
                      <div className="h-3 bg-muted/50 rounded animate-pulse w-4/6" />
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground italic text-center">We don't claim one model is objectively better — you decide.</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.map((r, i) => (
                  <Card key={i} className="p-4 glass flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <ProviderAvatar provider={{ name: '', displayName: r.provider, color: r.color }} size={24} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{r.model}</div>
                      </div>
                      <Badge variant="outline" className="h-5 gap-0.5 text-[9px]">
                        {r.apiSource === 'byok' ? <><KeyRound className="h-2.5 w-2.5" /> BYOK</> : <><Zap className="h-2.5 w-2.5" /> Platform</>}
                      </Badge>
                    </div>
                    {r.status === 'error' ? (
                      <div className="text-sm text-destructive py-4">⚠ {r.errorMessage}</div>
                    ) : (
                      <div className="flex-1 min-h-[100px] max-h-[400px] overflow-y-auto custom-scroll text-sm">
                        <Markdown content={r.content} />
                      </div>
                    )}
                    {r.status === 'success' && (
                      <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-border/50 text-[11px]">
                        <Stat icon={Clock} label="Time" value={`${(r.latencyMs / 1000).toFixed(1)}s`} />
                        <Stat icon={Hash} label="Tokens" value={`${formatTokens(r.inputTokens + r.outputTokens)}`} />
                        <Stat icon={Coins} label="Cost" value={formatCost(r.cost)} />
                        <Stat icon={Sparkles} label="Out" value={formatTokens(r.outputTokens)} />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span>{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

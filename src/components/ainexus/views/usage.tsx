'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, CartesianGrid, Cell } from 'recharts'
import { Loader2, Activity, Coins, Hash, Zap, KeyRound, TrendingUp } from 'lucide-react'
import { formatCost, formatTokens } from '../ui-bits'

interface UsageData {
  plan: { name: string; displayName: string }
  limits: { monthlyRequests: number; maxTokens: number; compareAccess: boolean; routerAccess: boolean }
  month: { count: number; inputTokens: number; outputTokens: number; limit: number }
  summary: {
    totalRequests: number
    totalCost: number
    bySource: { platform: { count: number; tokens: number; cost: number }; byok: { count: number; tokens: number; cost: number } }
    byProvider: Array<{ providerId: string; provider: string; color: string; count: number; tokens: number; cost: number }>
    daily: Array<{ date: string; platform: number; byok: number; cost: number }>
  }
}

export function UsageView() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/usage').then((r) => r.json()).then((d) => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  }

  const pct = data.limits.monthlyRequests > 0 ? Math.min(100, (data.month.count / data.limits.monthlyRequests) * 100) : 0

  return (
    <div className="h-full overflow-y-auto custom-scroll">
      <div className="max-w-5xl mx-auto p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> Usage & Quota</h1>
          <p className="text-sm text-muted-foreground mt-1">Track requests, tokens, and cost across all providers. Platform and BYOK usage are tracked separately.</p>
        </div>

        {/* Plan + quota */}
        <Card className="p-5 glass">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase">Current Plan</div>
              <div className="text-xl font-semibold">{data.plan.displayName}</div>
            </div>
            <Badge variant="outline" className="gap-1">
              {data.month.count} / {data.limits.monthlyRequests === 0 ? '∞' : data.limits.monthlyRequests} platform requests
            </Badge>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Monthly platform quota</span>
              <span className="font-medium">{pct.toFixed(0)}% used</span>
            </div>
            <Progress value={pct} className="h-2" />
            <p className="text-[11px] text-muted-foreground">
              {data.limits.monthlyRequests - data.month.count} requests remaining this month. BYOK usage is unlimited and tracked separately.
            </p>
          </div>
        </Card>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Hash} label="Total requests" value={String(data.summary.totalRequests)} sub="last 30 days" color="text-violet-500" />
          <StatCard icon={Coins} label="Est. cost" value={formatCost(data.summary.totalCost)} sub="all sources" color="text-amber-500" />
          <StatCard icon={Zap} label="Platform" value={String(data.summary.bySource.platform.count)} sub={`${formatTokens(data.summary.bySource.platform.tokens)} tokens`} color="text-cyan-500" />
          <StatCard icon={KeyRound} label="BYOK" value={String(data.summary.bySource.byok.count)} sub={`${formatTokens(data.summary.bySource.byok.tokens)} tokens`} color="text-emerald-500" />
        </div>

        {/* Daily chart */}
        <Card className="p-5 glass">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Daily activity (30 days)</span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.summary.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(d) => d.slice(5)} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <RTooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Bar dataKey="platform" stackId="a" fill="#7c3aed" radius={[0, 0, 0, 0]} />
                <Bar dataKey="byok" stackId="a" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-[#7c3aed]" /> Platform</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-[#10b981]" /> BYOK</span>
          </div>
        </Card>

        {/* By provider */}
        <Card className="p-5 glass">
          <div className="font-medium text-sm mb-3">Usage by provider</div>
          {data.summary.byProvider.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No usage recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.summary.byProvider.map((p) => {
                const max = Math.max(...data.summary.byProvider.map((x) => x.count), 1)
                return (
                  <div key={p.providerId}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                        {p.provider}
                      </span>
                      <span className="text-muted-foreground">{p.count} req · {formatTokens(p.tokens)} tok · {formatCost(p.cost)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(p.count / max) * 100}%`, background: p.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub: string; color: string }) {
  return (
    <Card className="p-4 glass">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </Card>
  )
}

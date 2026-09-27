'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, CreditCard, Sparkles, Zap, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store/app'

interface Plan {
  id: string
  name: string
  displayName: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  features: string[]
  limits: Record<string, number | boolean>
}
interface CurrentSub {
  plan: { id: string; name: string; displayName: string; description: string; priceMonthly: number; features: string[]; limits: Record<string, unknown> } | null
  subscription: { id: string; status: string; periodStart: string; periodEnd: string; cancelAtPeriodEnd: boolean } | null
}

const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = { FREE: Sparkles, PRO: Zap, BUSINESS: Crown }

export function SubscriptionView() {
  const { user, setAuth } = useApp()
  const [plans, setPlans] = useState<Plan[]>([])
  const [current, setCurrent] = useState<CurrentSub | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [p, c] = await Promise.all([fetch('/api/subscription/plans').then((r) => r.json()), fetch('/api/subscription/current').then((r) => r.json())])
    setPlans(p.plans || [])
    setCurrent(c)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function switchPlan(planId: string, planName: string) {
    setSwitching(planId)
    try {
      const res = await fetch('/api/subscription/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to switch plan'); return }
      toast.success(`Switched to ${planName}!`)
      load()
      // refresh user/plan
      const me = await fetch('/api/auth/me').then((r) => r.json())
      if (me.user) setAuth(me.user)
    } finally {
      setSwitching(null)
    }
  }

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  const currentPlanName = current?.plan?.name || 'FREE'

  return (
    <div className="h-full overflow-y-auto custom-scroll">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><CreditCard className="h-6 w-6 text-primary" /> Plan & Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">Plans are stored in the database — prices and limits are fully configurable. Payment uses a clean adapter architecture (mock by default; Stripe-ready).</p>
        </div>

        {current?.subscription && (
          <Card className="p-4 glass border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs text-muted-foreground uppercase">Active subscription</div>
                <div className="font-semibold">{current.plan?.displayName}</div>
                <div className="text-xs text-muted-foreground">Renews {new Date(current.subscription.periodEnd).toLocaleDateString()} · Status: {current.subscription.status}</div>
              </div>
              <Badge variant="secondary">{current.subscription.status}</Badge>
            </div>
          </Card>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const Icon = PLAN_ICONS[plan.name] || Sparkles
            const isCurrent = plan.name === currentPlanName
            const isPro = plan.name === 'PRO'
            return (
              <Card key={plan.id} className={cn('p-5 glass relative flex flex-col', isPro && 'neon-border', isCurrent && 'border-primary')}>
                {isPro && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1"><Sparkles className="h-3 w-3" /> Most Popular</Badge>}
                {isCurrent && <Badge variant="secondary" className="absolute -top-2.5 right-3">Current</Badge>}
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', isPro ? 'bg-primary/15' : 'bg-muted/50')}>
                    <Icon className={cn('h-5 w-5', isPro ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div>
                    <div className="font-semibold">{plan.displayName}</div>
                    <div className="text-[11px] text-muted-foreground">{plan.description}</div>
                  </div>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold">${plan.priceMonthly}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                  {plan.priceYearly > 0 && <div className="text-[11px] text-emerald-600 mt-0.5">${plan.priceYearly}/yr (save 17%)</div>}
                </div>
                <ul className="space-y-1.5 flex-1 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isPro ? 'default' : 'outline'}
                  disabled={isCurrent || switching === plan.id}
                  onClick={() => switchPlan(plan.id, plan.displayName)}
                >
                  {switching === plan.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isCurrent ? 'Current Plan' : plan.priceMonthly === 0 ? 'Switch to Free' : `Upgrade to ${plan.displayName}`}
                </Button>
              </Card>
            )
          })}
        </div>

        {/* Billing note */}
        <Card className="p-4 glass">
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Payment adapter architecture</p>
            Payments flow through a swappable adapter (<code className="font-mono">AI_NEXUS_PAYMENT_ADAPTER</code>). The default <code className="font-mono">mock</code> adapter succeeds instantly for demos. Add a new provider (e.g. Stripe) by implementing the same interface — no business logic changes required.
          </div>
        </Card>
      </div>
    </div>
  )
}

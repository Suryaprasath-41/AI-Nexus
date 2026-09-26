'use client'

import { useEffect } from 'react'
import { useApp } from '@/lib/store/app'
import { ModelSelector } from './model-selector'
import { ChatView } from './views/chat'
import { CompareView } from './views/compare'
import { ApiKeysView } from './views/apikeys'
import { ModelsView } from './views/models'
import { UsageView } from './views/usage'
import { SubscriptionView } from './views/subscription'
import { SettingsView } from './views/settings'
import { AdminView } from './views/admin'
import { FilesView } from './views/files'
import { ConversationsList } from './views/conversations-list'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Sparkles, Plus, Search, MessageSquare, GitCompareArrows, KeyRound, Cpu,
  BarChart3, CreditCard, Settings as SettingsIcon, ShieldCheck, Files,
  LogOut, User, Sun, Moon, Zap, Power, Loader2
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { HealthDot } from './ui-bits'

const NAV = [
  { id: 'chat', label: 'Chats', icon: MessageSquare },
  { id: 'compare', label: 'Compare AI', icon: GitCompareArrows },
  { id: 'files', label: 'Files', icon: Files },
  { id: 'apikeys', label: 'API Keys', icon: KeyRound },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'subscription', label: 'Plan & Billing', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
] as const

export function AppShell() {
  const { user, view, setView, providers, setProviders, providersLoading, setProvidersLoading, setByokProviders, openAuth } = useApp()
  const [dark, setDark] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // load providers registry + byok providers on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      setProvidersLoading(true)
      try {
        const [pRes, kRes] = await Promise.all([
          fetch('/api/providers').then((r) => r.json()),
          fetch('/api/api-keys').then((r) => r.json()),
        ])
        if (cancelled) return
        if (pRes.providers) setProviders(pRes.providers)
        if (kRes.keys) setByokProviders(kRes.keys.map((k: { provider: { id: string } }) => k.provider.id))
      } finally {
        if (!cancelled) setProvidersLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [setProviders, setProvidersLoading, setByokProviders])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.reload()
  }

  const nav = user?.role === 'admin' ? [...NAV, { id: 'admin', label: 'Admin', icon: ShieldCheck } as const] : NAV

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 flex flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center glow shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm gradient-text">AI Nexus</div>
            <div className="text-[10px] text-muted-foreground">Universal Workspace</div>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden h-8 w-8" onClick={() => setSidebarOpen(false)}>
            <span className="text-lg">×</span>
          </Button>
        </div>

        {/* New chat */}
        <div className="p-3">
          <Button
            className="w-full justify-start gap-2 neon-border"
            onClick={() => {
              setView('chat')
              useApp.getState().setCurrentConversation(null)
              useApp.getState().setMessages([])
            }}
          >
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>

        {/* Conversations list */}
        <ConversationsList />

        {/* Nav */}
        <nav className="px-2 py-2 border-t border-sidebar-border">
          {nav.map((item) => {
            const Icon = item.icon
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id as never)
                  setSidebarOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  active ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {item.id === 'admin' && <Badge variant="secondary" className="ml-auto h-4 text-[9px] px-1 py-0">ADMIN</Badge>}
              </button>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">{(user?.name || user?.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium truncate">{user?.name || 'User'}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setView('settings')}>
                <User className="h-4 w-4 mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('subscription')}>
                <CreditCard className="h-4 w-4 mr-2" /> Plan & Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDark(!dark)}>
                {dark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {dark ? 'Light mode' : 'Dark mode'}
              </DropdownMenuItem>
              {user?.role !== 'admin' && (
                <DropdownMenuItem onClick={() => toast.info('Ask an administrator for admin access.')}>
                  <ShieldCheck className="h-4 w-4 mr-2" /> Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center gap-2 px-3 shrink-0 glass">
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setSidebarOpen(true)}>
            <span className="text-lg">≡</span>
          </Button>
          {view === 'chat' ? (
            <>
              <ModelSelector />
              <ApiSourceToggle />
              <TemperatureControl />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold capitalize">{NAV.find((n) => n.id === view)?.label || view}</h1>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <HealthSummary />
          </div>
        </header>

        {/* View */}
        <main className="flex-1 overflow-hidden">
          {providersLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : view === 'chat' ? (
            <ChatView />
          ) : view === 'compare' ? (
            <CompareView />
          ) : view === 'apikeys' ? (
            <ApiKeysView />
          ) : view === 'models' ? (
            <ModelsView />
          ) : view === 'usage' ? (
            <UsageView />
          ) : view === 'subscription' ? (
            <SubscriptionView />
          ) : view === 'settings' ? (
            <SettingsView />
          ) : view === 'admin' ? (
            <AdminView />
          ) : view === 'files' ? (
            <FilesView />
          ) : (
            <ChatView />
          )}
        </main>
      </div>
    </div>
  )
}

function ApiSourceToggle() {
  const { apiSource, setSelection, providerId, byokProviders, providers } = useApp()
  const hasByok = providerId ? byokProviders.has(providerId) : false
  const provider = providers.find((p) => p.id === providerId)
  const platformAvailable = provider ? true : false // assume configured; backend enforces

  return (
    <div className="flex items-center rounded-lg border border-border p-0.5 h-9 bg-card/50">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSelection({ apiSource: 'platform' })}
              className={cn(
                'h-8 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors',
                apiSource === 'platform' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Zap className="h-3.5 w-3.5" /> Platform
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Use platform-managed credentials (subject to your plan quota).</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                if (!hasByok) {
                  toast.error(`You don't have an API key for ${provider?.displayName ?? 'this provider'} yet. Add one in API Keys.`)
                  return
                }
                setSelection({ apiSource: 'byok' })
              }}
              className={cn(
                'h-8 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors',
                apiSource === 'byok' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                !hasByok && 'opacity-50'
              )}
            >
              <KeyRound className="h-3.5 w-3.5" /> My Key
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {hasByok ? 'Use your own API key (BYOK). Not subject to platform quota.' : 'No API key connected. Add one in API Keys.'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

function TemperatureControl() {
  const { temperature, setSelection } = useApp()
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="h-9 px-2.5 rounded-lg border border-border text-xs font-medium bg-card/50 hover:bg-accent/50 transition-colors">
            {temperature.toFixed(1)}°
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-48">
          <div className="space-y-2">
            <div className="text-xs font-medium">Temperature: {temperature.toFixed(2)}</div>
            <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setSelection({ temperature: Number(e.target.value) })} className="w-full accent-primary" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function HealthSummary() {
  const { providers } = useApp()
  const operational = providers.filter((p) => p.health === 'operational').length
  const total = providers.length
  const allOk = operational === total
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1.5 rounded-lg px-2 h-8 text-xs', allOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
            <HealthDot status={allOk ? 'operational' : 'degraded'} />
            <span className="hidden sm:inline">{operational}/{total} OK</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-1 w-44">
            <div className="text-xs font-semibold">Provider health</div>
            {providers.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[11px]">
                <span>{p.displayName}</span>
                <span className="flex items-center gap-1 capitalize"><HealthDot status={p.health} /> {p.health}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

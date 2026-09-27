'use client'

import { useEffect, useState } from 'react'
import { useApp, type ProviderInfo } from '@/lib/store/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ProviderAvatar, HealthDot } from '../ui-bits'
import { KeyRound, Plus, Trash2, RefreshCw, ShieldCheck, Loader2, CheckCircle2, XCircle, Star, ExternalLink, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApiKeyRow {
  id: string
  provider: { id: string; name: string; displayName: string; color?: string | null; apiFormat: string }
  label: string | null
  keyHint: string
  status: string
  isValid: boolean
  isDefault: boolean
  lastUsedAt: string | null
  validatedAt: string | null
  createdAt: string
}

export function ApiKeysView() {
  const { providers, byokProviders, setByokProviders } = useApp()
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addProvider, setAddProvider] = useState<string>('')
  const [addKey, setAddKey] = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [validating, setValidating] = useState(false)
  const [skipValidate, setSkipValidate] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/api-keys')
    const data = await res.json()
    setKeys(data.keys || [])
    setByokProviders((data.keys || []).map((k: ApiKeyRow) => k.provider.id))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addKeySubmit() {
    if (!addProvider || !addKey.trim()) {
      toast.error('Select a provider and enter your API key.')
      return
    }
    setValidating(true)
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: addProvider, apiKey: addKey.trim(), label: addLabel, validate: !skipValidate }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to add key')
        return
      }
      toast.success('API key added securely.')
      setAddOpen(false)
      setAddProvider('')
      setAddKey('')
      setAddLabel('')
      setSkipValidate(false)
      load()
    } finally {
      setValidating(false)
    }
  }

  async function toggleKey(key: ApiKeyRow, enabled: boolean) {
    await fetch(`/api/api-keys/${key.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: enabled ? 'active' : 'disabled' }),
    })
    load()
  }

  async function setDefault(key: ApiKeyRow) {
    await fetch(`/api/api-keys/${key.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
    toast.success(`${key.provider.displayName} key set as default`)
    load()
  }

  async function revalidate(key: ApiKeyRow) {
    toast.info(`Validating ${key.provider.displayName} key…`)
    await fetch(`/api/api-keys/${key.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revalidate: true }),
    })
    load()
    toast.success(`${key.provider.displayName} key re-validated`)
  }

  async function remove(key: ApiKeyRow) {
    if (!confirm(`Delete the ${key.provider.displayName} API key? This cannot be undone.`)) return
    await fetch(`/api/api-keys/${key.id}`, { method: 'DELETE' })
    toast.success('API key deleted')
    load()
  }

  const providersWithoutKey = providers.filter((p) => !byokProviders.has(p.id))

  return (
    <div className="h-full overflow-y-auto custom-scroll">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary" /> API Keys</h1>
            <p className="text-sm text-muted-foreground mt-1">Securely connect your own AI provider keys (BYOK). Keys are encrypted at rest and never exposed to the browser.</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" /> Add Key
          </Button>
        </div>

        {/* Security banner */}
        <Card className="p-4 glass border-primary/20">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Your keys are protected</p>
              <p className="text-muted-foreground mt-0.5">Encrypted with AES-256-GCM at rest · Stored server-side only · Masked in the UI · Never logged · Validated against the provider before saving.</p>
            </div>
          </div>
        </Card>

        {/* Connected keys */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Connected Keys ({keys.length})</h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : keys.length === 0 ? (
            <Card className="p-8 text-center glass">
              <KeyRound className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium">No API keys yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Add your own provider keys to use BYOK — no platform quota limits apply.</p>
              <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add your first key</Button>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {keys.map((k) => (
                <Card key={k.id} className="p-4 glass hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <ProviderAvatar provider={k.provider} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{k.provider.displayName}</span>
                        {k.isDefault && <Badge variant="secondary" className="h-5 gap-0.5 text-[10px]"><Star className="h-3 w-3" /> Default</Badge>}
                        {k.isValid ? (
                          <Badge variant="outline" className="h-5 gap-0.5 text-[10px] text-emerald-600 border-emerald-500/30"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>
                        ) : (
                          <Badge variant="outline" className="h-5 gap-0.5 text-[10px] text-amber-600 border-amber-500/30"><XCircle className="h-3 w-3" /> Unverified</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <code className="font-mono">{k.keyHint}</code>
                        {k.label && <span>· {k.label}</span>}
                        {k.lastUsedAt && <span>· used {timeAgo(k.lastUsedAt)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch checked={k.status === 'active'} onCheckedChange={(c) => toggleKey(k, c)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => revalidate(k)} title="Re-validate"><RefreshCw className="h-3.5 w-3.5" /></Button>
                      {!k.isDefault && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDefault(k)} title="Set default"><Star className="h-3.5 w-3.5" /></Button>}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(k)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Available providers */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Available Providers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {providers.map((p) => {
              const connected = byokProviders.has(p.id)
              return (
                <Card key={p.id} className={cn('p-3.5 glass flex items-center gap-3', !connected && 'hover:border-primary/30 cursor-pointer transition-colors')} onClick={() => !connected && (setAddProvider(p.id), setAddOpen(true))}>
                  <ProviderAvatar provider={p} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{p.displayName}</span>
                      <HealthDot status={p.health} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                  </div>
                  {connected ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" /> Connected</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1"><Plus className="h-3 w-3" /> Connect</Badge>
                  )}
                  {p.documentationUrl && (
                    <a href={p.documentationUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add key dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Add API Key</DialogTitle>
            <DialogDescription>Your key is encrypted (AES-256-GCM) before storage and never sent back to the browser.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={addProvider} onValueChange={setAddProvider}>
                <SelectTrigger><SelectValue placeholder="Select a provider" /></SelectTrigger>
                <SelectContent>
                  {providersWithoutKey.length === 0 && providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>
                  ))}
                  {providersWithoutKey.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addProvider && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  {providers.find((p) => p.id === addProvider)?.documentationUrl && (
                    <a href={providers.find((p) => p.id === addProvider)!.documentationUrl!} target="_blank" rel="noopener noreferrer" className="hover:underline">Get an API key →</a>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="apikey">API Key</Label>
              <Input id="apikey" type="password" value={addKey} onChange={(e) => setAddKey(e.target.value)} placeholder="sk-..." autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label (optional)</Label>
              <Input id="label" value={addLabel} onChange={(e) => setAddLabel(e.target.value)} placeholder="e.g. Work account" />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={skipValidate} onChange={(e) => setSkipValidate(e.target.checked)} className="accent-primary" />
              Skip validation (save without testing the key)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addKeySubmit} disabled={validating}>
              {validating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {validating ? 'Validating…' : 'Add & Encrypt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function timeAgo(iso: string): string {
  const d = new Date(iso)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

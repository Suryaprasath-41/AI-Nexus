'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store/app'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, CartesianGrid } from 'recharts'
import { toast } from 'sonner'
import { ProviderAvatar, HealthDot } from '../ui-bits'
import {
  ShieldCheck, Users, Cpu, KeyRound, Activity, Plus, Loader2, DollarSign,
  AlertTriangle, CheckCircle2, FileText, Database, Server, Settings as SettingsIcon
} from 'lucide-react'

export function AdminView() {
  const { user } = useApp()
  const [tab, setTab] = useState('overview')

  if (user?.role !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Card className="p-8 text-center max-w-md glass">
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-3" />
          <h2 className="font-semibold text-lg">Admin access required</h2>
          <p className="text-sm text-muted-foreground mt-1">You need an administrator account to view this page.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="border-b border-border px-6 py-3 shrink-0">
          <h1 className="text-xl font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Admin Dashboard</h1>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-3 shrink-0">
            <TabsList className="glass">
              <TabsTrigger value="overview" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
              <TabsTrigger value="providers" className="gap-1.5"><Database className="h-3.5 w-3.5" /> Providers</TabsTrigger>
              <TabsTrigger value="models" className="gap-1.5"><Cpu className="h-3.5 w-3.5" /> Models</TabsTrigger>
              <TabsTrigger value="keys" className="gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Platform Keys</TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Logs</TabsTrigger>
            </TabsList>
          </div>
          <ScrollArea className="flex-1 custom-scroll">
            <div className="p-6">
              <TabsContent value="overview" className="mt-0"><OverviewTab /></TabsContent>
              <TabsContent value="users" className="mt-0"><UsersTab /></TabsContent>
              <TabsContent value="providers" className="mt-0"><ProvidersTab /></TabsContent>
              <TabsContent value="models" className="mt-0"><ModelsTab /></TabsContent>
              <TabsContent value="keys" className="mt-0"><PlatformKeysTab /></TabsContent>
              <TabsContent value="logs" className="mt-0"><LogsTab /></TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  )
}

function OverviewTab() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { fetch('/api/admin/overview').then((r) => r.json()).then(setData) }, [])
  if (!data) return <CenterLoader />
  return (
    <div className="max-w-5xl space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Users} label="Users" value={data.counts.users} color="text-violet-500" />
        <Stat icon={MessageSquare} label="Conversations" value={data.counts.conversations} color="text-cyan-500" />
        <Stat icon={Activity} label="Total requests" value={data.counts.usageRecords} color="text-emerald-500" />
        <Stat icon={DollarSign} label="Revenue" value={`$${data.revenue}`} color="text-amber-500" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Database} label="Providers" value={data.counts.providers} color="text-pink-500" />
        <Stat icon={Cpu} label="Models" value={data.counts.models} color="text-indigo-500" />
        <Stat icon={MessageSquare} label="Messages" value={data.counts.messages} color="text-teal-500" />
        <Stat icon={KeyRound} label="Platform keys" value={data.counts.platformCreds} color="text-orange-500" />
      </div>
      <Card className="p-5 glass">
        <div className="font-medium text-sm mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Request volume (30 days)</div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(d) => d.slice(5)} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
              <RTooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-5 glass">
        <div className="font-medium text-sm mb-3">Provider health</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.providers.map((p: any) => (
            <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-card/40">
              <ProviderAvatar provider={p} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.displayName}</div>
                <div className="text-[11px] text-muted-foreground">{p.modelCount} models</div>
              </div>
              <HealthDot status={p.health} />
              <span className="text-xs capitalize text-muted-foreground">{p.health}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/admin/users').then((r) => r.json()).then((d) => { setUsers(d.users || []); setLoading(false) }) }, [])
  if (loading) return <CenterLoader />
  return (
    <div className="max-w-5xl">
      <Card className="glass overflow-hidden">
        <div className="overflow-x-auto custom-scroll">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Plan</th>
                <th className="text-left p-3 font-medium">Requests</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3">
                    <div className="font-medium">{u.name || u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="p-3"><Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">{u.role}</Badge></td>
                  <td className="p-3 text-muted-foreground">{u.planName || 'Free'}</td>
                  <td className="p-3 text-muted-foreground">{u._count?.usageRecords ?? 0}</td>
                  <td className="p-3"><Badge variant="outline" className="capitalize">{u.status}</Badge></td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function ProvidersTab() {
  const { providers } = useApp()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', displayName: '', baseUrl: '', apiFormat: 'openai-compatible', authType: 'bearer', color: '#a855f7', documentationUrl: '' })

  async function refresh() {
    setLoading(true)
    const res = await fetch('/api/admin/providers').then((r) => r.json())
    setList(res.providers || [])
    setLoading(false)
  }
  useEffect(() => {
    let active = true
    fetch('/api/admin/providers').then((r) => r.json()).then((res) => { if (active) { setList(res.providers || []); setLoading(false) } })
    return () => { active = false }
  }, [])

  async function addProvider() {
    const res = await fetch('/api/admin/providers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { toast.success('Provider added'); setAddOpen(false); setForm({ name: '', displayName: '', baseUrl: '', apiFormat: 'openai-compatible', authType: 'bearer', color: '#a855f7', documentationUrl: '' }); refresh() }
    else toast.error('Failed to add provider')
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{list.length} providers in the registry. Add OpenAI-compatible providers without code changes.</p>
        <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Provider</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {list.map((p) => (
          <Card key={p.id} className="p-4 glass">
            <div className="flex items-center gap-3">
              <ProviderAvatar provider={p} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{p.displayName}</div>
                <code className="text-[11px] text-muted-foreground font-mono">{p.name}</code>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="capitalize">{p.status}</Badge>
                <div className="text-[11px] text-muted-foreground mt-1">{p._count?.models ?? 0} models</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-muted-foreground">
              <div><span className="text-foreground">Format:</span> {p.apiFormat}</div>
              <div><span className="text-foreground">Auth:</span> {p.authType}</div>
              {p.baseUrl && <div className="col-span-2 truncate"><span className="text-foreground">Base:</span> {p.baseUrl}</div>}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add custom provider</DialogTitle>
            <DialogDescription>OpenAI-compatible providers work with zero code changes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name (id)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="myai" /></div>
              <div className="space-y-1.5"><Label>Display name</Label><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="My AI" /></div>
            </div>
            <div className="space-y-1.5"><Label>Base URL</Label><Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.myai.com/v1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>API format</Label>
                <Select value={form.apiFormat} onValueChange={(v) => setForm({ ...form, apiFormat: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai-compatible">openai-compatible</SelectItem>
                    <SelectItem value="openai">openai</SelectItem>
                    <SelectItem value="anthropic">anthropic</SelectItem>
                    <SelectItem value="gemini">gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Auth type</Label>
                <Select value={form.authType} onValueChange={(v) => setForm({ ...form, authType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bearer">bearer</SelectItem>
                    <SelectItem value="x-api-key">x-api-key</SelectItem>
                    <SelectItem value="query">query</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addProvider}>Add Provider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ModelsTab() {
  const [models, setModels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { providers } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ providerId: '', modelName: '', displayName: '', contextWindow: 8192, maxOutput: 4096, capabilities: 'chat', inputPrice: 0, outputPrice: 0 })

  async function refresh() {
    setLoading(true)
    const res = await fetch('/api/admin/models').then((r) => r.json())
    setModels(res.models || [])
    setLoading(false)
  }
  useEffect(() => {
    let active = true
    fetch('/api/admin/models').then((r) => r.json()).then((res) => { if (active) { setModels(res.models || []); setLoading(false) } })
    return () => { active = false }
  }, [])

  async function addModel() {
    const res = await fetch('/api/admin/models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { toast.success('Model added'); setAddOpen(false); refresh() }
    else toast.error('Failed to add model')
  }

  if (loading) return <CenterLoader />
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">{models.length} models in the registry.</p>
        <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Model</Button>
      </div>
      <Card className="glass overflow-hidden">
        <div className="overflow-x-auto custom-scroll">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left p-3 font-medium">Model</th>
                <th className="text-left p-3 font-medium">Provider</th>
                <th className="text-left p-3 font-medium">Context</th>
                <th className="text-left p-3 font-medium">In $/M</th>
                <th className="text-left p-3 font-medium">Out $/M</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3"><div className="font-medium">{m.displayName}</div><code className="text-[11px] text-muted-foreground font-mono">{m.modelName}</code></td>
                  <td className="p-3"><div className="flex items-center gap-1.5"><ProviderAvatar provider={m.provider} size={18} /> {m.provider?.displayName}</div></td>
                  <td className="p-3 text-muted-foreground">{(m.contextWindow / 1000).toFixed(0)}K</td>
                  <td className="p-3 text-muted-foreground">${m.inputPrice}</td>
                  <td className="p-3 text-muted-foreground">${m.outputPrice}</td>
                  <td className="p-3"><Badge variant="outline" className="capitalize">{m.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader><DialogTitle>Add model</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={form.providerId} onValueChange={(v) => setForm({ ...form, providerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Model ID</Label><Input value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} placeholder="gpt-4o" /></div>
              <div className="space-y-1.5"><Label>Display name</Label><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="GPT-4o" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Context window</Label><Input type="number" value={form.contextWindow} onChange={(e) => setForm({ ...form, contextWindow: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Max output</Label><Input type="number" value={form.maxOutput} onChange={(e) => setForm({ ...form, maxOutput: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Input $/M</Label><Input type="number" step="0.01" value={form.inputPrice} onChange={(e) => setForm({ ...form, inputPrice: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Output $/M</Label><Input type="number" step="0.01" value={form.outputPrice} onChange={(e) => setForm({ ...form, outputPrice: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Capabilities (comma-separated)</Label><Input value={form.capabilities} onChange={(e) => setForm({ ...form, capabilities: e.target.value })} placeholder="chat,vision,tools" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addModel}>Add Model</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PlatformKeysTab() {
  const [data, setData] = useState<{ credentials: any[]; envProviders: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ providerId: '', apiKey: '' })
  const { providers } = useApp()

  async function refresh() {
    setLoading(true)
    const res = await fetch('/api/admin/platform-keys').then((r) => r.json())
    setData(res)
    setLoading(false)
  }
  useEffect(() => {
    let active = true
    fetch('/api/admin/platform-keys').then((r) => r.json()).then((res) => { if (active) { setData(res); setLoading(false) } })
    return () => { active = false }
  }, [])

  async function addKey() {
    const res = await fetch('/api/admin/platform-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { toast.success('Platform key stored (encrypted)'); setAddOpen(false); setForm({ providerId: '', apiKey: '' }); refresh() }
    else toast.error('Failed to store key')
  }

  if (loading || !data) return <CenterLoader />
  return (
    <div className="max-w-3xl space-y-4">
      <Card className="p-4 glass border-amber-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Platform credentials are never exposed</p>
            <p className="text-muted-foreground mt-0.5">These keys are encrypted (AES-256-GCM) and used server-side only when users choose "Use Platform API". Only masked hints are shown here.</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data.credentials.length} keys stored · {data.envProviders.length} via env vars</p>
        <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Key</Button>
      </div>

      <div className="space-y-2">
        {data.envProviders.map((p) => (
          <Card key={p.id} className="p-3.5 glass flex items-center gap-3">
            <ProviderAvatar provider={p} size={32} />
            <div className="flex-1">
              <div className="font-medium text-sm">{p.displayName}</div>
              <code className="text-[11px] text-muted-foreground font-mono">{p.envVar}=••••</code>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" /> Env configured</Badge>
          </Card>
        ))}
        {data.credentials.map((c) => (
          <Card key={c.id} className="p-3.5 glass flex items-center gap-3">
            <ProviderAvatar provider={c.provider} size={32} />
            <div className="flex-1">
              <div className="font-medium text-sm">{c.provider.displayName}</div>
              <code className="text-[11px] text-muted-foreground font-mono">{c.keyHint}</code>
            </div>
            <Badge variant="outline" className="capitalize">{c.status}</Badge>
          </Card>
        ))}
        {data.credentials.length === 0 && data.envProviders.length === 0 && (
          <Card className="p-8 text-center glass">
            <KeyRound className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No platform keys configured. Users must use BYOK, or set env vars like <code className="font-mono">PLATFORM_OPENAI_API_KEY</code>.</p>
          </Card>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader><DialogTitle>Store platform key</DialogTitle><DialogDescription>Encrypted at rest. Never shown again in full.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={form.providerId} onValueChange={(v) => setForm({ ...form, providerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>API Key</Label><Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addKey}>Store encrypted</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LogsTab() {
  const [kind, setKind] = useState<'system' | 'audit'>('system')
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    fetch(`/api/admin/logs?kind=${kind}`).then((r) => r.json()).then((d) => { if (active) { setLogs(d.logs || []); setLoading(false) } })
    return () => { active = false }
  }, [kind])
  function switchKind(k: 'system' | 'audit') { setLoading(true); setKind(k) }
  return (
    <div className="max-w-4xl space-y-3">
      <div className="flex gap-1 rounded-lg border border-border p-0.5 bg-card/50 w-fit">
        {(['system', 'audit'] as const).map((k) => (
          <button key={k} onClick={() => switchKind(k)} className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${kind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{k} logs</button>
        ))}
      </div>
      <Card className="glass overflow-hidden">
        <ScrollArea className="h-[500px] custom-scroll">
          <div className="p-3 space-y-1 font-mono text-[11px]">
            {loading && <div className="p-4 text-center text-muted-foreground">Loading…</div>}
            {!loading && logs.length === 0 && <div className="p-4 text-center text-muted-foreground">No logs yet.</div>}
            {logs.map((l) => (
              <div key={l.id} className="flex gap-2 p-1.5 rounded hover:bg-muted/30">
                <span className="text-muted-foreground shrink-0">{new Date(l.createdAt).toLocaleTimeString()}</span>
                {kind === 'system' ? (
                  <>
                    <span className={`shrink-0 ${l.level === 'error' ? 'text-red-500' : l.level === 'warn' ? 'text-amber-500' : 'text-muted-foreground'}`}>[{l.level}]</span>
                    <span className="text-muted-foreground shrink-0">[{l.category}]</span>
                    <span className="truncate">{l.message}</span>
                  </>
                ) : (
                  <>
                    <span className="text-primary shrink-0">{l.action}</span>
                    <span className="text-muted-foreground truncate">{l.user?.email || 'system'} {l.targetType ? `→ ${l.targetType}` : ''}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <Card className="p-4 glass">
      <div className="flex items-center gap-2 mb-1"><Icon className={`h-4 w-4 ${color}`} /><span className="text-xs text-muted-foreground">{label}</span></div>
      <div className="text-2xl font-semibold">{value}</div>
    </Card>
  )
}
function CenterLoader() { return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> }
function MessageSquare(p: any) { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> }

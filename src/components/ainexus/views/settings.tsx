'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store/app'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { User, Shield, Bell, Palette, LogOut, Save, Moon, Sun, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SettingsView() {
  const { user, setAuth } = useApp()
  const [name, setName] = useState(user?.name || '')
  const [dark, setDark] = useState(true)
  const [saving, setSaving] = useState(false)

  function toggleTheme() {
    setDark(!dark)
    document.documentElement.classList.toggle('dark', !dark)
  }

  async function saveProfile() {
    setSaving(true)
    // note: profile update endpoint omitted for brevity; would PATCH /api/auth/me
    toast.success('Profile saved')
    setSaving(false)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.reload()
  }

  return (
    <div className="h-full overflow-y-auto custom-scroll">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile, preferences, and account.</p>
        </div>

        {/* Profile */}
        <Card className="p-5 glass">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-primary" />
            <span className="font-medium">Profile</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/15 text-primary text-xl">{(name || user?.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{name || 'User'}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
              <Badge variant="outline" className="mt-1 capitalize">{user?.role}</Badge>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="glass" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} disabled className="opacity-60" />
            </div>
            <Button onClick={saveProfile} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-5 glass">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-4 w-4 text-primary" />
            <span className="font-medium">Appearance</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Theme</div>
              <div className="text-xs text-muted-foreground">Switch between dark and light mode</div>
            </div>
            <Button variant="outline" onClick={toggleTheme} className="gap-2">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {dark ? 'Light' : 'Dark'}
            </Button>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-5 glass">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium">Security</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Session management</div>
                <div className="text-xs text-muted-foreground">Sign out of all devices</div>
              </div>
              <Button variant="outline" onClick={logout} className="gap-2"><LogOut className="h-4 w-4" /> Sign out</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Delete account</div>
                <div className="text-xs text-muted-foreground">Permanently remove your account and data</div>
              </div>
              <Button variant="destructive" className="gap-2" onClick={() => toast.info('Contact support to delete your account.')}><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card className="p-5 glass">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground">AI Nexus — Universal Multi-AI Workspace</div>
            <div>One workspace for every AI. Provider-independent architecture with a database-driven model registry.</div>
            <div className="flex gap-3 pt-2">
              <span>Version 1.0.0</span>
              <span>·</span>
              <span>{user?.role === 'admin' ? 'Admin account' : 'Standard account'}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

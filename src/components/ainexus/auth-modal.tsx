'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Sparkles, Loader2 } from 'lucide-react'

export function AuthModal() {
  const { authModalOpen, authMode, closeAuth, openAuth, setAuth } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = authMode === 'register'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Something went wrong')
        return
      }
      setAuth(data.user)
      toast.success(isRegister ? 'Welcome to AI Nexus!' : 'Welcome back!')
      closeAuth()
      setEmail('')
      setPassword('')
      setName('')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function tryDemo() {
    setLoading(true)
    try {
      // attempt login as seeded admin for instant demo access
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@ainexus.ai', password: 'admin123' }),
      })
      const data = await res.json()
      if (res.ok) {
        setAuth(data.user)
        toast.success('Signed in as demo admin')
        closeAuth()
      } else {
        toast.error('Demo account unavailable. Please register.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={authModalOpen} onOpenChange={(o) => (o ? openAuth(authMode) : closeAuth())}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center glow">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold gradient-text">AI Nexus</span>
          </div>
          <DialogTitle>{isRegister ? 'Create your account' : 'Welcome back'}</DialogTitle>
          <DialogDescription>
            {isRegister
              ? 'One workspace for every AI. Start in seconds.'
              : 'Sign in to access your unified AI workspace.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" autoComplete="name" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isRegister ? 'At least 8 characters' : '••••••••'} required autoComplete={isRegister ? 'new-password' : 'current-password'} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isRegister ? 'Create account' : 'Sign in'}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={tryDemo} disabled={loading}>
            Continue as demo admin
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" className="text-primary hover:underline font-medium" onClick={() => openAuth(isRegister ? 'login' : 'register')}>
              {isRegister ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}

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
import { Sparkles, Loader2, UserCheck, ShieldCheck } from 'lucide-react'

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  )
}

export function AuthModal() {
  const { authModalOpen, authMode, closeAuth, openAuth, setAuth } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googlePromptOpen, setGooglePromptOpen] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')

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
      useApp.getState().setView('chat')
      toast.success(isRegister ? 'Account created successfully! Welcome to AI Nexus.' : 'Welcome back!')
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

  async function continueWithGoogle(customEmail?: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customEmail || googleEmail || undefined }),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        setAuth(data.user)
        useApp.getState().setView('chat')
        toast.success(`Signed in with Google as ${data.user.email}!`)
        closeAuth()
        setGooglePromptOpen(false)
      } else {
        toast.error(data.error || 'Google sign-in failed.')
      }
    } catch {
      toast.error('Network error during Google sign-in.')
    } finally {
      setLoading(false)
    }
  }

  async function continueAsGuest() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.user) {
        setAuth(data.user)
        useApp.getState().setView('chat')
        toast.info('Welcome! Browsing as Guest (Chat only). Sign in anytime to create projects.', {
          duration: 6000,
        })
        closeAuth()
      } else {
        toast.error('Could not start guest session.')
      }
    } catch {
      toast.error('Network error starting guest session.')
    } finally {
      setLoading(false)
    }
  }

  async function tryDemo() {
    setLoading(true)
    try {
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
              ? 'Register with your email and password, or continue with Google.'
              : 'Sign in to access your unified AI workspace and projects.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Quick Social & Google Login */}
          <div className="space-y-2">
            {!googlePromptOpen ? (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2.5 h-10 font-medium hover:bg-card border-border/80"
                onClick={() => continueWithGoogle()}
                disabled={loading}
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </Button>
            ) : (
              <div className="p-3 rounded-lg border border-border bg-card/60 space-y-2.5">
                <Label htmlFor="googleEmail" className="text-xs">Your Google Email ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="googleEmail"
                    type="email"
                    placeholder="user@gmail.com"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="h-9 text-xs"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => continueWithGoogle(googleEmail)}
                    disabled={loading || !googleEmail.includes('@')}
                  >
                    Enter
                  </Button>
                </div>
              </div>
            )}

            {/* Guest Login Option */}
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 h-9 text-xs text-muted-foreground hover:text-foreground"
              onClick={continueAsGuest}
              disabled={loading}
            >
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span>Continue as Guest (Chat only)</span>
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              Guests can chat freely with any AI. Creating projects requires signing in.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">Or continue with Email</span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={submit} className="space-y-3.5">
            {isRegister && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your Name (optional)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Customer Email ID</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                required
                autoComplete="email"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{isRegister ? 'Create Password' : 'Password'}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? 'At least 8 characters' : '••••••••'}
                required
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="h-9"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-10 font-medium">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isRegister ? 'Register Account' : 'Sign In with Email'}
            </Button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground underline"
                onClick={tryDemo}
                disabled={loading}
              >
                Demo Admin Access
              </button>
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => openAuth(isRegister ? 'login' : 'register')}
              >
                {isRegister ? 'Existing user? Sign In' : 'New user? Register'}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

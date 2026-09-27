'use client'

import { useEffect } from 'react'
import { useApp } from '@/lib/store/app'
import { LandingPage } from '@/components/ainexus/landing'
import { AppShell } from '@/components/ainexus/app-shell'
import { AuthModal } from '@/components/ainexus/auth-modal'

export default function Home() {
  const { user, authLoading, setAuth, setAuthLoading, view } = useApp()

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setAuth(data.user ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAuthLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [setAuth, setAuthLoading, view])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse-glow" />
            <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-chart-3 glow animate-float" />
          </div>
          <p className="text-sm text-muted-foreground">Initializing AI Nexus…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {user ? <AppShell /> : <LandingPage />}
      <AuthModal />
    </>
  )
}

'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { FolderPlus, Sparkles, Loader2, Lock, Zap } from 'lucide-react'

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

interface ProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectModal({ open, onOpenChange }: ProjectModalProps) {
  const { user, openAuth, setAuth, providers, providerId, modelId, apiSource, temperature, setView, setCurrentConversation, setConversations, conversations, setMessages } = useApp()
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedProviderId, setSelectedProviderId] = useState(providerId || '')
  const [selectedModelId, setSelectedModelId] = useState(modelId || '')
  const [loading, setLoading] = useState(false)

  const isGuest = !user || user.role === 'guest'

  async function handleGoogleLogin() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user.google@gmail.com' }),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        setAuth(data.user)
        toast.success(`Signed in with Google! You can now create projects.`)
      } else {
        toast.error('Google sign-in failed.')
      }
    } catch {
      toast.error('Network error during Google sign-in.')
    } finally {
      setLoading(false)
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    if (!projectName.trim()) return

    setLoading(true)
    try {
      const activePid = selectedProviderId || providerId || providers[0]?.id
      const activeProv = providers.find((p) => p.id === activePid)
      const activeMid = selectedModelId || modelId || activeProv?.models[0]?.id

      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `📁 ${projectName.trim()}`,
          project: projectName.trim(),
          providerId: activePid,
          modelId: activeMid,
          apiSource,
          temperature,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'guest_restricted') {
          toast.error('Please sign in or continue with Google to create projects.')
          openAuth('login')
          return
        }
        toast.error(data.error || 'Failed to create project')
        return
      }

      if (data.conversation) {
        setConversations([data.conversation, ...conversations])
        setCurrentConversation(data.conversation.id)
        setView('chat')
        onOpenChange(false)
        setProjectName('')
        setDescription('')

        // Seed with project kick-off guidance
        const starterPrompt = description
          ? `I'm starting a new project: "${projectName}".\nGoal: ${description}\nPlease outline an architecture and step-by-step implementation plan.`
          : `I'm starting a new project: "${projectName}". Please suggest an initial architecture and roadmap.`

        setMessages([
          {
            id: `init-${Date.now()}`,
            role: 'assistant',
            content: `📁 **Project Created: ${projectName}**\n\nWelcome to your project workspace! Ready to build. What are your core requirements, or would you like an initial breakdown?`,
            providerId: activePid,
            modelName: activeProv?.models.find((m) => m.id === activeMid)?.displayName || 'AI Assistant',
            apiSource,
            inputTokens: 0,
            outputTokens: 0,
            latencyMs: 0,
            status: 'complete',
            errorMessage: null,
            attachments: null,
            createdAt: new Date().toISOString(),
          }
        ])

        toast.success(`Project "${projectName}" created!`)
      }
    } catch {
      toast.error('Network error creating project.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-md">
        {isGuest ? (
          /* Guest Gate: Must sign in or continue with Google */
          <div className="space-y-4 pt-1">
            <DialogHeader>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-2">
                <Lock className="h-6 w-6" />
              </div>
              <DialogTitle className="text-lg">Sign In to Create Projects</DialogTitle>
              <DialogDescription className="text-sm">
                Guests can chat and test models freely. To create, save, and organize full projects, please sign in with your email or Continue with Google.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5 pt-2">
              <Button
                variant="outline"
                className="w-full gap-2.5 h-10 font-medium hover:bg-card border-border/80"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </Button>

              <Button
                className="w-full h-10 font-medium"
                onClick={() => {
                  onOpenChange(false)
                  openAuth('login')
                }}
              >
                Sign In with Email & Password
              </Button>

              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={() => {
                  onOpenChange(false)
                  openAuth('register')
                }}
              >
                New user? Create an account
              </Button>
            </div>
          </div>
        ) : (
          /* Logged In Customer: Create Project Form */
          <form onSubmit={createProject} className="space-y-4 pt-1">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <FolderPlus className="h-5 w-5" />
                </div>
                <DialogTitle>Create New Project</DialogTitle>
              </div>
              <DialogDescription>
                Create a persistent project workspace. All conversations, code, and context will be organized under this project.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  placeholder="e.g. Next.js SaaS Platform, AI Chatbot"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Scope / Goal (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you are building, target stack, or key features..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[70px] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modelSelect">Primary AI Model</Label>
                <select
                  id="modelSelect"
                  className="w-full h-9 rounded-lg border border-border bg-card/60 px-3 text-xs outline-none focus:border-primary"
                  value={selectedProviderId}
                  onChange={(e) => {
                    const pid = e.target.value
                    setSelectedProviderId(pid)
                    const p = providers.find((pr) => pr.id === pid)
                    if (p && p.models.length > 0) setSelectedModelId(p.models[0].id)
                  }}
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} ({p.models.length} models)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !projectName.trim()} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Sparkles className="h-4 w-4" /> Create Project
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

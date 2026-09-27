'use client'

import { motion, type Variants } from 'framer-motion'
import {
  Sparkles, ArrowRight, Zap, KeyRound, MessagesSquare, GitCompareArrows,
  Cpu, ShieldCheck, Shield, Server, EyeOff, ScrollText, Check, Plus,
  Brain, Code, Lightbulb, PenLine, Languages, MousePointerClick,
  Lock, ChevronRight, Star, Layers, Gauge, Building2, Users, UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { AICoreScene, AICoreFallback } from '@/components/three/aicore'
import { useApp } from '@/lib/store/app'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

const PROVIDERS = [
  { name: 'OpenAI',   color: '#10a37f', desc: 'GPT-4o, o1, o3-mini & more' },
  { name: 'Gemini',   color: '#4285f4', desc: 'Google Gemini 2.0 Flash & Pro' },
  { name: 'Claude',   color: '#d97757', desc: 'Anthropic Claude 3.5 Sonnet' },
  { name: 'DeepSeek', color: '#4d6bce', desc: 'DeepSeek V3 & R1 reasoning' },
  { name: 'Groq',     color: '#f55036', desc: 'Ultra-low-latency LPU inference' },
  { name: 'Mistral',  color: '#ff7000', desc: 'Mistral Large & Codestral' },
  { name: 'Qwen',     color: '#615ced', desc: 'Alibaba Qwen 2.5 family' },
] as const

const NAV_LINKS = [
  { id: 'features',  label: 'Features' },
  { id: 'providers', label: 'Providers' },
  { id: 'pricing',   label: 'Pricing' },
  { id: 'faq',       label: 'FAQ' },
] as const

/* -------------------------------------------------------------------------- */
/*  Animation variants                                                        */
/* -------------------------------------------------------------------------- */

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function scrollToId(id: string) {
  if (typeof document === 'undefined') return
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
      {children}
    </div>
  )
}

function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

/* -------------------------------------------------------------------------- */
/*  Navigation                                                                 */
/* -------------------------------------------------------------------------- */

function LandingNav() {
  const { openAuth } = useApp()
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 glass-strong">
      <Container className="flex h-16 items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={() => scrollToId('top')}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-3 glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight gradient-text">AI Nexus</span>
        </button>

        {/* Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToId(link.id)}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={async () => {
              const res = await fetch('/api/auth/guest', { method: 'POST' })
              const d = await res.json()
              if (d.user) {
                useApp.getState().setAuth(d.user)
                useApp.getState().setView('chat')
              }
            }}
          >
            <UserCheck className="h-3.5 w-3.5 mr-1" /> Try as Guest
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex text-xs"
            onClick={() => openAuth('login')}
          >
            Sign in
          </Button>
          <Button size="sm" className="gap-1.5 neon-border text-xs" onClick={() => openAuth('register')}>
            <Sparkles className="h-3.5 w-3.5" />
            Start Using AI
          </Button>
        </div>
      </Container>
    </header>
  )
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  const { openAuth } = useApp()
  return (
    <section id="top" className="relative overflow-hidden">
      {/* background layers */}
      <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-60" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute right-[8%] top-1/3 h-[320px] w-[320px] rounded-full bg-chart-2/10 blur-[100px]" />
        <div className="absolute left-[5%] bottom-0 h-[280px] w-[280px] rounded-full bg-chart-3/10 blur-[100px]" />
      </div>

      <Container className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        {/* Left */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={containerVariants}
          className="flex flex-col items-start gap-6"
        >
          <motion.div variants={itemVariants}>
            <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 px-3 py-1 text-primary">
              <Sparkles className="h-3 w-3" />
              Universal Multi-AI Workspace
            </Badge>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            ONE WORKSPACE.
            <br />
            <span className="gradient-text">EVERY AI.</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="max-w-xl text-base text-muted-foreground sm:text-lg"
          >
            Connect, compare, and use multiple AI models from one intelligent
            workspace. Bring your own keys or use platform credits — your call.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
            <Button size="lg" className="gap-2 neon-border" onClick={() => openAuth('register')}>
              <Sparkles className="h-4 w-4" />
              Start Using AI
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => scrollToId('providers')}
            >
              <Layers className="h-4 w-4" />
              Explore Models
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 glass"
              onClick={async () => {
                const res = await fetch('/api/auth/guest', { method: 'POST' })
                const d = await res.json()
                if (d.user) {
                  useApp.getState().setAuth(d.user)
                  useApp.getState().setView('chat')
                }
              }}
            >
              <UserCheck className="h-4 w-4 text-primary" />
              Try as Guest
            </Button>
          </motion.div>

          {/* Provider chips */}
          <motion.div variants={itemVariants} className="mt-2 flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <span
                key={p.name}
                className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}` }}
                />
                {p.name}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Right — 3D */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="relative"
        >
          {/* radial glow behind core */}
          <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
            <div className="h-[360px] w-[360px] rounded-full bg-primary/25 blur-[90px] animate-pulse-glow" />
          </div>

          {/* Desktop / tablet: real 3D */}
          <div className="hidden md:block">
            <AICoreScene className="h-[420px] w-full" />
          </div>
          {/* Mobile: CSS fallback */}
          <div className="md:hidden">
            <AICoreFallback className="h-[300px] w-full" />
          </div>
        </motion.div>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section heading                                                            */
/* -------------------------------------------------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string
  title: React.ReactNode
  description?: string
  align?: 'center' | 'left'
}) {
  return (
    <div className={cn('flex flex-col gap-4', align === 'center' ? 'items-center text-center' : 'items-start text-left')}>
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {description && (
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{description}</p>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Providers                                                                  */
/* -------------------------------------------------------------------------- */

function ProviderCard({ p }: { p: { name: string; color: string; desc: string } }) {
  return (
    <motion.div variants={itemVariants} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
      <Card className="glass h-full gap-0 p-5 hover:glow">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: p.color, boxShadow: `0 0 18px ${p.color}55` }}
          >
            {p.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{p.name}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Connected
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>
      </Card>
    </motion.div>
  )
}

function ProvidersSection() {
  return (
    <section id="providers" className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Supported AI providers"
          title={<>Seven providers. One unified API.</>}
          description="Plug into every major model family — or add your own OpenAI-compatible endpoint. No vendor lock-in, no context switching."
        />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PROVIDERS.map((p) => (
            <ProviderCard key={p.name} p={p} />
          ))}
          <ProviderCard
            p={{
              name: 'Custom',
              color: '#a855f7',
              desc: 'Any OpenAI-compatible endpoint (vLLM, Ollama, OpenRouter…)',
            }}
          />
        </motion.div>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  How it works                                                               */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      icon: MousePointerClick,
      title: 'Pick a provider & model',
      desc: 'Browse 7 providers and 40+ models. Filter by context window, price, or capability.',
    },
    {
      icon: KeyRound,
      title: 'Platform API or your own key',
      desc: 'Use our managed credits (BYOK-free) or paste your API key for unlimited, direct-billed access.',
    },
    {
      icon: MessagesSquare,
      title: 'Chat, compare & route',
      desc: 'Send one prompt to many AIs side-by-side, or let the Auto Router pick the best model per task.',
    },
  ]
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-30" />
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title={<>From zero to multi-AI in 60 seconds</>}
          description="No SDK setup. No model wrangling. Sign in, pick a model, and start chatting."
        />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="relative mt-14 grid gap-6 md:grid-cols-3"
        >
          {/* connecting line */}
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 md:block" />

          {steps.map((step, i) => (
            <motion.div key={step.title} variants={itemVariants}>
              <Card className="glass relative h-full p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-3 text-lg font-bold text-white glow">
                    {i + 1}
                  </div>
                  <step.icon className="h-6 w-6 text-primary/70" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  BYOK                                                                       */
/* -------------------------------------------------------------------------- */

function ByokSection() {
  const checklist = [
    { icon: Plus,        label: 'Add an API key from any supported provider' },
    { icon: Check,       label: 'Server-side validation on save' },
    { icon: Lock,        label: 'Encrypted at rest with AES-256-GCM' },
    { icon: Server,      label: 'Never exposed to the client after creation' },
    { icon: EyeOff,      label: 'Masked display — only ••••92 is shown in the UI' },
  ]
  const mockRows = [
    { name: 'OpenAI', color: '#10a37f', masked: '••••92', connected: true },
    { name: 'Gemini', color: '#4285f4', masked: '••••31', connected: true },
    { name: 'Claude', color: '#d97757', masked: null,     connected: false },
  ]
  return (
    <section className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Bring your own key"
          title={<>Your keys. Your rules.</>}
          description="Connect your own provider credentials and bypass platform quotas entirely. We never see the plaintext — only you do, once, when you paste it."
          align="left"
        />

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          {/* Left — checklist */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={containerVariants}
            className="flex flex-col gap-3"
          >
            {checklist.map((item) => (
              <motion.div
                key={item.label}
                variants={itemVariants}
                className="flex items-center gap-3 rounded-xl glass p-3.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-sm">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Right — mock API key manager */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="glass-strong neon-border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span className="font-semibold">API Key Manager</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">Encrypted</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Server-side · AES-256-GCM · masked display
              </p>

              <div className="mt-5 flex flex-col gap-3">
                {mockRows.map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3"
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: row.color }}
                    >
                      {row.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{row.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {row.masked ?? 'No key added'}
                      </div>
                    </div>
                    {row.connected ? (
                      <Badge variant="secondary" className="gap-1.5 bg-emerald-500/15 text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1.5 bg-destructive/15 text-destructive">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        Not Connected
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                Keys never leave the server after creation.
              </div>
            </Card>
          </motion.div>
        </div>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  AI Comparison                                                              */
/* -------------------------------------------------------------------------- */

function ComparisonSection() {
  const prompt = 'Explain quantum entanglement in one sentence.'
  const responses = [
    {
      name: 'GPT-4o',
      color: '#10a37f',
      text: 'Quantum entanglement is a phenomenon where two particles become linked so that the state of one instantly determines the state of the other, regardless of distance.',
      time: '1.2s',
      tokens: '142 tok',
      cost: '$0.0021',
    },
    {
      name: 'Gemini 2.0',
      color: '#4285f4',
      text: 'When two quantum particles are entangled, measuring one immediately reveals the state of the other — even across galaxies — because their fates are mathematically inseparable.',
      time: '0.9s',
      tokens: '138 tok',
      cost: '$0.0015',
    },
    {
      name: 'Claude 3.5',
      color: '#d97757',
      text: 'Entanglement is a quantum correlation between particles where each one\u2019s properties can\u2019t be described independently, so measuring one instantly predicts the other.',
      time: '1.4s',
      tokens: '121 tok',
      cost: '$0.0027',
    },
  ]
  return (
    <section className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-30" />
      <Container>
        <SectionHeading
          eyebrow="AI comparison"
          title={<>One prompt. Every model. You decide.</>}
          description="Send the same instruction to multiple AIs and compare latency, token usage, and cost side-by-side."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-10 max-w-3xl"
        >
          <div className="flex items-start gap-3 rounded-2xl glass-strong p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Prompt</div>
              <p className="mt-0.5 text-sm font-medium">{prompt}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mt-6 grid gap-4 md:grid-cols-3"
        >
          {responses.map((r) => (
            <motion.div key={r.name} variants={itemVariants} whileHover={{ y: -4 }}>
              <Card className="glass h-full p-5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: r.color }}
                  >
                    {r.name.charAt(0)}
                  </div>
                  <span className="font-semibold">{r.name}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">{r.text}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> {r.time}</span>
                  <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {r.tokens}</span>
                  <span className="font-mono text-emerald-400">{r.cost}</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
          Let the user decide — we never claim one model is objectively better.
        </p>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Auto Model Router                                                          */
/* -------------------------------------------------------------------------- */

function RouterSection() {
  const categories = [
    { icon: Code,       label: 'Coding' },
    { icon: Lightbulb,  label: 'Reasoning' },
    { icon: PenLine,    label: 'Writing' },
    { icon: Languages,  label: 'Translation' },
  ]
  return (
    <section className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Auto model router"
          title={<>Let the router pick the right brain</>}
          description="AUTO mode classifies each prompt and dispatches it to the model best suited for the task — coding, reasoning, writing, or translation."
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mt-12"
        >
          <Card className="glass-strong p-8">
            {/* Flow */}
            <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
              {/* Prompt chip */}
              <div className="flex items-center gap-3 rounded-xl glass px-4 py-3">
                <MessagesSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Your prompt</span>
              </div>

              <ChevronRight className="hidden h-5 w-5 text-muted-foreground lg:block" />
              <ArrowRight className="h-5 w-5 text-muted-foreground lg:hidden" />

              {/* Router brain */}
              <div className="relative flex flex-col items-center gap-2">
                <div className="absolute inset-0 -z-10 rounded-full bg-primary/25 blur-2xl animate-pulse-glow" />
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-3 text-white glow">
                  <Brain className="h-8 w-8" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Router</span>
              </div>

              <ChevronRight className="hidden h-5 w-5 text-muted-foreground lg:block" />
              <ArrowRight className="h-5 w-5 text-muted-foreground lg:hidden" />

              {/* Task chips */}
              <div className="grid grid-cols-2 gap-2">
                {categories.map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center gap-1.5 rounded-lg glass px-3 py-2 text-xs"
                  >
                    <c.icon className="h-3.5 w-3.5 text-primary" />
                    {c.label}
                  </div>
                ))}
              </div>

              <ChevronRight className="hidden h-5 w-5 text-muted-foreground lg:block" />
              <ArrowRight className="h-5 w-5 text-muted-foreground lg:hidden" />

              {/* Selected model badge */}
              <div className="flex flex-col items-center gap-2">
                <Badge className="gap-1.5 bg-gradient-to-r from-primary to-chart-3 px-3 py-1.5 text-xs text-white">
                  <Zap className="h-3 w-3" />
                  DeepSeek Coder V3
                </Badge>
                <span className="text-xs text-muted-foreground">selected model</span>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-emerald-400" />
              Always shows which model was selected. You can override anytime.
            </div>
          </Card>
        </motion.div>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Security                                                                   */
/* -------------------------------------------------------------------------- */

function SecuritySection() {
  const features = [
    { icon: Shield,      title: 'Encrypted at rest',     desc: 'API keys encrypted with AES-256-GCM before they ever touch the database.' },
    { icon: Server,      title: 'Server-side handling',  desc: 'Secrets are read, used, and discarded on the server — never shipped to the browser.' },
    { icon: EyeOff,      title: 'API-key masking',       desc: 'UI displays only masked previews like ••••92. Full keys are unrecoverable.' },
    { icon: ScrollText,  title: 'Audit logs',            desc: 'Every request is logged with provider, model, tokens, and latency for review.' },
  ]
  return (
    <section className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Security"
          title={<>Built like a vault, not a billboard</>}
          description="Your credentials and conversations get the same protections whether you\u2019re on the Free or Business plan."
        />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={itemVariants} whileHover={{ y: -4 }}>
              <Card className="glass h-full p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Pricing                                                                    */
/* -------------------------------------------------------------------------- */

function PricingSection() {
  const { openAuth } = useApp()
  const plans = [
    {
      name: 'Free',
      price: '$0',
      cadence: '/mo',
      icon: Sparkles,
      highlight: false,
      features: [
        '100 platform requests/mo',
        'Bring your own keys',
        'Chat history',
        'Model switching',
      ],
      cta: 'Get started',
    },
    {
      name: 'Pro',
      price: '$20',
      cadence: '/mo',
      icon: Zap,
      highlight: true,
      features: [
        '2,000 requests/mo',
        'AI Comparison',
        'Auto Model Router',
        'Advanced analytics',
        'Everything in Free',
      ],
      cta: 'Start Pro trial',
    },
    {
      name: 'Business',
      price: '$99',
      cadence: '/mo',
      icon: Building2,
      highlight: false,
      features: [
        '20,000 requests/mo',
        'Priority processing',
        'Team admin',
        'Audit logs',
        'Custom providers',
        'Everything in Pro',
      ],
      cta: 'Contact sales',
    },
  ]

  return (
    <section id="pricing" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-30" />
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title={<>Start free. Scale when you mean it.</>}
          description="Every plan supports BYOK — only pay us when you want platform-managed credits."
        />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              whileHover={{ y: -6 }}
              className={cn('relative', plan.highlight && 'md:-mt-4 md:mb-4')}
            >
              <Card
                className={cn(
                  'glass relative flex h-full flex-col p-6',
                  plan.highlight && 'glass-strong neon-border glow'
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gap-1 bg-gradient-to-r from-primary to-chart-3 px-3 py-1 text-[10px] uppercase tracking-wider text-white">
                      <Star className="h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <plan.icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold">{plan.name}</span>
                </div>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-6 w-full"
                  variant={plan.highlight ? 'default' : 'outline'}
                  onClick={() => openAuth('register')}
                >
                  {plan.cta}
                </Button>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Static demo pricing. Real plans are configured server-side.
        </p>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                        */
/* -------------------------------------------------------------------------- */

function FaqSection() {
  const faqs = [
    {
      q: 'What is BYOK?',
      a: 'Bring Your Own Key. Instead of using our platform-managed credits, you connect your own API key from OpenAI, Google, Anthropic, or any supported provider. Requests are billed directly by the provider, and you keep full control of your spending and rate limits.',
    },
    {
      q: 'Is my API key safe?',
      a: 'Yes. Keys are encrypted at rest with AES-256-GCM, never sent to the browser after creation, and only used server-side to proxy your requests. We never log key material — the UI only shows masked previews like ••••92.',
    },
    {
      q: 'Can I switch models mid-conversation?',
      a: 'Absolutely. Every message can be sent to a different provider or model. Your conversation history is preserved and automatically adapted to each model\u2019s context window.',
    },
    {
      q: 'Do I need my own API key?',
      a: 'No. The Free plan includes 100 platform requests per month using our managed credentials. Bring your own key only when you need higher volume, specific enterprise models, or want to avoid platform markups.',
    },
    {
      q: 'Which providers are supported?',
      a: 'OpenAI, Google Gemini, Anthropic Claude, DeepSeek, Groq, Mistral, and Alibaba Qwen are supported out of the box, plus any OpenAI-compatible custom endpoint via the Custom provider.',
    },
    {
      q: 'Can I add a custom provider?',
      a: 'Yes. Any endpoint that speaks the OpenAI Chat Completions format — vLLM, LM Studio, Ollama, Together, OpenRouter, and more — can be added as a Custom provider with a base URL and optional API key.',
    },
  ]
  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <Container className="max-w-3xl">
        <SectionHeading
          eyebrow="FAQ"
          title={<>Questions, answered</>}
          description="Everything you might want to know before signing up. Still stuck? Reach out anytime."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mt-10"
        >
          <Card className="glass p-4 sm:p-6">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={faq.q} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </motion.div>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                     */
/* -------------------------------------------------------------------------- */

function LandingFooter() {
  const columns = [
    {
      title: 'Product',
      links: ['Features', 'Pricing', 'AI Comparison', 'Auto Router', 'BYOK'],
    },
    {
      title: 'Providers',
      links: ['OpenAI', 'Gemini', 'Claude', 'DeepSeek', 'Mistral'],
    },
    {
      title: 'Company',
      links: ['About', 'Blog', 'Careers', 'Contact', 'Status'],
    },
    {
      title: 'Legal',
      links: ['Privacy', 'Terms', 'Security', 'DPA', 'Cookies'],
    },
  ]
  return (
    <footer className="mt-auto border-t border-border/60 glass">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-3 glow">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight gradient-text">AI Nexus</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The universal multi-AI workspace. One interface, every model, your keys or ours.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              SOC2-style controls · AES-256-GCM · server-side secrets
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold">{col.title}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <span className="cursor-default text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© 2025 AI Nexus. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            Built as a universal multi-AI platform.
          </span>
        </div>
      </Container>
    </footer>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* global background layers */}
      <div className="pointer-events-none fixed inset-0 -z-20 grid-bg opacity-40" />

      <LandingNav />

      <main className="flex-1">
        <Hero />
        <ProvidersSection />
        <HowItWorks />
        <ByokSection />
        <ComparisonSection />
        <RouterSection />
        <SecuritySection />
        <PricingSection />
        <FaqSection />
      </main>

      <LandingFooter />
    </div>
  )
}

export default LandingPage

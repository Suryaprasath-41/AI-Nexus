'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useApp, type ChatMessage } from '@/lib/store/app'
import { Markdown } from '../markdown'
import { ProviderAvatar, formatTokens } from '../ui-bits'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Send, Square, RefreshCw, Copy, Check, Pencil, Trash2, Paperclip,
  Sparkles, AlertTriangle, Zap, KeyRound, Mic, X, FileText, Cpu, ArrowDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Attachment { name: string; size: number; type: string }

export function ChatView() {
  const {
    providers, providerId, modelId, apiSource, temperature,
    conversations, currentConversationId, setCurrentConversation,
    messages, setMessages, addMessage, updateMessage, removeMessage, setConversations,
  } = useApp()
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const fallbackProvider =
    providers.find((p) => p.name === 'groq' && p.models?.length) ||
    providers.find((p) => p.name === 'openai' && p.models?.length) ||
    providers.find((p) => p.models?.length) ||
    providers[0]

  const provider = providers.find((p) => p.id === providerId || p.name === providerId) || fallbackProvider
  const model = provider?.models.find((m) => m.id === modelId || m.modelName === modelId) || provider?.models[0]

  // Auto-select fallback if selection is missing
  useEffect(() => {
    if ((!providerId || !modelId) && provider && model) {
      useApp.getState().setSelection({
        providerId: provider.id,
        modelId: model.id,
      })
    }
  }, [providerId, modelId, provider, model])

  // Auto-focus input when conversation changes or opens
  useEffect(() => {
    textareaRef.current?.focus()
  }, [currentConversationId])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior,
        })
      }
      bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
    })
  }, [])

  function handleScroll() {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const distanceToBottom = scrollHeight - scrollTop - clientHeight
    setShowScrollButton(distanceToBottom > 120)
  }

  useEffect(() => {
    scrollToBottom(streaming ? 'auto' : 'smooth')
  }, [messages, streaming, scrollToBottom])

  async function ensureConversation(): Promise<string | null> {
    if (currentConversationId) return currentConversationId
    const activePid = provider?.id || providerId
    const activeMid = model?.id || modelId
    if (!activePid || !activeMid) return null
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New chat', providerId: activePid, modelId: activeMid, apiSource, temperature }),
    })
    const data = await res.json()
    if (data.conversation) {
      setCurrentConversation(data.conversation.id)
      setConversations([data.conversation, ...conversations])
      return data.conversation.id
    }
    return null
  }

  async function send(prompt?: string) {
    const content = (prompt ?? input).trim()
    if (!content || streaming) return
    const activePid = provider?.id || providerId
    const activeMid = model?.id || modelId
    if (!activePid || !activeMid || !provider || !model) {
      toast.error('Please select an AI model first.')
      return
    }

    setInput('')
    setAttachments([])

    // optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      providerId,
      modelName: model.modelName,
      apiSource,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      status: 'complete',
      errorMessage: null,
      attachments: attachments.length ? JSON.stringify(attachments) : null,
      createdAt: new Date().toISOString(),
    }
    addMessage(tempUserMsg)

    // build message history (include existing + new)
    const history = messages
      .filter((m) => m.status !== 'error')
      .map((m) => ({ role: m.role, content: m.content }))
    const sendMessages = [...history, { role: 'user' as const, content }]

    const convId = await ensureConversation()

    // optimistic assistant placeholder
    const assistantId = `temp-a-${Date.now()}`
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      providerId,
      modelName: model.modelName,
      apiSource,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      status: 'streaming',
      errorMessage: null,
      attachments: null,
      createdAt: new Date().toISOString(),
    })

    setStreaming(true)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          providerId,
          modelId,
          messages: sendMessages,
          apiSource,
          temperature,
          autoFallback: useApp.getState().autoFailover,
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      let realId: string | null = null
      let finalUsage: { inputTokens: number; outputTokens: number; cost: number; latencyMs: number } | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const evt = JSON.parse(payload)
            if (evt.type === 'start') {
              realId = evt.messageId
            } else if (evt.type === 'fallback') {
              toast.info(`Switched to ${evt.toProvider}`, {
                description: evt.reason || 'Switched provider to complete your project.',
                duration: 5000,
              })
              updateMessage(assistantId, {
                providerId: evt.toProviderId || undefined,
                modelName: evt.toModel,
                fallbackInfo: {
                  fromProvider: evt.fromProvider,
                  fromModel: evt.fromModel,
                  toProvider: evt.toProvider,
                  toModel: evt.toModel,
                  reason: evt.reason,
                },
              })
            } else if (evt.type === 'delta') {
              accumulated += evt.delta
              updateMessage(assistantId, { content: accumulated })
            } else if (evt.type === 'usage') {
              finalUsage = { inputTokens: evt.inputTokens, outputTokens: evt.outputTokens, cost: evt.cost, latencyMs: evt.latencyMs }
            } else if (evt.type === 'error') {
              updateMessage(assistantId, { status: 'error', errorMessage: evt.message })
              if (evt.actions?.includes('byok')) {
                toast.error(evt.message, { action: { label: 'Add API Key', onClick: () => useApp.getState().setView('apikeys') } })
              } else if (evt.actions?.includes('upgrade')) {
                toast.error(evt.message, { action: { label: 'Upgrade', onClick: () => useApp.getState().setView('subscription') } })
              } else {
                toast.error(evt.message)
              }
            } else if (evt.type === 'done') {
              updateMessage(assistantId, {
                status: 'complete',
                inputTokens: finalUsage?.inputTokens ?? 0,
                outputTokens: finalUsage?.outputTokens ?? 0,
                latencyMs: finalUsage?.latencyMs ?? 0,
                id: realId || assistantId,
              })
            }
          } catch {
            // ignore
          }
        }
      }
      // refresh conversations list to reflect updated title/order
      fetch('/api/conversations').then((r) => r.json()).then((d) => d.conversations && setConversations(d.conversations))
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        updateMessage(assistantId, { status: 'stopped' })
      } else {
        updateMessage(assistantId, { status: 'error', errorMessage: (e as Error).message })
        toast.error((e as Error).message)
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function stop() {
    abortRef.current?.abort()
  }

  async function regenerate(message: ChatMessage) {
    // find the user message before this assistant message
    const idx = messages.indexOf(message)
    let userIdx = idx - 1
    while (userIdx >= 0 && messages[userIdx].role !== 'user') userIdx--
    if (userIdx < 0) return
    const userMsg = messages[userIdx]
    // remove the assistant message locally
    removeMessage(message.id)
    // also remove from DB
    if (!message.id.startsWith('temp-')) {
      await fetch(`/api/conversations/${currentConversationId}/messages?messageId=${message.id}`, { method: 'DELETE' })
    }
    // re-send from that user message
    const history = messages.slice(0, userIdx).filter((m) => m.status !== 'error').map((m) => ({ role: m.role, content: m.content }))
    regenerateSend(userMsg.content, history)
  }

  async function switchAndRetry(message: ChatMessage) {
    const { providers: allProv, providerId: currProvId, byokProviders } = useApp.getState()
    const alt = allProv.find((p) => p.id !== currProvId && p.models.length > 0)
    if (alt) {
      const altModel = alt.models.find((m) => m.tags?.includes('fast')) || alt.models[0]
      const source = byokProviders.has(alt.id) ? 'byok' : 'platform'
      useApp.getState().setSelection({ providerId: alt.id, modelId: altModel.id, apiSource: source })
      toast.info(`Switched to ${alt.displayName} (${altModel.displayName})`)
      setTimeout(() => {
        regenerate(message)
      }, 50)
    } else {
      toast.error('No alternative AI provider available.')
    }
  }

  async function regenerateSend(content: string, history: { role: string; content: string }[]) {
    if (!providerId || !modelId || !model) return
    const assistantId = `temp-a-${Date.now()}`
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      providerId,
      modelName: model.modelName,
      apiSource,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      status: 'streaming',
      errorMessage: null,
      attachments: null,
      createdAt: new Date().toISOString(),
    })
    setStreaming(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          providerId,
          modelId,
          messages: [...history, { role: 'user', content }],
          apiSource,
          temperature,
          autoFallback: useApp.getState().autoFailover,
        }),
        signal: controller.signal,
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      let realId: string | null = null
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const evt = JSON.parse(payload)
            if (evt.type === 'start') realId = evt.messageId
            else if (evt.type === 'fallback') {
              toast.info(`Switched to ${evt.toProvider}`, {
                description: evt.reason || 'Switched provider to complete your project.',
                duration: 5000,
              })
              updateMessage(assistantId, {
                providerId: evt.toProviderId || undefined,
                modelName: evt.toModel,
                fallbackInfo: {
                  fromProvider: evt.fromProvider,
                  fromModel: evt.fromModel,
                  toProvider: evt.toProvider,
                  toModel: evt.toModel,
                  reason: evt.reason,
                },
              })
            } else if (evt.type === 'delta') {
              accumulated += evt.delta
              updateMessage(assistantId, { content: accumulated })
            } else if (evt.type === 'usage') {
              updateMessage(assistantId, { inputTokens: evt.inputTokens, outputTokens: evt.outputTokens, latencyMs: evt.latencyMs })
            } else if (evt.type === 'error') {
              updateMessage(assistantId, { status: 'error', errorMessage: evt.message })
              toast.error(evt.message)
            } else if (evt.type === 'done') {
              updateMessage(assistantId, { status: 'complete', id: realId || assistantId })
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') updateMessage(assistantId, { status: 'stopped' })
      else {
        updateMessage(assistantId, { status: 'error', errorMessage: (e as Error).message })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  async function saveEdit(message: ChatMessage) {
    if (!currentConversationId) return
    await fetch(`/api/conversations/${currentConversationId}/messages`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: message.id, content: editContent }),
    })
    updateMessage(message.id, { content: editContent })
    setEditingId(null)
    setEditContent('')
  }

  async function deleteMessage(message: ChatMessage) {
    if (!currentConversationId) return
    if (!confirm('Delete this message?')) return
    if (!message.id.startsWith('temp-')) {
      await fetch(`/api/conversations/${currentConversationId}/messages?messageId=${message.id}`, { method: 'DELETE' })
    }
    removeMessage(message.id)
  }

  function onFiles(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files).slice(0, 4)
    setAttachments((prev) => [...prev, ...arr.map((f) => ({ name: f.name, size: f.size, type: f.type }))])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    onFiles(e.dataTransfer.files)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden relative">
      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto custom-scroll"
      >
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState providerName={provider?.displayName} modelName={model?.displayName} onPick={(p) => send(p)} />
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  provider={provider}
                  modelName={model?.displayName}
                  streaming={streaming}
                  editing={editingId === m.id}
                  editContent={editContent}
                  onEditStart={() => { setEditingId(m.id); setEditContent(m.content) }}
                  onEditCancel={() => { setEditingId(null); setEditContent('') }}
                  onEditSave={() => saveEdit(m)}
                  onEditChange={setEditContent}
                  onRegenerate={() => regenerate(m)}
                  onDelete={() => deleteMessage(m)}
                  onSwitchAndRetry={() => switchAndRetry(m)}
                />
              ))}
              <div ref={bottomRef} className="h-2 w-full shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Floating Scroll to Bottom button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-28 right-8 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-xl hover:bg-primary/90 transition-all cursor-pointer glow"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          <span>Scroll to bottom</span>
        </button>
      )}

      {/* Composer */}
      <div className="border-t border-border p-3 shrink-0 bg-background/95 backdrop-blur z-20">
        <div className="max-w-3xl mx-auto">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachments.map((a, i) => (
                <Badge key={i} variant="secondary" className="gap-1 py-1 pr-1">
                  <FileText className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{a.name}</span>
                  <button onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} className="hover:bg-background/50 rounded p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div
            className="relative rounded-2xl border border-border bg-card/60 glass focus-within:border-primary/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={provider && model ? `Message ${provider.displayName} ${model.displayName}…` : 'Type a message to chat…'}
              className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-24"
              disabled={streaming}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => document.getElementById('file-input')?.click()} title="Attach file">
                <Paperclip className="h-4 w-4" />
              </Button>
              <input id="file-input" type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
              {streaming ? (
                <Button size="icon" className="h-8 w-8" onClick={stop} variant="destructive" title="Stop generating">
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button size="icon" className="h-8 w-8" onClick={() => send()} disabled={!input.trim()} title="Send">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <p className="text-[10px] text-muted-foreground">
              {(model?.contextWindow ?? 8192).toLocaleString()} ctx · ${model?.inputPrice ?? 0}/M in · Press Enter to send, Shift+Enter for newline
            </p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              {apiSource === 'byok' ? <><KeyRound className="h-3 w-3" /> BYOK</> : <><Zap className="h-3 w-3" /> Platform</>}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ providerName, modelName, onPick }: { providerName?: string; modelName?: string; onPick: (p: string) => void }) {
  const suggestions = [
    { title: 'Explain a concept', prompt: 'Explain how vector embeddings work, with a simple analogy.' },
    { title: 'Write code', prompt: 'Write a TypeScript function that debounces an async function.' },
    { title: 'Brainstorm', prompt: 'Give me 5 product ideas that combine AI with everyday productivity.' },
    { title: 'Summarize', prompt: 'Summarize the key ideas of compound interest in 3 bullet points.' },
  ]
  return (
    <div className="text-center py-10">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-chart-3 mx-auto mb-5 flex items-center justify-center glow animate-float">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-2xl font-semibold mb-1.5">How can I help you today?</h2>
      <p className="text-sm text-muted-foreground mb-6">Chatting with {providerName} {modelName}. Switch models anytime from the top bar.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto">
        {suggestions.map((s) => (
          <button key={s.title} onClick={() => onPick(s.prompt)} className="text-left p-3 rounded-xl border border-border bg-card/40 hover:bg-accent/40 transition-colors">
            <div className="text-sm font-medium mb-0.5">{s.title}</div>
            <div className="text-xs text-muted-foreground line-clamp-2">{s.prompt}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message, provider, modelName, streaming, editing, editContent, onEditStart, onEditCancel, onEditSave, onEditChange, onRegenerate, onDelete, onSwitchAndRetry }: {
  message: ChatMessage
  provider?: { id: string; name: string; displayName: string; color?: string | null }
  modelName?: string
  streaming: boolean
  editing: boolean
  editContent: string
  onEditStart: () => void
  onEditCancel: () => void
  onEditSave: () => void
  onEditChange: (v: string) => void
  onRegenerate: () => void
  onDelete: () => void
  onSwitchAndRetry?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isError = message.status === 'error'
  const isStreaming = message.status === 'streaming'

  return (
    <div className={cn('group flex gap-3', isUser && 'flex-row-reverse')}>
      <div className="shrink-0">
        {isUser ? (
          <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">You</div>
        ) : (
          <ProviderAvatar provider={provider} size={32} />
        )}
      </div>
      <div className={cn('flex-1 min-w-0 max-w-[85%]', isUser && 'flex flex-col items-end')}>
        <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{isUser ? 'You' : provider?.displayName}</span>
          {!isUser && modelName && <span className="opacity-70">· {modelName}</span>}
          {!isUser && message.apiSource && (
            <Badge variant="outline" className="h-4 text-[9px] px-1 py-0 gap-0.5">
              {message.apiSource === 'byok' ? <><KeyRound className="h-2.5 w-2.5" /> BYOK</> : <><Zap className="h-2.5 w-2.5" /> Platform</>}
            </Badge>
          )}
        </div>
        <div className={cn('rounded-2xl px-4 py-2.5', isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border/50 glass')}>
          {message.fallbackInfo && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 mb-2">
              <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>
                Auto-switched from <strong>{message.fallbackInfo.fromProvider}</strong> to <strong>{message.fallbackInfo.toProvider}</strong> ({message.fallbackInfo.toModel}) — API limit reached
              </span>
            </div>
          )}
          {editing ? (
            <div className="space-y-2">
              <textarea value={editContent} onChange={(e) => onEditChange(e.target.value)} className="w-full min-h-[80px] bg-transparent border border-border/50 rounded-lg p-2 text-sm outline-none focus:border-primary" autoFocus />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={onEditCancel}>Cancel</Button>
                <Button size="sm" onClick={onEditSave}>Save</Button>
              </div>
            </div>
          ) : isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          ) : isError ? (
            <div className="flex items-start gap-2.5 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-destructive font-medium">{message.errorMessage || 'An error occurred.'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">The current AI model or API key hit a limit or failed.</p>
                </div>
                {onSwitchAndRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                    onClick={onSwitchAndRetry}
                  >
                    <Zap className="h-3 w-3" /> Switch to another AI & Retry
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <Markdown content={message.content || (isStreaming ? '…' : '')} />
              {isStreaming && !message.content && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Meta + actions */}
        {!editing && !isStreaming && (
          <div className={cn('flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity', isUser && 'flex-row-reverse')}>
            {!isUser && message.outputTokens > 0 && (
              <span className="text-[10px] text-muted-foreground mr-1">
                {formatTokens(message.inputTokens)}→{formatTokens(message.outputTokens)} · {(message.latencyMs / 1000).toFixed(1)}s
              </span>
            )}
            {!isUser && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 1500) }} title="Copy">
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            )}
            {!isUser && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRegenerate} title="Regenerate"><RefreshCw className="h-3 w-3" /></Button>}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEditStart} title="Edit"><Pencil className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete} title="Delete"><Trash2 className="h-3 w-3" /></Button>
          </div>
        )}
      </div>
    </div>
  )
}

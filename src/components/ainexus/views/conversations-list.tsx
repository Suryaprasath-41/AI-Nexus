'use client'

import { useEffect, useState, useCallback } from 'react'
import { useApp, type ConversationSummary } from '@/lib/store/app'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Pin, Trash2, MoreHorizontal, MessageSquarePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

export function ConversationsList() {
  const { conversations, setConversations, currentConversationId, setCurrentConversation, setMessages, setView } = useApp()
  const [query, setQuery] = useState('')

  const load = useCallback(async (q?: string) => {
    const url = q ? `/api/conversations?q=${encodeURIComponent(q)}` : '/api/conversations'
    const res = await fetch(url)
    const data = await res.json()
    if (data.conversations) setConversations(data.conversations)
  }, [setConversations])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const t = setTimeout(() => load(query), 250)
    return () => clearTimeout(t)
  }, [query, load])

  async function openConversation(c: ConversationSummary) {
    setCurrentConversation(c.id)
    setView('chat')
    const res = await fetch(`/api/conversations/${c.id}`)
    const data = await res.json()
    if (data.messages) setMessages(data.messages)
    if (data.conversation) {
      const state = useApp.getState()
      const prov = state.providers.find((p) => p.id === data.conversation.providerId || p.name === data.conversation.providerId)
      const targetProv =
        prov ||
        state.providers.find((p) => p.id === state.providerId) ||
        state.providers.find((p) => p.name === 'groq' && p.models?.length) ||
        state.providers[0]
      const mod =
        targetProv?.models.find((m) => m.id === data.conversation.modelId || m.modelName === data.conversation.modelId) ||
        targetProv?.models[0]

      state.setSelection({
        providerId: targetProv?.id ?? state.providerId ?? undefined,
        modelId: mod?.id ?? state.modelId ?? undefined,
        apiSource: data.conversation.apiSource === 'byok' ? 'byok' : 'platform',
        temperature: typeof data.conversation.temperature === 'number' ? data.conversation.temperature : 0.7,
      })
    }
  }

  async function rename(c: ConversationSummary) {
    const title = window.prompt('Rename conversation', c.title)
    if (!title) return
    await fetch(`/api/conversations/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    load(query)
  }

  async function togglePin(c: ConversationSummary) {
    await fetch(`/api/conversations/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !c.pinned }),
    })
    load(query)
  }

  async function remove(c: ConversationSummary) {
    if (!confirm('Delete this conversation?')) return
    await fetch(`/api/conversations/${c.id}`, { method: 'DELETE' })
    if (currentConversationId === c.id) {
      setCurrentConversation(null)
      setMessages([])
    }
    load(query)
    toast.success('Conversation deleted')
  }

  const pinned = conversations.filter((c) => c.pinned)
  const recent = conversations.filter((c) => !c.pinned)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className="h-8 pl-8 text-sm bg-card/50 border-border/50"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 custom-scroll">
        <div className="px-2 pb-2 space-y-0.5">
          {conversations.length === 0 && (
            <div className="text-center py-8 px-4">
              <MessageSquarePlus className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No conversations yet. Start a new chat!</p>
            </div>
          )}
          {pinned.length > 0 && (
            <div className="pt-1 pb-0.5 px-2 text-[10px] font-semibold uppercase text-muted-foreground/70 flex items-center gap-1">
              <Pin className="h-3 w-3" /> Pinned
            </div>
          )}
          {pinned.map((c) => (
            <ConvItem key={c.id} c={c} active={c.id === currentConversationId} onOpen={() => openConversation(c)} onRename={() => rename(c)} onPin={() => togglePin(c)} onDelete={() => remove(c)} />
          ))}
          {recent.length > 0 && pinned.length > 0 && (
            <div className="pt-2 pb-0.5 px-2 text-[10px] font-semibold uppercase text-muted-foreground/70">Recent</div>
          )}
          {recent.map((c) => (
            <ConvItem key={c.id} c={c} active={c.id === currentConversationId} onOpen={() => openConversation(c)} onRename={() => rename(c)} onPin={() => togglePin(c)} onDelete={() => remove(c)} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function ConvItem({ c, active, onOpen, onRename, onPin, onDelete }: {
  c: ConversationSummary
  active: boolean
  onOpen: () => void
  onRename: () => void
  onPin: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors',
        active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50'
      )}
      onClick={onOpen}
    >
      {c.pinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
      <span className="flex-1 truncate">{c.title}</span>
      <span className="text-[10px] text-muted-foreground/70 shrink-0">{c._count?.messages ?? 0}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
          <DropdownMenuItem onClick={onPin}>{c.pinned ? 'Unpin' : 'Pin'}</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

'use client'

import { create } from 'zustand'

export type AppView = 'chat' | 'compare' | 'apikeys' | 'models' | 'usage' | 'subscription' | 'settings' | 'admin' | 'files'

export interface SafeUser {
  id: string
  email: string
  name: string | null
  role: string
  planId: string | null
  status: string
}

export interface ProviderModel {
  id: string
  modelName: string
  displayName: string
  contextWindow: number
  maxOutput: number
  capabilities: string[]
  inputPrice: number
  outputPrice: number
  tags: string[]
  status: string
}

export interface ProviderInfo {
  id: string
  name: string
  displayName: string
  description: string | null
  color: string | null
  logoUrl: string | null
  documentationUrl: string | null
  apiFormat: string
  status: string
  isCustom: boolean
  health: string
  models: ProviderModel[]
}

export interface ConversationSummary {
  id: string
  title: string
  pinned: boolean
  providerId: string | null
  modelId: string | null
  apiSource: string
  updatedAt: string
  project: string | null
  _count: { messages: number }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  providerId: string | null
  modelName: string | null
  apiSource: string | null
  inputTokens: number
  outputTokens: number
  latencyMs: number
  status: string
  errorMessage: string | null
  attachments: string | null
  fallbackInfo?: {
    fromProvider: string
    fromModel: string
    toProvider: string
    toModel: string
    reason?: string
  } | null
  createdAt: string
}

interface AppState {
  // auth
  user: SafeUser | null
  authLoading: boolean
  authModalOpen: boolean
  authMode: 'login' | 'register'
  setAuth: (user: SafeUser | null) => void
  setAuthLoading: (b: boolean) => void
  openAuth: (mode?: 'login' | 'register') => void
  closeAuth: () => void

  // view
  view: AppView
  setView: (v: AppView) => void

  // providers / models
  providers: ProviderInfo[]
  providersLoading: boolean
  setProviders: (p: ProviderInfo[]) => void
  setProvidersLoading: (b: boolean) => void

  // current selection
  providerId: string | null
  modelId: string | null
  apiSource: 'platform' | 'byok'
  temperature: number
  setSelection: (s: { providerId?: string; modelId?: string; apiSource?: 'platform' | 'byok'; temperature?: number }) => void

  // conversations
  conversations: ConversationSummary[]
  currentConversationId: string | null
  messages: ChatMessage[]
  setConversations: (c: ConversationSummary[]) => void
  setCurrentConversation: (id: string | null) => void
  setMessages: (m: ChatMessage[]) => void
  addMessage: (m: ChatMessage) => void
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void
  removeMessage: (id: string) => void

  // byok keys cache (for showing "connected" badges)
  byokProviders: Set<string>
  setByokProviders: (ids: string[]) => void

  // auto failover when API limits / quotas are reached
  autoFailover: boolean
  setAutoFailover: (enabled: boolean) => void
}

export const useApp = create<AppState>((set) => ({
  user: null,
  authLoading: true,
  authModalOpen: false,
  authMode: 'login',
  setAuth: (user) => set({ user }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  openAuth: (mode = 'login') => set({ authModalOpen: true, authMode: mode }),
  closeAuth: () => set({ authModalOpen: false }),

  view: 'chat',
  setView: (view) => set({ view }),

  providers: [],
  providersLoading: true,
  setProviders: (providers) => set({ providers }),
  setProvidersLoading: (providersLoading) => set({ providersLoading }),

  providerId: null,
  modelId: null,
  apiSource: 'platform',
  temperature: 0.7,
  setSelection: (s) =>
    set((state) => ({
      providerId: s.providerId ? s.providerId : state.providerId,
      modelId: s.modelId ? s.modelId : state.modelId,
      apiSource: s.apiSource !== undefined ? s.apiSource : state.apiSource,
      temperature: s.temperature !== undefined ? s.temperature : state.temperature,
    })),

  conversations: [],
  currentConversationId: null,
  messages: [],
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  updateMessage: (id, patch) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  removeMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),

  byokProviders: new Set<string>(),
  setByokProviders: (ids) => set({ byokProviders: new Set(ids) }),

  autoFailover: true,
  setAutoFailover: (autoFailover) => set({ autoFailover }),
}))

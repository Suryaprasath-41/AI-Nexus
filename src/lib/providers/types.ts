/**
 * AIProvider — the common interface every adapter implements.
 * The rest of the app talks to this interface, never to provider-specific code.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
  stop?: string[]
}

export interface ChatResponseChunk {
  delta: string
  inputTokens?: number
  outputTokens?: number
  finishReason?: string
}

export interface ChatResponse {
  content: string
  inputTokens: number
  outputTokens: number
  finishReason?: string
  latencyMs: number
}

export interface ModelInfo {
  id: string
  name?: string
  contextWindow?: number
}

export interface ProviderCapabilities {
  streaming: boolean
  tools: boolean
  vision: boolean
  systemPrompt: boolean
  temperature: boolean
  usageReporting: boolean
}

export interface ValidationResult {
  valid: boolean
  message?: string
  models?: string[]
}

export interface AIProvider {
  readonly id: string
  sendMessage(req: ChatRequest, apiKey: string): Promise<ChatResponse>
  streamMessage(req: ChatRequest, apiKey: string, onChunk: (c: ChatResponseChunk) => void, signal?: AbortSignal): Promise<ChatResponse>
  validateApiKey(apiKey: string): Promise<ValidationResult>
  listModels(apiKey: string): Promise<ModelInfo[]>
  getCapabilities(): ProviderCapabilities
}

export class ProviderError extends Error {
  status: number
  code: string
  constructor(message: string, status = 500, code = 'provider_error') {
    super(message)
    this.status = status
    this.code = code
  }
}

export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

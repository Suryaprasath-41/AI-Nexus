/**
 * OpenAI-compatible adapter.
 *
 * One adapter serves every provider whose API follows the OpenAI Chat Completions
 * spec — OpenAI itself, DeepSeek, Groq, Mistral, Qwen (DashScope compatible mode),
 * Together, OpenRouter, vLLM, Ollama, and any "custom" OpenAI-compatible endpoint.
 *
 * The baseUrl + auth header are supplied per-call so we never hard-code endpoints.
 */
import type { AIProvider, ChatRequest, ChatResponse, ChatResponseChunk, ModelInfo, ProviderCapabilities, ValidationResult } from './types'
import { ProviderError, estimateTokens } from './types'

export interface OpenAICompatibleConfig {
  id: string
  baseUrl: string // e.g. https://api.openai.com/v1
  authType?: 'bearer' | 'x-api-key' | 'query'
  headerName?: string // for x-api-key variants
  queryParam?: string // for query-style auth
  capabilities?: Partial<ProviderCapabilities>
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly id: string
  private baseUrl: string
  private authType: 'bearer' | 'x-api-key' | 'query'
  private headerName: string
  private queryParam: string
  private caps: ProviderCapabilities

  constructor(cfg: OpenAICompatibleConfig) {
    this.id = cfg.id
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '')
    this.authType = cfg.authType ?? 'bearer'
    this.headerName = cfg.headerName ?? 'Authorization'
    this.queryParam = cfg.queryParam ?? 'key'
    this.caps = {
      streaming: true,
      tools: true,
      vision: false,
      systemPrompt: true,
      temperature: true,
      usageReporting: true,
      ...cfg.capabilities,
    }
  }

  private headers(apiKey: string): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.authType === 'bearer') {
      h[this.headerName] = `Bearer ${apiKey}`
    } else if (this.authType === 'x-api-key') {
      h[this.headerName] = apiKey
    }
    return h
  }

  private url(path: string, apiKey?: string): string {
    let u = `${this.baseUrl}${path}`
    if (this.authType === 'query' && apiKey) {
      u += `?${this.queryParam}=${encodeURIComponent(apiKey)}`
    }
    return u
  }

  async sendMessage(req: ChatRequest, apiKey: string): Promise<ChatResponse> {
    const start = Date.now()
    const body = this.buildBody(req, false)
    const res = await fetch(this.url('/chat/completions', apiKey), {
      method: 'POST',
      headers: this.headers(apiKey),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw await this.toError(res)
    }
    const data = await res.json()
    const choice = data.choices?.[0]
    const content = choice?.message?.content ?? ''
    const usage = data.usage ?? {}
    return {
      content,
      inputTokens: usage.prompt_tokens ?? estimateTokens(req.messages.map((m) => m.content).join('')),
      outputTokens: usage.completion_tokens ?? estimateTokens(content),
      finishReason: choice?.finish_reason,
      latencyMs: Date.now() - start,
    }
  }

  async streamMessage(req: ChatRequest, apiKey: string, onChunk: (c: ChatResponseChunk) => void, signal?: AbortSignal): Promise<ChatResponse> {
    const start = Date.now()
    const body = this.buildBody(req, true)
    const res = await fetch(this.url('/chat/completions', apiKey), {
      method: 'POST',
      headers: this.headers(apiKey),
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok || !res.body) {
      throw await this.toError(res)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''
    let inputTokens = 0
    let outputTokens = 0
    let finishReason: string | undefined

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const raw of lines) {
          const line = raw.trim()
          if (!line || !line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              content += delta
              onChunk({ delta })
            }
            if (json.choices?.[0]?.finish_reason) {
              finishReason = json.choices[0].finish_reason
              onChunk({ finishReason })
            }
            if (json.usage) {
              inputTokens = json.usage.prompt_tokens ?? inputTokens
              outputTokens = json.usage.completion_tokens ?? outputTokens
            }
          } catch {
            // ignore malformed line
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') {
        // graceful stop
      } else {
        throw e
      }
    }

    if (!outputTokens) outputTokens = estimateTokens(content)
    if (!inputTokens) inputTokens = estimateTokens(req.messages.map((m) => m.content).join(''))

    return { content, inputTokens, outputTokens, finishReason, latencyMs: Date.now() - start }
  }

  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    try {
      const res = await fetch(this.url('/models', apiKey), { headers: this.headers(apiKey) })
      if (res.status === 401 || res.status === 403) {
        return { valid: false, message: 'Invalid API key (unauthorized).' }
      }
      if (!res.ok) {
        return { valid: false, message: `Provider responded with ${res.status}.` }
      }
      const data = await res.json()
      const models: string[] = (data.data ?? data.models ?? []).map((m: { id?: string; name?: string }) => m.id ?? m.name).filter(Boolean)
      return { valid: true, models }
    } catch (e) {
      return { valid: false, message: (e as Error).message }
    }
  }

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    const res = await fetch(this.url('/models', apiKey), { headers: this.headers(apiKey) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.data ?? data.models ?? []).map((m: { id?: string; name?: string; context_window?: number }) => ({
      id: m.id ?? m.name,
      name: m.name,
      contextWindow: m.context_window,
    }))
  }

  getCapabilities(): ProviderCapabilities {
    return this.caps
  }

  private buildBody(req: ChatRequest, stream: boolean) {
    const body: Record<string, unknown> = {
      model: req.model,
      messages: req.messages,
      stream,
    }
    if (req.temperature !== undefined) body.temperature = req.temperature
    if (req.maxTokens !== undefined) body.max_tokens = req.maxTokens
    if (req.topP !== undefined) body.top_p = req.topP
    if (req.stop?.length) body.stop = req.stop
    // ask for usage in stream mode when supported
    if (stream) body.stream_options = { include_usage: true }
    return body
  }

  private async toError(res: Response): Promise<ProviderError> {
    let msg = `Provider ${this.id} returned ${res.status}`
    let code = 'provider_error'
    try {
      const data = await res.json()
      msg = data.error?.message ?? data.message ?? msg
      code = data.error?.code ?? data.error?.type ?? code
    } catch {
      // ignore
    }
    if (res.status === 401 || res.status === 403) code = 'auth_error'
    if (res.status === 429) code = 'rate_limited'
    return new ProviderError(msg, res.status, code)
  }
}

/**
 * Anthropic Claude adapter — Messages API.
 * https://docs.anthropic.com/en/api/messages
 */
import type { AIProvider, ChatRequest, ChatResponse, ChatResponseChunk, ModelInfo, ProviderCapabilities, ValidationResult } from './types'
import { ProviderError, estimateTokens } from './types'

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic'
  private baseUrl = 'https://api.anthropic.com'
  private apiVersion = '2023-06-01'

  getCapabilities(): ProviderCapabilities {
    return { streaming: true, tools: true, vision: true, systemPrompt: true, temperature: true, usageReporting: true }
  }

  private headers(apiKey: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': this.apiVersion,
    }
  }

  private buildBody(req: ChatRequest, stream: boolean) {
    // Anthropic separates system prompt from messages.
    const sys = req.messages.find((m) => m.role === 'system')?.content
    const msgs = req.messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
    const body: Record<string, unknown> = {
      model: req.model,
      messages: msgs,
      max_tokens: req.maxTokens ?? 4096,
      stream,
    }
    if (sys) body.system = sys
    if (req.temperature !== undefined) body.temperature = req.temperature
    if (req.topP !== undefined) body.top_p = req.topP
    if (req.stop?.length) body.stop_sequences = req.stop
    return body
  }

  async sendMessage(req: ChatRequest, apiKey: string): Promise<ChatResponse> {
    const start = Date.now()
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.headers(apiKey),
      body: JSON.stringify(this.buildBody(req, false)),
    })
    if (!res.ok) throw await this.toError(res)
    const data = await res.json()
    const content = (data.content ?? []).map((c: { text?: string }) => c.text ?? '').join('')
    return {
      content,
      inputTokens: data.usage?.input_tokens ?? estimateTokens(req.messages.map((m) => m.content).join('')),
      outputTokens: data.usage?.output_tokens ?? estimateTokens(content),
      finishReason: data.stop_reason,
      latencyMs: Date.now() - start,
    }
  }

  async streamMessage(req: ChatRequest, apiKey: string, onChunk: (c: ChatResponseChunk) => void, signal?: AbortSignal): Promise<ChatResponse> {
    const start = Date.now()
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: { ...this.headers(apiKey), Accept: 'text/event-stream' },
      body: JSON.stringify(this.buildBody(req, true)),
      signal,
    })
    if (!res.ok || !res.body) throw await this.toError(res)
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
          try {
            const json = JSON.parse(line.slice(5).trim())
            if (json.type === 'content_block_delta' && json.delta?.text) {
              content += json.delta.text
              onChunk({ delta: json.delta.text })
            } else if (json.type === 'message_delta' && json.delta?.stop_reason) {
              finishReason = json.delta.stop_reason
              if (json.usage?.output_tokens) outputTokens = json.usage.output_tokens
            } else if (json.type === 'message_start' && json.message?.usage) {
              inputTokens = json.message.usage.input_tokens ?? inputTokens
              outputTokens = json.message.usage.output_tokens ?? outputTokens
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') throw e
    }

    if (!outputTokens) outputTokens = estimateTokens(content)
    if (!inputTokens) inputTokens = estimateTokens(req.messages.map((m) => m.content).join(''))
    return { content, inputTokens, outputTokens, finishReason, latencyMs: Date.now() - start }
  }

  async validateApiKey(apiKey: string): Promise<ValidationResult> {
    try {
      // minimal messages call
      const res = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: this.headers(apiKey),
        body: JSON.stringify({ model: 'claude-3-5-haiku-latest', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
      })
      if (res.status === 401) return { valid: false, message: 'Invalid Anthropic API key.' }
      if (!res.ok && res.status !== 400) {
        // 400 may be returned for invalid model but key is valid
        return { valid: false, message: `Anthropic responded ${res.status}` }
      }
      return { valid: true }
    } catch (e) {
      return { valid: false, message: (e as Error).message }
    }
  }

  async listModels(_apiKey: string): Promise<ModelInfo[]> {
    // Anthropic has a /v1/models endpoint; return a curated list as fallback.
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, { headers: { 'x-api-key': _apiKey, 'anthropic-version': this.apiVersion } })
      if (res.ok) {
        const data = await res.json()
        return (data.data ?? []).map((m: { id: string; display_name?: string; context_window?: number }) => ({ id: m.id, name: m.display_name, contextWindow: m.context_window }))
      }
    } catch {
      // ignore
    }
    return []
  }

  private async toError(res: Response): Promise<ProviderError> {
    let msg = `Anthropic returned ${res.status}`
    let code = 'provider_error'
    try {
      const data = await res.json()
      msg = data.error?.message ?? msg
      code = data.error?.type ?? code
    } catch {
      // ignore
    }
    if (res.status === 401) code = 'auth_error'
    if (res.status === 429) code = 'rate_limited'
    return new ProviderError(msg, res.status, code)
  }
}

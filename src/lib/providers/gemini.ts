/**
 * Google Gemini adapter — Generate Content / Stream Generate Content.
 * https://ai.google.dev/api/rest/v1beta/models/generateContent
 */
import type { AIProvider, ChatRequest, ChatResponse, ChatResponseChunk, ModelInfo, ProviderCapabilities, ValidationResult } from './types'
import { ProviderError, estimateTokens } from './types'

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini'
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  getCapabilities(): ProviderCapabilities {
    return { streaming: true, tools: true, vision: true, systemPrompt: true, temperature: true, usageReporting: true }
  }

  private url(model: string, stream: boolean, apiKey: string): string {
    const method = stream ? 'streamGenerateContent' : 'generateContent'
    return `${this.baseUrl}/models/${encodeURIComponent(model)}:${method}?key=${encodeURIComponent(apiKey)}${stream ? '&alt=sse' : ''}`
  }

  private buildBody(req: ChatRequest) {
    const sys = req.messages.find((m) => m.role === 'system')?.content
    const contents = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    const body: Record<string, unknown> = { contents }
    const genConfig: Record<string, unknown> = {}
    if (req.temperature !== undefined) genConfig.temperature = req.temperature
    if (req.maxTokens !== undefined) genConfig.maxOutputTokens = req.maxTokens
    if (req.topP !== undefined) genConfig.topP = req.topP
    if (req.stop?.length) genConfig.stopSequences = req.stop
    if (Object.keys(genConfig).length) body.generationConfig = genConfig
    if (sys) body.systemInstruction = { parts: [{ text: sys }] }
    return body
  }

  async sendMessage(req: ChatRequest, apiKey: string): Promise<ChatResponse> {
    const start = Date.now()
    const res = await fetch(this.url(req.model, false, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.buildBody(req)),
    })
    if (!res.ok) throw await this.toError(res)
    const data = await res.json()
    const content = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('')
    return {
      content,
      inputTokens: data.usageMetadata?.promptTokenCount ?? estimateTokens(req.messages.map((m) => m.content).join('')),
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? estimateTokens(content),
      finishReason: data.candidates?.[0]?.finishReason,
      latencyMs: Date.now() - start,
    }
  }

  async streamMessage(req: ChatRequest, apiKey: string, onChunk: (c: ChatResponseChunk) => void, signal?: AbortSignal): Promise<ChatResponse> {
    const start = Date.now()
    const res = await fetch(this.url(req.model, true, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.buildBody(req)),
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
            const parts = json.candidates?.[0]?.content?.parts ?? []
            const delta = parts.map((p: { text?: string }) => p.text ?? '').join('')
            if (delta) {
              content += delta
              onChunk({ delta })
            }
            if (json.candidates?.[0]?.finishReason) finishReason = json.candidates[0].finishReason
            if (json.usageMetadata) {
              inputTokens = json.usageMetadata.promptTokenCount ?? inputTokens
              outputTokens = json.usageMetadata.candidatesTokenCount ?? outputTokens
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
      const res = await fetch(`${this.baseUrl}/models?key=${encodeURIComponent(apiKey)}`)
      if (res.status === 400 || res.status === 403) return { valid: false, message: 'Invalid Gemini API key.' }
      if (!res.ok) return { valid: false, message: `Gemini responded ${res.status}` }
      const data = await res.json()
      const models = (data.models ?? []).map((m: { name: string }) => m.name.replace('models/', ''))
      return { valid: true, models }
    } catch (e) {
      return { valid: false, message: (e as Error).message }
    }
  }

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/models?key=${encodeURIComponent(apiKey)}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.models ?? []).map((m: { name: string; displayName?: string; inputTokenLimit?: number }) => ({
      id: m.name.replace('models/', ''),
      name: m.displayName,
      contextWindow: m.inputTokenLimit,
    }))
  }

  private async toError(res: Response): Promise<ProviderError> {
    let msg = `Gemini returned ${res.status}`
    let code = 'provider_error'
    try {
      const data = await res.json()
      msg = data.error?.message ?? msg
      code = data.error?.status ?? code
    } catch {
      // ignore
    }
    if (res.status === 400 || res.status === 403) code = 'auth_error'
    if (res.status === 429) code = 'rate_limited'
    return new ProviderError(msg, res.status, code)
  }
}

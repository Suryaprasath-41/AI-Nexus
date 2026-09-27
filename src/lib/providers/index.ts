/**
 * Provider registry & factory.
 *
 * Given a Provider DB record (which carries `apiFormat`, `baseUrl`, `authType`),
 * returns the correct AIProvider adapter instance. This is the single point that
 * maps configuration -> adapter, so adding an OpenAI-compatible provider requires
 * zero code changes — just a DB row.
 */
import type { AIProvider } from './types'
import { OpenAICompatibleProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { GeminiProvider } from './gemini'

export type ProviderRecord = {
  id: string
  name: string
  apiFormat: string
  baseUrl?: string | null
  authType?: string | null
}

// Cache adapters by provider id for the lifetime of the process
const cache = new Map<string, AIProvider>()

export function getProvider(rec: ProviderRecord): AIProvider {
  const cached = cache.get(rec.id)
  if (cached) return cached

  let adapter: AIProvider
  switch (rec.apiFormat) {
    case 'anthropic':
      adapter = new AnthropicProvider()
      break
    case 'gemini':
      adapter = new GeminiProvider()
      break
    case 'openai':
      adapter = new OpenAICompatibleProvider({
        id: rec.name,
        baseUrl: rec.baseUrl || 'https://api.openai.com/v1',
        authType: (rec.authType as 'bearer' | 'x-api-key' | 'query') || 'bearer',
      })
      break
    case 'openai-compatible':
    default:
      adapter = new OpenAICompatibleProvider({
        id: rec.name,
        baseUrl: rec.baseUrl || 'https://api.openai.com/v1',
        authType: (rec.authType as 'bearer' | 'x-api-key' | 'query') || 'bearer',
      })
      break
  }
  cache.set(rec.id, adapter)
  return adapter
}

export function clearProviderCache() {
  cache.clear()
}

export { OpenAICompatibleProvider, AnthropicProvider, GeminiProvider }
export type { AIProvider, ChatMessage, ChatRequest, ChatResponse, ChatResponseChunk, ModelInfo, ProviderCapabilities, ValidationResult } from './types'
export { ProviderError, estimateTokens } from './types'

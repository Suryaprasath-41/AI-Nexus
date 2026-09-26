/**
 * Seed script — populates providers, models, and subscription plans.
 * Run with: bun run db:seed
 *
 * This is the database-driven provider registry. New providers/models can be
 * added here or via the Admin UI without touching the adapter code.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

interface SeedProvider {
  name: string
  displayName: string
  description: string
  color: string
  baseUrl: string
  authType: string
  apiFormat: string
  documentationUrl: string
  logoUrl?: string
}

interface SeedModel {
  modelName: string
  displayName: string
  contextWindow: number
  maxOutput: number
  capabilities: string
  inputPrice: number
  outputPrice: number
  tags?: string
}

const providers: { provider: SeedProvider; models: SeedModel[] }[] = [
  {
    provider: {
      name: 'openai',
      displayName: 'OpenAI',
      description: 'GPT family of models — flagship reasoning, chat, and vision.',
      color: '#10a37f',
      baseUrl: 'https://api.openai.com/v1',
      authType: 'bearer',
      apiFormat: 'openai',
      documentationUrl: 'https://platform.openai.com/docs/models',
    },
    models: [
      { modelName: 'gpt-4o', displayName: 'GPT-4o', contextWindow: 128000, maxOutput: 16384, capabilities: 'chat,vision,tools', inputPrice: 2.5, outputPrice: 10, tags: 'flagship' },
      { modelName: 'gpt-4o-mini', displayName: 'GPT-4o mini', contextWindow: 128000, maxOutput: 16384, capabilities: 'chat,vision,tools', inputPrice: 0.15, outputPrice: 0.6, tags: 'fast,cheap' },
      { modelName: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', contextWindow: 128000, maxOutput: 4096, capabilities: 'chat,vision,tools', inputPrice: 10, outputPrice: 30 },
      { modelName: 'o1', displayName: 'o1', contextWindow: 200000, maxOutput: 100000, capabilities: 'chat,reasoning', inputPrice: 15, outputPrice: 60, tags: 'reasoning' },
      { modelName: 'o1-mini', displayName: 'o1-mini', contextWindow: 128000, maxOutput: 65536, capabilities: 'chat,reasoning', inputPrice: 3, outputPrice: 12 },
    ],
  },
  {
    provider: {
      name: 'anthropic',
      displayName: 'Anthropic Claude',
      description: 'Claude — helpful, harmless, and honest assistants with strong reasoning.',
      color: '#d97757',
      baseUrl: 'https://api.anthropic.com',
      authType: 'x-api-key',
      apiFormat: 'anthropic',
      documentationUrl: 'https://docs.anthropic.com/en/docs/models',
    },
    models: [
      { modelName: 'claude-3-5-sonnet-latest', displayName: 'Claude 3.5 Sonnet', contextWindow: 200000, maxOutput: 8192, capabilities: 'chat,vision,tools,reasoning', inputPrice: 3, outputPrice: 15, tags: 'flagship' },
      { modelName: 'claude-3-5-haiku-latest', displayName: 'Claude 3.5 Haiku', contextWindow: 200000, maxOutput: 8192, capabilities: 'chat,vision,tools', inputPrice: 0.8, outputPrice: 4, tags: 'fast' },
      { modelName: 'claude-3-opus-latest', displayName: 'Claude 3 Opus', contextWindow: 200000, maxOutput: 4096, capabilities: 'chat,vision,tools,reasoning', inputPrice: 15, outputPrice: 75 },
    ],
  },
  {
    provider: {
      name: 'gemini',
      displayName: 'Google Gemini',
      description: 'Google DeepMind Gemini — multimodal, long-context models.',
      color: '#4285f4',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      authType: 'query',
      apiFormat: 'gemini',
      documentationUrl: 'https://ai.google.dev/models',
    },
    models: [
      { modelName: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', contextWindow: 2000000, maxOutput: 8192, capabilities: 'chat,vision,tools,reasoning', inputPrice: 1.25, outputPrice: 5, tags: 'flagship,long-context' },
      { modelName: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', contextWindow: 1000000, maxOutput: 8192, capabilities: 'chat,vision,tools', inputPrice: 0.075, outputPrice: 0.3, tags: 'fast' },
      { modelName: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', contextWindow: 1000000, maxOutput: 8192, capabilities: 'chat,vision,tools', inputPrice: 0.1, outputPrice: 0.4, tags: 'fast' },
    ],
  },
  {
    provider: {
      name: 'deepseek',
      displayName: 'DeepSeek',
      description: 'Cost-effective open models with strong coding and reasoning.',
      color: '#4d6bce',
      baseUrl: 'https://api.deepseek.com/v1',
      authType: 'bearer',
      apiFormat: 'openai-compatible',
      documentationUrl: 'https://api-docs.deepseek.com/',
    },
    models: [
      { modelName: 'deepseek-chat', displayName: 'DeepSeek V3', contextWindow: 64000, maxOutput: 8192, capabilities: 'chat,tools', inputPrice: 0.27, outputPrice: 1.1, tags: 'cheap' },
      { modelName: 'deepseek-reasoner', displayName: 'DeepSeek R1', contextWindow: 64000, maxOutput: 8192, capabilities: 'chat,reasoning', inputPrice: 0.55, outputPrice: 2.19, tags: 'reasoning' },
    ],
  },
  {
    provider: {
      name: 'groq',
      displayName: 'Groq',
      description: 'Ultra-low-latency inference for open models on LPU hardware.',
      color: '#f55036',
      baseUrl: 'https://api.groq.com/openai/v1',
      authType: 'bearer',
      apiFormat: 'openai-compatible',
      documentationUrl: 'https://console.groq.com/docs',
    },
    models: [
      { modelName: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B', contextWindow: 128000, maxOutput: 32768, capabilities: 'chat,tools', inputPrice: 0.59, outputPrice: 0.79, tags: 'fast' },
      { modelName: 'llama-3.1-8b-instant', displayName: 'Llama 3.1 8B Instant', contextWindow: 128000, maxOutput: 8192, capabilities: 'chat,tools', inputPrice: 0.05, outputPrice: 0.08, tags: 'fast,cheap' },
      { modelName: 'mixtral-8x7b-32768', displayName: 'Mixtral 8x7B', contextWindow: 32768, maxOutput: 32768, capabilities: 'chat', inputPrice: 0.24, outputPrice: 0.24 },
    ],
  },
  {
    provider: {
      name: 'mistral',
      displayName: 'Mistral AI',
      description: 'European frontier AI lab — efficient open and proprietary models.',
      color: '#ff7000',
      baseUrl: 'https://api.mistral.ai/v1',
      authType: 'bearer',
      apiFormat: 'openai-compatible',
      documentationUrl: 'https://docs.mistral.ai/',
    },
    models: [
      { modelName: 'mistral-large-latest', displayName: 'Mistral Large', contextWindow: 128000, maxOutput: 8192, capabilities: 'chat,vision,tools,reasoning', inputPrice: 2, outputPrice: 6, tags: 'flagship' },
      { modelName: 'mistral-small-latest', displayName: 'Mistral Small', contextWindow: 32000, maxOutput: 8192, capabilities: 'chat,tools', inputPrice: 0.2, outputPrice: 0.6, tags: 'fast' },
      { modelName: 'open-mistral-nemo', displayName: 'Mistral Nemo', contextWindow: 128000, maxOutput: 8192, capabilities: 'chat', inputPrice: 0.15, outputPrice: 0.15 },
    ],
  },
  {
    provider: {
      name: 'qwen',
      displayName: 'Qwen (Alibaba)',
      description: 'Qwen series via DashScope OpenAI-compatible endpoint.',
      color: '#615ced',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      authType: 'bearer',
      apiFormat: 'openai-compatible',
      documentationUrl: 'https://help.aliyun.com/zh/dashscope/',
    },
    models: [
      { modelName: 'qwen-plus', displayName: 'Qwen Plus', contextWindow: 131072, maxOutput: 8192, capabilities: 'chat,tools', inputPrice: 0.4, outputPrice: 1.2 },
      { modelName: 'qwen-turbo', displayName: 'Qwen Turbo', contextWindow: 1000000, maxOutput: 8192, capabilities: 'chat,tools', inputPrice: 0.05, outputPrice: 0.2, tags: 'fast,cheap' },
      { modelName: 'qwen-max', displayName: 'Qwen Max', contextWindow: 32768, maxOutput: 8192, capabilities: 'chat,tools,reasoning', inputPrice: 2.8, outputPrice: 8.4, tags: 'flagship' },
    ],
  },
]

const plans = [
  {
    name: 'FREE',
    displayName: 'Free',
    description: 'Get started with platform credits and bring your own keys.',
    priceMonthly: 0,
    priceYearly: 0,
    limitsJson: JSON.stringify({ monthlyRequests: 100, maxTokens: 100000, maxApiKeys: 10, maxConversations: 50, maxFileSizeMb: 5, compareAccess: false, routerAccess: false, priorityProcessing: false }),
    featuresJson: JSON.stringify(['100 platform requests / month', 'Bring your own API keys', 'Chat history', 'Model switching', 'Basic usage analytics']),
    priority: 0,
  },
  {
    name: 'PRO',
    displayName: 'Pro',
    description: 'For power users — comparison, auto-router, and higher limits.',
    priceMonthly: 20,
    priceYearly: 200,
    limitsJson: JSON.stringify({ monthlyRequests: 2000, maxTokens: 2000000, maxApiKeys: 25, maxConversations: 500, maxFileSizeMb: 25, compareAccess: true, routerAccess: true, priorityProcessing: false }),
    featuresJson: JSON.stringify(['2,000 platform requests / month', 'AI Comparison (side-by-side)', 'Auto Model Router', 'Priority chat models', 'Advanced analytics', 'File uploads up to 25MB']),
    priority: 10,
  },
  {
    name: 'BUSINESS',
    displayName: 'Business',
    description: 'For teams that need scale, priority, and admin controls.',
    priceMonthly: 99,
    priceYearly: 990,
    limitsJson: JSON.stringify({ monthlyRequests: 20000, maxTokens: 20000000, maxApiKeys: 100, maxConversations: 5000, maxFileSizeMb: 100, compareAccess: true, routerAccess: true, priorityProcessing: true }),
    featuresJson: JSON.stringify(['20,000 platform requests / month', 'Priority processing', 'Team admin dashboard', 'Audit logs', 'Custom providers', 'Premium support']),
    priority: 20,
  },
]

async function main() {
  console.log('Seeding providers & models...')
  for (const { provider, models } of providers) {
    const rec = await db.provider.upsert({
      where: { name: provider.name },
      update: { ...provider },
      create: { ...provider, isCustom: false },
    })
    for (const m of models) {
      await db.model.upsert({
        where: { providerId_modelName: { providerId: rec.id, modelName: m.modelName } },
        update: { ...m },
        create: { ...m, providerId: rec.id },
      })
    }
    // seed an operational health row
    await db.providerHealth.create({
      data: { providerId: rec.id, status: 'operational', latencyMs: 0, errorRate: 0 },
    })
    console.log(`  ✓ ${provider.displayName} (${models.length} models)`)
  }

  console.log('Seeding subscription plans...')
  for (const p of plans) {
    await db.subscriptionPlan.upsert({
      where: { name: p.name },
      update: p,
      create: p,
    })
    console.log(`  ✓ ${p.displayName}`)
  }

  // Ensure an admin user exists for first-run access.
  const adminEmail = 'admin@ainexus.ai'
  const existing = await db.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const { scrypt: scryptSync } = await import('node:crypto')
    // Use the same hashing as the app for consistency
    const salt = scryptSync.randomBytes ? scryptSync.randomBytes(16).toString('hex') : Math.random().toString(36)
    // simpler: just use a known hash via the crypto util at runtime — but seed runs standalone, so inline scrypt
    const crypto = await import('node:crypto')
    const s = crypto.randomBytes(16).toString('hex')
    const h = crypto.scryptSync('admin123', s, 64).toString('hex')
    const freePlan = await db.subscriptionPlan.findFirst({ where: { name: 'BUSINESS' } })
    await db.user.create({
      data: {
        email: adminEmail,
        name: 'AI Nexus Admin',
        passwordHash: `scrypt$${s}$${h}`,
        role: 'admin',
        planId: freePlan?.id,
        status: 'active',
      },
    })
    console.log('  ✓ Created admin user: admin@ainexus.ai / admin123')
  } else {
    console.log('  • admin user already exists')
  }

  console.log('\nSeed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

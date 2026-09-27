import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const groq = await prisma.provider.findFirst({ where: { name: 'groq' } });
  if (!groq) {
    console.log('Groq provider not found');
    return;
  }
  console.log('Found Groq provider:', groq.id);

  const modelsToAdd = [
    {
      providerId: groq.id,
      modelName: 'openai/gpt-oss-120b',
      displayName: 'GPT-OSS 120B (Groq Fast)',
      contextWindow: 131072,
      maxOutput: 8192,
      inputPrice: 0.15,
      outputPrice: 0.60,
      tags: 'flagship,reasoning,ultra-fast',
      capabilities: 'chat,coding,reasoning',
      status: 'active'
    },
    {
      providerId: groq.id,
      modelName: 'openai/gpt-oss-20b',
      displayName: 'GPT-OSS 20B (Groq Turbo)',
      contextWindow: 131072,
      maxOutput: 8192,
      inputPrice: 0.05,
      outputPrice: 0.20,
      tags: 'fast,reasoning,ultra-fast',
      capabilities: 'chat,coding',
      status: 'active'
    },
    {
      providerId: groq.id,
      modelName: 'qwen/qwen3.8-27b',
      displayName: 'Qwen 3.8 27B (Groq)',
      contextWindow: 32768,
      maxOutput: 4096,
      inputPrice: 0.08,
      outputPrice: 0.30,
      tags: 'fast,multilingual',
      capabilities: 'chat,multilingual',
      status: 'active'
    }
  ];

  for (const m of modelsToAdd) {
    const existing = await prisma.model.findFirst({
      where: { providerId: groq.id, modelName: m.modelName }
    });
    if (!existing) {
      await prisma.model.create({ data: m });
      console.log('Created model:', m.modelName);
    } else {
      await prisma.model.update({ where: { id: existing.id }, data: { status: 'active', displayName: m.displayName } });
      console.log('Updated model:', m.modelName);
    }
  }

  // Deactivate unavailable models on Groq
  await prisma.model.updateMany({
    where: {
      providerId: groq.id,
      modelName: { notIn: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'] }
    },
    data: { status: 'deprecated' }
  });

  const allActive = await prisma.model.findMany({ where: { providerId: groq.id, status: 'active' } });
  console.log('Active Groq models in DB:', allActive.map(m => m.modelName));
}

main().catch(console.error).finally(() => prisma.$disconnect());

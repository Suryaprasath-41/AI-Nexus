import { db } from '@/lib/db'

export async function logSystem(level: 'info' | 'warn' | 'error' | 'debug', category: string, message: string, meta?: Record<string, unknown>) {
  try {
    await db.systemLog.create({
      data: { level, category, message, meta: meta ? JSON.stringify(meta) : null },
    })
  } catch {
    // never throw from logging
  }
}

export async function audit(userId: string | null, action: string, opts?: { targetType?: string; targetId?: string; ip?: string; meta?: Record<string, unknown> }) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        targetType: opts?.targetType,
        targetId: opts?.targetId,
        ip: opts?.ip,
        meta: opts?.meta ? JSON.stringify(opts.meta) : null,
      },
    })
  } catch {
    // noop
  }
}

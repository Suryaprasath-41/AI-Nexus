/**
 * Simple in-memory rate limiter + usage helpers.
 * For multi-instance production, swap with Redis.
 */

const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs }
  }
  if (entry.count >= limit) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt }
  }
  entry.count += 1
  return { ok: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

// Periodic cleanup to avoid memory growth
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k)
  }
}, 60_000).unref?.()

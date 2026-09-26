/**
 * Credential Vault — AES-256-GCM encryption at rest.
 * Keys are NEVER returned to the client. Only masked hints are exposed.
 */
import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12 // GCM recommended 96-bit IV

function getKey(): Buffer {
  const raw = process.env.AI_NEXUS_ENCRYPTION_KEY
  if (!raw || raw === '0'.repeat(64)) {
    // Fallback deterministic key for dev so seeding works without setup.
    // In production this MUST be a real random 32-byte hex secret.
    return crypto.createHash('sha256').update('ai-nexus-dev-fallback-key').digest()
  }
  let buf = Buffer.from(raw, 'hex')
  if (buf.length !== 32) buf = crypto.createHash('sha256').update(raw).digest()
  return buf
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${enc.toString('base64')}.${tag.toString('base64')}`
}

export function decrypt(blob: string): string {
  const [ivB, encB, tagB] = blob.split('.')
  if (!ivB || !encB || !tagB) throw new Error('Invalid encrypted blob')
  const iv = Buffer.from(ivB, 'base64')
  const enc = Buffer.from(encB, 'base64')
  const tag = Buffer.from(tagB, 'base64')
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}

/** Mask a secret for display: "sk-abc...92" -> "••••92" */
export function maskKey(secret: string): string {
  const trimmed = secret.trim()
  if (trimmed.length <= 4) return '••••'
  return `••••${trimmed.slice(-4)}`
}

/** Random token for sessions */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/** Hash a password (scrypt) */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split('$')
    if (scheme !== 'scrypt' || !salt || !hash) return false
    const test = crypto.scryptSync(password, salt, 64).toString('hex')
    // timing-safe compare
    const a = Buffer.from(hash, 'hex')
    const b = Buffer.from(test, 'hex')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

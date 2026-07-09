import crypto from 'crypto'
import jwt from 'jsonwebtoken'

if (!process.env.JWT_ACCESS_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_ACCESS_SECRET must be set in production')
}
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-only-insecure-secret'
const JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m'
const JWT_REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS) || 30

export interface AccessTokenPayload {
  sub: string
  email: string
  displayName: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: jwt.SignOptions = { expiresIn: JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'] }
  return jwt.sign(payload, JWT_ACCESS_SECRET, options)
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_ACCESS_SECRET) as AccessTokenPayload
}

export function generateRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = crypto.randomBytes(32).toString('hex')
  const hash = hashRefreshToken(raw)
  const expiresAt = new Date(Date.now() + JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)
  return { raw, hash, expiresAt }
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

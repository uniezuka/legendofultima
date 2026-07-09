import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from './tokens.js'

export interface AuthedRequest extends Request {
  user?: { id: string; email: string; displayName: string }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (!token) return res.status(401).json({ message: 'Unauthorized' })

  try {
    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub, email: payload.email, displayName: payload.displayName }
    next()
  } catch {
    res.status(401).json({ message: 'Unauthorized' })
  }
}

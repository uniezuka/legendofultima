import { Router } from 'express'
import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from './db.js'
import { requireAuth, type AuthedRequest } from './authMiddleware.js'
import { signAccessToken, generateRefreshToken, hashRefreshToken } from './tokens.js'
import { STARTER_MONSTERS } from './game/economy.js'

const REFRESH_COOKIE_NAME = 'lou_refresh'
const REFRESH_COOKIE_PATH = '/auth'
const BCRYPT_COST = 12

const isProd = process.env.NODE_ENV === 'production'

function refreshCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    path: REFRESH_COOKIE_PATH,
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: maxAgeMs,
  }
}

async function issueSession(res: Response, userId: string, email: string, displayName: string) {
  const accessToken = signAccessToken({ sub: userId, email, displayName })
  const { raw, hash, expiresAt } = generateRefreshToken()
  await prisma.refreshToken.create({ data: { userId, tokenHash: hash, expiresAt } })
  res.cookie(REFRESH_COOKIE_NAME, raw, refreshCookieOptions(expiresAt.getTime() - Date.now()))
  return accessToken
}

// Normalize email at the boundary so lookups/uniqueness checks are
// case-insensitive — otherwise 'Name@Example.com' and 'name@example.com'
// are treated as different accounts.
const normalizedEmail = z.string().trim().toLowerCase().pipe(z.string().email())

const signupSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(8),
  displayName: z.string().min(2).max(20),
})

const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1),
})

export const authRouter = Router()

authRouter.post('/signup', async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid signup details.' })
  const { email, password, displayName } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ message: 'An account with that email already exists.' })

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email, displayName } })
    await tx.credential.create({ data: { userId: created.id, passwordHash } })
    await tx.campaignProgress.create({ data: { userId: created.id, highestUnlocked: 1 } })
    await tx.playerProfile.create({ data: { userId: created.id } })
    await tx.matchStats.create({ data: { userId: created.id } })
    return created
  })

  const accessToken = await issueSession(res, user.id, user.email, user.displayName)
  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    accessToken,
    campaignProgress: { highestUnlocked: 1 },
    profile: { gold: 0, ownedMonsters: STARTER_MONSTERS, loadout: STARTER_MONSTERS },
    stats: { pvpWins: 0, pvpLosses: 0 },
  })
})

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(401).json({ message: 'Invalid email or password.' })
  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    include: { credential: true, campaignProgress: true, playerProfile: true, matchStats: true },
  })
  if (!user?.credential) return res.status(401).json({ message: 'Invalid email or password.' })

  const valid = await bcrypt.compare(password, user.credential.passwordHash)
  if (!valid) return res.status(401).json({ message: 'Invalid email or password.' })

  const accessToken = await issueSession(res, user.id, user.email, user.displayName)
  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    accessToken,
    campaignProgress: { highestUnlocked: user.campaignProgress?.highestUnlocked ?? 1 },
    profile: {
      gold: user.playerProfile?.gold ?? 0,
      ownedMonsters: user.playerProfile?.ownedMonsters ?? STARTER_MONSTERS,
      loadout: user.playerProfile?.loadout ?? STARTER_MONSTERS,
    },
    stats: {
      pvpWins: user.matchStats?.pvpWins ?? 0,
      pvpLosses: user.matchStats?.pvpLosses ?? 0,
    },
  })
})

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME]
  if (!raw) return res.status(401).json({ message: 'No refresh token.' })

  const tokenHash = hashRefreshToken(raw)
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } })

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH })
    return res.status(401).json({ message: 'Refresh token invalid or expired.' })
  }

  if (existing.replacedById) {
    // Reuse of an already-rotated token — treat as compromise, revoke the whole chain.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH })
    return res.status(401).json({ message: 'Session invalidated, please log in again.' })
  }

  const user = await prisma.user.findUnique({ where: { id: existing.userId } })
  if (!user) return res.status(401).json({ message: 'User not found.' })

  const { raw: newRaw, hash: newHash, expiresAt } = generateRefreshToken()
  const newToken = await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: newHash, expiresAt },
  })

  // Compare-and-swap: only claim `existing` as rotated if it's still
  // un-rotated. A concurrent /auth/refresh call with the same cookie
  // (two tabs, or two in-flight requests) could otherwise both pass the
  // checks above and both mint a child token from the same parent.
  const rotated = await prisma.refreshToken.updateMany({
    where: { id: existing.id, revokedAt: null, replacedById: null },
    data: { revokedAt: new Date(), replacedById: newToken.id },
  })

  if (rotated.count === 0) {
    // Lost the race — another request already rotated this token first.
    // Discard the orphan child token and fail closed rather than issuing
    // a second valid child from the same parent.
    await prisma.refreshToken.delete({ where: { id: newToken.id } })
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH })
    return res.status(401).json({ message: 'Refresh already handled by a concurrent request, please retry.' })
  }

  res.cookie(REFRESH_COOKIE_NAME, newRaw, refreshCookieOptions(expiresAt.getTime() - Date.now()))
  const accessToken = signAccessToken({ sub: user.id, email: user.email, displayName: user.displayName })
  res.json({ accessToken })
})

authRouter.post('/logout', async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME]
  if (raw) {
    const tokenHash = hashRefreshToken(raw)
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH })
  res.status(204).end()
})

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { campaignProgress: true, playerProfile: true, matchStats: true },
  })
  if (!user) return res.status(404).json({ message: 'User not found.' })

  res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    campaignProgress: { highestUnlocked: user.campaignProgress?.highestUnlocked ?? 1 },
    profile: {
      gold: user.playerProfile?.gold ?? 0,
      ownedMonsters: user.playerProfile?.ownedMonsters ?? STARTER_MONSTERS,
      loadout: user.playerProfile?.loadout ?? STARTER_MONSTERS,
    },
    stats: {
      pvpWins: user.matchStats?.pvpWins ?? 0,
      pvpLosses: user.matchStats?.pvpLosses ?? 0,
    },
  })
})

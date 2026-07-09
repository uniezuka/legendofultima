import { Router } from 'express'
import type { Response } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from './db.js'
import { requireAuth, type AuthedRequest } from './authMiddleware.js'

export const campaignRouter = Router()

const progressSchema = z.object({
  highestUnlocked: z.number().int().min(1).max(10),
})

campaignRouter.put('/campaign-progress', requireAuth, async (req: AuthedRequest, res: Response) => {
  const parsed = progressSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid progress payload.' })

  const userId = req.user!.id
  const id = crypto.randomUUID()

  // Single atomic statement — a read-then-write (findUnique + upsert) would
  // let two concurrent requests for the same account (e.g. two tabs/devices)
  // both read stale state and have the lower value clobber an already-
  // committed higher one. GREATEST() computes the max server-side in one
  // round trip, so the "never regress" guarantee actually holds under
  // concurrency, not just within a single request.
  const rows = await prisma.$queryRaw<{ highestUnlocked: number }[]>`
    INSERT INTO "CampaignProgress" ("id", "userId", "highestUnlocked", "updatedAt")
    VALUES (${id}, ${userId}, ${parsed.data.highestUnlocked}, now())
    ON CONFLICT ("userId") DO UPDATE
    SET "highestUnlocked" = GREATEST("CampaignProgress"."highestUnlocked", EXCLUDED."highestUnlocked"),
        "updatedAt" = now()
    RETURNING "highestUnlocked"
  `

  res.json({ highestUnlocked: rows[0].highestUnlocked })
})

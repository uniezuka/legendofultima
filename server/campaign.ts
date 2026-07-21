import { Router } from 'express'
import type { Response } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from './db.js'
import { requireAuth, type AuthedRequest } from './authMiddleware.js'
import { applyMatchResult } from './profile.js'

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
  //
  // Also returns the pre-write value (via the `prev` CTE, evaluated against
  // the same snapshot as the write per Postgres's data-modifying-CTE
  // semantics) so the caller can tell whether this request genuinely
  // advanced progress — the server-verifiable definition of "first clear",
  // used below to gate the campaign-win Gold reward. This replaces trusting
  // a client-claimed "I won" outcome (which was callable directly with no
  // proof of an actual advance — see docs/SHOP_ECONOMY_SPEC.md) with a
  // condition derived from the write's own effect.
  const rows = await prisma.$queryRaw<{ highestUnlocked: number; previousHighestUnlocked: number }[]>`
    WITH prev AS (
      SELECT "highestUnlocked" FROM "CampaignProgress" WHERE "userId" = ${userId}
    ),
    upserted AS (
      INSERT INTO "CampaignProgress" ("id", "userId", "highestUnlocked", "updatedAt")
      VALUES (${id}, ${userId}, ${parsed.data.highestUnlocked}, now())
      ON CONFLICT ("userId") DO UPDATE
      SET "highestUnlocked" = GREATEST("CampaignProgress"."highestUnlocked", EXCLUDED."highestUnlocked"),
          "updatedAt" = now()
      RETURNING "highestUnlocked"
    )
    SELECT upserted."highestUnlocked" AS "highestUnlocked",
           COALESCE(prev."highestUnlocked", 0) AS "previousHighestUnlocked"
    FROM upserted LEFT JOIN prev ON true
  `

  const { highestUnlocked, previousHighestUnlocked } = rows[0]
  const isFirstClear = highestUnlocked > previousHighestUnlocked
  if (!isFirstClear) return res.json({ highestUnlocked })

  const { gold } = await applyMatchResult(userId, 'campaign', 'win')
  res.json({ highestUnlocked, gold })
})

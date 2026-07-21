import { Router } from 'express'
import type { Response } from 'express'
import { z } from 'zod'
import { prisma } from './db.js'
import { requireAuth, type AuthedRequest } from './authMiddleware.js'
import { SHOP_MONSTER_PRICES, LOADOUT_SIZE, GOLD_REWARD } from './game/economy.js'

export const profileRouter = Router()

const purchaseSchema = z.object({ monsterType: z.string() })

profileRouter.post('/shop/purchase', requireAuth, async (req: AuthedRequest, res: Response) => {
  const parsed = purchaseSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid purchase payload.' })

  const { monsterType } = parsed.data
  const price = SHOP_MONSTER_PRICES[monsterType]
  if (price === undefined) return res.status(400).json({ message: 'That monster is not purchasable.' })

  const userId = req.user!.id
  // upsert, not findUnique — accounts created before this feature shipped have
  // no PlayerProfile row yet (only created in the signup transaction); this
  // lazily backfills the default row instead of 404ing forever.
  const profile = await prisma.playerProfile.upsert({ where: { userId }, create: { userId }, update: {} })
  if (profile.ownedMonsters.includes(monsterType)) {
    return res.status(409).json({ message: 'Monster already owned.' })
  }
  if (profile.gold < price) return res.status(400).json({ message: 'Not enough gold.' })

  // Conditional update (not just a plain `update`) — re-checks gold/ownership
  // in the WHERE clause so a concurrent duplicate request (double-click,
  // two tabs) can't both pass the precheck above and both deduct gold.
  const updated = await prisma.playerProfile.updateMany({
    where: { userId, gold: { gte: price }, NOT: { ownedMonsters: { has: monsterType } } },
    data: { gold: { decrement: price }, ownedMonsters: { push: monsterType } },
  })
  if (updated.count === 0) {
    return res.status(409).json({ message: 'Purchase conflicted with a concurrent request, please retry.' })
  }

  // No extra findUnique — updated.count > 0 guarantees the WHERE clause
  // matched at write time, so these are exactly the values that got written.
  res.json({ gold: profile.gold - price, ownedMonsters: [...profile.ownedMonsters, monsterType] })
})

const loadoutSchema = z.object({
  monsterTypes: z.array(z.string()).length(LOADOUT_SIZE),
})

profileRouter.put('/loadout', requireAuth, async (req: AuthedRequest, res: Response) => {
  const parsed = loadoutSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: `Loadout must have exactly ${LOADOUT_SIZE} monsters.` })

  const { monsterTypes } = parsed.data
  if (new Set(monsterTypes).size !== monsterTypes.length) {
    return res.status(400).json({ message: 'Loadout cannot contain duplicate monsters.' })
  }

  const userId = req.user!.id
  // upsert, not findUnique — see the same note in /shop/purchase above.
  const profile = await prisma.playerProfile.upsert({ where: { userId }, create: { userId }, update: {} })

  const notOwned = monsterTypes.filter((type) => !profile.ownedMonsters.includes(type))
  if (notOwned.length > 0) {
    return res.status(400).json({ message: `Monster(s) not owned: ${notOwned.join(', ')}` })
  }

  const updated = await prisma.playerProfile.update({ where: { userId }, data: { loadout: monsterTypes } })
  res.json({ loadout: updated.loadout })
})

// Shared by every entry point that awards a match's Gold outcome:
// - PvP win/loss — server/rooms.ts's game_over handler, both server-computed,
//   no client involvement. Also increments MatchStats (PvP is the only mode
//   with a win/loss record — Campaign is single-player against a fixed AI
//   ramp, not a competitive result worth tracking; its progress is already
//   tracked via CampaignProgress.highestUnlocked).
// - Campaign win/loss — server/campaign.ts's PUT /campaign-progress. Win is
//   gated on the write itself genuinely advancing highestUnlocked
//   (server-verified) before any Gold is granted.
// There is deliberately no generic client-facing "report any match result"
// endpoint: one existed previously (`POST /match-result { mode, outcome }`)
// and let an authenticated client claim an arbitrary win directly (curl/
// devtools), farming unlimited Gold with no server-side proof a stage was
// ever cleared. Campaign wins must now go through the campaign-progress
// endpoint above, which can't be gamed the same way since the reward is tied
// to the write's own effect, not a separately-asserted claim.
export async function applyMatchResult(userId: string, mode: 'campaign' | 'pvp', outcome: 'win' | 'loss') {
  const goldDelta = GOLD_REWARD[mode][outcome]

  // upsert, not update — `update` throws (P2025) if the row doesn't exist yet,
  // which would be the case for any account created before this feature
  // shipped (PlayerProfile is otherwise only created at signup).
  if (mode === 'campaign') {
    const profile = await prisma.playerProfile.upsert({
      where: { userId },
      create: { userId, gold: goldDelta },
      update: { gold: { increment: goldDelta } },
    })
    return { gold: profile.gold }
  }

  const statsField = outcome === 'win' ? 'pvpWins' : 'pvpLosses'
  const [profile, stats] = await prisma.$transaction([
    prisma.playerProfile.upsert({
      where: { userId },
      create: { userId, gold: goldDelta },
      update: { gold: { increment: goldDelta } },
    }),
    prisma.matchStats.upsert({
      where: { userId },
      create: { userId, [statsField]: 1 },
      update: { [statsField]: { increment: 1 } },
    }),
  ])

  return { gold: profile.gold, stats }
}

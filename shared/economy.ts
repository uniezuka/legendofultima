// Shop/Gold economy constants — see docs/SHOP_ECONOMY_SPEC.md.
// Kept separate from constants.ts (turn/board/combat rules) since this
// governs account-level unlocks, not in-match state.

export const STARTER_MONSTERS = ['slime', 'goblin', 'archer', 'knight', 'dragon']

// Monsters that must be bought in the Shop — not part of the free starter set.
export const SHOP_MONSTER_PRICES: Record<string, number> = {
  white_mage: 110,
  black_mage: 110,
}

export const ALL_MONSTER_TYPES = [...STARTER_MONSTERS, ...Object.keys(SHOP_MONSTER_PRICES)]

export const LOADOUT_SIZE = 5

// Gold reward per match outcome, split by mode — a full 10-stage campaign
// clear guarantees exactly 100G (just short of one 110G monster), so buying
// even the first new monster requires at least one PvP win on top of that.
// Campaign gives nothing for a loss (stages are freely retryable, so a
// consolation reward there would be an infinite-farm loophole); PvP gives a
// small consolation since a loss there costs real matchmaking time.
export const GOLD_REWARD = {
  campaign: { win: 10, loss: 0 },
  pvp: { win: 10, loss: 5 },
} as const

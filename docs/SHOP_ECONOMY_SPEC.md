# Shop, Gold Economy & Monster Loadout — Spec

**Status: Implemented.** This document is the design spec this was built against; see `docs/SHOP_ABILITIES_TASKS.md` for the phase-by-phase implementation log (manual smoke testing completed across a full campaign match and a full PvP match).

---

## Overview

Players earn Gold from match outcomes and spend it in a Shop to permanently unlock new monsters. The starter roster (Slime, Goblin, Archer, Knight, Dragon) stays free/owned by default. Two new monsters — White Mage and Black Mage (see `docs/MONSTER_ABILITIES_SPEC.md`) — must be purchased. Because the game always summons from a 5-monster active roster, owning more than 5 monsters requires choosing which 5 are active via a Loadout screen.

A Stats tracker records PvP win/loss history per account. Campaign has no win/loss record — it's single-player against a fixed-difficulty AI ramp, not a competitive result worth tracking; campaign progress is already tracked separately via `CampaignProgress.highestUnlocked`.

---

## Data Model

Two new Prisma models, 1:1 with `User`, following the same pattern as the existing `CampaignProgress` model (see `docs/AUTH_SPEC.md`):

```prisma
model PlayerProfile {
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  gold          Int      @default(0)
  ownedMonsters String[] @default(["slime", "goblin", "archer", "knight", "dragon"])
  loadout       String[] @default(["slime", "goblin", "archer", "knight", "dragon"])
  updatedAt     DateTime @updatedAt
}

model MatchStats {
  userId    String @unique
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  pvpWins   Int    @default(0)
  pvpLosses Int    @default(0)
}
```

Both are created in the same transaction as signup, alongside `CampaignProgress`, and hydrated via `/auth/me` in the same round trip — no extra request needed.

---

## Gold

Reward table (`server/game/economy.ts` → `GOLD_REWARD`):

| Mode | Win | Loss |
|---|---|---|
| Campaign | 10G | 0G (no consolation — see note below) |
| PvP | 10G | 5G |

- Campaign gives **nothing** for a loss. Stages are freely retryable (no progress lost), so any consolation gold there would be an infinite-farm loophole — retry a losing stage forever for free gold.
- **Campaign gold only pays out on a stage's first clear**, i.e. only when the win actually advances `highestUnlocked`. This is enforced **server-side**, not client-side: the reward rides along on the same `PUT /campaign-progress` write, gated on whether that write's own effect increased the stored value (computed atomically via a CTE comparing the pre- and post-write `highestUnlocked` in one round trip — see `server/campaign.ts`). An earlier design gated this client-side via a separate `POST /match-result { mode, outcome }` call the client could choose not to fire on a replay win — that trusted an unverifiable client claim and was directly exploitable by calling the endpoint with `outcome: 'win'` repeatedly from outside the UI. That endpoint no longer exists in this form; see REST Endpoints below.
- A full 10-stage campaign clear therefore guarantees exactly **100G total** — deliberately just short of one 110G monster, so buying even the first new monster requires at least one PvP win on top of finishing the campaign. A second monster requires substantial further PvP play. This is intentional: campaign completion alone doesn't unlock the shop's contents, PvP participation is required.

## Shop

- 7 total monster types exist in the registry; 5 are owned by every account by default (the starters). White Mage and Black Mage must be purchased.
- Purchase is permanent — no re-locking, no consumable/expiring unlocks.
- Price: **110 Gold** each for White Mage and Black Mage (`server/game/economy.ts` → `SHOP_MONSTER_PRICES`).

## Loadout

- Exactly 5 active monsters chosen from the player's `ownedMonsters` pool.
- **One global loadout**, shared by Campaign and PvP — not per-mode. Confirmed decision; simpler to reason about as a player.
- **Campaign**: the player's active roster in every stage is always their current global loadout. There is no random or stage-specific restriction of the player's monster choices.
- **Campaign AI opponent** (`useAiController`) is entirely unaffected by this system — its available monster set stays whatever it is today, unchanged by the player's purchases or loadout choice. This feature only governs the human player's summon options.
- **PvP**: loadout must be enforced **server-side**. The server fetches each connected player's `PlayerProfile.loadout` at room/match creation and rejects `SUMMON_MONSTER` actions for any type outside it — mirroring how every other action is already validated in `server/game/apply.ts`. Client-side filtering (hiding non-loadout monsters in the UI) is a UX nicety, not the source of truth.
- **Campaign**: since there's no server round-trip during offline play, the client's own `summonMonster` (`src/store/gameStore.ts`) enforces the loadout directly (skipped for the AI's turn) rather than relying solely on the UI hiding non-loadout buttons — the offline equivalent of the PvP server check above.

## Stats

- Tracked per account: `pvpWins`/`pvpLosses`. No campaign win/loss record — see `MatchStats` above for why.
- Read-only display; no achievements/rewards tied to specific thresholds (out of scope for now).

---

## REST Endpoints

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| POST | `/shop/purchase` | `{ monsterType }` | `{ gold, ownedMonsters }` | `requireAuth`; server validates `gold >= price` and not already owned; atomic deduct + add |
| PUT | `/loadout` | `{ monsterTypes: string[5] }` | `{ loadout }` | `requireAuth`; validates length 5, no duplicates, all present in `ownedMonsters` |
| PUT | `/campaign-progress` | `{ highestUnlocked }` | `{ highestUnlocked, gold? }` | `requireAuth`; existing endpoint (see `docs/AUTH_SPEC.md`) — `gold` is only present when this write genuinely advanced `highestUnlocked` (a server-verified first clear), which is when the campaign-win reward is applied. No client-facing "report a campaign loss" endpoint exists — a loss carries 0G and there's no campaign win/loss record to update (see `MatchStats` above), so there's nothing to report. |
| GET | `/auth/me` | — | extended to include `profile: { gold, ownedMonsters, loadout }` and `stats: MatchStats` | existing endpoint, response shape extended |

---

## Screens

A single **Profile** screen (new `AppScreen: 'profile'`, one title-screen entry point) with three tabs:

- **Shop** — the purchasable monsters only (White Mage, Black Mage — starters aren't shown, there's nothing to do with them), owned/locked state, gold cost, purchase button (disabled if already owned or unaffordable).
- **Loadout** — pick exactly 5 of the owned monsters as the active roster.
- **Stats** — read-only PvP win/loss display.


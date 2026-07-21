# Monster Abilities — Spec (White Mage / Black Mage)

**Status: Implemented.** This document is the design spec this was built against; see `docs/SHOP_ABILITIES_TASKS.md` for the phase-by-phase implementation log (manual smoke testing completed across a full campaign match and a full PvP match).

---

## Overview

Two new monsters introduce the game's first abilities — specifically the **active, tile-targeting** kind: extending the existing 2-step Monster Action System (`CLAUDE.md` → "Monster Action System (2-Step)") with a 4th combat-step branch: **Ability**, alongside Attack / Defend / Skip. This is one shape abilities can take, not the only one — see "Future Ability Types" below.

Both monsters are purchasable via the Shop (see `docs/SHOP_ECONOMY_SPEC.md`) — they are not part of the default starter roster.

---

## New Monsters

| | Cost | HP | ATK | DEF | MOVE | Range | Skill |
|---|---|---|---|---|---|---|---|
| White Mage | 3 | 3 | 3 | 1 | 1 | 2 | `create_path` |
| Black Mage | 3 | 3 | 3 | 1 | 1 | 2 | `destroy_path` |

Same base stat line as Archer (cost 3, range 2) but with lower HP/DEF — a fragile utility unit, not a combatant.

---

## Ability Mechanics

**Ability range is fixed at 1 tile (orthogonal), independent of the monster's `range` stat.** The `range: 2` above only governs the monster's normal Attack option — abilities always target an adjacent tile.

### White Mage — `create_path`

- Target: an **empty** tile orthogonally adjacent (distance 1) to the mage.
- Effect: the tile becomes a path tile owned by the mage's player.
- **No connectivity requirement** — unlike normal path placement (which must connect to an existing friendly path or base), this works even if the mage itself is standing on enemy-owned territory. E.g. a White Mage standing on a red (enemy) tile can create a blue tile in an adjacent empty cell.

### Black Mage — `destroy_path`

- Target: **any path tile** (friendly or enemy) orthogonally adjacent (distance 1) to the mage, **with no monster currently standing on it**.
- Effect: the tile reverts to empty (`type: 'empty', owner: null`).
- Base tiles are a distinct `CellType` (`'base'`), so they can never be targeted by this ability — no extra guard needed beyond checking `cell.type === 'path'`.

### Turn Economy

- Using an ability consumes the monster's Combat step (step 2), mutually exclusive with Attack/Defend: Move (or skip), then choose **Attack OR Defend OR Ability OR Skip**.
- Once per turn per monster, same as the rest of the 2-step system. After use, the monster returns to Idle (same as after a successful attack).

---

## Type / System Changes

- `shared/types.ts`: `MonsterAction` gains `'ability'`. `GameAction` gains `{ type: 'USE_ABILITY'; payload: { monsterId: string; targetCoord: Coord } }`.
- `server/game/apply.ts`: new handler for `USE_ABILITY`, gated the same way `ATTACK_TARGET`/`DEFEND_MONSTER` are (must be that monster's combat step, not already acted this turn).
- `MonsterTemplate.skills?: string[]` (already reserved in `src/types/monster.ts`) is the field that flags which monsters expose the Ability option: `skills: ['create_path']` / `skills: ['destroy_path']`.
- A small shared `ABILITY_DEFINITIONS` lookup (keyed by skill id → `{ range: 1, kind: 'create_path' | 'destroy_path' }`) drives both server validation and client targeting.

---

## Client UX

- `SidePanel.tsx`: "Use Ability" button appears in the combat-step controls only for monsters whose template has a `skills` entry.
- When such a monster is selected, the side panel also shows the ability's name + a short static description (e.g. "Create Path — creates a friendly path tile on an adjacent empty cell.") next to the "Use Ability" button. Plain hardcoded string per skill id (a small `ABILITY_DESCRIPTIONS: Record<string, { label: string; description: string }>` lookup) — no dynamic interpolation of monster name/owner needed.
- Scoped down deliberately: **not** added to the Monster Inspector for now — that stays out of scope until/unless it's asked for later. This means the description is only visible for your own monster, during your turn, in the combat step — not for inspecting an enemy mage's ability.
- Board: a new ability-targeting highlight color, distinct from the existing move/attack highlights, shown over valid range-1 targets (empty tiles for White Mage, path tiles with no monster for Black Mage).
- Action log: two new entry types — "White Mage created a path", "Black Mage destroyed a path" — consistent with existing log conventions.

---

## AI Behavior (Campaign)

`useAiController.ts` needs new decision logic for medium/hard difficulty on when to use `create_path` vs `destroy_path` vs a normal attack (e.g. extend its own network early, disrupt the opponent's near-complete network late). This is a genuine design decision to make during implementation, not pure plumbing — flagged here so it isn't treated as a mechanical afterthought.

---

## Future Ability Types (Not Yet Implemented)

White Mage and Black Mage are both **active + tile-targeting + board-mutating** abilities — that's one point in a larger design space, not the whole space. The user has explicitly flagged that future abilities should not be assumed to fit this same shape. Concretely, a future ability may vary along three independent axes:

- **Trigger** — *active* (player-invoked via a combat-step button, like the two above) vs. *passive* (triggers automatically, e.g. a life-drain effect that fires every time its owner attacks, or every turn). Passive effects don't go through `USE_ABILITY` at all — they'd hook into the relevant existing event instead (e.g. inside `ATTACK_TARGET`'s resolution, or `runEndTurnAndAutoPhases`/the client's turn-transition code for a per-turn tick).
- **Target** — *tile* (the only kind implemented so far) vs. *ally monster* vs. *enemy monster* vs. *self* vs. *no target* (e.g. a self-buff or a global resource effect). A monster-targeting ability needs a monster id in its payload, not a `Coord` — `USE_ABILITY`'s current `{ monsterId, targetCoord }` shape doesn't fit that without changing.
- **Effect** — *board mutation* (create/destroy a path tile, the only kind implemented so far) vs. *resource mutation* (e.g. granting the owner Mana) vs. *monster stat mutation* (e.g. draining HP from the target and healing the caster).

**Deliberately not building a generic "ability effect engine" now** — with only two abilities in existence, and both identical in shape (active/tile/board-mutation), there isn't yet a second real, differently-shaped example to design a generic abstraction against. Per this project's design philosophy (`CLAUDE.md` → "Design Philosophy": avoid over-engineering ahead of validated need), the right move is to design each new ability's plumbing against its actual requirements when it's requested, rather than guessing at a generic shape now and likely guessing wrong. When the next ability is proposed, work out its trigger/target/effect axes first — that determines whether it extends `USE_ABILITY`, needs a new action type entirely, or doesn't go through the action system at all.

---

## Interaction with Existing Rules

`CLAUDE.md`'s Path Rules and the equivalent line in `GDD.md` have been updated to note Black Mage's `destroy_path` as the first exception to "Placement is permanent."

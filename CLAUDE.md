# Legend of Ultima - Claude Development Guide

## Project Goal

Build a playable MVP for Legend of Ultima.

Focus on gameplay first.

Do not add systems unless explicitly requested.

A playable prototype is more important than feature completeness.

---

# Tech Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

## State Management

* Zustand

## Backend (Future — Not Active in MVP)

* Node.js
* Express
* Prisma
* PostgreSQL

The MVP runs entirely in the browser with no backend.
All game state lives in Zustand.
Do not add backend systems until explicitly requested.

---

# Architecture Principles

The application must run in:

* Local Development
* Render
* Future Hosting Providers

Avoid vendor lock-in.

Environment-specific settings must be stored in environment variables.

Never hardcode:

* URLs
* Database Connections
* API Endpoints

---

# Development Workflow

Primary Development Target:

Local Machine

Commands:

npm install

npm run dev

Development URL:

http://localhost:5173

Build:

npm run build

Preview:

npm run preview

---

# Deployment

Preferred Deployment:

Render

Alternative Platforms:

* Railway
* Fly.io
* DigitalOcean
* Self Hosted VPS

Deployment platform must remain interchangeable.

---

# Game Modes

## PvP (2-Player Local)

Both players are human. No AI. Started via "2-Player Local" on the title screen.

`gameMode: 'pvp'`, `aiEnabled: false`

## Campaign

Single-player vs AI. 10 stages of increasing difficulty. Started via "Campaign" on the title screen.

`gameMode: 'campaign'`, `aiEnabled: true`

Player 2 is controlled by `useAiController` (hook). The AI difficulty and starting mana are set per stage via `CAMPAIGN_STAGES` in `src/constants/campaign.ts`.

`startCampaignMatch(aiStartingMana)` in gameStore sets up the campaign match — it gives player2 extra starting mana based on stage difficulty.

The human player (player1) controls the left panel. The AI panel is dimmed and non-interactive during player2's turn.

---

# MVP Requirements

## Board

* 11 columns × 15 rows
* P1 base: single tile at row 14, col 5 (bottom center)
* P2 base: single tile at row 0, col 5 (top center)
* No starter path tiles — players must build from scratch each game
* Board is vertically centered in the viewport

## UI Layout

3-column flex layout:

* Left panel (w-52): Player 1 (Blue) controls and status
* Center: TurnPhaseBar + Board (11×15, 48px cells) + ActionLog
* Right panel (w-52): Player 2 (Red) controls and status

Phase-specific controls appear only in the active player's side panel.
The board never shifts when panels appear or disappear.

## Turn System

1. Generate Mana (auto)
2. Generate Paths (auto)
3. Roll Dice (player)
4. Place Path (player)
5. Summon Monster (player)
6. Monster Actions (player)
7. End Turn (player)

Phases 1 and 2 auto-execute on phase enter.
Phases 3–7 require player input.

## Mana

Starting Mana: 3

Gain: +1 each turn

Unused mana carries over.

## Luck

Gain: +1 when path placement fails (no path matches dice roll).

Spend: 3 Luck to modify the dice result by +1 or −1.

Luck adjustment happens during the Place Path phase, not Roll Dice.
This lets the player decide whether to spend luck after seeing the paths.

## Dice

Roll: 1d6 (one six-sided die, result 1–6).

Dice are displayed as face images from `/assets/dice/dice-{1–6}.svg`.

## Paths

Generate 3 random paths each turn.

Each path has:

* Shape (I, L, T, Cross, Corner, S — 6 shapes total) — all 3 shapes are always distinct
* Cost (1–6) — all 3 costs are always distinct (ensures at most one path matches the dice roll)

Path selection requires: Path Cost == Dice Roll (exact match).

If no match: skip placement, gain 1 Luck.

Path Placement UX:
* Select a matching path card in the side panel
* Hover over the board to see a ghost preview (yellow = valid, red = invalid)
* Click to place
* Use Rotate button to rotate the shape 90°

Path Rules:
* Must connect to an existing friendly path or friendly base
* Cannot overwrite existing tiles
* Placement is permanent

## Monster Cap

8 monsters per player, 16 maximum on board.

---

# Monster States

## Summoning

Summoned this turn. Cannot act. Shows 💤 icon on token.

Becomes Idle at start of next turn.

## Idle

Default state. Vulnerable. Can be selected for the 2-step action sequence.

## Defending

Active shield. Shows 🛡 icon (centered overlay) + cyan DEF bar on token.

Uses currentDef (shield pool) during combat — see DEF Shield below.

Cannot Defend twice consecutively.
Must complete a Move or Attack step before Defending again.

---

# Monster Action System (2-Step)

Each monster that is not in Summoning state must complete a 2-step sequence per turn.

Step 1 — Movement:
* Move to a reachable cell (green highlight), OR
* Stay (skip move)
* After step 1: monster remains selected for step 2

Step 2 — Combat:
* Attack an enemy in range (orange highlight + ⚔ icon), OR
* Defend (enter Defending state, resets shield), OR
* Skip combat
* After step 2: monster is fully done for the turn

All non-summoning monsters must complete both steps before "Done Actions" is available without a confirmation dialog.

If a player clicks "Done Actions" while monsters still need to act, a confirmation dialog appears listing the unacted monsters. Confirming calls `forceEndMonsterActions` which immediately advances to End Turn. `forceEndMonsterActions` is guarded — it is a no-op if the phase is not `monsterActions`.

If a monster has no valid actions in a step, that step may be skipped freely.

After a successful attack: attacker returns to Idle state.

---

# DEF Shield (Defending State)

When a monster enters Defending state, its shield resets to full (currentDef = def).

When a defending monster is attacked:

If ATK > currentDef:
  defenderDamage = ATK - currentDef
  currentDef = 0 → monster goes Idle

If ATK < currentDef:
  attackerDamage = currentDef - ATK
  currentDef -= ATK
  if currentDef == 0 → monster goes Idle

If ATK == currentDef:
  No HP damage
  currentDef = 0 → monster goes Idle

The cyan bar on the token represents currentDef remaining.
Once the shield breaks, the monster returns to Idle automatically.
This prevents permanent turtling — a monster cannot defend forever.

---

# Attack Preview

Before attacking, clicking an enemy in range shows a preview panel:

* Attacker vs Defender stats
* Expected HP changes for both sides
* Whether the defender's shield will break and they will go Idle
* "Confirm Attack" button to execute
* "Cancel" button to choose a different action

The attack only fires on explicit confirmation.

---

# Monster Inspector

Clicking any monster on the board at any time opens an info card showing:

* Type, owner, state
* HP bar with numbers
* Shield bar (only when defending)
* ATK, DEF, MOVE, RANGE stats
* Board position

The inspector is dismissed by clicking empty space or the ✕ button.
The inspector clears automatically when the turn changes.

---

# Combat

## Target Idle

Damage = ATK (to target HP)

## Target Defending

See DEF Shield section above. Uses currentDef, not the base def stat.

## Death

When a monster's HP reaches 0, it is removed from the board.
A 💀 death entry appears in the action log.

---

# Movement

Directions: Up, Down, Left, Right. No diagonals.

Monsters can move on any path or base tile, regardless of owner.
Empty tiles block movement — a path network is required to advance.

To reach the enemy base, a player must build their path network
toward the opponent's side of the board. Monsters can then cross
into enemy-colored tiles once adjacent to them.

---

# Starter Monsters

Slime
Cost: 1 | HP: 8 | ATK: 2 | DEF: 4 | MOVE: 1

Goblin
Cost: 2 | HP: 5 | ATK: 5 | DEF: 2 | MOVE: 2

Archer
Cost: 3 | HP: 4 | ATK: 4 | DEF: 1 | MOVE: 1 | Range: 2

Knight
Cost: 4 | HP: 12 | ATK: 4 | DEF: 6 | MOVE: 1

Dragon
Cost: 7 | HP: 15 | ATK: 8 | DEF: 5 | MOVE: 2

---

# Asset System

All game assets live under `public/assets/` and are served by Vite at `/assets/`.

## Board Tiles (`/assets/tiles/`)

| File | Used for |
|---|---|
| `grass.png` | Empty cells (the base terrain) |
| `path.png` | Path tiles (+ blue/red tint overlay for ownership) |
| `base-ally.svg` | Player 1 base tile |
| `base-enemy.svg` | Player 2 base tile |

Tile type → file is resolved by `getCellBgImage()` in `Cell.tsx`.
Path ownership is shown via a `bg-blue-500/25` or `bg-red-500/25` overlay on top of `path.png`.
Base tiles pulse via an animated color overlay (`animate-pulse`).

## Monster Sprites (`/assets/monsters/{type}/`)

Each monster type has a folder. Current sprite files used:

| State | File |
|---|---|
| idle | `idle.png` |
| summoning | `idle.png` (+ 💤 icon overlay) |
| defending | `idle.png` (+ 🛡 centered overlay + cyan DEF bar) |

Player 1 sprites are mirrored horizontally (`scaleX(-1)`) so both players face each other.
Owner tint overlay (`bg-blue-500/25` / `bg-red-500/25`) distinguishes teams.
HP bar (green/yellow/red) and DEF bar (cyan) are rendered as absolute-positioned divs at the bottom of the token.

## Dice (`/assets/dice/`)

Files: `dice-1.svg` through `dice-6.svg`. Shown in the Roll Dice and Place Path phases.

## UI (`/assets/ui/`)

| File | Used for |
|---|---|
| `logo.svg` | Title screen logo |
| `title-bg.svg` | Title screen background |

## PNG vs SVG preference

Use PNG for repeated game-board tiles and monster sprites — browsers cache and GPU-blit PNGs efficiently. Use SVG for scalable UI elements (dice faces, icons, logo).

---

# Visual Indicators

| Element | Indicator |
|---|---|
| Summoning monster | 💤 icon on token |
| Defending monster | 🛡 centered overlay + cyan DEF bar |
| Selected monster | White ring glow |
| Must-act monster | Amber ring (can-act highlight) |
| Reachable move cell | Green fill |
| Attackable enemy | Orange fill + ⚔ icon |
| Pending attack target | Bright orange fill + ring |
| Valid path placement | Yellow ghost preview |
| Invalid path placement | Red ghost preview |
| Summon cell | Purple fill |
| Player 1 paths | Blue tint overlay on path tile |
| Player 2 paths | Red tint overlay on path tile |

---

# Action Log

Last 5 events shown below the board. Capped at 100 entries in state to prevent unbounded growth.

Logged events include:

* Mana gain
* Dice rolls
* Luck spend / gain
* Path placement / skip
* Monster summon
* Monster move
* Combat results (damage dealt, shield chip, shield break)
* Monster death (💀)
* Turn transitions
* Force-end actions (when player skips unacted monsters)

---

# Campaign System

## Screens

`src/constants/campaign.ts` — defines `CAMPAIGN_STAGES[]` (10 stages).

Screen flow managed by `campaignStore`:

```
title → campaign-select → campaign-intro → game → (result overlay)
```

## Stage Definition

Each stage has: `name`, `description`, `difficulty`, `aiStartingMana`, `intro`, `victoryOutro`, `defeatOutro`.

## AI Controller

`src/game/useAiController.ts` — React hook that drives player2's turns automatically.
Difficulty levels: `easy` | `medium` | `hard`.

`AiDriver` component in `GameScreen.tsx` mounts the hook. It renders nothing and is only mounted when `aiEnabled === true`.

## Result Overlays

* Campaign win → Next Stage button (if stages remain) or "Campaign Complete" message
* Campaign loss → Retry Stage button
* PvP win → Main Menu button

---

# Development Priorities

Priority 1 — Playable Match ✅ (complete)

Priority 2 — Basic AI ✅ (complete)

Priority 3 — Campaign ✅ (complete)

Priority 4 — Save System

Priority 5 — Online Multiplayer

---

# Design Philosophy

Keep systems simple.

Create depth through:

* Path Placement
* Positioning
* Resource Management
* Tactical Decisions

Avoid:

* Complex Skill Trees
* Equipment Systems
* Crafting Systems
* Status Effects

until the core gameplay loop is validated.

Always prioritize gameplay over architecture complexity.

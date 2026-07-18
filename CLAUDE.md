# Legend of Ultima - Claude Development Guide

# Current Version

**0.2.0** (Alpha) — authoritative source: the `version` field in `package.json`, mirrored in `server/package.json`. Bump both together when releasing.

Bumped from 0.1.0 → 0.2.0 for the account authentication system and Postgres-backed campaign progress saving (see `docs/AUTH_SPEC.md`) — a minor bump per semver's pre-1.0 convention (new backwards-compatible functionality, not just a fix).

---

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

## Backend

* Node.js
* Express
* Socket.io (Online PvP, authoritative game state)
* Prisma
* PostgreSQL (accounts, campaign progress)

The backend is active: `server/` runs an Express + Socket.io process backed by
Postgres via Prisma. Authentication gates the entire app (see
`docs/AUTH_SPEC.md`) and campaign progress is stored per-account in Postgres
instead of localStorage. Live game state during a match still lives in
Zustand on the client, replicated from the server's authoritative state —
that part of the architecture is unchanged.
Do not add further backend systems beyond auth/campaign-progress until explicitly requested.

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

Setup (first time):

npm install
cd server && npm install
Point `server/.env`'s `DATABASE_URL` at a local Postgres instance, then:
cd server && npx prisma migrate dev

Commands:

npm run dev:all   — runs the Vite frontend and the Express/Socket.io server together (recommended)
npm run dev       — frontend only
npm run dev:server — server only

Development URL:

http://localhost:5173 (frontend) — talks to the server on http://localhost:3001 via `VITE_SERVER_URL`

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

## Online PvP

Two human players over a network. Started via "⚔ Online PvP" on the title screen → routes to `LobbyScreen`.

`gameMode: 'pvp'`, `aiEnabled: false`, `isOnline: true` (in `onlineStore`)

The server (`server/`) holds authoritative `ServerGameState`. Clients are read-only replicas. All game actions go through `dispatch()` in `src/network/dispatch.ts` → `socket.emit('action', ...)` → server applies → broadcasts `state` event → `setFromServer()` in gameStore.

Turn timer: 3 minutes, server-enforced. Disconnect grace period: 60 seconds then forfeit.

Either player can forfeit early via the Quit button in `TurnPhaseBar.tsx` — but only on their own turn (`myPlayerId === activePlayer`); the button is hidden otherwise, and the server independently enforces the same rule in `handleQuit()`. Quitting emits `quit_room`, which the server resolves through the same `game_over { reason: 'forfeit' }` path used for disconnect-forfeit, declaring the opponent the winner immediately.

See `docs/MULTIPLAYER_SPEC.md` for full architecture details.

## Campaign

Single-player vs AI. 10 stages of increasing difficulty. Started via "Campaign" on the title screen.

`gameMode: 'campaign'`, `aiEnabled: true`

Player 2 is controlled by `useAiController` (hook). The AI difficulty and starting mana are set per stage via `CAMPAIGN_STAGES` in `src/constants/campaign.ts`.

`startCampaignMatch(aiStartingMana)` in gameStore sets up the campaign match — it gives player2 extra starting mana based on stage difficulty.

The human player (player1) controls the left panel. The AI panel is dimmed and non-interactive during player2's turn.

The Quit button (`TurnPhaseBar.tsx`) is always available in campaign mode (no opponent to protect against off-turn quitting). Confirming resets the game and returns to the title screen — no loss is recorded against campaign progress.

## Help

Static how-to-play screen. Accessed via "? How to Play" on the title screen.

`src/components/screens/HelpScreen.tsx` — full screen page covering: board layout diagram, all 7 turn phases with AUTO/YOU badges, monster roster with stats, combat & defense rules, board color guide, quick tips, and game mode descriptions.

Screenshot placeholder (`[ Game screenshot ]`) is present in the page — replace with `<img src="/assets/ui/screenshot.png" ... />` once the image is ready.

## Updates

Version history / roadmap screen. Accessed via "📋 Updates" on the title screen.

`src/components/screens/UpdatesScreen.tsx` — renders `UPDATE_HISTORY` from `src/constants/updates.ts` (newest first), each entry showing version, release date, and feature summary. Add a new entry here (do not overwrite the previous one) whenever the version bumps. See "Current Version" below for the authoritative version number.

---

# MVP Requirements

## Board

* 11 columns × 15 rows
* P1 base: single tile at row 14, col 5 (bottom center)
* P2 base: single tile at row 0, col 5 (top center)
* No starter path tiles — players must build from scratch each game
* Board is vertically centered in the viewport

## Base HP

Each player's base starts with 3 HP (`BASE_HP = 3` in `src/constants/board.ts`).
When a monster is on the enemy base tile and attacks it, the base takes damage.
A player loses when their base reaches 0 HP.

A successful base hit plays an orange flash + 🔥 burst on the base tile — see `BoardEffects.tsx` under Combat.

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

Dice are rendered by `DiceFace.tsx` — a custom component that draws pip positions as an SVG overlay on top of `/assets/dice/dice-background.png`. No pre-rendered face images are used.

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

`SidePanel.tsx` has two different "Done Actions" buttons — one in the general Monster Actions summary view, one in the per-monster action panel shown while a monster is selected — and both set the same `showEndConfirm` state. The confirmation dialog itself is rendered once, shared by both, so it appears correctly regardless of which view triggered it.

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

## Combat Feedback (Board Effects)

`src/components/board/BoardEffects.tsx` renders two transient animations, layered above the board grid:

* **Kill** — a monster's tile flashes red with a 💥 burst when it's removed from `monsters` without an accompanying base HP change.
* **Base hit** — a player's base tile flashes orange with a 🔥 burst when that player's `baseHp` decreases.

Both are detected by diffing `monsters`/`players` against the previous render (not by hooking store actions), because in online PvP the client never runs `attackTarget`/`moveMonster` locally — it only receives state broadcast from the server. Diffing the replicated state is the only trigger that works identically offline and online. Each effect auto-removes itself ~700ms after spawning. Animation keyframes (`lou-kill-flash`, `lou-kill-icon`, `lou-base-flash`, `lou-base-icon`) live in `src/index.css`.

---

# Movement

Directions: Up, Down, Left, Right. No diagonals.

Monsters can move on any path or base tile, regardless of owner.
Empty tiles block movement — a path network is required to advance.

To reach the enemy base, a player must build their path network
toward the opponent's side of the board. Monsters can then cross
into enemy-colored tiles once adjacent to them.

---

# Monster System

## Open Registry

`MonsterType` is `string` — not a closed union. Add entries to `MONSTER_TEMPLATES` in `src/constants/monsters.ts` to register new monsters. No type definitions need to change.

`MonsterTemplate` has an optional `skills?: string[]` field reserved for a future skill system.

## Starter Monsters

Slime
Cost: 1 | HP: 8 | ATK: 2 | DEF: 4 | MOVE: 1 | Range: 1

Goblin
Cost: 2 | HP: 5 | ATK: 5 | DEF: 2 | MOVE: 2 | Range: 1

Archer
Cost: 3 | HP: 4 | ATK: 4 | DEF: 1 | MOVE: 1 | Range: 2

Knight
Cost: 4 | HP: 12 | ATK: 4 | DEF: 6 | MOVE: 1 | Range: 1

Dragon
Cost: 7 | HP: 15 | ATK: 8 | DEF: 5 | MOVE: 2 | Range: 1

---

# Asset System

All game assets live under `public/assets/` and are served by Vite at `/assets/`.

## Board Tiles (`/assets/tiles/`)

| File | Used for |
|---|---|
| `grass.png` | Empty cells (the base terrain) |
| `path.png` | Path tiles (+ blue/red tint overlay for ownership) |
| `base-ally.png` | Player 1 base tile |
| `base-enemy.png` | Player 2 base tile |

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

| File | Used for |
|---|---|
| `dice-background.png` | Decorative border frame rendered behind SVG pips in `DiceFace.tsx` |

`DiceFace.tsx` renders the current roll by drawing pip positions as an inline SVG overlay on top of the background frame. No per-face image files are used.

## UI (`/assets/ui/`)

| File | Used for |
|---|---|
| `logo.png` | Title screen logo (background transparency removed via canvas at runtime) |
| `title-bg.svg` | Background used on ALL screens (TitleScreen, GameScreen, CampaignScreen, StageIntroScreen, LobbyScreen, HelpScreen, UpdatesScreen). GameScreen uses a heavier `bg-black/70` overlay; other screens use `bg-black/55`–`bg-black/60`. |

## Icons (`/assets/icons/`)

SVG icons used in the HUD panels: `attack.svg`, `defend.svg`, `move.svg`, `end-turn.svg`, `mana.svg`, `luck.svg`, `hp.svg`, `dice.svg`, `cost.svg`, `menu.svg`.

## Path Previews (`/assets/paths/`)

SVG shape previews (`straight.svg`, `t-shape.svg`, `cross.svg`, `corner.svg`, `z-shape.svg`, `end-cap.svg`). Path shapes are logic-defined; these files are available for UI card previews.

## Decorative Assets (`/assets/other/`)

Unused decorative SVGs (`bush.svg`, `tree.svg`, `rock.svg`, `bridge.svg`, `banner-ally.svg`, `banner-enemy.svg`, `treasure-chest.svg`) reserved for future map/UI polish.

## PNG vs SVG preference

Use PNG for repeated game-board tiles and monster sprites — browsers cache and GPU-blit PNGs efficiently. Use SVG for scalable UI elements (icons, title background). The dice face is rendered procedurally via `DiceFace.tsx`, not as per-value image files.

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
| Monster killed | Red flash + 💥 burst on its tile (`BoardEffects.tsx`) |
| Base hit | Orange flash + 🔥 burst on the base tile (`BoardEffects.tsx`) |

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

Screen flow managed by `campaignStore` (`AppScreen` type: `'title' | 'campaign-select' | 'campaign-intro' | 'lobby' | 'help' | 'updates'`):

```
title → help                                        (? How to Play button)
title → updates                                     (📋 Updates button)
title → campaign-select → campaign-intro → game → (result overlay)
title → lobby                                       (Online PvP button)
```

`gameStarted` flag in gameStore overrides the campaignStore screen — a live game always renders `GameScreen` regardless of `screen`.

## Stage Definition

Each stage has: `name`, `description`, `difficulty`, `aiStartingMana`, `intro`, `victoryOutro`, `defeatOutro`.

Difficulty ramp: stages 1–2 = `idle`, 3–4 = `easy`, 5–6 = `medium`, 7–10 = `hard`.
`aiStartingMana` ranges from 3 (stage 1) to 6 (stage 10), giving harder-stage AI more resources at game start.

## AI Controller

`src/game/useAiController.ts` — React hook that drives player2's turns automatically.
Difficulty levels: `idle` | `easy` | `medium` | `hard`.

* `idle` — essentially passive; used for tutorial stages 1–2 so the player can learn freely.
* `easy` — acts randomly ~38% of the time; picks cheapest summon.
* `medium` — spends luck when it unlocks a path match; picks summons by offensive power.
* `hard` — never skips; optimizes every decision (path row score, damage/kill ratio, shield-break targeting).

`AiDriver` component in `GameScreen.tsx` mounts the hook. It renders nothing and is only mounted when `aiEnabled === true`.

## Result Overlays

* Campaign win → Next Stage button (if stages remain) or "Campaign Complete" message
* Campaign loss → Retry Stage button
* PvP win → Main Menu button

---

# Network Layer (Online PvP)

## Shared Types

`shared/types.ts` — single source of truth for all types used by both frontend and server: `PlayerId`, `GameMode`, `TurnPhase`, `Player`, `Coord`, `CellType`, `Cell`, `PathShapeName`, `PathShape`, `PathOption`, `MonsterState`, `MonsterType`, `MonsterAction`, `Monster`, `GameAction`, `MonsterTemplate`, `AbilityKind`, `AbilityDefinition`.

Frontend type files (`src/types/board.ts`, `src/types/game.ts`, `src/types/monster.ts`) re-export from `shared/types.ts` and keep only their local additions (`GameState` in game.ts).

Server type file (`server/game/types.ts`) re-exports from `shared/types.ts` and keeps only `ServerGameState`.

## Shared Runtime Files

The client/server duplication this project used to have for game-logic files (each side hand-copying the other, marked `// Shared with X — keep in sync`) is gone — those files now live once under `shared/` (a plain top-level directory, not an npm package) and both sides import them via relative paths, exactly like `shared/types.ts` above:

- `shared/dice.ts`, `shared/constants.ts`, `shared/economy.ts`, `shared/abilities.ts`, `shared/movement.ts`, `shared/combat.ts`, `shared/paths.ts`.
- Each side's local file (`src/game/*.ts` / `src/constants/*.ts` vs `server/game/*.ts`) is now a thin re-export, keeping only what's genuinely local to that side — e.g. `CELL_SIZE_PX` (client-only rendering constant) in `src/constants/board.ts`; `MONSTER_TYPE_ORDER`/`SHOP_MONSTER_TYPES`/`ALL_MONSTER_TYPES` curation lists in `src/constants/monsters.ts`; `ABILITY_DESCRIPTIONS`/`getMonsterSkillId()` display helpers in `src/constants/abilities.ts`; `coordKey`/`getAbilityTargets` (client-only ability-target enumeration for UI highlighting) in `src/game/movement.ts`.
- `server/game/paths.ts`'s `generatePaths` is intentionally stateless (`(startId) => { paths, nextId }`, threaded through `ServerGameState.nextPathId` / the client's `GameState.nextPathId`) rather than a module-level counter — required for correctness across concurrent PvP rooms server-side, and the client was migrated to match so there's exactly one implementation.

**Important — verifying changes to any `shared/*.ts` runtime file:** don't rely on `npm run dev:all` alone. The server dev script (`tsx watch`) transpiles TS on the fly and does not reproduce `tsc`'s real compile/emit behavior. This project has twice broken on Render from exactly this class of gap (an ESM/CommonJS module-resolution mismatch, then a missing `rootDir` when `shared/types.ts` was first introduced — both invisible in local dev, only surfacing in the real build). Always also run `cd server && npm run build && npm start` (the same commands Render's `buildCommand`/`startCommand` use) and confirm the compiled server boots without `MODULE_NOT_FOUND` errors before trusting a change to a shared runtime file.

## Files

| File | Role |
|---|---|
| `shared/types.ts` | Single source of truth for types shared between server and frontend |
| `src/network/actions.ts` | `GameAction` discriminated union — re-exported from `shared/types.ts`; `monsterType` is `string` (open registry) |
| `src/network/socket.ts` | Socket.io singleton. `getSocket()` lazily creates the socket; `connectSocket()` / `disconnectSocket()` manage lifecycle. Attaches all server event handlers. |
| `src/network/dispatch.ts` | Unified action entry point. Online: `emitAction()` → server. Offline (campaign / local): applies action directly to gameStore. |

## Action Flow

```
Player input → dispatch(action)
  ├── isOnline: true  → emitAction() → socket.emit('action') → server → broadcast 'state'
  │                                                              ↓
  │                                                    setFromServer() → gameStore
  └── isOnline: false → gameStore method directly
```

## Key Server Events

| Event | Direction | Handler |
|---|---|---|
| `state` | server → client | `setFromServer()` — merges server state, preserves client-only UI fields within same turn |
| `match_start` | server → client | Sets game started, stores opponent nickname |
| `timer` | server → client | Updates `turnTimeLeft` in onlineStore |
| `room_created` / `room_joined` | server → client | Stores room code + player ID |
| `opponent_disconnected` | server → client | Shows `DisconnectOverlay` with forfeit countdown |
| `game_over` | server → client | Sets winner (forfeit case) |
| `reconnect_room` | client → server | Sent automatically on reconnect if `lou_room_code` + `lou_session` exist in localStorage |
| `quit_room` | client → server | Sent by `emitQuit()` when the active player clicks Quit; server only honors it if the sender is the current `activePlayer`, then immediately emits `game_over { reason: 'forfeit' }` |

## ServerBroadcastState

`ServerBroadcastState = Omit<GameState, 'selectedPathId' | 'selectedPathRotation' | 'selectedMonsterId' | 'selectedMonsterTemplateType' | 'inspectedMonsterId' | 'pendingAttackTargetId'>`

The server never touches client-only UI selection fields. `setFromServer()` in gameStore resets them on turn change, preserves them within the same turn.

## onlineStore (`src/store/onlineStore.ts`)

Zustand store for all online-specific state. Fields:

| Field | Type | Purpose |
|---|---|---|
| `isOnline` | boolean | Whether the current game is networked |
| `myPlayerId` | `PlayerId \| null` | Which seat this client occupies |
| `myNickname` / `opponentNickname` | string | Display names |
| `roomCode` | `string \| null` | 6-char room code |
| `lobbyStatus` | `'idle' \| 'creating' \| 'waiting' \| 'joining'` | Lobby UI state machine |
| `turnTimeLeft` | `number \| null` | Seconds remaining, from server timer event |
| `opponentDisconnected` | boolean | Triggers `DisconnectOverlay` |
| `forfeitCountdown` | `number \| null` | Seconds until opponent forfeits |
| `connectionStatus` | `'disconnected' \| 'connecting' \| 'connected' \| 'reconnecting'` | Socket health |

`reset()` clears all state and removes `lou_room_code` from localStorage (but preserves `lou_nickname`).

## localStorage Keys

| Key | Purpose |
|---|---|
| `lou_nickname` | Mirrors the authenticated account's `displayName` into `onlineStore` for PvP; no longer user-editable (the nickname input was removed from `LobbyScreen` once login replaced it) |
| `lou_room_code` | Current room code — used to auto-rejoin on reconnect |
| `lou_session` | UUID session token — used for mid-match reconnect (`reconnect_room`), separate from account login |

Campaign progress (`highestUnlocked`) no longer lives in localStorage — it's stored per-account in Postgres (`CampaignProgress` model) and synced via `/auth/me` and `PUT /campaign-progress`. See `docs/AUTH_SPEC.md`.

The refresh token is **not** a localStorage key — it's a server-set httpOnly cookie (`lou_refresh`), invisible to client JS.

## UI Components

**`TurnTimer.tsx`** — Displays the server-synced turn countdown in the SidePanel. Amber at ≤30s, red + pulse at ≤10s. Returns `null` when `secondsLeft` is null (offline modes).

**`DisconnectOverlay.tsx`** — Full-screen overlay shown when `opponentDisconnected` is true. Displays a countdown to forfeit. Rendered inside `GameScreen`.

**`LobbyScreen.tsx`** — Create Room / Join Room UI. Emits `create_room` or `join_room` to the server with nickname and session token. Displays the room code for the host to share. Handles the connecting → waiting state transition.

**`TurnPhaseBar.tsx`** — Also renders the Quit button (right side of the turn bar) and its confirmation dialog. In online PvP the button is only shown when it's the local player's turn; confirming calls `emitQuit()`. In offline/campaign modes it's always shown; confirming resets the game and returns to the title screen.

---

# Development Priorities

Priority 1 — Playable Match ✅ (complete)

Priority 2 — Basic AI ✅ (complete)

Priority 3 — Campaign ✅ (complete)

Priority 4 — Save System ✅ (complete — account auth + Postgres-backed campaign progress, see `docs/AUTH_SPEC.md`)

Priority 5 — Online Multiplayer ✅ (complete)

---

# Author

Junie Lorenzo — junie.lorenzo@gmail.com

Credit displayed as a mailto link on the TitleScreen.

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

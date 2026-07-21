# Legend of Ultima

Legend of Ultima is a turn-based tactical strategy game combining dice mechanics, path building, monster summoning, and board-game-style combat.

Players construct magical path networks across the battlefield, summon monsters using mana, and attempt to breach the enemy base three times while defending their own.

---

# Current Status

**Version 0.3.0 (Alpha)**

Campaign mode and Online PvP are fully playable. 10-stage single-player campaign with progressive AI difficulty. Two-player online matches via room codes. An account is required to play — Campaign, Online PvP, Help, and Updates are all gated behind login, and campaign progress is saved per-account in PostgreSQL instead of `localStorage`. See `docs/AUTH_SPEC.md` for details.

Players also earn Gold from match wins/losses (Campaign and PvP) and spend it in a Shop to permanently unlock two new monsters — White Mage and Black Mage, each with a one-shot board ability (create/destroy a path tile). A Loadout screen lets the player pick 5 active monsters from everything they own, shared between Campaign and PvP. See `docs/SHOP_ECONOMY_SPEC.md` and `docs/MONSTER_ABILITIES_SPEC.md` for details.

---

# How to Play

## Objective

Reduce the enemy base HP from 3 to 0.

A monster standing on the enemy base tile can attack it like any other target, dealing damage on confirm.

## Turn Structure

Each turn has 7 phases:

1. **Generate Mana** — automatic (+1 mana)
2. **Generate Paths** — automatic (3 random path cards)
3. **Roll Dice** — roll 1d6
4. **Place Path** — select a path card matching the dice roll and place it on the board; spend Luck here to adjust the roll ±1
5. **Summon Monster** — spend mana to summon monsters onto your path network
6. **Monster Actions** — move and fight with every monster
7. **End Turn** — confirm end, switch active player

## Monster Actions (2-Step)

Each monster takes two steps per turn:

**Step 1 — Move or Stay**
Click a green-highlighted cell to move, or click "Stay" to hold position.

**Step 2 — Combat**
Click an orange-highlighted enemy (with ⚔ icon) to see an attack preview, then confirm. Or choose Defend (🛡) to raise your shield. Or Skip.

All monsters must complete both steps before ending the Actions phase.

## Path Building

Paths are the only way monsters can travel. Build toward the enemy to advance.

Monsters can cross onto any path tile — including enemy-colored tiles — once they reach them.

## Luck

Gain 1 Luck when no path matches the dice roll.

Spend 3 Luck during Place Path to adjust the result by +1 or −1.

---

# Monsters

| Monster | Cost | HP | ATK | DEF | MOVE | Range |
|---|---|---|---|---|---|---|
| Slime | 1 | 8 | 2 | 4 | 1 | 1 |
| Goblin | 2 | 5 | 5 | 2 | 2 | 1 |
| Archer | 3 | 4 | 4 | 1 | 1 | 2 |
| Knight | 4 | 10 | 4 | 6 | 1 | 1 |
| Dragon | 7 | 12 | 8 | 5 | 2 | 1 |
| White Mage *(Shop)* | 3 | 3 | 3 | 1 | 1 | 2 |
| Black Mage *(Shop)* | 3 | 3 | 3 | 1 | 1 | 2 |

Slime through Dragon are free starters. White Mage (`create_path`) and Black Mage (`destroy_path`) are purchased with Gold in the Shop and must be added to your Loadout before they're summonable.

Dragon deals splash damage — enemies orthogonally adjacent to its target take 50% of its ATK too.

## Defending State

When a monster Defends, it raises a DEF shield (cyan bar on token).

Incoming attacks chip the shield. When the shield reaches 0, the monster returns to Idle.

This means defenders can be worn down — they cannot hold forever.

## Monster Inspector

Click any monster on the board to see its full stats in a detail panel.

---

# Getting Started

**First-time setup:**

```
npm install
cd server && npm install
```

Point `server/.env`'s `DATABASE_URL` at a local Postgres instance, then:

```
cd server && npx prisma migrate dev
```

**Run frontend + server together (recommended):**

```
npm run dev:all
```

Frontend opens at http://localhost:5173 and talks to the server at http://localhost:3001 (`VITE_SERVER_URL`).

**Or run them separately:**

```
npm run dev         # frontend only
npm run dev:server  # server only
```

The server (accounts, campaign progress, Online PvP) must be running — the app is unusable without it since login is required.

---

# Tech Stack

| Layer | Technology |
|---|---|
| UI | React + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Server | Node.js + Express + Socket.io (Online PvP, authoritative game state) |
| Database | PostgreSQL via Prisma (accounts, campaign progress) |
| Auth | JWT access tokens + httpOnly-cookie refresh tokens |
| Hosting | Render |

---

# Project Structure

```
shared/
└── types.ts             # Single source of truth — types used by both FE and server

src/
├── types/
│   ├── game.ts          # GameState + re-exports from shared/types
│   ├── board.ts         # Re-exports from shared/types
│   └── monster.ts       # MonsterTemplate (FE-only) + re-exports from shared/types
├── constants/
│   ├── board.ts         # Board dimensions, base coords, mana/luck constants
│   ├── monsters.ts      # Monster stat templates (open registry — MonsterType is string)
│   └── paths.ts         # Path shape definitions (6 shapes)
├── game/
│   ├── init.ts          # createInitialBoard(), createInitialGameState()
│   ├── dice.ts          # rollD6()
│   ├── paths.ts         # generatePaths(), getPathCells(), validatePathPlacement()
│   ├── movement.ts      # getReachableCells(), getConnectedFriendlyPath()
│   ├── combat.ts        # resolveCombat(), getAttackTargets()
│   ├── ai.ts            # AI decision functions (path, summon, move, attack)
│   └── useAiController.ts  # React hook — drives player2 turns in campaign mode
├── network/
│   ├── actions.ts       # GameAction discriminated union (re-exported from shared/types)
│   ├── dispatch.ts      # Routes actions: online → socket, offline → gameStore
│   ├── socket.ts        # Socket.io singleton + all server event handlers
│   └── authClient.ts    # Fetch wrapper for /auth/* + /campaign-progress, access-token refresh
├── store/
│   ├── gameStore.ts     # All game state and mutations; setFromServer() for online
│   ├── campaignStore.ts # Screen routing (title/campaign/lobby/help/updates/login/signup)
│   ├── onlineStore.ts   # Online-only state (isOnline, myPlayerId, timer, etc.)
│   └── authStore.ts     # Access token (in memory), logged-in user, login/signup/logout
└── components/
    ├── screens/
    │   ├── SplashScreen.tsx      # Boot-time auth check before routing to title/login
    │   ├── LoginScreen.tsx       # Email/password login
    │   ├── SignupScreen.tsx      # Account creation
    │   ├── TitleScreen.tsx       # Main menu with author credit
    │   ├── GameScreen.tsx        # In-game layout (sidepanels + board + log)
    │   ├── CampaignScreen.tsx    # Stage select grid
    │   ├── StageIntroScreen.tsx  # Pre-match story/intro
    │   ├── LobbyScreen.tsx       # Online PvP room create/join
    │   ├── HelpScreen.tsx        # How to play
    │   └── UpdatesScreen.tsx     # Version history
    ├── board/
    │   ├── Board.tsx             # 11×15 grid, click/hover handling
    │   ├── Cell.tsx              # Individual cell with highlight states
    │   ├── MonsterToken.tsx      # Token with HP bar, DEF bar, state icons
    │   └── MonsterInspector.tsx  # Floating detail panel on click
    ├── hud/
    │   ├── SidePanel.tsx         # Per-player panel with all phase controls
    │   ├── TurnPhaseBar.tsx      # Phase strip + active player indicator
    │   ├── DiceFace.tsx          # SVG pip renderer on dice-background.png
    │   └── TurnTimer.tsx         # Server-synced countdown (online only)
    └── overlays/
        └── DisconnectOverlay.tsx # Opponent disconnected + forfeit countdown

server/
├── index.ts             # Express + Socket.io setup, /health endpoint, mounts auth/campaign routes
├── auth.ts              # /auth/signup, /auth/login, /auth/refresh, /auth/logout, /auth/me
├── authMiddleware.ts    # requireAuth — verifies JWT for REST routes and Socket.io handshake
├── campaign.ts          # PUT /campaign-progress (Postgres-backed highestUnlocked)
├── tokens.ts            # Access/refresh token issuing, hashing, rotation
├── db.ts                # Prisma client singleton
├── prisma/
│   └── schema.prisma    # User, Credential, Identity, RefreshToken, CampaignProgress models
├── rooms.ts             # Room lifecycle, turn timer, forfeit, reconnect
└── game/
    ├── types.ts         # ServerGameState + re-exports from shared/types
    ├── constants.ts     # Board/game constants (mirrored from src/constants)
    ├── apply.ts         # applyAction() + runEndTurnAndAutoPhases() — pure functions
    ├── combat.ts        # resolveCombat(), getAttackTargets()
    ├── movement.ts      # getConnectedFriendlyPath(), getReachableCells()
    ├── paths.ts         # generatePaths(startId), getPathCells(), validatePathPlacement()
    ├── dice.ts          # rollD6()
    └── init.ts          # createInitialMatchState() (starts at rollDice phase)
```

---

# Documentation

| File | Contents |
|---|---|
| GDD.md | Full game rules, combat, path, monster, and board design |
| CLAUDE.md | Technical architecture, coding rules, AI development guide |
| docs/AUTH_SPEC.md | Account auth + PostgreSQL technical spec (data model, endpoints, token lifecycle) |
| docs/MULTIPLAYER_SPEC.md | Online PvP architecture (rooms, actions, reconnect, forfeit) |
| docs/SHOP_ECONOMY_SPEC.md | Gold economy, Shop, and Loadout technical spec |
| docs/MONSTER_ABILITIES_SPEC.md | White Mage / Black Mage ability design and implementation spec |
| README.md | This file — setup, gameplay overview, project structure |

---

# Development Roadmap

| Priority | Feature | Status |
|---|---|---|
| 1 | Playable Local Match | ✅ Complete |
| 2 | Basic AI | ✅ Complete |
| 3 | Campaign (10 stages) | ✅ Complete |
| 4 | Save System (account auth + Postgres campaign progress) | ✅ Complete |
| 5 | Online Multiplayer | ✅ Complete |

---

# Design Philosophy

Depth through simplicity.

Strategic decisions come from:

* **Path Placement** — where you build shapes the battlefield
* **Positioning** — which tiles you control determines reach
* **Resource Management** — mana, luck, and monster count tradeoffs
* **Tactical Combat** — 2-step actions, attack previews, shield timing

Avoid complexity (skill trees, equipment, status effects) until the core loop is proven fun.

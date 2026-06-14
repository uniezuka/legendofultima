# Legend of Ultima

Legend of Ultima is a turn-based tactical strategy game combining dice mechanics, path building, monster summoning, and board-game-style combat.

Players construct magical path networks across the battlefield, summon monsters using mana, and attempt to breach the enemy base three times while defending their own.

---

# Current Status

**MVP Prototype — Playable**

Version: 0.3

A fully playable local 2-player prototype runs in the browser.
No backend or authentication is required.

---

# How to Play

## Objective

Reduce the enemy base HP from 3 to 0.

A monster that steps onto the enemy base tile deals 1 damage and is removed.

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
| Knight | 4 | 12 | 4 | 6 | 1 | 1 |
| Dragon | 7 | 15 | 8 | 5 | 2 | 1 |

## Defending State

When a monster Defends, it raises a DEF shield (cyan bar on token).

Incoming attacks chip the shield. When the shield reaches 0, the monster returns to Idle.

This means defenders can be worn down — they cannot hold forever.

## Monster Inspector

Click any monster on the board to see its full stats in a detail panel.

---

# Getting Started

```
npm install
npm run dev
```

Opens at: http://localhost:5173

---

# Tech Stack

| Layer | Technology |
|---|---|
| UI | React + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Backend | None (MVP is browser-only) |

---

# Project Structure

```
src/
├── types/
│   ├── game.ts          # GameState, Player, TurnPhase, PlayerId
│   ├── board.ts         # Cell, Coord, PathOption, PathShape
│   └── monster.ts       # Monster, MonsterTemplate, MonsterState, MonsterType
├── constants/
│   ├── board.ts         # Board dimensions, base coords, mana/luck constants
│   ├── monsters.ts      # Monster stat templates
│   └── paths.ts         # Path shape definitions (6 shapes)
├── game/
│   ├── init.ts          # createInitialBoard(), createInitialGameState()
│   ├── dice.ts          # rollD6()
│   ├── paths.ts         # generatePaths(), getPathCells(), validatePathPlacement()
│   ├── movement.ts      # getReachableCells(), getConnectedFriendlyPath()
│   └── combat.ts        # resolveCombat(), getAttackTargets()
├── store/
│   └── gameStore.ts     # Zustand store — all game state and actions
└── components/
    ├── screens/
    │   ├── TitleScreen.tsx
    │   └── GameScreen.tsx
    ├── board/
    │   ├── Board.tsx          # 11×15 grid, click/hover handling
    │   ├── Cell.tsx           # Individual cell with highlight states
    │   ├── MonsterToken.tsx   # Token with HP bar, DEF bar, state icons
    │   └── MonsterInspector.tsx # Floating detail panel on click
    └── hud/
        ├── SidePanel.tsx      # Per-player panel with all phase controls
        └── TurnPhaseBar.tsx   # Phase strip + active player indicator
```

---

# Documentation

| File | Contents |
|---|---|
| GDD.md | Full game rules, combat, path, monster, and board design |
| CLAUDE.md | Technical architecture, coding rules, AI development guide |
| README.md | This file — setup, gameplay overview, project structure |

---

# Development Roadmap

| Priority | Feature | Status |
|---|---|---|
| 1 | Playable Local Match | ✅ Complete |
| 2 | Basic AI | Planned |
| 3 | Campaign (10 stages) | Planned |
| 4 | Save System | Planned |
| 5 | Online Multiplayer | Planned |

---

# Design Philosophy

Depth through simplicity.

Strategic decisions come from:

* **Path Placement** — where you build shapes the battlefield
* **Positioning** — which tiles you control determines reach
* **Resource Management** — mana, luck, and monster count tradeoffs
* **Tactical Combat** — 2-step actions, attack previews, shield timing

Avoid complexity (skill trees, equipment, status effects) until the core loop is proven fun.

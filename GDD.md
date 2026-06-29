# LEGEND OF ULTIMA

## Game Design Document (GDD) v1.0

---

# Genre

Turn-Based Tactical Strategy Board Game

---

# Platform

Web Browser (Desktop First)

---

# Game Modes

## Available

* **Campaign** — 10-stage single-player vs AI. Progressive difficulty ramp (idle → easy → medium → hard). Stages unlock as the player wins.
* **Online PvP** — Two human players over a network via 6-character room code. Authoritative server, 3-minute turn timer, reconnect support.

## Future

* 2v2 Battles
* Ranked Play

---

# Core Concept

Players construct magical paths across the battlefield using dice rolls and path pieces.

Monsters move along path networks — including enemy-colored paths once reached.

The objective is to breach the enemy base three times while protecting your own.

---

# Victory Conditions

Base HP: 3

When an enemy monster steps onto the enemy base tile:

* Base HP −1
* Monster is removed from the board

When Base HP reaches 0: Defeat

---

# Board

Size: 11 columns × 15 rows

Bases:

* P2 base: single tile — row 0, col 5 (top center)
* P1 base: single tile — row 14, col 5 (bottom center)

No starter path tiles are placed at game start.
Players must build their path networks from the base outward each game.

---

# Turn Sequence

1. Generate Mana (automatic)
2. Generate Path Choices (automatic)
3. Roll Dice (player action)
4. Place Path (player action)
5. Summon Monster (player action)
6. Monster Actions (player action)
7. End Turn (player action)

---

# Mana System

Starting Mana: 3

Each turn: +1 Mana

Unused Mana carries over between turns.

---

# Luck System

Gain: +1 Luck whenever no available path matches the dice roll.

Spend: 3 Luck to modify the current dice result by +1 or −1.

Luck is spent during the Place Path phase (Phase 4), not during Roll Dice (Phase 3).
This allows the player to see the available paths before deciding to adjust.

Multiple adjustments can be made as long as the player has enough Luck (3 per use).

---

# Path System

Every turn: Generate 3 random path pieces.

Each path contains:

* Shape
* Cost (1–6)

Available shapes:

* I Shape (3 cells linear)
* L Shape (4 cells)
* T Shape (4 cells)
* Cross Shape (5 cells)
* Corner Shape (3 cells)
* S Shape (4 cells)

Player rolls 1d6.

A path may only be selected when: Path Cost == Dice Roll (exact match required).

If no match exists:

* Skip path placement
* Gain 1 Luck

Path Placement:

* Select a matching path card from the side panel
* Hover the board to see a ghost preview (yellow = valid, red = invalid)
* Rotate using the Rotate button (90° increments)
* Click to place

Path Rules:

* Must connect to an existing friendly path or friendly base
* Cannot overwrite existing tiles
* Permanent — cannot be destroyed (MVP)

---

# Monster Cap

Maximum Monsters Per Player: 8

Maximum Monsters On Board: 16

---

# Monster States

## Summoning

Monster was summoned this turn.

Cannot perform actions.

Displayed with 💤 icon.

Automatically transitions to Idle at the start of the next turn.

---

## Idle

Default state. Vulnerable — takes full ATK damage when attacked.

Available for the 2-step action sequence each turn.

---

## Defending

Active shield state. Displayed with 🛡 icon and a cyan DEF bar.

Uses a DEF shield pool (currentDef) during combat — see DEF Shield System.

Cannot Defend twice consecutively.
Must complete a Move or Attack action step before Defending again.

---

# Monster Action System (2-Step Per Turn)

Each non-summoning monster must complete a 2-step sequence per turn.

**Step 1 — Movement:**

* Move to any reachable cell (highlighted green), OR
* Stay in place (skip move)

After step 1, the monster remains selected for step 2.

**Step 2 — Combat:**

* Attack an enemy in range (highlighted orange with ⚔ icon), OR
* Defend (enter Defending state, reset DEF shield to full), OR
* Skip combat

The monster is fully done after step 2.

**Rules:**

* All non-summoning monsters must complete both steps before the active player can end the Actions phase.
* If a monster has no valid options in a step, that step may be freely skipped.
* After a successful attack, the attacker returns to Idle state.

---

# DEF Shield System

When a monster enters Defending state, its shield resets to full:

currentDef = def

When a defending monster is attacked (using attacker's ATK):

| Condition | Result |
|---|---|
| ATK > currentDef | Defender takes (ATK − currentDef) HP damage; currentDef = 0; defender → Idle |
| ATK < currentDef | Attacker takes (currentDef − ATK) HP damage; currentDef −= ATK; if 0 → Idle |
| ATK == currentDef | No HP damage; currentDef = 0; defender → Idle |

The cyan bar on a defending monster's token represents the remaining currentDef.

When the shield breaks (currentDef = 0), the monster automatically returns to Idle.
This prevents permanent turtling — defenders can always be worn down over multiple attacks.

---

# Attack Preview

Before an attack is executed, clicking an orange-highlighted enemy shows a preview:

* Attacker stats vs defender stats
* Expected HP changes for both sides
* Whether the defender's shield will break and go Idle
* Confirm Attack button (executes the attack)
* Cancel button (returns to normal step 2 options)

The attack only fires after explicit confirmation.

---

# Monster Inspector

Clicking any monster on the board (any phase, any player) opens an info panel showing:

* Type and owner
* Current state (Summoning / Idle / Defending)
* HP bar with current/max values
* Shield bar with current/max values (only when Defending)
* ATK, DEF, MOVE, RANGE stats
* Board coordinates

The panel is dismissed by clicking empty board space, pressing ✕, or when the turn changes.

---

# Movement

Directions: Up, Down, Left, Right. No diagonals.

Movement range is determined by the monster's MOVE stat.

Monsters can move on any path or base tile, regardless of tile owner.
Empty tiles are impassable — a path network is required to travel.

Strategic implication: players must build their path network toward the opponent.
Once a monster reaches enemy-colored territory, it can traverse those tiles too.

---

# Combat Summary

| Target State | Effect |
|---|---|
| Idle | Target takes ATK damage |
| Defending | DEF shield absorbs; see DEF Shield System |

After combat: attacker becomes Idle.

If a monster's HP reaches 0, it is removed from the board and a death entry appears in the action log.

---

# Base Rules

Base HP: 3

When a monster steps onto the enemy base tile:

* Base HP −1
* Monster is removed

Bases cannot attack or defend.

---

# Starter Monsters

## Slime

Cost: 1

HP: 8 | ATK: 2 | DEF: 4 | MOVE: 1

Role: Defender — tough, cheap, good shield value

---

## Goblin

Cost: 2

HP: 5 | ATK: 5 | DEF: 2 | MOVE: 2

Role: Fast Attacker — high ATK, fragile, fast mover

---

## Archer

Cost: 3

HP: 4 | ATK: 4 | DEF: 1 | MOVE: 1 | RANGE: 2

Special: Can attack targets up to 2 tiles away (Manhattan distance ≤ 2)

Role: Ranged Unit — attacks without entering enemy range

---

## Knight

Cost: 4

HP: 12 | ATK: 4 | DEF: 6 | MOVE: 1

Role: Tank — high HP and shield value, slow

---

## Dragon

Cost: 7

HP: 15 | ATK: 8 | DEF: 5 | MOVE: 2

Role: Late Game Power Unit — shatters any shield in one hit

---

# Visual Reference

| Token Display | Meaning |
|---|---|
| 💤 under name | Summoning — cannot act |
| 🛡 under name | Defending |
| Green HP bar | HP > 60% |
| Yellow HP bar | HP 30–60% |
| Red HP bar | HP < 30% |
| Cyan DEF bar | Shield remaining (only when Defending) |
| White glow ring | Selected for action |
| Amber ring | Monster still needs to act this turn |

---

# Action Log

Displays the last 5 events during gameplay.

Events logged:

* Mana generation
* Dice rolls
* Luck changes (spend/gain)
* Path placement or skip
* Monster summons
* Monster movement
* Combat results (damage, shield chip, shield break)
* Monster death (💀 destroyed)
* Turn transitions

---

# Campaign

Total Stages: 10

Difficulty ramp:
- Stages 1–2: `idle` (AI is essentially passive — tutorial pacing)
- Stages 3–4: `easy` (~38% action rate, cheapest summon)
- Stages 5–6: `medium` (luck-aware path selection, offensive summon priority)
- Stages 7–10: `hard` (full optimization: path row score, damage/kill ratio, shield-break targeting)

AI starting mana scales from 3 (stage 1) to 6 (stage 10), giving harder stages a resource advantage.

Stage names: The Awakening, Forest of Echoes, The Broken Bridge, Fortress of Iron, Desert of Lost Dice, Temple of the First Path, Kingdom of Shadows, Dragon's Peak, The Fallen Pathbinder, Legend of Ultima.

---

# Monster System

Monster types are an open registry — `MonsterType = string`. Add a new entry to `MONSTER_TEMPLATES` in `src/constants/monsters.ts` to register a new monster. No closed union to update.

All 5 starter monsters are available from the start in v1.0 (no unlock progression yet).

`MonsterTemplate.skills?: string[]` is reserved for a future skill system.

---

# Data Storage

Campaign and local matches run entirely in browser memory (Zustand + localStorage).

Online PvP requires the Node.js server. Room state is in-memory on the server — no database needed for MVP.

Database integration planned for:

* Save Files
* User Accounts
* Ranked Play

---

# Future Features

* Gold Economy
* Monster Collection and Purchases
* Monster Evolution
* Additional Monsters and Abilities
* Path Destruction
* 2v2 Battles
* Ranked Play

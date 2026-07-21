# Legend of Ultima
## Campaign Design v1.0

---

# Campaign Overview

The single-player campaign consists of 10 stages (chapters). The player fights the AI across all 10 stages with increasing difficulty.

The campaign serves as both the single-player mode and an extended tutorial for the game mechanics.

## Implementation Status (v1.0)

**Implemented:**
- 10 stages defined in `src/constants/campaign.ts` (`CAMPAIGN_STAGES[]`)
- AI difficulty ramp: stages 1–2 = `idle`, 3–4 = `easy`, 5–6 = `medium`, 7–10 = `hard`
- AI starting mana scales from 3 (stage 1) to 6 (stage 10)
- Stage unlock tracked per-account in Postgres (`CampaignProgress` model), synced via `/auth/me` and `PUT /campaign-progress` — see `docs/AUTH_SPEC.md`
- Per-stage intro text, victory outro, and defeat outro
- Win → advance to next stage; loss → retry current stage

**Not yet implemented (original design goals):**
- Monster unlock progression — all 5 monsters are available from stage 1 in v1.0
- Chapter-specific story events or special rules
- Boss encounter mechanics distinct from normal matches

---

# Monster Unlock Progression (Original Design — Not Active in v1.0)

The original design locked monsters behind chapter completions. This is documented here for future implementation.

Planned unlock schedule:

| Chapter Completed | Unlock |
|------------------|----------|
| Start Game | Slime |
| Chapter 1 | Goblin |
| Chapter 2 | Archer |
| Chapter 3 | Knight |
| Chapter 4 | Dragon |

After Chapter 4, the player would have access to the full starter roster.

In v1.0, all 5 monsters are available from the start of any campaign stage.

**Note:** the chapter-unlock idea above has been superseded by a different mechanism — a Gold-based Shop where the player purchases new monsters (White Mage, Black Mage) and picks 5 active monsters via a Loadout screen, shared between Campaign and PvP. See `docs/SHOP_ECONOMY_SPEC.md` (status: implemented). Under that design, the player's campaign roster is always their current loadout — never randomized or restricted per stage — and the AI opponent's monster access is unaffected by any of this.

---

# Starter Monster Roster

## Slime

Cost: 1

HP: 8
ATK: 2
DEF: 4
MOVE: 1

Role:
Defender

Available:
Start of Game

---

## Goblin

Cost: 2

HP: 5
ATK: 5
DEF: 2
MOVE: 2

Role:
Fast Attacker

Unlocked:
Chapter 1 Completion

---

## Archer

Cost: 3

HP: 4
ATK: 4
DEF: 1
MOVE: 1

Range:
2

Role:
Ranged Unit

Unlocked:
Chapter 2 Completion

---

## Knight

Cost: 4

HP: 10
ATK: 4
DEF: 6
MOVE: 1

Role:
Tank

Unlocked:
Chapter 3 Completion

---

## Dragon

Cost: 7

HP: 12
ATK: 8
DEF: 5
MOVE: 2

Role:
Late Game Power Unit

Unlocked:
Chapter 4 Completion

---

# Chapter Structure

Total Chapters:

10

---

# Chapter 1 - The Awakening

Region:
Forgotten Village

Story:

The player discovers the Die of Origins after a monster attack.

An elderly Pathbinder teaches the fundamentals of path creation and monster summoning.

Gameplay Focus:

- Basic Movement
- Basic Combat
- Mana System

Boss:

Wild Goblin Chief

Reward:

Goblin Unlocked

---

# Chapter 2 - Forest of Echoes

Region:
Ancient Forest

Story:

The player enters a corrupted forest while searching for answers about the Die of Origins.

Gameplay Focus:

- Path Placement
- Territory Expansion
- Faster Units

Boss:

Corrupted Treant

Reward:

Archer Unlocked

---

# Chapter 3 - The Broken Bridge

Region:
Sky Ravine

Story:

The player encounters a rival Pathbinder guarding a broken Aether crossing.

Gameplay Focus:

- Ranged Combat
- Positioning
- Defensive Play

Boss:

Rogue Pathbinder Arlen

Reward:

Knight Unlocked

---

# Chapter 4 - Fortress of Iron

Region:
Northern Citadel

Story:

A powerful commander controls one of the ancient Aether Nodes.

Gameplay Focus:

- Tank Units
- Frontline Defense
- Resource Management

Boss:

Iron Commander

Reward:

Dragon Unlocked

---

# Chapter 5 - Desert of Lost Dice

Region:
Crimson Sands

Story:

Ancient relics reveal secrets about the Great Fracture.

Gameplay Focus:

- Full Starter Roster
- Luck Management
- Army Composition

Boss:

Sand Wyrm

Reward:

Campaign Progression

---

# Chapter 6 - Temple of the First Path

Region:
Sunken Temple

Story:

The player learns that the Great Fracture may have been intentional.

Boss:

Temple Guardian

Reward:

Story Progression

---

# Chapter 7 - Kingdom of Shadows

Region:
Twilight Realm

Story:

An entire kingdom lost during the Great Fracture returns.

Boss:

Shadow King

Reward:

Story Progression

---

# Chapter 8 - Dragon's Peak

Region:
Volcanic Highlands

Story:

Ancient dragons test whether the player is worthy to restore the world.

Boss:

Ancient Dragon

Reward:

Story Progression

---

# Chapter 9 - The Fallen Pathbinder

Region:
Void Between Worlds

Story:

The player confronts the one responsible for the Great Fracture.

Boss:

The Fallen Pathbinder

Reward:

Access to Final Chapter

---

# Chapter 10 - Legend of Ultima

Region:
The First Path

Story:

The final battle for the future of Ultima.

Boss:

The First Warden

Reward:

Campaign Completion

---

# Campaign Rules

Match logic (turns, AI, board state) runs entirely client-side — no server round-trips during a match.

An account is required (the app is gated by login — see `docs/AUTH_SPEC.md`) so campaign progress and Gold/Shop/Loadout data can be tied to the player.

Campaign progress is stored per-account in Postgres (`CampaignProgress` model — highest stage unlocked), synced via `/auth/me` and `PUT /campaign-progress`.

---

# Design Goals

The campaign should:

- Teach mechanics gradually through increasing AI difficulty
- Increase challenge each stage via AI behavior and starting mana
- Support future expansion (monster unlocks, boss mechanics, story events)

The immediate goal is a complete single-player experience that teaches the core gameplay loop.
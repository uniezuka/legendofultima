// Single source of truth for types shared between server and frontend.
// To add a new shared type: define it here, then re-export it from whichever
// side-specific type file needs to expose it to local consumers.

export type PlayerId = 'player1' | 'player2'
export type GameMode = 'pvp' | 'campaign'

export type TurnPhase =
  | 'generateMana'
  | 'generatePaths'
  | 'rollDice'
  | 'placePath'
  | 'summonMonster'
  | 'monsterActions'
  | 'endTurn'

export interface Player {
  id: PlayerId
  mana: number
  luck: number
  baseHp: number
  monsterCount: number
}

// ── Board ─────────────────────────────────────────────────────────────────────

export interface Coord { row: number; col: number }

export type CellType = 'empty' | 'path' | 'base'

export interface Cell {
  coord: Coord
  type: CellType
  owner: PlayerId | null
  monsterId: string | null
}

export type PathShapeName = 'I' | 'L' | 'T' | 'Cross' | 'Corner' | 'S'
export interface PathShape { name: PathShapeName; cells: Coord[] }
export interface PathOption { id: string; shape: PathShape; cost: number }

export interface MonsterTemplate {
  type: MonsterType
  label: string
  cost: number
  hp: number
  atk: number
  def: number
  move: number
  range: number
  skills?: string[]  // skill ids the monster can use, looked up in ABILITY_DEFINITIONS
  splashDamageMultiplier?: number  // fraction of ATK dealt to enemies orthogonally adjacent to the attack target
  passiveDescription?: string  // display text for passive combat traits (e.g. splash); client-only, server never reads it
}

export type AbilityKind = 'create_path' | 'destroy_path'

export interface AbilityDefinition {
  range: number
  kind: AbilityKind
}

// ── Monster ───────────────────────────────────────────────────────────────────

export type MonsterState = 'summoning' | 'idle' | 'defending'
export type MonsterType = string  // open registry — add entries to MONSTER_TEMPLATES to register new monsters
export type MonsterAction = 'move' | 'attack' | 'defend' | 'ability'

export interface Monster {
  id: string
  type: MonsterType
  owner: PlayerId
  state: MonsterState
  currentHp: number
  maxHp: number
  atk: number
  def: number
  move: number
  range: number
  coord: Coord
  currentDef: number
  hasMoved: boolean
  hasActedThisTurn: boolean
  lastAction: MonsterAction | null
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'ROLL_DICE' }
  | { type: 'SPEND_LUCK'; payload: { dir: 1 | -1 } }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'PLACE_PATH'; payload: { pathId: string; anchor: Coord; rotation: number } }
  | { type: 'SKIP_PATH' }
  | { type: 'SUMMON_MONSTER'; payload: { monsterType: string; coord: Coord } }
  | { type: 'DONE_SUMMONING' }
  | { type: 'MOVE_MONSTER'; payload: { monsterId: string; targetCoord: Coord } }
  | { type: 'SKIP_MOVE'; payload: { monsterId: string } }
  | { type: 'ATTACK_TARGET'; payload: { attackerId: string; targetId: string } }
  | { type: 'DEFEND_MONSTER'; payload: { monsterId: string } }
  | { type: 'USE_ABILITY'; payload: { monsterId: string; targetCoord: Coord } }
  | { type: 'SKIP_COMBAT'; payload: { monsterId: string } }
  | { type: 'DONE_MONSTER_ACTIONS' }
  | { type: 'FORCE_END_MONSTER_ACTIONS' }

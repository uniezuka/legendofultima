// Shared with src/types/ — keep in sync

export type PlayerId = 'player1' | 'player2'
export type GameMode = 'pvp' | 'campaign'
export type TurnPhase =
  | 'generateMana' | 'generatePaths' | 'rollDice' | 'placePath'
  | 'summonMonster' | 'monsterActions' | 'endTurn'

export interface Player {
  id: PlayerId
  mana: number
  luck: number
  baseHp: number
  monsterCount: number
}

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

export type MonsterState = 'summoning' | 'idle' | 'defending'
export type MonsterType = 'slime' | 'goblin' | 'archer' | 'knight' | 'dragon'
export type MonsterAction = 'move' | 'attack' | 'defend'

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

// What the server tracks per game — UI selection fields are omitted
export interface ServerGameState {
  gameStarted: boolean
  gameMode: GameMode
  aiEnabled: boolean
  phase: TurnPhase
  activePlayer: PlayerId
  turnNumber: number
  players: Record<PlayerId, Player>
  board: Cell[][]
  monsters: Record<string, Monster>
  currentDiceRoll: number | null
  generatedPaths: PathOption[]
  winner: PlayerId | null
  log: string[]
  // Server-side counters
  nextMonsterId: number
  nextPathId: number
}

export type GameAction =
  | { type: 'ROLL_DICE' }
  | { type: 'SPEND_LUCK'; payload: { dir: 1 | -1 } }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'PLACE_PATH'; payload: { pathId: string; anchor: Coord; rotation: number } }
  | { type: 'SKIP_PATH' }
  | { type: 'SUMMON_MONSTER'; payload: { monsterType: MonsterType; coord: Coord } }
  | { type: 'DONE_SUMMONING' }
  | { type: 'MOVE_MONSTER'; payload: { monsterId: string; targetCoord: Coord } }
  | { type: 'SKIP_MOVE'; payload: { monsterId: string } }
  | { type: 'ATTACK_TARGET'; payload: { attackerId: string; targetId: string } }
  | { type: 'DEFEND_MONSTER'; payload: { monsterId: string } }
  | { type: 'SKIP_COMBAT'; payload: { monsterId: string } }
  | { type: 'DONE_MONSTER_ACTIONS' }
  | { type: 'FORCE_END_MONSTER_ACTIONS' }

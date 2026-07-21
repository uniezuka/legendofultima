import type { PlayerId, GameMode, TurnPhase, Player, Cell, PathOption, Monster, GameAction } from '../../shared/types'

// Re-export everything server files import from this module — their imports stay unchanged.
export type { PlayerId, GameMode, TurnPhase, Player, Cell, PathOption, Monster, GameAction } from '../../shared/types'
export type { Coord, CellType, PathShapeName, PathShape, MonsterState, MonsterType, MonsterAction } from '../../shared/types'

// Server-only: authoritative game state. The client's GameState adds UI selection fields on top.
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
  nextMonsterId: number
  nextPathId: number
  // Fetched once from PlayerProfile.loadout at match creation and fixed for the
  // whole match — see docs/SHOP_ECONOMY_SPEC.md. SUMMON_MONSTER is validated
  // against this, not against the client's claimed monster type.
  loadouts: Record<PlayerId, string[]>
}

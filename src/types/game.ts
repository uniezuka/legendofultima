import type { Cell, Monster, PathOption, PlayerId, GameMode, TurnPhase, Player } from '../../shared/types'

export type { PlayerId, GameMode, TurnPhase, Player } from '../../shared/types'

export interface GameState {
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
  nextPathId: number
  // UI-only selection fields — never sent to or received from the server
  selectedPathId: string | null
  selectedPathRotation: number
  selectedMonsterId: string | null
  selectedMonsterTemplateType: string | null
  inspectedMonsterId: string | null
  pendingAttackTargetId: string | null
  isTargetingAbility: boolean
  winner: PlayerId | null
  log: string[]
}

import type { Cell } from './board'
import type { Monster } from './monster'
import type { PathOption } from './board'

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
  selectedPathId: string | null
  selectedPathRotation: number
  selectedMonsterId: string | null
  selectedMonsterTemplateType: string | null
  inspectedMonsterId: string | null
  pendingAttackTargetId: string | null
  winner: PlayerId | null
  log: string[]
}

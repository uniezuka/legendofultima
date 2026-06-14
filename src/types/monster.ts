import type { PlayerId } from './game'
import type { Coord } from './board'

export type MonsterState = 'summoning' | 'idle' | 'defending'
export type MonsterType = 'slime' | 'goblin' | 'archer' | 'knight' | 'dragon'
export type MonsterAction = 'move' | 'attack' | 'defend'

export interface MonsterTemplate {
  type: MonsterType
  label: string
  cost: number
  hp: number
  atk: number
  def: number
  move: number
  range: number
}

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
  currentDef: number         // remaining shield — resets to def when entering defend; drains when attacked while defending
  hasMoved: boolean          // step 1 complete (moved or stayed)
  hasActedThisTurn: boolean  // step 2 complete (fully done)
  lastAction: MonsterAction | null  // only tracks 'defend' for double-defend rule
}

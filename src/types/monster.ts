import type { MonsterType } from '../../shared/types'

export type { MonsterState, MonsterType, MonsterAction, Monster } from '../../shared/types'

// Frontend-only: display config for the summon roster and future skill assignments.
// The server never needs this — it works purely with Monster instances.
export interface MonsterTemplate {
  type: MonsterType
  label: string
  cost: number
  hp: number
  atk: number
  def: number
  move: number
  range: number
  skills?: string[]  // reserved for future skill system — list skill IDs the monster can use
}

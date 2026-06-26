// Shared with src/constants/ — keep in sync
import type { PathShape } from './types'
import type { MonsterType } from './types'

export const BOARD_ROWS = 15
export const BOARD_COLS = 11
export const P1_BASE_ROWS = [14]
export const P2_BASE_ROWS = [0]
export const BASE_COLS = [5]
export const STARTING_MANA = 3
export const LUCK_SPEND_COST = 3
export const MONSTER_CAP_PER_PLAYER = 8
export const BASE_HP = 3

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

export const MONSTER_TEMPLATES: Record<MonsterType, MonsterTemplate> = {
  slime:  { type: 'slime',  label: 'Slime',  cost: 1, hp: 8,  atk: 2, def: 4, move: 1, range: 1 },
  goblin: { type: 'goblin', label: 'Goblin', cost: 2, hp: 5,  atk: 5, def: 2, move: 2, range: 1 },
  archer: { type: 'archer', label: 'Archer', cost: 3, hp: 4,  atk: 4, def: 1, move: 1, range: 2 },
  knight: { type: 'knight', label: 'Knight', cost: 4, hp: 12, atk: 4, def: 6, move: 1, range: 1 },
  dragon: { type: 'dragon', label: 'Dragon', cost: 7, hp: 15, atk: 8, def: 5, move: 2, range: 1 },
}

export const PATH_SHAPES: PathShape[] = [
  { name: 'I',      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
  { name: 'L',      cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
  { name: 'T',      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }] },
  { name: 'Cross',  cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }] },
  { name: 'Corner', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  { name: 'S',      cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
]

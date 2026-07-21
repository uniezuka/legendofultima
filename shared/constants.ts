import type { MonsterTemplate, PathShape } from './types'

export const BOARD_ROWS = 15
export const BOARD_COLS = 11
export const P1_BASE_ROWS = [14]
export const P2_BASE_ROWS = [0]
export const BASE_COLS = [5]
export const STARTING_MANA = 3
export const LUCK_SPEND_COST = 3
export const MONSTER_CAP_PER_PLAYER = 8
export const BASE_HP = 3

// Open registry — add a new entry here to make a monster available in-game.
// No type definitions need to change; MonsterType is just string.
export const MONSTER_TEMPLATES: Record<string, MonsterTemplate> = {
  slime:      { type: 'slime',      label: 'Slime',      cost: 1, hp: 8,  atk: 2, def: 4, move: 1, range: 1 },
  goblin:     { type: 'goblin',     label: 'Goblin',     cost: 2, hp: 5,  atk: 5, def: 2, move: 2, range: 1 },
  archer:     { type: 'archer',     label: 'Archer',     cost: 3, hp: 4,  atk: 4, def: 1, move: 1, range: 2 },
  knight:     { type: 'knight',     label: 'Knight',     cost: 4, hp: 10, atk: 4, def: 6, move: 1, range: 1 },
  dragon:     {
    type: 'dragon', label: 'Dragon', cost: 7, hp: 12, atk: 8, def: 5, move: 2, range: 1,
    splashDamageMultiplier: 0.5,
    passiveDescription: '🔥 Splash Attack: also hits enemies next to its target for half ATK. Shields still help, but they can\'t hit back.',
  },
  // Shop-only — not part of the free starter roster (see docs/SHOP_ECONOMY_SPEC.md).
  white_mage: { type: 'white_mage', label: 'White Mage', cost: 3, hp: 3,  atk: 3, def: 1, move: 1, range: 2, skills: ['create_path'] },
  black_mage: { type: 'black_mage', label: 'Black Mage', cost: 3, hp: 3,  atk: 3, def: 1, move: 1, range: 2, skills: ['destroy_path'] },
}

export const PATH_SHAPES: PathShape[] = [
  { name: 'I',      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
  { name: 'L',      cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
  { name: 'T',      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }] },
  { name: 'Cross',  cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }] },
  { name: 'Corner', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  { name: 'S',      cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
]

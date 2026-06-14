import type { MonsterTemplate, MonsterType } from '../types/monster'

export const MONSTER_TEMPLATES: Record<MonsterType, MonsterTemplate> = {
  slime:  { type: 'slime',  label: 'Slime',  cost: 1, hp: 8,  atk: 2, def: 4, move: 1, range: 1 },
  goblin: { type: 'goblin', label: 'Goblin', cost: 2, hp: 5,  atk: 5, def: 2, move: 2, range: 1 },
  archer: { type: 'archer', label: 'Archer', cost: 3, hp: 4,  atk: 4, def: 1, move: 1, range: 2 },
  knight: { type: 'knight', label: 'Knight', cost: 4, hp: 12, atk: 4, def: 6, move: 1, range: 1 },
  dragon: { type: 'dragon', label: 'Dragon', cost: 7, hp: 15, atk: 8, def: 5, move: 2, range: 1 },
}

export const MONSTER_TYPE_ORDER: MonsterType[] = ['slime', 'goblin', 'archer', 'knight', 'dragon']

import type { Coord } from '../types/board'

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

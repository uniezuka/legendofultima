import type { Coord, Cell } from '../types/board'
import type { Monster } from '../types/monster'
import { BOARD_ROWS, BOARD_COLS } from '../constants/board'

export { getConnectedFriendlyPath, getReachableCells, isAdjacent, manhattanDistance } from '../../shared/movement'

export function coordKey(c: { row: number; col: number }): string {
  return `${c.row},${c.col}`
}

const DIRS = [{ row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }]

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS
}

// Ability targets are always range 1 (orthogonal), independent of the monster's attack range.
// Client-only: enumerates candidates for UI highlighting. The server only validates a single
// client-supplied target (see server/game/apply.ts's isOrthogonallyAdjacent), it never enumerates.
export function getAbilityTargets(
  board: Cell[][],
  monster: Monster,
  kind: 'create_path' | 'destroy_path',
): Coord[] {
  const targets: Coord[] = []
  for (const d of DIRS) {
    const nr = monster.coord.row + d.row
    const nc = monster.coord.col + d.col
    if (!inBounds(nr, nc)) continue
    const cell = board[nr][nc]
    if (kind === 'create_path' && cell.type === 'empty') targets.push({ row: nr, col: nc })
    if (kind === 'destroy_path' && cell.type === 'path' && cell.monsterId === null) targets.push({ row: nr, col: nc })
  }
  return targets
}

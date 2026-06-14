import type { Coord, Cell } from '../types/board'
import type { Monster } from '../types/monster'
import type { PlayerId } from '../types/game'
import { BOARD_ROWS, BOARD_COLS } from '../constants/board'

const DIRS = [{ row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }]

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS
}

export function getConnectedFriendlyPath(
  board: Cell[][],
  start: Coord,
  owner: PlayerId,
): Set<string> {
  const visited = new Set<string>()
  const queue: Coord[] = [start]
  visited.add(`${start.row},${start.col}`)

  while (queue.length > 0) {
    const cur = queue.shift()!
    for (const d of DIRS) {
      const nr = cur.row + d.row
      const nc = cur.col + d.col
      if (!inBounds(nr, nc)) continue
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      const cell = board[nr][nc]
      if ((cell.type === 'path' || cell.type === 'base') && cell.owner === owner) {
        visited.add(key)
        queue.push({ row: nr, col: nc })
      }
    }
  }
  return visited
}

export function getReachableCells(
  board: Cell[][],
  monster: Monster,
  monsters: Record<string, Monster>,
): Coord[] {
  type State = { coord: Coord; steps: number }
  const visited = new Map<string, number>()
  const queue: State[] = [{ coord: monster.coord, steps: 0 }]
  visited.set(`${monster.coord.row},${monster.coord.col}`, 0)
  const reachable: Coord[] = []

  while (queue.length > 0) {
    const { coord, steps } = queue.shift()!
    if (steps > 0) reachable.push(coord)
    if (steps >= monster.move) continue

    for (const d of DIRS) {
      const nr = coord.row + d.row
      const nc = coord.col + d.col
      if (!inBounds(nr, nc)) continue
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      const cell = board[nr][nc]

      // Can move onto any path or base tile — empty cells block movement
      if (cell.type !== 'path' && cell.type !== 'base') continue

      // Cannot move onto own monster (except destination is enemy base which has no occupant)
      const occupant = Object.values(monsters).find(
        m => m.coord.row === nr && m.coord.col === nc && m.id !== monster.id,
      )
      if (occupant && occupant.owner === monster.owner) continue

      // Enemy monsters block movement
      if (occupant && occupant.owner !== monster.owner) continue

      visited.set(key, steps + 1)
      queue.push({ coord: { row: nr, col: nc }, steps: steps + 1 })
    }
  }
  return reachable
}

export function isAdjacent(a: Coord, b: Coord): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
}

export function manhattanDistance(a: Coord, b: Coord): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}

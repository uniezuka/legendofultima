import type { Coord, PathOption, PathShape } from '../types/board'
import type { PlayerId } from '../types/game'
import type { Cell } from '../types/board'
import { PATH_SHAPES } from '../constants/paths'
import { BOARD_ROWS, BOARD_COLS } from '../constants/board'

let nextPathId = 1

export function generatePaths(): PathOption[] {
  return Array.from({ length: 3 }, () => {
    const shape = PATH_SHAPES[Math.floor(Math.random() * PATH_SHAPES.length)]
    const cost = Math.floor(Math.random() * 6) + 1
    return { id: `path-${nextPathId++}`, shape, cost }
  })
}

function rotateCoord(c: Coord, times: number): Coord {
  let { row, col } = c
  for (let i = 0; i < times; i++) {
    const tmp = row
    row = col
    col = -tmp
  }
  return { row, col }
}

function normalizeCoords(coords: Coord[]): Coord[] {
  const minRow = Math.min(...coords.map(c => c.row))
  const minCol = Math.min(...coords.map(c => c.col))
  return coords.map(c => ({ row: c.row - minRow, col: c.col - minCol }))
}

export function getPathCells(shape: PathShape, anchor: Coord, rotation: number): Coord[] {
  const times = ((rotation / 90) % 4 + 4) % 4
  const rotated = shape.cells.map(c => rotateCoord(c, times))
  const normalized = normalizeCoords(rotated)
  return normalized.map(c => ({ row: anchor.row + c.row, col: anchor.col + c.col }))
}

export function validatePathPlacement(
  board: Cell[][],
  cells: Coord[],
  owner: PlayerId,
): boolean {
  const enemy: PlayerId = owner === 'player1' ? 'player2' : 'player1'

  for (const c of cells) {
    if (c.row < 0 || c.row >= BOARD_ROWS || c.col < 0 || c.col >= BOARD_COLS) return false
    const cell = board[c.row][c.col]
    if (cell.type === 'path') return false
    // Cannot place on enemy base
    if (cell.type === 'base' && cell.owner === enemy) return false
    // Cannot place on own base
    if (cell.type === 'base' && cell.owner === owner) return false
  }

  const dirs = [{ row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }]
  const placedSet = new Set(cells.map(c => `${c.row},${c.col}`))

  for (const c of cells) {
    for (const d of dirs) {
      const nr = c.row + d.row
      const nc = c.col + d.col
      if (nr < 0 || nr >= BOARD_ROWS || nc < 0 || nc >= BOARD_COLS) continue
      if (placedSet.has(`${nr},${nc}`)) continue
      const neighbor = board[nr][nc]
      if ((neighbor.type === 'path' || neighbor.type === 'base') && neighbor.owner === owner) {
        return true
      }
    }
  }
  return false
}

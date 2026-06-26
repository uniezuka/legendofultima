// Shared with src/game/paths.ts — keep in sync
import type { Coord, PathOption, PathShape, PlayerId, Cell } from './types'
import { PATH_SHAPES, BOARD_ROWS, BOARD_COLS } from './constants'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generatePaths(startId: number): { paths: PathOption[]; nextId: number } {
  const shapes = shuffle(PATH_SHAPES).slice(0, 3)
  const costs = shuffle([1, 2, 3, 4, 5, 6]).slice(0, 3)
  const paths = shapes.map((shape, i) => ({
    id: `path-${startId + i}`,
    shape,
    cost: costs[i],
  }))
  return { paths, nextId: startId + 3 }
}

function rotateCoord(c: Coord, times: number): Coord {
  let { row, col } = c
  for (let i = 0; i < times; i++) {
    const tmp = row; row = col; col = -tmp
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

export function validatePathPlacement(board: Cell[][], cells: Coord[], owner: PlayerId): boolean {
  const enemy: PlayerId = owner === 'player1' ? 'player2' : 'player1'

  for (const c of cells) {
    if (c.row < 0 || c.row >= BOARD_ROWS || c.col < 0 || c.col >= BOARD_COLS) return false
    const cell = board[c.row][c.col]
    if (cell.type === 'path') return false
    if (cell.type === 'base' && cell.owner === enemy) return false
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
      if ((neighbor.type === 'path' || neighbor.type === 'base') && neighbor.owner === owner) return true
    }
  }
  return false
}

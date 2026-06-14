import type { PathShape } from '../types/board'

export const PATH_SHAPES: PathShape[] = [
  {
    name: 'I',
    cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
  },
  {
    name: 'L',
    cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }],
  },
  {
    name: 'T',
    cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }],
  },
  {
    name: 'Cross',
    cells: [
      { row: 0, col: 1 },
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
      { row: 2, col: 1 },
    ],
  },
  {
    name: 'Corner',
    cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  },
  {
    name: 'S',
    cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  },
]

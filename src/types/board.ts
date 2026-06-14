import type { PlayerId } from './game'

export interface Coord {
  row: number
  col: number
}

export type CellType = 'empty' | 'path' | 'base'

export interface Cell {
  coord: Coord
  type: CellType
  owner: PlayerId | null
  monsterId: string | null
}

export type PathShapeName = 'I' | 'L' | 'T' | 'Cross' | 'Corner' | 'S'

export interface PathShape {
  name: PathShapeName
  cells: Coord[]
}

export interface PathOption {
  id: string
  shape: PathShape
  cost: number
}

import type { GameState } from '../types/game'
import type { Monster, MonsterTemplate } from '../types/monster'
import type { Coord } from '../types/board'
import type { AiDifficulty } from '../constants/campaign'
import { getPathCells, validatePathPlacement } from './paths'
import { getReachableCells, getConnectedFriendlyPath, manhattanDistance, coordKey } from './movement'
import { getAttackTargets, resolveCombat } from './combat'
import { MONSTER_TEMPLATES, MONSTER_TYPE_ORDER } from '../constants/monsters'
import { MONSTER_CAP_PER_PLAYER } from '../constants/board'

// Player2 AI: base at row 0, attacks toward row 14
const AI_BASE: Coord = { row: 0, col: 5 }
const ENEMY_BASE: Coord = { row: 14, col: 5 }

// --- Path Placement ---

export interface PathPlacement {
  pathId: string
  anchor: Coord
  rotation: number
}

export function computeBestPathPlacement(state: GameState): PathPlacement | null {
  const { generatedPaths, currentDiceRoll, board } = state
  if (currentDiceRoll === null) return null

  const matchingPaths = generatedPaths.filter(p => p.cost === currentDiceRoll)
  if (matchingPaths.length === 0) return null

  const rotations = [0, 90, 180, 270]
  let best: { placement: PathPlacement; score: number } | null = null

  const connected = getConnectedFriendlyPath(board, AI_BASE, 'player2')

  for (const path of matchingPaths) {
    for (const rotation of rotations) {
      for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 11; col++) {
          const anchor: Coord = { row, col }
          const cells = getPathCells(path.shape, anchor, rotation)
          if (!validatePathPlacement(board, cells, 'player2')) continue

          // Higher average row = closer to enemy base (player2 advances downward)
          const avgRow = cells.reduce((s, c) => s + c.row, 0) / cells.length

          // Bonus for cells adjacent to existing friendly network (bridges gaps)
          let adjacencyBonus = 0
          for (const c of cells) {
            const neighbors = [
              { row: c.row - 1, col: c.col },
              { row: c.row + 1, col: c.col },
              { row: c.row, col: c.col - 1 },
              { row: c.row, col: c.col + 1 },
            ]
            for (const n of neighbors) {
              if (connected.has(coordKey(n))) { adjacencyBonus += 0.3; break }
            }
          }

          const score = avgRow + adjacencyBonus

          if (!best || score > best.score) {
            best = { placement: { pathId: path.id, anchor, rotation }, score }
          }
        }
      }
    }
  }

  return best?.placement ?? null
}

// Returns +1 or -1 if spending luck to adjust dice would unlock a matching path, otherwise null
export function computeLuckAdjustment(state: GameState): 1 | -1 | null {
  const { generatedPaths, currentDiceRoll, players } = state
  if (currentDiceRoll === null) return null
  if (players['player2'].luck < 3) return null

  const hasMatch = generatedPaths.some(p => p.cost === currentDiceRoll)
  if (hasMatch) return null

  if (currentDiceRoll < 6 && generatedPaths.some(p => p.cost === currentDiceRoll + 1)) return 1
  if (currentDiceRoll > 1 && generatedPaths.some(p => p.cost === currentDiceRoll - 1)) return -1
  return null
}

// --- Monster Summoning ---

export function computeBestSummon(
  state: GameState,
  difficulty: AiDifficulty,
): { type: string; coord: Coord } | null {
  const p = state.players['player2']
  if (p.monsterCount >= MONSTER_CAP_PER_PLAYER) return null

  const affordable: MonsterTemplate[] = MONSTER_TYPE_ORDER
    .map(t => MONSTER_TEMPLATES[t])
    .filter(t => t.cost <= p.mana)

  if (affordable.length === 0) return null

  let template: MonsterTemplate
  if (difficulty === 'idle') {
    template = affordable[0]  // cheapest
  } else if (difficulty === 'easy') {
    template = affordable[Math.floor(Math.random() * affordable.length)]
  } else {
    // medium/hard: best absolute offensive power — atk, mobility, and range
    // (cost efficiency is handled by the affordable filter; we want the best unit we can field)
    template = [...affordable].sort((a, b) => {
      const aScore = (a.atk + a.move * 2) * (a.range + 1)
      const bScore = (b.atk + b.move * 2) * (b.range + 1)
      return bScore - aScore
    })[0]
  }

  // Find summonable cells: connected friendly path tiles with no occupant
  const connected = getConnectedFriendlyPath(state.board, AI_BASE, 'player2')
  const candidates: Coord[] = []
  for (const key of connected) {
    const [r, c] = key.split(',').map(Number)
    const cell = state.board[r][c]
    if (cell.type === 'path' && cell.monsterId === null) {
      candidates.push({ row: r, col: c })
    }
  }

  if (candidates.length === 0) return null

  // Place at highest row (frontmost toward enemy)
  candidates.sort((a, b) => b.row - a.row)

  return { type: template.type, coord: candidates[0] }
}

// --- Monster Movement ---

export function computeBestMove(state: GameState, monster: Monster): Coord | null {
  const reachable = getReachableCells(state.board, monster, state.monsters)
  if (reachable.length === 0) return null

  // Always breach if possible
  const breach = reachable.find(c => c.row === ENEMY_BASE.row && c.col === ENEMY_BASE.col)
  if (breach) return breach

  const enemies = Object.values(state.monsters).filter(m => m.owner === 'player1')

  let bestCell: Coord | null = null
  let bestScore = -Infinity

  for (const cell of reachable) {
    // Higher row = closer to enemy (player2 moves downward)
    let score = cell.row * 2

    // Bonus for being in attack range of an enemy next turn
    for (const e of enemies) {
      const dist = manhattanDistance(cell, e.coord)
      if (dist <= monster.range) score += 3
    }

    // Penalty for landing adjacent to multiple enemies (getting surrounded)
    const adjacentEnemies = enemies.filter(e => manhattanDistance(cell, e.coord) <= 1).length
    if (adjacentEnemies > 1) score -= adjacentEnemies * 3

    if (score > bestScore) {
      bestScore = score
      bestCell = cell
    }
  }

  // Only move if the destination is strictly better than staying
  const stayAdjacent = enemies.filter(e => manhattanDistance(monster.coord, e.coord) <= 1).length
  const stayScore = monster.coord.row * 2 +
    enemies.filter(e => manhattanDistance(monster.coord, e.coord) <= monster.range).length * 3 -
    (stayAdjacent > 1 ? stayAdjacent * 3 : 0)

  if (bestCell && bestScore > stayScore) return bestCell
  return null
}

// --- Monster Combat ---

export function computeBestAttack(state: GameState, monster: Monster): string | null {
  const targetIds = getAttackTargets(state.monsters, monster)
  if (targetIds.length === 0) return null

  const scored: { id: string; score: number }[] = []

  for (const id of targetIds) {
    const target = state.monsters[id]
    if (!target) continue

    const result = resolveCombat(monster, target)

    let score = 0
    const newTargetHp = target.currentHp - result.defenderDamage
    if (newTargetHp <= 0) score += 100              // kill shot
    score += result.defenderDamage * 4              // HP damage dealt
    score -= result.attackerDamage * 5              // penalty for taking recoil
    score += (target.maxHp - target.currentHp) * 2 // prefer already-damaged targets
    if (result.defenderBreaksShield) score += 10    // bonus for breaking shield
    // Credit for chipping the shield (ATK < currentDef case — no HP damage but progress toward break)
    const shieldChip = target.currentDef - result.defenderNewCurrentDef
    if (shieldChip > 0 && result.defenderDamage === 0) score += shieldChip * 2

    scored.push({ id, score })
  }

  if (scored.length === 0) return null
  scored.sort((a, b) => b.score - a.score)
  return scored[0].id
}

export function shouldDefend(monster: Monster): boolean {
  if (monster.lastAction === 'defend') return false
  return monster.currentHp < monster.maxHp * 0.35
}

// Returns true if the AI should skip/take a suboptimal action (simulates mistakes)
export function shouldActRandomly(difficulty: AiDifficulty): boolean {
  if (difficulty === 'idle') return true   // handled separately; always skips actions
  if (difficulty === 'easy') return Math.random() < 0.38
  if (difficulty === 'medium') return Math.random() < 0.12
  return false
}

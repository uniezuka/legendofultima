import type { Cell } from '../types/board'
import type { GameState, Player } from '../types/game'
import {
  BOARD_ROWS, BOARD_COLS,
  P1_BASE_ROWS, P2_BASE_ROWS, BASE_COLS,
  STARTING_MANA, BASE_HP,
} from '../constants/board'

function makePlayer(id: 'player1' | 'player2'): Player {
  return { id, mana: STARTING_MANA, luck: 0, baseHp: BASE_HP, monsterCount: 0 }
}

export function createInitialBoard(): Cell[][] {
  const board: Cell[][] = []
  for (let row = 0; row < BOARD_ROWS; row++) {
    const rowArr: Cell[] = []
    for (let col = 0; col < BOARD_COLS; col++) {
      rowArr.push({ coord: { row, col }, type: 'empty', owner: null, monsterId: null })
    }
    board.push(rowArr)
  }

  for (const row of P2_BASE_ROWS) {
    for (const col of BASE_COLS) {
      board[row][col] = { coord: { row, col }, type: 'base', owner: 'player2', monsterId: null }
    }
  }
  for (const row of P1_BASE_ROWS) {
    for (const col of BASE_COLS) {
      board[row][col] = { coord: { row, col }, type: 'base', owner: 'player1', monsterId: null }
    }
  }

  return board
}

export function createInitialGameState(): GameState {
  return {
    gameStarted: false,
    phase: 'generateMana',
    activePlayer: 'player1',
    turnNumber: 1,
    players: {
      player1: makePlayer('player1'),
      player2: makePlayer('player2'),
    },
    board: createInitialBoard(),
    monsters: {},
    currentDiceRoll: null,
    generatedPaths: [],
    selectedPathId: null,
    selectedPathRotation: 0,
    selectedMonsterId: null,
    selectedMonsterTemplateType: null,
    inspectedMonsterId: null,
    pendingAttackTargetId: null,
    winner: null,
    log: [],
  }
}

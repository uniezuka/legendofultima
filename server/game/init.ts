import type { ServerGameState, Cell, PlayerId } from './types'
import { BOARD_ROWS, BOARD_COLS, P1_BASE_ROWS, P2_BASE_ROWS, BASE_COLS, STARTING_MANA, BASE_HP } from './constants'
import { generatePaths } from './paths'

function createInitialBoard(): Cell[][] {
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

function makePlayer(id: PlayerId, mana = STARTING_MANA) {
  return { id, mana, luck: 0, baseHp: BASE_HP, monsterCount: 0 }
}

// Creates the initial match state already advanced past the auto-phases
// (generateMana + generatePaths), landing on rollDice for player1.
export function createInitialMatchState(loadouts: Record<PlayerId, string[]>): ServerGameState {
  const { paths, nextId } = generatePaths(1)
  const p1Mana = STARTING_MANA + 1  // first generateMana tick

  return {
    gameStarted: true,
    gameMode: 'pvp',
    aiEnabled: false,
    phase: 'rollDice',
    activePlayer: 'player1',
    turnNumber: 1,
    players: {
      player1: makePlayer('player1', p1Mana),
      player2: makePlayer('player2'),
    },
    board: createInitialBoard(),
    monsters: {},
    currentDiceRoll: null,
    generatedPaths: paths,
    winner: null,
    log: ['--- Turn 1: player1 ---', `player1 gains mana → ${p1Mana}`, 'Generated 3 paths'],
    nextMonsterId: 1,
    nextPathId: nextId,
    loadouts,
  }
}

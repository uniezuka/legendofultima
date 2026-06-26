import type { ServerGameState, GameAction, PlayerId, Monster, Coord } from './types'
import { rollD6 } from './dice'
import { generatePaths, getPathCells, validatePathPlacement } from './paths'
import { getConnectedFriendlyPath, getReachableCells } from './movement'
import { resolveCombat, getAttackTargets } from './combat'
import {
  MONSTER_TEMPLATES, P1_BASE_ROWS, P2_BASE_ROWS, BASE_COLS,
  LUCK_SPEND_COST, MONSTER_CAP_PER_PLAYER,
} from './constants'
import type { MonsterType } from './types'

function log(state: ServerGameState, entry: string): string[] {
  return [...state.log, entry].slice(-100)
}

function isEnemyBase(coord: Coord, owner: PlayerId): boolean {
  const rows = owner === 'player1' ? P2_BASE_ROWS : P1_BASE_ROWS
  return rows.includes(coord.row) && BASE_COLS.includes(coord.col)
}

function mustActMonsters(state: ServerGameState): Monster[] {
  return Object.values(state.monsters).filter(
    m => m.owner === state.activePlayer && m.state !== 'summoning' && !m.hasActedThisTurn,
  )
}

// Run endTurn cleanup then auto-phases (generateMana + generatePaths) for next player.
// Returns state with phase = 'rollDice' ready for the next player.
export function runEndTurnAndAutoPhases(state: ServerGameState): ServerGameState {
  const nextPlayer: PlayerId = state.activePlayer === 'player1' ? 'player2' : 'player1'

  // Reset monster states
  const updatedMonsters: Record<string, Monster> = {}
  for (const [id, m] of Object.entries(state.monsters)) {
    updatedMonsters[id] = {
      ...m,
      state: m.state === 'summoning' ? 'idle' : m.state,
      hasMoved: false,
      hasActedThisTurn: false,
    }
  }

  let s: ServerGameState = {
    ...state,
    monsters: updatedMonsters,
    activePlayer: nextPlayer,
    turnNumber: state.turnNumber + 1,
    currentDiceRoll: null,
    generatedPaths: [],
    phase: 'generateMana',
    log: [...state.log, `--- Turn ${state.turnNumber + 1}: ${nextPlayer} ---`].slice(-100),
  }

  // generateMana
  const p = s.players[s.activePlayer]
  const newMana = p.mana + 1
  s = {
    ...s,
    phase: 'generatePaths',
    players: { ...s.players, [s.activePlayer]: { ...p, mana: newMana } },
    log: [...s.log, `${s.activePlayer} gains mana → ${newMana}`].slice(-100),
  }

  // generatePaths
  const { paths, nextId } = generatePaths(s.nextPathId)
  return {
    ...s,
    phase: 'rollDice',
    generatedPaths: paths,
    nextPathId: nextId,
    log: [...s.log, 'Generated 3 paths'].slice(-100),
  }
}

export function applyAction(
  state: ServerGameState,
  action: GameAction,
  actingPlayer: PlayerId,
): ServerGameState {
  if (state.activePlayer !== actingPlayer) return state

  switch (action.type) {
    case 'ROLL_DICE': {
      if (state.phase !== 'rollDice') return state
      const roll = rollD6()
      return { ...state, currentDiceRoll: roll, log: log(state, `${state.activePlayer} rolled ${roll}`) }
    }

    case 'SPEND_LUCK': {
      if (state.phase !== 'placePath' || state.currentDiceRoll === null) return state
      const p = state.players[state.activePlayer]
      if (p.luck < LUCK_SPEND_COST) return state
      const newRoll = Math.max(1, Math.min(6, state.currentDiceRoll + action.payload.dir))
      return {
        ...state,
        currentDiceRoll: newRoll,
        players: { ...state.players, [state.activePlayer]: { ...p, luck: p.luck - LUCK_SPEND_COST } },
        log: log(state, `${state.activePlayer} spends 3 luck → roll is now ${newRoll}`),
      }
    }

    case 'ADVANCE_PHASE': {
      if (state.phase === 'rollDice' && state.currentDiceRoll !== null) {
        return { ...state, phase: 'placePath' }
      }
      if (state.phase === 'endTurn') {
        return runEndTurnAndAutoPhases(state)
      }
      return state
    }

    case 'PLACE_PATH': {
      if (state.phase !== 'placePath') return state
      const { pathId, anchor, rotation } = action.payload
      const path = state.generatedPaths.find(p => p.id === pathId)
      if (!path) return state
      const cells = getPathCells(path.shape, anchor, rotation)
      if (!validatePathPlacement(state.board, cells, state.activePlayer)) return state
      const newBoard = state.board.map(row => row.map(c => ({ ...c })))
      for (const c of cells) {
        newBoard[c.row][c.col] = { coord: c, type: 'path', owner: state.activePlayer, monsterId: null }
      }
      return {
        ...state,
        board: newBoard,
        phase: 'summonMonster',
        generatedPaths: [],
        log: log(state, `${state.activePlayer} placed ${path.shape.name} path`),
      }
    }

    case 'SKIP_PATH': {
      if (state.phase !== 'placePath') return state
      const p = state.players[state.activePlayer]
      const hasMatch = state.generatedPaths.some(path => path.cost === state.currentDiceRoll)
      const luckGain = hasMatch ? 0 : 1
      return {
        ...state,
        phase: 'summonMonster',
        players: { ...state.players, [state.activePlayer]: { ...p, luck: p.luck + luckGain } },
        generatedPaths: [],
        log: log(state, luckGain > 0
          ? `No path matched — ${state.activePlayer} gains 1 luck (${p.luck + 1})`
          : `${state.activePlayer} skipped path placement`),
      }
    }

    case 'SUMMON_MONSTER': {
      if (state.phase !== 'summonMonster') return state
      const { monsterType, coord } = action.payload
      const template = MONSTER_TEMPLATES[monsterType as MonsterType]
      if (!template) return state
      const p = state.players[state.activePlayer]
      if (p.mana < template.cost || p.monsterCount >= MONSTER_CAP_PER_PLAYER) return state
      const cell = state.board[coord.row]?.[coord.col]
      if (!cell || cell.type !== 'path' || cell.owner !== state.activePlayer || cell.monsterId !== null) return state
      const baseCoord = state.activePlayer === 'player1' ? { row: 14, col: 5 } : { row: 0, col: 5 }
      if (!getConnectedFriendlyPath(state.board, baseCoord, state.activePlayer).has(`${coord.row},${coord.col}`)) return state

      const id = `monster-${state.nextMonsterId}`
      const monster: Monster = {
        id, type: template.type, owner: state.activePlayer, state: 'summoning',
        currentHp: template.hp, maxHp: template.hp, atk: template.atk,
        def: template.def, move: template.move, range: template.range,
        coord, currentDef: template.def, hasMoved: false, hasActedThisTurn: true, lastAction: null,
      }
      const newBoard = state.board.map(row => row.map(c => ({ ...c })))
      newBoard[coord.row][coord.col] = { ...cell, monsterId: id }
      return {
        ...state,
        nextMonsterId: state.nextMonsterId + 1,
        monsters: { ...state.monsters, [id]: monster },
        board: newBoard,
        players: {
          ...state.players,
          [state.activePlayer]: { ...p, mana: p.mana - template.cost, monsterCount: p.monsterCount + 1 },
        },
        log: log(state, `${state.activePlayer} summons ${template.label} at (${coord.row},${coord.col})`),
      }
    }

    case 'DONE_SUMMONING': {
      if (state.phase !== 'summonMonster') return state
      return {
        ...state,
        phase: 'monsterActions',
        log: log(state, `${state.activePlayer} done summoning`),
      }
    }

    case 'MOVE_MONSTER': {
      if (state.phase !== 'monsterActions') return state
      const { monsterId, targetCoord } = action.payload
      const monster = state.monsters[monsterId]
      if (!monster || monster.owner !== state.activePlayer) return state
      if (monster.hasActedThisTurn || monster.hasMoved || monster.state === 'summoning') return state
      if (!getReachableCells(state.board, monster, state.monsters).some(
        c => c.row === targetCoord.row && c.col === targetCoord.col,
      )) return state

      const newBoard = state.board.map(row => row.map(c => ({ ...c })))
      newBoard[monster.coord.row][monster.coord.col] = {
        ...newBoard[monster.coord.row][monster.coord.col], monsterId: null,
      }

      if (isEnemyBase(targetCoord, monster.owner)) {
        const enemy: PlayerId = monster.owner === 'player1' ? 'player2' : 'player1'
        const ep = state.players[enemy]
        const newHp = ep.baseHp - 1
        const updatedMonsters = { ...state.monsters }
        delete updatedMonsters[monsterId]
        return {
          ...state,
          board: newBoard,
          monsters: updatedMonsters,
          players: {
            ...state.players,
            [enemy]: { ...ep, baseHp: newHp },
            [monster.owner]: {
              ...state.players[monster.owner],
              monsterCount: state.players[monster.owner].monsterCount - 1,
            },
          },
          winner: newHp <= 0 ? monster.owner : null,
          log: log(state, `${monster.type} breaches ${enemy} base! Base HP: ${newHp}`),
        }
      }

      newBoard[targetCoord.row][targetCoord.col] = {
        ...newBoard[targetCoord.row][targetCoord.col], monsterId,
      }
      return {
        ...state,
        board: newBoard,
        monsters: {
          ...state.monsters,
          [monsterId]: { ...monster, coord: targetCoord, state: 'idle', hasMoved: true, lastAction: null },
        },
        log: log(state, `${monster.type} moves to (${targetCoord.row},${targetCoord.col})`),
      }
    }

    case 'SKIP_MOVE': {
      if (state.phase !== 'monsterActions') return state
      const { monsterId } = action.payload
      const monster = state.monsters[monsterId]
      if (!monster || monster.owner !== state.activePlayer) return state
      if (monster.hasMoved || monster.hasActedThisTurn || monster.state === 'summoning') return state
      return {
        ...state,
        monsters: { ...state.monsters, [monsterId]: { ...monster, hasMoved: true } },
        log: log(state, `${monster.type} stays`),
      }
    }

    case 'ATTACK_TARGET': {
      if (state.phase !== 'monsterActions') return state
      const { attackerId, targetId } = action.payload
      const attacker = state.monsters[attackerId]
      const target = state.monsters[targetId]
      if (!attacker || !target || attacker.owner === target.owner) return state
      if (attacker.owner !== state.activePlayer) return state
      if (attacker.hasActedThisTurn || attacker.state === 'summoning' || !attacker.hasMoved) return state
      if (!getAttackTargets(state.monsters, attacker).includes(targetId)) return state

      const result = resolveCombat(attacker, target)
      let updatedMonsters = { ...state.monsters }
      let updatedPlayers = { ...state.players }
      const extraLog: string[] = []
      const newBoard = state.board.map(row => row.map(c => ({ ...c })))

      const newAttackerHp = attacker.currentHp - result.attackerDamage
      if (newAttackerHp <= 0) {
        delete updatedMonsters[attackerId]
        newBoard[attacker.coord.row][attacker.coord.col] = {
          ...newBoard[attacker.coord.row][attacker.coord.col], monsterId: null,
        }
        const ap = updatedPlayers[attacker.owner]
        updatedPlayers = { ...updatedPlayers, [attacker.owner]: { ...ap, monsterCount: ap.monsterCount - 1 } }
        extraLog.push(`💀 ${attacker.owner}'s ${attacker.type} was destroyed!`)
      } else {
        updatedMonsters[attackerId] = {
          ...attacker, currentHp: newAttackerHp, state: 'idle', hasActedThisTurn: true, lastAction: 'attack',
        }
      }

      const newTargetHp = target.currentHp - result.defenderDamage
      if (newTargetHp <= 0) {
        delete updatedMonsters[targetId]
        newBoard[target.coord.row][target.coord.col] = {
          ...newBoard[target.coord.row][target.coord.col], monsterId: null,
        }
        const tp = updatedPlayers[target.owner]
        updatedPlayers = { ...updatedPlayers, [target.owner]: { ...tp, monsterCount: tp.monsterCount - 1 } }
        extraLog.push(`💀 ${target.owner}'s ${target.type} was destroyed!`)
      } else {
        const shieldBroke = target.state === 'defending' && result.defenderBreaksShield
        updatedMonsters[targetId] = {
          ...target,
          currentHp: newTargetHp,
          currentDef: result.defenderNewCurrentDef,
          ...(shieldBroke ? { state: 'idle' as const, lastAction: null } : {}),
        }
      }

      return {
        ...state,
        board: newBoard,
        monsters: updatedMonsters,
        players: updatedPlayers,
        log: [...state.log, result.log, ...extraLog].slice(-100),
      }
    }

    case 'DEFEND_MONSTER': {
      if (state.phase !== 'monsterActions') return state
      const { monsterId } = action.payload
      const monster = state.monsters[monsterId]
      if (!monster || monster.owner !== state.activePlayer) return state
      if (monster.hasActedThisTurn || monster.state === 'summoning' || !monster.hasMoved) return state
      if (monster.lastAction === 'defend') return state
      return {
        ...state,
        monsters: {
          ...state.monsters,
          [monsterId]: { ...monster, state: 'defending', currentDef: monster.def, hasActedThisTurn: true, lastAction: 'defend' },
        },
        log: log(state, `${monster.type} defends`),
      }
    }

    case 'SKIP_COMBAT': {
      if (state.phase !== 'monsterActions') return state
      const { monsterId } = action.payload
      const monster = state.monsters[monsterId]
      if (!monster || monster.owner !== state.activePlayer) return state
      if (!monster.hasMoved || monster.hasActedThisTurn) return state
      return {
        ...state,
        monsters: { ...state.monsters, [monsterId]: { ...monster, hasActedThisTurn: true } },
        log: log(state, `${monster.type} skips combat`),
      }
    }

    case 'DONE_MONSTER_ACTIONS': {
      if (state.phase !== 'monsterActions') return state
      if (mustActMonsters(state).length > 0) return state
      return {
        ...state,
        phase: 'endTurn',
        log: log(state, `${state.activePlayer} done with actions`),
      }
    }

    case 'FORCE_END_MONSTER_ACTIONS': {
      if (state.phase !== 'monsterActions') return state
      return {
        ...state,
        phase: 'endTurn',
        log: log(state, `${state.activePlayer} ends actions early`),
      }
    }

    default:
      return state
  }
}

import { create } from 'zustand'
import type { GameState, PlayerId, TurnPhase } from '../types/game'
import type { Coord, Cell } from '../types/board'
import type { Monster } from '../types/monster'
import { createInitialGameState } from '../game/init'
import { rollD6 } from '../game/dice'
import { generatePaths, getPathCells, validatePathPlacement } from '../game/paths'
import { getConnectedFriendlyPath, getReachableCells, coordKey, isAdjacent, getAbilityTargets } from '../game/movement'
import { resolveCombat, getAttackTargets, getSplashTargets } from '../game/combat'
import { MONSTER_TEMPLATES } from '../constants/monsters'
import { ABILITY_DEFINITIONS, getMonsterSkillId } from '../constants/abilities'
import { MONSTER_CAP_PER_PLAYER, LUCK_SPEND_COST, P1_BASE_ROWS, P2_BASE_ROWS, BASE_COLS } from '../constants/board'
import { useProfileStore } from './profileStore'

let nextMonsterId = 1

function computeMustActMonsters(
  monsters: Record<string, Monster>,
  _board: Cell[][],
  activePlayer: PlayerId,
): Monster[] {
  // With the 2-step system, stay + skip-combat are always valid so every
  // unacted non-summoning monster must complete its turn.
  return Object.values(monsters).filter(m =>
    m.owner === activePlayer &&
    m.state !== 'summoning' &&
    !m.hasActedThisTurn,
  )
}

function isEnemyBase(coord: Coord, owner: PlayerId): boolean {
  const enemyBaseRows = owner === 'player1' ? P2_BASE_ROWS : P1_BASE_ROWS
  return enemyBaseRows.includes(coord.row) && BASE_COLS.includes(coord.col)
}

// Server state excludes client-only UI selection fields
export type ServerBroadcastState = Omit<
  GameState,
  'selectedPathId' | 'selectedPathRotation' | 'selectedMonsterId' |
  'selectedMonsterTemplateType' | 'inspectedMonsterId' | 'pendingAttackTargetId' |
  'isTargetingAbility'
>

interface GameStore extends GameState {
  startGame: () => void
  startCampaignMatch: (aiStartingMana: number) => void
  resetGame: () => void

  // Online mode
  setFromServer: (serverState: ServerBroadcastState) => void
  setGameStarted: (started: boolean) => void
  setWinner: (winner: PlayerId | null) => void

  // Phase advancement
  advancePhase: () => void

  // Phase 3
  rollDice: () => void
  spendLuck: (dir: 1 | -1) => void

  // Phase 4
  selectPath: (id: string) => void
  setPathRotation: (rotation: number) => void
  placePathOnBoard: (anchor: Coord) => void
  skipPathPlacement: () => void

  // Phase 5
  selectMonsterTemplate: (type: string) => void
  summonMonster: (coord: Coord) => void
  doneSummoning: () => void

  // Inspect any monster (any phase)
  inspectMonster: (id: string | null) => void

  // Phase 6
  selectMonster: (id: string | null) => void
  moveMonster: (targetCoord: Coord) => void
  skipMove: () => void
  setPendingAttackTarget: (id: string | null) => void
  attackTarget: (targetId: string) => void
  defendMonster: () => void
  setTargetingAbility: (active: boolean) => void
  useAbility: (targetCoord: Coord) => void
  skipCombat: () => void
  doneMonsterActions: () => void
  forceEndMonsterActions: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(),

  startGame: () => {
    const fresh = createInitialGameState()
    set({ ...fresh, gameStarted: true, gameMode: 'pvp', aiEnabled: false })
    setTimeout(() => get().advancePhase(), 0)
  },

  startCampaignMatch: (aiStartingMana) => {
    const fresh = createInitialGameState()
    const p2 = { ...fresh.players['player2'], mana: aiStartingMana }
    set({
      ...fresh,
      gameStarted: true,
      gameMode: 'campaign',
      aiEnabled: true,
      players: { ...fresh.players, player2: p2 },
    })
    setTimeout(() => get().advancePhase(), 0)
  },

  resetGame: () => {
    set(createInitialGameState())
  },

  setFromServer: (serverState) => {
    const current = get()
    const turnChanged =
      serverState.turnNumber !== current.turnNumber ||
      serverState.activePlayer !== current.activePlayer

    set({
      ...serverState,
      // Preserve client-only UI state within the same turn
      selectedPathId: turnChanged ? null : current.selectedPathId,
      selectedPathRotation: turnChanged ? 0 : current.selectedPathRotation,
      selectedMonsterId: turnChanged ? null : current.selectedMonsterId,
      selectedMonsterTemplateType: turnChanged ? null : current.selectedMonsterTemplateType,
      inspectedMonsterId: turnChanged ? null : current.inspectedMonsterId,
      pendingAttackTargetId: turnChanged ? null : current.pendingAttackTargetId,
      isTargetingAbility: turnChanged ? false : current.isTargetingAbility,
    })
  },

  setGameStarted: (gameStarted) => set({ gameStarted }),

  setWinner: (winner) => set({ winner }),

  advancePhase: () => {
    const state = get()
    const order: TurnPhase[] = [
      'generateMana', 'generatePaths', 'rollDice', 'placePath',
      'summonMonster', 'monsterActions', 'endTurn',
    ]
    const idx = order.indexOf(state.phase)
    const next = order[idx + 1] ?? 'generateMana'

    if (state.phase === 'generateMana') {
      const p = state.players[state.activePlayer]
      const newMana = p.mana + 1
      set(s => ({
        phase: 'generatePaths',
        players: { ...s.players, [s.activePlayer]: { ...p, mana: newMana } },
        log: [...s.log, `${s.activePlayer} gains mana → ${newMana}`],
      }))
      setTimeout(() => get().advancePhase(), 0)
      return
    }

    if (state.phase === 'generatePaths') {
      const { paths, nextId } = generatePaths(state.nextPathId)
      set(s => ({
        phase: 'rollDice',
        generatedPaths: paths,
        nextPathId: nextId,
        selectedPathId: null,
        selectedPathRotation: 0,
        log: [...s.log, `Generated 3 paths`],
      }))
      return
    }

    if (state.phase === 'endTurn') {
      // Transition summoning → idle, reset acted flags, flip player
      const updatedMonsters = { ...state.monsters }
      for (const id in updatedMonsters) {
        const m = updatedMonsters[id]
        updatedMonsters[id] = {
          ...m,
          state: m.state === 'summoning' ? 'idle' : m.state,
          hasMoved: false,
          hasActedThisTurn: false,
        }
      }
      const nextPlayer: PlayerId = state.activePlayer === 'player1' ? 'player2' : 'player1'
      set(s => {
        const nextLog = [...s.log, `--- Turn ${s.turnNumber + 1}: ${nextPlayer} ---`]
        return {
          phase: 'generateMana',
          activePlayer: nextPlayer,
          turnNumber: s.turnNumber + 1,
          monsters: updatedMonsters,
          currentDiceRoll: null,
          generatedPaths: [],
          selectedPathId: null,
          selectedPathRotation: 0,
          selectedMonsterId: null,
          selectedMonsterTemplateType: null,
          inspectedMonsterId: null,
          pendingAttackTargetId: null,
          isTargetingAbility: false,
          log: nextLog.length > 100 ? nextLog.slice(-100) : nextLog,
        }
      })
      setTimeout(() => get().advancePhase(), 0)
      return
    }

    set({ phase: next })
  },

  rollDice: () => {
    const roll = rollD6()
    set(s => ({
      currentDiceRoll: roll,
      log: [...s.log, `${s.activePlayer} rolled ${roll}`],
    }))
  },

  spendLuck: (dir) => {
    const state = get()
    const p = state.players[state.activePlayer]
    if (p.luck < LUCK_SPEND_COST) return
    const newRoll = Math.max(1, Math.min(6, (state.currentDiceRoll ?? 1) + dir))
    set(s => ({
      currentDiceRoll: newRoll,
      players: { ...s.players, [s.activePlayer]: { ...p, luck: p.luck - LUCK_SPEND_COST } },
      log: [...s.log, `${s.activePlayer} spends 3 luck → roll is now ${newRoll}`],
    }))
  },

  selectPath: (id) => {
    set({ selectedPathId: id, selectedPathRotation: 0 })
  },

  setPathRotation: (rotation) => {
    set({ selectedPathRotation: rotation })
  },

  placePathOnBoard: (anchor) => {
    const state = get()
    if (!state.selectedPathId || state.currentDiceRoll === null) return
    const path = state.generatedPaths.find(p => p.id === state.selectedPathId)
    if (!path) return

    const cells = getPathCells(path.shape, anchor, state.selectedPathRotation)
    if (!validatePathPlacement(state.board, cells, state.activePlayer)) return

    const newBoard = state.board.map(row => row.map(cell => ({ ...cell })))
    for (const c of cells) {
      newBoard[c.row][c.col] = { coord: c, type: 'path', owner: state.activePlayer, monsterId: null }
    }

    set(s => ({
      board: newBoard,
      selectedPathId: null,
      generatedPaths: [],
      phase: 'summonMonster',
      log: [...s.log, `${s.activePlayer} placed ${path.shape.name} path`],
    }))
  },

  skipPathPlacement: () => {
    const state = get()
    const p = state.players[state.activePlayer]
    // Only grant luck if no path matched
    const hasMatch = state.generatedPaths.some(path => path.cost === state.currentDiceRoll)
    const luckGain = hasMatch ? 0 : 1
    set(s => ({
      phase: 'summonMonster',
      players: { ...s.players, [s.activePlayer]: { ...p, luck: p.luck + luckGain } },
      selectedPathId: null,
      generatedPaths: [],
      log: luckGain > 0
        ? [...s.log, `No path matched — ${s.activePlayer} gains 1 luck (${p.luck + 1})`]
        : [...s.log, `${s.activePlayer} skipped path placement`],
    }))
  },

  selectMonsterTemplate: (type) => {
    set({ selectedMonsterTemplateType: type, selectedMonsterId: null })
  },

  summonMonster: (coord) => {
    const state = get()
    if (!state.selectedMonsterTemplateType) return
    const template = MONSTER_TEMPLATES[state.selectedMonsterTemplateType]
    const p = state.players[state.activePlayer]

    if (p.mana < template.cost) return
    if (p.monsterCount >= MONSTER_CAP_PER_PLAYER) return

    // Loadout is only enforced for the human-controlled seat — the campaign
    // AI (player2, when aiEnabled) is deliberately unaffected by the shop/
    // loadout system and always has access to the full starter roster (see
    // docs/SHOP_ECONOMY_SPEC.md). Online PvP never reaches this offline path
    // at all (dispatch.ts routes it to emitAction instead), where the server
    // is the real authority (server/game/apply.ts already checks this).
    const isAiTurn = state.aiEnabled && state.activePlayer === 'player2'
    if (!isAiTurn) {
      const { loadout } = useProfileStore.getState()
      if (loadout.length > 0 && !loadout.includes(state.selectedMonsterTemplateType)) return
    }

    const cell = state.board[coord.row][coord.col]
    if (cell.type !== 'path' || cell.owner !== state.activePlayer || cell.monsterId !== null) return

    // Must be on connected friendly network
    const baseCoord = state.activePlayer === 'player1'
      ? { row: 14, col: 5 } : { row: 0, col: 5 }
    const connected = getConnectedFriendlyPath(state.board, baseCoord, state.activePlayer)
    if (!connected.has(coordKey(coord))) return

    const id = `monster-${nextMonsterId++}`
    const monster: Monster = {
      id,
      type: template.type,
      owner: state.activePlayer,
      state: 'summoning',
      currentHp: template.hp,
      maxHp: template.hp,
      atk: template.atk,
      def: template.def,
      move: template.move,
      range: template.range,
      coord,
      currentDef: template.def,
      hasMoved: false,
      hasActedThisTurn: true,
      lastAction: null,
    }

    const newBoard = state.board.map(row => row.map(c => ({ ...c })))
    newBoard[coord.row][coord.col] = { ...cell, monsterId: id }

    set(s => ({
      monsters: { ...s.monsters, [id]: monster },
      board: newBoard,
      players: {
        ...s.players,
        [s.activePlayer]: { ...p, mana: p.mana - template.cost, monsterCount: p.monsterCount + 1 },
      },
      selectedMonsterTemplateType: null,
      log: [...s.log, `${s.activePlayer} summons ${template.label} at (${coord.row},${coord.col})`],
    }))
  },

  doneSummoning: () => {
    set(s => ({ phase: 'monsterActions', selectedMonsterTemplateType: null, log: [...s.log, `${s.activePlayer} done summoning`] }))
  },

  inspectMonster: (id) => {
    set({ inspectedMonsterId: id })
  },

  setPendingAttackTarget: (id) => {
    // Also clears isTargetingAbility — the two modes are mutually exclusive
    // (a monster is either being lined up for an attack or armed to use its
    // ability, never both). Without this, arming an ability then clicking an
    // attackable enemy left isTargetingAbility stuck true; cancelling the
    // resulting attack preview (rather than confirming it) dropped the
    // player back into armed-ability-targeting mode instead of the plain
    // combat-step menu they expected from Cancel.
    set({ pendingAttackTargetId: id, isTargetingAbility: false })
  },

  selectMonster: (id) => {
    set({ selectedMonsterId: id, selectedMonsterTemplateType: null, isTargetingAbility: false, pendingAttackTargetId: null })
  },

  moveMonster: (targetCoord) => {
    const state = get()
    if (!state.selectedMonsterId) return
    const monster = state.monsters[state.selectedMonsterId]
    if (!monster || monster.owner !== state.activePlayer) return
    if (monster.hasActedThisTurn) return
    if (monster.hasMoved) return              // already did step 1, can't move again
    if (monster.state === 'summoning') return

    const reachable = getReachableCells(state.board, monster, state.monsters)
    const canReach = reachable.some(c => c.row === targetCoord.row && c.col === targetCoord.col)
    if (!canReach) return

    const newBoard = state.board.map(row => row.map(c => ({ ...c })))
    newBoard[monster.coord.row][monster.coord.col] = {
      ...newBoard[monster.coord.row][monster.coord.col], monsterId: null,
    }

    // Check if moving into enemy base
    if (isEnemyBase(targetCoord, monster.owner)) {
      const enemy: PlayerId = monster.owner === 'player1' ? 'player2' : 'player1'
      const ep = state.players[enemy]
      const newHp = ep.baseHp - 1
      const updatedMonsters = { ...state.monsters }
      delete updatedMonsters[monster.id]
      const updatedPlayers = {
        ...state.players,
        [enemy]: { ...ep, baseHp: newHp },
        [monster.owner]: { ...state.players[monster.owner], monsterCount: state.players[monster.owner].monsterCount - 1 },
      }
      const winner = newHp <= 0 ? monster.owner : null
      set(s => ({
        board: newBoard,
        monsters: updatedMonsters,
        players: updatedPlayers,
        selectedMonsterId: null,
        winner,
        log: [...s.log, `${monster.type} breaches ${enemy} base! Base HP: ${newHp}`],
      }))
      return
    }

    newBoard[targetCoord.row][targetCoord.col] = {
      ...newBoard[targetCoord.row][targetCoord.col], monsterId: monster.id,
    }

    set(s => ({
      board: newBoard,
      monsters: {
        ...s.monsters,
        // Move completes step 1; monster stays selected for step 2
        [monster.id]: { ...monster, coord: targetCoord, state: 'idle', hasMoved: true, lastAction: null },
      },
      log: [...s.log, `${monster.type} moves to (${targetCoord.row},${targetCoord.col})`],
    }))
  },

  attackTarget: (targetId) => {
    const state = get()
    if (!state.selectedMonsterId) return
    const attacker = state.monsters[state.selectedMonsterId]
    const target = state.monsters[targetId]
    if (!attacker || !target) return
    if (attacker.owner === target.owner) return
    if (attacker.hasActedThisTurn) return
    if (attacker.state === 'summoning') return
    if (!attacker.hasMoved) return            // must complete step 1 first

    const validTargets = getAttackTargets(state.monsters, attacker)
    if (!validTargets.includes(targetId)) return

    const result = resolveCombat(attacker, target)

    const updatedMonsters = { ...state.monsters }
    const newAttackerHp = attacker.currentHp - result.attackerDamage
    const newTargetHp = target.currentHp - result.defenderDamage
    const extraLog: string[] = []

    const newBoard = state.board.map(row => row.map(c => ({ ...c })))

    // Update attacker
    if (newAttackerHp <= 0) {
      delete updatedMonsters[attacker.id]
      newBoard[attacker.coord.row][attacker.coord.col] = {
        ...newBoard[attacker.coord.row][attacker.coord.col], monsterId: null,
      }
      const ap = state.players[attacker.owner]
      set(s => ({
        players: { ...s.players, [attacker.owner]: { ...ap, monsterCount: ap.monsterCount - 1 } },
      }))
      extraLog.push(`💀 ${attacker.owner}'s ${attacker.type} was destroyed!`)
    } else {
      updatedMonsters[attacker.id] = {
        ...attacker, currentHp: newAttackerHp, state: 'idle', hasActedThisTurn: true, lastAction: 'attack',
      }
    }

    // Update target
    if (newTargetHp <= 0) {
      delete updatedMonsters[target.id]
      newBoard[target.coord.row][target.coord.col] = {
        ...newBoard[target.coord.row][target.coord.col], monsterId: null,
      }
      const tp = state.players[target.owner]
      set(s => ({
        players: { ...s.players, [target.owner]: { ...tp, monsterCount: tp.monsterCount - 1 } },
      }))
      extraLog.push(`💀 ${target.owner}'s ${target.type} was destroyed!`)
    } else {
      const shieldBroke = target.state === 'defending' && result.defenderBreaksShield
      updatedMonsters[target.id] = {
        ...target,
        currentHp: newTargetHp,
        currentDef: result.defenderNewCurrentDef,
        ...(shieldBroke ? { state: 'idle' as const, lastAction: null } : {}),
      }
    }

    // Splash (e.g. Dragon): enemies orthogonally adjacent to the target take reduced
    // damage through the same shield math, but deal no counter-damage back to the attacker.
    const splashMultiplier = MONSTER_TEMPLATES[attacker.type]?.splashDamageMultiplier
    if (splashMultiplier) {
      const splashAttacker = { ...attacker, atk: Math.floor(attacker.atk * splashMultiplier) }
      for (const victimId of getSplashTargets(state.monsters, target)) {
        const victim = updatedMonsters[victimId]
        if (!victim) continue
        const splashResult = resolveCombat(splashAttacker, victim)
        const newVictimHp = victim.currentHp - splashResult.defenderDamage
        if (newVictimHp <= 0) {
          delete updatedMonsters[victimId]
          newBoard[victim.coord.row][victim.coord.col] = {
            ...newBoard[victim.coord.row][victim.coord.col], monsterId: null,
          }
          const vp = state.players[victim.owner]
          set(s => ({
            players: { ...s.players, [victim.owner]: { ...vp, monsterCount: vp.monsterCount - 1 } },
          }))
          extraLog.push(`💀 ${victim.owner}'s ${victim.type} was destroyed by splash!`)
        } else {
          const shieldBroke = victim.state === 'defending' && splashResult.defenderBreaksShield
          updatedMonsters[victimId] = {
            ...victim,
            currentHp: newVictimHp,
            currentDef: splashResult.defenderNewCurrentDef,
            ...(shieldBroke ? { state: 'idle' as const, lastAction: null } : {}),
          }
        }
        extraLog.push(`🔥 splash: ${splashResult.log}`)
      }
    }

    set(s => ({
      board: newBoard,
      monsters: updatedMonsters,
      selectedMonsterId: null,
      pendingAttackTargetId: null,
      isTargetingAbility: false,
      log: [...s.log, result.log, ...extraLog],
    }))
  },

  defendMonster: () => {
    const state = get()
    if (!state.selectedMonsterId) return
    const monster = state.monsters[state.selectedMonsterId]
    if (!monster || monster.owner !== state.activePlayer) return
    if (monster.hasActedThisTurn) return
    if (monster.state === 'summoning') return
    if (!monster.hasMoved) return             // must complete step 1 first
    if (monster.lastAction === 'defend') return // cannot defend twice consecutively

    set(s => ({
      monsters: {
        ...s.monsters,
        [monster.id]: { ...monster, state: 'defending', currentDef: monster.def, hasActedThisTurn: true, lastAction: 'defend' },
      },
      selectedMonsterId: null,
      isTargetingAbility: false,
      log: [...s.log, `${monster.type} defends`],
    }))
  },

  setTargetingAbility: (active) => {
    set({ isTargetingAbility: active })
  },

  useAbility: (targetCoord) => {
    const state = get()
    if (!state.selectedMonsterId) return
    const monster = state.monsters[state.selectedMonsterId]
    if (!monster || monster.owner !== state.activePlayer) return
    if (monster.hasActedThisTurn || monster.state === 'summoning' || !monster.hasMoved) return

    const skillId = getMonsterSkillId(monster.type)
    const ability = skillId ? ABILITY_DEFINITIONS[skillId] : undefined
    if (!ability) return
    if (!isAdjacent(monster.coord, targetCoord)) return

    const targetCell = state.board[targetCoord.row]?.[targetCoord.col]
    if (!targetCell) return

    const template = MONSTER_TEMPLATES[monster.type]
    const newBoard = state.board.map(row => row.map(c => ({ ...c })))
    let actionLog: string

    if (ability.kind === 'create_path') {
      if (targetCell.type !== 'empty') return
      newBoard[targetCoord.row][targetCoord.col] = {
        coord: targetCoord, type: 'path', owner: state.activePlayer, monsterId: null,
      }
      actionLog = `${template.label} creates a path at (${targetCoord.row},${targetCoord.col})`
    } else if (ability.kind === 'destroy_path') {
      if (targetCell.type !== 'path' || targetCell.monsterId !== null) return
      newBoard[targetCoord.row][targetCoord.col] = {
        coord: targetCoord, type: 'empty', owner: null, monsterId: null,
      }
      actionLog = `${template.label} destroys a path at (${targetCoord.row},${targetCoord.col})`
    } else {
      return
    }

    set(s => ({
      board: newBoard,
      monsters: {
        ...s.monsters,
        [monster.id]: { ...monster, state: 'idle', hasActedThisTurn: true, lastAction: 'ability' },
      },
      selectedMonsterId: null,
      isTargetingAbility: false,
      pendingAttackTargetId: null,
      log: [...s.log, actionLog],
    }))
  },

  skipMove: () => {
    const state = get()
    if (!state.selectedMonsterId) return
    const monster = state.monsters[state.selectedMonsterId]
    if (!monster || monster.owner !== state.activePlayer) return
    if (monster.hasMoved || monster.hasActedThisTurn) return
    if (monster.state === 'summoning') return
    set(s => ({
      monsters: { ...s.monsters, [monster.id]: { ...monster, hasMoved: true } },
      log: [...s.log, `${monster.type} stays`],
    }))
  },

  skipCombat: () => {
    const state = get()
    if (!state.selectedMonsterId) return
    const monster = state.monsters[state.selectedMonsterId]
    if (!monster || monster.owner !== state.activePlayer) return
    if (!monster.hasMoved || monster.hasActedThisTurn) return
    set(s => ({
      monsters: { ...s.monsters, [monster.id]: { ...monster, hasActedThisTurn: true } },
      selectedMonsterId: null,
      isTargetingAbility: false,
      log: [...s.log, `${monster.type} skips combat`],
    }))
  },

  doneMonsterActions: () => {
    const state = get()
    const remaining = computeMustActMonsters(state.monsters, state.board, state.activePlayer)
    if (remaining.length > 0) return
    set(s => ({
      phase: 'endTurn', selectedMonsterId: null, isTargetingAbility: false,
      log: [...s.log, `${s.activePlayer} done with actions`],
    }))
  },

  forceEndMonsterActions: () => {
    if (get().phase !== 'monsterActions') return
    set(s => ({
      phase: 'endTurn', selectedMonsterId: null, isTargetingAbility: false,
      log: [...s.log, `${s.activePlayer} ends actions early`],
    }))
  },
}))

// Selectors
export function selectReachableCells(state: GameStore): Coord[] {
  if (!state.selectedMonsterId) return []
  const monster = state.monsters[state.selectedMonsterId]
  if (!monster) return []
  return getReachableCells(state.board, monster, state.monsters)
}

export function selectAttackTargets(state: GameStore): string[] {
  if (!state.selectedMonsterId) return []
  const monster = state.monsters[state.selectedMonsterId]
  if (!monster) return []
  return getAttackTargets(state.monsters, monster)
}

export function selectSummonableCells(state: GameStore): Coord[] {
  if (!state.selectedMonsterTemplateType) return []
  const baseCoord = state.activePlayer === 'player1'
    ? { row: 14, col: 5 } : { row: 0, col: 5 }
  const connected = getConnectedFriendlyPath(state.board, baseCoord, state.activePlayer)
  const result: Coord[] = []
  for (const key of connected) {
    const [r, c] = key.split(',').map(Number)
    const cell = state.board[r][c]
    if (cell.type === 'path' && cell.monsterId === null) {
      result.push({ row: r, col: c })
    }
  }
  return result
}

export function selectMustActMonsters(state: GameStore): Monster[] {
  if (state.phase !== 'monsterActions') return []
  return computeMustActMonsters(state.monsters, state.board, state.activePlayer)
}

export function selectAbilityTargets(state: GameStore): Coord[] {
  if (!state.isTargetingAbility || !state.selectedMonsterId) return []
  const monster = state.monsters[state.selectedMonsterId]
  if (!monster) return []
  const skillId = getMonsterSkillId(monster.type)
  const ability = skillId ? ABILITY_DEFINITIONS[skillId] : undefined
  if (!ability) return []
  return getAbilityTargets(state.board, monster, ability.kind)
}

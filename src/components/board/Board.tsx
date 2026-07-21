import { useState } from 'react'
import { useGameStore, selectReachableCells, selectAttackTargets, selectSummonableCells, selectMustActMonsters, selectAbilityTargets } from '../../store/gameStore'
import { dispatch } from '../../network/dispatch'
import Cell, { type HighlightType } from './Cell'
import BoardEffects from './BoardEffects'
import type { Coord } from '../../types/board'
import { BOARD_ROWS, BOARD_COLS } from '../../constants/board'
import { getPathCells, validatePathPlacement } from '../../game/paths'
import { getSplashTargets } from '../../game/combat'
import { ABILITY_DEFINITIONS, getMonsterSkillId } from '../../constants/abilities'
import { MONSTER_TEMPLATES } from '../../constants/monsters'

export default function Board() {
  const board = useGameStore(s => s.board)
  const monsters = useGameStore(s => s.monsters)
  const phase = useGameStore(s => s.phase)
  const selectedMonsterId = useGameStore(s => s.selectedMonsterId)
  const selectedMonsterTemplateType = useGameStore(s => s.selectedMonsterTemplateType)
  const activePlayer = useGameStore(s => s.activePlayer)
  const generatedPaths = useGameStore(s => s.generatedPaths)
  const selectedPathId = useGameStore(s => s.selectedPathId)
  const rotation = useGameStore(s => s.selectedPathRotation)

  const reachable = useGameStore(selectReachableCells)
  const attackTargets = useGameStore(selectAttackTargets)
  const summonCells = useGameStore(selectSummonableCells)
  const mustActMonsters = useGameStore(selectMustActMonsters)
  const abilityTargets = useGameStore(selectAbilityTargets)
  const isTargetingAbility = useGameStore(s => s.isTargetingAbility)

  const pendingAttackTargetId = useGameStore(s => s.pendingAttackTargetId)

  // Pure UI state — always local
  const setPendingAttackTarget = useGameStore(s => s.setPendingAttackTarget)
  const selectMonster = useGameStore(s => s.selectMonster)
  const inspectMonster = useGameStore(s => s.inspectMonster)

  const [hoverCell, setHoverCell] = useState<Coord | null>(null)

  // --- Path placement ghost ---
  const selectedPath = generatedPaths.find(p => p.id === selectedPathId) ?? null
  let ghostCells: Coord[] = []
  let ghostValid = false
  if (phase === 'placePath' && selectedPath && hoverCell) {
    ghostCells = getPathCells(selectedPath.shape, hoverCell, rotation)
    ghostValid = validatePathPlacement(board, ghostCells, activePlayer)
  }
  const ghostPathSet = new Map(ghostCells.map(c => [`${c.row},${c.col}`, ghostValid]))

  // --- Summon ghost (hover preview of monster being placed) ---
  const summonSet = new Set(summonCells.map(c => `${c.row},${c.col}`))
  const summonHoverKey = phase === 'summonMonster' && selectedMonsterTemplateType && hoverCell
    ? `${hoverCell.row},${hoverCell.col}`
    : null
  const summonGhostKey = summonHoverKey && summonSet.has(summonHoverKey) ? summonHoverKey : null

  const canActSet = new Set(mustActMonsters.map(m => m.id))
  const reachableSet = new Set(reachable.map(c => `${c.row},${c.col}`))
  const selectedMonster = selectedMonsterId ? monsters[selectedMonsterId] : null
  const inMoveStep = selectedMonster && !selectedMonster.hasMoved
  const inCombatStep = selectedMonster && selectedMonster.hasMoved && !selectedMonster.hasActedThisTurn

  const abilityTargetSet = new Set(abilityTargets.map(c => `${c.row},${c.col}`))
  const abilitySkillId = selectedMonster ? getMonsterSkillId(selectedMonster.type) : null
  const abilityKind = abilitySkillId ? ABILITY_DEFINITIONS[abilitySkillId]?.kind : undefined

  // Splash preview: which enemies (besides the pending target) will also be hit
  const pendingTarget = pendingAttackTargetId ? monsters[pendingAttackTargetId] : null
  const splashMultiplier = selectedMonster ? MONSTER_TEMPLATES[selectedMonster.type]?.splashDamageMultiplier : undefined
  const splashTargetIds = splashMultiplier && pendingTarget ? getSplashTargets(monsters, pendingTarget) : []
  const splashTargetSet = new Set(splashTargetIds)

  function getHighlight(coord: Coord, monsterId: string | null): HighlightType {
    const key = `${coord.row},${coord.col}`

    if (phase === 'placePath' && ghostPathSet.has(key)) {
      return ghostPathSet.get(key) ? 'preview-valid' : 'preview-invalid'
    }
    if (phase === 'summonMonster' && summonSet.has(key)) return 'summon'
    if (phase === 'monsterActions') {
      if (inMoveStep && reachableSet.has(key) && !monsterId) return 'reachable'
      if (inCombatStep && isTargetingAbility && abilityTargetSet.has(key)) {
        return abilityKind === 'destroy_path' ? 'ability-destroy' : 'ability-create'
      }
      if (inCombatStep && monsterId && monsterId !== pendingAttackTargetId && splashTargetSet.has(monsterId)) {
        return 'splash-preview'
      }
      if (inCombatStep && monsterId && attackTargets.includes(monsterId)) {
        return monsterId === pendingAttackTargetId ? 'attack-pending' : 'attackable'
      }
      if (monsterId && canActSet.has(monsterId) && monsterId !== selectedMonsterId) return 'can-act'
    }
    return null
  }

  function handleCellClick(coord: Coord) {
    const cell = board[coord.row][coord.col]

    if (phase === 'placePath') {
      if (ghostValid && ghostCells.length > 0 && selectedPathId) {
        dispatch({ type: 'PLACE_PATH', payload: { pathId: selectedPathId, anchor: coord, rotation } })
      }
      return
    }

    if (phase === 'summonMonster') {
      if (summonSet.has(`${coord.row},${coord.col}`) && selectedMonsterTemplateType) {
        dispatch({ type: 'SUMMON_MONSTER', payload: { monsterType: selectedMonsterTemplateType, coord } })
      }
      return
    }

    if (phase === 'monsterActions') {
      const key = `${coord.row},${coord.col}`
      const monsterId = cell.monsterId

      if (selectedMonsterId && inMoveStep && reachableSet.has(key) && !monsterId) {
        dispatch({ type: 'MOVE_MONSTER', payload: { monsterId: selectedMonsterId, targetCoord: coord } })
        return
      }
      if (selectedMonsterId && inCombatStep && isTargetingAbility && abilityTargetSet.has(key)) {
        dispatch({ type: 'USE_ABILITY', payload: { monsterId: selectedMonsterId, targetCoord: coord } })
        return
      }
      if (selectedMonsterId && inCombatStep && monsterId && attackTargets.includes(monsterId)) {
        setPendingAttackTarget(monsterId === pendingAttackTargetId ? null : monsterId)
        inspectMonster(monsterId)
        return
      }
      if (monsterId) {
        const m = monsters[monsterId]
        inspectMonster(monsterId)
        if (m && m.owner === activePlayer && m.state !== 'summoning' && !m.hasActedThisTurn) {
          selectMonster(monsterId === selectedMonsterId ? null : monsterId)
        }
        return
      }
      selectMonster(null)
      inspectMonster(null)
      return
    }

    // Any other phase: clicking a monster opens inspector
    if (cell.monsterId) {
      inspectMonster(cell.monsterId)
    } else {
      inspectMonster(null)
    }
  }

  const trackHover = phase === 'placePath' && selectedPath !== null
    || phase === 'summonMonster' && !!selectedMonsterTemplateType

  return (
    <div
      className="relative border border-gray-600 inline-block"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${BOARD_COLS}, 48px)` }}
      onMouseLeave={() => setHoverCell(null)}
    >
      {Array.from({ length: BOARD_ROWS }, (_, row) =>
        Array.from({ length: BOARD_COLS }, (_, col) => {
          const cell = board[row][col]
          const monster = cell.monsterId ? monsters[cell.monsterId] : null
          const cellKey = `${row},${col}`
          const highlight = getHighlight({ row, col }, cell.monsterId)
          const isSelected = cell.monsterId === selectedMonsterId && selectedMonsterId !== null

          const showSummonGhost = cellKey === summonGhostKey && !monster

          return (
            <Cell
              key={cellKey}
              cell={cell}
              monster={monster}
              highlight={highlight}
              isSelected={isSelected}
              ghostMonsterType={showSummonGhost ? selectedMonsterTemplateType ?? undefined : undefined}
              ghostMonsterOwner={showSummonGhost ? activePlayer : undefined}
              onClick={() => handleCellClick({ row, col })}
              onMouseEnter={trackHover ? () => setHoverCell({ row, col }) : undefined}
            />
          )
        })
      )}
      <BoardEffects />
    </div>
  )
}

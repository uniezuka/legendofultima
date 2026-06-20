import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import type { AiDifficulty } from '../constants/campaign'
import {
  computeBestPathPlacement,
  computeLuckAdjustment,
  computeBestSummon,
  computeBestMove,
  computeBestAttack,
  shouldDefend,
  shouldActRandomly,
} from './ai'

const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms))

const T_SHORT = 350
const T_MED = 650

// Runs the entire AI turn as one continuous async chain.
// Triggered once at the start of the AI's turn (rollDice phase).
// All subsequent phase transitions happen inside this function —
// no reliance on the useEffect re-firing mid-turn.
async function runAiTurn(difficulty: AiDifficulty): Promise<void> {
  const s = () => useGameStore.getState()

  // ── Roll Dice ──────────────────────────────────────────────────────────────
  await delay(T_MED)
  if (s().phase !== 'rollDice' || s().activePlayer !== 'player2') return
  s().rollDice()
  await delay(T_SHORT)
  // Human clicks "Place Path →" to advance; AI must do this explicitly
  s().advancePhase()  // rollDice → placePath

  // ── Place Path ─────────────────────────────────────────────────────────────
  await delay(T_MED)
  if (s().phase !== 'placePath') return

  // Medium/hard: spend luck if it unlocks a path match
  if (difficulty === 'medium' || difficulty === 'hard') {
    const dir = computeLuckAdjustment(s())
    if (dir !== null) {
      s().spendLuck(dir)
      await delay(T_SHORT)
    }
  }

  const placeState = s()
  const hasMatch = placeState.generatedPaths.some(p => p.cost === placeState.currentDiceRoll)

  if (!hasMatch) {
    s().skipPathPlacement()  // → summonMonster; gain luck
  } else {
    const placement = computeBestPathPlacement(placeState)
    if (!placement) {
      s().skipPathPlacement()
    } else {
      s().selectPath(placement.pathId)
      s().setPathRotation(placement.rotation)
      await delay(T_SHORT)
      s().placePathOnBoard(placement.anchor)  // → summonMonster
    }
  }

  // ── Summon Monster ─────────────────────────────────────────────────────────
  await delay(T_MED)
  if (s().phase !== 'summonMonster') return

  // Hard cap on total monsters the AI will keep on the board at once
  const totalMonsterCap = difficulty === 'idle' ? 2 : difficulty === 'easy' ? 3 : 8
  // Per-turn limit (can never exceed totalMonsterCap anyway due to the inner check)
  const maxSummons = totalMonsterCap

  for (let i = 0; i < maxSummons; i++) {
    if (s().phase !== 'summonMonster') break
    if (s().players['player2'].monsterCount >= totalMonsterCap) break
    if (i > 0 && difficulty !== 'idle' && shouldActRandomly(difficulty)) break

    const best = computeBestSummon(s(), difficulty)
    if (!best) break

    await delay(T_MED)
    s().selectMonsterTemplate(best.type)
    await delay(T_SHORT)
    s().summonMonster(best.coord)
  }

  await delay(T_SHORT)
  if (s().phase === 'summonMonster') s().doneSummoning()  // → monsterActions

  // ── Monster Actions ────────────────────────────────────────────────────────
  await delay(T_MED)
  if (s().phase !== 'monsterActions') return

  for (let guard = 0; guard < 32; guard++) {
    const state = s()
    if (state.phase !== 'monsterActions' || state.winner) break

    const unacted = Object.values(state.monsters).filter(
      m => m.owner === 'player2' && m.state !== 'summoning' && !m.hasActedThisTurn,
    )
    if (unacted.length === 0) break

    const monster = unacted[0]

    // Step 1: Move
    await delay(T_MED)
    s().selectMonster(monster.id)
    await delay(T_SHORT)

    if (difficulty !== 'idle' && !shouldActRandomly(difficulty)) {
      const bestMove = computeBestMove(s(), monster)
      bestMove ? s().moveMonster(bestMove) : s().skipMove()
    } else {
      s().skipMove()
    }

    // Monster may have breached the base and been removed
    await delay(T_SHORT)
    if (s().winner || s().phase !== 'monsterActions') break
    if (!s().monsters[monster.id]) continue

    // Step 2: Combat
    await delay(T_MED)
    s().selectMonster(monster.id)
    await delay(T_SHORT)

    if (difficulty !== 'idle' && !shouldActRandomly(difficulty)) {
      const freshMonster = s().monsters[monster.id]
      if (!freshMonster) continue

      const bestTarget = computeBestAttack(s(), freshMonster)
      if (bestTarget) {
        s().setPendingAttackTarget(bestTarget)
        await delay(T_SHORT)
        s().attackTarget(bestTarget)
      } else if (shouldDefend(freshMonster)) {
        s().defendMonster()
      } else {
        s().skipCombat()
      }
    } else {
      s().skipCombat()
    }

    await delay(T_SHORT)
  }

  // ── Done Monster Actions ───────────────────────────────────────────────────
  await delay(T_SHORT)
  if (s().phase === 'monsterActions' && !s().winner) {
    s().doneMonsterActions()  // → endTurn
  }

  // ── End Turn ───────────────────────────────────────────────────────────────
  await delay(T_SHORT)
  if (s().phase === 'endTurn' && !s().winner) {
    s().advancePhase()  // → player1's generateMana (auto-runs)
  }
}

export function useAiController(difficulty: AiDifficulty) {
  const phase = useGameStore(s => s.phase)
  const activePlayer = useGameStore(s => s.activePlayer)
  const aiEnabled = useGameStore(s => s.aiEnabled)
  const winner = useGameStore(s => s.winner)
  const isActing = useRef(false)

  useEffect(() => {
    if (!aiEnabled) return
    if (winner) return
    if (activePlayer !== 'player2') return
    // Fire only at the very start of the AI's turn; the async chain handles everything else
    if (phase !== 'rollDice') return
    if (isActing.current) return

    isActing.current = true
    runAiTurn(difficulty).finally(() => {
      isActing.current = false
    })
  }, [phase, activePlayer, aiEnabled, winner, difficulty])
}

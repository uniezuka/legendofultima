import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { playSfx } from '../audio/audioManager'
import type { Cell } from '../types/board'

function countNonEmptyCells(board: Cell[][]): number {
  let count = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell.type !== 'empty') count++
    }
  }
  return count
}

// Fires one-shot SFX by diffing typed gameStore fields against the previous
// render — the same technique BoardEffects.tsx uses for kill/base-hit flashes,
// for the same reason: it must fire identically whether state changed via a
// local store call (offline) or arrived fully-formed from the server (online PvP).
export default function useGameAudio() {
  const monsters = useGameStore(s => s.monsters)
  const players = useGameStore(s => s.players)
  const board = useGameStore(s => s.board)
  const currentDiceRoll = useGameStore(s => s.currentDiceRoll)

  const prevMonstersRef = useRef(monsters)
  const prevPlayersRef = useRef(players)
  const prevBoardRef = useRef(board)
  const prevDiceRef = useRef(currentDiceRoll)

  useEffect(() => {
    const prevMonsters = prevMonstersRef.current
    const prevPlayers = prevPlayersRef.current
    const prevBoard = prevBoardRef.current
    const prevDice = prevDiceRef.current

    if (currentDiceRoll !== null && currentDiceRoll !== prevDice) {
      playSfx('dice-roll')
    }

    if (countNonEmptyCells(board) > countNonEmptyCells(prevBoard)) {
      playSfx('path-place')
    }

    let baseWasHit = false
    for (const pid of ['player1', 'player2'] as const) {
      const p = players[pid]
      const pp = prevPlayers[pid]
      if (p.baseHp < pp.baseHp) { playSfx('base-hit'); baseWasHit = true }
      if (p.luck > pp.luck) playSfx('path-skip')
      if (p.mana > pp.mana) playSfx('mana-gain')
    }

    // A breach removes the attacking monster in the same update that drops
    // baseHp — treat that as a base hit, not a monster death (mirrors BoardEffects.tsx).
    if (!baseWasHit) {
      for (const id in prevMonsters) {
        if (!(id in monsters)) playSfx('death')
      }
    }

    for (const id in monsters) {
      const m = monsters[id]
      const pm = prevMonsters[id]

      if (!pm) {
        if (m.state === 'summoning') playSfx('summon')
        continue
      }

      if (m.coord.row !== pm.coord.row || m.coord.col !== pm.coord.col) {
        playSfx('move')
      }

      if (m.state === 'defending' && pm.state !== 'defending') {
        playSfx('shield-up')
      }

      if (pm.state === 'defending') {
        if (m.currentDef === 0 && pm.currentDef > 0) playSfx('shield-break')
        else if (m.currentDef < pm.currentDef) playSfx('attack-hit')
      } else if (m.currentHp < pm.currentHp) {
        playSfx('attack-hit')
      }
    }

    prevMonstersRef.current = monsters
    prevPlayersRef.current = players
    prevBoardRef.current = board
    prevDiceRef.current = currentDiceRoll
  }, [monsters, players, board, currentDiceRoll])
}

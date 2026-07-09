import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { P1_BASE_ROWS, P2_BASE_ROWS, BASE_COLS } from '../../constants/board'

interface Effect {
  id: string
  row: number
  col: number
  kind: 'kill' | 'base-hit'
}

let effectSeq = 0

// Detects monster deaths and base breaches by diffing state against the
// previous render — the only approach that works for both offline (local
// store mutation) and online (state arrives fully-formed from the server).
export default function BoardEffects() {
  const monsters = useGameStore(s => s.monsters)
  const players = useGameStore(s => s.players)

  const prevMonstersRef = useRef(monsters)
  const prevPlayersRef = useRef(players)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const [effects, setEffects] = useState<Effect[]>([])

  // Clear pending removal timers only on unmount — each timer is independent
  // and must not be cancelled just because another kill/breach happens first.
  useEffect(() => () => { timersRef.current.forEach(clearTimeout) }, [])

  useEffect(() => {
    const prevMonsters = prevMonstersRef.current
    const prevPlayers = prevPlayersRef.current
    const spawned: Effect[] = []

    // A breach removes the attacking monster in the same update that drops
    // baseHp — treat that update as a base hit, not a monster kill, so the
    // effect lands on the base tile instead of the tile the monster left.
    if (players.player1.baseHp < prevPlayers.player1.baseHp) {
      spawned.push({ id: `fx-${effectSeq++}`, row: P1_BASE_ROWS[0], col: BASE_COLS[0], kind: 'base-hit' })
    } else if (players.player2.baseHp < prevPlayers.player2.baseHp) {
      spawned.push({ id: `fx-${effectSeq++}`, row: P2_BASE_ROWS[0], col: BASE_COLS[0], kind: 'base-hit' })
    } else {
      for (const id in prevMonsters) {
        if (!(id in monsters)) {
          const dead = prevMonsters[id]
          spawned.push({ id: `fx-${effectSeq++}`, row: dead.coord.row, col: dead.coord.col, kind: 'kill' })
        }
      }
    }

    prevMonstersRef.current = monsters
    prevPlayersRef.current = players

    if (spawned.length === 0) return
    setEffects(cur => [...cur, ...spawned])
    spawned.forEach(e => {
      timersRef.current.push(setTimeout(() => {
        setEffects(cur => cur.filter(x => x.id !== e.id))
      }, 700))
    })
  }, [monsters, players])

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {effects.map(e => (
        <div
          key={e.id}
          className="absolute flex items-center justify-center overflow-hidden rounded-sm"
          style={{ top: e.row * 48, left: e.col * 48, width: 48, height: 48 }}
        >
          <div className={`absolute inset-0 ${e.kind === 'kill' ? 'lou-kill-flash' : 'lou-base-flash'}`} />
          <span className={e.kind === 'kill' ? 'lou-kill-icon text-2xl' : 'lou-base-icon text-3xl'}>
            {e.kind === 'kill' ? '💥' : '🔥'}
          </span>
        </div>
      ))}
    </div>
  )
}

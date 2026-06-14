import { useGameStore } from '../../store/gameStore'
import type { TurnPhase } from '../../types/game'

const PHASES: { id: TurnPhase; label: string }[] = [
  { id: 'generateMana',   label: '1.Mana'    },
  { id: 'generatePaths',  label: '2.Paths'   },
  { id: 'rollDice',       label: '3.Roll'    },
  { id: 'placePath',      label: '4.Place'   },
  { id: 'summonMonster',  label: '5.Summon'  },
  { id: 'monsterActions', label: '6.Actions' },
  { id: 'endTurn',        label: '7.End'     },
]

export default function TurnPhaseBar() {
  const phase = useGameStore(s => s.phase)
  const turn = useGameStore(s => s.turnNumber)
  const activePlayer = useGameStore(s => s.activePlayer)

  const isP1 = activePlayer === 'player1'
  const playerLabel = isP1 ? 'P1 Blue' : 'P2 Red'
  const playerColor = isP1 ? 'text-blue-400' : 'text-red-400'

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 border-b border-gray-600">
      <span className="text-gray-500 text-[10px] mr-1 whitespace-nowrap">T{turn}</span>
      <span className={`text-[10px] font-bold mr-2 whitespace-nowrap ${playerColor}`}>{playerLabel}</span>
      {PHASES.map(p => {
        const isActive = p.id === phase
        return (
          <div key={p.id}
            className={`px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap ${
              isActive ? 'bg-yellow-500 text-black font-bold' : 'text-gray-600 bg-gray-700'
            }`}>
            {p.label}
          </div>
        )
      })}
    </div>
  )
}

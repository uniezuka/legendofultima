import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useCampaignStore } from '../../store/campaignStore'
import { useOnlineStore } from '../../store/onlineStore'
import { emitQuit } from '../../network/socket'
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
  const winner = useGameStore(s => s.winner)
  const resetGame = useGameStore(s => s.resetGame)
  const returnToTitle = useCampaignStore(s => s.returnToTitle)
  const { isOnline, myPlayerId } = useOnlineStore()

  const [showQuitConfirm, setShowQuitConfirm] = useState(false)

  const isP1 = activePlayer === 'player1'
  const playerLabel = isP1 ? 'P1 Blue' : 'P2 Red'
  const playerColor = isP1 ? 'text-blue-400' : 'text-red-400'
  // In multiplayer, only the player whose turn it is may quit — mirrors the server's turn gate
  const canQuit = !isOnline || myPlayerId === activePlayer

  function handleQuitConfirm() {
    setShowQuitConfirm(false)
    if (isOnline) {
      emitQuit()
    } else {
      resetGame()
      returnToTitle()
    }
  }

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

      {!winner && canQuit && (
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="ml-auto px-2 py-0.5 bg-gray-700 hover:bg-red-800 text-gray-400 hover:text-white text-[10px] font-bold rounded whitespace-nowrap"
        >
          ✕ Quit
        </button>
      )}

      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 border border-red-500 rounded-lg p-5 w-80 shadow-2xl flex flex-col gap-3">
            <p className="text-red-400 font-bold text-sm">Quit Match?</p>
            <p className="text-gray-300 text-xs">
              {isOnline
                ? 'You will forfeit the match and your opponent will be declared the winner.'
                : 'You will return to the main menu. Progress in this match will be lost.'}
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleQuitConfirm}
                className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded font-bold"
              >
                {isOnline ? 'Forfeit' : 'Quit'}
              </button>
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

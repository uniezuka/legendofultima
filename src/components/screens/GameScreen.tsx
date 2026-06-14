import { useGameStore } from '../../store/gameStore'
import Board from '../board/Board'
import TurnPhaseBar from '../hud/TurnPhaseBar'
import SidePanel from '../hud/SidePanel'
import MonsterInspector from '../board/MonsterInspector'

function VictoryOverlay() {
  const winner = useGameStore(s => s.winner)
  const resetGame = useGameStore(s => s.resetGame)
  if (!winner) return null

  const isP1 = winner === 'player1'
  const bg = isP1 ? 'bg-blue-900/95' : 'bg-red-900/95'
  const label = isP1 ? 'Player 1 (Blue) Wins!' : 'Player 2 (Red) Wins!'

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      <div className={`${bg} border-2 ${isP1 ? 'border-blue-400' : 'border-red-400'} rounded-xl p-10 flex flex-col items-center gap-6 shadow-2xl`}>
        <div className="text-5xl font-black text-yellow-400">⚔ Victory!</div>
        <div className="text-2xl font-bold text-white">{label}</div>
        <button
          onClick={resetGame}
          className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-lg text-lg"
        >
          Main Menu
        </button>
      </div>
    </div>
  )
}

function ActionLog() {
  const log = useGameStore(s => s.log)
  const recent = log.slice(-5)
  return (
    <div className="bg-gray-950 border-t border-gray-700 px-3 py-1.5 h-[72px] overflow-y-auto flex-shrink-0">
      {recent.map((entry, i) => (
        <div key={i} className="text-gray-500 text-[10px] leading-snug">{entry}</div>
      ))}
    </div>
  )
}

export default function GameScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-start justify-center relative">
      <div className="flex flex-row relative">

        {/* Left: Player 1 (Blue) */}
        <SidePanel playerId="player1" />

        {/* Center: Turn bar + Board + Log */}
        <div className="flex flex-col flex-shrink-0">
          <TurnPhaseBar />
          <div className="overflow-auto relative">
            <Board />
            <MonsterInspector />
          </div>
          <ActionLog />
        </div>

        {/* Right: Player 2 (Red) */}
        <SidePanel playerId="player2" />

        <VictoryOverlay />
      </div>
    </div>
  )
}

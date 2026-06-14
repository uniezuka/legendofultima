import { useGameStore } from '../../store/gameStore'

export default function TitleScreen() {
  const startGame = useGameStore(s => s.startGame)

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-6xl font-black text-yellow-400 mb-2 tracking-wide drop-shadow-lg">
          LEGEND OF ULTIMA
        </h1>
        <p className="text-gray-400 text-lg">A Tactical Path-Building Board Game</p>
      </div>

      <div className="flex flex-col items-center gap-3 text-gray-300 text-sm max-w-md text-center">
        <p>Build magical paths with dice rolls. Summon monsters. Breach the enemy base <span className="text-red-400 font-bold">3 times</span> to win.</p>
        <p className="text-gray-500">Player 1 (Blue) vs Player 2 (Red) — 2-player local</p>
      </div>

      <button
        onClick={startGame}
        className="px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-xl font-black rounded-lg transition-colors shadow-lg"
      >
        ⚔ Start Game
      </button>

      <div className="text-gray-600 text-xs text-center max-w-sm">
        <p>Turn: Mana → Paths → Roll → Place → Summon → Actions → End</p>
      </div>
    </div>
  )
}

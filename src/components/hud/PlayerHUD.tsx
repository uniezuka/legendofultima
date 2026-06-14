import { useGameStore } from '../../store/gameStore'
import type { PlayerId } from '../../types/game'

interface Props {
  playerId: PlayerId
}

export default function PlayerHUD({ playerId }: Props) {
  const player = useGameStore(s => s.players[playerId])
  const activePlayer = useGameStore(s => s.activePlayer)
  const isActive = activePlayer === playerId
  const isP1 = playerId === 'player1'

  const borderColor = isP1 ? 'border-blue-500' : 'border-red-500'
  const labelColor = isP1 ? 'text-blue-300' : 'text-red-300'
  const activeBg = isActive ? (isP1 ? 'bg-blue-900/50' : 'bg-red-900/50') : 'bg-gray-900/50'

  return (
    <div className={`flex items-center gap-4 px-4 py-2 border-b ${borderColor} ${activeBg}`}>
      <span className={`font-bold text-sm ${labelColor}`}>
        {isP1 ? 'Player 1 (Blue)' : 'Player 2 (Red)'}
        {isActive && <span className="ml-2 text-yellow-300 text-xs">▶ ACTIVE</span>}
      </span>

      {/* Base HP */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400 text-xs">Base:</span>
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} className={`text-lg ${i < player.baseHp ? 'text-red-400' : 'text-gray-700'}`}>♥</span>
        ))}
      </div>

      {/* Mana */}
      <div className="flex items-center gap-1">
        <span className="text-blue-300 text-xs">Mana:</span>
        <span className="text-white font-mono font-bold">{player.mana}</span>
      </div>

      {/* Luck */}
      <div className="flex items-center gap-1">
        <span className="text-yellow-300 text-xs">Luck:</span>
        <span className="text-white font-mono font-bold">{player.luck}</span>
      </div>

      {/* Monster count */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400 text-xs">Monsters:</span>
        <span className="text-white font-mono">{player.monsterCount}/8</span>
      </div>
    </div>
  )
}

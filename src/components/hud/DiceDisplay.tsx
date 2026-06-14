import { useGameStore } from '../../store/gameStore'
import { LUCK_SPEND_COST } from '../../constants/board'

export default function DiceDisplay() {
  const phase = useGameStore(s => s.phase)
  const roll = useGameStore(s => s.currentDiceRoll)
  const activePlayer = useGameStore(s => s.activePlayer)
  const luck = useGameStore(s => s.players[activePlayer].luck)
  const rollDice = useGameStore(s => s.rollDice)
  const spendLuck = useGameStore(s => s.spendLuck)
  const advancePhase = useGameStore(s => s.advancePhase)

  if (phase !== 'rollDice') return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-600">
      <span className="text-gray-300 text-sm font-semibold">Dice Roll:</span>

      {roll === null ? (
        <button
          onClick={rollDice}
          className="px-4 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold"
        >
          🎲 Roll
        </button>
      ) : (
        <>
          <span className="text-4xl font-bold text-yellow-300 w-10 text-center">{roll}</span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => spendLuck(-1)}
              disabled={luck < LUCK_SPEND_COST || roll <= 1}
              className="px-2 py-0.5 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white text-sm rounded"
              title="Spend 3 luck: -1"
            >
              −1
            </button>
            <button
              onClick={() => spendLuck(1)}
              disabled={luck < LUCK_SPEND_COST || roll >= 6}
              className="px-2 py-0.5 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white text-sm rounded"
              title="Spend 3 luck: +1"
            >
              +1
            </button>
            <span className="text-yellow-400 text-xs ml-1">({luck} luck)</span>
          </div>

          <button
            onClick={advancePhase}
            className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded font-bold"
          >
            Place Path →
          </button>
        </>
      )}
    </div>
  )
}

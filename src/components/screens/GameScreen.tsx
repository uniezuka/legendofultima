import { useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useCampaignStore } from '../../store/campaignStore'
import { useAiController } from '../../game/useAiController'
import { CAMPAIGN_STAGES } from '../../constants/campaign'
import type { AiDifficulty } from '../../constants/campaign'
import Board from '../board/Board'
import TurnPhaseBar from '../hud/TurnPhaseBar'
import SidePanel from '../hud/SidePanel'
import MonsterInspector from '../board/MonsterInspector'

// ── AI Controller (renders nothing, drives AI turns via side effects) ────────
function AiDriver({ difficulty }: { difficulty: AiDifficulty }) {
  useAiController(difficulty)
  return null
}

// ── Campaign Victory Overlay ─────────────────────────────────────────────────
function CampaignResultOverlay() {
  const winner = useGameStore(s => s.winner)
  const resetGame = useGameStore(s => s.resetGame)
  const { currentStage, unlockNextStage, goToNextStageIntro, selectStage, returnToTitle } = useCampaignStore()

  const stage = CAMPAIGN_STAGES[currentStage - 1]
  const isWin = winner === 'player1'
  const isLoss = winner === 'player2'

  // Unlock next stage as soon as player wins
  useEffect(() => {
    if (isWin) unlockNextStage()
  }, [isWin, unlockNextStage])

  if (!winner || !stage) return null

  const hasNextStage = currentStage < CAMPAIGN_STAGES.length

  function handleNextStage() {
    resetGame()
    goToNextStageIntro()
  }

  function handleRetry() {
    resetGame()
    selectStage(currentStage)
  }

  function handleMenu() {
    resetGame()
    returnToTitle()
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      <div className={`${isWin ? 'bg-blue-900/95 border-blue-400' : 'bg-red-900/95 border-red-500'} border-2 rounded-xl p-10 flex flex-col items-center gap-5 shadow-2xl max-w-sm w-full mx-4`}>
        <div className="text-4xl font-black text-yellow-400">
          {isWin ? '⚔ Victory!' : '💀 Defeated'}
        </div>

        <div className="text-center">
          <div className="text-white font-bold text-lg mb-1">{stage.name}</div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {isWin ? stage.victoryOutro : stage.defeatOutro}
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {isWin && hasNextStage && (
            <button
              onClick={handleNextStage}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-lg transition-colors"
            >
              Next Stage →
            </button>
          )}
          {isWin && !hasNextStage && (
            <div className="text-center text-yellow-300 font-bold text-sm py-2">
              🏆 Campaign Complete!
            </div>
          )}
          {isLoss && (
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-lg transition-colors"
            >
              Retry Stage
            </button>
          )}
          <button
            onClick={handleMenu}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-lg transition-colors text-sm"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PvP Victory Overlay (original behavior) ──────────────────────────────────
function PvpResultOverlay() {
  const winner = useGameStore(s => s.winner)
  const resetGame = useGameStore(s => s.resetGame)
  const returnToTitle = useCampaignStore(s => s.returnToTitle)

  if (!winner) return null

  const isP1 = winner === 'player1'
  const bg = isP1 ? 'bg-blue-900/95' : 'bg-red-900/95'
  const border = isP1 ? 'border-blue-400' : 'border-red-400'
  const label = isP1 ? 'Player 1 (Blue) Wins!' : 'Player 2 (Red) Wins!'

  function handleMenu() {
    resetGame()
    returnToTitle()
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      <div className={`${bg} border-2 ${border} rounded-xl p-10 flex flex-col items-center gap-6 shadow-2xl`}>
        <div className="text-5xl font-black text-yellow-400">⚔ Victory!</div>
        <div className="text-2xl font-bold text-white">{label}</div>
        <button
          onClick={handleMenu}
          className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-lg text-lg"
        >
          Main Menu
        </button>
      </div>
    </div>
  )
}

// ── Action Log ───────────────────────────────────────────────────────────────
function ActionLog() {
  const recent = useGameStore(
    s => s.log.slice(-5),
    (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
  )
  return (
    <div className="bg-gray-950 border-t border-gray-700 px-3 py-1.5 h-[72px] overflow-y-auto flex-shrink-0">
      {recent.map((entry, i) => (
        <div key={i} className="text-gray-500 text-[10px] leading-snug">{entry}</div>
      ))}
    </div>
  )
}

// ── Game Screen ──────────────────────────────────────────────────────────────
export default function GameScreen() {
  const gameMode = useGameStore(s => s.gameMode)
  const aiEnabled = useGameStore(s => s.aiEnabled)
  const currentStage = useCampaignStore(s => s.currentStage)

  const stage = CAMPAIGN_STAGES[currentStage - 1]
  const difficulty: AiDifficulty = stage?.difficulty ?? 'easy'

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center relative">
      {aiEnabled && <AiDriver difficulty={difficulty} />}

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

        {/* Overlay */}
        {gameMode === 'campaign' ? <CampaignResultOverlay /> : <PvpResultOverlay />}
      </div>
    </div>
  )
}

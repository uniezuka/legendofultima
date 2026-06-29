import { useCampaignStore } from '../../store/campaignStore'
import { useGameStore } from '../../store/gameStore'
import { CAMPAIGN_STAGES } from '../../constants/campaign'

const DIFFICULTY_LABEL: Record<string, string> = {
  passive: 'Tutorial',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

const DIFFICULTY_COLOR: Record<string, string> = {
  passive: 'text-gray-400',
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400',
}

export default function StageIntroScreen() {
  const { currentStage, goToCampaignSelect } = useCampaignStore()
  const startCampaignMatch = useGameStore(s => s.startCampaignMatch)

  const stage = CAMPAIGN_STAGES[currentStage - 1]
  if (!stage) return null

  function handleBegin() {
    startCampaignMatch(stage.aiStartingMana)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 relative overflow-hidden"
      style={{ backgroundImage: 'url(/assets/ui/title-bg.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />
      <div className="relative z-10 w-full max-w-lg flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm font-mono">Stage {stage.id} of {CAMPAIGN_STAGES.length}</span>
          <span className={`text-sm font-semibold ${DIFFICULTY_COLOR[stage.difficulty]}`}>
            {DIFFICULTY_LABEL[stage.difficulty]}
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-black text-yellow-400 leading-tight">{stage.name}</h1>
        </div>

        {/* Story text */}
        <div className="bg-gray-800/90 border border-gray-700 rounded-lg p-5">
          <p className="text-gray-300 text-sm leading-relaxed">{stage.intro}</p>
        </div>

        {/* Combatants */}
        <div className="flex gap-4 text-sm">
          <div className="flex-1 bg-blue-900/40 border border-blue-800 rounded-lg p-3 text-center">
            <div className="text-blue-400 font-bold">You</div>
            <div className="text-gray-400 text-xs mt-0.5">Player (Blue)</div>
          </div>
          <div className="flex items-center text-gray-500 font-black text-lg">VS</div>
          <div className="flex-1 bg-red-900/40 border border-red-800 rounded-lg p-3 text-center">
            <div className="text-red-400 font-bold">Dark Forces</div>
            <div className="text-gray-400 text-xs mt-0.5">CPU (Red)</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={goToCampaignSelect}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg transition-colors text-sm"
          >
            ← Stage Select
          </button>
          <button
            onClick={handleBegin}
            className="flex-[2] py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-lg transition-colors text-base"
          >
            ⚔ Begin Battle
          </button>
        </div>
      </div>
    </div>
  )
}

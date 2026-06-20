import { useCampaignStore } from '../../store/campaignStore'
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

export default function CampaignScreen() {
  const { highestUnlocked, selectStage, returnToTitle } = useCampaignStore()

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-start pt-10 pb-16 gap-8 px-6">
      <div className="text-center">
        <h1 className="text-4xl font-black text-yellow-400 tracking-wide">Campaign</h1>
        <p className="text-gray-500 text-sm mt-1">Select a stage to begin</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
        {CAMPAIGN_STAGES.map(stage => {
          const unlocked = stage.id <= highestUnlocked
          const completed = stage.id < highestUnlocked

          return (
            <button
              key={stage.id}
              disabled={!unlocked}
              onClick={() => unlocked && selectStage(stage.id)}
              className={[
                'relative flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors',
                unlocked
                  ? 'border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-yellow-500 cursor-pointer'
                  : 'border-gray-700 bg-gray-900 cursor-not-allowed opacity-40',
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs font-mono">Stage {stage.id}</span>
                <span className={`text-xs font-semibold ${DIFFICULTY_COLOR[stage.difficulty]}`}>
                  {DIFFICULTY_LABEL[stage.difficulty]}
                </span>
              </div>
              <span className="text-white font-bold text-sm leading-snug">{stage.name}</span>
              {!unlocked && (
                <span className="text-gray-600 text-xs mt-1">🔒 Locked</span>
              )}
              {completed && (
                <span className="absolute top-2 right-2 text-yellow-400 text-xs">✓</span>
              )}
            </button>
          )
        })}
      </div>

      <button
        onClick={returnToTitle}
        className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        ← Back to Title
      </button>
    </div>
  )
}

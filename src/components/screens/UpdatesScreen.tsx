import { useCampaignStore } from '../../store/campaignStore'
import { UPDATE_HISTORY } from '../../constants/updates'

export default function UpdatesScreen() {
  const returnToTitle = useCampaignStore(s => s.returnToTitle)

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: 'url(/assets/ui/title-bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-4 py-8 min-h-screen">

        <div className="w-full max-w-lg flex items-center justify-between mb-12">
          <button
            onClick={returnToTitle}
            className="text-gray-400 hover:text-gray-200 text-sm font-semibold transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-yellow-400 text-2xl font-black drop-shadow">Updates</h1>
          <div className="w-16" />
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
          {UPDATE_HISTORY.map((entry, i) => (
            <div
              key={entry.version}
              className={
                i === 0
                  ? 'w-full rounded-xl border-2 border-yellow-600/50 bg-yellow-950/40 px-8 py-8 flex flex-col items-center gap-3 text-center'
                  : 'w-full rounded-xl border border-gray-700/50 bg-gray-900/40 px-8 py-6 flex flex-col items-center gap-2 text-center'
              }
            >
              <p className={i === 0 ? 'text-yellow-300 text-2xl font-black' : 'text-gray-300 text-lg font-bold'}>
                {entry.version}
              </p>
              <p className="text-gray-400 text-sm">{entry.date}</p>
              <p className="text-gray-500 text-sm mt-2">{entry.summary}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

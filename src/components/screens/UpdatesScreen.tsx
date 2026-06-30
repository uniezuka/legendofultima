import { useCampaignStore } from '../../store/campaignStore'

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

        <div className="w-full max-w-sm rounded-xl border-2 border-yellow-600/50 bg-yellow-950/40 px-8 py-8 flex flex-col items-center gap-3 text-center">
          <p className="text-yellow-300 text-2xl font-black">Alpha v0.1.0</p>
          <p className="text-gray-400 text-sm">July 1, 2026</p>
          <p className="text-gray-500 text-sm mt-2">Full campaign · Online PvP · Save system</p>
        </div>

      </div>
    </div>
  )
}

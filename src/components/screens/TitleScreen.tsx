import { useGameStore } from '../../store/gameStore'
import { useCampaignStore } from '../../store/campaignStore'

export default function TitleScreen() {
  const startGame = useGameStore(s => s.startGame)
  const goToCampaignSelect = useCampaignStore(s => s.goToCampaignSelect)

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/assets/ui/title-bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <img
            src="/assets/ui/logo.svg"
            alt="Legend of Ultima"
            className="w-96 max-w-full drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
            draggable={false}
          />
          <p className="text-gray-300 text-base drop-shadow">A Tactical Path-Building Board Game</p>
        </div>

        <div className="text-gray-300 text-sm max-w-md text-center drop-shadow px-4">
          <p>Build magical paths with dice rolls. Summon monsters. Breach the enemy base <span className="text-red-400 font-bold">3 times</span> to win.</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={goToCampaignSelect}
            className="px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-xl font-black rounded-lg transition-colors shadow-lg w-64 border-2 border-yellow-300"
          >
            ⚔ Campaign
          </button>
          <button
            onClick={startGame}
            className="px-10 py-3 bg-gray-800/80 hover:bg-gray-700 text-gray-200 text-base font-bold rounded-lg transition-colors shadow w-64 border border-gray-600"
          >
            2-Player Local
          </button>
        </div>

        <div className="text-gray-500 text-xs text-center max-w-sm drop-shadow">
          <p>Turn: Mana → Paths → Roll → Place → Summon → Actions → End</p>
        </div>
      </div>
    </div>
  )
}

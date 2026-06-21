import { useRef, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useCampaignStore } from '../../store/campaignStore'

// Renders logo.png with its baked-in checkerboard background stripped out.
// Pixels that are near-white AND near-neutral (r≈g≈b > 190) are made transparent.
// This preserves gold, blue, and stone colors which all have uneven channel values.
function LogoCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2]
        const avg = (r + g + b) / 3
        const isNearWhite = r > 190 && g > 190 && b > 190
        const isNeutral = Math.abs(r - avg) < 25 && Math.abs(g - avg) < 25 && Math.abs(b - avg) < 25
        if (isNearWhite && isNeutral) {
          // Gradually fade: fully opaque at 190, fully transparent at 255
          d[i + 3] = Math.round(Math.max(0, 1 - (avg - 190) / 65) * 255)
        }
      }
      ctx.putImageData(imageData, 0, 0)
    }
    img.src = '/assets/ui/logo.png'
  }, [])

  return <canvas ref={canvasRef} className={className} />
}

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
          <LogoCanvas className="w-96 max-w-full drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]" />
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

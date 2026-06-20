import type { Monster } from '../../types/monster'

const SPRITE_FILE: Record<string, string> = {
  summoning: 'idle.png',
  idle:      'idle.png',
  defending: 'idle.png',
}

const STATE_ICON: Record<string, { icon: string; title: string } | null> = {
  summoning: { icon: '💤', title: 'Summoning (acts next turn)' },
  idle:      null,
  defending: null,
}

const OWNER_TINT: Record<string, string> = {
  player1: 'bg-blue-500/25',
  player2: 'bg-red-500/25',
}

interface Props {
  monster: Monster
  isSelected: boolean
}

export default function MonsterToken({ monster, isSelected }: Props) {
  const hpPct = (monster.currentHp / monster.maxHp) * 100
  const barColor = hpPct > 60 ? 'bg-green-400' : hpPct > 30 ? 'bg-yellow-400' : 'bg-red-500'

  const stateInfo = STATE_ICON[monster.state]
  const spritePath = `/assets/monsters/${monster.type}/${SPRITE_FILE[monster.state]}`
  const ownerTint = OWNER_TINT[monster.owner]

  const selectedRing = isSelected
    ? 'ring-2 ring-white shadow-[0_0_6px_2px_rgba(255,255,255,0.7)]'
    : ''

  const isDefending = monster.state === 'defending'
  const defPct = (monster.currentDef / monster.def) * 100

  return (
    <div
      className={`absolute inset-0.5 rounded ${selectedRing} overflow-hidden`}
      title={`${monster.type} — ${monster.state}${stateInfo ? ` (${stateInfo.title})` : ''}`}
    >
      {/* Monster sprite — blue faces right, red faces left (as drawn) */}
      <img
        src={spritePath}
        alt={monster.type}
        className="absolute inset-0 w-full h-full object-contain"
        style={monster.owner === 'player1' ? { transform: 'scaleX(-1)' } : undefined}
        draggable={false}
      />

      {/* Subtle owner color tint */}
      <div className={`absolute inset-0 ${ownerTint} pointer-events-none`} />

      {/* State icon */}
      {stateInfo && (
        <span className="absolute top-0.5 right-0.5 text-[10px] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {stateInfo.icon}
        </span>
      )}

      {/* HP bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900/70">
        <div className={`h-1 ${barColor}`} style={{ width: `${hpPct}%` }} />
      </div>

      {/* DEF bar (above HP bar when defending) */}
      {isDefending && (
        <div className="absolute bottom-1 left-0 right-0 h-1 bg-gray-900/70">
          <div className="h-1 bg-cyan-400" style={{ width: `${defPct}%` }} />
        </div>
      )}

      {/* Centered shield overlay when defending */}
      {isDefending && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">🛡</span>
        </div>
      )}
    </div>
  )
}

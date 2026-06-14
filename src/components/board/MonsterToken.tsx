import type { Monster } from '../../types/monster'

const TYPE_INITIALS: Record<string, string> = {
  slime: 'Sl', goblin: 'Go', archer: 'Ar', knight: 'Kn', dragon: 'Dr',
}

// Unicode icons for each state
const STATE_ICON: Record<string, { icon: string; color: string; title: string } | null> = {
  summoning: { icon: '💤', color: 'text-gray-300', title: 'Summoning (acts next turn)' },
  idle:      null,
  defending: { icon: '🛡', color: 'text-cyan-300', title: 'Defending' },
}

interface Props {
  monster: Monster
  isSelected: boolean
}

export default function MonsterToken({ monster, isSelected }: Props) {
  const hpPct = (monster.currentHp / monster.maxHp) * 100
  const barColor = hpPct > 60 ? 'bg-green-400' : hpPct > 30 ? 'bg-yellow-400' : 'bg-red-500'
  const ownerBg = monster.owner === 'player1' ? 'bg-blue-600' : 'bg-red-600'

  const stateInfo = STATE_ICON[monster.state]

  // Selected: bright white ring + slightly lighter background
  const selectedRing = isSelected
    ? 'ring-2 ring-white shadow-[0_0_6px_2px_rgba(255,255,255,0.7)]'
    : ''
  const selectedBg = isSelected
    ? monster.owner === 'player1' ? 'bg-blue-400' : 'bg-red-400'
    : ownerBg

  const isDefending = monster.state === 'defending'
  const defPct = (monster.currentDef / monster.def) * 100

  return (
    <div
      className={`absolute inset-0.5 rounded flex flex-col items-center justify-center ${selectedBg} ${selectedRing} overflow-hidden`}
      title={`${monster.type} — ${monster.state}${stateInfo ? ` (${stateInfo.title})` : ''}`}
    >
      <span className="text-white text-xs font-bold leading-none">{TYPE_INITIALS[monster.type]}</span>

      {stateInfo && (
        <span className="text-[11px] leading-none" title={stateInfo.title}>
          {stateInfo.icon}
        </span>
      )}

      <div className="w-full h-1 bg-gray-700 mt-0.5">
        <div className={`h-1 ${barColor}`} style={{ width: `${hpPct}%` }} />
      </div>

      {isDefending && (
        <div className="w-full h-1 bg-gray-700 mt-px">
          <div className="h-1 bg-cyan-400" style={{ width: `${defPct}%` }} />
        </div>
      )}
    </div>
  )
}

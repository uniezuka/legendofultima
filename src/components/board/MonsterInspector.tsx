import { useGameStore } from '../../store/gameStore'
import { MONSTER_TEMPLATES } from '../../constants/monsters'

const STATE_LABEL: Record<string, string> = {
  summoning: '💤 Summoning',
  idle: '● Idle',
  defending: '🛡 Defending',
}

export default function MonsterInspector() {
  const inspectedMonsterId = useGameStore(s => s.inspectedMonsterId)
  const monsters = useGameStore(s => s.monsters)
  const inspectMonster = useGameStore(s => s.inspectMonster)

  if (!inspectedMonsterId) return null
  const m = monsters[inspectedMonsterId]
  if (!m) return null

  const isP1 = m.owner === 'player1'
  const hpPct = (m.currentHp / m.maxHp) * 100
  const hpBar = hpPct > 60 ? 'bg-green-400' : hpPct > 30 ? 'bg-yellow-400' : 'bg-red-500'
  const shieldPct = (m.currentDef / m.def) * 100

  return (
    <div className="absolute bottom-2 right-2 z-20 bg-gray-900 border border-gray-600 rounded-lg p-3 w-48 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isP1 ? 'bg-blue-500' : 'bg-red-500'}`} />
          <span className="text-white text-sm font-bold capitalize">{m.type}</span>
          <span className={`text-[10px] ${isP1 ? 'text-blue-400' : 'text-red-400'}`}>
            {isP1 ? 'P1' : 'P2'}
          </span>
        </div>
        <button
          onClick={() => inspectMonster(null)}
          className="text-gray-500 hover:text-white text-xs leading-none"
        >
          ✕
        </button>
      </div>

      {/* State */}
      <div className="text-[11px] text-gray-400 mb-2">{STATE_LABEL[m.state]}</div>

      {/* HP bar */}
      <div className="mb-1.5">
        <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
          <span>HP</span>
          <span className="text-white font-mono">{m.currentHp} / {m.maxHp}</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-2 ${hpBar} transition-all`} style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      {/* Shield bar — only shown when defending */}
      {m.state === 'defending' && (
        <div className="mb-1.5">
          <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
            <span>Shield</span>
            <span className="text-cyan-300 font-mono">{m.currentDef} / {m.def}</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-2 bg-cyan-400 transition-all" style={{ width: `${shieldPct}%` }} />
          </div>
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mt-2 border-t border-gray-700 pt-2">
        <span className="text-gray-500">ATK</span>
        <span className="text-white font-mono font-bold">{m.atk}</span>
        <span className="text-gray-500">DEF</span>
        <span className="text-white font-mono font-bold">{m.def}</span>
        <span className="text-gray-500">MOVE</span>
        <span className="text-white font-mono font-bold">{m.move}</span>
        {m.range > 1 && (
          <>
            <span className="text-gray-500">RANGE</span>
            <span className="text-white font-mono font-bold">{m.range}</span>
          </>
        )}
        <span className="text-gray-500">Pos</span>
        <span className="text-gray-400 font-mono text-[10px]">r{m.coord.row} c{m.coord.col}</span>
      </div>

      {/* Passive trait (e.g. Dragon splash) */}
      {MONSTER_TEMPLATES[m.type]?.passiveDescription && (
        <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-400 leading-snug">
          {MONSTER_TEMPLATES[m.type].passiveDescription}
        </div>
      )}
    </div>
  )
}

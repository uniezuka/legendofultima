import { useGameStore } from '../../store/gameStore'
import { MONSTER_TEMPLATES, MONSTER_TYPE_ORDER } from '../../constants/monsters'

export default function MonsterRoster() {
  const phase = useGameStore(s => s.phase)
  const activePlayer = useGameStore(s => s.activePlayer)
  const mana = useGameStore(s => s.players[activePlayer].mana)
  const monsterCount = useGameStore(s => s.players[activePlayer].monsterCount)
  const selectedType = useGameStore(s => s.selectedMonsterTemplateType)
  const selectTemplate = useGameStore(s => s.selectMonsterTemplate)
  const doneSummoning = useGameStore(s => s.doneSummoning)

  if (phase !== 'summonMonster') return null

  return (
    <div className="flex items-start gap-3 px-4 py-2 bg-gray-800 border-b border-gray-600 overflow-x-auto">
      <div className="text-gray-400 text-xs pt-1 whitespace-nowrap">
        Mana: <span className="text-blue-300 font-bold">{mana}</span>
        {' '}Monsters: <span className="text-white">{monsterCount}/8</span>
      </div>

      {MONSTER_TYPE_ORDER.map((type) => {
        const t = MONSTER_TEMPLATES[type]
        const canAfford = mana >= t.cost
        const atCap = monsterCount >= 8
        const disabled = !canAfford || atCap
        const isSelected = selectedType === type

        return (
          <button
            key={type}
            onClick={() => !disabled && selectTemplate(type)}
            disabled={disabled}
            className={`flex flex-col items-center p-2 rounded border min-w-[64px] transition-colors
              ${disabled
                ? 'border-gray-700 bg-gray-900 opacity-40 cursor-not-allowed'
                : isSelected
                  ? 'border-purple-400 bg-purple-900/50 ring-2 ring-purple-400 cursor-pointer'
                  : 'border-gray-600 bg-gray-700 hover:bg-gray-600 cursor-pointer'
              }`}
          >
            <span className="text-yellow-300 text-xs font-bold">{t.label}</span>
            <span className="text-blue-300 text-[10px]">Cost: {t.cost}</span>
            <div className="text-[10px] text-gray-300 text-left leading-tight mt-0.5">
              <div>HP:{t.hp} ATK:{t.atk}</div>
              <div>DEF:{t.def} MV:{t.move}</div>
              {t.range > 1 && <div className="text-orange-300">RNG:{t.range}</div>}
            </div>
          </button>
        )
      })}

      <button
        onClick={doneSummoning}
        className="ml-auto px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded self-center whitespace-nowrap font-bold"
      >
        Done Summoning →
      </button>
    </div>
  )
}

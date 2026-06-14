import { useGameStore } from '../../store/gameStore'

export default function MonsterActionPanel() {
  const phase = useGameStore(s => s.phase)
  const selectedMonsterId = useGameStore(s => s.selectedMonsterId)
  const monsters = useGameStore(s => s.monsters)
  const defendMonster = useGameStore(s => s.defendMonster)
  const selectMonster = useGameStore(s => s.selectMonster)

  if (phase !== 'monsterActions' || !selectedMonsterId) return null

  const monster = monsters[selectedMonsterId]
  if (!monster) return null

  const blocked = monster.lastAction
  const canMove = blocked !== 'move'
  const canAttack = blocked !== 'attack'
  const canDefend = blocked !== 'defend'

  function ActionTag({ label, allowed }: { label: string; allowed: boolean }) {
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
        allowed ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-500 line-through'
      }`}>
        {label}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-700 border-b border-gray-500">
      <span className="text-white text-sm font-bold capitalize">{monster.type}</span>

      <span className="text-gray-400 text-xs">
        HP:{monster.currentHp}/{monster.maxHp} ATK:{monster.atk} DEF:{monster.def}
        {monster.state === 'defending' && <span className="text-cyan-300 ml-1">🛡</span>}
      </span>

      <div className="flex items-center gap-1">
        <ActionTag label="Move" allowed={canMove} />
        <ActionTag label="Attack" allowed={canAttack} />
        <ActionTag label="Defend" allowed={canDefend} />
      </div>

      {canMove && <span className="text-green-400 text-[10px]">Click green cell to move</span>}
      {canAttack && <span className="text-orange-400 text-[10px]">Click orange enemy to attack</span>}

      {canDefend && (
        <button
          onClick={defendMonster}
          className="px-3 py-1 bg-teal-700 hover:bg-teal-600 text-white text-xs rounded font-bold"
        >
          🛡 Defend
        </button>
      )}

      <button
        onClick={() => selectMonster(null)}
        className="ml-auto px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
      >
        ✕
      </button>
    </div>
  )
}

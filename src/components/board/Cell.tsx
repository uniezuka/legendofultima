import type { Cell as CellType } from '../../types/board'
import type { Monster } from '../../types/monster'
import MonsterToken from './MonsterToken'

export type HighlightType = 'reachable' | 'attackable' | 'attack-pending' | 'summon' | 'preview-valid' | 'preview-invalid' | 'can-act' | null

interface Props {
  cell: CellType
  monster: Monster | null
  highlight: HighlightType
  isSelected: boolean
  ghostMonsterOwner?: 'player1' | 'player2'
  ghostMonsterType?: string
  onClick: () => void
  onMouseEnter?: () => void
}

const BASE_CELL_BG: Record<string, string> = {
  empty: 'bg-gray-800 border-gray-700',
  'path-player1': 'bg-blue-700 border-blue-600',
  'path-player2': 'bg-red-700 border-red-600',
  'base-player1': 'bg-blue-900 border-blue-500 animate-pulse',
  'base-player2': 'bg-red-900 border-red-500 animate-pulse',
}

const TYPE_INITIALS: Record<string, string> = {
  slime: 'Sl', goblin: 'Go', archer: 'Ar', knight: 'Kn', dragon: 'Dr',
}

export default function Cell({
  cell, monster, highlight, isSelected,
  ghostMonsterOwner, ghostMonsterType,
  onClick, onMouseEnter,
}: Props) {
  const bgKey = cell.type === 'empty'
    ? 'empty'
    : `${cell.type}-${cell.owner ?? 'none'}`

  const bg = BASE_CELL_BG[bgKey] ?? 'bg-gray-800 border-gray-700'
  const cursorClass = (highlight && highlight !== 'can-act') ? 'cursor-pointer' : 'cursor-default'

  // can-act uses a ring overlay (not a fill), others use a bg overlay
  const isRingHighlight = highlight === 'can-act'
  const overlayFillClass = (!isRingHighlight && highlight)
    ? ({
        reachable: 'bg-green-500/40',
        attackable: 'bg-orange-500/50',
        'attack-pending': 'bg-orange-400/70',
        summon: 'bg-purple-400/40',
        'preview-valid': 'bg-yellow-400/60',
        'preview-invalid': 'bg-red-500/50',
      }[highlight] ?? '')
    : ''

  const ringClass = isRingHighlight
    ? 'ring-2 ring-amber-400 ring-inset'
    : highlight === 'attack-pending' ? 'ring-2 ring-orange-300 ring-inset' : ''

  const monsterLabel = monster
    ? `${monster.type} HP:${monster.currentHp}/${monster.maxHp} ATK:${monster.atk} DEF:${monster.def}`
    : ghostMonsterType
      ? `Place ${ghostMonsterType} here`
      : undefined

  return (
    <div
      className={`relative border ${bg} ${cursorClass} ${ringClass} select-none`}
      style={{ width: 48, height: 48 }}
      title={monsterLabel}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {overlayFillClass && (
        <div className={`absolute inset-0 ${overlayFillClass} pointer-events-none`} />
      )}

      {/* Ghost monster preview (summon hover) */}
      {!monster && ghostMonsterType && ghostMonsterOwner && (
        <div className={`absolute inset-0.5 rounded flex flex-col items-center justify-center opacity-50
          ${ghostMonsterOwner === 'player1' ? 'bg-blue-600' : 'bg-red-600'}`}>
          <span className="text-white text-xs font-bold leading-none">{TYPE_INITIALS[ghostMonsterType] ?? '?'}</span>
        </div>
      )}

      {monster && <MonsterToken monster={monster} isSelected={isSelected} />}

      {/* Attack target indicator */}
      {(highlight === 'attackable' || highlight === 'attack-pending') && monster && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">⚔️</span>
        </div>
      )}
    </div>
  )
}

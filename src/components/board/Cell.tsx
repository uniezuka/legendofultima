import type { Cell as CellType } from '../../types/board'
import type { Monster } from '../../types/monster'
import MonsterToken from './MonsterToken'

export type HighlightType = 'reachable' | 'attackable' | 'attack-pending' | 'splash-preview' | 'summon' | 'preview-valid' | 'preview-invalid' | 'can-act' | 'ability-create' | 'ability-destroy' | null

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

function getCellBgImage(cell: CellType): string {
  if (cell.type === 'base') {
    return cell.owner === 'player1'
      ? '/assets/tiles/base-ally.png'
      : '/assets/tiles/base-enemy.png'
  }
  if (cell.type === 'path') return '/assets/tiles/path.png'
  return '/assets/tiles/grass.png'
}

const PATH_TINT: Record<string, string> = {
  'path-player1': 'bg-blue-500/25',
  'path-player2': 'bg-red-500/25',
}

const BASE_PULSE_TINT: Record<string, string> = {
  'base-player1': 'bg-blue-400/20',
  'base-player2': 'bg-red-400/20',
}

export default function Cell({
  cell, monster, highlight, isSelected,
  ghostMonsterOwner, ghostMonsterType,
  onClick, onMouseEnter,
}: Props) {
  const bgKey = cell.type === 'empty'
    ? 'empty'
    : `${cell.type}-${cell.owner ?? 'none'}`

  const bgImage = getCellBgImage(cell)
  const pathTint = PATH_TINT[bgKey] ?? ''
  const basePulseTint = BASE_PULSE_TINT[bgKey] ?? ''

  const cursorClass = (highlight && highlight !== 'can-act') ? 'cursor-pointer' : 'cursor-default'

  const isRingHighlight = highlight === 'can-act'
  const overlayFillClass = (!isRingHighlight && highlight)
    ? ({
        reachable: 'bg-green-500/40',
        attackable: 'bg-orange-500/50',
        'attack-pending': 'bg-orange-400/70',
        'splash-preview': 'bg-yellow-500/50',
        summon: 'bg-purple-400/40',
        'preview-valid': 'bg-yellow-400/60',
        'preview-invalid': 'bg-red-500/50',
        'ability-create': 'bg-cyan-400/50',
        'ability-destroy': 'bg-pink-500/50',
      }[highlight] ?? '')
    : ''

  const ringClass = isRingHighlight
    ? 'ring-2 ring-amber-400 ring-inset'
    : highlight === 'attack-pending' ? 'ring-2 ring-orange-300 ring-inset'
    : highlight === 'splash-preview' ? 'ring-2 ring-yellow-300 ring-inset' : ''

  const monsterLabel = monster
    ? `${monster.type} HP:${monster.currentHp}/${monster.maxHp} ATK:${monster.atk} DEF:${monster.def}`
    : ghostMonsterType
      ? `Place ${ghostMonsterType} here`
      : undefined

  return (
    <div
      className={`relative border border-black/30 ${cursorClass} ${ringClass} select-none`}
      style={{
        width: 48,
        height: 48,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      title={monsterLabel}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {/* Path owner tint */}
      {pathTint && (
        <div className={`absolute inset-0 ${pathTint} pointer-events-none`} />
      )}

      {/* Base tile pulse overlay */}
      {basePulseTint && (
        <div className={`absolute inset-0 ${basePulseTint} animate-pulse pointer-events-none`} />
      )}

      {/* Highlight overlay */}
      {overlayFillClass && (
        <div className={`absolute inset-0 ${overlayFillClass} pointer-events-none`} />
      )}

      {/* Ghost monster preview (summon hover) */}
      {!monster && ghostMonsterType && ghostMonsterOwner && (
        <div className="absolute inset-0.5 rounded overflow-hidden opacity-60">
          <img
            src={`/assets/monsters/${ghostMonsterType}/idle.png`}
            alt={ghostMonsterType}
            className="w-full h-full object-contain"
            style={ghostMonsterOwner === 'player1' ? { transform: 'scaleX(-1)' } : undefined}
            draggable={false}
          />
          <div className={`absolute inset-0 ${ghostMonsterOwner === 'player1' ? 'bg-blue-500/40' : 'bg-red-500/40'} pointer-events-none`} />
        </div>
      )}

      {monster && <MonsterToken monster={monster} isSelected={isSelected} />}

      {/* Attack target indicator */}
      {(highlight === 'attackable' || highlight === 'attack-pending') && monster && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">⚔️</span>
        </div>
      )}

      {/* Splash damage preview indicator */}
      {highlight === 'splash-preview' && monster && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">🔥</span>
        </div>
      )}
    </div>
  )
}

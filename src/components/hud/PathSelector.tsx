import { useGameStore } from '../../store/gameStore'
import type { PathOption } from '../../types/board'

function ShapePreview({ option, rotation }: { option: PathOption; rotation: number }) {
  // Compute rotated cells for preview
  function rotateCoord(r: number, c: number, times: number): [number, number] {
    let row = r, col = c
    for (let i = 0; i < times; i++) {
      const tmp = row
      row = col
      col = -tmp
    }
    return [row, col]
  }

  const times = ((rotation / 90) % 4 + 4) % 4
  const rotated = option.shape.cells.map(cell => rotateCoord(cell.row, cell.col, times))
  const minR = Math.min(...rotated.map(([r]) => r))
  const minC = Math.min(...rotated.map(([, c]) => c))
  const normalized = rotated.map(([r, c]) => [r - minR, c - minC] as [number, number])
  const maxR = Math.max(...normalized.map(([r]) => r))
  const maxC = Math.max(...normalized.map(([, c]) => c))
  const rows = maxR + 1
  const cols = maxC + 1
  const cellSet = new Set(normalized.map(([r, c]) => `${r},${c}`))

  return (
    <div className="inline-grid gap-px" style={{ gridTemplateColumns: `repeat(${cols}, 10px)` }}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <div
            key={`${r}-${c}`}
            className={`w-2.5 h-2.5 rounded-sm ${cellSet.has(`${r},${c}`) ? 'bg-yellow-400' : 'bg-transparent'}`}
          />
        ))
      )}
    </div>
  )
}

export default function PathSelector() {
  const phase = useGameStore(s => s.phase)
  const paths = useGameStore(s => s.generatedPaths)
  const roll = useGameStore(s => s.currentDiceRoll)
  const selectedPathId = useGameStore(s => s.selectedPathId)
  const rotation = useGameStore(s => s.selectedPathRotation)
  const selectPath = useGameStore(s => s.selectPath)
  const setRotation = useGameStore(s => s.setPathRotation)
  const skipPath = useGameStore(s => s.skipPathPlacement)

  if (phase !== 'placePath') return null

  return (
    <div className="flex items-start gap-3 px-4 py-2 bg-gray-800 border-b border-gray-600 overflow-x-auto">
      <div className="text-gray-400 text-xs pt-1 whitespace-nowrap">
        Roll: <span className="text-yellow-300 font-bold">{roll}</span>
      </div>

      {paths.map(path => {
        const isMatch = path.cost === roll
        const isSelected = path.id === selectedPathId
        return (
          <button
            key={path.id}
            onClick={() => isMatch && selectPath(path.id)}
            disabled={!isMatch}
            className={`flex flex-col items-center p-2 rounded border transition-colors
              ${isMatch
                ? isSelected
                  ? 'border-yellow-400 bg-yellow-900/50 ring-2 ring-yellow-400'
                  : 'border-yellow-600 bg-gray-700 hover:bg-gray-600 cursor-pointer'
                : 'border-gray-700 bg-gray-900 opacity-40 cursor-not-allowed'
              }`}
          >
            <ShapePreview option={path} rotation={isSelected ? rotation : 0} />
            <span className={`text-xs mt-1 font-bold ${isMatch ? 'text-yellow-300' : 'text-gray-500'}`}>
              Cost: {path.cost}
            </span>
            <span className="text-gray-400 text-[10px]">{path.shape.name}</span>
          </button>
        )
      })}

      {selectedPathId && (
        <div className="flex flex-col gap-1 justify-center">
          <span className="text-gray-400 text-xs">Rotate:</span>
          <button
            onClick={() => setRotation((rotation + 90) % 360)}
            className="px-2 py-0.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
          >↻ 90°</button>
        </div>
      )}

      <button
        onClick={skipPath}
        className="ml-auto px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded self-center whitespace-nowrap"
      >
        Skip (+1 Luck)
      </button>
    </div>
  )
}

interface Props {
  secondsLeft: number | null
}

export default function TurnTimer({ secondsLeft }: Props) {
  if (secondsLeft === null) return null

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const display = `${mins}:${String(secs).padStart(2, '0')}`

  const isWarning = secondsLeft <= 30
  const isCritical = secondsLeft <= 10

  return (
    <div className={`px-3 py-1.5 flex items-center justify-between border-b
      ${isCritical ? 'border-red-700 bg-red-950/60' : isWarning ? 'border-amber-700 bg-amber-950/40' : 'border-gray-700 bg-gray-900/50'}`}>
      <span className="text-[10px] uppercase tracking-wider text-gray-500">Turn</span>
      <span className={`font-mono font-bold text-sm tabular-nums
        ${isCritical ? 'text-red-400 animate-pulse' : isWarning ? 'text-amber-400' : 'text-gray-300'}`}>
        {display}
      </span>
    </div>
  )
}

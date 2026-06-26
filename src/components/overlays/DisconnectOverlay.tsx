interface Props {
  forfeitCountdown: number | null
}

export default function DisconnectOverlay({ forfeitCountdown }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60">
      <div className="bg-gray-900 border border-amber-600 rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-xs w-full mx-4">
        <div className="text-3xl">⚠️</div>
        <p className="text-amber-400 font-bold text-lg text-center">Opponent Disconnected</p>
        {forfeitCountdown !== null && forfeitCountdown > 0 ? (
          <>
            <p className="text-gray-300 text-sm text-center">Waiting for them to reconnect…</p>
            <div className="text-white font-mono text-3xl font-black">{forfeitCountdown}s</div>
            <p className="text-gray-500 text-xs text-center">They forfeit if they don't return in time.</p>
          </>
        ) : (
          <p className="text-gray-400 text-sm text-center">Waiting…</p>
        )}
      </div>
    </div>
  )
}

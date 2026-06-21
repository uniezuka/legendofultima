// Pip positions as [cx, cy] percentages in a 100×100 viewBox.
// Arranged so they sit comfortably inside the face area (clear of the border frame).
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[72, 28], [28, 72]],
  3: [[72, 28], [50, 50], [28, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
}

interface Props {
  value: number
  size?: number
  className?: string
}

export default function DiceFace({ value, size = 48, className = '' }: Props) {
  const pips = PIPS[value] ?? []

  return (
    <div
      className={`relative inline-block flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* dice-background.png provides the decorative border frame */}
      <img
        src="/assets/dice/dice-background.png"
        alt=""
        className="absolute inset-0 w-full h-full"
        draggable={false}
      />

      {/* SVG overlay: cover the baked-in "1" and draw proper pips */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Face cover — warm parchment to hide the "1" while keeping the border visible */}
        <rect x="13" y="13" width="74" height="74" fill="#e0d5b5" rx="2" />

        {/* Pips */}
        {pips.map(([cx, cy], i) => (
          <g key={i}>
            {/* subtle drop-shadow */}
            <circle cx={cx + 1.5} cy={cy + 1.5} r={7.5} fill="#00000028" />
            {/* pip body */}
            <circle cx={cx} cy={cy} r={7.5} fill="#2a1a08" />
            {/* small specular highlight */}
            <circle cx={cx - 2.5} cy={cy - 2.5} r={2.5} fill="#ffffff22" />
          </g>
        ))}
      </svg>
    </div>
  )
}

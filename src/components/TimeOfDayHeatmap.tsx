interface TimeOfDayHeatmapProps {
  // 7 rows (Mon..Sun) × 24 cols (hours 0..23)
  matrix: number[][]
}

const ROWS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const HOURS = [0, 6, 12, 18]

export function TimeOfDayHeatmap({ matrix }: TimeOfDayHeatmapProps) {
  const max = Math.max(1, ...matrix.flat())
  const total = matrix.flat().reduce((a, b) => a + b, 0)

  if (total === 0) return null

  // Find the busiest day-hour combo for the headline
  let peakRow = 0
  let peakCol = 0
  let peakVal = 0
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 24; c++) {
      if (matrix[r][c] > peakVal) {
        peakVal = matrix[r][c]
        peakRow = r
        peakCol = c
      }
    }
  }
  const peakLabel = `${ROWS[peakRow]} ${String(peakCol).padStart(2, '0')}:00`

  function intensity(v: number): number {
    if (v === 0) return 0
    if (v <= max * 0.25) return 1
    if (v <= max * 0.5) return 2
    if (v <= max * 0.75) return 3
    return 4
  }
  const opacities = [0, 0.25, 0.5, 0.75, 1]

  const cellW = 14
  const cellH = 14
  const padLeft = 30
  const padTop = 14
  const svgW = padLeft + 24 * cellW
  const svgH = padTop + 7 * cellH

  return (
    <div className="border-2 border-brutal-black bg-brutal-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="px-3 pt-3 pb-1 flex items-baseline justify-between">
        <h3 className="font-mono font-bold text-xs uppercase">When Chores Get Done</h3>
        <span className="font-mono text-[10px] text-brutal-black/40">peak {peakLabel}</span>
      </div>
      <div className="px-3 pb-3 overflow-x-auto">
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="block">
          {/* Hour labels */}
          {HOURS.map(h => (
            <text
              key={h}
              x={padLeft + h * cellW}
              y={10}
              className="fill-brutal-black/40"
              style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
            >
              {String(h).padStart(2, '0')}
            </text>
          ))}
          {/* Day labels */}
          {ROWS.map((d, i) => (
            <text
              key={d}
              x={0}
              y={padTop + i * cellH + 10}
              className="fill-brutal-black/40"
              style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
            >
              {d}
            </text>
          ))}
          {/* Cells */}
          {matrix.map((row, r) => row.map((v, c) => (
            <rect
              key={`${r}-${c}`}
              x={padLeft + c * cellW}
              y={padTop + r * cellH}
              width={cellW - 1}
              height={cellH - 1}
              fill={v > 0 ? 'var(--color-brutal-blue)' : 'currentColor'}
              opacity={v > 0 ? opacities[intensity(v)] : 0.06}
            >
              <title>{`${ROWS[r]} ${String(c).padStart(2, '0')}:00 — ${v} ${v === 1 ? 'completion' : 'completions'}`}</title>
            </rect>
          )))}
        </svg>
      </div>
    </div>
  )
}

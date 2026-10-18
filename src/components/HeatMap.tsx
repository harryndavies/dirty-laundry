import { useEffect, useRef, useState } from 'react'
import { useDailyPoints } from '@/lib/hooks/useDailyPoints'
import { useAuth } from '@/context/AuthContext'

const WEEKS = 53
const CELL = 11 // 10px square + 1px gap
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Cell {
  date: string
  points: number
  row: number
  col: number
  monthFirst: boolean
  month: number
}

export function HeatMap() {
  const { profile } = useAuth()
  const daily = useDailyPoints(WEEKS * 7)
  const [hover, setHover] = useState<Cell | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Snap to the right edge so today's activity is in view by default.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [daily])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Mon-based row index: Monday = 0 .. Sunday = 6
  const todayRow = (today.getDay() + 6) % 7
  // Most recent column is the latest week — pad it with future-day blanks.
  const totalCells = WEEKS * 7
  const oldest = new Date(today)
  oldest.setDate(today.getDate() - (totalCells - 1 - (6 - todayRow)))

  const cells: Cell[] = []
  let lastMonth = -1
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(oldest)
    d.setDate(oldest.getDate() + i)
    const isFuture = d > today
    const key = dayKey(d)
    const month = d.getMonth()
    const monthFirst = !isFuture && month !== lastMonth
    if (!isFuture) lastMonth = month
    cells.push({
      date: isFuture ? '' : key,
      points: isFuture ? -1 : (daily.get(key) ?? 0),
      row: i % 7,
      col: Math.floor(i / 7),
      monthFirst,
      month,
    })
  }

  const max = Math.max(1, ...cells.filter((c) => c.points > 0).map((c) => c.points))
  const color = profile?.avatar_color ?? '#0066FF'

  function intensity(pts: number): number {
    if (pts <= 0) return 0
    if (pts <= max * 0.25) return 1
    if (pts <= max * 0.5) return 2
    if (pts <= max * 0.75) return 3
    return 4
  }
  const opacities = [0, 0.25, 0.5, 0.75, 1]

  // Month labels: x position = first cell of that month's column
  const monthLabels = cells
    .filter((c) => c.monthFirst && c.row === 0 && c.col > 0)
    .map((c) => ({ col: c.col, label: MONTH_NAMES[c.month] }))

  const totalPoints = Array.from(daily.values()).reduce((a, b) => a + b, 0)
  const activeDays = Array.from(daily.values()).filter((v) => v > 0).length

  const padLeft = 22 // for row labels
  const padTop = 14 // for month labels
  const svgW = padLeft + WEEKS * CELL
  const svgH = padTop + 7 * CELL

  return (
    <div className="border-2 border-brutal-black bg-brutal-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-baseline justify-between px-3 pt-3 pb-1">
        <h3 className="font-mono text-xs font-bold uppercase">365-Day Activity</h3>
        <span className="font-mono text-[10px] text-brutal-black/40">
          {activeDays} active · {totalPoints} pts
        </span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto px-3 pb-1">
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="block">
          {/* Month labels */}
          {monthLabels.map((m) => (
            <text
              key={`m-${m.col}`}
              x={padLeft + m.col * CELL}
              y={10}
              className="fill-brutal-black/40"
              style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
            >
              {m.label}
            </text>
          ))}
          {/* Row labels */}
          {ROW_LABELS.map((label, i) =>
            label ? (
              <text
                key={`r-${i}`}
                x={0}
                y={padTop + i * CELL + 8}
                className="fill-brutal-black/40"
                style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
              >
                {label}
              </text>
            ) : null,
          )}
          {/* Cells */}
          {cells.map((c, i) => {
            if (c.points === -1) return null // future day
            const lvl = intensity(c.points)
            const isHover = hover?.date === c.date
            return (
              <rect
                key={i}
                x={padLeft + c.col * CELL}
                y={padTop + c.row * CELL}
                width={10}
                height={10}
                fill={c.points > 0 ? color : 'currentColor'}
                opacity={c.points > 0 ? opacities[lvl] : 0.08}
                stroke={isHover ? 'var(--color-brutal-black)' : 'none'}
                strokeWidth={isHover ? 1.5 : 0}
                onPointerEnter={() => setHover(c)}
                onPointerLeave={() => setHover(null)}
                onClick={() => setHover((prev) => (prev?.date === c.date ? null : c))}
                style={{ cursor: 'pointer' }}
              />
            )
          })}
        </svg>
      </div>

      {/* Tooltip line */}
      <div className="h-5 px-3 pb-1">
        {hover && (
          <span className="font-mono text-[10px] font-bold text-brutal-black/70">
            {new Date(hover.date + 'T00:00:00')
              .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              .toUpperCase()}
            {' · '}
            {hover.points} {hover.points === 1 ? 'pt' : 'pts'}
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 px-3 pb-3">
        <span className="font-mono text-[10px] text-brutal-black/40">LESS</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 border border-brutal-black/20"
            style={{
              backgroundColor: i === 0 ? undefined : color,
              opacity: i === 0 ? 0.08 : opacities[i],
              backgroundImage: i === 0 ? 'currentColor' : undefined,
            }}
          />
        ))}
        <span className="font-mono text-[10px] text-brutal-black/40">MORE</span>
      </div>
    </div>
  )
}

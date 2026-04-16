import { useState, useRef, useEffect } from 'react'
import { type MemberPointsHistory } from '@/lib/hooks/usePointsHistory'

interface PointsChartProps {
  data: MemberPointsHistory[]
}

const CHART_H = 180
const CHART_PAD = { top: 12, right: 12, bottom: 28, left: 40 }

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function PointsChart({ data }: PointsChartProps) {
  const [hoveredUser, setHoveredUser] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(320)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerW(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  if (data.length === 0 || data[0].daily.length === 0) return null

  const dates = data[0].daily.map(d => d.date)
  const maxPts = Math.max(1, ...data.map(m => m.daily[m.daily.length - 1]?.cumulative ?? 0))

  const innerW = Math.max(containerW - CHART_PAD.left - CHART_PAD.right - 8, 100)
  const svgW = innerW + CHART_PAD.left + CHART_PAD.right
  const innerH = CHART_H - CHART_PAD.top - CHART_PAD.bottom

  function x(i: number) {
    return CHART_PAD.left + (i / Math.max(1, dates.length - 1)) * innerW
  }

  function y(val: number) {
    return CHART_PAD.top + innerH - (val / maxPts) * innerH
  }

  // Y-axis gridlines
  const gridCount = 4
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) =>
    Math.round((maxPts / gridCount) * i)
  )

  // X-axis labels — pick strategy based on date range length
  const xLabels = buildXLabels(dates)

  return (
    <div className="border-2 border-brutal-black bg-brutal-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="px-3 pt-3 pb-1">
        <h3 className="font-mono font-bold text-xs uppercase">Points Over Time</h3>
      </div>

      <div ref={containerRef} className="px-1">
        <svg
          width={svgW}
          height={CHART_H}
          viewBox={`0 0 ${svgW} ${CHART_H}`}
          className="block"
        >
          {/* Grid lines */}
          {gridLines.map(v => (
            <g key={v}>
              <line
                x1={CHART_PAD.left}
                y1={y(v)}
                x2={CHART_PAD.left + innerW}
                y2={y(v)}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeWidth={1}
              />
              <text
                x={CHART_PAD.left - 6}
                y={y(v) + 3}
                textAnchor="end"
                className="fill-brutal-black/40"
                style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
              >
                {v}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabels.map(({ index, label }) => (
            <text
              key={index}
              x={x(index)}
              y={CHART_H - 4}
              textAnchor="middle"
              className="fill-brutal-black/40"
              style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
            >
              {label}
            </text>
          ))}

          {/* Lines — one per member */}
          {data.map(member => {
            const dimmed = hoveredUser !== null && hoveredUser !== member.userId
            const path = member.daily
              .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.cumulative)}`)
              .join(' ')

            return (
              <path
                key={member.userId}
                d={path}
                fill="none"
                stroke={member.color}
                strokeWidth={dimmed ? 1.5 : 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={dimmed ? 0.2 : 1}
                style={{ transition: 'opacity 150ms, stroke-width 150ms' }}
              />
            )
          })}

          {/* End dots */}
          {data.map(member => {
            const last = member.daily[member.daily.length - 1]
            const dimmed = hoveredUser !== null && hoveredUser !== member.userId
            if (!last) return null
            return (
              <circle
                key={member.userId}
                cx={x(dates.length - 1)}
                cy={y(last.cumulative)}
                r={dimmed ? 2.5 : 4}
                fill={member.color}
                stroke="var(--color-brutal-black)"
                strokeWidth={1.5}
                opacity={dimmed ? 0.2 : 1}
                style={{ transition: 'opacity 150ms' }}
              />
            )
          })}
        </svg>
      </div>

      {/* Legend — hover to highlight a member's line */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-3 pt-1">
        {data.map(member => (
          <button
            key={member.userId}
            className="flex items-center gap-1.5 group"
            onPointerEnter={() => setHoveredUser(member.userId)}
            onPointerLeave={() => setHoveredUser(null)}
          >
            <span
              className="w-3 h-3 border border-brutal-black shrink-0"
              style={{ backgroundColor: member.color }}
            />
            <span className="font-mono text-[10px] font-bold text-brutal-black/60 group-hover:text-brutal-black transition-colors">
              {member.displayName}
            </span>
            <span className="font-mono text-[10px] text-brutal-black/30">
              {member.daily[member.daily.length - 1]?.cumulative ?? 0}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function buildXLabels(dates: string[]): { index: number; label: string }[] {
  if (dates.length <= 1) {
    return dates.map((d, i) => ({ index: i, label: formatDay(d) }))
  }

  // For longer ranges (>60 days), show month labels
  if (dates.length > 60) {
    const labels: { index: number; label: string }[] = []
    let lastMonth = -1
    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i] + 'T00:00:00')
      const month = d.getMonth()
      if (month !== lastMonth) {
        labels.push({ index: i, label: MONTH_NAMES[month] })
        lastMonth = month
      }
    }
    return labels
  }

  // For medium ranges (>14 days), show ~5 evenly spaced day/month labels
  if (dates.length > 14) {
    const count = 5
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round((i / (count - 1)) * (dates.length - 1))
      return { index: idx, label: formatDay(dates[idx]) }
    })
  }

  // For short ranges, show ~5 evenly spaced day/month labels
  const count = Math.min(5, dates.length)
  return Array.from({ length: count }, (_, i) => {
    const idx = Math.round((i / Math.max(1, count - 1)) * (dates.length - 1))
    return { index: idx, label: formatDay(dates[idx]) }
  })
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

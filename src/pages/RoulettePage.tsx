import { useState, useRef } from 'react'
import { playSpin, playResult } from '@/lib/sounds'
import { useGroup } from '@/context/GroupContext'
import { useChores } from '@/lib/hooks/useChores'
import { Navigate } from 'react-router-dom'

const COLORS = ['#FFE500', '#FF2D9B', '#BFFF00', '#0066FF', '#FF6B00', '#FFFFFF']

export function RoulettePage() {
  const { group, members } = useGroup()
  const { chores } = useChores()
  const [mode, setMode] = useState<'chore' | 'person'>('person')
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const wheelRef = useRef<SVGSVGElement>(null)

  if (!group) return <Navigate to="/group" replace />

  const items =
    mode === 'person' ? members.map((m) => m.profiles.display_name) : chores.map((c) => c.name)

  function spin() {
    if (spinning || items.length === 0) return
    setSpinning(true)
    setResult(null)
    playSpin()

    const spins = 5 + Math.random() * 5
    const extraDeg = Math.random() * 360
    const totalDeg = spins * 360 + extraDeg
    const newRotation = rotation + totalDeg

    setRotation(newRotation)

    setTimeout(() => {
      // Figure out where it landed
      const finalAngle = newRotation % 360
      const sliceSize = 360 / items.length
      // The pointer is at top (0°), wheel rotates clockwise
      // So we need to find which slice is at the top
      const adjustedAngle = (360 - (finalAngle % 360)) % 360
      const index = Math.floor(adjustedAngle / sliceSize)
      setResult(items[index % items.length])
      setSpinning(false)
      playResult()
    }, 3500)
  }

  const sliceAngle = items.length > 0 ? 360 / items.length : 360
  const radius = 158
  const center = 160

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 border-b-4 border-brutal-black bg-brutal-pink px-4 py-4">
        <h1 className="text-center font-mono text-2xl font-bold tracking-tight text-brutal-white">
          ROULETTE
        </h1>
        <p className="mt-0.5 text-center font-mono text-xs text-brutal-white/60">Spin to decide</p>
      </div>

      {/* Mode toggle */}
      <div className="flex border-b-2 border-brutal-black">
        <button
          onClick={() => {
            setMode('person')
            setResult(null)
          }}
          className={`flex-1 py-3 font-mono text-xs font-bold uppercase transition-colors ${
            mode === 'person' ? 'bg-brutal-black text-brutal-white' : 'bg-brutal-white'
          }`}
        >
          WHO DOES IT?
        </button>
        <button
          onClick={() => {
            setMode('chore')
            setResult(null)
          }}
          className={`flex-1 border-l-2 border-brutal-black py-3 font-mono text-xs font-bold uppercase transition-colors ${
            mode === 'chore' ? 'bg-brutal-black text-brutal-white' : 'bg-brutal-white'
          }`}
        >
          WHICH CHORE?
        </button>
      </div>

      <div className="flex flex-col items-center px-4 py-6 md:py-10">
        {items.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-3 text-4xl">🎰</div>
            <p className="font-mono text-sm font-bold text-brutal-black/40">
              {mode === 'person' ? 'NO MEMBERS YET' : 'NO CHORES YET'}
            </p>
          </div>
        ) : (
          <>
            {/* Pointer */}
            <div className="z-10 mb-[-12px] text-2xl">▼</div>

            {/* Wheel */}
            <div className="relative">
              <svg
                ref={wheelRef}
                width="320"
                height="320"
                viewBox="0 0 320 320"
                className="rounded-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning
                    ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                    : 'none',
                }}
              >
                {items.map((item, i) => {
                  const startAngle = (i * sliceAngle * Math.PI) / 180
                  const endAngle = ((i + 1) * sliceAngle * Math.PI) / 180
                  const midAngle = (startAngle + endAngle) / 2

                  const x1 = center + radius * Math.sin(startAngle)
                  const y1 = center - radius * Math.cos(startAngle)
                  const x2 = center + radius * Math.sin(endAngle)
                  const y2 = center - radius * Math.cos(endAngle)

                  const largeArc = sliceAngle > 180 ? 1 : 0
                  const color = COLORS[i % COLORS.length]
                  const textColor =
                    color === '#FFFFFF' || color === '#FFE500' || color === '#BFFF00'
                      ? '#000'
                      : '#FFF'

                  // Text position
                  const textRadius = radius * 0.65
                  const textX = center + textRadius * Math.sin(midAngle)
                  const textY = center - textRadius * Math.cos(midAngle)
                  const textRotation = (midAngle * 180) / Math.PI

                  const truncated = item.length > 12 ? item.slice(0, 11) + '…' : item

                  return (
                    <g key={i}>
                      <path
                        d={
                          items.length === 1
                            ? `M ${center} ${center} m -${radius} 0 a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0`
                            : `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
                        }
                        fill={color}
                        stroke="#000"
                        strokeWidth="2"
                      />
                      <text
                        x={textX}
                        y={textY}
                        fill={textColor}
                        fontSize="11"
                        fontFamily="'IBM Plex Mono', monospace"
                        fontWeight="700"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                      >
                        {truncated}
                      </text>
                    </g>
                  )
                })}
                {/* Center circle */}
                <circle cx={center} cy={center} r="20" fill="#000" stroke="#000" strokeWidth="3" />
                <text
                  x={center}
                  y={center}
                  fill="#FFE500"
                  fontSize="10"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  SPIN
                </text>
              </svg>
            </div>

            {/* Spin button */}
            <button
              onClick={spin}
              disabled={spinning}
              className={`mt-6 h-14 w-full max-w-[320px] border-3 border-brutal-black font-mono text-sm font-bold uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none ${
                spinning
                  ? 'cursor-not-allowed bg-brutal-black/20 text-brutal-black/40'
                  : 'bg-brutal-black text-brutal-yellow'
              }`}
            >
              {spinning ? 'SPINNING...' : 'SPIN THE WHEEL'}
            </button>

            {/* Result */}
            {result && !spinning && (
              <div className="mt-6 w-full max-w-[320px] border-3 border-brutal-black bg-brutal-yellow p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <p className="mb-1 font-mono text-xs text-brutal-black/50">
                  {mode === 'person' ? 'THE CHOSEN ONE IS' : 'THE CHOSEN CHORE IS'}
                </p>
                <p className="font-mono text-2xl font-bold">{result}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

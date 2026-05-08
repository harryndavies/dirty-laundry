import type { PlantMood } from '@/lib/hooks/usePlantState'

interface PlantProps {
  mood: PlantMood
  size?: number
  bob?: boolean
}

// Color steps from healthy to dying
const LEAF: Record<PlantMood, string> = {
  flowering: '#3FA34D',
  thriving: '#3FA34D',
  dry: '#7A8C3A',
  wilting: '#8A7A2E',
  dying: '#5A4A20',
}

const POT_COLOR = '#FF2D9B'      // brutal-pink
const POT_SHADOW = '#000'

export function Plant({ mood, size = 200, bob = true }: PlantProps) {
  const leaf = LEAF[mood]

  return (
    <div
      style={{ width: size, height: size, lineHeight: 0 }}
      className={bob ? `plant-bob plant-${mood}` : `plant-${mood}`}
    >
      <style>{`
        @keyframes plant-sway   { 0%,100% { transform: rotate(-1deg); } 50% { transform: rotate(1deg); } }
        @keyframes plant-bloom  { 0%,100% { transform: rotate(-2deg) scale(1); } 50% { transform: rotate(2deg) scale(1.02); } }
        @keyframes plant-droop  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
        .plant-bob.plant-thriving { animation: plant-sway 4s ease-in-out infinite; transform-origin: 50% 90%; }
        .plant-bob.plant-flowering { animation: plant-bloom 2.6s ease-in-out infinite; transform-origin: 50% 90%; }
        .plant-bob.plant-dry { animation: plant-sway 6s ease-in-out infinite; transform-origin: 50% 90%; }
        .plant-bob.plant-wilting,
        .plant-bob.plant-dying { animation: plant-droop 3.5s ease-in-out infinite; }
      `}</style>

      <svg viewBox="0 0 200 200" width={size} height={size}>
        {/* Pot */}
        <g>
          {/* rim */}
          <rect x="58" y="138" width="84" height="14" fill={POT_COLOR} stroke={POT_SHADOW} strokeWidth="5" />
          {/* body — trapezoid */}
          <path
            d="M64 152 L136 152 L128 192 L72 192 Z"
            fill={POT_COLOR}
            stroke={POT_SHADOW}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          {/* soil line */}
          <line x1="63" y1="148" x2="137" y2="148" stroke={POT_SHADOW} strokeWidth="3" />
        </g>

        {/* Plant — by mood */}
        {mood === 'flowering' && (
          <g>
            {/* Tall straight stem */}
            <path d="M100 144 L100 50" stroke={leaf} strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M100 144 L100 50" stroke={POT_SHADOW} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
            {/* Leaves */}
            <Leaf x={100} y={120} dir={-1} color={leaf} />
            <Leaf x={100} y={100} dir={1} color={leaf} />
            <Leaf x={100} y={78} dir={-1} color={leaf} />
            <Leaf x={100} y={62} dir={1} color={leaf} />
            {/* Blooms */}
            <Bloom cx={70} cy={62} fill="#FFE500" />
            <Bloom cx={132} cy={70} fill="#FF2D9B" />
            <Bloom cx={100} cy={42} fill="#FFE500" />
            {/* Sun rays subtle */}
            <line x1="14" y1="40" x2="26" y2="48" stroke={POT_SHADOW} strokeWidth="3" strokeLinecap="round" />
            <line x1="186" y1="40" x2="174" y2="48" stroke={POT_SHADOW} strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {mood === 'thriving' && (
          <g>
            <path d="M100 144 L100 56" stroke={leaf} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Leaf x={100} y={124} dir={-1} color={leaf} />
            <Leaf x={100} y={104} dir={1} color={leaf} />
            <Leaf x={100} y={84} dir={-1} color={leaf} />
            <Leaf x={100} y={66} dir={1} color={leaf} />
          </g>
        )}

        {mood === 'dry' && (
          <g>
            {/* Slight bend */}
            <path d="M100 144 Q 102 100 92 60" stroke={leaf} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Leaf x={101} y={124} dir={-1} color={leaf} droop={5} />
            <Leaf x={100} y={106} dir={1} color={leaf} droop={5} />
            <Leaf x={97} y={86} dir={-1} color={leaf} droop={6} />
            <Leaf x={94} y={68} dir={1} color={leaf} droop={6} />
          </g>
        )}

        {mood === 'wilting' && (
          <g>
            {/* Bowed over */}
            <path d="M100 144 Q 124 110 70 80" stroke={leaf} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Leaf x={108} y={130} dir={-1} color={leaf} droop={14} />
            <Leaf x={114} y={114} dir={1} color={leaf} droop={14} />
            <Leaf x={104} y={96} dir={-1} color={leaf} droop={16} />
            <Leaf x={86} y={86} dir={1} color={leaf} droop={16} />
            {/* Fallen leaf next to pot */}
            <FallenLeaf x={42} y={186} color={leaf} />
          </g>
        )}

        {mood === 'dying' && (
          <g>
            {/* Stub stem */}
            <path d="M100 144 L100 116" stroke={leaf} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Leaf x={100} y={130} dir={-1} color={leaf} droop={20} />
            {/* Fallen leaves on either side */}
            <FallenLeaf x={36} y={186} color={leaf} />
            <FallenLeaf x={156} y={188} color={leaf} rotate={-25} />
            <FallenLeaf x={64} y={194} color={leaf} rotate={45} />
          </g>
        )}
      </svg>
    </div>
  )
}

function Leaf({ x, y, dir, color, droop = 0 }: { x: number; y: number; dir: 1 | -1; color: string; droop?: number }) {
  // dir = 1 right, -1 left. Drawn as an oval extending out from the stem.
  const tipX = x + dir * 28
  const tipY = y + droop
  const ctrl1Y = y - 12 + droop * 0.3
  const ctrl2Y = y + 12 + droop * 0.7
  const path = `M ${x} ${y} Q ${x + dir * 8} ${ctrl1Y} ${tipX} ${tipY} Q ${x + dir * 8} ${ctrl2Y} ${x} ${y} Z`
  return (
    <path
      d={path}
      fill={color}
      stroke="#000"
      strokeWidth="4"
      strokeLinejoin="round"
    />
  )
}

function Bloom({ cx, cy, fill }: { cx: number; cy: number; fill: string }) {
  // 5-petal flower — small circles around a center
  const petals = [0, 1, 2, 3, 4].map(i => {
    const a = (i * (Math.PI * 2)) / 5 - Math.PI / 2
    return { x: cx + Math.cos(a) * 6, y: cy + Math.sin(a) * 6 }
  })
  return (
    <g>
      {petals.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="5" fill={fill} stroke="#000" strokeWidth="2.5" />
      ))}
      <circle cx={cx} cy={cy} r="3" fill="#000" />
    </g>
  )
}

function FallenLeaf({ x, y, color, rotate = 20 }: { x: number; y: number; color: string; rotate?: number }) {
  return (
    <g transform={`rotate(${rotate} ${x} ${y})`}>
      <ellipse cx={x} cy={y} rx="14" ry="5" fill={color} stroke="#000" strokeWidth="3" />
    </g>
  )
}

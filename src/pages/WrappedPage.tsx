import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'
import { useWrappedStats, type WrappedStats } from '@/lib/hooks/useWrappedStats'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { X, ChevronRight } from 'lucide-react'

interface CardConfig {
  bg: string // tailwind bg-* class
  text?: string // tailwind text-* class (default brutal-black)
  visible: (s: WrappedStats) => boolean
  render: (
    s: WrappedStats,
    ctx: { displayName: string; avatarColor: string; avatarUrl: string | null },
  ) => React.ReactNode
}

const CARDS: CardConfig[] = [
  // 1. Intro
  {
    bg: 'bg-brutal-yellow',
    visible: () => true,
    render: (s, ctx) => (
      <>
        <Avatar name={ctx.displayName} color={ctx.avatarColor} size="lg" imageUrl={ctx.avatarUrl} />
        <div className="mt-6 font-mono text-[10px] font-bold tracking-widest text-brutal-black/50">
          YOUR YEAR IN REVIEW
        </div>
        <div className="mt-1 font-mono text-7xl font-black tracking-tighter">{s.year}</div>
        <div className="mt-6 max-w-xs font-mono text-sm text-brutal-black/70">
          A look back at every chore you crushed.
        </div>
      </>
    ),
  },
  // 2. Totals
  {
    bg: 'bg-brutal-blue',
    text: 'text-brutal-white',
    visible: (s) => s.totalChores > 0,
    render: (s) => (
      <>
        <div className="font-mono text-[10px] font-bold tracking-widest opacity-60">
          YOU COMPLETED
        </div>
        <div className="mt-3 font-mono text-8xl leading-none font-black tracking-tighter">
          {s.totalChores}
        </div>
        <div className="mt-2 font-mono text-2xl font-bold tracking-tight">CHORES</div>
        <div className="mt-6 font-mono text-base opacity-80">
          That's <span className="font-bold">{s.totalPoints.toLocaleString()}</span> points.
        </div>
      </>
    ),
  },
  // 3. Top chore
  {
    bg: 'bg-brutal-pink',
    text: 'text-brutal-white',
    visible: (s) => !!s.topChore,
    render: (s) => (
      <>
        <div className="font-mono text-[10px] font-bold tracking-widest opacity-60">
          YOUR SIGNATURE CHORE
        </div>
        <div className="mt-4 max-w-xs font-mono text-5xl leading-none font-black tracking-tighter break-words">
          {s.topChore!.name.toUpperCase()}
        </div>
        <div className="mt-6 font-mono text-base opacity-80">
          You did it <span className="font-bold">{s.topChore!.count}</span> times this year.
        </div>
      </>
    ),
  },
  // 4. Longest streak
  {
    bg: 'bg-brutal-lime',
    visible: (s) => s.longestStreak >= 2,
    render: (s) => (
      <>
        <div className="font-mono text-[10px] font-bold tracking-widest text-brutal-black/50">
          YOUR LONGEST STREAK
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-mono text-9xl leading-none font-black tracking-tighter">
            {s.longestStreak}
          </span>
        </div>
        <div className="mt-2 font-mono text-2xl font-bold">DAYS IN A ROW 🔥</div>
        <div className="mt-6 max-w-xs font-mono text-base text-brutal-black/70">
          You showed up day after day. That kind of consistency is rare.
        </div>
      </>
    ),
  },
  // 5. Monthly wins
  {
    bg: 'bg-brutal-yellow',
    visible: (s) => s.monthlyWins > 0,
    render: (s) => (
      <>
        <div className="font-mono text-[10px] font-bold tracking-widest text-brutal-black/50">
          MONTHLY CHAMPION
        </div>
        <div className="mt-4 font-mono text-9xl leading-none font-black tracking-tighter">
          {s.monthlyWins}
        </div>
        <div className="mt-2 font-mono text-2xl font-bold">
          {s.monthlyWins === 1 ? 'TIME 🏆' : 'TIMES 🏆'}
        </div>
        <div className="mt-6 max-w-xs font-mono text-base text-brutal-black/70">
          {s.monthlyWins >= 6
            ? 'Practically untouchable.'
            : s.monthlyWins >= 3
              ? 'You knew how to close out a month.'
              : 'You took a crown — and it counts.'}
        </div>
      </>
    ),
  },
  // 6. Best month + biggest day combo
  {
    bg: 'bg-brutal-blue',
    text: 'text-brutal-white',
    visible: (s) => !!s.bestMonth || !!s.biggestDay,
    render: (s) => (
      <>
        <div className="font-mono text-[10px] font-bold tracking-widest opacity-60">
          PEAK PERFORMANCE
        </div>
        {s.bestMonth && (
          <div className="mt-4">
            <div className="font-mono text-xs opacity-60">YOUR BIG MONTH</div>
            <div className="font-mono text-4xl font-black tracking-tighter">
              {s.bestMonth.month.toUpperCase()}
            </div>
            <div className="mt-1 font-mono text-sm opacity-80">{s.bestMonth.points} pts</div>
          </div>
        )}
        {s.biggestDay && (
          <div className="mt-6">
            <div className="font-mono text-xs opacity-60">YOUR BEST SINGLE DAY</div>
            <div className="font-mono text-3xl font-black tracking-tighter">
              {new Date(s.biggestDay.date + 'T00:00:00')
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                .toUpperCase()}
            </div>
            <div className="mt-1 font-mono text-sm opacity-80">
              {s.biggestDay.points} pts in one day
            </div>
          </div>
        )}
      </>
    ),
  },
  // 7. Day & hour pattern
  {
    bg: 'bg-brutal-pink',
    text: 'text-brutal-white',
    visible: (s) => !!s.topDay && !!s.topHour,
    render: (s) => {
      const h = s.topHour!.hour
      const period =
        h < 5
          ? 'NIGHT OWL'
          : h < 12
            ? 'MORNING'
            : h < 17
              ? 'AFTERNOON'
              : h < 21
                ? 'EVENING'
                : 'NIGHT'
      const hourLabel = `${String(h).padStart(2, '0')}:00`
      return (
        <>
          <div className="font-mono text-[10px] font-bold tracking-widest opacity-60">YOU'RE A</div>
          <div className="mt-4 font-mono text-5xl leading-none font-black tracking-tighter">
            {s.topDay!.label.toUpperCase()}
          </div>
          <div className="mt-1 font-mono text-5xl leading-none font-black tracking-tighter">
            {period}
          </div>
          <div className="mt-1 font-mono text-5xl leading-none font-black tracking-tighter">
            CHORE-DOER
          </div>
          <div className="mt-6 max-w-xs font-mono text-base opacity-80">
            Most active around {hourLabel} on a {s.topDay!.label.toLowerCase()}.
          </div>
        </>
      )
    },
  },
  // 8. Group share
  {
    bg: 'bg-brutal-lime',
    visible: (s) => s.groupSharePct > 0,
    render: (s) => (
      <>
        <div className="font-mono text-[10px] font-bold tracking-widest text-brutal-black/50">
          YOU PULLED
        </div>
        <div className="mt-4 font-mono text-9xl leading-none font-black tracking-tighter">
          {Math.round(s.groupSharePct)}%
        </div>
        <div className="mt-2 font-mono text-2xl font-bold">OF THE WEIGHT</div>
        <div className="mt-6 max-w-xs font-mono text-base text-brutal-black/70">
          {s.groupSharePct > 50
            ? "That's more than half. The group owes you."
            : s.groupSharePct > 25
              ? 'Solidly above your share. Quietly heroic.'
              : 'Every chore counts. You showed up.'}
        </div>
      </>
    ),
  },
  // 9. Outro
  {
    bg: 'bg-brutal-black',
    text: 'text-brutal-white',
    visible: () => true,
    render: (s, ctx) => (
      <>
        <Avatar name={ctx.displayName} color={ctx.avatarColor} size="lg" imageUrl={ctx.avatarUrl} />
        <div className="mt-6 font-mono text-[10px] font-bold tracking-widest opacity-60">
          THAT WAS YOUR
        </div>
        <div className="mt-1 font-mono text-7xl font-black tracking-tighter">{s.year}</div>
        <div className="mt-6 max-w-xs font-mono text-base opacity-80">
          Onward. The next chore is already waiting.
        </div>
      </>
    ),
  },
]

const ADVANCE_MS = 5000

export function WrappedPage() {
  const { user, profile } = useAuth()
  const { group } = useGroup()
  const { stats, loading } = useWrappedStats()
  const navigate = useNavigate()
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef<number | null>(null)
  const touchStartTime = useRef<number>(0)

  const cards = CARDS.filter((c) => c.visible(stats))
  const total = cards.length

  // Auto-advance unless paused. (Hooks must run before any early return.)
  useEffect(() => {
    if (loading || paused || idx >= total - 1) return
    const t = setTimeout(() => setIdx((i) => Math.min(total - 1, i + 1)), ADVANCE_MS)
    return () => clearTimeout(t)
  }, [idx, paused, loading, total])

  if (!group) return <Navigate to="/group" replace />
  if (!user) return <Navigate to="/auth" replace />
  const card = cards[idx] ?? cards[0]

  const ctx = {
    displayName: profile?.display_name ?? '?',
    avatarColor: profile?.avatar_color ?? '#FFE500',
    avatarUrl: profile?.avatar_url ?? null,
  }

  const next = () => setIdx((i) => Math.min(total - 1, i + 1))
  const prev = () => setIdx((i) => Math.max(0, i - 1))

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-brutal-yellow">
        <Spinner size="lg" />
      </div>
    )
  }

  if (stats.totalChores === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-brutal-yellow p-8 text-center">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center border-2 border-brutal-black bg-brutal-white"
        >
          <X size={16} />
        </button>
        <div className="mb-4 text-6xl">📭</div>
        <h1 className="font-mono text-3xl font-black">NOTHING YET</h1>
        <p className="mt-3 max-w-xs font-mono text-sm text-brutal-black/60">
          Complete some chores this year and your wrapped will appear here.
        </p>
      </div>
    )
  }

  return (
    <div
      className={`fixed inset-0 ${card.bg} ${card.text ?? 'text-brutal-black'} select-none`}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX
        touchStartTime.current = Date.now()
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        const dt = Date.now() - touchStartTime.current
        touchX.current = null
        if (Math.abs(dx) > 40) {
          if (dx < 0) next()
          else prev()
        } else if (dt < 250) {
          // Treat as tap: tap right half advances, tap left half goes back
          const w = window.innerWidth
          if (e.changedTouches[0].clientX > w / 2) next()
          else prev()
        }
      }}
    >
      {/* Progress bars */}
      <div className="absolute top-3 right-3 left-3 z-10 flex gap-1">
        {cards.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden bg-current opacity-20">
            <div
              className="h-full bg-current opacity-100"
              style={{
                width: i < idx ? '100%' : i === idx ? (paused ? '50%' : '100%') : '0%',
                transition: i === idx && !paused ? `width ${ADVANCE_MS}ms linear` : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Close */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 right-3 z-10 flex h-9 w-9 items-center justify-center border-2 border-current bg-transparent"
        aria-label="Close"
      >
        <X size={16} />
      </button>

      {/* Card content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        {card.render(stats, ctx)}
      </div>

      {/* Footer hint */}
      {idx < total - 1 && (
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-1 font-mono text-[10px] font-bold tracking-widest opacity-60">
          TAP TO CONTINUE <ChevronRight size={12} strokeWidth={3} />
        </div>
      )}
    </div>
  )
}

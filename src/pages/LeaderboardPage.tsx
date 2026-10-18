import { useMemo, useRef, useState } from 'react'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import { useStats, formatLastActive } from '@/lib/hooks/useStats'
import { useNudges } from '@/lib/hooks/useNudges'
import { useChampions } from '@/lib/hooks/useChampions'
import { useMonthlyPoints } from '@/lib/hooks/useMonthlyPoints'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from '@/components/ui/Toast'
import { Flame, Eye, BarChart3, Trophy, TrendingUp } from 'lucide-react'
import { playNudge } from '@/lib/sounds'

const rankColors = ['bg-brutal-yellow', 'bg-brutal-pink', 'bg-brutal-lime']

export function LeaderboardPage() {
  const { group } = useGroup()
  const { user } = useAuth()
  const { leaderboard } = useLeaderboard()
  const { stats } = useStats()
  const { nudges, unseenCount, sendNudge, markSeen } = useNudges()
  const { history, currentMonth, winCounts } = useChampions()
  const monthlyPoints = useMonthlyPoints()
  const [nudgingId, setNudgingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'month' | 'all'>('month')
  const navigate = useNavigate()

  // Champion carousel: chronological order (oldest → newest), with the
  // current in-progress month appended last when it has data.
  const championEntries = useMemo(() => {
    const past = [...history].reverse()
    return currentMonth ? [...past, currentMonth] : past
  }, [history, currentMonth])
  const isInProgress = (idx: number) => !!currentMonth && idx === championEntries.length - 1
  const defaultChampionIdx = currentMonth
    ? Math.max(0, championEntries.length - 2)
    : championEntries.length - 1
  const [championIdx, setChampionIdx] = useState<number | null>(null)
  const activeChampionIdx = championIdx ?? defaultChampionIdx
  const activeChampion = championEntries[activeChampionIdx] ?? null
  const touchStartX = useRef<number | null>(null)

  const sorted = useMemo(() => {
    if (filter === 'all') return leaderboard
    return [...leaderboard].sort(
      (a, b) => (monthlyPoints.get(b.user_id) ?? 0) - (monthlyPoints.get(a.user_id) ?? 0),
    )
  }, [filter, leaderboard, monthlyPoints])

  // Forecast for current month — projects each member's points to end-of-month
  // based on their current pace.
  const forecast = useMemo(() => {
    if (filter !== 'month') return null
    const now = new Date()
    const daysElapsed = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    if (daysElapsed < 3 || daysElapsed >= daysInMonth) return null

    const projected = leaderboard
      .map((m) => ({
        member: m,
        current: monthlyPoints.get(m.user_id) ?? 0,
        projected: Math.round(((monthlyPoints.get(m.user_id) ?? 0) * daysInMonth) / daysElapsed),
      }))
      .filter((p) => p.current > 0)
      .sort((a, b) => b.projected - a.projected)

    if (projected.length === 0) return null
    const top = projected[0]

    // If the projected leader differs from the current leader, frame it as an upset.
    const currentLeader = [...leaderboard].sort(
      (a, b) => (monthlyPoints.get(b.user_id) ?? 0) - (monthlyPoints.get(a.user_id) ?? 0),
    )[0]
    const isUpset = currentLeader && currentLeader.user_id !== top.member.user_id

    return { top, isUpset, currentLeader }
  }, [filter, leaderboard, monthlyPoints])

  if (!group) return <Navigate to="/group" replace />

  const pointsFor = (userId: string, allTime: number) =>
    filter === 'month' ? (monthlyPoints.get(userId) ?? 0) : allTime
  const maxPoints =
    sorted.length > 0 ? pointsFor(sorted[0].user_id, sorted[0].total_points) || 1 : 1

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 border-b-4 border-brutal-black bg-brutal-yellow px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="w-9" />
          <div className="text-center">
            <h1 className="font-mono text-2xl font-bold tracking-tight">LEADERBOARD</h1>
            <p className="mt-0.5 font-mono text-xs text-brutal-black/60">{group.name}</p>
          </div>
          <button
            onClick={() => navigate('/report')}
            className="flex h-9 w-9 items-center justify-center border-2 border-brutal-black bg-brutal-blue text-brutal-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <BarChart3 size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Nudge notifications */}
      {unseenCount > 0 && (
        <button
          onClick={markSeen}
          className="mx-4 mt-3 flex items-center justify-between border-2 border-brutal-pink bg-brutal-pink/15 p-3"
        >
          <span className="font-mono text-xs font-bold text-brutal-pink">
            {unseenCount === 1
              ? `${nudges[0]?.profiles.display_name} nudged you 👀`
              : `You got ${unseenCount} nudges 👀👀`}
          </span>
          <span className="font-mono text-[10px] text-brutal-pink/60">TAP TO DISMISS</span>
        </button>
      )}

      {/* Monthly champion — swipeable carousel */}
      {activeChampion && (
        <div className="mt-3 px-4">
          <div
            className="border-2 border-brutal-black bg-brutal-yellow shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] select-none"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return
              const dx = e.changedTouches[0].clientX - touchStartX.current
              touchStartX.current = null
              if (Math.abs(dx) < 40) return
              if (dx < 0 && activeChampionIdx < championEntries.length - 1) {
                setChampionIdx(activeChampionIdx + 1)
              } else if (dx > 0 && activeChampionIdx > 0) {
                setChampionIdx(activeChampionIdx - 1)
              }
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b-2 border-brutal-black px-3 py-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Trophy size={12} strokeWidth={3} />
                <span className="truncate font-mono text-[10px] font-bold tracking-widest">
                  {isInProgress(activeChampionIdx)
                    ? 'THIS MONTH · IN PROGRESS'
                    : 'MONTHLY CHAMPION'}
                </span>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-bold text-brutal-black/50">
                {activeChampion.monthLabel}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3">
              <Avatar
                name={activeChampion.display_name}
                color={activeChampion.avatar_color}
                size="md"
                imageUrl={activeChampion.avatar_url}
              />
              <div className="min-w-0 flex-1">
                <span className="block truncate font-mono text-sm font-bold">
                  {activeChampion.display_name}
                </span>
                <span className="block truncate font-mono text-[10px] text-brutal-black/60">
                  {isInProgress(activeChampionIdx)
                    ? (activeChampion.prize ?? 'Still up for grabs')
                    : (activeChampion.prize ?? 'No prize claimed')}
                </span>
              </div>
              <div className="text-right font-mono text-xl font-bold">
                {activeChampion.points}
                <div className="text-[10px] font-bold text-brutal-black/40">PTS</div>
              </div>
            </div>
            {championEntries.length > 1 && (
              <div className="flex justify-center gap-1.5 pb-2">
                {championEntries.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 transition-all ${
                      i === activeChampionIdx ? 'w-4 bg-brutal-black' : 'w-1.5 bg-brutal-black/25'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Forecast banner */}
      {forecast && (
        <div className="mt-3 px-4">
          <div className="flex items-center gap-2 border-2 border-brutal-black bg-brutal-blue px-3 py-2 text-brutal-white">
            <TrendingUp size={14} strokeWidth={3} />
            <span className="flex-1 truncate font-mono text-[11px] font-bold">
              {forecast.isUpset && forecast.currentLeader
                ? `${forecast.top.member.profiles.display_name.toUpperCase()} ON PACE TO OVERTAKE ${forecast.currentLeader.profiles.display_name.toUpperCase()}`
                : `${forecast.top.member.profiles.display_name.toUpperCase()} ON PACE FOR ${forecast.top.projected} PTS`}
            </span>
          </div>
        </div>
      )}

      {/* Month / All-time toggle */}
      <div className="mt-3 px-4">
        <div className="grid grid-cols-2 border-2 border-brutal-black bg-brutal-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          {(['month', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`py-2 font-mono text-xs font-bold tracking-widest transition-colors ${
                filter === f
                  ? 'bg-brutal-black text-brutal-white'
                  : 'bg-brutal-white text-brutal-black/60 active:bg-brutal-black/5'
              }`}
            >
              {f === 'month' ? 'THIS MONTH' : 'ALL TIME'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {sorted.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-3 text-4xl">🏆</div>
            <p className="font-mono text-sm font-bold text-brutal-black/40">NO SCORES YET</p>
            <p className="mt-1 font-mono text-xs text-brutal-black/30">
              Complete chores to earn points
            </p>
          </div>
        ) : (
          sorted.map((member, i) => {
            const isMe = member.user_id === user?.id
            const points = pointsFor(member.user_id, member.total_points)
            const barWidth = maxPoints > 0 ? (points / maxPoints) * 100 : 0
            const memberStats = stats.get(member.user_id)
            const lastActive = formatLastActive(memberStats?.last_completion ?? null)
            const streak = memberStats?.current_streak ?? 0

            return (
              <div
                key={member.id}
                className={`border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  isMe ? 'bg-brutal-yellow/20' : 'bg-brutal-white'
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Rank */}
                  <div
                    className={`flex h-10 w-10 items-center justify-center border-2 border-brutal-black font-mono text-lg font-bold ${
                      rankColors[i] ?? 'bg-brutal-white'
                    }`}
                  >
                    {i + 1}
                  </div>

                  {/* Avatar + name */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={member.profiles.display_name}
                        color={member.profiles.avatar_color}
                        size="sm"
                        imageUrl={member.profiles.avatar_url}
                      />
                      <span className="truncate font-mono text-sm font-bold">
                        {member.profiles.display_name}
                        {isMe && ' (YOU)'}
                      </span>
                      {streak >= 2 && (
                        <span className="inline-flex items-center gap-0.5 border border-brutal-orange bg-brutal-orange/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brutal-orange">
                          <Flame size={10} /> {streak}
                        </span>
                      )}
                      {(winCounts.get(member.user_id) ?? 0) > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 border border-brutal-black bg-brutal-yellow px-1.5 py-0.5 font-mono text-[10px] font-bold"
                          title={`${winCounts.get(member.user_id)} monthly ${winCounts.get(member.user_id) === 1 ? 'win' : 'wins'}`}
                        >
                          <Trophy size={10} strokeWidth={2.5} /> {winCounts.get(member.user_id)}
                        </span>
                      )}
                    </div>
                    {/* Points bar */}
                    <div className="mt-2 h-2 border border-brutal-black/20 bg-brutal-black/10">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: member.profiles.avatar_color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Points */}
                  <div className="min-w-[60px] text-right font-mono text-xl font-bold">
                    {points}
                    <div className="text-[10px] font-bold text-brutal-black/40">PTS</div>
                  </div>
                </div>

                {/* Last active + nudge */}
                <div className="flex items-center justify-between border-t-2 border-brutal-black/15 px-3 py-1.5">
                  <span className="font-mono text-[10px] text-brutal-black/40">LAST ACTIVE</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        !memberStats?.last_completion
                          ? 'text-brutal-pink'
                          : lastActive.includes('day')
                            ? 'text-brutal-orange'
                            : 'text-brutal-black/50'
                      }`}
                    >
                      {lastActive.toUpperCase()}
                    </span>
                    {!isMe && (
                      <button
                        onClick={async () => {
                          setNudgingId(member.user_id)
                          await sendNudge(member.user_id)
                          playNudge()
                          toast(`Nudged ${member.profiles.display_name} 👀`, 'bg-brutal-pink')
                          setNudgingId(null)
                        }}
                        disabled={nudgingId === member.user_id}
                        className="flex h-7 w-7 items-center justify-center border border-brutal-pink bg-brutal-pink/10 transition-colors hover:bg-brutal-pink/20 active:bg-brutal-pink/30"
                      >
                        <Eye size={12} className="text-brutal-pink" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

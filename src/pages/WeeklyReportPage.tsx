import { useState, useEffect, useCallback } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MemberStats {
  user_id: string
  display_name: string
  avatar_color: string
  points: number
  completions: number
  topChore: string | null
}

interface ChoreBreakdown {
  name: string
  doers: { user_id: string; display_name: string; avatar_color: string; count: number }[]
  total: number
}

type Period = 'week' | 'month' | 'year'

function getRange(period: Period, offset: number): { start: Date; end: Date; label: string } {
  const now = new Date()

  if (period === 'week') {
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + offset * 7)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const label = offset === 0 ? 'THIS WEEK' : offset === -1 ? 'LAST WEEK' : `${fmt(monday)} – ${fmt(sunday)}`
    return { start: monday, end: sunday, label }
  }

  if (period === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
    const label = offset === 0 ? 'THIS MONTH' : offset === -1 ? 'LAST MONTH' : d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase()
    return { start, end, label }
  }

  // year
  const year = now.getFullYear() + offset
  const start = new Date(year, 0, 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(year, 11, 31)
  end.setHours(23, 59, 59, 999)
  const label = offset === 0 ? 'THIS YEAR' : `${year}`
  return { start, end, label }
}

export function WeeklyReportPage() {
  const { group, members } = useGroup()
  const { user } = useAuth()
  const [period, setPeriod] = useState<Period>('week')
  const [offset, setOffset] = useState(0)
  const [stats, setStats] = useState<MemberStats[]>([])
  const [choreBreakdown, setChoreBreakdown] = useState<ChoreBreakdown[]>([])
  const [loading, setLoading] = useState(true)

  const { start, end, label } = getRange(period, offset)
  const totalPoints = stats.reduce((sum, s) => sum + s.points, 0)
  const hasShares = members.some(m => m.chore_share > 0)

  const fetchStats = useCallback(async () => {
    if (!group) return
    setLoading(true)

    const { data: completions } = await supabase
      .from('completions')
      .select('user_id, points_earned, chores!left(name)')
      .eq('group_id', group.id)
      .gte('completed_at', start.toISOString())
      .lte('completed_at', end.toISOString())

    const memberMap = new Map<string, { points: number; completions: number; choreCounts: Map<string, number> }>()

    for (const c of (completions ?? []) as unknown as { user_id: string; points_earned: number; chores: { name: string } | null }[]) {
      if (!memberMap.has(c.user_id)) {
        memberMap.set(c.user_id, { points: 0, completions: 0, choreCounts: new Map() })
      }
      const entry = memberMap.get(c.user_id)!
      entry.points += c.points_earned
      entry.completions += 1
      const choreName = c.chores?.name ?? 'Unknown'
      entry.choreCounts.set(choreName, (entry.choreCounts.get(choreName) ?? 0) + 1)
    }

    const result: MemberStats[] = members.map(m => {
      const data = memberMap.get(m.user_id)
      let topChore: string | null = null
      if (data) {
        let maxCount = 0
        for (const [name, count] of data.choreCounts) {
          if (count > maxCount) { maxCount = count; topChore = name }
        }
      }
      return {
        user_id: m.user_id,
        display_name: m.profiles.display_name,
        avatar_color: m.profiles.avatar_color,
        points: data?.points ?? 0,
        completions: data?.completions ?? 0,
        topChore,
      }
    }).sort((a, b) => b.points - a.points)

    // Build chore breakdown
    const choreMap = new Map<string, Map<string, number>>()
    for (const c of (completions ?? []) as unknown as { user_id: string; points_earned: number; chores: { name: string } | null }[]) {
      const choreName = c.chores?.name ?? 'Unknown'
      if (!choreMap.has(choreName)) choreMap.set(choreName, new Map())
      const doerMap = choreMap.get(choreName)!
      doerMap.set(c.user_id, (doerMap.get(c.user_id) ?? 0) + 1)
    }

    const breakdown: ChoreBreakdown[] = Array.from(choreMap.entries())
      .map(([name, doerMap]) => {
        const doers = Array.from(doerMap.entries())
          .map(([userId, count]) => {
            const m = members.find(m => m.user_id === userId)
            return {
              user_id: userId,
              display_name: m?.profiles.display_name ?? '?',
              avatar_color: m?.profiles.avatar_color ?? '#ccc',
              count,
            }
          })
          .sort((a, b) => b.count - a.count)
        return { name, doers, total: doers.reduce((s, d) => s + d.count, 0) }
      })
      .sort((a, b) => b.total - a.total)

    setChoreBreakdown(breakdown)
    setStats(result)
    setLoading(false)
  }, [group, members, start.getTime(), end.getTime()])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (!group) return <Navigate to="/group" replace />

  const winner = stats[0]
  const hasActivity = totalPoints > 0
  const periodLabel = period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'this year'
  const periodLabels: { label: string; value: Period }[] = [
    { label: 'WEEK', value: 'week' },
    { label: 'MONTH', value: 'month' },
    { label: 'YEAR', value: 'year' },
  ]

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-brutal-blue border-b-4 border-brutal-black px-4 py-4">
        {/* Period toggle */}
        <div className="flex justify-center gap-1 mb-3">
          {periodLabels.map(p => (
            <button
              key={p.value}
              onClick={() => { setPeriod(p.value); setOffset(0) }}
              className={`font-mono text-[10px] font-bold px-3 py-1.5 border border-brutal-white/30 transition-all ${
                period === p.value
                  ? 'bg-brutal-white text-brutal-blue'
                  : 'text-brutal-white/60 active:text-brutal-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setOffset(o => o - 1)} className="text-brutal-white/60 active:text-brutal-white">
            <ChevronLeft size={18} />
          </button>
          <span className="font-mono text-xs text-brutal-white/80 font-bold min-w-[140px] text-center">{label}</span>
          <button
            onClick={() => setOffset(o => Math.min(o + 1, 0))}
            disabled={offset >= 0}
            className={`${offset >= 0 ? 'opacity-20' : 'text-brutal-white/60 active:text-brutal-white'}`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="py-12"><Spinner /></div>
        ) : !hasActivity ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="font-mono font-bold text-brutal-black/40 text-sm">NO ACTIVITY {label}</p>
            <p className="font-mono text-brutal-black/30 text-xs mt-1">Get to work!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Champion */}
            {winner && winner.points > 0 && (
              <div className="bg-brutal-yellow border-3 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 text-center">
                <p className="font-mono text-[10px] text-brutal-black/50 font-bold tracking-widest">TOP CONTRIBUTOR</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Avatar name={winner.display_name} color={winner.avatar_color} size="sm" />
                  <span className="font-mono font-bold text-xl">{winner.display_name}</span>
                </div>
                <p className="font-mono font-bold text-3xl mt-1">{winner.points} PTS</p>
                <p className="font-mono text-xs text-brutal-black/50 mt-1">
                  {totalPoints > 0 ? Math.round((winner.points / totalPoints) * 100) : 0}% of all work {periodLabel}.
                  {Math.round((winner.points / totalPoints) * 100) > 60 ? ' Carrying the team.' : ''}
                </p>
              </div>
            )}

            {/* Breakdown */}
            <div className="space-y-2">
              <h3 className="font-mono font-bold text-xs text-brutal-black/40 tracking-widest px-1">BREAKDOWN</h3>
              {stats.map(member => {
                const pct = totalPoints > 0 ? (member.points / totalPoints) * 100 : 0
                const isMe = member.user_id === user?.id
                const memberData = members.find(m => m.user_id === member.user_id)
                const expectedShare = hasShares && memberData ? memberData.chore_share : Math.round(100 / members.length)
                const expectedPoints = totalPoints * (expectedShare / 100)
                const fairPct = expectedPoints > 0 ? Math.round((member.points / expectedPoints) * 100) : 0

                return (
                  <div
                    key={member.user_id}
                    className={`border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 ${
                      isMe ? 'bg-brutal-yellow/20' : 'bg-brutal-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={member.display_name} color={member.avatar_color} size="sm" />
                        <span className="font-mono font-bold text-sm">{member.display_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm">{member.points} PTS</span>
                        {hasShares && totalPoints > 0 && (
                          <span className={`ml-2 font-mono font-bold text-xs ${
                            fairPct >= 100 ? 'text-green-600' : fairPct >= 70 ? 'text-brutal-orange' : 'text-brutal-pink'
                          }`}>
                            {fairPct}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Percentage bar */}
                    <div className="h-3 bg-brutal-black/10 border border-brutal-black/20 mb-2">
                      <div
                        className="h-full bg-brutal-blue transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-brutal-black/40">
                        {member.completions} chore{member.completions !== 1 ? 's' : ''} done
                      </span>
                      <span className="font-mono text-[10px] text-brutal-black/40">
                        {hasShares ? `${Math.round(pct)}% done (${expectedShare}% share)` : `${Math.round(pct)}% of total`}
                      </span>
                    </div>

                    {member.topChore && (
                      <div className="mt-1">
                        <span className="font-mono text-[10px] text-brutal-black/30">
                          Most done: {member.topChore}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Who does what */}
            {choreBreakdown.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-mono font-bold text-xs text-brutal-black/40 tracking-widest px-1">WHO DOES WHAT</h3>
                {choreBreakdown.map(chore => (
                  <div key={chore.name} className="border-2 border-brutal-black p-3 bg-brutal-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-sm">{chore.name}</span>
                      <span className="font-mono text-[10px] text-brutal-black/40">{chore.total}x</span>
                    </div>
                    <div className="flex gap-1 h-4 mb-2">
                      {chore.doers.map(d => (
                        <div
                          key={d.user_id}
                          className="h-full border border-brutal-black/20"
                          style={{
                            width: `${(d.count / chore.total) * 100}%`,
                            backgroundColor: d.avatar_color,
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {chore.doers.map(d => (
                        <div key={d.user_id} className="flex items-center gap-1">
                          <div
                            className="w-2.5 h-2.5 border border-brutal-black/30"
                            style={{ backgroundColor: d.avatar_color }}
                          />
                          <span className="font-mono text-[10px] text-brutal-black/60">
                            {d.display_name} {d.count}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sass */}
            {stats.length >= 2 && stats[stats.length - 1].points === 0 && (
              <div className="bg-brutal-pink/10 border-2 border-brutal-pink p-3 text-center">
                <p className="font-mono text-xs font-bold text-brutal-pink">
                  {stats[stats.length - 1].display_name} did literally nothing {periodLabel}. Just saying.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeeklyMemberStats {
  user_id: string
  display_name: string
  avatar_color: string
  points: number
  completions: number
  topChore: string | null
}

function getWeekRange(offset: number): { start: Date; end: Date; label: string } {
  const now = new Date()
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

export function WeeklyReportPage() {
  const { group, members } = useGroup()
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [stats, setStats] = useState<WeeklyMemberStats[]>([])
  const [loading, setLoading] = useState(true)

  const { start, end, label } = getWeekRange(weekOffset)
  const totalPoints = stats.reduce((sum, s) => sum + s.points, 0)

  const fetchWeeklyStats = useCallback(async () => {
    if (!group) return
    setLoading(true)

    const { data: completions } = await supabase
      .from('completions')
      .select('user_id, points_earned, chores(name)')
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

    const result: WeeklyMemberStats[] = members.map(m => {
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

    setStats(result)
    setLoading(false)
  }, [group, members, start.getTime(), end.getTime()])

  useEffect(() => {
    fetchWeeklyStats()
  }, [fetchWeeklyStats])

  if (!group) return <Navigate to="/group" replace />

  const winner = stats[0]
  const hasActivity = totalPoints > 0

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-brutal-blue border-b-4 border-brutal-black px-4 py-4">
        <h1 className="font-mono font-bold text-2xl tracking-tight text-center text-brutal-white">WEEKLY REPORT</h1>
        <div className="flex items-center justify-center gap-3 mt-1">
          <button onClick={() => setWeekOffset(w => w - 1)} className="text-brutal-white/60 active:text-brutal-white">
            <ChevronLeft size={18} />
          </button>
          <span className="font-mono text-xs text-brutal-white/80 font-bold min-w-[120px] text-center">{label}</span>
          <button
            onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
            disabled={weekOffset >= 0}
            className={`${weekOffset >= 0 ? 'opacity-20' : 'text-brutal-white/60 active:text-brutal-white'}`}
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
            <p className="font-mono font-bold text-brutal-black/40 text-sm">NO ACTIVITY THIS WEEK</p>
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
                  {totalPoints > 0 ? Math.round((winner.points / totalPoints) * 100) : 0}% of all work this week.
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
                      <span className="font-mono font-bold text-sm">{member.points} PTS</span>
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
                        {Math.round(pct)}% of total
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

            {/* Sass */}
            {stats.length >= 2 && stats[stats.length - 1].points === 0 && (
              <div className="bg-brutal-pink/10 border-2 border-brutal-pink p-3 text-center">
                <p className="font-mono text-xs font-bold text-brutal-pink">
                  {stats[stats.length - 1].display_name} did literally nothing this week. Just saying.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

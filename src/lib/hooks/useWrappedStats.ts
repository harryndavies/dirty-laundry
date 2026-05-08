import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'

export interface WrappedStats {
  year: number
  totalChores: number
  totalPoints: number
  topChore: { name: string; count: number } | null
  longestStreak: number
  monthlyWins: number
  bestMonth: { month: string; points: number } | null
  topDay: { label: string; count: number } | null
  topHour: { hour: number; count: number } | null
  biggestDay: { date: string; points: number } | null
  groupSharePct: number // your % of the whole group's points this year
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const EMPTY: WrappedStats = {
  year: new Date().getFullYear(),
  totalChores: 0,
  totalPoints: 0,
  topChore: null,
  longestStreak: 0,
  monthlyWins: 0,
  bestMonth: null,
  topDay: null,
  topHour: null,
  biggestDay: null,
  groupSharePct: 0,
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useWrappedStats(): { stats: WrappedStats; loading: boolean } {
  const { user } = useAuth()
  const { group } = useGroup()
  const year = new Date().getFullYear()

  const { data, isLoading } = useQuery({
    queryKey: ['wrapped', user?.id, group?.id, year],
    enabled: !!user && !!group,
    queryFn: async (): Promise<WrappedStats> => {
      const yearStart = new Date(year, 0, 1).toISOString()
      const yearEnd = new Date(year + 1, 0, 1).toISOString()

      const { data: rows } = await supabase
        .from('completions')
        .select('user_id, points_earned, chore_name, completed_at')
        .eq('group_id', group!.id)
        .gte('completed_at', yearStart)
        .lt('completed_at', yearEnd)

      type Row = { user_id: string; points_earned: number; chore_name: string | null; completed_at: string }
      const all = (rows ?? []) as unknown as Row[]
      const mine = all.filter(r => r.user_id === user!.id)
      if (mine.length === 0) return { ...EMPTY, year }

      // Total chores + points
      const totalChores = mine.length
      const totalPoints = mine.reduce((s, r) => s + r.points_earned, 0)

      // Top chore
      const choreCounts = new Map<string, number>()
      for (const r of mine) {
        const name = r.chore_name ?? 'Unknown'
        choreCounts.set(name, (choreCounts.get(name) ?? 0) + 1)
      }
      let topChore: { name: string; count: number } | null = null
      for (const [name, count] of choreCounts) {
        if (!topChore || count > topChore.count) topChore = { name, count }
      }

      // Daily totals (for longest streak + biggest day + best month)
      const dailyPoints = new Map<string, number>()
      const monthlyPoints = new Map<number, number>()
      const dayCounts = new Array(7).fill(0)
      const hourCounts = new Array(24).fill(0)
      for (const r of mine) {
        const d = new Date(r.completed_at)
        const dk = dayKey(d)
        dailyPoints.set(dk, (dailyPoints.get(dk) ?? 0) + r.points_earned)
        monthlyPoints.set(d.getMonth(), (monthlyPoints.get(d.getMonth()) ?? 0) + r.points_earned)
        dayCounts[d.getDay()]++
        hourCounts[d.getHours()]++
      }

      // Longest streak (consecutive days with at least one completion)
      const sortedDays = [...dailyPoints.keys()].sort()
      let longestStreak = 0
      let current = 0
      let prev: Date | null = null
      for (const dk of sortedDays) {
        const d = new Date(dk + 'T00:00:00')
        if (prev) {
          const diff = Math.round((d.getTime() - prev.getTime()) / 86400000)
          current = diff === 1 ? current + 1 : 1
        } else {
          current = 1
        }
        longestStreak = Math.max(longestStreak, current)
        prev = d
      }

      // Biggest single day
      let biggestDay: { date: string; points: number } | null = null
      for (const [dk, p] of dailyPoints) {
        if (!biggestDay || p > biggestDay.points) biggestDay = { date: dk, points: p }
      }

      // Best month
      let bestMonth: { month: string; points: number } | null = null
      for (const [m, p] of monthlyPoints) {
        if (!bestMonth || p > bestMonth.points) bestMonth = { month: MONTH_NAMES[m], points: p }
      }

      // Top day-of-week and hour
      const topDayIdx = dayCounts.indexOf(Math.max(...dayCounts))
      const topHourIdx = hourCounts.indexOf(Math.max(...hourCounts))
      const topDay = dayCounts[topDayIdx] > 0 ? { label: DAY_NAMES[topDayIdx], count: dayCounts[topDayIdx] } : null
      const topHour = hourCounts[topHourIdx] > 0 ? { hour: topHourIdx, count: hourCounts[topHourIdx] } : null

      // Monthly wins (how many calendar months you topped the group)
      const groupMonthly = new Map<string, Map<string, number>>()
      for (const r of all) {
        const d = new Date(r.completed_at)
        const k = `${d.getFullYear()}-${d.getMonth()}`
        if (!groupMonthly.has(k)) groupMonthly.set(k, new Map())
        const u = groupMonthly.get(k)!
        u.set(r.user_id, (u.get(r.user_id) ?? 0) + r.points_earned)
      }
      const now = new Date()
      const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`
      let monthlyWins = 0
      for (const [k, u] of groupMonthly) {
        if (k === currentMonthKey) continue // current month still in progress
        let topId = ''
        let topPts = 0
        for (const [uid, p] of u) {
          if (p > topPts) { topPts = p; topId = uid }
        }
        if (topId === user!.id) monthlyWins++
      }

      // Group share
      const groupTotal = all.reduce((s, r) => s + r.points_earned, 0)
      const groupSharePct = groupTotal > 0 ? (totalPoints / groupTotal) * 100 : 0

      return {
        year,
        totalChores,
        totalPoints,
        topChore,
        longestStreak,
        monthlyWins,
        bestMonth,
        topDay,
        topHour,
        biggestDay,
        groupSharePct,
      }
    },
  })

  return { stats: data ?? { ...EMPTY, year }, loading: isLoading }
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

export interface DailyPoints {
  date: string // YYYY-MM-DD
  points: number
  cumulative: number
}

export interface MemberPointsHistory {
  userId: string
  displayName: string
  color: string
  daily: DailyPoints[]
}

export function usePointsHistory(start: Date, end: Date) {
  const { group, members } = useGroup()

  return useQuery({
    queryKey: ['points-history', group?.id, start.getTime(), end.getTime()],
    enabled: !!group && members.length > 0,
    queryFn: async () => {
      const { data: completions, error } = await supabase
        .from('completions')
        .select('user_id, points_earned, completed_at')
        .eq('group_id', group!.id)
        .gte('completed_at', start.toISOString())
        .lte('completed_at', end.toISOString())
        .order('completed_at', { ascending: true })

      if (error) throw error

      // Build date range (cap at today so we don't chart future dates)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const dates: string[] = []
      const d = new Date(start)
      const endDay = end > today ? today : new Date(end)
      while (d <= endDay) {
        dates.push(d.toISOString().slice(0, 10))
        d.setDate(d.getDate() + 1)
      }

      // Group completions by user + date
      const byUserDate = new Map<string, Map<string, number>>()
      for (const c of completions ?? []) {
        const date = c.completed_at.slice(0, 10)
        if (!byUserDate.has(c.user_id)) byUserDate.set(c.user_id, new Map())
        const userMap = byUserDate.get(c.user_id)!
        userMap.set(date, (userMap.get(date) ?? 0) + c.points_earned)
      }

      // Build per-member history with cumulative totals
      const histories: MemberPointsHistory[] = members.map(member => {
        const userMap = byUserDate.get(member.user_id) ?? new Map()
        let cumulative = 0
        const daily = dates.map(date => {
          const points = userMap.get(date) ?? 0
          cumulative += points
          return { date, points, cumulative }
        })

        return {
          userId: member.user_id,
          displayName: member.profiles.display_name,
          color: member.profiles.avatar_color ?? '#000000',
          daily,
        }
      })

      return histories
    },
  })
}

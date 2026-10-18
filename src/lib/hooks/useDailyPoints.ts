import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'

const EMPTY: Map<string, number> = new Map()

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useDailyPoints(days: number = 365): Map<string, number> {
  const { user } = useAuth()
  const { group, members } = useGroup()

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  // Member total_points changes signal new completions land — refetch then.
  const me = members.find((m) => m.user_id === user?.id)

  const { data } = useQuery({
    queryKey: ['dailyPoints', user?.id, group?.id, days, me?.total_points ?? 0],
    enabled: !!user && !!group,
    queryFn: async (): Promise<Map<string, number>> => {
      const { data: completions } = await supabase
        .from('completions')
        .select('points_earned, completed_at')
        .eq('user_id', user!.id)
        .eq('group_id', group!.id)
        .gte('completed_at', start.toISOString())

      const totals = new Map<string, number>()
      for (const c of completions ?? []) {
        const key = dayKey(new Date(c.completed_at))
        totals.set(key, (totals.get(key) ?? 0) + c.points_earned)
      }
      return totals
    },
  })

  return data ?? EMPTY
}

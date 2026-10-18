import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

const EMPTY: Map<string, number> = new Map()

export function useMonthlyPoints(): Map<string, number> {
  const { group, members } = useGroup()

  // Local-time first day of this month, so the boundary matches the user's
  // calendar (same convention as useChampions).
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Refetch whenever any member's all-time points change — refreshMembers()
  // fires after every new completion, so this signal is sufficient.
  const totalsKey = members.map((m) => `${m.user_id}:${m.total_points}`).join(',')

  const { data } = useQuery({
    queryKey: ['monthlyPoints', group?.id, start, totalsKey],
    enabled: !!group,
    queryFn: async (): Promise<Map<string, number>> => {
      const { data: completions } = await supabase
        .from('completions')
        .select('user_id, points_earned')
        .eq('group_id', group!.id)
        .gte('completed_at', start)

      const totals = new Map<string, number>()
      for (const c of completions ?? []) {
        totals.set(c.user_id, (totals.get(c.user_id) ?? 0) + c.points_earned)
      }
      return totals
    },
  })

  return data ?? EMPTY
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

export interface MonthlyChampion {
  monthKey: string // "2026-04"
  monthLabel: string // "APR 2026"
  user_id: string
  display_name: string
  avatar_color: string
  avatar_url: string | null
  points: number
  prize: string | null
}

interface UseChampionsResult {
  lastMonth: MonthlyChampion | null
  currentMonth: MonthlyChampion | null
  history: MonthlyChampion[]
  winCounts: Map<string, number>
}

const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

const EMPTY: UseChampionsResult = {
  lastMonth: null,
  currentMonth: null,
  history: [],
  winCounts: new Map(),
}

export function useChampions(): UseChampionsResult {
  const { group, members } = useGroup()

  const { data } = useQuery({
    queryKey: [
      'champions',
      group?.id,
      members.map((m) => `${m.user_id}:${m.monthly_prize ?? ''}`).join(','),
    ],
    enabled: !!group && members.length >= 2,
    queryFn: async (): Promise<UseChampionsResult> => {
      const { data: completions } = await supabase
        .from('completions')
        .select('user_id, points_earned, completed_at')
        .eq('group_id', group!.id)
        .order('completed_at', { ascending: true })

      if (!completions || completions.length === 0) return EMPTY

      // Sum points by month and user (using local-time month so champions match
      // the user's calendar, not UTC).
      const monthlyPoints = new Map<string, Map<string, number>>()
      for (const c of completions) {
        const date = new Date(c.completed_at)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!monthlyPoints.has(key)) monthlyPoints.set(key, new Map())
        const userMap = monthlyPoints.get(key)!
        userMap.set(c.user_id, (userMap.get(c.user_id) ?? 0) + c.points_earned)
      }

      const now = new Date()
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const history: MonthlyChampion[] = []
      const winCounts = new Map<string, number>()

      const buildChampion = (monthKey: string): MonthlyChampion | null => {
        const scores = monthlyPoints.get(monthKey)
        if (!scores) return null

        let topUserId = ''
        let topPoints = 0
        for (const [userId, points] of scores) {
          if (points > topPoints) {
            topPoints = points
            topUserId = userId
          }
        }
        if (topPoints === 0) return null

        const member = members.find((m) => m.user_id === topUserId)
        if (!member) return null

        const [year, monthNum] = monthKey.split('-')
        return {
          monthKey,
          monthLabel: `${MONTH_NAMES[parseInt(monthNum) - 1]} ${year}`,
          user_id: topUserId,
          display_name: member.profiles.display_name,
          avatar_color: member.profiles.avatar_color,
          avatar_url: member.profiles.avatar_url,
          points: topPoints,
          prize: member.monthly_prize ?? null,
        }
      }

      // Newest first, current month excluded (it's still in progress)
      const pastMonths = [...monthlyPoints.keys()]
        .filter((k) => k !== currentKey)
        .sort()
        .reverse()
      for (const monthKey of pastMonths) {
        const champion = buildChampion(monthKey)
        if (!champion) continue
        history.push(champion)
        winCounts.set(champion.user_id, (winCounts.get(champion.user_id) ?? 0) + 1)
      }

      const currentMonth = buildChampion(currentKey)

      return { lastMonth: history[0] ?? null, currentMonth, history, winCounts }
    },
  })

  return data ?? EMPTY
}

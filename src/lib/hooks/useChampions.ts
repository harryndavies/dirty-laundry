import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

interface MonthlyChampion {
  month: string // "Apr 2026"
  monthKey: string // "2026-04"
  user_id: string
  display_name: string
  avatar_color: string
  points: number
  isCurrent: boolean
}

export function useChampions() {
  const { group, members } = useGroup()
  const [champions, setChampions] = useState<MonthlyChampion[]>([])
  const [currentLeader, setCurrentLeader] = useState<MonthlyChampion | null>(null)

  const calculate = useCallback(async () => {
    if (!group || members.length < 2) return

    // Fetch all completions for the group
    const { data: completions } = await supabase
      .from('completions')
      .select('user_id, points_earned, completed_at')
      .eq('group_id', group.id)
      .order('completed_at', { ascending: true })

    if (!completions || completions.length === 0) return

    // Group by month
    const monthlyPoints = new Map<string, Map<string, number>>()

    for (const c of completions) {
      const date = new Date(c.completed_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyPoints.has(key)) {
        monthlyPoints.set(key, new Map())
      }
      const monthMap = monthlyPoints.get(key)!
      monthMap.set(c.user_id, (monthMap.get(c.user_id) ?? 0) + c.points_earned)
    }

    const now = new Date()
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const result: MonthlyChampion[] = []

    // Sort months chronologically (newest first)
    const sortedMonths = [...monthlyPoints.keys()].sort().reverse()

    for (const monthKey of sortedMonths) {
      const scores = monthlyPoints.get(monthKey)!
      const isCurrent = monthKey === currentKey

      // Find winner
      let topUserId = ''
      let topPoints = 0

      for (const [userId, points] of scores) {
        if (points > topPoints) {
          topPoints = points
          topUserId = userId
        }
      }

      const member = members.find(m => m.user_id === topUserId)
      if (!member || topPoints === 0) continue

      const [year, monthNum] = monthKey.split('-')
      const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1)
      const monthLabel = monthDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase()

      const champion: MonthlyChampion = {
        month: monthLabel,
        monthKey,
        user_id: topUserId,
        display_name: member.profiles.display_name,
        avatar_color: member.profiles.avatar_color,
        points: topPoints,
        isCurrent,
      }

      if (isCurrent) {
        setCurrentLeader(champion)
      } else {
        result.push(champion)
      }
    }

    setChampions(result)
  }, [group, members])

  useEffect(() => {
    calculate()
  }, [calculate])

  return { champions, currentLeader }
}

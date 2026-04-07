import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

interface GroupStats {
  streak: number
  weeklyPoints: number
  weeklyGoal: number | null
}

export function useGroupStats() {
  const { group } = useGroup()
  const [stats, setStats] = useState<GroupStats>({ streak: 0, weeklyPoints: 0, weeklyGoal: null })

  const calculate = useCallback(async () => {
    if (!group) return

    // Fetch completions for streak calculation (last 90 days)
    const since = new Date()
    since.setDate(since.getDate() - 90)

    const { data: completions } = await supabase
      .from('completions')
      .select('completed_at')
      .eq('group_id', group.id)
      .gte('completed_at', since.toISOString())
      .order('completed_at', { ascending: false })

    // Calculate group streak — consecutive days with at least one completion
    const daysWithActivity = new Set<string>()
    for (const c of completions ?? []) {
      const date = new Date(c.completed_at)
      daysWithActivity.add(date.toISOString().split('T')[0])
    }

    let streak = 0
    const today = new Date()
    // Check from today backwards
    for (let i = 0; i < 90; i++) {
      const check = new Date(today)
      check.setDate(today.getDate() - i)
      const key = check.toISOString().split('T')[0]
      if (daysWithActivity.has(key)) {
        streak++
      } else if (i === 0) {
        // Today has no activity yet — that's ok, check from yesterday
        continue
      } else {
        break
      }
    }

    // Calculate weekly points (Monday to now)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    const { data: weekCompletions } = await supabase
      .from('completions')
      .select('points_earned')
      .eq('group_id', group.id)
      .gte('completed_at', monday.toISOString())

    const weeklyPoints = (weekCompletions ?? []).reduce((sum, c) => sum + c.points_earned, 0)

    setStats({
      streak,
      weeklyPoints,
      weeklyGoal: group.weekly_goal ?? null,
    })
  }, [group])

  useEffect(() => {
    calculate()
  }, [calculate])

  useEffect(() => {
    if (!group) return

    const channel = supabase
      .channel(`groupstats-${group.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'completions',
          filter: `group_id=eq.${group.id}`,
        },
        () => calculate()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [group, calculate])

  return stats
}

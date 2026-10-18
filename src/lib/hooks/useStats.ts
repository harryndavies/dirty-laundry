import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

interface MemberStats {
  user_id: string
  last_completion: string | null
  current_streak: number
}

/** Consecutive days with a completion, counting back from today or yesterday. */
export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0

  const uniqueDays = [...new Set(dates.map(d => new Date(d).toDateString()))]
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const firstDay = uniqueDays[0]
  firstDay.setHours(0, 0, 0, 0)

  // Streak must include today or yesterday
  if (firstDay.getTime() !== today.getTime() && firstDay.getTime() !== yesterday.getTime()) {
    return 0
  }

  let streak = 1
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = uniqueDays[i - 1]
    const curr = uniqueDays[i]
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export function useStats() {
  const { group, members } = useGroup()
  const queryClient = useQueryClient()

  // Completions from the last 60 days are enough to work out streaks.
  const { data: completions, isPending } = useQuery({
    queryKey: ['stats-completions', group?.id],
    enabled: !!group,
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - 60)
      const { data, error } = await supabase
        .from('completions')
        .select('user_id, completed_at')
        .eq('group_id', group!.id)
        .gte('completed_at', since.toISOString())
        .order('completed_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const stats = useMemo(() => {
    const statsMap = new Map<string, MemberStats>()
    for (const member of members) {
      const dates = (completions ?? []).filter(c => c.user_id === member.user_id).map(c => c.completed_at)
      statsMap.set(member.user_id, {
        user_id: member.user_id,
        last_completion: dates[0] ?? null,
        current_streak: calculateStreak(dates),
      })
    }
    return statsMap
  }, [completions, members])

  useEffect(() => {
    if (!group) return

    const channel = supabase
      .channel(`stats-${group.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'completions',
          filter: `group_id=eq.${group.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ['stats-completions', group.id] })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [group, queryClient])

  return { stats, loading: isPending && !!group }
}

export function formatLastActive(lastCompletion: string | null): string {
  if (!lastCompletion) return 'NOT YET ACTIVE'

  const seconds = Math.floor((Date.now() - new Date(lastCompletion).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

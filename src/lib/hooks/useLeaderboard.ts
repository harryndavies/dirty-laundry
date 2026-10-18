import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

export function useLeaderboard() {
  const { group, members, refreshMembers } = useGroup()

  useEffect(() => {
    if (!group) return

    const channel = supabase
      .channel(`completions-${group.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'completions',
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          refreshMembers()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [group, refreshMembers])

  const sorted = [...members].sort((a, b) => b.total_points - a.total_points)

  return { leaderboard: sorted }
}

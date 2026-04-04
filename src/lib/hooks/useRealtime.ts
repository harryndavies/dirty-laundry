import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

export function useRealtime() {
  const { group, refreshMembers } = useGroup()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!group) return

    const channel = supabase
      .channel(`realtime-${group.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chores', filter: `group_id=eq.${group.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chores', group.id] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'completions', filter: `group_id=eq.${group.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chores', group.id] })
          refreshMembers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [group, queryClient, refreshMembers])
}

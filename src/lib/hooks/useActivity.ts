import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

interface ActivityEntry {
  id: string
  points_earned: number
  completed_at: string
  profiles: { display_name: string; avatar_color: string }
  chores: { name: string } | null
}

export function useActivity() {
  const { group } = useGroup()
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivity = useCallback(async () => {
    if (!group) return
    const { data } = await supabase
      .from('completions')
      .select('id, points_earned, completed_at, profiles(display_name, avatar_color), chores(name)')
      .eq('group_id', group.id)
      .order('completed_at', { ascending: false })
      .limit(50)

    if (data) setActivity(data as unknown as ActivityEntry[])
    setLoading(false)
  }, [group])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  useEffect(() => {
    if (!group) return

    const channel = supabase
      .channel(`activity-${group.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'completions',
          filter: `group_id=eq.${group.id}`,
        },
        () => fetchActivity()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [group, fetchActivity])

  return { activity, loading }
}

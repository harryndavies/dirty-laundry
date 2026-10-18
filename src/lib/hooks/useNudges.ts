import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'
import { sendPushToUser } from '@/lib/pushNotifications'

interface NudgeWithSender {
  id: string
  from_user_id: string
  created_at: string
  seen: boolean
  profiles: { display_name: string }
}

export function useNudges() {
  const { user } = useAuth()
  const { group } = useGroup()
  const queryClient = useQueryClient()
  const queryKey = ['nudges', group?.id, user?.id]

  const { data: nudges = [] } = useQuery({
    queryKey,
    enabled: !!user && !!group,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nudges')
        .select(
          'id, from_user_id, created_at, seen, profiles!nudges_from_user_id_fkey(display_name)',
        )
        .eq('to_user_id', user!.id)
        .eq('group_id', group!.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as unknown as NudgeWithSender[]
    },
  })
  const unseenCount = nudges.filter((n) => !n.seen).length

  useEffect(() => {
    if (!user || !group) return

    const channel = supabase
      .channel(`nudges-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nudges',
          filter: `to_user_id=eq.${user.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ['nudges', group.id, user.id] }),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, group, queryClient])

  async function sendNudge(toUserId: string) {
    if (!user || !group) return
    await supabase.from('nudges').insert({
      group_id: group.id,
      from_user_id: user.id,
      to_user_id: toUserId,
    })

    // Send push notification to the nudged user
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    sendPushToUser(toUserId, {
      title: 'You got nudged! 👀',
      body: `${profile?.display_name ?? 'Someone'} is waiting on you...`,
      url: '/leaderboard',
    }).catch(() => {}) // fire and forget
  }

  async function markSeen() {
    if (!user || !group) return
    await supabase
      .from('nudges')
      .update({ seen: true })
      .eq('to_user_id', user.id)
      .eq('group_id', group.id)
      .eq('seen', false)
    queryClient.setQueryData<NudgeWithSender[]>(queryKey, (prev) =>
      prev?.map((n) => ({ ...n, seen: true })),
    )
    queryClient.invalidateQueries({ queryKey })
  }

  return { nudges, unseenCount, sendNudge, markSeen }
}

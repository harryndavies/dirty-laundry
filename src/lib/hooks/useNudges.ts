import { useEffect, useState, useCallback } from 'react'
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
  const [nudges, setNudges] = useState<NudgeWithSender[]>([])
  const [unseenCount, setUnseenCount] = useState(0)

  const fetchNudges = useCallback(async () => {
    if (!user || !group) return

    const { data } = await supabase
      .from('nudges')
      .select('id, from_user_id, created_at, seen, profiles!nudges_from_user_id_fkey(display_name)')
      .eq('to_user_id', user.id)
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      const typed = data as unknown as NudgeWithSender[]
      setNudges(typed)
      setUnseenCount(typed.filter(n => !n.seen).length)
    }
  }, [user, group])

  useEffect(() => {
    fetchNudges()
  }, [fetchNudges])

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
        () => fetchNudges()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, group, fetchNudges])

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
    setUnseenCount(0)
    fetchNudges()
  }

  return { nudges, unseenCount, sendNudge, markSeen }
}

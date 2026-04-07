import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { sendPushToUser } from '@/lib/pushNotifications'

interface Reaction {
  id: string
  emoji: string
  user_id: string
}

export interface ActivityEntry {
  id: string
  user_id: string
  points_earned: number
  completed_at: string
  chore_name: string | null
  photo_url: string | null
  with_user_id: string | null
  profiles: { display_name: string; avatar_color: string; avatar_url: string | null }
  reactions: Reaction[]
}

export function useActivity() {
  const { group, refreshMembers } = useGroup()
  const { user } = useAuth()
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivity = useCallback(async () => {
    if (!group) return
    const { data, error: fetchError } = await supabase
      .from('completions')
      .select('id, user_id, points_earned, completed_at, chore_name, photo_url, with_user_id, profiles!completions_user_id_fkey(display_name, avatar_color, avatar_url), reactions(id, emoji, user_id)')
      .eq('group_id', group.id)
      .order('completed_at', { ascending: false })
      .limit(50)

    if (fetchError) {
      console.error('Activity fetch error:', fetchError)
    }

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
        },
        () => fetchActivity()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [group, fetchActivity])

  async function toggleReaction(completionId: string, emoji: string) {
    if (!user) return

    // Find existing reaction by this user with this emoji
    const entry = activity.find(a => a.id === completionId)
    const existing = entry?.reactions.find(r => r.user_id === user.id && r.emoji === emoji)

    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('reactions').insert({
        completion_id: completionId,
        user_id: user.id,
        emoji,
      })

      // Notify the person who completed the chore
      if (entry && entry.user_id !== user.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()

        sendPushToUser(entry.user_id, {
          title: `${emoji} Reaction!`,
          body: `${profile?.display_name ?? 'Someone'} reacted ${emoji} to your "${entry.chore_name ?? 'chore'}" completion`,
          url: '/activity',
        }).catch(() => {})
      }
    }

    await fetchActivity()
  }

  async function undoCompletion(completionId: string) {
    if (!user || !group) return

    const entry = activity.find(a => a.id === completionId)
    if (!entry || entry.user_id !== user.id) return

    // Subtract points from group_members
    const { data: membership } = await supabase
      .from('group_members')
      .select('id, total_points')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membership) {
      await supabase
        .from('group_members')
        .update({ total_points: Math.max(0, membership.total_points - entry.points_earned) })
        .eq('id', membership.id)
    }

    // Delete the completion
    await supabase.from('completions').delete().eq('id', completionId)

    await fetchActivity()
    await refreshMembers()
  }

  return { activity, loading, toggleReaction, undoCompletion }
}

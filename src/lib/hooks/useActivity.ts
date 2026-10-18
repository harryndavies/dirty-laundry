import { useCallback, useEffect, useMemo } from 'react'
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/Toast'
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
  photo_before_url: string | null
  with_user_id: string | null
  profiles: { display_name: string; avatar_color: string; avatar_url: string | null }
  reactions: Reaction[]
}

const PAGE_SIZE = 20
const ACTIVITY_SELECT =
  'id, user_id, points_earned, completed_at, chore_name, photo_url, photo_before_url, with_user_id, profiles!completions_user_id_fkey(display_name, avatar_color, avatar_url), reactions(id, emoji, user_id)'

export function useActivity() {
  const { group, refreshMembers } = useGroup()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = ['activity', group?.id]

  // Pages of 20, each starting just before the last entry of the previous one.
  const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey,
    enabled: !!group,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('completions')
        .select(ACTIVITY_SELECT)
        .eq('group_id', group!.id)
        .order('completed_at', { ascending: false })
        .limit(PAGE_SIZE)
      if (pageParam) query = query.lt('completed_at', pageParam)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as ActivityEntry[]
    },
    getNextPageParam: lastPage =>
      lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1].completed_at : undefined,
  })

  const activity = useMemo(() => data?.pages.flat() ?? [], [data])
  const fetchActivity = useCallback(async () => {
    await refetch()
  }, [refetch])

  function loadMore() {
    if (!hasNextPage || isFetchingNextPage) return
    fetchNextPage()
  }

  useEffect(() => {
    if (!group) return

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['activity', group.id] })
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
        refresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
        },
        refresh
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [group, queryClient])

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

    // Takes the points back and deletes the completion in one server call.
    const { error } = await supabase.rpc('undo_completion', { p_completion_id: completionId })
    if (error) {
      toast('Could not undo that', 'bg-brutal-pink')
      return
    }

    await fetchActivity()
    await refreshMembers()
  }

  function updateEntry(completionId: string, updates: Partial<ActivityEntry>) {
    queryClient.setQueryData<InfiniteData<ActivityEntry[]>>(queryKey, prev =>
      prev && {
        ...prev,
        pages: prev.pages.map(page => page.map(a => (a.id === completionId ? { ...a, ...updates } : a))),
      }
    )
  }

  return {
    activity,
    loading: isPending && !!group,
    hasMore: hasNextPage,
    loadingMore: isFetchingNextPage,
    loadMore,
    toggleReaction,
    undoCompletion,
    refetch: fetchActivity,
    updateEntry,
  }
}

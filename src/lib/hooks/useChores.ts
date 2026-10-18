import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'
import { sendPushToUser } from '@/lib/pushNotifications'
import { toast } from '@/components/ui/Toast'

const CompleteChoreResult = z.object({ completion_id: z.uuid(), points_earned: z.number().int() })

export function useChores() {
  const { user } = useAuth()
  const { group, refreshMembers } = useGroup()
  const queryClient = useQueryClient()

  const choresQuery = useQuery({
    queryKey: ['chores', group?.id],
    queryFn: async () => {
      if (!group) return []
      const { data } = await supabase
        .from('chores')
        .select('*')
        .eq('group_id', group.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!group,
  })

  const addChore = useMutation({
    mutationFn: async ({
      name,
      points,
      isPersistent,
      reminderDay,
      reminderTime,
      area,
    }: {
      name: string
      points: number
      isPersistent: boolean
      reminderDay?: number | null
      reminderTime?: string | null
      area?: string | null
    }) => {
      if (!group || !user) throw new Error('No group or user')
      const { data, error } = await supabase
        .from('chores')
        .insert({
          group_id: group.id,
          name,
          points,
          base_points: points,
          is_persistent: isPersistent,
          created_by: user.id,
          reminder_day: reminderDay ?? null,
          reminder_time: reminderTime ?? null,
          area: area ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', group?.id] })
    },
  })

  const completeChore = useMutation({
    // `points` is accepted for older callers but ignored: the database decides what a chore is worth.
    mutationFn: async ({
      choreId,
      withUserId,
      photo,
      photoBefore,
    }: {
      choreId: string
      points?: number
      withUserId?: string
      photo?: File
      photoBefore?: File
    }) => {
      if (!group || !user) throw new Error('No group or user')

      const { data: chore } = await supabase
        .from('chores')
        .select('name')
        .eq('id', choreId)
        .single()

      // Upload photo if provided
      let photoUrl: string | null = null
      if (photo) {
        const path = `${group.id}/${user.id}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('completion-photos')
          .upload(path, photo, { contentType: photo.type })
        if (uploadError) {
          toast('Photo failed to upload', 'bg-brutal-pink')
        } else {
          const { data: urlData } = supabase.storage.from('completion-photos').getPublicUrl(path)
          photoUrl = urlData.publicUrl
        }
      }

      // Upload before photo if provided
      let photoBeforeUrl: string | null = null
      if (photoBefore) {
        const path = `${group.id}/${user.id}/${Date.now()}-before.jpg`
        const { error: uploadError } = await supabase.storage
          .from('completion-photos')
          .upload(path, photoBefore, { contentType: photoBefore.type })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('completion-photos').getPublicUrl(path)
          photoBeforeUrl = urlData.publicUrl
        }
      }

      // One server call records the completion (and your partner's, if you did it
      // together), awards the points and uses up any bounty.
      const { data: result, error } = await supabase.rpc('complete_chore', {
        p_chore_id: choreId,
        p_with_user_id: withUserId,
        p_photo_url: photoUrl ?? undefined,
        p_photo_before_url: photoBeforeUrl ?? undefined,
      })
      if (error) throw error
      const earnedPoints = CompleteChoreResult.parse(result).points_earned

      // Notify other group members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', group.id)
        .neq('user_id', user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      // Check for leaderboard overtakes
      const { data: allMembers } = await supabase
        .from('group_members')
        .select('user_id, total_points')
        .eq('group_id', group.id)

      const myPoints = allMembers?.find((m) => m.user_id === user.id)?.total_points ?? 0
      const previousPoints = myPoints - earnedPoints

      if (members) {
        for (const m of members) {
          const theirPoints = allMembers?.find((am) => am.user_id === m.user_id)?.total_points ?? 0

          // Notify if we just overtook them (they were above us, now we're above them)
          if (theirPoints > 0 && previousPoints <= theirPoints && myPoints > theirPoints) {
            sendPushToUser(m.user_id, {
              title: 'Leaderboard update! 🏆',
              body: `${profile?.display_name ?? 'Someone'} just moved ahead of you — time to catch up!`,
              url: '/leaderboard',
            }).catch(() => {})
          } else {
            sendPushToUser(m.user_id, {
              title: 'Chore completed!',
              body: `${profile?.display_name ?? 'Someone'} did "${chore?.name ?? 'a chore'}" (+${earnedPoints} pts)`,
              url: '/chores',
            }).catch(() => {})
          }
        }
      }

      return { earnedPoints }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', group?.id] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard', group?.id] })
      // Small delay to let the database trigger update points before we fetch
      setTimeout(() => refreshMembers(), 500)
    },
  })

  const deleteChore = useMutation({
    mutationFn: async (choreId: string) => {
      const { error } = await supabase.from('chores').delete().eq('id', choreId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', group?.id] })
    },
  })

  const boostChore = useMutation({
    mutationFn: async ({ choreId, extraPoints }: { choreId: string; extraPoints: number }) => {
      if (!user) throw new Error('No user')
      const { data: chore } = await supabase
        .from('chores')
        .select('points')
        .eq('id', choreId)
        .single()
      if (!chore) throw new Error('Chore not found')
      const { error } = await supabase
        .from('chores')
        .update({ points: chore.points + extraPoints, boosted_by: user.id })
        .eq('id', choreId)
      if (error) throw error

      // Notify group members about the boost
      if (!group) return
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', group.id)
        .neq('user_id', user.id)

      const { data: choreData } = await supabase
        .from('chores')
        .select('name, points')
        .eq('id', choreId)
        .single()

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (members) {
        for (const m of members) {
          sendPushToUser(m.user_id, {
            title: 'Bounty boosted! 🔥',
            body: `${profile?.display_name ?? 'Someone'} boosted "${choreData?.name ?? 'a chore'}" to ${choreData?.points ?? 0} pts`,
            url: '/chores',
          }).catch(() => {})
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', group?.id] })
    },
  })

  const editChore = useMutation({
    mutationFn: async ({
      choreId,
      updates,
    }: {
      choreId: string
      updates: {
        name?: string
        points?: number
        is_persistent?: boolean
        area?: string | null
        reminder_day?: number | null
        reminder_time?: string | null
        assigned_to?: string | null
      }
    }) => {
      const updateData: Record<string, unknown> = { ...updates }
      if (updates.points !== undefined) {
        updateData.base_points = updates.points
      }
      const { error } = await supabase.from('chores').update(updateData).eq('id', choreId)
      if (error) throw error

      // Notify assigned person
      if (updates.assigned_to && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
        const choreName = updates.name ?? 'a chore'
        sendPushToUser(updates.assigned_to, {
          title: "You've been assigned! 📋",
          body: `${profile?.display_name ?? 'Someone'} assigned "${choreName}" to you`,
          url: '/chores',
        }).catch(() => {})
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', group?.id] })
    },
  })

  return {
    chores: choresQuery.data ?? [],
    loading: choresQuery.isLoading,
    addChore,
    completeChore,
    deleteChore,
    boostChore,
    editChore,
  }
}

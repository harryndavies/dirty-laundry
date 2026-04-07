import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'
import { sendPushToUser } from '@/lib/pushNotifications'

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
    mutationFn: async ({ name, points, isPersistent, reminderDay, reminderTime, area }: { name: string; points: number; isPersistent: boolean; reminderDay?: number | null; reminderTime?: string | null; area?: string | null }) => {
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
    mutationFn: async ({ choreId, points, withUserId, photo }: { choreId: string; points: number; withUserId?: string; photo?: File }) => {
      if (!group || !user) throw new Error('No group or user')

      // Check if this chore was boosted by the completer
      const { data: chore } = await supabase
        .from('chores')
        .select('name, points, base_points, boosted_by')
        .eq('id', choreId)
        .single()

      const earnedPoints = (chore?.boosted_by === user.id && chore.points > chore.base_points)
        ? chore.base_points
        : points

      // Upload photo if provided
      let photoUrl: string | null = null
      if (photo) {
        const path = `${group.id}/${user.id}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('completion-photos')
          .upload(path, photo, { contentType: photo.type })
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('completion-photos')
            .getPublicUrl(path)
          photoUrl = urlData.publicUrl
        }
      }

      const { error } = await supabase
        .from('completions')
        .insert({
          chore_id: choreId,
          user_id: user.id,
          group_id: group.id,
          points_earned: earnedPoints,
          chore_name: chore?.name ?? null,
          photo_url: photoUrl,
          with_user_id: withUserId ?? null,
        })
      if (error) throw error

      // If done with someone, insert a completion for them too
      if (withUserId) {
        await supabase
          .from('completions')
          .insert({
            chore_id: choreId,
            user_id: withUserId,
            group_id: group.id,
            points_earned: earnedPoints,
            chore_name: chore?.name ?? null,
            with_user_id: user.id,
          })
      }

      // Reset boosted points back to base
      if (chore && chore.points !== chore.base_points) {
        await supabase
          .from('chores')
          .update({ points: chore.base_points, boosted_by: null })
          .eq('id', choreId)
      }

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

      const myPoints = allMembers?.find(m => m.user_id === user.id)?.total_points ?? 0
      const previousPoints = myPoints - earnedPoints

      if (members) {
        for (const m of members) {
          const theirPoints = allMembers?.find(am => am.user_id === m.user_id)?.total_points ?? 0

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
      refreshMembers()
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

  return { chores: choresQuery.data ?? [], loading: choresQuery.isLoading, addChore, completeChore, deleteChore, boostChore }
}

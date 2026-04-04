import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'

export function useChores() {
  const { user } = useAuth()
  const { group } = useGroup()
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
    mutationFn: async ({ name, points, isPersistent }: { name: string; points: number; isPersistent: boolean }) => {
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
    mutationFn: async ({ choreId, points }: { choreId: string; points: number }) => {
      if (!group || !user) throw new Error('No group or user')

      // Check if this chore was boosted by the completer
      const { data: chore } = await supabase
        .from('chores')
        .select('points, base_points, boosted_by')
        .eq('id', choreId)
        .single()

      const earnedPoints = (chore?.boosted_by === user.id && chore.points > chore.base_points)
        ? chore.base_points
        : points

      const { error } = await supabase
        .from('completions')
        .insert({
          chore_id: choreId,
          user_id: user.id,
          group_id: group.id,
          points_earned: earnedPoints,
        })
      if (error) throw error

      // Reset boosted points back to base
      if (chore && chore.points !== chore.base_points) {
        await supabase
          .from('chores')
          .update({ points: chore.base_points, boosted_by: null })
          .eq('id', choreId)
      }

      return { earnedPoints }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', group?.id] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard', group?.id] })
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', group?.id] })
    },
  })

  return { chores: choresQuery.data ?? [], loading: choresQuery.isLoading, addChore, completeChore, deleteChore, boostChore }
}

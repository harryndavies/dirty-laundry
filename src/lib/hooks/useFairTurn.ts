import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

interface TurnSuggestion {
  user_id: string
  display_name: string
  avatar_color: string
  reason: string
}

export function useFairTurn() {
  const { group, members } = useGroup()
  const [suggestions, setSuggestions] = useState<Map<string, TurnSuggestion>>(new Map())

  const calculate = useCallback(async () => {
    if (!group || members.length < 2) return

    // Fetch completions from last 30 days
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const { data: completions } = await supabase
      .from('completions')
      .select('chore_id, user_id, completed_at')
      .eq('group_id', group.id)
      .gte('completed_at', since.toISOString())
      .order('completed_at', { ascending: false })

    // Fetch current chores
    const { data: chores } = await supabase
      .from('chores')
      .select('id, name')
      .eq('group_id', group.id)

    if (!chores) return

    const result = new Map<string, TurnSuggestion>()

    for (const chore of chores) {
      const choreCompletions = (completions ?? []).filter(c => c.chore_id === chore.id)

      // Count completions per member for this chore
      const counts = new Map<string, number>()
      const lastDone = new Map<string, string>()

      for (const member of members) {
        counts.set(member.user_id, 0)
      }

      for (const c of choreCompletions) {
        counts.set(c.user_id, (counts.get(c.user_id) ?? 0) + 1)
        if (!lastDone.has(c.user_id)) {
          lastDone.set(c.user_id, c.completed_at)
        }
      }

      // Find the member who has done it least
      let minCount = Infinity
      let candidates: string[] = []

      for (const [userId, count] of counts) {
        if (count < minCount) {
          minCount = count
          candidates = [userId]
        } else if (count === minCount) {
          candidates.push(userId)
        }
      }

      // If tied, pick whoever did it least recently (or never)
      let chosen = candidates[0]
      let chosenLastTime: number = Infinity

      for (const userId of candidates) {
        const last = lastDone.get(userId)
        const time = last ? new Date(last).getTime() : 0
        if (time < chosenLastTime) {
          chosenLastTime = time
          chosen = userId
        }
      }

      const member = members.find(m => m.user_id === chosen)
      if (!member) continue

      const totalForChosen = counts.get(chosen) ?? 0
      const totalCompletions = choreCompletions.length

      let reason: string
      if (totalForChosen === 0) {
        reason = 'Never done this one'
      } else if (candidates.length > 1) {
        reason = 'Done it least recently'
      } else {
        reason = `Only done it ${totalForChosen}/${totalCompletions} times`
      }

      result.set(chore.id, {
        user_id: chosen,
        display_name: member.profiles.display_name,
        avatar_color: member.profiles.avatar_color,
        reason,
      })
    }

    setSuggestions(result)
  }, [group, members])

  useEffect(() => {
    calculate()
  }, [calculate])

  useEffect(() => {
    if (!group) return

    const channel = supabase
      .channel(`fairturn-${group.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'completions',
          filter: `group_id=eq.${group.id}`,
        },
        () => calculate()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [group, calculate])

  return { suggestions }
}

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

interface TurnSuggestion {
  user_id: string
  display_name: string
  avatar_color: string
  avatar_url: string | null
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

      // Find the member who is furthest behind their fair share
      // If shares are set, weight by share; otherwise use equal weighting
      const hasShares = members.some(m => m.chore_share > 0)
      let minScore = Infinity
      let candidates: string[] = []

      for (const [userId, count] of counts) {
        // Score = completions / expected share (lower = more behind)
        const member = members.find(m => m.user_id === userId)
        const share = hasShares && member ? (member.chore_share / 100) : (1 / members.length)
        const score = share > 0 ? count / share : Infinity
        if (score < minScore) {
          minScore = score
          candidates = [userId]
        } else if (score === minScore) {
          candidates.push(userId)
        }
      }

      // If tied, pick whoever did it least recently (or never)
      // If all are tied with no history, use chore ID to distribute evenly
      const allNeverDone = candidates.every(id => !lastDone.has(id))
      let chosen: string

      if (allNeverDone && candidates.length > 1) {
        // Hash the chore ID to pick a different person per chore
        let hash = 0
        for (let i = 0; i < chore.id.length; i++) {
          hash = ((hash << 5) - hash) + chore.id.charCodeAt(i)
        }
        chosen = candidates[Math.abs(hash) % candidates.length]
      } else {
        chosen = candidates[0]
        let chosenLastTime: number = Infinity

        for (const userId of candidates) {
          const last = lastDone.get(userId)
          const time = last ? new Date(last).getTime() : 0
          if (time < chosenLastTime) {
            chosenLastTime = time
            chosen = userId
          }
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
        avatar_url: member.profiles.avatar_url ?? null,
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

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

export type PetMood = 'happy' | 'content' | 'bored' | 'sad' | 'filthy'

export interface PetState {
  mood: PetMood
  hoursSinceLast: number | null // null = never
  completionsToday: number
  completionsLast48h: number
  expectedPerDay: number // members.length, ~1 chore/person/day
}

const MOOD_LABEL: Record<PetMood, string> = {
  happy: 'BUZZING',
  content: 'CHEERFUL',
  bored: 'BORED',
  sad: 'SAD',
  filthy: 'FILTHY',
}

const MOOD_HINT: Record<PetMood, string> = {
  happy: "The house is humming. Don't stop.",
  content: 'Keeping up nicely. Keep it going.',
  bored: 'Could use a little action.',
  sad: "Feeling neglected. It's been a while.",
  filthy: 'Disgusted. Do literally anything.',
}

export function petLabel(mood: PetMood): string {
  return MOOD_LABEL[mood]
}

export function petHint(mood: PetMood): string {
  return MOOD_HINT[mood]
}

export function usePetState(): { state: PetState; loading: boolean } {
  const { group, members } = useGroup()

  // Re-fetch whenever any total_points changes — that's the realtime signal
  // already firing on completion inserts.
  const totalsKey = members.map(m => `${m.user_id}:${m.total_points}`).join(',')

  const { data, isLoading } = useQuery({
    queryKey: ['pet', group?.id, totalsKey],
    enabled: !!group,
    queryFn: async (): Promise<PetState> => {
      const since = new Date()
      since.setHours(since.getHours() - 48)

      const { data: rows } = await supabase
        .from('completions')
        .select('completed_at')
        .eq('group_id', group!.id)
        .gte('completed_at', since.toISOString())
        .order('completed_at', { ascending: false })

      const list = (rows ?? []) as { completed_at: string }[]
      const now = Date.now()

      let hoursSinceLast: number | null = null
      if (list.length > 0) {
        hoursSinceLast = (now - new Date(list[0].completed_at).getTime()) / 3_600_000
      } else {
        // Look further back to know "filthy vs never"
        const { data: anyRows } = await supabase
          .from('completions')
          .select('completed_at')
          .eq('group_id', group!.id)
          .order('completed_at', { ascending: false })
          .limit(1)
        const last = (anyRows ?? []) as { completed_at: string }[]
        hoursSinceLast = last.length > 0
          ? (now - new Date(last[0].completed_at).getTime()) / 3_600_000
          : null
      }

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const completionsToday = list.filter(r => new Date(r.completed_at) >= startOfToday).length
      const completionsLast48h = list.length

      const expectedPerDay = Math.max(1, members.length)

      // Mood logic (in order: happy beats content beats bored, etc.)
      let mood: PetMood
      if (hoursSinceLast === null) {
        mood = 'filthy'
      } else if (hoursSinceLast > 72) {
        mood = 'filthy'
      } else if (hoursSinceLast > 36) {
        mood = 'sad'
      } else if (completionsLast48h >= expectedPerDay * 3 && hoursSinceLast < 12) {
        mood = 'happy'
      } else if (completionsLast48h >= expectedPerDay && hoursSinceLast < 24) {
        mood = 'content'
      } else {
        mood = 'bored'
      }

      return { mood, hoursSinceLast, completionsToday, completionsLast48h, expectedPerDay }
    },
  })

  return {
    state: data ?? {
      mood: 'bored',
      hoursSinceLast: null,
      completionsToday: 0,
      completionsLast48h: 0,
      expectedPerDay: Math.max(1, members.length),
    },
    loading: isLoading,
  }
}

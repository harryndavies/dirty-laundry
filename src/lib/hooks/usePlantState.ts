import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

export type PlantMood = 'flowering' | 'thriving' | 'dry' | 'wilting' | 'dying'

export interface PlantState {
  mood: PlantMood
  hoursSinceLast: number | null
  completionsToday: number
  completionsLast48h: number
  expectedPerDay: number
}

const MOOD_LABEL: Record<PlantMood, string> = {
  flowering: 'FLOWERING',
  thriving: 'THRIVING',
  dry: 'DRY',
  wilting: 'WILTING',
  dying: 'DYING',
}

const MOOD_HINT: Record<PlantMood, string> = {
  flowering: 'Lush and blooming. Keep going.',
  thriving: 'Healthy and upright. Nice work.',
  dry: 'Could use some water. Knock one off the list.',
  wilting: "Drooping. It's been a while.",
  dying: 'Critical. Do anything.',
}

export function plantLabel(mood: PlantMood): string {
  return MOOD_LABEL[mood]
}

export function plantHint(mood: PlantMood): string {
  return MOOD_HINT[mood]
}

export function usePlantState(): { state: PlantState; loading: boolean } {
  const { group, members } = useGroup()
  const totalsKey = members.map((m) => `${m.user_id}:${m.total_points}`).join(',')

  const { data, isLoading } = useQuery({
    queryKey: ['plant', group?.id, totalsKey],
    enabled: !!group,
    queryFn: async (): Promise<PlantState> => {
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
        const { data: anyRows } = await supabase
          .from('completions')
          .select('completed_at')
          .eq('group_id', group!.id)
          .order('completed_at', { ascending: false })
          .limit(1)
        const last = (anyRows ?? []) as { completed_at: string }[]
        hoursSinceLast =
          last.length > 0 ? (now - new Date(last[0].completed_at).getTime()) / 3_600_000 : null
      }

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const completionsToday = list.filter((r) => new Date(r.completed_at) >= startOfToday).length
      const completionsLast48h = list.length

      const expectedPerDay = Math.max(1, members.length)

      let mood: PlantMood
      if (hoursSinceLast === null) {
        mood = 'dying'
      } else if (hoursSinceLast > 72) {
        mood = 'dying'
      } else if (hoursSinceLast > 36) {
        mood = 'wilting'
      } else if (completionsLast48h >= expectedPerDay * 3 && hoursSinceLast < 12) {
        mood = 'flowering'
      } else if (completionsLast48h >= expectedPerDay && hoursSinceLast < 24) {
        mood = 'thriving'
      } else {
        mood = 'dry'
      }

      return { mood, hoursSinceLast, completionsToday, completionsLast48h, expectedPerDay }
    },
  })

  return {
    state: data ?? {
      mood: 'dry',
      hoursSinceLast: null,
      completionsToday: 0,
      completionsLast48h: 0,
      expectedPerDay: Math.max(1, members.length),
    },
    loading: isLoading,
  }
}

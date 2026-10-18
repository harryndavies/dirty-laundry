// The household report: points per person, who does which chore, and when.

export interface MemberStats {
  user_id: string
  display_name: string
  avatar_color: string
  points: number
  completions: number
  topChore: string | null
}

export interface ChoreBreakdown {
  name: string
  doers: { user_id: string; display_name: string; avatar_color: string; count: number }[]
  total: number
}

export interface Report {
  stats: MemberStats[]
  choreBreakdown: ChoreBreakdown[]
  /** Completions by weekday (Mon = 0) and hour, in local time. */
  timeMatrix: number[][]
}

type ReportCompletion = {
  user_id: string
  points_earned: number
  chore_name: string | null
  completed_at: string
}
type ReportMember = { user_id: string; profiles: { display_name: string; avatar_color: string } }

export function buildReport(completions: ReportCompletion[], members: ReportMember[]): Report {
  const memberMap = new Map<
    string,
    { points: number; completions: number; choreCounts: Map<string, number> }
  >()
  const matrix: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))

  for (const c of completions) {
    if (!memberMap.has(c.user_id)) {
      memberMap.set(c.user_id, { points: 0, completions: 0, choreCounts: new Map() })
    }
    const entry = memberMap.get(c.user_id)!
    entry.points += c.points_earned
    entry.completions += 1
    const choreName = c.chore_name ?? 'Unknown'
    entry.choreCounts.set(choreName, (entry.choreCounts.get(choreName) ?? 0) + 1)
    const d = new Date(c.completed_at)
    const row = (d.getDay() + 6) % 7 // Mon = 0, Sun = 6
    const col = d.getHours()
    matrix[row][col]++
  }

  const result: MemberStats[] = members
    .map((m) => {
      const data = memberMap.get(m.user_id)
      let topChore: string | null = null
      if (data) {
        let maxCount = 0
        for (const [name, count] of data.choreCounts) {
          if (count > maxCount) {
            maxCount = count
            topChore = name
          }
        }
      }
      return {
        user_id: m.user_id,
        display_name: m.profiles.display_name,
        avatar_color: m.profiles.avatar_color,
        points: data?.points ?? 0,
        completions: data?.completions ?? 0,
        topChore,
      }
    })
    .sort((a, b) => b.points - a.points)

  // Build chore breakdown
  const choreMap = new Map<string, Map<string, number>>()
  for (const c of completions) {
    const choreName = c.chore_name ?? 'Unknown'
    if (!choreMap.has(choreName)) choreMap.set(choreName, new Map())
    const doerMap = choreMap.get(choreName)!
    doerMap.set(c.user_id, (doerMap.get(c.user_id) ?? 0) + 1)
  }

  const breakdown: ChoreBreakdown[] = Array.from(choreMap.entries())
    .map(([name, doerMap]) => {
      const doers = Array.from(doerMap.entries())
        .map(([userId, count]) => {
          const m = members.find((m) => m.user_id === userId)
          return {
            user_id: userId,
            display_name: m?.profiles.display_name ?? '?',
            avatar_color: m?.profiles.avatar_color ?? '#ccc',
            count,
          }
        })
        .sort((a, b) => b.count - a.count)
      return { name, doers, total: doers.reduce((s, d) => s + d.count, 0) }
    })
    .sort((a, b) => b.total - a.total)

  return { stats: result, choreBreakdown: breakdown, timeMatrix: matrix }
}

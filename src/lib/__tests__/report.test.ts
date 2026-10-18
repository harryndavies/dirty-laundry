import { describe, expect, it } from 'vitest'
import { buildReport } from '@/lib/report'

const members = [
  { user_id: 'ana', profiles: { display_name: 'Ana', avatar_color: '#f00' } },
  { user_id: 'ben', profiles: { display_name: 'Ben', avatar_color: '#0f0' } },
]

describe('buildReport', () => {
  it('ranks people by points and finds their top chore', () => {
    const report = buildReport(
      [
        { user_id: 'ben', points_earned: 20, chore_name: 'Bins', completed_at: '2026-10-12T09:00:00' },
        { user_id: 'ben', points_earned: 20, chore_name: 'Bins', completed_at: '2026-10-13T09:00:00' },
        { user_id: 'ben', points_earned: 10, chore_name: 'Dishes', completed_at: '2026-10-13T19:00:00' },
        { user_id: 'ana', points_earned: 30, chore_name: 'Oven', completed_at: '2026-10-14T09:00:00' },
      ],
      members,
    )
    expect(report.stats.map(s => [s.user_id, s.points, s.completions, s.topChore])).toEqual([
      ['ben', 50, 3, 'Bins'],
      ['ana', 30, 1, 'Oven'],
    ])
  })

  it('lists who did each chore, busiest chore first', () => {
    const report = buildReport(
      [
        { user_id: 'ana', points_earned: 5, chore_name: 'Bins', completed_at: '2026-10-12T09:00:00' },
        { user_id: 'ben', points_earned: 5, chore_name: 'Bins', completed_at: '2026-10-12T10:00:00' },
        { user_id: 'ben', points_earned: 5, chore_name: 'Bins', completed_at: '2026-10-13T10:00:00' },
        { user_id: 'ana', points_earned: 5, chore_name: null, completed_at: '2026-10-13T10:00:00' },
      ],
      members,
    )
    expect(report.choreBreakdown[0]).toMatchObject({ name: 'Bins', total: 3 })
    expect(report.choreBreakdown[0].doers.map(d => [d.user_id, d.count])).toEqual([
      ['ben', 2],
      ['ana', 1],
    ])
    expect(report.choreBreakdown[1].name).toBe('Unknown')
  })

  it('maps completions onto a Monday-first weekday × hour grid', () => {
    // 12 Oct 2026 is a Monday, 18 Oct a Sunday.
    const report = buildReport(
      [
        { user_id: 'ana', points_earned: 5, chore_name: 'Bins', completed_at: '2026-10-12T09:15:00' },
        { user_id: 'ana', points_earned: 5, chore_name: 'Bins', completed_at: '2026-10-18T21:00:00' },
      ],
      members,
    )
    expect(report.timeMatrix[0][9]).toBe(1)
    expect(report.timeMatrix[6][21]).toBe(1)
    expect(report.timeMatrix.flat().reduce((a, b) => a + b, 0)).toBe(2)
  })

  it('includes members who did nothing, with zero points', () => {
    const report = buildReport([], members)
    expect(report.stats.every(s => s.points === 0 && s.topChore === null)).toBe(true)
  })
})

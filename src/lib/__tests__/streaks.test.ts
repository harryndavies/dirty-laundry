import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateStreak, formatLastActive } from '@/lib/hooks/useStats'

const NOW = new Date('2026-10-18T12:00:00')
const daysAgo = (n: number, hour = 9) => {
  const d = new Date(NOW)
  d.setDate(d.getDate() - n)
  d.setHours(hour)
  return d.toISOString()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('calculateStreak', () => {
  it('is zero with no completions', () => {
    expect(calculateStreak([])).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    expect(calculateStreak([daysAgo(0), daysAgo(1), daysAgo(2)])).toBe(3)
  })

  it('still counts if the last chore was yesterday', () => {
    expect(calculateStreak([daysAgo(1), daysAgo(2)])).toBe(2)
  })

  it('is broken by a missed day', () => {
    expect(calculateStreak([daysAgo(0), daysAgo(2), daysAgo(3)])).toBe(1)
  })

  it('is zero if nothing was done today or yesterday', () => {
    expect(calculateStreak([daysAgo(2), daysAgo(3)])).toBe(0)
  })

  it('counts several chores on one day once', () => {
    expect(calculateStreak([daysAgo(0, 8), daysAgo(0, 20), daysAgo(1)])).toBe(2)
  })
})

describe('formatLastActive', () => {
  it('describes how long ago someone last did a chore', () => {
    expect(formatLastActive(null)).toBe('NOT YET ACTIVE')
    expect(formatLastActive(new Date(NOW.getTime() - 30_000).toISOString())).toBe('just now')
    expect(formatLastActive(new Date(NOW.getTime() - 5 * 60_000).toISOString())).toBe('5m ago')
    expect(formatLastActive(new Date(NOW.getTime() - 3 * 3_600_000).toISOString())).toBe('3h ago')
    expect(formatLastActive(new Date(NOW.getTime() - 26 * 3_600_000).toISOString())).toBe(
      '1 day ago',
    )
    expect(formatLastActive(new Date(NOW.getTime() - 72 * 3_600_000).toISOString())).toBe(
      '3 days ago',
    )
  })
})

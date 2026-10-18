import { describe, expect, it } from 'vitest'
import { asMember } from '@/lib/db'

describe('asMember', () => {
  it('accepts the three household roles', () => {
    for (const role of ['owner', 'member', 'kid'] as const) {
      expect(asMember({ id: '1', role }).role).toBe(role)
    }
  })

  it('rejects anything else coming back from the database', () => {
    expect(() => asMember({ id: '1', role: 'admin' })).toThrow()
  })
})

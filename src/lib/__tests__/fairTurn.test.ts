import { describe, expect, it } from 'vitest'
import { pickFairTurns } from '@/lib/hooks/useFairTurn'

const member = (user_id: string, chore_share = 0) => ({
  user_id,
  chore_share,
  profiles: { display_name: user_id.toUpperCase(), avatar_color: '#000', avatar_url: null },
})
const done = (chore_id: string, user_id: string, completed_at: string) => ({
  chore_id,
  user_id,
  completed_at,
})
const bins = { id: 'bins', name: 'Bins' }

describe('pickFairTurns', () => {
  it('picks whoever has never done the chore', () => {
    const turns = pickFairTurns(
      [bins],
      [done('bins', 'ana', '2026-10-10T09:00:00Z')],
      [member('ana'), member('ben')],
    )
    expect(turns.get('bins')).toMatchObject({ user_id: 'ben', reason: 'Never done this one' })
  })

  it('picks whoever has done it fewest times', () => {
    const completions = [
      done('bins', 'ana', '2026-10-12T09:00:00Z'),
      done('bins', 'ben', '2026-10-11T09:00:00Z'),
      done('bins', 'ana', '2026-10-10T09:00:00Z'),
    ]
    const turns = pickFairTurns([bins], completions, [member('ana'), member('ben')])
    expect(turns.get('bins')).toMatchObject({ user_id: 'ben', reason: 'Only done it 1/3 times' })
  })

  it('breaks a tie by who did it least recently', () => {
    const completions = [
      done('bins', 'ben', '2026-10-12T09:00:00Z'),
      done('bins', 'ana', '2026-10-10T09:00:00Z'),
    ]
    const turns = pickFairTurns([bins], completions, [member('ana'), member('ben')])
    expect(turns.get('bins')).toMatchObject({ user_id: 'ana', reason: 'Done it least recently' })
  })

  it('weights by chore share when shares are set', () => {
    // Ana is meant to do 75%: 2 of 3 is still behind her share, Ben's 1 of 3 is ahead of his 25%.
    const completions = [
      done('bins', 'ana', '2026-10-12T09:00:00Z'),
      done('bins', 'ana', '2026-10-11T09:00:00Z'),
      done('bins', 'ben', '2026-10-10T09:00:00Z'),
    ]
    const turns = pickFairTurns([bins], completions, [member('ana', 75), member('ben', 25)])
    expect(turns.get('bins')?.user_id).toBe('ana')
  })

  it('gives the same answer every time for a brand new chore', () => {
    const members = [member('ana'), member('ben'), member('cat')]
    const first = pickFairTurns([bins], [], members).get('bins')?.user_id
    expect(pickFairTurns([bins], [], members).get('bins')?.user_id).toBe(first)
  })
})

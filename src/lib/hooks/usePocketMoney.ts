import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useGroup } from '@/context/GroupContext'

interface PocketMoneyBalance {
  userId: string
  unpaidPoints: number
  unpaidAmount: number // in pence
}

export interface PayoutRecord {
  id: string
  user_id: string
  paid_by: string
  amount_pence: number
  points: number
  created_at: string
  display_name: string
}

export function usePocketMoney() {
  const { group, members } = useGroup()
  const [balances, setBalances] = useState<Map<string, PocketMoneyBalance>>(new Map())
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])

  const calculate = useCallback(async () => {
    if (!group || !group.pocket_money_rate) return

    const kids = members.filter(m => m.role === 'kid')
    if (kids.length === 0) return

    const result = new Map<string, PocketMoneyBalance>()

    for (const kid of kids) {
      let query = supabase
        .from('completions')
        .select('points_earned')
        .eq('group_id', group.id)
        .eq('user_id', kid.user_id)

      if (kid.paid_up_to) {
        query = query.gte('completed_at', kid.paid_up_to)
      }

      const { data } = await query
      const unpaidPoints = (data ?? []).reduce((sum, c) => sum + c.points_earned, 0)

      result.set(kid.user_id, {
        userId: kid.user_id,
        unpaidPoints,
        unpaidAmount: unpaidPoints * group.pocket_money_rate,
      })
    }

    setBalances(result)

    // Fetch payout history
    const { data: payoutData } = await supabase
      .from('payouts')
      .select('id, user_id, paid_by, amount_pence, points, created_at')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (payoutData) {
      const enriched: PayoutRecord[] = payoutData.map(p => {
        const member = members.find(m => m.user_id === p.user_id)
        return {
          ...p,
          display_name: member?.profiles.display_name ?? '?',
        }
      })
      setPayouts(enriched)
    }
  }, [group, members])

  useEffect(() => {
    calculate()
  }, [calculate])

  useEffect(() => {
    if (!group) return

    const channel = supabase
      .channel(`pocketmoney-${group.id}`)
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${group.id}`,
        },
        () => calculate()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [group, calculate])

  function formatMoney(pence: number): string {
    if (pence >= 100) {
      return `£${(pence / 100).toFixed(2)}`
    }
    return `${pence}p`
  }

  return { balances, payouts, formatMoney }
}

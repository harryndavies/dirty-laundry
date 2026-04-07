import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import { sendPushToUser } from '@/lib/pushNotifications'
import type { Group, GroupMember, Profile } from '@/lib/database.types'

interface MemberWithProfile extends GroupMember {
  profiles: Profile
}

interface GroupContextType {
  group: Group | null
  members: MemberWithProfile[]
  userMember: GroupMember | null
  loading: boolean
  createGroup: (name: string) => Promise<void>
  joinGroup: (inviteCode: string) => Promise<{ error: string | null }>
  refreshMembers: () => Promise<void>
  leaveGroup: () => void
  updateMemberShares: (shares: { memberId: string; share: number }[]) => Promise<void>
  updateMyPrize: (prize: string) => Promise<void>
  updateWeeklyGoal: (goal: number | null) => Promise<void>
  updatePocketMoneyRate: (rate: number | null) => Promise<void>
  setMemberRole: (memberId: string, role: 'owner' | 'member' | 'kid') => Promise<void>
  markAsPaid: (memberId: string, userId: string, amountPence: number, points: number) => Promise<void>
  updateSavingsGoal: (goalPence: number | null, goalName: string | null) => Promise<void>
}

const GroupContext = createContext<GroupContextType | null>(null)

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [userMember, setUserMember] = useState<GroupMember | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchGroup = useCallback(async () => {
    if (!user) {
      setGroup(null)
      setMembers([])
      setUserMember(null)
      setLoading(false)
      return
    }

    setLoading(true)

    // Check localStorage for cached group
    const cachedGroupId = localStorage.getItem('dirtylaundry_group_id')

    // Find user's group membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (!membership) {
      // Check for pending invite code and auto-join
      const pendingCode = localStorage.getItem('dirtylaundry_invite_code')
      if (pendingCode) {
        localStorage.removeItem('dirtylaundry_invite_code')
        const { data: foundGroup } = await supabase
          .from('groups')
          .select('*')
          .eq('invite_code', pendingCode.toUpperCase().trim())
          .maybeSingle()

        if (foundGroup) {
          await supabase
            .from('group_members')
            .insert({ group_id: foundGroup.id, user_id: user.id, role: 'member' })

          localStorage.setItem('dirtylaundry_group_id', foundGroup.id)
          setGroup(foundGroup)
          await refreshMembersForGroup(foundGroup.id)
          setLoading(false)
          return
        }
      }

      localStorage.removeItem('dirtylaundry_group_id')
      setGroup(null)
      setMembers([])
      setUserMember(null)
      setLoading(false)
      return
    }

    setUserMember(membership)

    const groupId = membership.group_id
    if (cachedGroupId !== groupId) {
      localStorage.setItem('dirtylaundry_group_id', groupId)
    }

    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle()

    setGroup(groupData)

    await refreshMembersForGroup(groupId)
    setLoading(false)
  }, [user])

  async function refreshMembersForGroup(groupId: string) {
    const { data: membersData } = await supabase
      .from('group_members')
      .select('*, profiles(*)')
      .eq('group_id', groupId)
      .order('total_points', { ascending: false })

    setMembers((membersData as MemberWithProfile[]) ?? [])
  }

  const refreshMembers = useCallback(async () => {
    if (group) {
      await refreshMembersForGroup(group.id)
    }
  }, [group])

  useEffect(() => {
    fetchGroup()
  }, [fetchGroup])

  // Realtime: refresh when group settings or member roles change
  useEffect(() => {
    if (!group) return

    const channel = supabase
      .channel(`group-sync-${group.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${group.id}` },
        () => refreshMembersForGroup(group.id)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'groups', filter: `id=eq.${group.id}` },
        () => fetchGroup()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [group?.id])

  async function createGroup(name: string) {
    if (!user) return

    const { data: newGroup } = await supabase
      .from('groups')
      .insert({ name, created_by: user.id })
      .select()
      .single()

    if (!newGroup) return

    await supabase
      .from('group_members')
      .insert({ group_id: newGroup.id, user_id: user.id, role: 'owner' })

    localStorage.setItem('dirtylaundry_group_id', newGroup.id)
    await fetchGroup()
  }

  async function joinGroup(inviteCode: string) {
    if (!user) return { error: 'Not logged in' }

    const { data: foundGroup, error: lookupError } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase().trim())
      .maybeSingle()

    if (lookupError) return { error: 'Something went wrong' }
    if (!foundGroup) return { error: 'Invalid invite code' }

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: foundGroup.id, user_id: user.id, role: 'member' })

    if (error) {
      if (error.code === '23505') return { error: 'You are already in this group' }
      return { error: error.message }
    }

    localStorage.setItem('dirtylaundry_group_id', foundGroup.id)

    // Notify existing members
    const { data: existingMembers } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', foundGroup.id)
      .neq('user_id', user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    if (existingMembers) {
      for (const m of existingMembers) {
        sendPushToUser(m.user_id, {
          title: 'New member! 🎉',
          body: `${profile?.display_name ?? 'Someone'} just joined ${foundGroup.name}`,
          url: '/leaderboard',
        }).catch(() => {})
      }
    }

    await fetchGroup()
    return { error: null }
  }

  async function updateMemberShares(shares: { memberId: string; share: number }[]) {
    for (const { memberId, share } of shares) {
      await supabase
        .from('group_members')
        .update({ chore_share: share })
        .eq('id', memberId)
    }
    if (group) await refreshMembersForGroup(group.id)

    // Notify other members that the split changed
    if (user && group) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      const otherMembers = members.filter(m => m.user_id !== user.id)
      for (const m of otherMembers) {
        const memberShare = shares.find(s => s.memberId === m.id)
        sendPushToUser(m.user_id, {
          title: 'Chore split updated! ⚖️',
          body: `${profile?.display_name ?? 'The owner'} changed the split — your share is now ${memberShare?.share ?? 0}%`,
          url: '/group',
        }).catch(() => {})
      }
    }
  }

  async function updateMyPrize(prize: string) {
    if (!user || !group) return
    const member = members.find(m => m.user_id === user.id)
    if (!member) return
    await supabase
      .from('group_members')
      .update({ monthly_prize: prize || null })
      .eq('id', member.id)
    await refreshMembersForGroup(group.id)

    if (prize.trim()) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      const others = members.filter(m => m.user_id !== user.id)
      for (const m of others) {
        sendPushToUser(m.user_id, {
          title: 'New prize on the line! 🏆',
          body: `${profile?.display_name ?? 'Someone'} is playing for: "${prize.trim()}"`,
          url: '/group',
        }).catch(() => {})
      }
    }
  }

  async function leaveGroup() {
    if (!user || !group) {
      localStorage.removeItem('dirtylaundry_group_id')
      setGroup(null)
      setMembers([])
      setUserMember(null)
      return
    }

    // Delete membership from database
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', user.id)

    localStorage.removeItem('dirtylaundry_group_id')
    setGroup(null)
    setMembers([])
    setUserMember(null)
  }

  async function updateWeeklyGoal(goal: number | null) {
    if (!group) return
    await supabase
      .from('groups')
      .update({ weekly_goal: goal })
      .eq('id', group.id)
    setGroup(prev => prev ? { ...prev, weekly_goal: goal } : prev)
  }

  async function updatePocketMoneyRate(rate: number | null) {
    if (!group) return
    await supabase
      .from('groups')
      .update({ pocket_money_rate: rate })
      .eq('id', group.id)
    setGroup(prev => prev ? { ...prev, pocket_money_rate: rate } : prev)
  }

  async function setMemberRole(memberId: string, role: 'owner' | 'member' | 'kid') {
    await supabase
      .from('group_members')
      .update({ role })
      .eq('id', memberId)
    if (group) await refreshMembersForGroup(group.id)
  }

  async function markAsPaid(memberId: string, userId: string, amountPence: number, points: number) {
    if (!user || !group) return

    await supabase
      .from('group_members')
      .update({ paid_up_to: new Date().toISOString() })
      .eq('id', memberId)

    await supabase
      .from('payouts')
      .insert({
        group_id: group.id,
        user_id: userId,
        paid_by: user.id,
        amount_pence: amountPence,
        points,
      })

    if (group) await refreshMembersForGroup(group.id)
  }

  async function updateSavingsGoal(goalPence: number | null, goalName: string | null) {
    if (!user || !group) return
    const member = members.find(m => m.user_id === user.id)
    if (!member) return
    await supabase
      .from('group_members')
      .update({ savings_goal: goalPence, savings_goal_name: goalName })
      .eq('id', member.id)
    await refreshMembersForGroup(group.id)
  }

  return (
    <GroupContext.Provider value={{ group, members, userMember, loading, createGroup, joinGroup, refreshMembers, leaveGroup, updateMemberShares, updateMyPrize, updateWeeklyGoal, updatePocketMoneyRate, setMemberRole, markAsPaid, updateSavingsGoal }}>
      {children}
    </GroupContext.Provider>
  )
}

export function useGroup() {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error('useGroup must be used within GroupProvider')
  return ctx
}

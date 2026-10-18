import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import { sendPushToUser } from '@/lib/pushNotifications'
import { toast } from '@/components/ui/Toast'
import { asMember, type Group, type GroupMember, type Profile } from '@/lib/db'

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
  markAsPaid: (
    memberId: string,
    userId: string,
    amountPence: number,
    points: number,
  ) => Promise<void>
  updateSavingsGoal: (goalPence: number | null, goalName: string | null) => Promise<void>
}

const GroupContext = createContext<GroupContextType | null>(null)

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  // Keyed on the id: the user object is replaced on every token refresh.
  const userId = user?.id ?? null
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [userMember, setUserMember] = useState<GroupMember | null>(null)
  // Whose household is loaded: undefined until the first load, null when signed out.
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined)

  const refreshMembersForGroup = useCallback(
    async (groupId: string) => {
      const { data: membersData } = await supabase
        .from('group_members')
        .select('*, profiles(*)')
        .eq('group_id', groupId)
        .order('total_points', { ascending: false })

      const updated: MemberWithProfile[] = (membersData ?? []).map(asMember)
      setMembers(updated)
      if (userId) {
        const me = updated.find((m) => m.user_id === userId)
        if (me) setUserMember(me)
      }
    },
    [userId],
  )

  const fetchGroup = useCallback(async () => {
    if (!userId) {
      setGroup(null)
      setMembers([])
      setUserMember(null)
      setLoadedFor(null)
      return
    }

    // Check localStorage for cached group
    const cachedGroupId = localStorage.getItem('dirtylaundry_group_id')

    // Find user's group membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (!membership) {
      // Check for pending invite code and auto-join
      const pendingCode = localStorage.getItem('dirtylaundry_invite_code')
      if (pendingCode) {
        localStorage.removeItem('dirtylaundry_invite_code')
        // Households can't be looked up by code directly; the database does it.
        const { data: joined } = await supabase.rpc('join_group_by_code', { p_code: pendingCode })
        const foundGroup = joined as Group | null

        if (foundGroup) {
          localStorage.setItem('dirtylaundry_group_id', foundGroup.id)
          setGroup(foundGroup)
          await refreshMembersForGroup(foundGroup.id)
          setLoadedFor(userId)
          return
        }
      }

      localStorage.removeItem('dirtylaundry_group_id')
      setGroup(null)
      setMembers([])
      setUserMember(null)
      setLoadedFor(userId)
      return
    }

    setUserMember(asMember(membership))

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
    setLoadedFor(userId)
  }, [userId, refreshMembersForGroup])

  const refreshMembers = useCallback(async () => {
    if (group) {
      await refreshMembersForGroup(group.id)
    }
  }, [group, refreshMembersForGroup])

  useEffect(() => {
    fetchGroup()
  }, [fetchGroup])

  // Realtime: refresh when group settings or member roles change
  const groupId = group?.id
  useEffect(() => {
    if (!groupId) return

    const channel = supabase
      .channel(`group-sync-${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        () => refreshMembersForGroup(groupId),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
        () => fetchGroup(),
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () =>
        refreshMembersForGroup(groupId),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, fetchGroup, refreshMembersForGroup])

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

    // Looks the code up and joins in one step, on the server.
    const { data: joined, error } = await supabase.rpc('join_group_by_code', { p_code: inviteCode })
    if (error) {
      if (error.message === 'invalid_code') return { error: 'Invalid invite code' }
      if (error.message === 'already_member') return { error: 'You are already in this group' }
      return { error: 'Something went wrong' }
    }
    const foundGroup = joined as Group

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
      await supabase.from('group_members').update({ chore_share: share }).eq('id', memberId)
    }
    if (group) await refreshMembersForGroup(group.id)

    // Notify other members that the split changed
    if (user && group) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      const otherMembers = members.filter((m) => m.user_id !== user.id)
      for (const m of otherMembers) {
        const memberShare = shares.find((s) => s.memberId === m.id)
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
    const member = members.find((m) => m.user_id === user.id)
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

      const others = members.filter((m) => m.user_id !== user.id)
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
    await supabase.from('group_members').delete().eq('group_id', group.id).eq('user_id', user.id)

    localStorage.removeItem('dirtylaundry_group_id')
    setGroup(null)
    setMembers([])
    setUserMember(null)
  }

  async function updateWeeklyGoal(goal: number | null) {
    if (!group) return
    try {
      const { error } = await supabase
        .from('groups')
        .update({ weekly_goal: goal })
        .eq('id', group.id)
      if (error) throw error
      setGroup((prev) => (prev ? { ...prev, weekly_goal: goal } : prev))
    } catch {
      toast('Failed to update goal', 'bg-brutal-pink')
    }
  }

  async function updatePocketMoneyRate(rate: number | null) {
    if (!group) return
    if (rate !== null && !group.is_pro) {
      toast('Upgrade to Pro to enable pocket money', 'bg-brutal-yellow')
      return
    }
    try {
      const { error } = await supabase
        .from('groups')
        .update({ pocket_money_rate: rate })
        .eq('id', group.id)
      if (error) throw error
      setGroup((prev) => (prev ? { ...prev, pocket_money_rate: rate } : prev))
    } catch {
      toast('Failed to update rate', 'bg-brutal-pink')
    }
  }

  async function setMemberRole(memberId: string, role: 'owner' | 'member' | 'kid') {
    try {
      const { error } = await supabase.from('group_members').update({ role }).eq('id', memberId)
      if (error) throw error
      if (group) await refreshMembersForGroup(group.id)
    } catch {
      toast('Failed to update role', 'bg-brutal-pink')
    }
  }

  async function markAsPaid(
    memberId: string,
    _userId: string,
    amountPence: number,
    points: number,
  ) {
    if (!user || !group) return
    try {
      // Records the payout and moves "paid up to" in one server call.
      const { error } = await supabase.rpc('mark_paid', {
        p_member_id: memberId,
        p_amount_pence: amountPence,
        p_points: points,
      })
      if (error) throw error
      if (group) await refreshMembersForGroup(group.id)
    } catch {
      toast('Failed to mark as paid', 'bg-brutal-pink')
    }
  }

  async function updateSavingsGoal(goalPence: number | null, goalName: string | null) {
    if (!user || !group) return
    const member = members.find((m) => m.user_id === user.id)
    if (!member) return
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ savings_goal: goalPence, savings_goal_name: goalName })
        .eq('id', member.id)
      if (error) throw error
      await refreshMembersForGroup(group.id)
    } catch {
      toast('Failed to update savings goal', 'bg-brutal-pink')
    }
  }

  return (
    <GroupContext.Provider
      value={{
        group,
        members,
        userMember,
        loading: authLoading || loadedFor !== userId,
        createGroup,
        joinGroup,
        refreshMembers,
        leaveGroup,
        updateMemberShares,
        updateMyPrize,
        updateWeeklyGoal,
        updatePocketMoneyRate,
        setMemberRole,
        markAsPaid,
        updateSavingsGoal,
      }}
    >
      {children}
    </GroupContext.Provider>
  )
}

export function useGroup() {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error('useGroup must be used within GroupProvider')
  return ctx
}

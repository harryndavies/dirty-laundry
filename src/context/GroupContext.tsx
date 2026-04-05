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
  }

  function leaveGroup() {
    localStorage.removeItem('dirtylaundry_group_id')
    setGroup(null)
    setMembers([])
    setUserMember(null)
  }

  return (
    <GroupContext.Provider value={{ group, members, userMember, loading, createGroup, joinGroup, refreshMembers, leaveGroup, updateMemberShares }}>
      {children}
    </GroupContext.Provider>
  )
}

export function useGroup() {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error('useGroup must be used within GroupProvider')
  return ctx
}

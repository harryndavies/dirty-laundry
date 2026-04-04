import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
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
      .single()

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
      .single()

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

    const { data: foundGroup } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase().trim())
      .single()

    if (!foundGroup) return { error: 'Invalid invite code' }

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: foundGroup.id, user_id: user.id, role: 'member' })

    if (error) {
      if (error.code === '23505') return { error: 'You are already in this group' }
      return { error: error.message }
    }

    localStorage.setItem('dirtylaundry_group_id', foundGroup.id)
    await fetchGroup()
    return { error: null }
  }

  function leaveGroup() {
    localStorage.removeItem('dirtylaundry_group_id')
    setGroup(null)
    setMembers([])
    setUserMember(null)
  }

  return (
    <GroupContext.Provider value={{ group, members, userMember, loading, createGroup, joinGroup, refreshMembers, leaveGroup }}>
      {children}
    </GroupContext.Provider>
  )
}

export function useGroup() {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error('useGroup must be used within GroupProvider')
  return ctx
}

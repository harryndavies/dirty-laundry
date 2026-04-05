import { useState } from 'react'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/Toast'
import { Copy, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function GroupPage() {
  const { group, members, createGroup, joinGroup, loading: groupLoading } = useGroup()
  const { user } = useAuth()
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (groupLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="font-mono font-bold text-brutal-black/40 animate-pulse">LOADING...</p>
      </div>
    )
  }

  // No group — show create/join
  if (!group) {
    return (
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">👥</div>
            <h1 className="font-mono font-bold text-2xl">JOIN OR CREATE</h1>
            <p className="font-mono text-xs text-brutal-black/60 mt-1">A GROUP TO GET STARTED</p>
          </div>

          {error && (
            <div className="bg-brutal-pink/20 border-2 border-brutal-pink p-3 font-mono text-xs font-bold">
              {error}
            </div>
          )}

          {/* Create group */}
          <div className="bg-brutal-lime border-4 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5">
            <h2 className="font-mono font-bold text-sm mb-3">CREATE A GROUP</h2>
            <form
              onSubmit={async e => {
                e.preventDefault()
                if (!groupName.trim()) return
                setLoading(true)
                setError('')
                await createGroup(groupName.trim())
                setLoading(false)
              }}
              className="space-y-3"
            >
              <Input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. Our Flat"
                className="border-2 border-brutal-black font-mono h-12 bg-brutal-white"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
              >
                CREATE GROUP
              </Button>
            </form>
          </div>

          {/* Join group */}
          <div className="bg-brutal-blue text-brutal-white border-4 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5">
            <h2 className="font-mono font-bold text-sm mb-3">JOIN WITH CODE</h2>
            <form
              onSubmit={async e => {
                e.preventDefault()
                if (!inviteCode.trim()) return
                setLoading(true)
                setError('')
                const { error } = await joinGroup(inviteCode.trim())
                if (error) setError(error)
                setLoading(false)
              }}
              className="space-y-3"
            >
              <Input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                maxLength={8}
                className="border-2 border-brutal-black font-mono h-12 bg-brutal-white text-brutal-black text-center text-lg tracking-[0.3em]"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-brutal-white text-brutal-black font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
              >
                JOIN GROUP
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Has group — show details
  function copyCode() {
    navigator.clipboard.writeText(group!.invite_code)
    toast('Code copied!', 'bg-brutal-lime')
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim() || !user || !group) return
    setLoading(true)
    await supabase.from('invitations').insert({
      group_id: group.id,
      invited_email: inviteEmail.trim(),
      invited_by: user.id,
    })
    setInviteEmail('')
    setShowInvite(false)
    setLoading(false)
    toast('Invite sent!', 'bg-brutal-lime')
  }

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-brutal-white border-b-4 border-brutal-black px-4 py-3">
        <h1 className="font-mono font-bold text-lg tracking-tight">{group.name}</h1>
      </div>

      {/* Invite code card */}
      <div className="p-4">
        <div className="bg-brutal-yellow border-4 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 text-center">
          <p className="font-mono text-xs font-bold text-brutal-black/60 mb-2">INVITE CODE</p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono font-bold text-3xl tracking-[0.3em]">{group.invite_code}</span>
            <button
              onClick={copyCode}
              className="w-10 h-10 bg-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
            >
              <Copy size={16} />
            </button>
          </div>
          <p className="font-mono text-[10px] text-brutal-black/40 mt-2">Share this code to invite people</p>
        </div>
      </div>

      {/* Members */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono font-bold text-sm">MEMBERS ({members.length})</h2>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-2 bg-brutal-pink text-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
          >
            <Mail size={14} /> INVITE
          </button>
        </div>

        <div className="space-y-2">
          {members.map(m => (
            <div
              key={m.id}
              className="border-2 border-brutal-black p-3 flex items-center gap-3 bg-brutal-white"
            >
              <Avatar name={m.profiles.display_name} color={m.profiles.avatar_color} />
              <div className="flex-1 min-w-0">
                <p className="font-mono font-bold text-sm truncate">{m.profiles.display_name}</p>
                <p className="font-mono text-[10px] text-brutal-black/40 uppercase">{m.role}</p>
              </div>
              <div className="font-mono font-bold text-sm">
                {m.total_points} <span className="text-[10px] text-brutal-black/40">PTS</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite sheet */}
      <BottomSheet open={showInvite} onClose={() => setShowInvite(false)}>
        <h2 className="font-mono font-bold text-lg mb-4">INVITE BY EMAIL</h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="font-mono text-xs font-bold uppercase block mb-1">EMAIL</label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="friend@email.com"
              className="border-2 border-brutal-black font-mono h-12"
              autoFocus
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-brutal-pink text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
          >
            SEND INVITE
          </Button>
        </form>
        <p className="font-mono text-[10px] text-brutal-black/40 mt-3 text-center">
          Or just share the invite code: {group.invite_code}
        </p>
      </BottomSheet>
    </div>
  )
}

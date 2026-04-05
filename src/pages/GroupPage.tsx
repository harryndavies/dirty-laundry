import { useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Copy, Mail, Percent, Trophy, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function GroupPage() {
  const { group, members, createGroup, joinGroup, updateMemberShares, updateMyPrize, leaveGroup, loading: groupLoading } = useGroup()
  const { user } = useAuth()
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSplit, setShowSplit] = useState(false)
  const [shares, setShares] = useState<Record<string, number>>({})
  const [savingSplit, setSavingSplit] = useState(false)
  const [showPrize, setShowPrize] = useState(false)
  const [prizeText, setPrizeText] = useState('')
  const [savingPrize, setSavingPrize] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  const isOwner = members.find(m => m.user_id === user?.id)?.role === 'owner'
  const shareTotal = Object.values(shares).reduce((sum, v) => sum + v, 0)

  if (groupLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner />
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

      {/* Members */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono font-bold text-sm">MEMBERS ({members.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-2 bg-brutal-yellow border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
            >
              <Copy size={14} /> {group.invite_code}
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-2 bg-brutal-pink text-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
            >
              <Mail size={14} /> INVITE
            </button>
          </div>
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

      {/* Chore split */}
      {members.length >= 2 && (
        <div className="px-4 mt-6">
          <button
            onClick={() => {
              const initial: Record<string, number> = {}
              const hasCustom = members.some(m => m.chore_share > 0)
              for (const m of members) {
                initial[m.id] = hasCustom ? m.chore_share : Math.round(100 / members.length)
              }
              setShares(initial)
              setShowSplit(true)
            }}
            className="w-full flex items-center justify-between p-4 border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-brutal-white active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
          >
            <div className="flex items-center gap-2">
              <Percent size={16} strokeWidth={3} />
              <span className="font-mono font-bold text-sm">CHORE SPLIT</span>
            </div>
            <span className="font-mono text-xs text-brutal-black/40">
              {members.some(m => m.chore_share > 0) ? 'CUSTOM' : 'EQUAL'}
            </span>
          </button>
        </div>
      )}

      {/* Split editor sheet */}
      <BottomSheet open={showSplit} onClose={() => setShowSplit(false)}>
        <h2 className="font-mono font-bold text-lg mb-1">CHORE SPLIT</h2>
        <p className="font-mono text-xs text-brutal-black/50 mb-4">
          {isOwner ? 'Set each person\'s fair share. Must total 100%.' : 'Only the group owner can change the split.'}
        </p>
        <div className="space-y-3">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar name={m.profiles.display_name} color={m.profiles.avatar_color} size="sm" />
              <span className="font-mono font-bold text-sm flex-1 truncate">{m.profiles.display_name}</span>
              {isOwner ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShares(s => ({ ...s, [m.id]: Math.max(0, (s[m.id] ?? 0) - 5) }))}
                    className="w-8 h-8 border-2 border-brutal-black bg-brutal-white flex items-center justify-center font-mono font-bold active:bg-brutal-black/10"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-lg w-12 text-center">{shares[m.id] ?? 0}%</span>
                  <button
                    type="button"
                    onClick={() => setShares(s => ({ ...s, [m.id]: Math.min(100, (s[m.id] ?? 0) + 5) }))}
                    className="w-8 h-8 border-2 border-brutal-black bg-brutal-white flex items-center justify-center font-mono font-bold active:bg-brutal-black/10"
                  >
                    +
                  </button>
                </div>
              ) : (
                <span className="font-mono font-bold text-lg">{shares[m.id] ?? 0}%</span>
              )}
            </div>
          ))}
        </div>
        {isOwner && (
          <>
            <div className={`mt-4 p-3 border-2 text-center font-mono font-bold text-sm ${
              shareTotal === 100
                ? 'border-brutal-lime bg-brutal-lime/20'
                : 'border-brutal-pink bg-brutal-pink/20'
            }`}>
              TOTAL: {shareTotal}% {shareTotal !== 100 && `(need 100%)`}
            </div>
            <Button
              onClick={async () => {
                setSavingSplit(true)
                await updateMemberShares(
                  members.map(m => ({ memberId: m.id, share: shares[m.id] ?? 0 }))
                )
                setSavingSplit(false)
                setShowSplit(false)
                toast('Chore split updated!', 'bg-brutal-lime')
              }}
              disabled={shareTotal !== 100 || savingSplit}
              className="w-full h-12 mt-3 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all disabled:opacity-40"
            >
              {savingSplit ? 'SAVING...' : 'SAVE SPLIT'}
            </Button>
            <button
              onClick={() => {
                const equal = Math.round(100 / members.length)
                const initial: Record<string, number> = {}
                members.forEach((m, i) => {
                  initial[m.id] = i === 0 ? 100 - equal * (members.length - 1) : equal
                })
                setShares(initial)
              }}
              className="w-full mt-2 font-mono text-xs text-brutal-black/40 font-bold py-2 active:text-brutal-black/60"
            >
              RESET TO EQUAL
            </button>
          </>
        )}
      </BottomSheet>

      {/* Monthly prizes */}
      {members.length >= 2 && (
        <div className="px-4 mt-4">
          <div className="border-2 border-brutal-black bg-brutal-white">
            <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-brutal-black bg-brutal-yellow/20">
              <Trophy size={14} strokeWidth={3} />
              <span className="font-mono font-bold text-xs">MONTHLY PRIZES</span>
              <span className="font-mono text-[10px] text-brutal-black/40 ml-auto">Winner takes their prize</span>
            </div>
            <div className="divide-y divide-brutal-black/10">
              {members.map(m => {
                const isMe = m.user_id === user?.id
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={m.profiles.display_name} color={m.profiles.avatar_color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono font-bold text-xs block truncate">{m.profiles.display_name}</span>
                      <span className="font-mono text-[10px] text-brutal-black/40 block truncate">
                        {m.monthly_prize || 'No prize set'}
                      </span>
                    </div>
                    {isMe && (
                      <button
                        onClick={() => {
                          setPrizeText(m.monthly_prize ?? '')
                          setShowPrize(true)
                        }}
                        className="font-mono text-[10px] font-bold px-2 py-1 border border-brutal-black bg-brutal-yellow active:bg-brutal-yellow/60 transition-colors"
                      >
                        {m.monthly_prize ? 'EDIT' : 'SET'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Prize editor sheet */}
      <BottomSheet open={showPrize} onClose={() => setShowPrize(false)}>
        <h2 className="font-mono font-bold text-lg mb-1">YOUR PRIZE</h2>
        <p className="font-mono text-xs text-brutal-black/50 mb-4">
          What do you want if you win this month?
        </p>
        <Input
          value={prizeText}
          onChange={e => setPrizeText(e.target.value)}
          placeholder="e.g. I pick the takeaway"
          className="border-2 border-brutal-black font-mono h-12"
          autoFocus
          maxLength={100}
        />
        <Button
          onClick={async () => {
            setSavingPrize(true)
            await updateMyPrize(prizeText.trim())
            setSavingPrize(false)
            setShowPrize(false)
            toast('Prize updated!', 'bg-brutal-yellow')
          }}
          disabled={savingPrize}
          className="w-full h-12 mt-3 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all disabled:opacity-40"
        >
          {savingPrize ? 'SAVING...' : 'SAVE PRIZE'}
        </Button>
      </BottomSheet>

      {/* Leave group */}
      <div className="px-4 mt-6 mb-6">
        <button
          onClick={() => setConfirmLeave(true)}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-brutal-pink/30 font-mono text-xs font-bold text-brutal-pink active:bg-brutal-pink/10 transition-colors"
        >
          <LogOut size={14} /> LEAVE GROUP
        </button>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title="LEAVE GROUP"
        message={`Leave ${group.name}? Your points and history will stay but you won't be a member anymore.`}
        confirmLabel="LEAVE"
        confirmColor="bg-brutal-pink"
        onConfirm={async () => {
          await leaveGroup()
          setConfirmLeave(false)
        }}
        onCancel={() => setConfirmLeave(false)}
      />

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

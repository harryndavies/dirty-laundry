import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Share2, Percent, Trophy, LogOut, Target, Minus, Plus, Settings } from 'lucide-react'

export function GroupPage() {
  const {
    group,
    members,
    createGroup,
    joinGroup,
    updateMemberShares,
    updateMyPrize,
    updateWeeklyGoal,
    setMemberRole,
    leaveGroup,
    loading: groupLoading,
  } = useGroup()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState(() => {
    const saved = localStorage.getItem('dirtylaundry_invite_code')
    if (saved) localStorage.removeItem('dirtylaundry_invite_code')
    return saved ?? ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSplit, setShowSplit] = useState(false)
  const [shares, setShares] = useState<Record<string, number>>({})
  const [savingSplit, setSavingSplit] = useState(false)
  const [showPrize, setShowPrize] = useState(false)
  const [prizeText, setPrizeText] = useState('')
  const [savingPrize, setSavingPrize] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showGoal, setShowGoal] = useState(false)
  const [goalAmount, setGoalAmount] = useState(0)
  const [savingGoal, setSavingGoal] = useState(false)

  const isOwner = members.find((m) => m.user_id === user?.id)?.role === 'owner'
  const shareTotal = Object.values(shares).reduce((sum, v) => sum + v, 0)

  if (groupLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // No group — show create/join
  if (!group) {
    return (
      <div
        className="flex min-h-full items-center justify-center px-4"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="w-full max-w-sm space-y-6 md:max-w-lg">
          <div className="mb-8 text-center">
            <div className="mb-3 text-5xl">👥</div>
            <h1 className="font-mono text-2xl font-bold">JOIN OR CREATE</h1>
            <p className="mt-1 font-mono text-xs text-brutal-black/60">A GROUP TO GET STARTED</p>
          </div>

          {error && (
            <div className="border-2 border-brutal-pink bg-brutal-pink/20 p-3 font-mono text-xs font-bold">
              {error}
            </div>
          )}

          {/* Create group */}
          <div className="border-4 border-brutal-black bg-brutal-lime p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="mb-3 font-mono text-sm font-bold">CREATE A GROUP</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!groupName.trim()) return
                setLoading(true)
                setError('')
                await createGroup(groupName.trim())
                setLoading(false)
                navigate('/chores')
              }}
              className="space-y-3"
            >
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Our Flat"
                className="h-12 border-2 border-brutal-black bg-brutal-white font-mono"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full border-2 border-brutal-black bg-brutal-black font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
              >
                CREATE GROUP
              </Button>
            </form>
          </div>

          {/* Join group */}
          <div className="border-4 border-brutal-black bg-brutal-blue p-5 text-brutal-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="mb-3 font-mono text-sm font-bold">JOIN WITH CODE</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!inviteCode.trim()) return
                setLoading(true)
                setError('')
                const { error } = await joinGroup(inviteCode.trim())
                if (error) {
                  setError(error)
                } else {
                  navigate('/chores')
                }
                setLoading(false)
              }}
              className="space-y-3"
            >
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                maxLength={8}
                className="h-12 border-2 border-brutal-black bg-brutal-white text-center font-mono text-lg tracking-[0.3em] text-brutal-black"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full border-2 border-brutal-black bg-brutal-white font-mono text-sm font-bold text-brutal-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
              >
                JOIN GROUP
              </Button>
            </form>
          </div>

          <button
            onClick={signOut}
            className="w-full py-2 font-mono text-xs font-bold text-brutal-black/40 active:text-brutal-black/60"
          >
            SIGN OUT
          </button>
        </div>
      </div>
    )
  }

  // Has group — show details
  const joinLink = `${window.location.origin}/auth?code=${group.invite_code}`

  async function shareGroup() {
    const shareData = {
      title: `Join ${group!.name} on Dirty Laundry`,
      text: `Join my household on Dirty Laundry! Use code ${group!.invite_code} or tap the link:`,
      url: joinLink,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(joinLink)
      toast('Link copied!', 'bg-brutal-lime')
    }
  }

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 border-b-4 border-brutal-black bg-brutal-white px-4 py-3">
        <h1 className="font-mono text-lg font-bold tracking-tight">{group.name}</h1>
      </div>

      {/* Members */}
      <div className="px-4 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold">MEMBERS ({members.length})</h2>
          <button
            onClick={shareGroup}
            className="flex items-center gap-1.5 border-2 border-brutal-black bg-brutal-pink px-3 py-2 font-mono text-xs font-bold text-brutal-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            <Share2 size={14} /> INVITE
          </button>
        </div>

        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 border-2 border-brutal-black bg-brutal-white p-3"
            >
              <Avatar
                name={m.profiles.display_name}
                color={m.profiles.avatar_color}
                imageUrl={m.profiles.avatar_url}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-bold">{m.profiles.display_name}</p>
                <div className="flex items-center gap-2">
                  {isOwner && m.role !== 'owner' ? (
                    <button
                      onClick={() => setMemberRole(m.id, m.role === 'kid' ? 'member' : 'kid')}
                      className="flex items-center gap-1.5"
                    >
                      <div
                        className={`flex h-6 w-10 items-center border-2 border-brutal-black p-0.5 transition-colors ${m.role === 'kid' ? 'justify-end bg-brutal-yellow' : 'justify-start bg-brutal-white'}`}
                      >
                        <div className="h-4 w-4 bg-brutal-black" />
                      </div>
                      <span
                        className={`font-mono text-[10px] font-bold uppercase ${m.role === 'kid' ? 'text-brutal-black' : 'text-brutal-black/40'}`}
                      >
                        {m.role === 'kid' ? '👶 KID' : 'ADULT'}
                      </span>
                    </button>
                  ) : (
                    <span className="font-mono text-[10px] text-brutal-black/40 uppercase">
                      {m.role === 'kid' ? '👶 KID' : m.role}
                    </span>
                  )}
                </div>
              </div>
              <div className="font-mono text-sm font-bold">
                {m.total_points} <span className="text-[10px] text-brutal-black/40">PTS</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly prizes */}
      {members.length >= 2 && (
        <div className="mt-4 px-4">
          <div className="border-2 border-brutal-black bg-brutal-white">
            <div className="flex items-center gap-2 border-b-2 border-brutal-black bg-brutal-yellow/20 px-4 py-3">
              <Trophy size={14} strokeWidth={3} />
              <span className="font-mono text-xs font-bold">MONTHLY PRIZES</span>
              <span className="ml-auto font-mono text-[10px] text-brutal-black/40">
                Winner takes their prize
              </span>
            </div>
            <div className="divide-y divide-brutal-black/10">
              {members.map((m) => {
                const isMe = m.user_id === user?.id
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar
                      name={m.profiles.display_name}
                      color={m.profiles.avatar_color}
                      size="sm"
                      imageUrl={m.profiles.avatar_url}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-bold">
                        {m.profiles.display_name}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-brutal-black/40">
                        {m.monthly_prize || 'No prize set'}
                      </span>
                    </div>
                    {isMe && (
                      <button
                        onClick={() => {
                          setPrizeText(m.monthly_prize ?? '')
                          setShowPrize(true)
                        }}
                        className="border border-brutal-black bg-brutal-yellow px-2 py-1 font-mono text-[10px] font-bold transition-colors active:bg-brutal-yellow/60"
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
        <h2 className="mb-1 font-mono text-lg font-bold">YOUR PRIZE</h2>
        <p className="mb-4 font-mono text-xs text-brutal-black/50">
          What do you want if you win this month?
        </p>
        <Input
          value={prizeText}
          onChange={(e) => setPrizeText(e.target.value)}
          placeholder="e.g. I pick the takeaway"
          className="h-12 border-2 border-brutal-black font-mono"
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
          className="mt-3 h-12 w-full border-2 border-brutal-black bg-brutal-black font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-40"
        >
          {savingPrize ? 'SAVING...' : 'SAVE PRIZE'}
        </Button>
      </BottomSheet>

      {/* Group settings button */}
      {isOwner && (
        <div className="mt-4 px-4">
          <button
            onClick={() => setShowSettings(true)}
            className="flex w-full items-center justify-between border-2 border-brutal-black bg-brutal-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
          >
            <div className="flex items-center gap-2">
              <Settings size={16} strokeWidth={3} />
              <span className="font-mono text-sm font-bold">GROUP SETTINGS</span>
            </div>
          </button>
        </div>
      )}

      {/* Settings sheet */}
      <BottomSheet open={showSettings} onClose={() => setShowSettings(false)}>
        <h2 className="mb-4 font-mono text-lg font-bold">GROUP SETTINGS</h2>
        <div className="space-y-3">
          <button
            onClick={() => {
              setShowSettings(false)
              const initial: Record<string, number> = {}
              const hasCustom = members.some((m) => m.chore_share > 0)
              for (const m of members) {
                initial[m.id] = hasCustom ? m.chore_share : Math.round(100 / members.length)
              }
              setShares(initial)
              setShowSplit(true)
            }}
            className="flex w-full items-center justify-between border-2 border-brutal-black bg-brutal-white p-4 active:bg-brutal-black/5"
          >
            <div className="flex items-center gap-2">
              <Percent size={16} />
              <span className="font-mono text-sm font-bold">CHORE SPLIT</span>
            </div>
            <span className="font-mono text-xs text-brutal-black/40">
              {members.some((m) => m.chore_share > 0) ? 'CUSTOM' : 'EQUAL'}
            </span>
          </button>
          <button
            onClick={() => {
              setShowSettings(false)
              setGoalAmount(group.weekly_goal ?? 200)
              setShowGoal(true)
            }}
            className="flex w-full items-center justify-between border-2 border-brutal-black bg-brutal-white p-4 active:bg-brutal-black/5"
          >
            <div className="flex items-center gap-2">
              <Target size={16} />
              <span className="font-mono text-sm font-bold">WEEKLY GOAL</span>
            </div>
            <span className="font-mono text-xs text-brutal-black/40">
              {group.weekly_goal ? `${group.weekly_goal} PTS` : 'NOT SET'}
            </span>
          </button>
        </div>
      </BottomSheet>

      {/* Split editor sheet */}
      <BottomSheet open={showSplit} onClose={() => setShowSplit(false)}>
        <h2 className="mb-1 font-mono text-lg font-bold">CHORE SPLIT</h2>
        <p className="mb-4 font-mono text-xs text-brutal-black/50">
          {isOwner
            ? "Set each person's fair share. Must total 100%."
            : 'Only the group owner can change the split.'}
        </p>
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar
                name={m.profiles.display_name}
                color={m.profiles.avatar_color}
                size="sm"
                imageUrl={m.profiles.avatar_url}
              />
              <span className="flex-1 truncate font-mono text-sm font-bold">
                {m.profiles.display_name}
              </span>
              {isOwner ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShares((s) => ({ ...s, [m.id]: Math.max(0, (s[m.id] ?? 0) - 5) }))
                    }
                    className="flex h-8 w-8 items-center justify-center border-2 border-brutal-black bg-brutal-white font-mono font-bold active:bg-brutal-black/10"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-mono text-lg font-bold">
                    {shares[m.id] ?? 0}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setShares((s) => ({ ...s, [m.id]: Math.min(100, (s[m.id] ?? 0) + 5) }))
                    }
                    className="flex h-8 w-8 items-center justify-center border-2 border-brutal-black bg-brutal-white font-mono font-bold active:bg-brutal-black/10"
                  >
                    +
                  </button>
                </div>
              ) : (
                <span className="font-mono text-lg font-bold">{shares[m.id] ?? 0}%</span>
              )}
            </div>
          ))}
        </div>
        {isOwner && (
          <>
            <div
              className={`mt-4 border-2 p-3 text-center font-mono text-sm font-bold ${
                shareTotal === 100
                  ? 'border-brutal-lime bg-brutal-lime/20'
                  : 'border-brutal-pink bg-brutal-pink/20'
              }`}
            >
              TOTAL: {shareTotal}% {shareTotal !== 100 && `(need 100%)`}
            </div>
            <Button
              onClick={async () => {
                setSavingSplit(true)
                await updateMemberShares(
                  members.map((m) => ({ memberId: m.id, share: shares[m.id] ?? 0 })),
                )
                setSavingSplit(false)
                setShowSplit(false)
                toast('Chore split updated!', 'bg-brutal-lime')
              }}
              disabled={shareTotal !== 100 || savingSplit}
              className="mt-3 h-12 w-full border-2 border-brutal-black bg-brutal-black font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-40"
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
              className="mt-2 w-full py-2 font-mono text-xs font-bold text-brutal-black/40 active:text-brutal-black/60"
            >
              RESET TO EQUAL
            </button>
          </>
        )}
      </BottomSheet>

      {/* Goal editor sheet */}
      <BottomSheet open={showGoal} onClose={() => setShowGoal(false)}>
        <h2 className="mb-1 font-mono text-lg font-bold">WEEKLY GOAL</h2>
        <p className="mb-4 font-mono text-xs text-brutal-black/50">
          Set a point target for the whole group to hit each week. Teamwork!
        </p>
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGoalAmount(Math.max(0, goalAmount - 50))}
            className="flex h-12 w-12 items-center justify-center border-2 border-brutal-black bg-brutal-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            <Minus size={18} />
          </button>
          <div className="flex h-12 flex-1 items-center justify-center border-2 border-brutal-black bg-brutal-blue font-mono text-xl font-bold text-brutal-white">
            {goalAmount} PTS
          </div>
          <button
            type="button"
            onClick={() => setGoalAmount(goalAmount + 50)}
            className="flex h-12 w-12 items-center justify-center border-2 border-brutal-black bg-brutal-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            <Plus size={18} />
          </button>
        </div>
        <Button
          onClick={async () => {
            setSavingGoal(true)
            await updateWeeklyGoal(goalAmount > 0 ? goalAmount : null)
            setSavingGoal(false)
            setShowGoal(false)
            toast(
              goalAmount > 0 ? `Goal set to ${goalAmount} pts!` : 'Goal removed',
              'bg-brutal-blue',
            )
          }}
          disabled={savingGoal}
          className="h-12 w-full border-2 border-brutal-black bg-brutal-black font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-40"
        >
          {savingGoal ? 'SAVING...' : 'SAVE GOAL'}
        </Button>
        {group.weekly_goal && (
          <button
            onClick={async () => {
              setSavingGoal(true)
              await updateWeeklyGoal(null)
              setSavingGoal(false)
              setShowGoal(false)
              toast('Goal removed', 'bg-brutal-white')
            }}
            className="mt-2 w-full py-2 font-mono text-xs font-bold text-brutal-black/40 active:text-brutal-black/60"
          >
            REMOVE GOAL
          </button>
        )}
      </BottomSheet>

      {/* Leave group */}
      <div className="mt-6 mb-6 px-4">
        <button
          onClick={() => setConfirmLeave(true)}
          className="flex w-full items-center justify-center gap-2 border-2 border-brutal-pink/30 p-4 font-mono text-xs font-bold text-brutal-pink transition-colors active:bg-brutal-pink/10"
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
    </div>
  )
}

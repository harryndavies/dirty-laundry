import { useState, useRef } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { useGroup } from '@/context/GroupContext'
import { useChores } from '@/lib/hooks/useChores'
import { CompletionOverlay } from '@/components/CompletionOverlay'
import { usePocketMoney } from '@/lib/hooks/usePocketMoney'
import { useFairTurn } from '@/lib/hooks/useFairTurn'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { playComplete, playDelete, playBoost } from '@/lib/sounds'
import { Plus, Minus, RotateCw, Zap, Dices, TrendingUp, Bell, Camera, X, Star, Focus, Search } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { advanceTour } from '@/lib/hooks/useTour'

type Filter = 'all' | 'persistent' | 'one-time' | 'mine'

const AREAS = ['Kitchen', 'Bathroom', 'Bedroom', 'Living Room', 'Garden', 'Laundry', 'General']

const CHORE_PACKS: { name: string; emoji: string; chores: { name: string; points: number; area: string }[] }[] = [
  {
    name: 'STUDENT FLAT',
    emoji: '🎓',
    chores: [
      { name: 'Do the dishes', points: 10, area: 'Kitchen' },
      { name: 'Take the bins out', points: 10, area: 'General' },
      { name: 'Hoover the flat', points: 15, area: 'Living Room' },
      { name: 'Clean the bathroom', points: 20, area: 'Bathroom' },
      { name: 'Wipe kitchen surfaces', points: 10, area: 'Kitchen' },
      { name: 'Take out recycling', points: 5, area: 'General' },
      { name: 'Mop the kitchen floor', points: 15, area: 'Kitchen' },
      { name: 'Clean the toilet', points: 10, area: 'Bathroom' },
    ],
  },
  {
    name: 'FAMILY HOME',
    emoji: '🏠',
    chores: [
      { name: 'Do the dishes', points: 10, area: 'Kitchen' },
      { name: 'Hoover downstairs', points: 15, area: 'Living Room' },
      { name: 'Hoover upstairs', points: 15, area: 'Bedroom' },
      { name: 'Clean the bathroom', points: 20, area: 'Bathroom' },
      { name: 'Put a wash on', points: 10, area: 'Laundry' },
      { name: 'Hang out washing', points: 10, area: 'Laundry' },
      { name: 'Cook dinner', points: 20, area: 'Kitchen' },
      { name: 'Take the bins out', points: 10, area: 'General' },
      { name: 'Mow the grass', points: 25, area: 'Garden' },
      { name: 'Wipe kitchen surfaces', points: 10, area: 'Kitchen' },
      { name: 'Unload dishwasher', points: 5, area: 'Kitchen' },
      { name: 'Tidy living room', points: 10, area: 'Living Room' },
    ],
  },
  {
    name: 'COUPLE',
    emoji: '💑',
    chores: [
      { name: 'Do the dishes', points: 10, area: 'Kitchen' },
      { name: 'Cook dinner', points: 20, area: 'Kitchen' },
      { name: 'Hoover the flat', points: 15, area: 'Living Room' },
      { name: 'Clean the bathroom', points: 20, area: 'Bathroom' },
      { name: 'Put a wash on', points: 10, area: 'Laundry' },
      { name: 'Food shop', points: 20, area: 'General' },
      { name: 'Take the bins out', points: 10, area: 'General' },
      { name: 'Change the bedsheets', points: 15, area: 'Bedroom' },
    ],
  },
]

export function ChoresPage() {
  const { group, members, loading: groupLoading, updateSavingsGoal } = useGroup()
  const { user } = useAuth()
  const { chores, loading, addChore, completeChore, deleteChore, boostChore, editChore } = useChores()
  const { suggestions } = useFairTurn()
  const { balances, formatMoney } = usePocketMoney()
  const userMember = members.find(m => m.user_id === user?.id)
  const isKid = userMember?.role === 'kid'
  const isAnonymous = user?.is_anonymous ?? false
  const myBalance = user ? balances.get(user.id) : null
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [areaFilter, setAreaFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newPoints, setNewPoints] = useState(10)
  const [newPersistent, setNewPersistent] = useState(true)
  const [newReminderDay, setNewReminderDay] = useState<number | null>(null)
  const [newReminderTime, setNewReminderTime] = useState('09:00')
  const [newArea, setNewArea] = useState<string | null>(null)

  // Just do one mode
  const [justDoOne, setJustDoOne] = useState(false)
  const [justDoOneIndex, setJustDoOneIndex] = useState(0)

  // Confirm dialog state
  const [confirmComplete, setConfirmComplete] = useState<{ id: string; points: number; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [withUserId, setWithUserId] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBefore, setPhotoBefore] = useState<File | null>(null)
  const [photoBeforePreview, setPhotoBeforePreview] = useState<string | null>(null)
  const [showSavingsGoal, setShowSavingsGoal] = useState(false)
  const [addingPack, setAddingPack] = useState(false)
  const [completionOverlay, setCompletionOverlay] = useState<{ points: number; totalPoints: number; choreName: string } | null>(null)
  const [editingChore, setEditingChore] = useState<{ id: string; name: string; points: number; is_persistent: boolean; area: string | null; reminder_day: number | null; reminder_time: string | null; assigned_to: string | null } | null>(null)
  const [assigningChore, setAssigningChore] = useState<{ id: string; name: string; assigned_to: string | null } | null>(null)
  const [goalName, setGoalName] = useState('')
  const [goalAmount, setGoalAmount] = useState(500)

  // Bounty state
  const [bountyChore, setBountyChore] = useState<{ id: string; name: string; points: number } | null>(null)
  const [bountyAmount, setBountyAmount] = useState(10)

  // Swipe state — use refs for tracking to avoid async state issues, state only for rendering
  const touchStartX = useRef(0)
  const swipingIdRef = useRef<string | null>(null)
  const swipeOffsetRef = useRef(0)
  const [swipingId, setSwipingId] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)

  if (groupLoading) return null
  if (!group) return <Navigate to="/group" replace />

  const today = new Date().getDay()

  const searchLower = search.toLowerCase().trim()
  const filtered = chores.filter(c => {
    if (searchLower && !c.name.toLowerCase().includes(searchLower)) return false
    if (filter === 'mine') return c.assigned_to === user?.id || suggestions.get(c.id)?.user_id === user?.id
    if (filter === 'persistent') return c.is_persistent
    if (filter === 'one-time') return !c.is_persistent
    if (areaFilter && c.area !== areaFilter) return false
    return true
  }).sort((a, b) => {
    // Due today chores first
    const aDue = a.reminder_day === today ? 1 : 0
    const bDue = b.reminder_day === today ? 1 : 0
    return bDue - aDue
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await addChore.mutateAsync({
      name: newName.trim(),
      points: newPoints,
      isPersistent: newPersistent,
      reminderDay: newReminderDay,
      reminderTime: newReminderDay !== null ? newReminderTime : null,
      area: newArea,
    })
    const addedName = newName.trim()
    setNewName('')
    setNewPoints(10)
    setNewPersistent(true)
    setNewReminderDay(null)
    setNewReminderTime('09:00')
    setNewArea(null)
    setShowAdd(false)
    toast(`${addedName} added!`, 'bg-brutal-lime')
    advanceTour('chore-add')
  }

  function handleComplete(choreId: string, points: number, name: string) {
    setConfirmComplete({ id: choreId, points, name })
  }

  async function doComplete() {
    if (!confirmComplete) return
    const result = await completeChore.mutateAsync({
      choreId: confirmComplete.id,
      points: confirmComplete.points,
      withUserId: withUserId ?? undefined,
      photo: photo ?? undefined,
      photoBefore: photoBefore ?? undefined,
    })
    playComplete()
    const currentTotal = (userMember?.total_points ?? 0) + result.earnedPoints
    setCompletionOverlay({
      points: result.earnedPoints,
      totalPoints: currentTotal,
      choreName: confirmComplete.name,
    })
    setConfirmComplete(null)
    setWithUserId(null)
    setPhoto(null)
    setPhotoPreview(null)
    setPhotoBefore(null)
    setPhotoBeforePreview(null)
  }

  function handleDelete(choreId: string) {
    setConfirmDelete(choreId)
  }

  async function doDelete() {
    if (!confirmDelete) return
    await deleteChore.mutateAsync(confirmDelete)
    playDelete()
    toast('Chore deleted', 'bg-brutal-orange')
    setConfirmDelete(null)
  }

  function onTouchStart(e: React.TouchEvent, id: string) {
    touchStartX.current = e.touches[0].clientX
    swipingIdRef.current = id
    swipeOffsetRef.current = 0
    setSwipingId(id)
    setSwipeOffset(0)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!swipingIdRef.current) return
    const diff = e.touches[0].clientX - touchStartX.current
    swipeOffsetRef.current = diff
    setSwipeOffset(diff)
  }

  function onTouchEnd(chore: typeof chores[0]) {
    const offset = swipeOffsetRef.current
    if (offset < -80 && !isKid) {
      setAssigningChore({ id: chore.id, name: chore.name, assigned_to: chore.assigned_to })
    } else if (offset > 80 && !isKid) {
      setEditingChore({
        id: chore.id,
        name: chore.name,
        points: chore.points,
        is_persistent: chore.is_persistent,
        area: chore.area,
        reminder_day: chore.reminder_day,
        reminder_time: chore.reminder_time,
        assigned_to: chore.assigned_to,
      })
    }
    swipingIdRef.current = null
    swipeOffsetRef.current = 0
    setSwipingId(null)
    setSwipeOffset(0)
  }

  const filters: { label: string; value: Filter }[] = [
    { label: 'ALL', value: 'all' },
    { label: 'MINE', value: 'mine' },
    { label: 'RECURRING', value: 'persistent' },
    { label: 'ONE-TIME', value: 'one-time' },
  ]

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-brutal-white border-b-4 border-brutal-black px-4 py-3 flex items-center justify-between">
        <h1 className="font-mono font-bold text-lg tracking-tight">{group.name}</h1>
        <div className="flex gap-2" data-tour="header-actions">
          <button
            onClick={() => {
              const persistent = chores.filter(c => c.is_persistent)
              if (persistent.length === 0) {
                toast('Add some recurring chores first', 'bg-brutal-yellow')
                return
              }
              setJustDoOneIndex(Math.floor(Math.random() * persistent.length))
              setJustDoOne(true)
            }}
            className="w-11 h-11 bg-brutal-yellow border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Focus size={20} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => navigate('/roulette')}
            className="w-11 h-11 bg-brutal-pink text-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Dices size={20} strokeWidth={2.5} />
          </button>
          {!isKid && (
            <button
              onClick={() => setShowAdd(true)}
              data-tour="chore-add"
              className="w-11 h-11 bg-brutal-blue text-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* Kid earnings banner */}
      {isKid && myBalance && group?.pocket_money_rate && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-3 bg-brutal-yellow border-2 border-brutal-black p-3">
            <span className="text-xl">💰</span>
            <div className="flex-1">
              <span className="font-mono font-bold text-lg">{formatMoney(myBalance.unpaidAmount)}</span>
              <span className="font-mono text-[10px] text-brutal-black/50 ml-2">EARNED</span>
            </div>
            <span className="font-mono text-[10px] text-brutal-black/40">{group.pocket_money_rate}p per pt</span>
          </div>
        </div>
      )}

      {/* Savings goal */}
      {isKid && group?.pocket_money_rate && (
        <div className="px-4 pt-2">
          {userMember?.savings_goal ? (
            <button
              onClick={() => {
                setGoalName(userMember.savings_goal_name ?? '')
                setGoalAmount(userMember.savings_goal ?? 500)
                setShowSavingsGoal(true)
              }}
              className="w-full border-2 border-brutal-black bg-brutal-white p-3 active:bg-brutal-black/5 transition-colors text-left"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-brutal-yellow" fill="#FFE500" />
                  <span className="font-mono text-xs font-bold">{userMember.savings_goal_name ?? 'SAVINGS GOAL'}</span>
                </div>
                <span className="font-mono text-xs font-bold">
                  {formatMoney(myBalance?.unpaidAmount ?? 0)} / {formatMoney(userMember.savings_goal)}
                </span>
              </div>
              <div className="h-3 bg-brutal-black/10 border border-brutal-black/20">
                <div
                  className={`h-full transition-all duration-500 ${(myBalance?.unpaidAmount ?? 0) >= userMember.savings_goal ? 'bg-brutal-lime' : 'bg-brutal-yellow'}`}
                  style={{ width: `${Math.min(100, ((myBalance?.unpaidAmount ?? 0) / userMember.savings_goal) * 100)}%` }}
                />
              </div>
              {(myBalance?.unpaidAmount ?? 0) >= userMember.savings_goal && (
                <p className="font-mono text-[10px] font-bold text-green-600 mt-1">You've reached your goal! 🎉</p>
              )}
            </button>
          ) : (
            <button
              onClick={() => { setGoalName(''); setGoalAmount(500); setShowSavingsGoal(true) }}
              className="w-full border-2 border-dashed border-brutal-black/30 p-3 font-mono text-xs font-bold text-brutal-black/40 flex items-center justify-center gap-2 active:bg-brutal-black/5"
            >
              <Star size={14} /> SET A SAVINGS GOAL
            </button>
          )}
        </div>
      )}

      {/* Savings goal sheet */}
      <BottomSheet open={showSavingsGoal} onClose={() => setShowSavingsGoal(false)}>
        <h2 className="font-mono font-bold text-lg mb-1">SAVINGS GOAL</h2>
        <p className="font-mono text-xs text-brutal-black/50 mb-4">
          What are you saving for?
        </p>
        <Input
          value={goalName}
          onChange={e => setGoalName(e.target.value)}
          placeholder="e.g. New game, headphones"
          className="border-2 border-brutal-black font-mono h-12 mb-4"
          autoFocus
          maxLength={50}
        />
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => setGoalAmount(Math.max(100, goalAmount - 100))}
            className="w-12 h-12 bg-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
          >
            <Minus size={18} />
          </button>
          <div className="flex-1 h-12 bg-brutal-yellow border-2 border-brutal-black flex items-center justify-center font-mono font-bold text-xl">
            {formatMoney(goalAmount)}
          </div>
          <button
            type="button"
            onClick={() => setGoalAmount(goalAmount + 100)}
            className="w-12 h-12 bg-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
          >
            <Plus size={18} />
          </button>
        </div>
        <Button
          onClick={async () => {
            await updateSavingsGoal(goalAmount, goalName.trim() || null)
            setShowSavingsGoal(false)
            toast('Savings goal set!', 'bg-brutal-yellow')
          }}
          className="w-full h-12 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
        >
          SAVE GOAL
        </Button>
        {userMember?.savings_goal && (
          <button
            onClick={async () => {
              await updateSavingsGoal(null, null)
              setShowSavingsGoal(false)
              toast('Goal removed', 'bg-brutal-white')
            }}
            className="w-full mt-2 font-mono text-xs text-brutal-black/40 font-bold py-2 active:text-brutal-black/60"
          >
            REMOVE GOAL
          </button>
        )}
      </BottomSheet>

      {/* Anonymous account nudge */}
      {isAnonymous && (
        <button
          onClick={() => navigate('/profile')}
          className="mx-4 mt-2 p-2 bg-brutal-yellow/30 border border-brutal-yellow font-mono text-[10px] text-brutal-black/50 text-center active:bg-brutal-yellow/50"
        >
          Guest account — tap to save your progress with an email
        </button>
      )}

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brutal-black/40" />
          <input
            type="text"
            placeholder="Search chores..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border-2 border-brutal-black font-mono text-xs bg-brutal-white placeholder:text-brutal-black/30 focus:outline-none focus:ring-0"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-brutal-black/40 active:text-brutal-black"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 pt-2 pb-1 flex gap-1.5 overflow-x-auto">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setAreaFilter(null) }}
            className={`font-mono text-[10px] font-bold px-3 py-1.5 border-2 border-brutal-black whitespace-nowrap transition-all ${
              filter === f.value && !areaFilter
                ? 'bg-brutal-black text-brutal-white'
                : 'bg-brutal-white text-brutal-black active:bg-brutal-black/10'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="w-px bg-brutal-black/20 mx-1" />
        {[...new Set(chores.map(c => c.area).filter(Boolean))].map(area => (
          <button
            key={area}
            onClick={() => { setAreaFilter(areaFilter === area ? null : area!); setFilter('all') }}
            className={`font-mono text-[10px] font-bold px-3 py-1.5 border-2 border-brutal-black whitespace-nowrap transition-all ${
              areaFilter === area
                ? 'bg-brutal-blue text-brutal-white'
                : 'bg-brutal-white text-brutal-black active:bg-brutal-black/10'
            }`}
          >
            {area!.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chore list */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="py-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          chores.length === 0 && !isKid ? (
            <div className="py-8">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">🧹</div>
                <p className="font-mono font-bold text-brutal-black/40 text-sm">NO CHORES YET</p>
                <p className="font-mono text-brutal-black/30 text-xs mt-1">Pick a starter pack or add your own</p>
              </div>
              <div className="space-y-2" data-tour="chore-packs">
                {CHORE_PACKS.map(pack => (
                  <button
                    key={pack.name}
                    disabled={addingPack}
                    onClick={async () => {
                      setAddingPack(true)
                      for (const c of pack.chores) {
                        await addChore.mutateAsync({
                          name: c.name,
                          points: c.points,
                          isPersistent: true,
                          area: c.area,
                        })
                      }
                      setAddingPack(false)
                      toast(`${pack.chores.length} chores added!`, 'bg-brutal-lime')
                      advanceTour('chore-packs')
                    }}
                    className="w-full border-2 border-brutal-black bg-brutal-white p-4 flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all disabled:opacity-50"
                  >
                    <span className="text-2xl">{pack.emoji}</span>
                    <div className="flex-1 text-left">
                      <span className="font-mono font-bold text-sm block">{pack.name}</span>
                      <span className="font-mono text-[10px] text-brutal-black/40">{pack.chores.length} chores</span>
                    </div>
                    <span className="font-mono text-xs text-brutal-black/40">ADD ALL</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">🧹</div>
              <p className="font-mono font-bold text-brutal-black/40 text-sm">
                {chores.length === 0 ? 'NO CHORES YET' : 'NO CHORES MATCH'}
              </p>
              <p className="font-mono text-brutal-black/30 text-xs mt-1">
                {isKid ? 'Ask a parent to add some chores' : 'Tap + to add one'}
              </p>
            </div>
          )
        ) : (
          (() => {
            const hasAreas = filtered.some(c => c.area)
            const grouped = new Map<string, typeof filtered>()
            for (const c of filtered) {
              const key = c.area ?? (hasAreas ? 'Uncategorised' : '')
              if (!grouped.has(key)) grouped.set(key, [])
              grouped.get(key)!.push(c)
            }
            return Array.from(grouped.entries()).map(([area, areaChores]) => (
              <div key={area} className="mb-4">
                {area && (
                  <div className="font-mono font-bold text-[11px] text-brutal-black/40 tracking-widest mb-2 px-1 sticky top-0 bg-brutal-white py-2 z-[5]">
                    {area.toUpperCase()}
                  </div>
                )}
                <div className="space-y-3">
          {areaChores.map(chore => {
            const isSwiping = swipingId === chore.id
            const offset = isSwiping ? swipeOffset : 0
            const showEdit = offset > 40 && !isKid
            const showAssign = offset < -40 && !isKid

            return (
              <div key={chore.id} className="relative overflow-hidden group/chore">
                {/* Swipe backgrounds */}
                <div className="absolute inset-0 flex md:hidden">
                  <div className={`flex-1 bg-brutal-blue flex items-center px-4 font-mono font-bold text-sm text-brutal-white transition-opacity ${showEdit ? 'opacity-100' : 'opacity-0'}`}>
                    EDIT ✎
                  </div>
                  <div className={`flex-1 bg-brutal-orange flex items-center justify-end px-4 font-mono font-bold text-sm text-brutal-white transition-opacity ${showAssign ? 'opacity-100' : 'opacity-0'}`}>
                    ASSIGN 📋
                  </div>
                </div>

                <div
                  className="relative bg-brutal-white border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex items-center gap-3 touch-pan-y md:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] md:hover:translate-x-[2px] md:hover:translate-y-[2px] md:transition-all"
                  style={{ transform: isSwiping ? `translateX(${offset}px)` : 'translateX(0)', transition: isSwiping ? 'none' : 'transform 0.2s' }}
                  onTouchStart={e => onTouchStart(e, chore.id)}
                  onTouchMove={onTouchMove}
                  onTouchEnd={() => onTouchEnd(chore)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-mono font-bold text-base truncate">{chore.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => { setBountyChore({ id: chore.id, name: chore.name, points: chore.points }); setBountyAmount(10) }}
                        className={`inline-flex items-center gap-1 border border-brutal-black px-2 py-0.5 font-mono text-xs font-bold active:opacity-70 transition-colors ${
                          chore.points > chore.base_points
                            ? 'bg-brutal-orange text-brutal-white animate-pulse'
                            : 'bg-brutal-yellow'
                        }`}
                      >
                        {chore.points > chore.base_points && '🔥 '}
                        {chore.points} PTS{isKid && group?.pocket_money_rate ? ` (${formatMoney(chore.points * group.pocket_money_rate)})` : ''} <TrendingUp size={10} />
                      </button>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] font-bold border ${
                        chore.is_persistent
                          ? 'bg-brutal-blue/10 border-brutal-blue text-brutal-blue'
                          : 'bg-brutal-orange/10 border-brutal-orange text-brutal-orange'
                      }`}>
                        {chore.is_persistent ? <><RotateCw size={10} /> RECURRING</> : <><Zap size={10} /> ONE-TIME</>}
                      </span>
                      {chore.reminder_day !== null && (
                        chore.reminder_day === today ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] font-bold border bg-brutal-pink/20 border-brutal-pink text-brutal-pink">
                            <Bell size={10} /> DUE TODAY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] font-bold border bg-brutal-yellow/20 border-brutal-yellow text-brutal-black/60">
                            <Bell size={10} /> {['SUN','MON','TUE','WED','THU','FRI','SAT'][chore.reminder_day]} {chore.reminder_time?.slice(0, 5)}
                          </span>
                        )
                      )}
                    </div>
                    {chore.assigned_to && (() => {
                      const assignee = members.find(m => m.user_id === chore.assigned_to)
                      if (!assignee) return null
                      return (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {assignee.profiles.avatar_url ? (
                            <img src={assignee.profiles.avatar_url} alt="" className="w-4 h-4 border border-brutal-black object-cover shrink-0" />
                          ) : (
                            <div className="w-4 h-4 border border-brutal-black flex items-center justify-center font-mono text-[8px] font-bold text-white shrink-0" style={{ background: assignee.profiles.avatar_color }}>
                              {assignee.profiles.display_name[0]}
                            </div>
                          )}
                          <span className="font-mono text-[10px] text-brutal-black/50">
                            {assignee.profiles.display_name}'s job
                          </span>
                        </div>
                      )
                    })()}
                    {!chore.assigned_to && chore.is_persistent && suggestions.get(chore.id) && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {suggestions.get(chore.id)!.avatar_url ? (
                          <img
                            src={suggestions.get(chore.id)!.avatar_url!}
                            alt=""
                            className="w-4 h-4 border border-brutal-black object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-4 h-4 border border-brutal-black flex items-center justify-center font-mono text-[8px] font-bold text-white shrink-0"
                            style={{ background: suggestions.get(chore.id)!.avatar_color }}
                          >
                            {suggestions.get(chore.id)!.display_name[0]}
                          </div>
                        )}
                        <span className="font-mono text-[10px] text-brutal-black/50">
                          {suggestions.get(chore.id)!.display_name}'s turn
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Desktop action buttons — hidden on mobile, shown on hover */}
                  {!isKid && (
                    <div className="hidden md:flex gap-1 opacity-0 group-hover/chore:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingChore({
                          id: chore.id,
                          name: chore.name,
                          points: chore.points,
                          is_persistent: chore.is_persistent,
                          area: chore.area,
                          reminder_day: chore.reminder_day,
                          reminder_time: chore.reminder_time,
                          assigned_to: chore.assigned_to,
                        })}
                        className="w-10 h-10 bg-brutal-blue text-brutal-white border-2 border-brutal-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-mono text-xs font-bold hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => setAssigningChore({ id: chore.id, name: chore.name, assigned_to: chore.assigned_to })}
                        className="w-10 h-10 bg-brutal-orange text-brutal-white border-2 border-brutal-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-mono text-xs font-bold hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        title="Assign"
                      >
                        📋
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleComplete(chore.id, chore.points, chore.name)}
                    {...(filtered.indexOf(chore) === 0 ? { 'data-tour': 'chore-complete' } : {})}
                    className="w-12 h-12 bg-brutal-lime border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-mono font-bold text-sm active:shadow-none active:translate-x-[3px] active:translate-y-[3px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    ✓
                  </button>
                </div>
              </div>
            )
          })}
                </div>
              </div>
            ))
          })()
        )}
      </div>

      {/* Add chore sheet */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)}>
        <h2 className="font-mono font-bold text-lg mb-4">ADD CHORE</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="font-mono text-xs font-bold uppercase block mb-1">NAME</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Do the dishes"
              className="border-2 border-brutal-black font-mono h-12"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="font-mono text-xs font-bold uppercase block mb-1">POINTS</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNewPoints(Math.max(1, newPoints - 5))}
                className="w-12 h-12 bg-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
              >
                <Minus size={18} />
              </button>
              <div className="flex-1 h-12 bg-brutal-yellow border-2 border-brutal-black flex items-center justify-center font-mono font-bold text-xl">
                {newPoints}
              </div>
              <button
                type="button"
                onClick={() => setNewPoints(newPoints + 5)}
                className="w-12 h-12 bg-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div>
            <label className="font-mono text-xs font-bold uppercase block mb-1">TYPE</label>
            <div className="flex border-2 border-brutal-black">
              <button
                type="button"
                onClick={() => setNewPersistent(true)}
                className={`flex-1 py-3 font-mono font-bold text-xs uppercase transition-colors ${
                  newPersistent ? 'bg-brutal-blue text-brutal-white' : 'bg-brutal-white'
                }`}
              >
                RECURRING
              </button>
              <button
                type="button"
                onClick={() => setNewPersistent(false)}
                className={`flex-1 py-3 font-mono font-bold text-xs uppercase border-l-2 border-brutal-black transition-colors ${
                  !newPersistent ? 'bg-brutal-orange text-brutal-white' : 'bg-brutal-white'
                }`}
              >
                ONE-TIME
              </button>
            </div>
          </div>

          <div>
            <label className="font-mono text-xs font-bold uppercase block mb-1">AREA</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setNewArea(null)}
                className={`px-3 py-2 font-mono text-xs font-bold border-2 border-brutal-black transition-all ${
                  newArea === null ? 'bg-brutal-black text-brutal-white' : 'bg-brutal-white text-brutal-black active:bg-brutal-black/10'
                }`}
              >
                NONE
              </button>
              {AREAS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setNewArea(a)}
                  className={`px-3 py-2 font-mono text-xs font-bold border-2 border-brutal-black transition-all ${
                    newArea === a ? 'bg-brutal-black text-brutal-white' : 'bg-brutal-white text-brutal-black active:bg-brutal-black/10'
                  }`}
                >
                  {a.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono text-xs font-bold uppercase block mb-1">REMINDER</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'NONE', value: null },
                { label: 'MON', value: 1 },
                { label: 'TUE', value: 2 },
                { label: 'WED', value: 3 },
                { label: 'THU', value: 4 },
                { label: 'FRI', value: 5 },
                { label: 'SAT', value: 6 },
                { label: 'SUN', value: 0 },
              ].map(d => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setNewReminderDay(d.value)}
                  className={`px-3 py-2 font-mono text-xs font-bold border-2 border-brutal-black transition-all ${
                    newReminderDay === d.value
                      ? 'bg-brutal-black text-brutal-white'
                      : 'bg-brutal-white text-brutal-black active:bg-brutal-black/10'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {newReminderDay !== null && (
              <div className="flex items-center gap-2 mt-2">
                <Bell size={14} className="text-brutal-black/50" />
                <input
                  type="time"
                  value={newReminderTime}
                  onChange={e => setNewReminderTime(e.target.value)}
                  className="flex-1 h-10 border-2 border-brutal-black px-3 font-mono text-sm bg-brutal-white"
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={addChore.isPending}
            className="w-full h-12 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
          >
            {addChore.isPending ? 'ADDING...' : 'ADD CHORE'}
          </Button>
        </form>
      </BottomSheet>

      {/* Bounty sheet */}
      <BottomSheet open={!!bountyChore} onClose={() => setBountyChore(null)}>
        {bountyChore && (
          <>
            <h2 className="font-mono font-bold text-lg mb-1">BOOST BOUNTY</h2>
            <p className="font-mono text-xs text-brutal-black/50 mb-4">
              Make "{bountyChore.name}" worth more to get it done.
              Currently <span className="font-bold">{bountyChore.points} pts</span>.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setBountyAmount(Math.max(5, bountyAmount - 5))}
                className="w-12 h-12 bg-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
              >
                <Minus size={18} />
              </button>
              <div className="flex-1 h-12 bg-brutal-orange border-2 border-brutal-black flex items-center justify-center font-mono font-bold text-xl text-brutal-white">
                +{bountyAmount}
              </div>
              <button
                type="button"
                onClick={() => setBountyAmount(bountyAmount + 5)}
                className="w-12 h-12 bg-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="bg-brutal-yellow/30 border-2 border-brutal-black p-3 mb-4 text-center">
              <span className="font-mono text-xs text-brutal-black/50">NEW VALUE: </span>
              <span className="font-mono font-bold text-lg">{bountyChore.points + bountyAmount} PTS</span>
            </div>
            <Button
              onClick={async () => {
                await boostChore.mutateAsync({ choreId: bountyChore.id, extraPoints: bountyAmount })
                playBoost()
                toast(`Boosted "${bountyChore.name}" by +${bountyAmount} pts!`, 'bg-brutal-orange')
                setBountyChore(null)
              }}
              disabled={boostChore.isPending}
              className="w-full h-12 bg-brutal-orange text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
            >
              {boostChore.isPending ? 'BOOSTING...' : 'BOOST BOUNTY'}
            </Button>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={!!confirmComplete} onClose={() => { setConfirmComplete(null); setWithUserId(null) }}>
        {confirmComplete && (
          <>
            <h2 className="font-mono font-bold text-lg mb-1">COMPLETE CHORE</h2>
            <p className="font-mono text-xs text-brutal-black/50 mb-4">
              Mark "{confirmComplete.name}" as done for +{confirmComplete.points} pts?
            </p>

            {members.length > 1 && (
              <div className="mb-4">
                <p className="font-mono text-[10px] font-bold text-brutal-black/40 tracking-widest mb-2">DID THIS WITH...</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setWithUserId(null)}
                    className={`flex items-center gap-1.5 px-3 py-2 border-2 border-brutal-black font-mono text-xs font-bold transition-all ${
                      !withUserId ? 'bg-brutal-black text-brutal-white' : 'bg-brutal-white'
                    }`}
                  >
                    JUST ME
                  </button>
                  {members.filter(m => m.user_id !== user?.id).map(m => (
                    <button
                      key={m.user_id}
                      onClick={() => setWithUserId(withUserId === m.user_id ? null : m.user_id)}
                      className={`flex items-center gap-1.5 px-3 py-2 border-2 border-brutal-black font-mono text-xs font-bold transition-all ${
                        withUserId === m.user_id ? 'bg-brutal-lime' : 'bg-brutal-white'
                      }`}
                    >
                      <Avatar name={m.profiles.display_name} color={m.profiles.avatar_color} size="sm" imageUrl={m.profiles.avatar_url} />
                      {m.profiles.display_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Photo proof */}
            <div className="mb-4">
              <p className="font-mono text-[10px] font-bold text-brutal-black/40 tracking-widest mb-2">BEFORE & AFTER (OPTIONAL)</p>
              <div className="grid grid-cols-2 gap-2">
                {/* Before photo */}
                <div>
                  {photoBeforePreview ? (
                    <div className="relative">
                      <img src={photoBeforePreview} alt="Before" className="w-full h-24 object-cover border-2 border-brutal-black" />
                      <span className="absolute top-1 left-1 font-mono text-[8px] font-bold bg-brutal-black text-brutal-white px-1">BEFORE</span>
                      <button onClick={() => { setPhotoBefore(null); setPhotoBeforePreview(null) }} className="absolute top-1 right-1 w-5 h-5 bg-brutal-black text-brutal-white flex items-center justify-center"><X size={10} /></button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-brutal-black/30 bg-brutal-white font-mono text-[10px] font-bold text-brutal-black/40 active:bg-brutal-black/5 cursor-pointer gap-1">
                      <Camera size={14} />
                      BEFORE
                      <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhotoBefore(f); setPhotoBeforePreview(URL.createObjectURL(f)) } }} />
                    </label>
                  )}
                </div>
                {/* After photo */}
                <div>
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="After" className="w-full h-24 object-cover border-2 border-brutal-black" />
                      <span className="absolute top-1 left-1 font-mono text-[8px] font-bold bg-brutal-lime text-brutal-black px-1">AFTER</span>
                      <button onClick={() => { setPhoto(null); setPhotoPreview(null) }} className="absolute top-1 right-1 w-5 h-5 bg-brutal-black text-brutal-white flex items-center justify-center"><X size={10} /></button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-brutal-black/30 bg-brutal-white font-mono text-[10px] font-bold text-brutal-black/40 active:bg-brutal-black/5 cursor-pointer gap-1">
                      <Camera size={14} />
                      AFTER
                      <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)) } }} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={doComplete}
              disabled={completeChore.isPending}
              className="w-full h-12 bg-brutal-lime font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
            >
              {completeChore.isPending ? 'COMPLETING...' : withUserId ? 'DONE TOGETHER ✓' : 'DONE ✓'}
            </Button>
          </>
        )}
      </BottomSheet>

      {/* Assign sheet */}
      <BottomSheet open={!!assigningChore} onClose={() => setAssigningChore(null)}>
        {assigningChore && (
          <>
            <h2 className="font-mono font-bold text-lg mb-1">ASSIGN CHORE</h2>
            <p className="font-mono text-xs text-brutal-black/50 mb-4">
              Who should do "{assigningChore.name}"?
            </p>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  await editChore.mutateAsync({ choreId: assigningChore.id, updates: { assigned_to: null } })
                  toast('Assignment removed', 'bg-brutal-white')
                  setAssigningChore(null)
                }}
                className={`w-full flex items-center gap-3 p-3 border-2 border-brutal-black transition-all ${
                  !assigningChore.assigned_to ? 'bg-brutal-black text-brutal-white' : 'bg-brutal-white active:bg-brutal-black/5'
                }`}
              >
                <span className="font-mono font-bold text-sm">ANYONE</span>
              </button>
              {members.map(m => (
                <button
                  key={m.user_id}
                  onClick={async () => {
                    await editChore.mutateAsync({ choreId: assigningChore.id, updates: { assigned_to: m.user_id, name: assigningChore.name } })
                    toast(`Assigned to ${m.profiles.display_name}!`, 'bg-brutal-orange')
                    setAssigningChore(null)
                  }}
                  className={`w-full flex items-center gap-3 p-3 border-2 border-brutal-black transition-all ${
                    assigningChore.assigned_to === m.user_id ? 'bg-brutal-orange text-brutal-white' : 'bg-brutal-white active:bg-brutal-black/5'
                  }`}
                >
                  <Avatar name={m.profiles.display_name} color={m.profiles.avatar_color} size="sm" imageUrl={m.profiles.avatar_url} />
                  <span className="font-mono font-bold text-sm">{m.profiles.display_name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </BottomSheet>

      {/* Edit chore sheet */}
      <BottomSheet open={!!editingChore} onClose={() => setEditingChore(null)}>
        {editingChore && (
          <>
            <h2 className="font-mono font-bold text-lg mb-4">EDIT CHORE</h2>
            <div className="space-y-4">
              <div>
                <label className="font-mono text-xs font-bold uppercase block mb-1">NAME</label>
                <Input
                  value={editingChore.name}
                  onChange={e => setEditingChore({ ...editingChore, name: e.target.value })}
                  className="border-2 border-brutal-black font-mono h-12"
                />
              </div>
              <div>
                <label className="font-mono text-xs font-bold uppercase block mb-1">POINTS</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setEditingChore({ ...editingChore, points: Math.max(1, editingChore.points - 5) })}
                    className="w-12 h-12 bg-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all">
                    <Minus size={18} />
                  </button>
                  <div className="flex-1 h-12 bg-brutal-yellow border-2 border-brutal-black flex items-center justify-center font-mono font-bold text-xl">
                    {editingChore.points}
                  </div>
                  <button type="button" onClick={() => setEditingChore({ ...editingChore, points: editingChore.points + 5 })}
                    className="w-12 h-12 bg-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <div>
                <label className="font-mono text-xs font-bold uppercase block mb-1">AREA</label>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setEditingChore({ ...editingChore, area: null })}
                    className={`px-3 py-2 font-mono text-xs font-bold border-2 border-brutal-black transition-all ${editingChore.area === null ? 'bg-brutal-black text-brutal-white' : 'bg-brutal-white'}`}>
                    NONE
                  </button>
                  {AREAS.map(a => (
                    <button key={a} type="button" onClick={() => setEditingChore({ ...editingChore, area: a })}
                      className={`px-3 py-2 font-mono text-xs font-bold border-2 border-brutal-black transition-all ${editingChore.area === a ? 'bg-brutal-black text-brutal-white' : 'bg-brutal-white'}`}>
                      {a.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-mono text-xs font-bold uppercase block mb-1">REMINDER</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'NONE', value: null },
                    { label: 'MON', value: 1 },
                    { label: 'TUE', value: 2 },
                    { label: 'WED', value: 3 },
                    { label: 'THU', value: 4 },
                    { label: 'FRI', value: 5 },
                    { label: 'SAT', value: 6 },
                    { label: 'SUN', value: 0 },
                  ].map(d => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setEditingChore({ ...editingChore, reminder_day: d.value })}
                      className={`px-3 py-2 font-mono text-xs font-bold border-2 border-brutal-black transition-all ${
                        editingChore.reminder_day === d.value
                          ? 'bg-brutal-black text-brutal-white'
                          : 'bg-brutal-white text-brutal-black active:bg-brutal-black/10'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {editingChore.reminder_day !== null && (
                  <div className="flex items-center gap-2 mt-2">
                    <Bell size={14} className="text-brutal-black/50" />
                    <input
                      type="time"
                      value={editingChore.reminder_time ?? '09:00'}
                      onChange={e => setEditingChore({ ...editingChore, reminder_time: e.target.value })}
                      className="flex-1 h-10 border-2 border-brutal-black px-3 font-mono text-sm bg-brutal-white"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="font-mono text-xs font-bold uppercase block mb-1">ASSIGN TO</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingChore({ ...editingChore, assigned_to: null })}
                    className={`px-3 py-2 font-mono text-xs font-bold border-2 border-brutal-black transition-all ${
                      !editingChore.assigned_to ? 'bg-brutal-black text-brutal-white' : 'bg-brutal-white'
                    }`}
                  >
                    ANYONE
                  </button>
                  {members.map(m => (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => setEditingChore({ ...editingChore, assigned_to: editingChore.assigned_to === m.user_id ? null : m.user_id })}
                      className={`flex items-center gap-1.5 px-3 py-2 font-mono text-xs font-bold border-2 border-brutal-black transition-all ${
                        editingChore.assigned_to === m.user_id ? 'bg-brutal-orange text-brutal-white' : 'bg-brutal-white'
                      }`}
                    >
                      <Avatar name={m.profiles.display_name} color={m.profiles.avatar_color} size="sm" imageUrl={m.profiles.avatar_url} />
                      {m.profiles.display_name}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={async () => {
                  await editChore.mutateAsync({
                    choreId: editingChore.id,
                    updates: {
                      name: editingChore.name.trim(),
                      points: editingChore.points,
                      area: editingChore.area,
                      reminder_day: editingChore.reminder_day,
                      reminder_time: editingChore.reminder_day !== null ? (editingChore.reminder_time ?? '09:00') : null,
                      assigned_to: editingChore.assigned_to,
                    },
                  })
                  toast('Chore updated!', 'bg-brutal-lime')
                  setEditingChore(null)
                }}
                disabled={editChore.isPending || !editingChore.name.trim()}
                className="w-full h-12 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all disabled:opacity-40"
              >
                {editChore.isPending ? 'SAVING...' : 'SAVE CHANGES'}
              </Button>
              <button
                onClick={() => {
                  setEditingChore(null)
                  handleDelete(editingChore.id)
                }}
                className="w-full mt-2 font-mono text-xs font-bold text-brutal-pink py-2 active:text-brutal-pink/60"
              >
                DELETE CHORE
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmDelete}
        title="DELETE CHORE"
        message="Are you sure? This can't be undone."
        confirmLabel="DELETE"
        confirmColor="bg-brutal-pink"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Completion overlay */}
      {completionOverlay && (
        <CompletionOverlay
          points={completionOverlay.points}
          totalPoints={completionOverlay.totalPoints}
          choreName={completionOverlay.choreName}
          onDone={() => { setCompletionOverlay(null); advanceTour('chore-complete') }}
        />
      )}

      {/* Just do one mode */}
      {justDoOne && (() => {
        const persistent = chores.filter(c => c.is_persistent)
        if (persistent.length === 0) return null
        const chore = persistent[justDoOneIndex % persistent.length]
        return (
          <div className="fixed inset-0 z-50 bg-brutal-yellow flex flex-col items-center justify-center p-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <button
              onClick={() => setJustDoOne(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-brutal-black text-brutal-white flex items-center justify-center font-bold" style={{ marginTop: 'env(safe-area-inset-top)' }}
            >
              <X size={20} />
            </button>

            <p className="font-mono text-xs font-bold text-brutal-black/40 tracking-widest mb-4">JUST DO ONE</p>
            <div className="bg-brutal-white border-4 border-brutal-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 w-full max-w-sm text-center">
              {chore.area && (
                <p className="font-mono text-[10px] text-brutal-black/40 font-bold tracking-widest mb-2">{chore.area.toUpperCase()}</p>
              )}
              <h2 className="font-mono font-bold text-2xl mb-2">{chore.name}</h2>
              <div className="inline-flex items-center gap-1 border border-brutal-black px-3 py-1 font-mono text-sm font-bold bg-brutal-yellow">
                {chore.points} PTS
              </div>
            </div>

            <div className="flex gap-3 mt-8 w-full max-w-sm">
              <button
                onClick={() => {
                  setJustDoOneIndex((justDoOneIndex + 1) % persistent.length)
                }}
                className="flex-1 h-14 bg-brutal-white font-mono font-bold uppercase text-sm border-3 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
              >
                SKIP
              </button>
              <button
                onClick={async () => {
                  await completeChore.mutateAsync({ choreId: chore.id, points: chore.points })
                  playComplete()
                  toast(`Done! +${chore.points} pts for ${chore.name}`, 'bg-brutal-lime')
                  const remaining = persistent.filter(c => c.id !== chore.id)
                  if (remaining.length === 0) {
                    setJustDoOne(false)
                  } else {
                    setJustDoOneIndex(Math.floor(Math.random() * persistent.length))
                  }
                }}
                className="flex-1 h-14 bg-brutal-lime font-mono font-bold uppercase text-sm border-3 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
              >
                DONE ✓
              </button>
            </div>

            <p className="font-mono text-[10px] text-brutal-black/30 mt-4">Just this one. You've got this.</p>
          </div>
        )
      })()}
    </div>
  )
}

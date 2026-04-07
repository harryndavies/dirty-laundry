import { useState, useRef } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { useGroup } from '@/context/GroupContext'
import { useChores } from '@/lib/hooks/useChores'
import { useGroupStats } from '@/lib/hooks/useGroupStats'
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
import { Plus, Minus, RotateCw, Zap, Dices, TrendingUp, Bell, Search, Target, Camera, X } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'

type Filter = 'all' | 'persistent' | 'one-time'

const AREAS = ['Kitchen', 'Bathroom', 'Bedroom', 'Living Room', 'Garden', 'Laundry', 'General']

export function ChoresPage() {
  const { group, members, loading: groupLoading } = useGroup()
  const { user } = useAuth()
  const { chores, loading, addChore, completeChore, deleteChore, boostChore } = useChores()
  const { suggestions } = useFairTurn()
  const groupStats = useGroupStats()
  const { balances, formatMoney } = usePocketMoney()
  const userMember = members.find(m => m.user_id === user?.id)
  const isKid = userMember?.role === 'kid'
  const myBalance = user ? balances.get(user.id) : null
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newPoints, setNewPoints] = useState(10)
  const [newPersistent, setNewPersistent] = useState(true)
  const [newReminderDay, setNewReminderDay] = useState<number | null>(null)
  const [newReminderTime, setNewReminderTime] = useState('09:00')
  const [newArea, setNewArea] = useState<string | null>(null)

  // Confirm dialog state
  const [confirmComplete, setConfirmComplete] = useState<{ id: string; points: number; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [withUserId, setWithUserId] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

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

  const filtered = chores.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'persistent') return c.is_persistent
    if (filter === 'one-time') return !c.is_persistent
    return true
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
    })
    playComplete()
    const partner = withUserId ? members.find(m => m.user_id === withUserId) : null
    if (partner) {
      toast(`Done! +${result.earnedPoints} pts each for you and ${partner.profiles.display_name}`, 'bg-brutal-lime')
    } else if (result.earnedPoints < confirmComplete.points) {
      toast(`Done! +${result.earnedPoints} pts (you boosted this one, no bonus for you)`, 'bg-brutal-yellow')
    } else {
      toast(`Done! +${result.earnedPoints} pts for ${confirmComplete.name}`, 'bg-brutal-lime')
    }
    setConfirmComplete(null)
    setWithUserId(null)
    setPhoto(null)
    setPhotoPreview(null)
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

  function onTouchEnd(choreId: string, points: number, name: string, createdBy: string) {
    const offset = swipeOffsetRef.current
    if (offset > 80) {
      handleComplete(choreId, points, name)
    } else if (offset < -80 && createdBy === user?.id) {
      handleDelete(choreId)
    }
    swipingIdRef.current = null
    swipeOffsetRef.current = 0
    setSwipingId(null)
    setSwipeOffset(0)
  }

  const filters: { label: string; value: Filter }[] = [
    { label: 'ALL', value: 'all' },
    { label: 'RECURRING', value: 'persistent' },
    { label: 'ONE-TIME', value: 'one-time' },
  ]

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-brutal-white border-b-4 border-brutal-black px-4 py-3 flex items-center justify-between">
        <h1 className="font-mono font-bold text-lg tracking-tight">{group.name}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/roulette')}
            className="w-11 h-11 bg-brutal-pink text-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
          >
            <Dices size={20} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="w-11 h-11 bg-brutal-blue text-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
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

      {/* Weekly goal banner */}
      {groupStats.weeklyGoal && (
        <div className="px-4 pt-3">
          <div className="border-2 border-brutal-black/20 px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-brutal-blue" />
              <span className="font-mono text-xs font-bold">
                {groupStats.weeklyPoints}/{groupStats.weeklyGoal}
              </span>
              <span className="font-mono text-[10px] text-brutal-black/40">GOAL</span>
            </div>
            <div className="h-1.5 bg-brutal-black/10">
              <div
                className={`h-full transition-all duration-500 ${groupStats.weeklyPoints >= groupStats.weeklyGoal ? 'bg-brutal-lime' : 'bg-brutal-blue'}`}
                style={{ width: `${Math.min(100, (groupStats.weeklyPoints / groupStats.weeklyGoal) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`font-mono text-xs font-bold px-4 py-2 border-2 border-brutal-black whitespace-nowrap transition-all ${
              filter === f.value
                ? 'bg-brutal-black text-brutal-white'
                : 'bg-brutal-white text-brutal-black active:bg-brutal-black/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center border-2 border-brutal-black bg-brutal-white h-10">
          <Search size={14} className="ml-3 text-brutal-black/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chores..."
            className="flex-1 h-full px-2 font-mono text-xs bg-transparent outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="px-3 font-mono text-xs text-brutal-black/40 font-bold">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Chore list */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="py-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🧹</div>
            <p className="font-mono font-bold text-brutal-black/40 text-sm">NO CHORES YET</p>
            <p className="font-mono text-brutal-black/30 text-xs mt-1">Tap + to add one</p>
          </div>
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
                  <div className="font-mono font-bold text-[11px] text-brutal-black/40 tracking-widest mb-2 px-1 sticky top-[60px] bg-brutal-white py-1 z-[5]">
                    {area.toUpperCase()}
                  </div>
                )}
                <div className="space-y-3">
          {areaChores.map(chore => {
            const isSwiping = swipingId === chore.id
            const offset = isSwiping ? swipeOffset : 0
            const showDone = offset > 40
            const showDelete = offset < -40 && chore.created_by === user?.id

            return (
              <div key={chore.id} className="relative overflow-hidden">
                {/* Swipe backgrounds */}
                <div className="absolute inset-0 flex">
                  <div className={`flex-1 bg-brutal-lime flex items-center px-4 font-mono font-bold text-sm transition-opacity ${showDone ? 'opacity-100' : 'opacity-0'}`}>
                    DONE ✓
                  </div>
                  <div className={`flex-1 bg-brutal-pink flex items-center justify-end px-4 font-mono font-bold text-sm text-brutal-white transition-opacity ${showDelete ? 'opacity-100' : 'opacity-0'}`}>
                    DELETE ✕
                  </div>
                </div>

                <div
                  className="relative bg-brutal-white border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex items-center gap-3 touch-pan-y"
                  style={{ transform: isSwiping ? `translateX(${offset}px)` : 'translateX(0)', transition: isSwiping ? 'none' : 'transform 0.2s' }}
                  onTouchStart={e => onTouchStart(e, chore.id)}
                  onTouchMove={onTouchMove}
                  onTouchEnd={() => onTouchEnd(chore.id, chore.points, chore.name, chore.created_by)}
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] font-bold border bg-brutal-yellow/20 border-brutal-yellow text-brutal-black/60">
                          <Bell size={10} /> {['SUN','MON','TUE','WED','THU','FRI','SAT'][chore.reminder_day]} {chore.reminder_time?.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    {chore.is_persistent && suggestions.get(chore.id) && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div
                          className="w-4 h-4 border border-brutal-black flex items-center justify-center font-mono text-[8px] font-bold text-white shrink-0"
                          style={{ background: suggestions.get(chore.id)!.avatar_color }}
                        >
                          {suggestions.get(chore.id)!.display_name[0]}
                        </div>
                        <span className="font-mono text-[10px] text-brutal-black/50">
                          {suggestions.get(chore.id)!.display_name}'s turn
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleComplete(chore.id, chore.points, chore.name)}
                    className="w-12 h-12 bg-brutal-lime border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-mono font-bold text-sm active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
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
                      <Avatar name={m.profiles.display_name} color={m.profiles.avatar_color} size="sm" />
                      {m.profiles.display_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Photo proof */}
            <div className="mb-4">
              <p className="font-mono text-[10px] font-bold text-brutal-black/40 tracking-widest mb-2">PHOTO PROOF (OPTIONAL)</p>
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Proof" className="w-full h-32 object-cover border-2 border-brutal-black" />
                  <button
                    onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                    className="absolute top-1 right-1 w-6 h-6 bg-brutal-black text-brutal-white flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-12 border-2 border-dashed border-brutal-black/30 bg-brutal-white font-mono text-xs font-bold text-brutal-black/40 active:bg-brutal-black/5 cursor-pointer">
                  <Camera size={16} /> ADD PHOTO
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setPhoto(file)
                        setPhotoPreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                </label>
              )}
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

      <ConfirmDialog
        open={!!confirmDelete}
        title="DELETE CHORE"
        message="Are you sure? This can't be undone."
        confirmLabel="DELETE"
        confirmColor="bg-brutal-pink"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}

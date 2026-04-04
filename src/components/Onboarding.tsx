import { useState } from 'react'
import { useGroup } from '@/context/GroupContext'
import { useChores } from '@/lib/hooks/useChores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/Toast'
import { Plus, Minus, Copy, ArrowRight } from 'lucide-react'

const SUGGESTED_CHORES = [
  { name: 'Do the dishes', points: 15 },
  { name: 'Hoover the flat', points: 20 },
  { name: 'Clean the bathroom', points: 30 },
  { name: 'Take the bins out', points: 10 },
  { name: 'Do the laundry', points: 20 },
  { name: 'Wipe the kitchen', points: 10 },
  { name: 'Cook dinner', points: 25 },
  { name: 'Grocery shopping', points: 20 },
]

type Step = 'welcome' | 'group' | 'chores' | 'invite' | 'done'

export function Onboarding() {
  const { group, createGroup, joinGroup } = useGroup()
  const { addChore } = useChores()

  const [step, setStep] = useState<Step>('welcome')
  const [mode, setMode] = useState<'create' | 'join' | null>(null)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Custom chore input
  const [customName, setCustomName] = useState('')
  const [customPoints, setCustomPoints] = useState(10)
  const [addedChores, setAddedChores] = useState<string[]>([])

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!groupName.trim()) return
    setLoading(true)
    setError('')
    await createGroup(groupName.trim())
    setLoading(false)
    setStep('chores')
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setLoading(true)
    setError('')
    const { error } = await joinGroup(inviteCode.trim())
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      setLoading(false)
      setStep('done')
    }
  }

  async function handleAddChore(name: string, points: number) {
    if (addedChores.includes(name)) return
    await addChore.mutateAsync({ name, points, isPersistent: true })
    setAddedChores(prev => [...prev, name])
    toast(`${name} added!`, 'bg-brutal-lime')
  }

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault()
    if (!customName.trim()) return
    await handleAddChore(customName.trim(), customPoints)
    setCustomName('')
    setCustomPoints(10)
  }

  function copyCode() {
    if (!group) return
    navigator.clipboard.writeText(group.invite_code)
    toast('Code copied!', 'bg-brutal-lime')
  }

  // WELCOME
  if (step === 'welcome') {
    return (
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="text-6xl">🧺</div>
          <h1 className="font-mono font-bold text-3xl tracking-tight">DIRTY LAUNDRY</h1>
          <p className="font-mono text-xs text-brutal-black/60 leading-relaxed max-w-xs mx-auto">
            Time to settle who actually does the housework.
            We'll get you set up in 60 seconds.
          </p>
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => { setMode('create'); setStep('group') }}
              className="w-full h-14 bg-brutal-lime font-mono font-bold uppercase text-sm border-3 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
            >
              START A NEW GROUP
            </Button>
            <Button
              onClick={() => { setMode('join'); setStep('group') }}
              className="w-full h-14 bg-brutal-blue text-brutal-white font-mono font-bold uppercase text-sm border-3 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
            >
              I HAVE AN INVITE CODE
            </Button>
          </div>
          <div className="flex justify-center gap-2 pt-4">
            {['welcome', 'group', 'chores', 'invite'].map((s, i) => (
              <div key={s} className={`w-2 h-2 border border-brutal-black ${i === 0 ? 'bg-brutal-black' : 'bg-brutal-white'}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // GROUP SETUP
  if (step === 'group') {
    return (
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-3">{mode === 'create' ? '🏠' : '🔑'}</div>
            <h2 className="font-mono font-bold text-xl">
              {mode === 'create' ? 'NAME YOUR GROUP' : 'ENTER YOUR CODE'}
            </h2>
            <p className="font-mono text-xs text-brutal-black/60 mt-1">
              {mode === 'create' ? 'This is your household. Name it something good.' : 'Paste the code you were given.'}
            </p>
          </div>

          {error && (
            <div className="bg-brutal-pink/20 border-2 border-brutal-pink p-3 font-mono text-xs font-bold">{error}</div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <Input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. Our Flat, The Household"
                className="border-3 border-brutal-black font-mono h-14 text-center text-lg"
                autoFocus
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-3 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
              >
                {loading ? 'CREATING...' : 'CREATE GROUP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoinGroup} className="space-y-4">
              <Input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                maxLength={8}
                className="border-3 border-brutal-black font-mono h-14 text-center text-2xl tracking-[0.3em]"
                autoFocus
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-brutal-blue text-brutal-white font-mono font-bold uppercase text-sm border-3 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
              >
                {loading ? 'JOINING...' : 'JOIN GROUP'}
              </Button>
            </form>
          )}

          <button
            onClick={() => { setStep('welcome'); setMode(null); setError('') }}
            className="w-full font-mono text-xs text-brutal-black/40 font-bold py-2 active:text-brutal-black/60"
          >
            ← BACK
          </button>

          <div className="flex justify-center gap-2">
            {['welcome', 'group', 'chores', 'invite'].map((s, i) => (
              <div key={s} className={`w-2 h-2 border border-brutal-black ${i === 1 ? 'bg-brutal-black' : 'bg-brutal-white'}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ADD CHORES
  if (step === 'chores') {
    return (
      <div className="min-h-full p-4">
        <div className="max-w-sm mx-auto space-y-5">
          <div className="text-center pt-4">
            <div className="text-4xl mb-3">🧹</div>
            <h2 className="font-mono font-bold text-xl">ADD SOME CHORES</h2>
            <p className="font-mono text-xs text-brutal-black/60 mt-1">
              Tap to add, or create your own. You can always add more later.
            </p>
          </div>

          {/* Suggested chores */}
          <div className="space-y-2">
            <p className="font-mono text-[10px] font-bold text-brutal-black/40 tracking-widest">SUGGESTIONS</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_CHORES.map(c => {
                const isAdded = addedChores.includes(c.name)
                return (
                  <button
                    key={c.name}
                    onClick={() => handleAddChore(c.name, c.points)}
                    disabled={isAdded}
                    className={`p-3 border-2 border-brutal-black text-left font-mono transition-all ${
                      isAdded
                        ? 'bg-brutal-lime/30 opacity-60'
                        : 'bg-brutal-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]'
                    }`}
                  >
                    <span className="text-xs font-bold block">{c.name}</span>
                    <span className="text-[10px] text-brutal-black/50">{c.points} pts</span>
                    {isAdded && <span className="text-[10px] text-brutal-lime font-bold ml-1">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom chore */}
          <div className="border-2 border-brutal-black p-3 bg-brutal-yellow/20">
            <p className="font-mono text-[10px] font-bold text-brutal-black/40 tracking-widest mb-2">ADD YOUR OWN</p>
            <form onSubmit={handleAddCustom} className="flex gap-2">
              <Input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Chore name"
                className="border-2 border-brutal-black font-mono h-10 text-xs flex-1"
              />
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setCustomPoints(Math.max(5, customPoints - 5))} className="w-8 h-10 border-2 border-brutal-black bg-brutal-white flex items-center justify-center">
                  <Minus size={12} />
                </button>
                <span className="font-mono font-bold text-xs w-8 text-center">{customPoints}</span>
                <button type="button" onClick={() => setCustomPoints(customPoints + 5)} className="w-8 h-10 border-2 border-brutal-black bg-brutal-white flex items-center justify-center">
                  <Plus size={12} />
                </button>
              </div>
              <button type="submit" className="w-10 h-10 bg-brutal-lime border-2 border-brutal-black flex items-center justify-center font-bold">+</button>
            </form>
          </div>

          {/* Continue */}
          <Button
            onClick={() => setStep('invite')}
            className="w-full h-14 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-3 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all flex items-center justify-center gap-2"
          >
            {addedChores.length === 0 ? 'SKIP FOR NOW' : `NEXT (${addedChores.length} ADDED)`}
            <ArrowRight size={16} />
          </Button>

          <div className="flex justify-center gap-2">
            {['welcome', 'group', 'chores', 'invite'].map((s, i) => (
              <div key={s} className={`w-2 h-2 border border-brutal-black ${i === 2 ? 'bg-brutal-black' : 'bg-brutal-white'}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // INVITE
  if (step === 'invite') {
    return (
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="text-4xl">📨</div>
          <h2 className="font-mono font-bold text-xl">INVITE YOUR PEOPLE</h2>
          <p className="font-mono text-xs text-brutal-black/60 leading-relaxed">
            Share this code with whoever you want to hold accountable.
          </p>

          {group && (
            <div className="bg-brutal-yellow border-3 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5">
              <p className="font-mono text-[10px] text-brutal-black/50 font-bold mb-2">YOUR INVITE CODE</p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono font-bold text-3xl tracking-[0.3em]">{group.invite_code}</span>
                <button
                  onClick={copyCode}
                  className="w-10 h-10 bg-brutal-white border-2 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          )}

          <Button
            onClick={() => setStep('done')}
            className="w-full h-14 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-3 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
          >
            I'M DONE — LET'S GO
          </Button>

          <button
            onClick={() => setStep('done')}
            className="font-mono text-xs text-brutal-black/40 font-bold py-2 active:text-brutal-black/60"
          >
            SKIP — I'LL DO THIS LATER
          </button>

          <div className="flex justify-center gap-2">
            {['welcome', 'group', 'chores', 'invite'].map((s, i) => (
              <div key={s} className={`w-2 h-2 border border-brutal-black ${i === 3 ? 'bg-brutal-black' : 'bg-brutal-white'}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // DONE — this won't render because the parent will detect the group and show the app
  return null
}

import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useGroup } from '@/context/GroupContext'
import { Plant } from '@/components/Plant'
import { usePlantState, plantLabel, plantHint, type PlantMood } from '@/lib/hooks/usePlantState'
import { ArrowLeft, Pencil, Check } from 'lucide-react'

const NAME_KEY_PREFIX = 'dirtylaundry_plant_name_'
const DEFAULT_NAME = 'FERN'

const MOOD_BG: Record<PlantMood, string> = {
  flowering: 'bg-brutal-lime',
  thriving: 'bg-brutal-yellow',
  dry: 'bg-brutal-yellow/60',
  wilting: 'bg-brutal-blue/15',
  dying: 'bg-brutal-pink/20',
}

function formatHours(h: number | null): string {
  if (h === null) return 'NEVER'
  if (h < 1) return `${Math.round(h * 60)} MIN AGO`
  if (h < 24) return `${Math.round(h)}H AGO`
  return `${Math.round(h / 24)}D AGO`
}

export function PlantPage() {
  const { group } = useGroup()
  const { state } = usePlantState()
  const navigate = useNavigate()

  const nameKey = group ? `${NAME_KEY_PREFIX}${group.id}` : ''
  const [name, setName] = useState(DEFAULT_NAME)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(DEFAULT_NAME)

  useEffect(() => {
    if (!nameKey) return
    setName(localStorage.getItem(nameKey) || DEFAULT_NAME)
  }, [nameKey])

  if (!group) return <Navigate to="/group" replace />

  const saveName = () => {
    const trimmed = draft.trim().slice(0, 16).toUpperCase() || DEFAULT_NAME
    setName(trimmed)
    if (nameKey) localStorage.setItem(nameKey, trimmed)
    setEditing(false)
  }

  return (
    <div className="relative min-h-[calc(100dvh-9rem)] flex flex-col">
      <div
        aria-hidden
        className={`fixed inset-0 ${MOOD_BG[state.mood]} pointer-events-none transition-colors`}
        style={{ zIndex: -1 }}
      />
      <div className="sticky top-0 z-10 bg-brutal-black text-brutal-white border-b-4 border-brutal-black px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-brutal-white text-brutal-black border-2 border-brutal-white flex items-center justify-center active:opacity-70"
          aria-label="Back"
        >
          <ArrowLeft size={16} strokeWidth={3} />
        </button>
        <h1 className="font-mono font-bold text-lg tracking-tight">HOUSEPLANT</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pt-4 pb-4 px-4">
        <Plant mood={state.mood} size={220} />

        <div className="mt-6 flex items-center gap-2">
          {editing ? (
            <>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                maxLength={16}
                autoFocus
                className="border-2 border-brutal-black font-mono font-black text-3xl text-center bg-brutal-white w-44 h-12 uppercase"
              />
              <button
                onClick={saveName}
                className="w-12 h-12 bg-brutal-lime border-2 border-brutal-black flex items-center justify-center active:opacity-70"
              >
                <Check size={18} strokeWidth={3} />
              </button>
            </>
          ) : (
            <>
              <span className="font-mono font-black text-3xl tracking-tighter">{name}</span>
              <button
                onClick={() => { setDraft(name); setEditing(true) }}
                className="text-brutal-black/50 active:text-brutal-black"
                aria-label="Rename plant"
              >
                <Pencil size={14} />
              </button>
            </>
          )}
        </div>

        <div className="mt-2 px-4 py-1.5 bg-brutal-black text-brutal-white border-2 border-brutal-black font-mono font-bold text-xs tracking-widest">
          IS {plantLabel(state.mood)}
        </div>
        <p className="mt-3 font-mono text-sm text-brutal-black/70 max-w-xs text-center">
          {plantHint(state.mood)}
        </p>
      </div>

      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        <Stat label="LAST WATERED" value={formatHours(state.hoursSinceLast)} />
        <Stat label="TODAY" value={`${state.completionsToday}`} />
        <Stat label="48H" value={`${state.completionsLast48h}`} />
      </div>

      <div className="px-4 pb-8">
        <button
          onClick={() => navigate('/chores')}
          className="w-full bg-brutal-black text-brutal-white border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] py-4 font-mono font-bold text-base tracking-wider transition-all"
        >
          WATER {name} → DO A CHORE
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-brutal-black bg-brutal-white p-3 text-center">
      <div className="font-mono text-[9px] font-bold tracking-widest text-brutal-black/40">{label}</div>
      <div className="font-mono font-black text-lg mt-0.5">{value}</div>
    </div>
  )
}

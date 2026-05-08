import { useNavigate } from 'react-router-dom'
import { usePetState, petLabel, type PetMood } from '@/lib/hooks/usePetState'
import { Pet } from './Pet'

const TILE_BG: Record<PetMood, string> = {
  happy: 'bg-brutal-lime',
  content: 'bg-brutal-yellow',
  bored: 'bg-brutal-yellow/60',
  sad: 'bg-brutal-blue/15',
  filthy: 'bg-brutal-pink/20',
}

const SUB: Record<PetMood, string> = {
  happy: 'Buzzing — keep it up.',
  content: 'Cheerful, all good.',
  bored: 'Could use some action.',
  sad: 'Hasn\'t been fed in a while.',
  filthy: 'Disgusted. Do anything.',
}

export function PetTile() {
  const { state } = usePetState()
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/pet')}
      className={`w-full mx-4 mt-3 max-w-[calc(100%-2rem)] border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all ${TILE_BG[state.mood]} flex items-center gap-3 p-3 text-left`}
    >
      <div className="shrink-0">
        <Pet mood={state.mood} size={56} bob={false} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] tracking-widest font-bold text-brutal-black/50">
          YOUR PET IS
        </div>
        <div className="font-mono font-black text-xl tracking-tighter">
          {petLabel(state.mood)}
        </div>
        <div className="font-mono text-[11px] text-brutal-black/60 mt-0.5 truncate">
          {SUB[state.mood]}
        </div>
      </div>
      <span className="font-mono text-[10px] font-bold text-brutal-black/50 tracking-widest shrink-0">
        VIEW →
      </span>
    </button>
  )
}

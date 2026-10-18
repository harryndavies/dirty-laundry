import { useNavigate } from 'react-router-dom'
import { usePlantState, plantLabel, type PlantMood } from '@/lib/hooks/usePlantState'
import { Plant } from './Plant'

const TILE_BG: Record<PlantMood, string> = {
  flowering: 'bg-brutal-lime',
  thriving: 'bg-brutal-yellow',
  dry: 'bg-brutal-yellow/60',
  wilting: 'bg-brutal-blue/15',
  dying: 'bg-brutal-pink/20',
}

const SUB: Record<PlantMood, string> = {
  flowering: 'Lush — keep the rhythm.',
  thriving: 'Healthy and upright.',
  dry: 'Could use some water.',
  wilting: "It's been a while.",
  dying: 'Critical. Do anything.',
}

export function PlantTile() {
  const { state } = usePlantState()
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/plant')}
      className={`mx-4 mt-3 w-full max-w-[calc(100%-2rem)] border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ${TILE_BG[state.mood]} flex items-center gap-3 p-3 text-left`}
    >
      <div className="shrink-0">
        <Plant mood={state.mood} size={56} bob={false} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] font-bold tracking-widest text-brutal-black/50">
          HOUSEPLANT IS
        </div>
        <div className="font-mono text-xl font-black tracking-tighter">
          {plantLabel(state.mood)}
        </div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-brutal-black/60">
          {SUB[state.mood]}
        </div>
      </div>
      <span className="shrink-0 font-mono text-[10px] font-bold tracking-widest text-brutal-black/50">
        VIEW →
      </span>
    </button>
  )
}

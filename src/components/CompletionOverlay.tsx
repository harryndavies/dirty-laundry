import { useEffect, useState } from 'react'

interface CompletionOverlayProps {
  points: number
  totalPoints: number
  choreName: string
  onDone: () => void
}

export function CompletionOverlay({ points, totalPoints, choreName, onDone }: CompletionOverlayProps) {
  const previousTotal = totalPoints - points
  const [displayTotal, setDisplayTotal] = useState(previousTotal)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Count up from previous total to new total
    const duration = 800
    const steps = 30
    const increment = points / steps
    let step = 0

    const interval = setInterval(() => {
      step++
      const current = Math.min(previousTotal + Math.round(increment * step), totalPoints)
      setDisplayTotal(current)
      if (step >= steps) {
        clearInterval(interval)
        // Auto dismiss
        setTimeout(() => {
          setFadeOut(true)
          setTimeout(onDone, 300)
        }, 1500)
      }
    }, duration / steps)

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50)

    return () => clearInterval(interval)
  }, [points, totalPoints, previousTotal, onDone])

  return (
    <div
      className={`fixed inset-0 z-[100] bg-brutal-lime flex flex-col items-center justify-center transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      onClick={() => { setFadeOut(true); setTimeout(onDone, 300) }}
    >
      <p className="font-mono text-xs font-bold text-brutal-black/40 tracking-widest mb-2">
        COMPLETED
      </p>
      <h2 className="font-mono font-bold text-xl text-brutal-black mb-10 px-8 text-center">
        {choreName}
      </h2>

      <p className="font-mono font-bold text-7xl text-brutal-black">
        {displayTotal}
      </p>
      <p className="font-mono text-sm font-bold text-brutal-black/40 mt-1">TOTAL POINTS</p>

      <div className="mt-4 bg-brutal-black px-4 py-2">
        <span className="font-mono font-bold text-lg text-brutal-lime">+{points}</span>
      </div>

      <p className="absolute bottom-12 font-mono text-[10px] text-brutal-black/30">
        TAP TO DISMISS
      </p>
    </div>
  )
}

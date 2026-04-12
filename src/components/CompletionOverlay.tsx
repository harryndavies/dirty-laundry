import { useEffect, useState } from 'react'

interface CompletionOverlayProps {
  points: number
  totalPoints: number
  choreName: string
  onDone: () => void
}

export function CompletionOverlay({ points, totalPoints, choreName, onDone }: CompletionOverlayProps) {
  const [countedPoints, setCountedPoints] = useState(0)
  const [showTotal, setShowTotal] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Count up the points earned
    const duration = 600
    const steps = 20
    const increment = points / steps
    let current = 0
    let step = 0

    const interval = setInterval(() => {
      step++
      current = Math.min(Math.round(increment * step), points)
      setCountedPoints(current)
      if (step >= steps) {
        clearInterval(interval)
        // Show total after a brief pause
        setTimeout(() => setShowTotal(true), 300)
        // Auto dismiss
        setTimeout(() => {
          setFadeOut(true)
          setTimeout(onDone, 300)
        }, 2000)
      }
    }, duration / steps)

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50)

    return () => clearInterval(interval)
  }, [points, onDone])

  return (
    <div
      className={`fixed inset-0 z-[100] bg-brutal-lime flex flex-col items-center justify-center transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      onClick={() => { setFadeOut(true); setTimeout(onDone, 300) }}
    >
      <p className="font-mono text-xs font-bold text-brutal-black/40 tracking-widest mb-2">
        COMPLETED
      </p>
      <h2 className="font-mono font-bold text-xl text-brutal-black mb-8 px-8 text-center">
        {choreName}
      </h2>

      <div className="bg-brutal-black w-32 h-32 flex items-center justify-center mb-4">
        <span className="font-mono font-bold text-5xl text-brutal-lime">
          +{countedPoints}
        </span>
      </div>
      <p className="font-mono text-sm font-bold text-brutal-black/60">POINTS</p>

      {showTotal && (
        <div className="mt-8 animate-in fade-in duration-300">
          <p className="font-mono text-[10px] text-brutal-black/40 tracking-widest text-center mb-1">
            TOTAL
          </p>
          <p className="font-mono font-bold text-3xl text-brutal-black text-center">
            {totalPoints}
          </p>
        </div>
      )}

      <p className="absolute bottom-12 font-mono text-[10px] text-brutal-black/30">
        TAP TO DISMISS
      </p>
    </div>
  )
}

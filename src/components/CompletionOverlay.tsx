import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CompletionOverlayProps {
  points: number
  totalPoints: number
  choreName: string
  onDone: () => void
}

export function CompletionOverlay({ points, totalPoints, choreName, onDone }: CompletionOverlayProps) {
  const previousTotal = totalPoints - points
  const [displayTotal, setDisplayTotal] = useState(previousTotal)
  const [showBadge, setShowBadge] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Count up from previous total to new total
    const duration = 800
    const steps = 30
    const increment = points / steps
    let step = 0

    // Small delay before counting starts
    const startDelay = setTimeout(() => {
      const interval = setInterval(() => {
        step++
        const current = Math.min(previousTotal + Math.round(increment * step), totalPoints)
        setDisplayTotal(current)
        if (step >= steps) {
          clearInterval(interval)
          setTimeout(() => setShowBadge(true), 200)
        }
      }, duration / steps)

      return () => clearInterval(interval)
    }, 400)

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50)

    return () => clearTimeout(startDelay)
  }, [points, totalPoints, previousTotal, onDone])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '-20%', scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] bg-brutal-lime flex flex-col items-center justify-center"
          onClick={() => { setVisible(false); setTimeout(onDone, 400) }}
        >
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => { setVisible(false); setTimeout(onDone, 400) }}
            className="absolute top-4 right-4 w-10 h-10 bg-brutal-black text-brutal-white flex items-center justify-center font-mono font-bold text-lg"
            style={{ marginTop: 'env(safe-area-inset-top)' }}
          >
            ✕
          </motion.button>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-mono text-xs font-bold text-brutal-black/40 tracking-widest mb-2"
          >
            COMPLETED
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-mono font-bold text-xl text-brutal-black mb-10 px-8 text-center"
          >
            {choreName}
          </motion.h2>

          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', damping: 12, stiffness: 200 }}
            className="font-mono font-bold text-7xl text-brutal-black"
          >
            {displayTotal}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.5 }}
            className="font-mono text-sm font-bold text-brutal-black mt-1"
          >
            TOTAL POINTS
          </motion.p>

          <AnimatePresence>
            {showBadge && (
              <motion.div
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 10, stiffness: 300 }}
                className="mt-4 bg-brutal-black px-5 py-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
              >
                <span className="font-mono font-bold text-xl text-brutal-lime">+{points}</span>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </AnimatePresence>
  )
}

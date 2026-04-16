import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'

interface TourStep {
  target: string | null // data-tour attribute value, null = no spotlight
  title: string
  description: string
  color: string
}

const STEPS: TourStep[] = [
  {
    target: null,
    title: 'WELCOME TO DIRTY LAUNDRY',
    description: 'Your group chore tracker. Complete chores, earn points, and climb the leaderboard. Let\u2019s show you around!',
    color: 'bg-brutal-yellow',
  },
  {
    target: 'chore-complete',
    title: 'COMPLETE CHORES',
    description: 'Tap the green tick to mark a chore as done and earn points. You can even add before & after photos!',
    color: 'bg-brutal-lime',
  },
  {
    target: 'chore-add',
    title: 'ADD CHORES',
    description: 'Tap here to create new chores. Set points, pick an area, and add reminders.',
    color: 'bg-brutal-blue',
  },
  {
    target: 'header-actions',
    title: 'QUICK ACTIONS',
    description: 'Use Focus mode to tackle one chore at a time, or spin the Roulette to pick randomly.',
    color: 'bg-brutal-pink',
  },
  {
    target: 'bottom-nav',
    title: 'EXPLORE',
    description: 'Check the Scores tab for the leaderboard, Log for recent activity, and Group to invite housemates.',
    color: 'bg-brutal-orange',
  },
  {
    target: null,
    title: 'YOU\u2019RE ALL SET!',
    description: 'Time to get cleaning. Add some chores and start earning points!',
    color: 'bg-brutal-yellow',
  },
]

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

interface AppTourProps {
  active: boolean
  step: number
  onNext: () => void
  onPrev: () => void
  onFinish: () => void
  onDismiss: () => void
}

export function AppTour({ active, step, onNext, onPrev, onFinish, onDismiss }: AppTourProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null)

  const currentStep = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  const measureTarget = useCallback(() => {
    if (!currentStep?.target) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(`[data-tour="${currentStep.target}"]`)
    if (el) {
      const rect = el.getBoundingClientRect()
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    } else {
      setTargetRect(null)
    }
  }, [currentStep])

  useEffect(() => {
    if (!active) return
    measureTarget()
    window.addEventListener('resize', measureTarget)
    window.addEventListener('scroll', measureTarget, true)
    return () => {
      window.removeEventListener('resize', measureTarget)
      window.removeEventListener('scroll', measureTarget, true)
    }
  }, [active, step, measureTarget])

  if (!active || !currentStep) return null

  const padding = 6

  // Build clip path to create spotlight cutout
  function buildClipPath() {
    if (!targetRect) return undefined
    const t = targetRect.top - padding
    const l = targetRect.left - padding
    const w = targetRect.width + padding * 2
    const h = targetRect.height + padding * 2
    // Polygon with a rectangular hole
    return `polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
      ${l}px ${t}px,
      ${l}px ${t + h}px,
      ${l + w}px ${t + h}px,
      ${l + w}px ${t}px,
      ${l}px ${t}px
    )`
  }

  // Position tooltip relative to target
  function getTooltipStyle(): React.CSSProperties {
    const margin = 20
    const viewportH = window.innerHeight

    // No target — full-width centered card
    if (!targetRect) {
      return {
        top: '50%',
        left: margin,
        right: margin,
        transform: 'translateY(-50%)',
      }
    }

    const spaceBelow = viewportH - (targetRect.top + targetRect.height)
    const spaceAbove = targetRect.top

    // Anchored steps: stretch across the screen with margins
    const base: React.CSSProperties = {
      left: margin,
      right: margin,
    }

    if (spaceBelow > 180) {
      return {
        ...base,
        top: targetRect.top + targetRect.height + padding + 16,
      }
    } else if (spaceAbove > 180) {
      return {
        ...base,
        bottom: viewportH - targetRect.top + padding + 16,
      }
    }
    // Fallback: center vertically
    return {
      ...base,
      top: '50%',
      transform: 'translateY(-50%)',
    }
  }

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="tour-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100]"
        >
          {/* Backdrop with spotlight cutout */}
          <div
            className="absolute inset-0 bg-brutal-black/60"
            style={{
              clipPath: buildClipPath(),
            }}
            onClick={onDismiss}
          />

          {/* Spotlight border ring */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="absolute border-3 border-brutal-yellow pointer-events-none"
              style={{
                top: targetRect.top - padding,
                left: targetRect.left - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
                boxShadow: '0 0 0 3px rgba(0,0,0,1), 0 0 20px rgba(255,229,0,0.4)',
              }}
            />
          )}

          {/* Tooltip card */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[101]"
            style={getTooltipStyle()}
          >
            <div className={`${currentStep.color} border-3 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6`}>
              {/* Skip button */}
              <button
                onClick={onDismiss}
                className="absolute top-3 right-3 w-8 h-8 bg-brutal-black/10 flex items-center justify-center active:bg-brutal-black/20"
              >
                <X size={16} strokeWidth={3} />
              </button>

              <h3 className="font-mono font-bold text-lg mb-2 pr-8">{currentStep.title}</h3>
              <p className="font-mono text-sm leading-relaxed text-brutal-black/70 mb-5">
                {currentStep.description}
              </p>

              {/* Step indicator */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 border border-brutal-black transition-colors ${
                        i === step ? 'bg-brutal-black' : 'bg-brutal-black/20'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {!isFirst && (
                    <button
                      onClick={onPrev}
                      className="w-10 h-10 bg-brutal-white border-2 border-brutal-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    >
                      <ChevronLeft size={18} strokeWidth={3} />
                    </button>
                  )}
                  <button
                    onClick={isLast ? onFinish : onNext}
                    className="h-10 px-5 bg-brutal-black text-brutal-white border-2 border-brutal-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-mono font-bold text-sm active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all gap-1"
                  >
                    {isLast ? 'LET\u2019S GO' : 'NEXT'}
                    {!isLast && <ChevronRight size={16} strokeWidth={3} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

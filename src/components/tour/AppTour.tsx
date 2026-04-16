import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'

export interface TourStep {
  target: string | null   // data-tour attribute value, null = no spotlight
  title: string
  description: string
  color: string
  action: 'next' | 'tap' // 'next' = manual button, 'tap' = user taps the element
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: 'WELCOME TO DIRTY LAUNDRY',
    description: 'Your group chore tracker. Complete chores, earn points, and climb the leaderboard. Let\u2019s get you set up!',
    color: 'bg-brutal-yellow',
    action: 'next',
  },
  {
    target: 'chore-packs',
    title: 'PICK A STARTER PACK',
    description: 'Tap a pack below to add a set of chores for your household. You can always edit them later.',
    color: 'bg-brutal-lime',
    action: 'tap',
  },
  {
    target: 'chore-complete',
    title: 'COMPLETE A CHORE',
    description: 'Nice! Now tap the green tick on a chore to mark it as done and earn your first points.',
    color: 'bg-brutal-lime',
    action: 'tap',
  },
  {
    target: 'chore-add',
    title: 'ADD YOUR OWN',
    description: 'Tap the + button to create a custom chore. Set a name, points, area, and reminders.',
    color: 'bg-brutal-blue',
    action: 'tap',
  },
  {
    target: 'header-actions',
    title: 'QUICK ACTIONS',
    description: 'Use Focus mode to tackle one chore at a time, or spin the Roulette to pick a random one.',
    color: 'bg-brutal-pink',
    action: 'next',
  },
  {
    target: 'bottom-nav',
    title: 'EXPLORE THE APP',
    description: 'Check Scores for the leaderboard, Log for recent activity, and Group to invite your housemates.',
    color: 'bg-brutal-orange',
    action: 'next',
  },
  {
    target: null,
    title: 'YOU\u2019RE ALL SET!',
    description: 'You\u2019re ready to go. Get cleaning and start climbing the leaderboard!',
    color: 'bg-brutal-yellow',
    action: 'next',
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
  onTapTarget: () => void
}

export function AppTour({ active, step, onNext, onPrev, onFinish, onDismiss, onTapTarget }: AppTourProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null)

  const currentStep = TOUR_STEPS[step]
  const isFirst = step === 0
  const isLast = step === TOUR_STEPS.length - 1
  const isTapStep = currentStep?.action === 'tap'

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

    // Scroll target into view before measuring
    if (currentStep?.target) {
      const el = document.querySelector(`[data-tour="${currentStep.target}"]`)
      if (!el) {
        // If this is a tap step and the target doesn't exist, skip it
        if (currentStep.action === 'tap') {
          onNext()
          return
        }
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Re-measure after scroll settles
        const t = setTimeout(measureTarget, 400)
        // Also measure immediately for elements already in view
        measureTarget()
        window.addEventListener('resize', measureTarget)
        window.addEventListener('scroll', measureTarget, true)
        return () => {
          clearTimeout(t)
          window.removeEventListener('resize', measureTarget)
          window.removeEventListener('scroll', measureTarget, true)
        }
      }
    }

    measureTarget()
    window.addEventListener('resize', measureTarget)
    window.addEventListener('scroll', measureTarget, true)
    return () => {
      window.removeEventListener('resize', measureTarget)
      window.removeEventListener('scroll', measureTarget, true)
    }
  }, [active, step, measureTarget])

  if (!active || !currentStep) return null

  const padding = 8

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
            onClick={isTapStep ? undefined : onDismiss}
          />

          {/* Clickable spotlight area for tap steps — hides tour so user can interact */}
          {isTapStep && targetRect && (
            <div
              className="absolute cursor-pointer"
              style={{
                top: targetRect.top - padding,
                left: targetRect.left - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
              }}
              onClick={(e) => {
                onTapTarget()
                // Re-dispatch click to the element underneath after tour hides
                const x = e.clientX
                const y = e.clientY
                requestAnimationFrame(() => {
                  const el = document.elementFromPoint(x, y)
                  if (el instanceof HTMLElement) el.click()
                })
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

              {/* Step indicator + controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 border border-brutal-black transition-colors ${
                        i === step ? 'bg-brutal-black' : 'bg-brutal-black/20'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {!isFirst && !isTapStep && (
                    <button
                      onClick={onPrev}
                      className="w-10 h-10 bg-brutal-white border-2 border-brutal-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    >
                      <ChevronLeft size={18} strokeWidth={3} />
                    </button>
                  )}
                  {isTapStep ? (
                    <div className="h-10 px-4 flex items-center font-mono font-bold text-xs text-brutal-black/50 tracking-wide">
                      TAP TO CONTINUE
                    </div>
                  ) : (
                    <button
                      onClick={isLast ? onFinish : onNext}
                      className="h-10 px-5 bg-brutal-black text-brutal-white border-2 border-brutal-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-mono font-bold text-sm active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all gap-1"
                    >
                      {isLast ? 'LET\u2019S GO' : 'NEXT'}
                      {!isLast && <ChevronRight size={16} strokeWidth={3} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

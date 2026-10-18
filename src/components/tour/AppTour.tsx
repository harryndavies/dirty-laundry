import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'

import { TOUR_STEPS } from './steps'

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

export function AppTour({
  active,
  step,
  onNext,
  onPrev,
  onFinish,
  onDismiss,
  onTapTarget,
}: AppTourProps) {
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
        // Also measure on the next frame for elements already in view
        const frame = requestAnimationFrame(measureTarget)
        window.addEventListener('resize', measureTarget)
        window.addEventListener('scroll', measureTarget, true)
        return () => {
          clearTimeout(t)
          cancelAnimationFrame(frame)
          window.removeEventListener('resize', measureTarget)
          window.removeEventListener('scroll', measureTarget, true)
        }
      }
    }

    const frame = requestAnimationFrame(measureTarget)
    window.addEventListener('resize', measureTarget)
    window.addEventListener('scroll', measureTarget, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measureTarget)
      window.removeEventListener('scroll', measureTarget, true)
    }
  }, [active, currentStep, measureTarget, onNext])

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
            <div
              className={`${currentStep.color} border-3 border-brutal-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}
            >
              {/* Skip button */}
              <button
                onClick={onDismiss}
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center bg-brutal-black/10 active:bg-brutal-black/20"
              >
                <X size={16} strokeWidth={3} />
              </button>

              <h3 className="mb-2 pr-8 font-mono text-lg font-bold">{currentStep.title}</h3>
              <p className="mb-5 font-mono text-sm leading-relaxed text-brutal-black/70">
                {currentStep.description}
              </p>

              {/* Step indicator + controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2.5 w-2.5 border border-brutal-black transition-colors ${
                        i === step ? 'bg-brutal-black' : 'bg-brutal-black/20'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {!isFirst && !isTapStep && (
                    <button
                      onClick={onPrev}
                      className="flex h-10 w-10 items-center justify-center border-2 border-brutal-black bg-brutal-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                      <ChevronLeft size={18} strokeWidth={3} />
                    </button>
                  )}
                  {isTapStep ? (
                    <div className="flex h-10 items-center px-4 font-mono text-xs font-bold tracking-wide text-brutal-black/50">
                      TAP TO CONTINUE
                    </div>
                  ) : (
                    <button
                      onClick={isLast ? onFinish : onNext}
                      className="flex h-10 items-center justify-center gap-1 border-2 border-brutal-black bg-brutal-black px-5 font-mono text-sm font-bold text-brutal-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
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

import { useState, useCallback, useEffect } from 'react'
import { TOUR_STEPS } from '@/components/tour/steps'

const STORAGE_KEY = 'dirtylaundry_tour_completed'

export function useTour() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [waiting, setWaiting] = useState(false) // hidden while user completes a tap action

  const completed = localStorage.getItem(STORAGE_KEY) === 'true'

  const start = useCallback(() => {
    setStep(0)
    setWaiting(false)
    setActive(true)
  }, [])

  const finish = useCallback(() => {
    setActive(false)
    setStep(0)
    setWaiting(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const dismiss = useCallback(() => {
    setActive(false)
    setStep(0)
    setWaiting(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const next = useCallback(() => {
    setWaiting(false)
    setStep(s => s + 1)
  }, [])

  const prev = useCallback(() => {
    setStep(s => Math.max(0, s - 1))
  }, [])

  /** Called when user taps a highlighted element on a tap step — hides the tour while they interact */
  const beginWait = useCallback(() => {
    setWaiting(true)
  }, [])

  // Advance to next step when the current tap-step's target action completes.
  // Components dispatch 'tour-advance' with detail = step name to signal this.
  useEffect(() => {
    if (!active) return
    const handler = (e: Event) => {
      const target = (e as CustomEvent).detail as string
      const currentStep = TOUR_STEPS[step]
      if (currentStep?.action === 'tap' && currentStep?.target === target) {
        setWaiting(false)
        setStep(s => s + 1)
      }
    }
    window.addEventListener('tour-advance', handler)
    return () => window.removeEventListener('tour-advance', handler)
  }, [active, step])

  // The tour is visible when active and not waiting for user to complete an action
  const visible = active && !waiting

  return { active, visible, step, completed, start, finish, dismiss, next, prev, beginWait }
}

/** Call this from components to signal a tour tap-step was completed */
export function advanceTour(target: string) {
  window.dispatchEvent(new CustomEvent('tour-advance', { detail: target }))
}

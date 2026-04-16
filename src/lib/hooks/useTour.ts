import { useState, useCallback } from 'react'

const STORAGE_KEY = 'dirtylaundry_tour_completed'

export function useTour() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)

  const completed = localStorage.getItem(STORAGE_KEY) === 'true'

  const start = useCallback(() => {
    setStep(0)
    setActive(true)
  }, [])

  const finish = useCallback(() => {
    setActive(false)
    setStep(0)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const dismiss = useCallback(() => {
    setActive(false)
    setStep(0)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const next = useCallback(() => {
    setStep(s => s + 1)
  }, [])

  const prev = useCallback(() => {
    setStep(s => Math.max(0, s - 1))
  }, [])

  return { active, step, completed, start, finish, dismiss, next, prev }
}

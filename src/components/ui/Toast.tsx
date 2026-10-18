import { useEffect, useState } from 'react'

interface ToastMessage {
  id: number
  text: string
  color: string
}

let addToast: (text: string, color?: string) => void = () => {}

export function toast(text: string, color = 'bg-brutal-lime') {
  addToast(text, color)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    addToast = (text: string, color = 'bg-brutal-lime') => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, text, color }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 2500)
    }
  }, [])

  return (
    <div
      className="pointer-events-none fixed right-4 left-4 z-[100] flex flex-col gap-2"
      style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${t.color} animate-in border-2 border-brutal-black px-4 py-3 font-mono text-sm font-bold text-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] duration-200 slide-in-from-top`}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}

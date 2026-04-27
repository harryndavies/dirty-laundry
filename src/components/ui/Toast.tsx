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
      setToasts(prev => [...prev, { id, text, color }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 2500)
    }
  }, [])

  return (
    <div
      className="fixed left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={`${t.color} border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-4 py-3 font-mono font-bold text-sm text-brutal-black animate-in slide-in-from-top duration-200`}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}

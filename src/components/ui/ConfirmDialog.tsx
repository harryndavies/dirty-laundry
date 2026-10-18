import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmColor?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'CONFIRM',
  confirmColor = 'bg-brutal-lime',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brutal-black/40" onClick={onCancel} />
      <div
        ref={dialogRef}
        className="relative w-full max-w-xs border-4 border-brutal-black bg-brutal-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
      >
        <h3 className="mb-2 font-mono text-lg font-bold">{title}</h3>
        <p className="mb-5 font-mono text-sm text-brutal-black/70">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="h-11 flex-1 border-2 border-brutal-black bg-brutal-white font-mono text-xs font-bold uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className={`h-11 flex-1 ${confirmColor} border-2 border-brutal-black font-mono text-xs font-bold uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

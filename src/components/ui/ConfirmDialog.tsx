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
        className="relative bg-brutal-white border-4 border-brutal-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 w-full max-w-xs"
      >
        <h3 className="font-mono font-bold text-lg mb-2">{title}</h3>
        <p className="font-mono text-sm text-brutal-black/70 mb-5">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-11 bg-brutal-white border-2 border-brutal-black font-mono font-bold text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-11 ${confirmColor} border-2 border-brutal-black font-mono font-bold text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

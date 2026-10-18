import { useEffect, useRef, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      // Scroll to top and focus first input
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0
        }
      })
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] md:flex md:items-center md:justify-center">
      <div className="absolute inset-0 bg-brutal-black/40" onClick={onClose} />
      <div
        className="absolute right-0 bottom-0 left-0 flex flex-col border-t-4 border-brutal-black bg-brutal-white md:relative md:static md:w-full md:max-w-md md:border-4 md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        style={{ maxHeight: '85vh' }}
      >
        <div className="mx-auto mt-3 mb-2 h-1.5 w-12 shrink-0 rounded-full bg-brutal-black/30 md:hidden" />
        <div ref={contentRef} className="overflow-y-auto px-6 pb-36 md:pt-4 md:pb-6">
          {children}
        </div>
      </div>
    </div>
  )
}

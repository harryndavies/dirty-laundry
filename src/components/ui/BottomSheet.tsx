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
        className="absolute bottom-0 left-0 right-0 bg-brutal-white border-t-4 border-brutal-black flex flex-col md:static md:relative md:w-full md:max-w-md md:border-4 md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        style={{ maxHeight: '85vh' }}
      >
        <div className="w-12 h-1.5 bg-brutal-black/30 mx-auto mt-3 mb-2 rounded-full shrink-0 md:hidden" />
        <div ref={contentRef} className="overflow-y-auto px-6 pb-36 md:pb-6 md:pt-4">
          {children}
        </div>
      </div>
    </div>
  )
}

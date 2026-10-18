import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  // iOS Safari has no install event, so show manual instructions there.
  const [showIOSPrompt, setShowIOSPrompt] = useState(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return false
    if (localStorage.getItem('install-prompt-dismissed')) return false
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    return isIOS && isSafari
  })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if previously dismissed
    if (localStorage.getItem('install-prompt-dismissed')) return

    // Android/Chrome: capture the native install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setDismissed(true)
    setDeferredPrompt(null)
    setShowIOSPrompt(false)
    localStorage.setItem('install-prompt-dismissed', 'true')
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
    dismiss()
  }

  if (dismissed || (!deferredPrompt && !showIOSPrompt)) return null

  return (
    <div className="fixed right-3 bottom-20 left-3 z-[100] animate-in duration-300 slide-in-from-bottom">
      <div className="rounded-none border-4 border-brutal-black bg-brutal-white p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-bold text-brutal-black">Install Dirty Laundry</p>
            {deferredPrompt ? (
              <p className="mt-1 text-xs text-brutal-black/70">
                Add to your home screen for the full app experience.
              </p>
            ) : (
              <p className="mt-1 text-xs text-brutal-black/70">
                Tap the share button{' '}
                <span className="inline-block align-middle text-base leading-none">⎙</span> then
                "Add to Home Screen" to install.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            className="p-1 text-lg leading-none font-bold text-brutal-black/50 hover:text-brutal-black"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full border-2 border-brutal-black bg-brutal-black px-4 py-2 text-sm font-bold tracking-wide text-brutal-yellow uppercase transition-colors hover:bg-brutal-yellow hover:text-brutal-black"
          >
            Install App
          </button>
        )}
      </div>
    </div>
  )
}

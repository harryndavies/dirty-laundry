import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { toast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { isNativeIOS } from '@/lib/platform'
import { Coins, PiggyBank, CheckCircle, Star } from 'lucide-react'

const FEATURES = [
  {
    icon: Coins,
    label: 'Set a rate per point',
    description: 'Choose how much each point is worth in pocket money',
  },
  {
    icon: PiggyBank,
    label: 'Track kid balances',
    description: 'See how much each kid has earned from their chores',
  },
  {
    icon: CheckCircle,
    label: 'Mark payouts',
    description: "Record when you've paid out and keep a clear history",
  },
  {
    icon: Star,
    label: 'Savings goals',
    description: 'Kids can set goals and track their progress',
  },
]

interface ProPaywallProps {
  open: boolean
  onClose: () => void
  groupId: string
}

export function ProPaywall({ open, onClose, groupId }: ProPaywallProps) {
  const [loading, setLoading] = useState(false)

  async function handleUnlock() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { groupId },
      })
      if (error) throw error
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch {
      toast('Failed to start checkout. Try again.', 'bg-brutal-pink')
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="mb-5 text-center">
        <div className="mb-3 inline-flex h-14 w-14 items-center justify-center border-2 border-brutal-black bg-brutal-yellow">
          <Coins size={28} strokeWidth={2.5} />
        </div>
        <h2 className="font-mono text-xl font-bold">UNLOCK POCKET MONEY</h2>
        <p className="mt-1 font-mono text-xs text-brutal-black/50">
          Turn chores into real rewards for your kids
        </p>
      </div>

      <div className="mb-5 space-y-2">
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className="flex items-start gap-3 border-2 border-brutal-black bg-brutal-white p-3"
          >
            <f.icon size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-brutal-black/60" />
            <div>
              <span className="block font-mono text-xs font-bold">{f.label}</span>
              <span className="font-mono text-[10px] text-brutal-black/40">{f.description}</span>
            </div>
          </div>
        ))}
      </div>

      {isNativeIOS ? (
        <div className="w-full border-3 border-brutal-black bg-brutal-white p-4 text-center font-mono">
          <p className="mb-1 text-xs font-bold uppercase">UNLOCK ON THE WEB</p>
          <p className="text-[11px] leading-relaxed text-brutal-black/60">
            Visit dirtylaundry.club on any browser to unlock Pro for your group. Once unlocked, it
            works here too.
          </p>
        </div>
      ) : (
        <>
          <button
            onClick={handleUnlock}
            disabled={loading}
            className="h-14 w-full border-3 border-brutal-black bg-brutal-lime font-mono text-base font-bold uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[6px] active:translate-y-[6px] active:shadow-none disabled:opacity-50"
          >
            {loading ? 'REDIRECTING...' : 'UNLOCK NOW — £4.99'}
          </button>

          <p className="mt-3 text-center font-mono text-[10px] text-brutal-black/30">
            One-time purchase. No subscription. Works for your whole group.
          </p>
        </>
      )}
    </BottomSheet>
  )
}

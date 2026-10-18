import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { toast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { isNativeIOS } from '@/lib/platform'
import { Coins, PiggyBank, CheckCircle, Star } from 'lucide-react'

const FEATURES = [
  { icon: Coins, label: 'Set a rate per point', description: 'Choose how much each point is worth in pocket money' },
  { icon: PiggyBank, label: 'Track kid balances', description: 'See how much each kid has earned from their chores' },
  { icon: CheckCircle, label: 'Mark payouts', description: 'Record when you\'ve paid out and keep a clear history' },
  { icon: Star, label: 'Savings goals', description: 'Kids can set goals and track their progress' },
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
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-brutal-yellow border-2 border-brutal-black mb-3">
          <Coins size={28} strokeWidth={2.5} />
        </div>
        <h2 className="font-mono font-bold text-xl">UNLOCK POCKET MONEY</h2>
        <p className="font-mono text-xs text-brutal-black/50 mt-1">
          Turn chores into real rewards for your kids
        </p>
      </div>

      <div className="space-y-2 mb-5">
        {FEATURES.map(f => (
          <div key={f.label} className="flex items-start gap-3 p-3 border-2 border-brutal-black bg-brutal-white">
            <f.icon size={18} strokeWidth={2.5} className="text-brutal-black/60 shrink-0 mt-0.5" />
            <div>
              <span className="font-mono font-bold text-xs block">{f.label}</span>
              <span className="font-mono text-[10px] text-brutal-black/40">{f.description}</span>
            </div>
          </div>
        ))}
      </div>

      {isNativeIOS ? (
        <div className="w-full p-4 bg-brutal-white border-3 border-brutal-black font-mono text-center">
          <p className="font-bold text-xs uppercase mb-1">UNLOCK ON THE WEB</p>
          <p className="text-[11px] text-brutal-black/60 leading-relaxed">
            Visit dirtylaundry.club on any browser to unlock Pro for your group. Once unlocked, it works here too.
          </p>
        </div>
      ) : (
        <>
          <button
            onClick={handleUnlock}
            disabled={loading}
            className="w-full h-14 bg-brutal-lime font-mono font-bold uppercase text-base border-3 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all disabled:opacity-50"
          >
            {loading ? 'REDIRECTING...' : 'UNLOCK NOW — £4.99'}
          </button>

          <p className="font-mono text-[10px] text-brutal-black/30 text-center mt-3">
            One-time purchase. No subscription. Works for your whole group.
          </p>
        </>
      )}
    </BottomSheet>
  )
}

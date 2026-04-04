import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/Toast'
import { Check, Pencil } from 'lucide-react'

const COLORS = ['#FF2D9B', '#0066FF', '#FFE500', '#BFFF00', '#FF6B00', '#8B5CF6', '#06B6D4', '#EF4444']

export function ProfilePage() {
  const { user, profile, signOut, updateProfile } = useAuth()
  const { userMember, leaveGroup } = useGroup()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.display_name ?? '')

  async function handleSaveName() {
    if (!name.trim()) return
    await updateProfile({ display_name: name.trim() })
    setEditing(false)
    toast('Name updated!', 'bg-brutal-lime')
  }

  async function handleColorChange(color: string) {
    await updateProfile({ avatar_color: color })
    toast('Color updated!', 'bg-brutal-lime')
  }

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-brutal-white border-b-4 border-brutal-black px-4 py-3">
        <h1 className="font-mono font-bold text-lg tracking-tight">PROFILE</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Avatar + name */}
        <div className="flex flex-col items-center pt-4">
          <Avatar
            name={profile?.display_name ?? '?'}
            color={profile?.avatar_color ?? '#FF2D9B'}
            size="lg"
          />

          {editing ? (
            <div className="flex items-center gap-2 mt-4">
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                className="border-2 border-brutal-black font-mono h-10 w-48 text-center"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="w-10 h-10 bg-brutal-lime border-2 border-brutal-black flex items-center justify-center active:bg-brutal-lime/70 transition-colors"
              >
                <Check size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setName(profile?.display_name ?? ''); setEditing(true) }}
              className="flex items-center gap-2 mt-4 font-mono font-bold text-xl active:opacity-60 transition-opacity"
            >
              {profile?.display_name ?? '—'}
              <Pencil size={16} />
            </button>
          )}

          <p className="font-mono text-xs text-brutal-black/40 mt-1">{user?.email}</p>
        </div>

        {/* Color picker */}
        <div>
          <h3 className="font-mono text-xs font-bold uppercase mb-2">AVATAR COLOR</h3>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                className={`w-10 h-10 border-2 transition-all ${
                  c === profile?.avatar_color
                    ? 'border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] scale-110'
                    : 'border-brutal-black/30 active:scale-95'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="border-4 border-brutal-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5">
          <h3 className="font-mono text-xs font-bold uppercase mb-3">YOUR STATS</h3>
          <div className="flex gap-4">
            <div className="flex-1 bg-brutal-yellow border-2 border-brutal-black p-3 text-center">
              <div className="font-mono font-bold text-2xl">{userMember?.total_points ?? 0}</div>
              <div className="font-mono text-[10px] font-bold text-brutal-black/60">TOTAL PTS</div>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <Button
          onClick={async () => {
            leaveGroup()
            await signOut()
          }}
          className="w-full h-12 bg-red-500 text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
        >
          SIGN OUT
        </Button>
      </div>
    </div>
  )
}

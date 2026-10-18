import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'
import { useTheme } from '@/context/ThemeContext'
import { Avatar } from '@/components/ui/Avatar'
import { HeatMap } from '@/components/HeatMap'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/Toast'
import {
  Check,
  Pencil,
  Moon,
  Sun,
  Bell,
  BellOff,
  HelpCircle,
  Sparkles,
  Smartphone,
  TrendingUp,
  Dices,
  Users,
  Focus,
  Trash2,
  Shield,
  FileText,
} from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '@/lib/pushNotifications'
import { isNativeIOS } from '@/lib/platform'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#FF2D9B', '#0066FF', '#FFE500', '#BFFF00', '#FF6B00', '#8B5CF6', '#06B6D4']

const TIPS = [
  {
    icon: Smartphone,
    title: 'SWIPE CHORES',
    description: 'On mobile, swipe a chore right to edit it or left to assign it to someone.',
  },
  {
    icon: TrendingUp,
    title: 'BOOST BOUNTIES',
    description:
      'Tap the points badge on any chore to increase its value. Great for motivating others to tackle tough jobs.',
  },
  {
    icon: Focus,
    title: 'FOCUS MODE',
    description:
      'Tap the crosshair button on the chores page to enter "Just Do One" mode — it picks a random chore so you can stop overthinking.',
  },
  {
    icon: Dices,
    title: 'CHORE ROULETTE',
    description:
      'Can\u2019t agree on who does what? Spin the roulette to randomly assign chores. Fair and square.',
  },
  {
    icon: Users,
    title: 'INVITE HOUSEMATES',
    description:
      'Go to the Group tab to get an invite code. Share it with your housemates so they can join and start earning points.',
  },
  {
    icon: Bell,
    title: 'REMINDERS',
    description:
      'When creating or editing a chore, set a reminder day and time. You\u2019ll see a "DUE TODAY" badge when it\u2019s time.',
  },
]

export function ProfilePage() {
  const { user, profile, signOut, updateProfile } = useAuth()
  const { userMember, leaveGroup, members } = useGroup()
  const { theme, toggle } = useTheme()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.display_name ?? '')
  const [linkEmail, setLinkEmail] = useState('')
  const [linkPassword, setLinkPassword] = useState('')
  const [linkingAccount, setLinkingAccount] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [linkSuccess, setLinkSuccess] = useState(false)
  const isAnonymous = user?.is_anonymous ?? false
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const pushSupported = isNativeIOS || ('serviceWorker' in navigator && 'PushManager' in window)
  const navigate = useNavigate()

  async function handleDeleteAccount() {
    if (deleting) return
    setDeleting(true)
    try {
      const { error } = await supabase.functions.invoke('delete-account')
      if (error) throw error
      leaveGroup()
      await supabase.auth.signOut()
      toast('Account deleted', 'bg-brutal-lime')
    } catch {
      toast('Failed to delete account. Try again.', 'bg-red-500')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled)
  }, [])

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
      <div className="sticky top-0 z-10 border-b-4 border-brutal-black bg-brutal-white px-4 py-3">
        <h1 className="font-mono text-lg font-bold tracking-tight">PROFILE</h1>
      </div>

      <div className="space-y-6 p-4 md:mx-auto md:max-w-md">
        {/* Avatar + name */}
        <div className="flex flex-col items-center pt-4">
          <label className="group relative cursor-pointer">
            <Avatar
              name={profile?.display_name ?? '?'}
              color={profile?.avatar_color ?? '#FF2D9B'}
              size="lg"
              imageUrl={profile?.avatar_url}
            />
            <div className="absolute inset-0 flex items-center justify-center border-2 border-brutal-black bg-brutal-black/40 opacity-0 transition-opacity group-active:opacity-100 md:group-hover:opacity-100">
              <span className="font-mono text-xs font-bold text-brutal-white">EDIT</span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !user) return
                const path = `avatars/${user.id}/${Date.now()}.jpg`
                const { error: uploadError } = await supabase.storage
                  .from('completion-photos')
                  .upload(path, file, { contentType: file.type, upsert: true })
                if (uploadError) {
                  toast('Failed to upload photo', 'bg-brutal-pink')
                  return
                }
                const { data: urlData } = supabase.storage
                  .from('completion-photos')
                  .getPublicUrl(path)
                await updateProfile({ avatar_url: urlData.publicUrl })
                toast('Photo updated!', 'bg-brutal-lime')
              }}
            />
          </label>

          {editing ? (
            <div className="mt-4 flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-48 border-2 border-brutal-black text-center font-mono"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="flex h-10 w-10 items-center justify-center border-2 border-brutal-black bg-brutal-lime transition-colors active:bg-brutal-lime/70"
              >
                <Check size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setName(profile?.display_name ?? '')
                setEditing(true)
              }}
              className="mt-4 flex items-center gap-2 font-mono text-xl font-bold transition-opacity active:opacity-60"
            >
              {profile?.display_name ?? '—'}
              <Pencil size={16} />
            </button>
          )}

          {user?.email ? (
            <p className="mt-1 font-mono text-xs text-brutal-black/40">{user.email}</p>
          ) : (
            <p className="mt-1 font-mono text-xs text-brutal-black/40">Guest account</p>
          )}
          <div className="mt-2 border-2 border-brutal-black bg-brutal-yellow px-3 py-1 font-mono text-sm font-bold">
            {userMember?.total_points ?? 0} PTS
          </div>
        </div>

        {/* Year in Review entry */}
        <button
          onClick={() => navigate('/wrapped')}
          className="flex w-full items-center justify-between border-2 border-brutal-black bg-brutal-black px-4 py-3 text-brutal-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          <div className="text-left">
            <div className="font-mono text-[10px] font-bold tracking-widest opacity-60">
              YOUR {new Date().getFullYear()} WRAPPED
            </div>
            <div className="mt-0.5 font-mono text-base font-bold">SEE YOUR YEAR ➝</div>
          </div>
          <Sparkles size={20} strokeWidth={2.5} />
        </button>

        {/* Activity heat map */}
        <HeatMap />

        {/* Color picker */}
        <div>
          <h3 className="mb-2 font-mono text-xs font-bold uppercase">AVATAR COLOR</h3>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => {
              const isOwn = c === profile?.avatar_color
              const takenBy = members.find(
                (m) => m.user_id !== user?.id && m.profiles.avatar_color === c,
              )
              const isTaken = !!takenBy && !isOwn

              return (
                <button
                  key={c}
                  onClick={() => !isTaken && handleColorChange(c)}
                  disabled={isTaken}
                  className={`relative h-10 w-10 border-2 transition-all ${
                    isOwn
                      ? 'scale-110 border-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                      : isTaken
                        ? 'cursor-not-allowed border-brutal-black/15 opacity-35'
                        : 'border-brutal-black/30 hover:scale-105 hover:border-brutal-black/60 active:scale-95'
                  }`}
                  style={{ backgroundColor: c }}
                  title={isTaken ? `Taken by ${takenBy.profiles.display_name}` : undefined}
                >
                  {isTaken && (
                    <span className="absolute inset-0 flex items-center justify-center font-mono text-lg font-bold text-brutal-black/60">
                      ×
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Link account */}
        {isAnonymous && !linkSuccess && (
          <div className="border-2 border-brutal-black bg-brutal-yellow/10 p-4">
            <h3 className="mb-1 font-mono text-xs font-bold uppercase">SAVE YOUR ACCOUNT</h3>
            <p className="mb-3 font-mono text-[10px] text-brutal-black/40">
              Add an email and password so you don't lose your progress.
            </p>
            {linkError && (
              <div className="mb-3 border border-brutal-pink bg-brutal-pink/20 p-2 font-mono text-xs font-bold">
                {linkError}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!linkEmail.trim() || !linkPassword) return
                setLinkingAccount(true)
                setLinkError('')
                const { error } = await supabase.auth.updateUser({
                  email: linkEmail.trim(),
                  password: linkPassword,
                })
                if (error) {
                  setLinkError(error.message)
                } else {
                  setLinkSuccess(true)
                }
                setLinkingAccount(false)
              }}
              className="space-y-2"
            >
              <Input
                type="email"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="Email"
                className="h-10 border-2 border-brutal-black font-mono"
                required
              />
              <Input
                type="password"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                placeholder="Password"
                className="h-10 border-2 border-brutal-black font-mono"
                minLength={6}
                required
              />
              <Button
                type="submit"
                disabled={linkingAccount}
                className="h-10 w-full border-2 border-brutal-black bg-brutal-black font-mono text-xs font-bold text-brutal-white uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                {linkingAccount ? 'SAVING...' : 'SAVE ACCOUNT'}
              </Button>
            </form>
          </div>
        )}
        {linkSuccess && (
          <div className="border-2 border-brutal-lime bg-brutal-lime/20 p-4 text-center">
            <p className="font-mono text-xs font-bold">
              Account saved! You can now log in with your email.
            </p>
          </div>
        )}

        {/* Dark mode toggle */}
        <div>
          <h3 className="mb-2 font-mono text-xs font-bold uppercase">THEME</h3>
          <button
            onClick={toggle}
            className="flex w-full items-center justify-between border-2 border-brutal-black bg-brutal-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
          >
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              <span className="font-mono text-sm font-bold">
                {theme === 'dark' ? 'DARK MODE' : 'LIGHT MODE'}
              </span>
            </div>
            <div
              className={`flex h-7 w-12 items-center border-2 border-brutal-black p-0.5 transition-colors ${theme === 'dark' ? 'justify-end bg-brutal-yellow' : 'justify-start bg-brutal-white'}`}
            >
              <div className="h-5 w-5 bg-brutal-black" />
            </div>
          </button>
        </div>

        {/* Notifications */}
        {pushSupported && (
          <div>
            <h3 className="mb-2 font-mono text-xs font-bold uppercase">NOTIFICATIONS</h3>
            <button
              onClick={async () => {
                if (pushLoading || !user) return
                setPushLoading(true)
                try {
                  if (pushEnabled) {
                    await unsubscribeFromPush(user.id)
                    setPushEnabled(false)
                    toast('Notifications off', 'bg-brutal-white')
                  } else {
                    const ok = await subscribeToPush(user.id)
                    setPushEnabled(ok)
                    if (ok) toast('Notifications on!', 'bg-brutal-lime')
                    else toast('Permission denied', 'bg-red-500')
                  }
                } finally {
                  setPushLoading(false)
                }
              }}
              disabled={pushLoading}
              className="flex w-full items-center justify-between border-2 border-brutal-black bg-brutal-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                {pushEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                <span className="font-mono text-sm font-bold">
                  {pushEnabled ? 'NOTIFICATIONS ON' : 'NOTIFICATIONS OFF'}
                </span>
              </div>
              <div
                className={`flex h-7 w-12 items-center border-2 border-brutal-black p-0.5 transition-colors ${pushEnabled ? 'justify-end bg-brutal-yellow' : 'justify-start bg-brutal-white'}`}
              >
                <div className="h-5 w-5 bg-brutal-black" />
              </div>
            </button>
          </div>
        )}

        {/* Help */}
        <div>
          <h3 className="mb-2 font-mono text-xs font-bold uppercase">HELP</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                localStorage.removeItem('dirtylaundry_tour_completed')
                navigate('/chores')
                setTimeout(() => window.dispatchEvent(new Event('start-tour')), 300)
              }}
              className="flex w-full items-center justify-between border-2 border-brutal-black bg-brutal-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              <div className="flex items-center gap-3">
                <HelpCircle size={20} />
                <span className="font-mono text-sm font-bold">REPLAY APP TOUR</span>
              </div>
            </button>

            <button
              onClick={() => setShowTips(true)}
              className="flex w-full items-center justify-between border-2 border-brutal-black bg-brutal-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              <div className="flex items-center gap-3">
                <Sparkles size={20} />
                <span className="font-mono text-sm font-bold">TIPS & TRICKS</span>
              </div>
            </button>
          </div>
        </div>

        <BottomSheet open={showTips} onClose={() => setShowTips(false)}>
          <h2 className="mb-4 font-mono text-lg font-bold">TIPS & TRICKS</h2>
          <div className="space-y-3">
            {TIPS.map((tip) => (
              <div key={tip.title} className="border-2 border-brutal-black bg-brutal-white p-4">
                <div className="mb-1.5 flex items-center gap-2.5">
                  <tip.icon size={16} strokeWidth={2.5} className="shrink-0 text-brutal-black/60" />
                  <span className="font-mono text-xs font-bold">{tip.title}</span>
                </div>
                <p className="font-mono text-[11px] leading-relaxed text-brutal-black/50">
                  {tip.description}
                </p>
              </div>
            ))}
          </div>
        </BottomSheet>

        {/* Legal */}
        <div>
          <h3 className="mb-2 font-mono text-xs font-bold uppercase">LEGAL</h3>
          <div className="space-y-2">
            <a
              href="https://dirtylaundry.club/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between border-2 border-brutal-black bg-brutal-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              <div className="flex items-center gap-3">
                <Shield size={20} />
                <span className="font-mono text-sm font-bold">PRIVACY POLICY</span>
              </div>
            </a>
            <a
              href="https://dirtylaundry.club/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between border-2 border-brutal-black bg-brutal-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              <div className="flex items-center gap-3">
                <FileText size={20} />
                <span className="font-mono text-sm font-bold">TERMS OF SERVICE</span>
              </div>
            </a>
          </div>
        </div>

        {/* Sign out */}
        <Button
          onClick={async () => {
            leaveGroup()
            await signOut()
          }}
          className="h-12 w-full border-2 border-brutal-black bg-red-500 font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          SIGN OUT
        </Button>

        {/* Delete account */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex h-12 w-full items-center justify-center gap-2 border-2 border-red-500 bg-brutal-white font-mono text-xs font-bold text-red-600 uppercase transition-colors active:bg-red-500/10"
        >
          <Trash2 size={16} />
          DELETE ACCOUNT
        </button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete account?"
        message={
          deleting
            ? 'Deleting your account and all associated data...'
            : 'This permanently deletes your profile, points, and chore history. This cannot be undone.'
        }
        confirmLabel={deleting ? 'DELETING...' : 'DELETE FOREVER'}
        confirmColor="bg-red-500 text-brutal-white"
        onConfirm={handleDeleteAccount}
        onCancel={() => !deleting && setShowDeleteConfirm(false)}
      />
    </div>
  )
}

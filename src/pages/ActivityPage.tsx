import { useState, useRef } from 'react'
import { useActivity } from '@/lib/hooks/useActivity'
import type { ActivityEntry } from '@/lib/hooks/useActivity'
import { Spinner } from '@/components/ui/Spinner'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/Toast'
import { Camera } from 'lucide-react'

const REACTION_EMOJIS = ['👏', '🔥', '😂', '🫡', '💀']

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function groupByDate(activity: ActivityEntry[]): Map<string, ActivityEntry[]> {
  const groups = new Map<string, ActivityEntry[]>()
  for (const entry of activity) {
    const date = new Date(entry.completed_at)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    let label: string
    if (date.toDateString() === today.toDateString()) {
      label = 'TODAY'
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'YESTERDAY'
    } else {
      label = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
    }

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }
  return groups
}

export function ActivityPage() {
  const { group, members } = useGroup()
  const { user } = useAuth()
  const { activity, loading, hasMore, loadingMore, loadMore, toggleReaction, undoCompletion } = useActivity()
  const [pickerOpen, setPickerOpen] = useState<string | null>(null)
  const [confirmUndo, setConfirmUndo] = useState<{ id: string; name: string } | null>(null)
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null)

  // Swipe state
  const touchStartX = useRef(0)
  const swipingIdRef = useRef<string | null>(null)
  const swipeOffsetRef = useRef(0)
  const [swipingId, setSwipingId] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)

  function onTouchStart(e: React.TouchEvent, id: string) {
    touchStartX.current = e.touches[0].clientX
    swipingIdRef.current = id
    swipeOffsetRef.current = 0
    setSwipingId(id)
    setSwipeOffset(0)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!swipingIdRef.current) return
    const diff = e.touches[0].clientX - touchStartX.current
    // Only allow swipe left (negative)
    const clamped = Math.min(0, diff)
    swipeOffsetRef.current = clamped
    setSwipeOffset(clamped)
  }

  function onTouchEnd(entry: ActivityEntry) {
    const offset = swipeOffsetRef.current
    if (offset < -80 && entry.user_id === user?.id) {
      setConfirmUndo({ id: entry.id, name: entry.chore_name ?? 'a chore' })
    }
    swipingIdRef.current = null
    swipeOffsetRef.current = 0
    setSwipingId(null)
    setSwipeOffset(0)
  }

  if (!group) return <Navigate to="/group" replace />

  const grouped = groupByDate(activity)

  // Group reactions by emoji for display
  function groupReactions(reactions: { id: string; emoji: string; user_id: string }[]) {
    const map = new Map<string, string[]>()
    for (const r of reactions) {
      if (!map.has(r.emoji)) map.set(r.emoji, [])
      map.get(r.emoji)!.push(r.user_id)
    }
    return map
  }

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-brutal-orange border-b-4 border-brutal-black px-4 py-4">
        <h1 className="font-mono font-bold text-2xl tracking-tight text-center">ACTIVITY</h1>
        <p className="font-mono text-xs text-center text-brutal-black/60 mt-0.5">{group.name}</p>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="py-12"><Spinner /></div>
        ) : activity.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-mono font-bold text-brutal-black/40 text-sm">NO ACTIVITY YET</p>
            <p className="font-mono text-brutal-black/30 text-xs mt-1">Completed chores will show up here</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([dateLabel, entries]) => (
            <div key={dateLabel} className="mb-5">
              <div className="font-mono font-bold text-[11px] text-brutal-black/40 tracking-widest mb-2 px-1">
                {dateLabel}
              </div>
              <div className="space-y-2">
                {entries.map((entry) => {
                  const reactionGroups = groupReactions(entry.reactions)
                  const isPickerOpen = pickerOpen === entry.id
                  const isSwiping = swipingId === entry.id
                  const offset = isSwiping ? swipeOffset : 0
                  const showUndo = offset < -40 && entry.user_id === user?.id
                  const isMine = entry.user_id === user?.id

                  return (
                    <div key={entry.id} className="relative overflow-hidden">
                      {/* Undo background */}
                      {isMine && (
                        <div className={`absolute inset-0 bg-brutal-pink flex items-center justify-end px-4 font-mono font-bold text-sm text-brutal-white transition-opacity ${showUndo ? 'opacity-100' : 'opacity-0'}`}>
                          UNDO ↩
                        </div>
                      )}
                    <div
                      className="relative bg-brutal-white border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 touch-pan-y"
                      style={{ transform: isSwiping ? `translateX(${offset}px)` : 'translateX(0)', transition: isSwiping ? 'none' : 'transform 0.2s' }}
                      onTouchStart={isMine ? e => onTouchStart(e, entry.id) : undefined}
                      onTouchMove={isMine ? onTouchMove : undefined}
                      onTouchEnd={isMine ? () => onTouchEnd(entry) : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={entry.profiles.display_name}
                          color={entry.profiles.avatar_color}
                          size="sm"
                          imageUrl={entry.profiles.avatar_url}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm">
                            <span className="font-bold">{entry.profiles.display_name}</span>
                            {entry.with_user_id && (() => {
                              const partner = members.find(m => m.user_id === entry.with_user_id)
                              return partner ? <> <span className="text-brutal-black/50">&</span> <span className="font-bold">{partner.profiles.display_name}</span></> : null
                            })()}
                            {' completed '}
                            <span className="font-bold">{entry.chore_name ?? 'a chore'}</span>
                          </p>
                          <p className="font-mono text-[10px] text-brutal-black/40 mt-0.5">
                            {timeAgo(entry.completed_at)}
                          </p>
                        </div>
                        <div className="font-mono font-bold text-sm bg-brutal-yellow border border-brutal-black px-2 py-0.5">
                          +{entry.points_earned}
                        </div>
                      </div>

                      {/* Photo proof */}
                      {entry.photo_url && (
                        <img
                          src={entry.photo_url}
                          alt="Proof"
                          onClick={() => setExpandedPhoto(entry.photo_url)}
                          className="w-full h-40 object-cover border-2 border-brutal-black mt-2 cursor-pointer active:opacity-80"
                        />
                      )}

                      {/* Reactions row — only on other people's completions */}
                      {entry.user_id !== user?.id && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {Array.from(reactionGroups.entries()).map(([emoji, userIds]) => {
                            const iMine = userIds.includes(user?.id ?? '')
                            return (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(entry.id, emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 border font-mono text-xs transition-all active:scale-95 ${
                                  iMine
                                    ? 'border-brutal-black bg-brutal-yellow/40'
                                    : 'border-brutal-black/20 bg-brutal-white'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-bold text-[10px]">{userIds.length}</span>
                              </button>
                            )
                          })}
                          <button
                            onClick={() => setPickerOpen(isPickerOpen ? null : entry.id)}
                            className="w-7 h-7 border border-brutal-black/20 bg-brutal-white flex items-center justify-center font-mono text-xs active:bg-brutal-black/5 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {/* Show reactions from others on your own completions (read-only) + add photo */}
                      {entry.user_id === user?.id && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {Array.from(reactionGroups.entries()).map(([emoji, userIds]) => (
                            <span key={emoji} className="flex items-center gap-1 px-2 py-0.5 border border-brutal-black/20 bg-brutal-white font-mono text-xs">
                              <span>{emoji}</span>
                              <span className="font-bold text-[10px]">{userIds.length}</span>
                            </span>
                          ))}
                          {!entry.photo_url && (
                            <label className={`flex items-center gap-1 px-2 py-0.5 border border-brutal-black/20 bg-brutal-white font-mono text-[10px] font-bold text-brutal-black/40 cursor-pointer active:bg-brutal-black/5 ${uploadingPhotoId === entry.id ? 'opacity-50' : ''}`}>
                              <Camera size={12} /> PHOTO
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingPhotoId === entry.id}
                                onChange={async e => {
                                  const file = e.target.files?.[0]
                                  if (!file || !user || !group) return
                                  setUploadingPhotoId(entry.id)
                                  const path = `${group.id}/${user.id}/${Date.now()}.jpg`
                                  const { error: uploadError } = await supabase.storage
                                    .from('completion-photos')
                                    .upload(path, file, { contentType: file.type })
                                  if (uploadError) {
                                    toast('Failed to upload photo', 'bg-brutal-pink')
                                  } else {
                                    const { data: urlData } = supabase.storage
                                      .from('completion-photos')
                                      .getPublicUrl(path)
                                    await supabase
                                      .from('completions')
                                      .update({ photo_url: urlData.publicUrl })
                                      .eq('id', entry.id)
                                    toast('Photo added!', 'bg-brutal-lime')
                                  }
                                  setUploadingPhotoId(null)
                                }}
                              />
                            </label>
                          )}
                        </div>
                      )}

                      {/* Emoji picker */}
                      {isPickerOpen && (
                        <div className="flex gap-1 mt-2 p-2 border-2 border-brutal-black bg-brutal-yellow/10">
                          {REACTION_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => {
                                toggleReaction(entry.id, emoji)
                                setPickerOpen(null)
                              }}
                              className="w-10 h-10 text-lg border border-brutal-black/20 bg-brutal-white flex items-center justify-center active:scale-90 active:bg-brutal-yellow/30 transition-all"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {hasMore && activity.length > 0 && (
          <div className="py-4 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="font-mono text-xs font-bold px-6 py-3 border-2 border-brutal-black bg-brutal-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all disabled:opacity-50"
            >
              {loadingMore ? 'LOADING...' : 'LOAD MORE'}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmUndo}
        title="UNDO COMPLETION"
        message={confirmUndo ? `Remove "${confirmUndo.name}" completion and subtract the points?` : ''}
        confirmLabel="UNDO"
        confirmColor="bg-brutal-pink"
        onConfirm={async () => {
          if (confirmUndo) await undoCompletion(confirmUndo.id)
          setConfirmUndo(null)
        }}
        onCancel={() => setConfirmUndo(null)}
      />

      {/* Expanded photo overlay */}
      {expandedPhoto && (
        <div
          onClick={() => setExpandedPhoto(null)}
          className="fixed inset-0 z-50 bg-brutal-black/90 flex items-center justify-center p-4"
        >
          <img
            src={expandedPhoto}
            alt="Proof"
            className="max-w-full max-h-full object-contain border-4 border-brutal-white"
          />
        </div>
      )}
    </div>
  )
}

import { useActivity } from '@/lib/hooks/useActivity'
import { useGroup } from '@/context/GroupContext'
import { Avatar } from '@/components/ui/Avatar'
import { Navigate } from 'react-router-dom'

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

function groupByDate<T extends { completed_at: string }>(activity: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
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
  const { group } = useGroup()
  const { activity, loading } = useActivity()

  if (!group) return <Navigate to="/group" replace />

  const grouped = groupByDate(activity)

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-brutal-orange border-b-4 border-brutal-black px-4 py-4">
        <h1 className="font-mono font-bold text-2xl tracking-tight text-center">ACTIVITY</h1>
        <p className="font-mono text-xs text-center text-brutal-black/60 mt-0.5">{group.name}</p>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="py-12 text-center">
            <p className="font-mono font-bold text-brutal-black/40 text-sm">LOADING...</p>
          </div>
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
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-brutal-white border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 flex items-center gap-3"
                  >
                    <Avatar
                      name={entry.profiles.display_name}
                      color={entry.profiles.avatar_color}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm">
                        <span className="font-bold">{entry.profiles.display_name}</span>
                        {' completed '}
                        <span className="font-bold">{entry.chores?.name ?? 'a chore'}</span>
                      </p>
                      <p className="font-mono text-[10px] text-brutal-black/40 mt-0.5">
                        {timeAgo(entry.completed_at)}
                      </p>
                    </div>
                    <div className="font-mono font-bold text-sm bg-brutal-yellow border border-brutal-black px-2 py-0.5">
                      +{entry.points_earned}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

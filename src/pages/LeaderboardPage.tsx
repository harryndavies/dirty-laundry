import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Navigate } from 'react-router-dom'

const rankColors = ['bg-brutal-yellow', 'bg-brutal-pink', 'bg-brutal-lime']

export function LeaderboardPage() {
  const { group } = useGroup()
  const { user } = useAuth()
  const { leaderboard } = useLeaderboard()

  if (!group) return <Navigate to="/group" replace />

  const maxPoints = leaderboard[0]?.total_points || 1

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-brutal-yellow border-b-4 border-brutal-black px-4 py-4">
        <h1 className="font-mono font-bold text-2xl tracking-tight text-center">LEADERBOARD</h1>
        <p className="font-mono text-xs text-center text-brutal-black/60 mt-0.5">{group.name}</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {leaderboard.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <p className="font-mono font-bold text-brutal-black/40 text-sm">NO SCORES YET</p>
            <p className="font-mono text-brutal-black/30 text-xs mt-1">Complete chores to earn points</p>
          </div>
        ) : (
          leaderboard.map((member, i) => {
            const isMe = member.user_id === user?.id
            const barWidth = maxPoints > 0 ? (member.total_points / maxPoints) * 100 : 0

            return (
              <div
                key={member.id}
                className={`border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 p-3 ${
                  isMe ? 'bg-brutal-yellow/20' : 'bg-brutal-white'
                }`}
              >
                {/* Rank */}
                <div
                  className={`w-10 h-10 flex items-center justify-center font-mono font-bold text-lg border-2 border-brutal-black ${
                    rankColors[i] ?? 'bg-brutal-white'
                  }`}
                >
                  {i + 1}
                </div>

                {/* Avatar + name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={member.profiles.display_name}
                      color={member.profiles.avatar_color}
                      size="sm"
                    />
                    <span className="font-mono font-bold text-sm truncate">
                      {member.profiles.display_name}
                      {isMe && ' (YOU)'}
                    </span>
                  </div>
                  {/* Points bar */}
                  <div className="mt-2 h-2 bg-brutal-black/10 border border-brutal-black/20">
                    <div
                      className={`h-full ${rankColors[i] ?? 'bg-brutal-black/30'} transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>

                {/* Points */}
                <div className="font-mono font-bold text-xl text-right min-w-[60px]">
                  {member.total_points}
                  <div className="text-[10px] text-brutal-black/40 font-bold">PTS</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

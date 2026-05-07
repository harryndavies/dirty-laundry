import { useState } from 'react'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import { useStats, formatLastActive } from '@/lib/hooks/useStats'
import { useNudges } from '@/lib/hooks/useNudges'
import { useChampions } from '@/lib/hooks/useChampions'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from '@/components/ui/Toast'
import { Flame, Eye, BarChart3, Trophy } from 'lucide-react'
import { playNudge } from '@/lib/sounds'

const rankColors = ['bg-brutal-yellow', 'bg-brutal-pink', 'bg-brutal-lime']

export function LeaderboardPage() {
  const { group } = useGroup()
  const { user } = useAuth()
  const { leaderboard } = useLeaderboard()
  const { stats } = useStats()
  const { nudges, unseenCount, sendNudge, markSeen } = useNudges()
  const { lastMonth, winCounts } = useChampions()
  const [nudgingId, setNudgingId] = useState<string | null>(null)
  const navigate = useNavigate()

  if (!group) return <Navigate to="/group" replace />

  const maxPoints = leaderboard[0]?.total_points || 1

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-brutal-yellow border-b-4 border-brutal-black px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="w-9" />
          <div className="text-center">
            <h1 className="font-mono font-bold text-2xl tracking-tight">LEADERBOARD</h1>
            <p className="font-mono text-xs text-brutal-black/60 mt-0.5">{group.name}</p>
          </div>
          <button
            onClick={() => navigate('/report')}
            className="w-9 h-9 bg-brutal-blue text-brutal-white border-2 border-brutal-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center active:shadow-none active:translate-x-[2px] active:translate-y-[2px] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <BarChart3 size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Nudge notifications */}
      {unseenCount > 0 && (
        <button
          onClick={markSeen}
          className="mx-4 mt-3 bg-brutal-pink/15 border-2 border-brutal-pink p-3 flex items-center justify-between"
        >
          <span className="font-mono text-xs font-bold text-brutal-pink">
            {unseenCount === 1
              ? `${nudges[0]?.profiles.display_name} nudged you 👀`
              : `You got ${unseenCount} nudges 👀👀`
            }
          </span>
          <span className="font-mono text-[10px] text-brutal-pink/60">TAP TO DISMISS</span>
        </button>
      )}

      {/* Last month's champion */}
      {lastMonth && (
        <div className="px-4 mt-3">
          <div className="border-2 border-brutal-black bg-brutal-yellow shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="px-3 py-2 border-b-2 border-brutal-black flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Trophy size={12} strokeWidth={3} />
                <span className="font-mono font-bold text-[10px] tracking-widest">MONTHLY CHAMPION</span>
              </div>
              <span className="font-mono text-[10px] text-brutal-black/50 font-bold">{lastMonth.monthLabel}</span>
            </div>
            <div className="flex items-center gap-3 p-3">
              <Avatar
                name={lastMonth.display_name}
                color={lastMonth.avatar_color}
                size="md"
                imageUrl={lastMonth.avatar_url}
              />
              <div className="flex-1 min-w-0">
                <span className="font-mono font-bold text-sm block truncate">{lastMonth.display_name}</span>
                <span className="font-mono text-[10px] text-brutal-black/60 block truncate">
                  {lastMonth.prize ?? 'No prize claimed'}
                </span>
              </div>
              <div className="font-mono font-bold text-xl text-right">
                {lastMonth.points}
                <div className="text-[10px] text-brutal-black/40 font-bold">PTS</div>
              </div>
            </div>
          </div>
        </div>
      )}

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
            const memberStats = stats.get(member.user_id)
            const lastActive = formatLastActive(memberStats?.last_completion ?? null)
            const streak = memberStats?.current_streak ?? 0

            return (
              <div
                key={member.id}
                className={`border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  isMe ? 'bg-brutal-yellow/20' : 'bg-brutal-white'
                }`}
              >
                <div className="flex items-center gap-3 p-3">
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
                        imageUrl={member.profiles.avatar_url}
                      />
                      <span className="font-mono font-bold text-sm truncate">
                        {member.profiles.display_name}
                        {isMe && ' (YOU)'}
                      </span>
                      {streak >= 2 && (
                        <span className="inline-flex items-center gap-0.5 bg-brutal-orange/15 border border-brutal-orange px-1.5 py-0.5 font-mono text-[10px] font-bold text-brutal-orange">
                          <Flame size={10} /> {streak}
                        </span>
                      )}
                      {(winCounts.get(member.user_id) ?? 0) > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 bg-brutal-yellow border border-brutal-black px-1.5 py-0.5 font-mono text-[10px] font-bold"
                          title={`${winCounts.get(member.user_id)} monthly ${winCounts.get(member.user_id) === 1 ? 'win' : 'wins'}`}
                        >
                          <Trophy size={10} strokeWidth={2.5} /> {winCounts.get(member.user_id)}
                        </span>
                      )}
                    </div>
                    {/* Points bar */}
                    <div className="mt-2 h-2 bg-brutal-black/10 border border-brutal-black/20">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${barWidth}%`, backgroundColor: member.profiles.avatar_color }}
                      />
                    </div>
                  </div>

                  {/* Points */}
                  <div className="font-mono font-bold text-xl text-right min-w-[60px]">
                    {member.total_points}
                    <div className="text-[10px] text-brutal-black/40 font-bold">PTS</div>
                  </div>
                </div>

                {/* Last active + nudge */}
                <div className="border-t-2 border-brutal-black/15 px-3 py-1.5 flex justify-between items-center">
                  <span className="font-mono text-[10px] text-brutal-black/40">LAST ACTIVE</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[10px] font-bold ${
                      !memberStats?.last_completion ? 'text-brutal-pink' :
                      lastActive.includes('day') ? 'text-brutal-orange' : 'text-brutal-black/50'
                    }`}>
                      {lastActive.toUpperCase()}
                    </span>
                    {!isMe && (
                      <button
                        onClick={async () => {
                          setNudgingId(member.user_id)
                          await sendNudge(member.user_id)
                          playNudge()
                          toast(`Nudged ${member.profiles.display_name} 👀`, 'bg-brutal-pink')
                          setNudgingId(null)
                        }}
                        disabled={nudgingId === member.user_id}
                        className="w-7 h-7 bg-brutal-pink/10 border border-brutal-pink flex items-center justify-center active:bg-brutal-pink/30 hover:bg-brutal-pink/20 transition-colors"
                      >
                        <Eye size={12} className="text-brutal-pink" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

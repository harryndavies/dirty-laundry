import { NavLink } from 'react-router-dom'
import { CheckSquare, Trophy, Users, User } from 'lucide-react'

const tabs = [
  { to: '/chores', icon: CheckSquare, label: 'CHORES' },
  { to: '/leaderboard', icon: Trophy, label: 'SCORES' },
  { to: '/group', icon: Users, label: 'GROUP' },
  { to: '/profile', icon: User, label: 'ME' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 bg-brutal-white border-t-4 border-brutal-black flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 font-mono text-[10px] font-bold tracking-wider transition-colors min-h-[44px] ${
              isActive
                ? 'bg-brutal-yellow text-brutal-black'
                : 'text-brutal-black/60 active:bg-brutal-yellow/50'
            }`
          }
        >
          <Icon size={22} strokeWidth={2.5} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

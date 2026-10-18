import { NavLink } from 'react-router-dom'
import { CheckSquare, Trophy, ClipboardList, Users, User } from 'lucide-react'

const tabs = [
  { to: '/chores', icon: CheckSquare, label: 'CHORES' },
  { to: '/leaderboard', icon: Trophy, label: 'SCORES' },
  { to: '/activity', icon: ClipboardList, label: 'LOG' },
  { to: '/group', icon: Users, label: 'GROUP' },
  { to: '/profile', icon: User, label: 'ME' },
]

export function BottomNav() {
  return (
    <nav
      data-tour="bottom-nav"
      className="fixed right-0 bottom-0 left-0 z-50 flex border-t-4 border-brutal-black bg-brutal-white md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)', minHeight: '64px' }}
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 font-mono text-[10px] font-bold tracking-wider transition-colors ${
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

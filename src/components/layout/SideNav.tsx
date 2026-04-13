import { NavLink } from 'react-router-dom'
import { CheckSquare, Trophy, ClipboardList, Users, User } from 'lucide-react'

const tabs = [
  { to: '/chores', icon: CheckSquare, label: 'CHORES' },
  { to: '/leaderboard', icon: Trophy, label: 'SCORES' },
  { to: '/activity', icon: ClipboardList, label: 'LOG' },
  { to: '/group', icon: Users, label: 'GROUP' },
  { to: '/profile', icon: User, label: 'ME' },
]

export function SideNav() {
  return (
    <nav className="hidden md:flex flex-col w-56 shrink-0 bg-brutal-white border-r-4 border-brutal-black h-full">
      <div className="p-4 border-b-4 border-brutal-black bg-brutal-yellow">
        <img src="/logo.png" alt="Dirty Laundry" className="w-32 h-auto mx-auto" />
      </div>
      <div className="flex-1 py-2">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 font-mono text-xs font-bold tracking-wider transition-colors ${
                isActive
                  ? 'bg-brutal-yellow text-brutal-black border-r-4 border-brutal-black'
                  : 'text-brutal-black/60 hover:bg-brutal-yellow/30 hover:text-brutal-black'
              }`
            }
          >
            <Icon size={18} strokeWidth={2.5} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

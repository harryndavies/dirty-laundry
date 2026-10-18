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
    <nav className="hidden h-full w-56 shrink-0 flex-col border-r-4 border-brutal-black bg-brutal-white md:flex">
      <div className="border-b-4 border-brutal-black bg-brutal-yellow p-4">
        <img src="/logo.png" alt="Dirty Laundry" className="mx-auto h-auto w-32" />
      </div>
      <div className="flex-1 py-2">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 font-mono text-xs font-bold tracking-wider transition-colors ${
                isActive
                  ? 'border-r-4 border-brutal-black bg-brutal-yellow text-brutal-black'
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

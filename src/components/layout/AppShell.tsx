import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { useGroup } from '@/context/GroupContext'

export function AppShell() {
  useRealtime()
  const { group, loading } = useGroup()
  const hadGroup = !!localStorage.getItem('dirtylaundry_group_id')
  const showNav = group ? true : loading && hadGroup

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <main
        className={`flex-1 overflow-y-auto overscroll-contain ${showNav ? 'pb-36' : ''}`}
      >
        <Outlet />
      </main>
      {showNav && <BottomNav />}
    </div>
  )
}

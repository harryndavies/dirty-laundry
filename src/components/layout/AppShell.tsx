import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { useGroup } from '@/context/GroupContext'

export function AppShell() {
  useRealtime()
  const { group, loading } = useGroup()

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <main
        className={`flex-1 overflow-y-auto overscroll-contain ${group ? 'pb-28' : ''}`}
      >
        <Outlet />
      </main>
      {group && !loading && <BottomNav />}
    </div>
  )
}

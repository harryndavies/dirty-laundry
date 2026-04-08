import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { useGroup } from '@/context/GroupContext'

export function AppShell() {
  useRealtime()
  const { group, loading } = useGroup()

  return (
    <div className="h-screen flex flex-col">
      <main className={`flex-1 overflow-y-auto ${group ? 'pb-20' : ''}`}>
        <Outlet />
      </main>
      {group && !loading && <BottomNav />}
    </div>
  )
}

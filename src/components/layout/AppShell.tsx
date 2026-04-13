import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/Spinner'

export function AppShell() {
  useRealtime()
  const { loading: authLoading } = useAuth()
  const { group, loading: groupLoading } = useGroup()
  const hadGroup = !!localStorage.getItem('dirtylaundry_group_id')
  const showNav = group ? true : groupLoading && hadGroup
  const stillLoading = authLoading || groupLoading

  if (stillLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-brutal-yellow">
        <img src="/logo.png" alt="Dirty Laundry" className="w-48 h-auto mb-6" />
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {showNav && <SideNav />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main
          className={`flex-1 overflow-y-auto overscroll-contain ${showNav ? 'pb-36 md:pb-0' : ''}`}
        >
          <div className="md:max-w-2xl md:mx-auto">
            <Outlet />
          </div>
        </main>
        {showNav && <BottomNav />}
      </div>
    </div>
  )
}

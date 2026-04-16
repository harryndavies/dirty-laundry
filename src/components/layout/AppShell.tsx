import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { useGroup } from '@/context/GroupContext'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/Spinner'
import { AppTour } from '@/components/tour/AppTour'
import { useTour } from '@/lib/hooks/useTour'

export function AppShell() {
  useRealtime()
  const { loading: authLoading } = useAuth()
  const { group, loading: groupLoading } = useGroup()
  const hadGroup = !!localStorage.getItem('dirtylaundry_group_id')
  const showNav = group ? true : groupLoading && hadGroup
  const stillLoading = authLoading || groupLoading
  const location = useLocation()
  const tour = useTour()

  // Auto-start tour for first-time users once they're on the chores page with a group
  useEffect(() => {
    if (!stillLoading && group && !tour.completed && !tour.active && location.pathname === '/chores') {
      const t = setTimeout(() => tour.start(), 500)
      return () => clearTimeout(t)
    }
  }, [stillLoading, group, tour.completed, tour.active, location.pathname])

  // Listen for manual tour replay from profile page
  useEffect(() => {
    const handler = () => tour.start()
    window.addEventListener('start-tour', handler)
    return () => window.removeEventListener('start-tour', handler)
  }, [tour.start])

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
      <AppTour
        active={tour.visible}
        step={tour.step}
        onNext={tour.next}
        onPrev={tour.prev}
        onFinish={tour.finish}
        onDismiss={tour.dismiss}
        onTapTarget={tour.beginWait}
      />
    </div>
  )
}

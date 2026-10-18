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
  const { start: startTour } = tour

  // Auto-start tour for first-time users once they're on the chores page with a group
  useEffect(() => {
    if (
      !stillLoading &&
      group &&
      !tour.completed &&
      !tour.active &&
      location.pathname === '/chores'
    ) {
      const t = setTimeout(() => startTour(), 500)
      return () => clearTimeout(t)
    }
  }, [stillLoading, group, tour.completed, tour.active, location.pathname, startTour])

  // Listen for manual tour replay from profile page
  useEffect(() => {
    const handler = () => startTour()
    window.addEventListener('start-tour', handler)
    return () => window.removeEventListener('start-tour', handler)
  }, [startTour])

  if (stillLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-brutal-yellow">
        <img src="/logo.png" alt="Dirty Laundry" className="mb-6 h-auto w-48" />
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {showNav && <SideNav />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main
          className={`flex-1 overflow-y-auto overscroll-contain ${showNav ? 'pb-36 md:pb-0' : ''}`}
        >
          <div className="md:mx-auto md:max-w-2xl">
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

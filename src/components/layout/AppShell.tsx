import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Onboarding } from '@/components/Onboarding'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { useGroup } from '@/context/GroupContext'

export function AppShell() {
  useRealtime()
  const { group, loading } = useGroup()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brutal-yellow">
        <h1 className="font-mono text-4xl font-bold text-brutal-black animate-pulse">
          DIRTY LAUNDRY
        </h1>
      </div>
    )
  }

  if (!group) {
    return <Onboarding />
  }

  return (
    <div className="h-screen flex flex-col">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

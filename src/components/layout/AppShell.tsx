import { useRef, useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { useGroup } from '@/context/GroupContext'
import { useQueryClient } from '@tanstack/react-query'

export function AppShell() {
  useRealtime()
  const { group, loading, refreshMembers } = useGroup()
  const queryClient = useQueryClient()
  const mainRef = useRef<HTMLElement>(null)
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const touchStartY = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (mainRef.current && mainRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    } else {
      touchStartY.current = 0
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartY.current) return
    const diff = e.touches[0].clientY - touchStartY.current
    if (diff > 0) {
      setPulling(true)
      setPullDistance(Math.min(diff * 0.4, 60))
    }
  }, [])

  const onTouchEnd = useCallback(async () => {
    if (pullDistance > 40) {
      await queryClient.invalidateQueries()
      await refreshMembers()
    }
    setPulling(false)
    setPullDistance(0)
    touchStartY.current = 0
  }, [pullDistance, queryClient, refreshMembers])

  return (
    <div className="h-screen flex flex-col">
      <main
        ref={mainRef}
        className={`flex-1 overflow-y-auto ${group ? 'pb-20' : ''}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {pulling && pullDistance > 10 && (
          <div className="flex justify-center py-2" style={{ height: pullDistance }}>
            <div className={`w-6 h-6 border-3 border-brutal-black border-t-brutal-lime ${pullDistance > 40 ? 'animate-spin' : ''}`} />
          </div>
        )}
        <Outlet />
      </main>
      {group && !loading && <BottomNav />}
    </div>
  )
}

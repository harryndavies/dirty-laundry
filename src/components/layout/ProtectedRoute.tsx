import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/Spinner'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-brutal-yellow">
        <img src="/logo.png" alt="Dirty Laundry" className="w-48 h-auto" />
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) return <Navigate to="/auth" replace />

  return <>{children}</>
}

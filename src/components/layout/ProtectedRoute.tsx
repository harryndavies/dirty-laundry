import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brutal-yellow">
        <h1 className="font-mono text-4xl font-bold text-brutal-black animate-pulse">
          DIRTY LAUNDRY
        </h1>
      </div>
    )
  }

  if (!session) return <Navigate to="/auth" replace />

  return <>{children}</>
}

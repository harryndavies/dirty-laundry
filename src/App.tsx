import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { GroupProvider } from '@/context/GroupContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ToastContainer } from '@/components/ui/Toast'
import { AuthPage } from '@/pages/AuthPage'
import { ChoresPage } from '@/pages/ChoresPage'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { GroupPage } from '@/pages/GroupPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ActivityPage } from '@/pages/ActivityPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <GroupProvider>
            <ToastContainer />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/chores" element={<ChoresPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/group" element={<GroupPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/chores" replace />} />
            </Routes>
          </GroupProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

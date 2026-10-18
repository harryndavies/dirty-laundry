import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { GroupProvider } from '@/context/GroupContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ToastContainer } from '@/components/ui/Toast'
import { InstallPrompt } from '@/components/ui/InstallPrompt'
import { AuthPage } from '@/pages/AuthPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { ChoresPage } from '@/pages/ChoresPage'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { GroupPage } from '@/pages/GroupPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ActivityPage } from '@/pages/ActivityPage'
import { RoulettePage } from '@/pages/RoulettePage'
import { WeeklyReportPage } from '@/pages/WeeklyReportPage'
import { WrappedPage } from '@/pages/WrappedPage'
import { PlantPage } from '@/pages/PlantPage'

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
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <GroupProvider>
              <ToastContainer />
              <InstallPrompt />
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                  path="/wrapped"
                  element={
                    <ProtectedRoute>
                      <WrappedPage />
                    </ProtectedRoute>
                  }
                />
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
                  <Route path="/roulette" element={<RoulettePage />} />
                  <Route path="/report" element={<WeeklyReportPage />} />
                  <Route path="/group" element={<GroupPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/plant" element={<PlantPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/chores" replace />} />
              </Routes>
            </GroupProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App

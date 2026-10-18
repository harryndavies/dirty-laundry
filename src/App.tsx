import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { GroupProvider } from '@/context/GroupContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ToastContainer } from '@/components/ui/Toast'
import { InstallPrompt } from '@/components/ui/InstallPrompt'
import { PageFallback } from '@/components/ui/PageFallback'
import { AuthPage } from '@/pages/AuthPage'
import { ChoresPage } from '@/pages/ChoresPage'
import { GroupPage } from '@/pages/GroupPage'

// Where people land (signing in, joining a household, the chore list) loads up front;
// every other page is fetched the first time it is opened.
const LeaderboardPage = lazy(() =>
  import('@/pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })),
)
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const ActivityPage = lazy(() =>
  import('@/pages/ActivityPage').then((m) => ({ default: m.ActivityPage })),
)
const RoulettePage = lazy(() =>
  import('@/pages/RoulettePage').then((m) => ({ default: m.RoulettePage })),
)
const WeeklyReportPage = lazy(() =>
  import('@/pages/WeeklyReportPage').then((m) => ({ default: m.WeeklyReportPage })),
)
const WrappedPage = lazy(() =>
  import('@/pages/WrappedPage').then((m) => ({ default: m.WrappedPage })),
)
const PlantPage = lazy(() => import('@/pages/PlantPage').then((m) => ({ default: m.PlantPage })))
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)

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
              <Suspense fallback={<PageFallback />}>
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
              </Suspense>
            </GroupProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App

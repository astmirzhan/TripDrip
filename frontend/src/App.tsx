import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AssistantPage } from './pages/AssistantPage'
import { ChatsPage } from './pages/ChatsPage'
import { HomePage } from './pages/HomePage'
import { MapPage } from './pages/MapPage'
import { PartnerPage } from './pages/PartnerPage'
import { PhrasebookPage } from './pages/PhrasebookPage'
import { ProfilePage } from './pages/ProfilePage'
import { QonaqPage } from './pages/QonaqPage'
import { RouteCompletePage } from './pages/RouteCompletePage'
import { RoutePage } from './pages/RoutePage'
import { ShowToLocalPage } from './pages/ShowToLocalPage'
import { SignUpPage } from './pages/SignUpPage'
import { StartPage } from './pages/StartPage'
import { VerifyPage } from './pages/VerifyPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
})

function RequireAuth({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoading } = useAuth()
  if (isLoading) return null
  return isSignedIn ? children : <Navigate to="/" replace />
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoading } = useAuth()
  if (isLoading) return null
  return isSignedIn ? <Navigate to="/home" replace /> : children
}

/** Partners land in their cabinet instead of the guest home screen. */
function HomeOrCabinet() {
  const { user } = useAuth()
  return user?.role === 'partner' ? <Navigate to="/partner" replace /> : <HomePage />
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<GuestOnly><StartPage /></GuestOnly>} />
            <Route path="/signup" element={<GuestOnly><SignUpPage mode="signup" /></GuestOnly>} />
            <Route path="/login" element={<GuestOnly><SignUpPage mode="login" /></GuestOnly>} />
            <Route path="/verify" element={<RequireAuth><VerifyPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/home" element={<RequireAuth><HomeOrCabinet /></RequireAuth>} />
            <Route path="/partner" element={<RequireAuth><PartnerPage /></RequireAuth>} />
            <Route path="/phrasebook" element={<PhrasebookPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/phrasebook/:phraseId" element={<ShowToLocalPage />} />
            <Route path="/qonaq" element={<RequireAuth><QonaqPage /></RequireAuth>} />
            <Route path="/map" element={<RequireAuth><MapPage /></RequireAuth>} />
            <Route path="/chats" element={<RequireAuth><ChatsPage /></RequireAuth>} />
            <Route path="/chats/:chatId" element={<RequireAuth><ChatsPage /></RequireAuth>} />
            <Route path="/route" element={<RequireAuth><RoutePage /></RequireAuth>} />
            <Route path="/route/complete" element={<RequireAuth><RouteCompletePage /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

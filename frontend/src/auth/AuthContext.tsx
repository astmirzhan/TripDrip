import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, tokens } from '../api/client'
import { keys, useMe } from '../api/hooks'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../api/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isSignedIn: boolean
  register: (body: RegisterRequest) => Promise<User>
  login: (body: LoginRequest) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [hasToken, setHasToken] = useState(() => !!tokens.access)
  const me = useMe(hasToken)

  useEffect(() => {
    const unsubscribe = tokens.onClear(() => {
      setHasToken(false)
      qc.clear()
    })
    return () => {
      unsubscribe()
    }
  }, [qc])

  const finish = useCallback(
    (auth: AuthResponse) => {
      tokens.save(auth)
      qc.setQueryData(keys.me, auth.user)
      setHasToken(true)
      return auth.user
    },
    [qc],
  )

  const value = useMemo<AuthState>(
    () => ({
      user: hasToken ? (me.data ?? null) : null,
      isLoading: hasToken && me.isPending,
      isSignedIn: hasToken && !!me.data,
      register: async (body) =>
        finish(await api<AuthResponse>('/auth/register', { method: 'POST', body, auth: false })),
      login: async (body) => finish(await api<AuthResponse>('/auth/login', { method: 'POST', body, auth: false })),
      logout: () => tokens.clear(),
    }),
    [hasToken, me.data, me.isPending, finish],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

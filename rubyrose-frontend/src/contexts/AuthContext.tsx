import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, tokenStorage } from '@/lib/api'
import type { User } from '@/lib/types'

interface AuthState {
  user: User | null
  isLoggedIn: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

interface LoginResponse {
  token: string
  user: User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasToken, setHasToken] = useState(() => Boolean(tokenStorage.get()))

  const refresh = useCallback(async () => {
    if (!tokenStorage.get()) return
    try {
      const me = await api.get<User>('/api/auth/me')
      setUser(me)
    } catch {
      tokenStorage.clear()
      setUser(null)
      setHasToken(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const data = await api.post<LoginResponse>('/api/auth/login', { email, password })
      tokenStorage.set(data.token)
      setUser(data.user)
      setHasToken(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
    setHasToken(false)
  }, [])

  useEffect(() => {
    if (hasToken && !user) {
      refresh()
    }
  }, [hasToken, user, refresh])

  const value = useMemo<AuthState>(
    () => ({ user, isLoggedIn: hasToken, isLoading, login, logout, refresh }),
    [user, hasToken, isLoading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

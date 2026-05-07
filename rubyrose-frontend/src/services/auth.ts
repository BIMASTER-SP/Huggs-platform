import { api } from '@/lib/api'
import type { User } from '@/lib/types'

export interface LoginResponse {
  token: string
  user: User
}

export const authService = {
  me: () => api.get<User>('/api/auth/me'),
  login: (email: string, password: string) => api.post<LoginResponse>('/api/auth/login', { email, password }),
  logout: () => Promise.resolve(),  // client-side only — clears local token via AuthContext
}

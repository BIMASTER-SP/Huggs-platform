import { Navigate, useLocation } from 'react-router-dom'
import { tokenStorage } from '@/lib/api'

/**
 * Gates a route behind authentication. Reads the token from localStorage
 * (same key written by AuthContext) so it works during the transition where
 * MainApp still manages its own auth state.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const token = tokenStorage.get()
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}

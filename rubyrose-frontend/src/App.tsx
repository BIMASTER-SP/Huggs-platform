import { Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import MainApp from './MainApp'

/**
 * Top-level router shell.
 *
 * `/login` is its own route. Everything else (user pages and admin sub-pages)
 * is rendered through MainApp behind ProtectedRoute. MainApp itself derives
 * the current "page" discriminator from `useLocation()` via `lib/routes.ts`,
 * so navigation now uses real URLs (deep-linkable, refresh-safe, browser
 * back/forward works).
 */
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App

import { Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import MainApp from './MainApp'

/**
 * Top-level router shell.
 *
 * Today MainApp is still a monolith with its own internal page state machine.
 * This shell separates the only meaningful URL boundary that exists right now:
 * `/login` is its own page, everything else goes through MainApp behind ProtectedRoute.
 *
 * Subsequent PRs will progressively pull pages out of MainApp and give them
 * real routes (e.g. `/`, `/catalogo`, `/pedidos`, `/admin/*`).
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

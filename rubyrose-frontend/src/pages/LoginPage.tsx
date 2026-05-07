import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError } from '@/lib/api'

export function LoginPage() {
  const { login, isLoggedIn, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isLoggedIn) return <Navigate to="/" replace />

  const handleSubmit = async () => {
    setError('')
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else if (err instanceof Error) setError(err.message)
      else setError('Erro no login')
    }
  }

  return (
    <div className="app-container">
      <div className="main-scroll">
        <div className="min-h-full flex flex-col justify-center px-6 py-12 bg-brand-gradient-vertical">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Ruby Rose</h1>
            <p className="text-white/80 text-sm mt-1">Plataforma B2B para Vendedoras</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Entrar na conta</h2>
            <p className="text-sm text-gray-500 mb-4">Use suas credenciais de vendedora</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full py-3 px-4 bg-gray-50 rounded-xl text-sm border border-gray-200 mb-3 focus:outline-none focus:border-brand-400"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full py-3 px-4 bg-gray-50 rounded-xl text-sm border border-gray-200 mb-4 focus:outline-none focus:border-brand-400"
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-3.5 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">Acesso restrito a vendedoras cadastradas</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-white/60 text-xs">Teste: ana@email.com / ana123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

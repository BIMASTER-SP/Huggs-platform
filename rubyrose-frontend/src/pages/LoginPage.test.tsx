import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { LoginPage } from './LoginPage'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('renders the form', () => {
    renderLogin()
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('submits credentials and POSTs to /api/auth/login', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          status: 'success',
          data: {
            token: 'jwt-from-test',
            user: { id: 'u1', email: 'ana@email.com', name: 'Ana', role: 'promotora', status: 'active' },
          },
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderLogin()
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'ana@email.com')
    await userEvent.type(screen.getByPlaceholderText(/senha/i), 'ana123')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/auth\/login$/)
    expect(JSON.parse(init.body as string)).toEqual({ email: 'ana@email.com', password: 'ana123' })
  })

  it('shows the API error message when login fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ status: 'error', message: 'Email ou senha incorretos' }),
      }),
    )

    renderLogin()
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'ana@email.com')
    await userEvent.type(screen.getByPlaceholderText(/senha/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByText(/email ou senha incorretos/i)).toBeInTheDocument()
    })
  })
})

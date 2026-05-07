import { describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { tokenStorage } from '@/lib/api'

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthContext', () => {
  it('starts logged out when no token in storage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('login stores the token and sets the user', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          status: 'success',
          data: {
            token: 'jwt-token-123',
            user: { id: 'u1', email: 'ana@email.com', name: 'Ana', role: 'promotora', status: 'active' },
          },
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.login('ana@email.com', 'ana123')
    })

    expect(tokenStorage.get()).toBe('jwt-token-123')
    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.user?.email).toBe('ana@email.com')
  })

  it('logout clears the token and the user', async () => {
    tokenStorage.set('preexisting')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: { id: 'u1', email: 'x@y', name: 'X', role: 'promotora', status: 'active' } }),
      }),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.user).not.toBeNull())

    act(() => result.current.logout())

    expect(tokenStorage.get()).toBeNull()
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
  })
})

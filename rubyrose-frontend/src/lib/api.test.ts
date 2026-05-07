import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, tokenStorage } from './api'

describe('lib/api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('attaches Authorization: Bearer when a token is stored', async () => {
    tokenStorage.set('jwt-token-here')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'success', data: { x: 1 } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/api/protected')

    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = init.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer jwt-token-here')
  })

  it('unwraps the `data` envelope from successful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', message: 'ok', data: { points: 42 } }),
      }),
    )

    const result = await api.get<{ points: number }>('/api/dashboard')
    expect(result).toEqual({ points: 42 })
  })

  it('throws ApiError with the backend message on 4xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ status: 'error', message: 'Email ja cadastrado' }),
      }),
    )

    await expect(api.post('/api/auth/register', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Email ja cadastrado',
    })
  })

  it('clears the token and redirects to /login on 401', async () => {
    tokenStorage.set('expired-token')
    const assignSpy = vi.fn()
    vi.stubGlobal('window', { ...window, location: { assign: assignSpy, pathname: '/' } })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ status: 'error', message: 'Token expirado' }),
      }),
    )

    await expect(api.get('/api/auth/me')).rejects.toBeInstanceOf(ApiError)
    expect(tokenStorage.get()).toBeNull()
    expect(assignSpy).toHaveBeenCalledWith('/login')
  })
})

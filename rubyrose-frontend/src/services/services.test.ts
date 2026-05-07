import { afterEach, describe, expect, it, vi } from 'vitest'
import { authService, catalogService, lgpdService, orderService } from '.'
import { tokenStorage } from '@/lib/api'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

function mockJsonResponse(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: () => Promise.resolve({ status: status < 400 ? 'success' : 'error', data }),
  })
}

describe('authService', () => {
  it('login POSTs to /api/auth/login', async () => {
    const fetchMock = mockJsonResponse({ token: 't', user: { id: '1', email: 'a@b' } })
    vi.stubGlobal('fetch', fetchMock)

    await authService.login('a@b', 'pw')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/auth\/login$/)
    expect(init.method).toBe('POST')
  })

  it('me GETs /api/auth/me with the stored token', async () => {
    tokenStorage.set('jwt-here')
    const fetchMock = mockJsonResponse({ id: '1', email: 'a@b' })
    vi.stubGlobal('fetch', fetchMock)

    await authService.me()
    const [, init] = fetchMock.mock.calls[0]
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer jwt-here')
  })
})

describe('catalogService', () => {
  it('list without category does not append query string', async () => {
    const fetchMock = mockJsonResponse([])
    vi.stubGlobal('fetch', fetchMock)

    await catalogService.list()
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/catalog$/)
  })

  it('list with category url-encodes the param', async () => {
    const fetchMock = mockJsonResponse([])
    vi.stubGlobal('fetch', fetchMock)

    await catalogService.list('Skincare')
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/catalog\?category=Skincare$/)
  })

  it('list ignores the "Todas" placeholder', async () => {
    const fetchMock = mockJsonResponse([])
    vi.stubGlobal('fetch', fetchMock)

    await catalogService.list('Todas')
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/catalog$/)
  })
})

describe('orderService', () => {
  it('create POSTs items to /api/orders', async () => {
    const fetchMock = mockJsonResponse({ order: { id: 'o1' } })
    vi.stubGlobal('fetch', fetchMock)

    await orderService.create([{ product_id: 1, quantity: 6 }])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/orders$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ items: [{ product_id: 1, quantity: 6 }] })
  })
})

describe('lgpdService', () => {
  it('deleteAccount uses DELETE', async () => {
    const fetchMock = mockJsonResponse({})
    vi.stubGlobal('fetch', fetchMock)

    await lgpdService.deleteAccount()
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })
})

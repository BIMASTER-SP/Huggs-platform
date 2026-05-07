import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CartProvider, useCart } from './CartContext'
import { ToastProvider } from './ToastContext'
import type { Product } from '@/lib/types'

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>{children}</CartProvider>
    </ToastProvider>
  )
}

const product: Product = {
  id: 1,
  ean: '7896522800012',
  name: 'Base Liquida HD',
  image: 'base',
  price: 39.9,
  category: 'Maquiagem',
  description: '',
  min_order: 6,
  stock_available: true,
}

describe('CartContext', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    expect(result.current.items).toEqual([])
    expect(result.current.count).toBe(0)
    expect(result.current.total).toBe(0)
  })

  it('addToCart respects min_order on first add and accumulates on repeats', () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    act(() => result.current.addToCart(product))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(6)

    act(() => result.current.addToCart(product))
    expect(result.current.items[0].quantity).toBe(12)
    expect(result.current.count).toBe(12)
    expect(result.current.total).toBeCloseTo(39.9 * 12)
  })

  it('updateQty increments and clamps at min_order', () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    act(() => result.current.addToCart(product))
    act(() => result.current.updateQty(1, 1))
    expect(result.current.items[0].quantity).toBe(7)
    act(() => result.current.updateQty(1, -1))
    expect(result.current.items[0].quantity).toBe(6)
    // Trying to go below min_order keeps the previous value (the UI exposes a separate
    // "remove" action; updateQty itself never removes).
    act(() => result.current.updateQty(1, -1))
    expect(result.current.items[0].quantity).toBe(6)

    act(() => result.current.remove(1))
    expect(result.current.items).toHaveLength(0)
  })

  it('clear empties the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    act(() => result.current.addToCart(product))
    act(() => result.current.clear())
    expect(result.current.items).toHaveLength(0)
    expect(result.current.count).toBe(0)
  })

  it('submit posts to /api/orders and clears on success', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    act(() => result.current.addToCart(product))

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          status: 'success',
          message: 'ok',
          data: { order: { id: 'order-abc', points_earned: 10 }, points_earned: 10 },
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    let response: any
    await act(async () => {
      response = await result.current.submit()
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/orders$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ items: [{ product_id: 1, quantity: 6 }] })
    expect(response).toMatchObject({ order: { id: 'order-abc' } })
    expect(result.current.items).toHaveLength(0)
  })
})

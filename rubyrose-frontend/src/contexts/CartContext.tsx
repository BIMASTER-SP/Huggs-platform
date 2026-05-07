import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import type { CartItem, Product } from '@/lib/types'
import { useToast } from './ToastContext'

interface CartApi {
  items: CartItem[]
  count: number
  total: number
  addToCart: (product: Product) => void
  updateQty: (productId: number, delta: number) => void
  remove: (productId: number) => void
  clear: () => void
  submit: () => Promise<{ order: unknown; points_earned: number } | null>
}

const CartContext = createContext<CartApi | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const { showToast } = useToast()

  const addToCart = useCallback(
    (product: Product) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.product_id === product.id)
        if (existing) {
          return prev.map((i) =>
            i.product_id === product.id ? { ...i, quantity: i.quantity + product.min_order } : i,
          )
        }
        return [
          ...prev,
          {
            product_id: product.id,
            name: product.name,
            price: product.price,
            quantity: product.min_order,
            min_order: product.min_order,
            image: product.image,
          },
        ]
      })
      showToast(`${product.name} adicionado ao carrinho`, 'success')
    },
    [showToast],
  )

  const updateQty = useCallback((productId: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== productId) return i
          const next = i.quantity + delta
          return next >= i.min_order ? { ...i, quantity: next } : i
        })
        .filter((i) => i.quantity >= i.min_order),
    )
  }, [])

  const remove = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const submit = useCallback(async () => {
    if (items.length === 0) return null
    try {
      const result = await api.post<{ order: unknown; points_earned: number }>('/api/orders', {
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      })
      clear()
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar pedido'
      showToast(msg, 'error')
      return null
    }
  }, [items, clear, showToast])

  const total = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items])
  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])

  const value = useMemo<CartApi>(
    () => ({ items, count, total, addToCart, updateQty, remove, clear, submit }),
    [items, count, total, addToCart, updateQty, remove, clear, submit],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}

import { api } from '@/lib/api'
import type { Order } from '@/lib/types'

export interface CreateOrderItem {
  product_id: number
  quantity: number
}

export interface CreateOrderResponse {
  order: Order
  points_earned?: number
}

export const orderService = {
  list: () => api.get<Order[]>('/api/orders'),
  create: (items: CreateOrderItem[]) => api.post<CreateOrderResponse>('/api/orders', { items }),
  get: (id: string) => api.get<Order>(`/api/orders/${id}`),
}

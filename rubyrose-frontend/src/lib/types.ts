/**
 * Shared TypeScript types for API payloads.
 * Loose by design until the backend ships an OpenAPI client.
 */

export interface ApiResponse<T = unknown> {
  status?: 'success' | 'error'
  message?: string
  data?: T
  detail?: string
  pagination?: PaginationMeta
}

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'promotora' | 'gerente_loja' | 'admin' | 'vendedor_ruby'
  status: 'pendente' | 'active' | 'blocked'
  store_cnpj?: string | null
  points?: number
  level?: 'Bronze' | 'Prata' | 'Ouro' | 'Admin' | 'Vendedor'
  total_orders?: number
  total_order_value?: number
  challenges_completed?: number
  receipts_count?: number
}

export interface Product {
  id: number
  ean: string
  name: string
  image: string
  price: number
  category: string
  description?: string
  min_order: number
  stock_available: boolean
}

export interface CartItem {
  product_id: number
  name: string
  price: number
  quantity: number
  min_order: number
  image: string
}

export interface OrderItem {
  product_id: number
  name: string
  quantity: number
  unit_price: number
  total: number
}

export type OrderStatus =
  | 'enviado'
  | 'aprovado'
  | 'em_separacao'
  | 'em_transito'
  | 'entregue'
  | 'cancelado'

export interface Order {
  id: string
  user_id: string
  store_cnpj: string
  store_name: string
  items: OrderItem[]
  total_value: number
  points_earned: number
  status: OrderStatus
  vendedor_ruby_id?: string | null
  created_at: string
  updated_at: string
}

export interface Banner {
  id: string
  title: string
  subtitle: string
  description?: string
  image_url: string | null
  color: 'rose' | 'purple' | 'emerald' | 'pink' | string
  highlight: boolean
  position: number
  active: boolean
}

export interface Challenge {
  id: string
  title: string
  description: string
  type: 'vitrine' | 'pedido' | 'venda' | 'indicacao' | 'social' | 'vendas'
  reward_kit_id: string | null
  points_reward: number
  goal: number
  progress?: number
  completed?: boolean
  active: boolean
  start_date: string
  end_date: string
}

export interface RewardKit {
  id: string
  name: string
  description: string
  points_cost: number
  image: string
  items: string[]
  available: boolean
}

export interface DashboardData {
  user: User
  store?: { name: string; address: string; city: string }
  total_orders: number
  total_order_value: number
  banners: Banner[]
  active_challenges: Challenge[]
  recent_orders: Order[]
}

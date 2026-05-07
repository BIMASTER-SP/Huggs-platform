/**
 * Service layer barrel.
 *
 * Components import typed service objects (`authService`, `orderService`, etc.)
 * instead of calling `apiFetch`/`api.get` directly. This isolates HTTP concerns
 * from rendering and gives one obvious place to add caching, retries, or to
 * swap the transport later.
 */

export { authService } from './auth'
export type { LoginResponse } from './auth'

export { catalogService } from './catalog'

export { orderService } from './orders'
export type { CreateOrderItem, CreateOrderResponse } from './orders'

export { lgpdService } from './lgpd'
export type { ConsentInput, PrivacyPolicy } from './lgpd'

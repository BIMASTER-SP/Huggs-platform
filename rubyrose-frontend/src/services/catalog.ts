import { api } from '@/lib/api'
import type { Product } from '@/lib/types'

export const catalogService = {
  list: (category?: string) => {
    const path = category && category !== 'Todas'
      ? `/api/catalog?category=${encodeURIComponent(category)}`
      : '/api/catalog'
    return api.get<Product[]>(path)
  },
  categories: () => api.get<{ categories: string[] }>('/api/catalog/categories'),
}

import { Search, BookOpen, ExternalLink, ShoppingBag, Plus, Minus } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'

interface Props {
  catalog: any[]
  categories: string[]
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
  fetchCatalog: (cat?: string) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export function CatalogoPage({ catalog, categories, selectedCategory, setSelectedCategory, fetchCatalog, searchQuery, setSearchQuery }: Props) {
  const { items: cartItems, addToCart, updateQty } = useCart()
  const filtered = searchQuery
    ? catalog.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : catalog

  return (
    <div className="animate-fade-in">
      <div className="bg-brand-600 px-4 pt-4 pb-5">
        <h2 className="text-white font-bold text-lg mb-3">Catalogo de Produtos</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-3 pl-4 pr-10 bg-white/20 rounded-xl text-white placeholder-white/60 text-sm focus:outline-none focus:bg-white/30"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
        </div>
      </div>

      <div className="px-4 pt-3">
        <a
          href="https://viewer.ipaper.io/ruby-rose-br/catalogo-interativo-ruby-rose/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-brand-50 to-rose-50 border border-brand-200 rounded-xl hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Catalogo Interativo</p>
              <p className="text-[10px] text-gray-500">Ruby Rose - 160 paginas</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-brand-600" />
        </a>
      </div>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => {
              setSelectedCategory(c)
              fetchCatalog(c)
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              c === selectedCategory ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        {filtered.map((p) => {
          const inCart = cartItems.find((i) => i.product_id === p.id)
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="h-28 bg-gradient-to-br from-brand-50 to-rose-50 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-brand-300" />
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-gray-800 line-clamp-2 h-8">{p.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{p.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-sm font-bold text-brand-600">R${p.price.toFixed(2)}</p>
                    <p className="text-[9px] text-gray-400">Min: {p.min_order} un</p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(p.id, -1)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-5 text-center">{inCart.quantity}</span>
                      <button onClick={() => updateQty(p.id, 1)} className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center">
                        <Plus className="w-3 h-3 text-brand-600" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(p)} className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

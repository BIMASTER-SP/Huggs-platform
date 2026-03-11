import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { Search, Home, Gamepad2, Banknote, Receipt, User, ChevronRight, Star, Gift, Users, Diamond, Percent, Truck, DollarSign, Trophy, Camera, Keyboard, X, Check, ShoppingBag, Tag, Sparkles, Heart, Award, Clock, ArrowRight, ScanLine } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type Page = 'inicio' | 'jogos' | 'pix' | 'notas' | 'conta'

interface ReceiptData {
  id: string
  store: { name: string; city: string; state: string; cnpj: string }
  items: Array<{
    name: string; quantity: number; unit_price: number; total: number
    is_ruby_rose: boolean; cashback_percent: number; cashback_value?: number; category?: string
  }>
  total_value: number
  ruby_rose_items: number
  cashback_total: number
  points_earned: number
  submitted_at: string
  status: string
  payment_method: string
}

interface LookupResult {
  receipt: ReceiptData
  message: string
  cashback_earned: number
  points_earned: number
}

function App() {
  const [page, setPage] = useState<Page>('inicio')
  const [user, setUser] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [offers, setOffers] = useState<any>({ banners: [] })
  const [services, setServices] = useState<any[]>([])
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [rewards, setRewards] = useState<any[]>([])
  const [missions, setMissions] = useState<any[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('manual')
  const [accessKey, setAccessKey] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentBanner, setCurrentBanner] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const [u, p, c, o, s, rec, rew, m] = await Promise.all([
        fetch(`${API}/api/user`).then(r => r.json()),
        fetch(`${API}/api/products`).then(r => r.json()),
        fetch(`${API}/api/categories`).then(r => r.json()),
        fetch(`${API}/api/offers`).then(r => r.json()),
        fetch(`${API}/api/services`).then(r => r.json()),
        fetch(`${API}/api/receipts`).then(r => r.json()),
        fetch(`${API}/api/rewards`).then(r => r.json()),
        fetch(`${API}/api/missions`).then(r => r.json()),
      ])
      setUser(u); setProducts(p); setCategories(c); setOffers(o)
      setServices(s); setReceipts(rec.receipts || []); setRewards(rew); setMissions(m)
    } catch (e) { console.error('Fetch error:', e) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (offers.banners?.length > 1) {
      const t = setInterval(() => setCurrentBanner(b => (b + 1) % offers.banners.length), 4000)
      return () => clearInterval(t)
    }
  }, [offers.banners])

  const fetchProducts = async (cat: string) => {
    setSelectedCategory(cat)
    const url = cat === 'Todas' ? `${API}/api/products` : `${API}/api/products?category=${encodeURIComponent(cat)}`
    const p = await fetch(url).then(r => r.json())
    setProducts(p)
  }

  const submitCupom = async () => {
    if (!accessKey.trim()) return
    setScanning(true)
    try {
      const res = await fetch(`${API}/api/cupom/lookup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_key: accessKey })
      })
      const data: LookupResult = await res.json()
      setLookupResult(data)
      setUser((u: any) => u ? { ...u, points: u.points + data.points_earned, cashback_balance: +(u.cashback_balance + data.cashback_earned).toFixed(2) } : u)
      setReceipts(prev => [data.receipt, ...prev])
    } catch (e) { console.error(e) }
    setScanning(false)
  }

  const filteredProducts = searchQuery
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : products

  const serviceIcons: Record<string, any> = { gamepad: Gamepad2, diamond: Diamond, gift: Gift, users: Users }
  const rewardIcons: Record<string, any> = { percent: Percent, truck: Truck, gift: Gift, 'dollar-sign': DollarSign, star: Star, palette: Sparkles }

  // ========== PAGES ==========

  const HomePage = () => (
    <div className="pb-4 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-rose-500 px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Ola,</p>
            <h1 className="text-white font-bold text-lg">{user?.name || 'Carregando...'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              <span className="text-white font-semibold text-sm">{user?.points?.toLocaleString('pt-BR')}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produtos com cashback..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-gray-700 text-sm placeholder-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>
      </div>

      {/* Cashback Balance Card */}
      <div className="mx-4 -mt-4 bg-white rounded-2xl shadow-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-medium">Seu cashback</p>
            <p className="text-2xl font-bold text-gray-800">R$ {user?.cashback_balance?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs font-medium">Total acumulado</p>
            <p className="text-lg font-semibold text-green-600">R$ {user?.total_cashback_earned?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl py-2.5 text-center">
            <span className="text-white font-semibold text-sm">Resgatar cashback</span>
          </div>
        </div>
      </div>

      {/* Quick Services */}
      <div className="px-4 mb-5">
        <div className="grid grid-cols-4 gap-3">
          {services.map(s => {
            const Icon = serviceIcons[s.icon] || Gift
            return (
              <div key={s.id} className="flex flex-col items-center">
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center mb-1.5 shadow-sm">
                  <Icon className="w-6 h-6 text-purple-600" />
                  {s.badge && (
                    <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${s.badge_color === 'green' ? 'bg-green-500' : 'bg-pink-500'}`}>
                      {s.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-600 text-center leading-tight">{s.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Banners Carousel */}
      {offers.banners?.length > 0 && (
        <div className="px-4 mb-5">
          <div className="relative overflow-hidden rounded-2xl">
            {offers.banners.map((b: any, i: number) => (
              <div key={b.id} className={`transition-all duration-500 ${i === currentBanner ? 'block' : 'hidden'}`}>
                <div className={`p-5 rounded-2xl ${b.color === 'purple' ? 'bg-gradient-to-r from-purple-600 to-purple-800' : b.color === 'pink' ? 'bg-gradient-to-r from-pink-500 to-rose-600' : 'bg-gradient-to-r from-rose-400 to-pink-600'}`}>
                  {b.highlight && <span className="bg-yellow-400 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-full">DESTAQUE</span>}
                  <h3 className="text-white text-xl font-bold mt-1">{b.title}</h3>
                  <p className="text-white/90 text-sm">{b.subtitle}</p>
                  <p className="text-white/70 text-xs mt-1">{b.description}</p>
                </div>
              </div>
            ))}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {offers.banners.map((_: any, i: number) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentBanner ? 'bg-white w-5' : 'bg-white/50'}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enviar Nota Button */}
      <div className="px-4 mb-5">
        <button
          onClick={() => { setPage('notas'); setShowScanner(true) }}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 flex items-center gap-3 shadow-lg active:scale-[0.98] transition-transform"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <ScanLine className="w-6 h-6 text-white" />
          </div>
          <div className="text-left flex-1">
            <p className="text-white font-bold text-base">Enviar nota fiscal</p>
            <p className="text-white/80 text-xs">Escaneie o QR Code e ganhe cashback</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/80" />
        </button>
      </div>

      {/* Categories */}
      <div className="px-4 mb-3">
        <h2 className="text-gray-800 font-bold text-base mb-3">Categorias</h2>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {categories.map(c => (
            <button key={c} onClick={() => fetchProducts(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === c ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
            >{c}</button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gray-800 font-bold text-base">Produtos com cashback</h2>
          <span className="text-purple-600 text-sm font-medium">Ver todos</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.slice(0, 6).map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-50">
              <div className="w-full h-24 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl mb-2 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-purple-300" />
              </div>
              <p className="text-gray-800 text-xs font-medium leading-tight mb-1 line-clamp-2">{p.name}</p>
              <p className="text-gray-500 text-[10px] mb-1">{p.category}</p>
              <div className="flex items-center justify-between">
                <p className="text-gray-800 font-bold text-sm">R$ {p.price?.toFixed(2)}</p>
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{p.cashback_percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missions */}
      <div className="px-4 mb-6">
        <h2 className="text-gray-800 font-bold text-base mb-3">Missoes</h2>
        {missions.slice(0, 3).map(m => (
          <div key={m.id} className="bg-white rounded-xl p-3 mb-2 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-gray-800 text-sm font-medium">{m.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all" style={{ width: `${(m.progress / m.total) * 100}%` }} />
                </div>
                <span className="text-[10px] text-gray-500">{m.progress}/{m.total}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-yellow-500 text-xs font-bold">+{m.points_reward}</span>
              <p className="text-[9px] text-gray-400">pts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const NotasPage = () => (
    <div className="pb-4 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-rose-500 px-4 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-white font-bold text-xl mb-1">Minhas Notas</h1>
        <p className="text-white/80 text-sm">Envie seus cupons fiscais e ganhe cashback</p>
        <div className="mt-4 flex gap-3">
          <div className="flex-1 bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-white text-2xl font-bold">{receipts.length}</p>
            <p className="text-white/70 text-xs">Notas enviadas</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-white text-2xl font-bold">R$ {receipts.reduce((s, r) => s + r.cashback_total, 0).toFixed(2)}</p>
            <p className="text-white/70 text-xs">Cashback total</p>
          </div>
        </div>
      </div>

      {/* Send Receipt Button */}
      <div className="px-4 -mt-4 mb-4">
        <button
          onClick={() => { setShowScanner(true); setLookupResult(null); setAccessKey('') }}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 flex items-center gap-3 shadow-lg active:scale-[0.98] transition-transform"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div className="text-left flex-1">
            <p className="text-white font-bold">Enviar cupom fiscal</p>
            <p className="text-white/80 text-xs">Escaneie o QR Code da nota</p>
          </div>
          <ArrowRight className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* How it works */}
      <div className="px-4 mb-5">
        <h2 className="text-gray-800 font-bold text-base mb-3">Como funciona</h2>
        <div className="flex gap-3">
          {[
            { icon: Camera, text: 'Escaneie', desc: 'o QR Code da nota' },
            { icon: Search, text: 'Identificamos', desc: 'produtos Ruby Rose' },
            { icon: DollarSign, text: 'Cashback', desc: 'creditado na hora' },
          ].map((step, i) => (
            <div key={i} className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-purple-100 flex items-center justify-center">
                <step.icon className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-gray-800 text-xs font-semibold">{step.text}</p>
              <p className="text-gray-500 text-[10px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Receipt History */}
      <div className="px-4 mb-4">
        <h2 className="text-gray-800 font-bold text-base mb-3">Historico</h2>
        {receipts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma nota enviada ainda</p>
            <p className="text-gray-400 text-xs mt-1">Envie seu primeiro cupom fiscal!</p>
          </div>
        ) : (
          receipts.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${r.status === 'approved' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    {r.status === 'approved' ? <Check className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-yellow-600" />}
                  </div>
                  <div>
                    <p className="text-gray-800 text-sm font-semibold">{r.store.name}</p>
                    <p className="text-gray-400 text-[10px]">{r.store.city} - {r.store.state}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-600 font-bold text-sm">+R$ {r.cashback_total.toFixed(2)}</p>
                  <p className="text-yellow-500 text-[10px] font-medium">+{r.points_earned} pts</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-2 mt-1">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{r.items?.length || 0} itens | {r.ruby_rose_items} Ruby Rose</span>
                  <span>R$ {r.total_value.toFixed(2)}</span>
                </div>
                {r.items?.filter((i: any) => i.is_ruby_rose).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between mt-1.5 bg-pink-50 rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <Heart className="w-3 h-3 text-pink-500" />
                      <span className="text-xs text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-green-600 text-xs font-semibold">+R$ {item.cashback_value?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const ContaPage = () => (
    <div className="pb-4 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-rose-500 px-4 pt-6 pb-10 rounded-b-3xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">{user?.name}</h1>
            <p className="text-white/80 text-sm">{user?.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <Award className="w-3.5 h-3.5 text-yellow-300" />
              <span className="text-yellow-300 text-xs font-semibold">Nivel {user?.level}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-6 mb-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 text-center shadow-md">
            <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-gray-800 font-bold text-lg">{user?.points?.toLocaleString('pt-BR')}</p>
            <p className="text-gray-500 text-[10px]">Pontos</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-md">
            <DollarSign className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-gray-800 font-bold text-lg">R${user?.cashback_balance?.toFixed(0)}</p>
            <p className="text-gray-500 text-[10px]">Cashback</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-md">
            <Receipt className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-gray-800 font-bold text-lg">{user?.receipts_count}</p>
            <p className="text-gray-500 text-[10px]">Notas</p>
          </div>
        </div>
      </div>

      {/* Rewards Catalog */}
      <div className="px-4 mb-5">
        <h2 className="text-gray-800 font-bold text-base mb-3">Trocar pontos</h2>
        <div className="grid grid-cols-2 gap-3">
          {rewards.map(r => {
            const Icon = rewardIcons[r.icon] || Gift
            const canRedeem = (user?.points || 0) >= r.points_required
            return (
              <div key={r.id} className={`bg-white rounded-xl p-3 shadow-sm border ${canRedeem ? 'border-purple-100' : 'border-gray-100 opacity-70'}`}>
                <div className={`w-10 h-10 rounded-xl mb-2 flex items-center justify-center ${canRedeem ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  <Icon className={`w-5 h-5 ${canRedeem ? 'text-purple-600' : 'text-gray-400'}`} />
                </div>
                <p className="text-gray-800 text-xs font-medium mb-2 leading-tight">{r.name}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-semibold text-gray-700">{r.points_required}</span>
                  </div>
                  {canRedeem && (
                    <button className="bg-purple-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                      Trocar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Missions */}
      <div className="px-4 mb-4">
        <h2 className="text-gray-800 font-bold text-base mb-3">Missoes ativas</h2>
        {missions.map(m => (
          <div key={m.id} className="bg-white rounded-xl p-3 mb-2 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-800 text-sm font-medium">{m.name}</p>
              <span className="text-yellow-500 text-xs font-bold">+{m.points_reward} pts</span>
            </div>
            <p className="text-gray-500 text-xs mb-2">{m.description}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${Math.min((m.progress / m.total) * 100, 100)}%` }} />
              </div>
              <span className="text-xs text-gray-600 font-medium">{m.progress}/{m.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const JogosPage = () => (
    <div className="pb-4 animate-fade-in">
      <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-rose-500 px-4 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-white font-bold text-xl">Jogue e Ganhe</h1>
        <p className="text-white/80 text-sm mt-1">Acumule pontos se divertindo!</p>
      </div>
      <div className="px-4 mt-4">
        {[
          { name: 'Roleta da Sorte', desc: 'Gire e ganhe ate 500 pontos!', pts: '50-500', color: 'from-purple-500 to-pink-500' },
          { name: 'Quiz Ruby Rose', desc: 'Responda e ganhe pontos', pts: '100', color: 'from-pink-500 to-rose-500' },
          { name: 'Scratch Card', desc: 'Raspadinha premiada diaria', pts: '10-200', color: 'from-rose-500 to-orange-400' },
        ].map((game, i) => (
          <div key={i} className={`bg-gradient-to-r ${game.color} rounded-2xl p-4 mb-3 flex items-center gap-3`}>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Gamepad2 className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold">{game.name}</p>
              <p className="text-white/80 text-xs">{game.desc}</p>
            </div>
            <div className="text-right">
              <span className="text-yellow-300 font-bold text-sm">+{game.pts}</span>
              <p className="text-white/60 text-[10px]">pontos</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const PixPage = () => (
    <div className="pb-4 animate-fade-in">
      <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-rose-500 px-4 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-white font-bold text-xl">Pix</h1>
        <p className="text-white/80 text-sm mt-1">Resgate seu cashback via Pix</p>
      </div>
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-5 shadow-md text-center mb-4">
          <p className="text-gray-500 text-sm">Saldo disponivel</p>
          <p className="text-3xl font-bold text-gray-800 my-2">R$ {user?.cashback_balance?.toFixed(2)}</p>
          <button className="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold py-3 px-8 rounded-xl mt-2 w-full">
            Transferir via Pix
          </button>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-gray-800 font-semibold text-sm mb-3">Historico de resgates</h3>
          <div className="text-center py-6">
            <Banknote className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Nenhum resgate ainda</p>
          </div>
        </div>
      </div>
    </div>
  )

  // ========== SCANNER MODAL ==========
  const ScannerModal = () => (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end animate-fade-in" onClick={() => { setShowScanner(false); setLookupResult(null) }}>
      <div className="w-full bg-white rounded-t-3xl animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-gray-800 font-bold text-lg">Enviar cupom fiscal</h2>
          <button onClick={() => { setShowScanner(false); setLookupResult(null) }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {lookupResult ? (
          /* Result View */
          <div className="p-4">
            <div className="bg-green-50 rounded-2xl p-4 mb-4 text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-green-800 font-bold text-lg">Cupom processado!</h3>
              <p className="text-green-600 text-sm mt-1">{lookupResult.message}</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-4 mb-3">
              <p className="text-gray-500 text-xs mb-1">Loja</p>
              <p className="text-gray-800 font-semibold">{lookupResult.receipt.store.name}</p>
              <p className="text-gray-500 text-xs">{lookupResult.receipt.store.city} - {lookupResult.receipt.store.state}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-green-800 text-xl font-bold">R$ {lookupResult.cashback_earned.toFixed(2)}</p>
                <p className="text-green-600 text-xs">Cashback ganho</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-yellow-700 text-xl font-bold">+{lookupResult.points_earned}</p>
                <p className="text-yellow-600 text-xs">Pontos</p>
              </div>
            </div>

            <h4 className="text-gray-800 font-semibold text-sm mb-2">Produtos encontrados</h4>
            {lookupResult.receipt.items.map((item, i) => (
              <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg mb-1.5 ${item.is_ruby_rose ? 'bg-pink-50 border border-pink-100' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 flex-1">
                  {item.is_ruby_rose && <Heart className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />}
                  <div>
                    <p className="text-xs font-medium text-gray-800">{item.name}</p>
                    <p className="text-[10px] text-gray-500">{item.quantity}x R$ {item.unit_price.toFixed(2)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-800">R$ {item.total.toFixed(2)}</p>
                  {item.is_ruby_rose && <p className="text-[10px] text-green-600 font-medium">+R$ {item.cashback_value?.toFixed(2)}</p>}
                </div>
              </div>
            ))}

            <button
              onClick={() => { setShowScanner(false); setLookupResult(null); setAccessKey('') }}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold py-3 rounded-xl"
            >
              Fechar
            </button>
          </div>
        ) : (
          /* Input View */
          <div className="p-4">
            {/* Mode Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
              <button onClick={() => setScanMode('camera')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${scanMode === 'camera' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}>
                <Camera className="w-4 h-4" /> QR Code
              </button>
              <button onClick={() => setScanMode('manual')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${scanMode === 'manual' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}>
                <Keyboard className="w-4 h-4" /> Chave manual
              </button>
            </div>

            {scanMode === 'camera' ? (
              <div className="text-center">
                <div className="bg-gray-900 rounded-2xl h-64 flex items-center justify-center mb-4 relative overflow-hidden">
                  <div className="absolute inset-8 border-2 border-white/30 rounded-xl" />
                  <div className="absolute w-48 h-0.5 bg-green-400 animate-pulse top-1/2" />
                  <div className="text-center z-10">
                    <ScanLine className="w-16 h-16 text-white/40 mx-auto mb-2" />
                    <p className="text-white/60 text-sm">Aponte para o QR Code</p>
                    <p className="text-white/40 text-xs">da nota fiscal</p>
                  </div>
                </div>
                <p className="text-gray-500 text-xs mb-4">Camera nao disponivel no navegador web.<br/>Use a entrada manual abaixo.</p>
                <button onClick={() => setScanMode('manual')} className="text-purple-600 font-semibold text-sm">
                  Digitar chave manualmente
                </button>
              </div>
            ) : (
              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">Chave de acesso da NFe (44 digitos)</label>
                <textarea
                  value={accessKey}
                  onChange={e => setAccessKey(e.target.value)}
                  placeholder="Ex: 35260312345678000195550010001234561001234567"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 mb-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                />
                <p className="text-gray-400 text-xs mb-4">
                  A chave de acesso esta no cupom fiscal, abaixo do codigo de barras. Sao 44 numeros.
                </p>

                {/* Quick test keys */}
                <div className="mb-4">
                  <p className="text-gray-500 text-xs mb-2 font-medium">Chaves de teste:</p>
                  <div className="flex flex-wrap gap-2">
                    {['35260312345678000195550010001234561001234567', '31260398765432000150650020009876541009876543'].map((key, i) => (
                      <button key={i} onClick={() => setAccessKey(key)}
                        className="text-[10px] bg-purple-50 text-purple-600 px-2.5 py-1.5 rounded-lg font-mono border border-purple-100"
                      >
                        Teste {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={submitCupom}
                  disabled={scanning || !accessKey.trim()}
                  className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all ${scanning || !accessKey.trim() ? 'bg-gray-300' : 'bg-gradient-to-r from-green-500 to-emerald-600 active:scale-[0.98]'}`}
                >
                  {scanning ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Consultando...
                    </span>
                  ) : (
                    'Consultar cupom fiscal'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // ========== MAIN LAYOUT ==========
  const pages: Record<Page, () => JSX.Element> = {
    inicio: HomePage,
    jogos: JogosPage,
    pix: PixPage,
    notas: NotasPage,
    conta: ContaPage,
  }

  const CurrentPage = pages[page]

  const navItems: Array<{ id: Page; icon: any; label: string }> = [
    { id: 'inicio', icon: Home, label: 'Inicio' },
    { id: 'jogos', icon: Gamepad2, label: 'Jogos' },
    { id: 'pix', icon: Banknote, label: 'Pix' },
    { id: 'notas', icon: Receipt, label: 'Notas' },
    { id: 'conta', icon: User, label: 'Conta' },
  ]

  return (
    <div className="h-full max-w-md mx-auto bg-gray-50 flex flex-col relative">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <CurrentPage />
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-100 px-2 pb-2 pt-1 safe-area-bottom">
        <div className="flex items-center justify-around">
          {navItems.map(item => {
            const isActive = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${isActive ? 'text-purple-600' : 'text-gray-400'}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className={`text-[10px] mt-0.5 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                {isActive && <div className="w-5 h-0.5 bg-purple-600 rounded-full mt-0.5" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Scanner Modal */}
      {showScanner && <ScannerModal />}
    </div>
  )
}

export default App

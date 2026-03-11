import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { Search, Home, ShoppingCart, Package, Trophy, User, ChevronRight, Gift, Camera, X, Check, ShoppingBag, Sparkles, Plus, Minus, MapPin, CheckCircle, Truck, AlertCircle, Award, Target, Send, FileText, Shield, Trash2, AlertTriangle, LogOut, Settings, Users, BarChart3, Edit3, ToggleLeft, Save, RefreshCw, Lock, Activity, BookOpen, ExternalLink } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

let authToken: string | null = localStorage.getItem('auth_token')

const apiFetch = async (path: string, opts?: RequestInit) => {
  const headers: Record<string, string> = { ...(opts?.headers as Record<string, string> || {}) }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  const res = await fetch(`${API}${path}`, { ...opts, headers })
  if (res.status === 401) {
    authToken = null
    localStorage.removeItem('auth_token')
    window.location.reload()
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro de conexao' }))
    throw new Error(err.detail || `Erro ${res.status}`)
  }
  return res
}

type Page = 'inicio' | 'catalogo' | 'pedidos' | 'desafios' | 'perfil' | 'admin_dash' | 'admin_users' | 'admin_products' | 'admin_banners' | 'admin_orders' | 'admin_company' | 'admin_logs'

interface CartItem {
  product_id: number
  name: string
  price: number
  quantity: number
  min_order: number
  image: string
}

function App() {
  const [page, setPage] = useState<Page>('inicio')
  const [isLoggedIn, setIsLoggedIn] = useState(!!authToken)
  const [user, setUser] = useState<any>(null)
  const [dashboard, setDashboard] = useState<any>(null)
  const [catalog, setCatalog] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [orders, setOrders] = useState<any[]>([])
  const [challenges, setChallenges] = useState<any[]>([])
  const [rewardKits, setRewardKits] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentBanner, setCurrentBanner] = useState(0)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showOrderDetail, setShowOrderDetail] = useState<any>(null)
  const [showRewardKits, setShowRewardKits] = useState(false)
  const [showLGPD, setShowLGPD] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [privacyData, setPrivacyData] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [orderSuccess, setOrderSuccess] = useState<any>(null)
  // Admin state
  const [adminStats, setAdminStats] = useState<any>(null)
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [adminProducts, setAdminProducts] = useState<any[]>([])
  const [adminBanners, setAdminBanners] = useState<any[]>([])
  const [adminOrders, setAdminOrders] = useState<any>(null)
  const [adminCompany, setAdminCompany] = useState<any>(null)
  const [adminLogs, setAdminLogs] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const doLogin = async () => {
    setLoginLoading(true); setLoginError('')
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Erro no login')
      authToken = data.token
      localStorage.setItem('auth_token', data.token)
      setUser(data.user)
      setIsLoggedIn(true)
      if (!localStorage.getItem('lgpd_consent_b2b')) setShowLGPD(true)
    } catch (e: any) { setLoginError(e.message) }
    setLoginLoading(false)
  }

  const doLogout = () => {
    authToken = null
    localStorage.removeItem('auth_token')
    setIsLoggedIn(false); setUser(null); setDashboard(null)
    setCart([]); setOrders([]); setChallenges([])
  }

  const fetchDashboard = useCallback(async () => {
    if (!authToken) return
    try {
      const res = await apiFetch('/api/dashboard')
      const d = await res.json()
      setDashboard(d); setUser(d.user)
    } catch { }
  }, [])

  const fetchCatalog = useCallback(async (cat?: string) => {
    try {
      const q = cat && cat !== 'Todas' ? `?category=${encodeURIComponent(cat)}` : ''
      const res = await apiFetch(`/api/catalog${q}`)
      const d = await res.json()
      setCatalog(d.products)
    } catch { }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiFetch('/api/catalog/categories')
      const d = await res.json()
      setCategories(d.categories)
    } catch { }
  }, [])

  const fetchOrders = useCallback(async () => {
    if (!authToken) return
    try {
      const res = await apiFetch('/api/orders')
      const d = await res.json()
      setOrders(d.orders)
    } catch { }
  }, [])

  const fetchChallenges = useCallback(async () => {
    if (!authToken) return
    try {
      const res = await apiFetch('/api/challenges')
      const d = await res.json()
      setChallenges(d.challenges)
    } catch { }
  }, [])

  const fetchRewardKits = useCallback(async () => {
    try {
      const res = await apiFetch('/api/rewards/kits')
      const d = await res.json()
      setRewardKits(d.kits)
    } catch { }
  }, [])

  // Admin fetchers
  const fetchAdminStats = useCallback(async () => { try { const r = await apiFetch('/api/admin/stats'); setAdminStats(await r.json()) } catch { } }, [])
  const fetchAdminUsers = useCallback(async () => { try { const r = await apiFetch('/api/admin/users'); const d = await r.json(); setAdminUsers(d.users) } catch { } }, [])
  const fetchAdminProducts = useCallback(async () => { try { const r = await apiFetch('/api/admin/products'); const d = await r.json(); setAdminProducts(d.products) } catch { } }, [])
  const fetchAdminBanners = useCallback(async () => { try { const r = await apiFetch('/api/admin/banners'); const d = await r.json(); setAdminBanners(Array.isArray(d) ? d : d.banners || []) } catch { } }, [])
  const fetchAdminOrders = useCallback(async () => { try { const r = await apiFetch('/api/admin/orders'); setAdminOrders(await r.json()) } catch { } }, [])
  const fetchAdminCompany = useCallback(async () => { try { const r = await apiFetch('/api/admin/company'); setAdminCompany(await r.json()) } catch { } }, [])
  const fetchAdminLogs = useCallback(async () => { try { const r = await apiFetch('/api/admin/logs'); const d = await r.json(); setAdminLogs(d.logs) } catch { } }, [])

  useEffect(() => {
    if (isLoggedIn) {
      fetchDashboard(); fetchCatalog(); fetchCategories()
      fetchOrders(); fetchChallenges(); fetchRewardKits()
    }
  }, [isLoggedIn, fetchDashboard, fetchCatalog, fetchCategories, fetchOrders, fetchChallenges, fetchRewardKits])

  useEffect(() => {
    if (isLoggedIn && user?.role === 'admin' && page.startsWith('admin_')) {
      fetchAdminStats(); fetchAdminUsers(); fetchAdminProducts()
      fetchAdminBanners(); fetchAdminOrders(); fetchAdminCompany(); fetchAdminLogs()
    }
  }, [isLoggedIn, user?.role, page, fetchAdminStats, fetchAdminUsers, fetchAdminProducts, fetchAdminBanners, fetchAdminOrders, fetchAdminCompany, fetchAdminLogs])

  useEffect(() => {
    if (dashboard?.banners?.length > 1) {
      const t = setInterval(() => setCurrentBanner(b => (b + 1) % dashboard.banners.length), 4000)
      return () => clearInterval(t)
    }
  }, [dashboard?.banners])

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + product.min_order } : i)
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: product.min_order, min_order: product.min_order, image: product.image }]
    })
    showToast(`${product.name} adicionado ao carrinho`)
  }

  const updateCartQty = (productId: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i
      const newQty = i.quantity + delta
      return newQty >= i.min_order ? { ...i, quantity: newQty } : i
    }).filter(i => i.quantity >= i.min_order))
  }

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.product_id !== productId))
  }

  const submitOrder = async () => {
    if (cart.length === 0) return
    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })) })
      })
      const data = await res.json()
      setOrderSuccess(data)
      setCart([]); setShowCart(false)
      fetchOrders(); fetchDashboard()
    } catch (e: any) { showToast(e.message) }
  }

  const submitChallenge = async (challengeId: string) => {
    try {
      const res = await apiFetch('/api/challenges/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: challengeId, notes: 'Foto da vitrine enviada via app' })
      })
      const data = await res.json()
      showToast(data.message)
      fetchChallenges(); fetchDashboard()
    } catch (e: any) { showToast(e.message) }
  }

  const redeemKit = async (kitId: string) => {
    try {
      const res = await apiFetch('/api/rewards/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kit_id: kitId })
      })
      const data = await res.json()
      showToast(data.message)
      fetchDashboard(); fetchRewardKits()
    } catch (e: any) { showToast(e.message) }
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const statusColors: Record<string, string> = {
    enviado: 'bg-blue-100 text-blue-700', aprovado: 'bg-emerald-100 text-emerald-700',
    em_separacao: 'bg-yellow-100 text-yellow-700', em_transito: 'bg-purple-100 text-purple-700',
    entregue: 'bg-green-100 text-green-700', cancelado: 'bg-red-100 text-red-700',
  }
  const statusLabels: Record<string, string> = {
    enviado: 'Enviado', aprovado: 'Aprovado', em_separacao: 'Em Separacao',
    em_transito: 'Em Transito', entregue: 'Entregue', cancelado: 'Cancelado',
  }
  const statusIcons: Record<string, any> = {
    enviado: Send, aprovado: CheckCircle, em_separacao: Package,
    em_transito: Truck, entregue: Check, cancelado: X,
  }


  // ========== LOGIN PAGE ==========
  if (!isLoggedIn) return (
    <div className="app-container">
      <div className="main-scroll">
        <div className="min-h-full flex flex-col justify-center px-6 py-12" style={{ background: 'linear-gradient(180deg, #BE185D 0%, #EC4899 50%, #FDF2F8 100%)' }}>
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Ruby Rose</h1>
            <p className="text-white/80 text-sm mt-1">Plataforma B2B para Vendedoras</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Entrar na conta</h2>
            <p className="text-sm text-gray-500 mb-4">Use suas credenciais de vendedora</p>
            {loginError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{loginError}</div>}
            <input type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full py-3 px-4 bg-gray-50 rounded-xl text-sm border border-gray-200 mb-3 focus:outline-none focus:border-pink-400" />
            <input type="password" placeholder="Senha" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} className="w-full py-3 px-4 bg-gray-50 rounded-xl text-sm border border-gray-200 mb-4 focus:outline-none focus:border-pink-400" />
            <button onClick={doLogin} disabled={loginLoading} className="w-full py-3.5 bg-pink-600 text-white rounded-xl font-semibold text-sm hover:bg-pink-700 transition disabled:opacity-50">
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">Acesso restrito a vendedoras cadastradas</p>
              <p className="text-xs text-gray-400 mt-1">Vinculacao por CNPJ da loja parceira</p>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-white/60 text-xs">Teste: ana@email.com / ana123</p>
          </div>
        </div>
      </div>
    </div>
  )

  // ========== HOME / DASHBOARD PAGE ==========
  const HomePage = () => (
    <div className="animate-fade-in">
      <div style={{ background: 'linear-gradient(180deg, #BE185D 0%, #EC4899 60%, #FDF2F8 100%)' }} className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-xs">Ola,</p>
            <h2 className="text-white font-bold text-lg">{user?.name || 'Vendedora'}</h2>
            {dashboard?.store && <p className="text-white/70 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{dashboard.store.name}</p>}
          </div>
          <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
            <p className="text-yellow-300 text-xl font-bold">{user?.points || 0}</p>
            <p className="text-white/80 text-[10px]">pontos</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-white text-lg font-bold">{dashboard?.total_orders || 0}</p>
            <p className="text-white/70 text-[10px]">Pedidos</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-white text-lg font-bold">R${(dashboard?.total_order_value || 0).toFixed(0)}</p>
            <p className="text-white/70 text-[10px]">Total Vendido</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-white text-lg font-bold">{user?.level || 'Bronze'}</p>
            <p className="text-white/70 text-[10px]">Nivel</p>
          </div>
        </div>

        {/* Banner carousel */}
        {dashboard?.banners?.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl">
            {dashboard.banners.map((b: any, i: number) => (
              <div key={b.id} className={`transition-all duration-500 ${i === currentBanner ? 'block' : 'hidden'}`}>
                <div className="relative h-32 rounded-2xl overflow-hidden" style={{
                  background: b.color === 'rose' ? 'linear-gradient(135deg, #9F1239 0%, #F43F5E 100%)'
                    : b.color === 'purple' ? 'linear-gradient(135deg, #7E22CE 0%, #A855F7 100%)'
                    : b.color === 'emerald' ? 'linear-gradient(135deg, #065F46 0%, #10B981 100%)'
                    : 'linear-gradient(135deg, #BE185D 0%, #EC4899 100%)'
                }}>
                  <div className="p-4 h-full flex flex-col justify-center">
                    {b.highlight && <span className="bg-yellow-400 text-purple-900 text-[9px] font-bold px-2 py-0.5 rounded-full self-start mb-1">DESTAQUE</span>}
                    <h3 className="text-white text-base font-bold">{b.title}</h3>
                    <p className="text-white/80 text-xs mt-0.5">{b.subtitle}</p>
                  </div>
                  <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
                </div>
              </div>
            ))}
            <div className="flex justify-center gap-1.5 mt-2">
              {dashboard.banners.map((_: any, i: number) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentBanner ? 'bg-white w-4' : 'bg-white/40'}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="px-4 -mt-2">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 grid grid-cols-4 gap-3">
          {[
            { icon: ShoppingCart, label: 'Novo Pedido', color: 'bg-pink-100 text-pink-600', action: () => setPage('catalogo') },
            { icon: Trophy, label: 'Desafios', color: 'bg-purple-100 text-purple-600', action: () => setPage('desafios') },
            { icon: Gift, label: 'Premios', color: 'bg-emerald-100 text-emerald-600', action: () => setShowRewardKits(true) },
            { icon: Package, label: 'Pedidos', color: 'bg-blue-100 text-blue-600', action: () => setPage('pedidos') },
          ].map((a, i) => (
            <button key={i} onClick={a.action} className="flex flex-col items-center gap-1.5">
              <div className={`w-12 h-12 rounded-2xl ${a.color} flex items-center justify-center`}>
                <a.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-gray-600 font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active challenges */}
      {dashboard?.active_challenges?.length > 0 && (
        <div className="px-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm">Desafios Ativos</h3>
            <button onClick={() => setPage('desafios')} className="text-pink-600 text-xs font-medium flex items-center gap-0.5">Ver todos <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="space-y-2">
            {dashboard.active_challenges.slice(0, 2).map((c: any) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.progress >= c.goal ? 'bg-green-100' : 'bg-purple-100'}`}>
                  {c.progress >= c.goal ? <Check className="w-5 h-5 text-green-600" /> : <Target className="w-5 h-5 text-purple-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${Math.min(100, (c.progress / c.goal) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500">{c.progress}/{c.goal}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-yellow-600">{c.points_reward}pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      {dashboard?.recent_orders?.length > 0 && (
        <div className="px-4 mt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm">Ultimos Pedidos</h3>
            <button onClick={() => setPage('pedidos')} className="text-pink-600 text-xs font-medium flex items-center gap-0.5">Ver todos <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="space-y-2">
            {dashboard.recent_orders.map((o: any) => {
              const Icon = statusIcons[o.status] || Package
              return (
                <button key={o.id} onClick={() => setShowOrderDetail(o)} className="w-full bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{o.store_name}</p>
                    <p className="text-[10px] text-gray-400">{new Date(o.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">R${o.total_value.toFixed(2)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>{statusLabels[o.status] || o.status}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )


  // ========== CATALOG PAGE ==========
  const CatalogoPage = () => {
    const filtered = searchQuery ? catalog.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())) : catalog
    return (
      <div className="animate-fade-in">
        <div className="bg-pink-600 px-4 pt-4 pb-5">
          <h2 className="text-white font-bold text-lg mb-3">Catalogo de Produtos</h2>
          <div className="relative">
            <input type="text" placeholder="Buscar produtos..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full py-3 pl-4 pr-10 bg-white/20 rounded-xl text-white placeholder-white/60 text-sm focus:outline-none focus:bg-white/30" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          </div>
        </div>

        {/* iPaper Interactive Catalog Button */}
        <div className="px-4 pt-3">
          <a href="https://viewer.ipaper.io/ruby-rose-br/catalogo-interativo-ruby-rose/" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Catalogo Interativo</p>
                <p className="text-[10px] text-gray-500">Ruby Rose - 160 paginas</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-pink-600" />
          </a>
        </div>

        {/* Categories */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar">
              {categories.map(c => (
                <button key={c} onClick={() => { setSelectedCategory(c); fetchCatalog(c) }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${c === selectedCategory ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{c}</button>
              ))}
            </div>

            {/* Products grid */}
            <div className="px-4 pb-4 grid grid-cols-2 gap-3">
              {filtered.map(p => {
                const inCart = cart.find(i => i.product_id === p.id)
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="h-28 bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-pink-300" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-gray-800 line-clamp-2 h-8">{p.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{p.category}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="text-sm font-bold text-pink-600">R${p.price.toFixed(2)}</p>
                          <p className="text-[9px] text-gray-400">Min: {p.min_order} un</p>
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateCartQty(p.id, -1)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                            <span className="text-xs font-bold w-5 text-center">{inCart.quantity}</span>
                            <button onClick={() => updateCartQty(p.id, 1)} className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center"><Plus className="w-3 h-3 text-pink-600" /></button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(p)} className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center">
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

  // ========== ORDERS PAGE ==========
  const PedidosPage = () => (
    <div className="animate-fade-in">
      <div className="bg-pink-600 px-4 pt-4 pb-5">
        <h2 className="text-white font-bold text-lg">Meus Pedidos</h2>
        <p className="text-white/70 text-xs mt-0.5">{orders.length} pedido(s) encontrado(s)</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhum pedido ainda</p>
            <button onClick={() => setPage('catalogo')} className="mt-3 px-4 py-2 bg-pink-600 text-white rounded-xl text-sm">Fazer primeiro pedido</button>
          </div>
        ) : orders.map(o => {
          const Icon = statusIcons[o.status] || Package
          return (
            <button key={o.id} onClick={() => setShowOrderDetail(o)} className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">{o.id}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[o.status] || 'bg-gray-100'}`}>{statusLabels[o.status] || o.status}</span>
              </div>
              <p className="text-sm font-medium text-gray-800">{o.store_name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{new Date(o.created_at).toLocaleDateString('pt-BR')} - {o.items?.length || 0} item(ns)</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <span className="text-xs text-gray-500">Total do pedido</span>
                <span className="text-sm font-bold text-gray-800">R${o.total_value.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">Pontos ganhos</span>
                <span className="text-xs font-bold text-yellow-600">+{o.points_earned} pts</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  // ========== CHALLENGES PAGE ==========
  const DesafiosPage = () => (
    <div className="animate-fade-in">
      <div className="bg-purple-600 px-4 pt-4 pb-5">
        <h2 className="text-white font-bold text-lg">Desafios</h2>
        <p className="text-white/70 text-xs mt-0.5">Complete desafios e ganhe pontos e premios</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        {challenges.map(c => {
          const pct = Math.min(100, (c.progress / c.goal) * 100)
          const done = c.completed
          return (
            <div key={c.id} className={`bg-white rounded-xl border p-4 ${done ? 'border-green-200' : 'border-gray-100'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-100' : 'bg-purple-100'}`}>
                  {done ? <CheckCircle className="w-6 h-6 text-green-600" /> : c.type === 'vitrine' ? <Camera className="w-6 h-6 text-purple-600" /> : c.type === 'vendas' ? <ShoppingCart className="w-6 h-6 text-purple-600" /> : c.type === 'social' ? <Gift className="w-6 h-6 text-purple-600" /> : <Target className="w-6 h-6 text-purple-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-800">{c.title}</h4>
                    <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">{c.points_reward} pts</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{c.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${done ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">{c.progress}/{c.goal}</span>
                  </div>
                  {c.reward_kit && <p className="text-[10px] text-emerald-600 mt-1.5 flex items-center gap-1"><Gift className="w-3 h-3" />Premio: {c.reward_kit.name}</p>}
                  {!done && (
                    <button onClick={() => submitChallenge(c.id)} className="mt-3 w-full py-2 bg-purple-600 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Enviar Comprovante
                    </button>
                  )}
                  {done && <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Desafio concluido!</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )


  // ========== PROFILE PAGE ==========
  const PerfilPage = () => (
    <div className="animate-fade-in">
      <div className="bg-pink-600 px-4 pt-4 pb-8">
        <h2 className="text-white font-bold text-lg">Meu Perfil</h2>
      </div>
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center">
              <User className="w-7 h-7 text-pink-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{user?.name}</h3>
              <p className="text-xs text-gray-500">{user?.email}</p>
              <p className="text-[10px] text-pink-600 font-medium">{user?.role === 'promotora' ? 'Promotora' : user?.role === 'gerente_loja' ? 'Gerente de Loja' : user?.role === 'vendedor_ruby' ? 'Vendedor Ruby Rose' : 'Admin'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-yellow-600">{user?.points || 0}</p>
              <p className="text-[10px] text-gray-500">Pontos</p>
            </div>
            <div className="bg-pink-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-pink-600">{user?.level || 'Bronze'}</p>
              <p className="text-[10px] text-gray-500">Nivel</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-purple-600">{user?.challenges_completed || 0}</p>
              <p className="text-[10px] text-gray-500">Desafios</p>
            </div>
          </div>
        </div>

        {/* Store info */}
        {dashboard?.store && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-3">
            <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-pink-600" /> Minha Loja</h4>
            <p className="text-sm text-gray-700">{dashboard.store.name}</p>
            <p className="text-xs text-gray-500">{dashboard.store.address}</p>
            <p className="text-xs text-gray-500">{dashboard.store.city} - {dashboard.store.state}</p>
            <p className="text-[10px] text-gray-400 mt-1">CNPJ: {dashboard.store.cnpj}</p>
          </div>
        )}

        {/* Reward kits button */}
        <button onClick={() => setShowRewardKits(true)} className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-3 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Gift className="w-5 h-5 text-emerald-600" /></div>
          <div className="flex-1"><p className="text-sm font-medium text-gray-800">Resgatar Premios</p><p className="text-[10px] text-gray-500">Troque seus pontos por kits de produtos</p></div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* LGPD / Privacy */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-3 overflow-hidden">
          <button onClick={() => { setShowPrivacy(true); if (!privacyData) apiFetch('/api/lgpd/privacy-policy').then(r => r.json()).then(setPrivacyData).catch(() => {}) }} className="w-full p-4 flex items-center gap-3 text-left border-b border-gray-50">
            <Shield className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-700">Politica de Privacidade</span>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </button>
          <button onClick={async () => { try { const res = await apiFetch('/api/lgpd/export'); const data = await res.json(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'meus_dados_rubyrose.json'; a.click() } catch {} }} className="w-full p-4 flex items-center gap-3 text-left border-b border-gray-50">
            <FileText className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-700">Exportar meus dados</span>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="w-full p-4 flex items-center gap-3 text-left">
            <Trash2 className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-600">Excluir minha conta</span>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </button>
        </div>

        {/* Logout */}
        <button onClick={doLogout} className="w-full bg-gray-100 rounded-2xl p-4 mt-3 mb-4 flex items-center justify-center gap-2 text-gray-600 font-medium text-sm">
          <LogOut className="w-4 h-4" /> Sair da conta
        </button>
      </div>
    </div>
  )


  // ========== MODALS ==========

  // Cart Modal
  const CartModal = () => showCart ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
      <div className="relative bg-white rounded-t-3xl w-full max-w-[430px] max-h-[80vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Carrinho ({cartCount} itens)</h3>
          <button onClick={() => setShowCart(false)}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Carrinho vazio</p>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-12 h-12 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-5 h-5 text-pink-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-400">R${item.price.toFixed(2)}/un</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateCartQty(item.product_id, -1)} className="w-6 h-6 rounded-full bg-white border flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateCartQty(item.product_id, 1)} className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center"><Plus className="w-3 h-3 text-pink-600" /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.product_id)}><X className="w-4 h-4 text-red-400" /></button>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Total do pedido</span>
                  <span className="text-lg font-bold text-gray-800">R${cartTotal.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mb-3">+{Math.floor(cartTotal / 20)} pontos estimados</p>
                <button onClick={submitOrder} className="w-full py-3.5 bg-pink-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Enviar Pedido para Loja
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  ) : null

  // Order Detail Modal
  const OrderDetailModal = () => showOrderDetail ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowOrderDetail(null)} />
      <div className="relative bg-white rounded-t-3xl w-full max-w-[430px] max-h-[80vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Pedido {showOrderDetail.id}</h3>
          <button onClick={() => setShowOrderDetail(null)}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-800">{showOrderDetail.store_name}</p>
              <p className="text-[10px] text-gray-400">{new Date(showOrderDetail.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[showOrderDetail.status] || 'bg-gray-100'}`}>{statusLabels[showOrderDetail.status] || showOrderDetail.status}</span>
          </div>
          <div className="space-y-2 mb-4">
            {showOrderDetail.items?.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-xs font-medium text-gray-800">{item.name}</p>
                  <p className="text-[10px] text-gray-400">{item.quantity} x R${item.unit_price.toFixed(2)}</p>
                </div>
                <p className="text-sm font-bold text-gray-800">R${item.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="flex justify-between"><span className="text-sm text-gray-500">Total</span><span className="text-lg font-bold">R${showOrderDetail.total_value.toFixed(2)}</span></div>
            <div className="flex justify-between mt-1"><span className="text-xs text-gray-500">Pontos ganhos</span><span className="text-xs font-bold text-yellow-600">+{showOrderDetail.points_earned} pts</span></div>
          </div>
        </div>
      </div>
    </div>
  ) : null

  // Order Success Modal
  const OrderSuccessModal = () => orderSuccess ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOrderSuccess(null)} />
      <div className="relative bg-white rounded-3xl w-full max-w-[380px] p-6 text-center animate-slide-up">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4"><CheckCircle className="w-8 h-8 text-green-600" /></div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Pedido Enviado!</h3>
        <p className="text-sm text-gray-500 mb-4">{orderSuccess.message}</p>
        <div className="bg-yellow-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500">Pontos ganhos neste pedido</p>
          <p className="text-2xl font-bold text-yellow-600">+{orderSuccess.order?.points_earned || 0} pts</p>
        </div>
        <button onClick={() => { setOrderSuccess(null); setPage('pedidos') }} className="w-full py-3 bg-pink-600 text-white rounded-xl font-semibold text-sm">Ver Meus Pedidos</button>
      </div>
    </div>
  ) : null

  // Reward Kits Modal
  const RewardKitsModal = () => showRewardKits ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowRewardKits(false)} />
      <div className="relative bg-white rounded-t-3xl w-full max-w-[430px] max-h-[80vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">Resgatar Premios</h3>
            <p className="text-xs text-gray-500">Seus pontos: <span className="font-bold text-yellow-600">{user?.points || 0}</span></p>
          </div>
          <button onClick={() => setShowRewardKits(false)}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-4 space-y-3">
          {rewardKits.map(k => {
            const canRedeem = (user?.points || 0) >= k.points_cost
            return (
              <div key={k.id} className={`bg-white rounded-xl border p-4 ${canRedeem ? 'border-emerald-200' : 'border-gray-100 opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${canRedeem ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    <Award className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-800">{k.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{k.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-bold text-yellow-600">{k.points_cost} pontos</span>
                      <button onClick={() => canRedeem && redeemKit(k.id)} disabled={!canRedeem}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium ${canRedeem ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {canRedeem ? 'Resgatar' : 'Pontos insuficientes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  ) : null

  // LGPD Consent Banner
  const LGPDBanner = () => showLGPD ? (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-[410px] px-3">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-pink-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-gray-800">Privacidade e Dados</h4>
            <p className="text-xs text-gray-500 mt-1">Utilizamos seus dados para processar pedidos, calcular pontos e melhorar sua experiencia. Ao continuar, voce concorda com nossa politica de privacidade.</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setShowLGPD(false); localStorage.setItem('lgpd_consent_b2b', 'true'); apiFetch('/api/lgpd/consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent_data_collection: true, consent_marketing: true, consent_third_party: false }) }).catch(() => {}) }}
                className="flex-1 py-2 bg-pink-600 text-white rounded-xl text-xs font-medium">Aceitar</button>
              <button onClick={() => { setShowPrivacy(true); if (!privacyData) apiFetch('/api/lgpd/privacy-policy').then(r => r.json()).then(setPrivacyData).catch(() => {}) }}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-medium">Ler mais</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null

  // Privacy Policy Modal
  const PrivacyModal = () => showPrivacy ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowPrivacy(false)} />
      <div className="relative bg-white rounded-3xl w-full max-w-[400px] max-h-[80vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">{privacyData?.title || 'Politica de Privacidade'}</h3>
          <button onClick={() => setShowPrivacy(false)}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        {privacyData?.sections?.map((s: any, i: number) => (
          <div key={i} className="mb-4">
            <h4 className="text-sm font-bold text-gray-700">{s.title}</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.content}</p>
          </div>
        )) || <p className="text-sm text-gray-500">Carregando...</p>}
      </div>
    </div>
  ) : null

  // Delete Confirm Modal
  const DeleteModal = () => showDeleteConfirm ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />
      <div className="relative bg-white rounded-3xl w-full max-w-[380px] p-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4"><AlertTriangle className="w-7 h-7 text-red-600" /></div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Excluir conta?</h3>
        <p className="text-sm text-gray-500 mb-4">Esta acao e irreversivel. Todos os seus dados, pedidos, pontos e historico serao removidos permanentemente conforme a LGPD.</p>
        <div className="flex gap-2">
          <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Cancelar</button>
          <button onClick={async () => { try { await apiFetch('/api/lgpd/data', { method: 'DELETE' }); doLogout() } catch {} }} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-medium">Excluir</button>
        </div>
      </div>
    </div>
  ) : null

  // Toast notification
  const Toast = () => toast ? (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[380px] w-full px-3 animate-slide-up">
      <div className="bg-gray-800 text-white rounded-xl px-4 py-3 text-sm text-center shadow-lg">{toast}</div>
    </div>
  ) : null

  // ========== ADMIN HELPERS ==========
  const isAdmin = user?.role === 'admin'
  const adminFormField = (label: string, key: string, type = 'text', placeholder = '') => (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} placeholder={placeholder || label} value={formData[key] || ''} onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))} className="w-full py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400" />
    </div>
  )
  const adminSelectField = (label: string, key: string, options: { value: string; label: string }[]) => (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={formData[key] || ''} onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))} className="w-full py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400">
        <option value="">Selecione...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  // Admin API helpers
  const adminApiCall = async (path: string, method: string, body?: Record<string, unknown>) => {
    try {
      const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
      if (body) opts.body = JSON.stringify(body)
      const r = await apiFetch(path, opts)
      const d = await r.json()
      showToast(d.message || 'Operacao realizada com sucesso')
      return d
    } catch (e: unknown) { showToast((e as Error).message); return null }
  }

  // ========== ADMIN DASHBOARD PAGE ==========
  const AdminDashPage = () => (
    <div className="animate-fade-in p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Painel Administrativo</h1>
          <p className="text-xs text-gray-500">Visao geral da plataforma</p>
        </div>
        <button onClick={() => { fetchAdminStats(); showToast('Dados atualizados') }} className="p-2 bg-pink-50 rounded-xl"><RefreshCw className="w-4 h-4 text-pink-600" /></button>
      </div>

      {adminStats ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Usuarios', value: adminStats.total_users, icon: Users, color: 'bg-blue-50 text-blue-600' },
              { label: 'Lojas', value: adminStats.total_stores, icon: MapPin, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Pedidos', value: adminStats.total_orders, icon: Package, color: 'bg-purple-50 text-purple-600' },
              { label: 'Receita', value: `R$${adminStats.total_revenue?.toFixed(0)}`, icon: BarChart3, color: 'bg-yellow-50 text-yellow-600' },
              { label: 'Produtos', value: adminStats.total_products, icon: ShoppingBag, color: 'bg-pink-50 text-pink-600' },
              { label: 'Desafios Ativos', value: adminStats.active_challenges, icon: Trophy, color: 'bg-orange-50 text-orange-600' },
              { label: 'Banners', value: `${adminStats.active_banners}/${adminStats.total_banners}`, icon: FileText, color: 'bg-cyan-50 text-cyan-600' },
              { label: 'Resgates', value: adminStats.total_redemptions, icon: Gift, color: 'bg-rose-50 text-rose-600' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-2`}><s.icon className="w-5 h-5" /></div>
                <p className="text-xl font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Usuarios por Perfil</h3>
            {Object.entries(adminStats.users_by_role || {}).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600 capitalize">{role.replace('_', ' ')}</span>
                <span className="text-sm font-bold text-gray-800">{String(count)}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Pedidos por Status</h3>
            {Object.entries(adminStats.orders_by_status || {}).map(([st, count]) => (
              <div key={st} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className={`text-xs px-2 py-1 rounded-lg ${statusColors[st] || 'bg-gray-100 text-gray-600'}`}>{statusLabels[st] || st}</span>
                <span className="text-sm font-bold text-gray-800">{String(count)}</span>
              </div>
            ))}
          </div>
        </>
      ) : <div className="text-center py-12 text-gray-400">Carregando dados...</div>}

      {/* Quick nav to admin sections */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { page: 'admin_company' as Page, label: 'Empresa', icon: Settings, desc: 'Configuracoes' },
          { page: 'admin_users' as Page, label: 'Usuarios', icon: Users, desc: 'Gestao de contas' },
          { page: 'admin_products' as Page, label: 'Produtos', icon: ShoppingBag, desc: 'Catalogo' },
          { page: 'admin_banners' as Page, label: 'Banners', icon: FileText, desc: 'Promocionais' },
          { page: 'admin_orders' as Page, label: 'Pedidos', icon: Package, desc: 'Acompanhamento' },
          { page: 'admin_logs' as Page, label: 'Seguranca', icon: Shield, desc: 'Logs e atividades' },
        ].map(item => (
          <button key={item.label} onClick={() => setPage(item.page)} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:border-pink-200 transition">
            <item.icon className="w-5 h-5 text-pink-600 mb-2" />
            <p className="text-sm font-bold text-gray-800">{item.label}</p>
            <p className="text-xs text-gray-500">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )

  // ========== ADMIN USERS PAGE ==========
  const AdminUsersPage = () => (
    <div className="animate-fade-in p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setPage('admin_dash')} className="text-pink-600 text-sm flex items-center gap-1"><ChevronRight className="w-4 h-4 rotate-180" />Voltar</button>
        <h2 className="text-lg font-bold text-gray-800">Gestao de Usuarios</h2>
        <button onClick={() => { setShowCreateForm(true); setFormData({ role: 'promotora', status: 'active' }) }} className="bg-pink-600 text-white rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1"><Plus className="w-3 h-3" />Novo</button>
      </div>

      <div className="space-y-3">
        {adminUsers.map((u: Record<string, string>) => (
          <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center"><User className="w-5 h-5 text-pink-600" /></div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{u.status === 'active' ? 'Ativo' : 'Inativo'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg capitalize">{(u.role || '').replace('_', ' ')}</span>
              <div className="flex gap-2">
                <button onClick={async () => { await adminApiCall(`/api/admin/users/${u.id}/toggle`, 'PATCH'); fetchAdminUsers() }} className="p-1.5 bg-gray-50 rounded-lg hover:bg-gray-100"><ToggleLeft className="w-4 h-4 text-gray-600" /></button>
                <button onClick={() => { setEditingItem({ type: 'user', ...u }); setFormData({ name: u.name, phone: u.phone || '', role: u.role, status: u.status, store_cnpj: u.store_cnpj || '' }) }} className="p-1.5 bg-gray-50 rounded-lg hover:bg-gray-100"><Edit3 className="w-4 h-4 text-gray-600" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateForm(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-[400px] p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Novo Usuario</h3>
              <button onClick={() => setShowCreateForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {adminFormField('Nome completo', 'name', 'text', 'Nome do usuario')}
            {adminFormField('Email', 'email', 'email', 'email@exemplo.com')}
            {adminFormField('Senha', 'password', 'password', 'Senha inicial')}
            {adminFormField('Telefone', 'phone', 'tel', '(11) 99999-9999')}
            {adminFormField('CPF', 'cpf', 'text', '000.000.000-00')}
            {adminSelectField('Perfil', 'role', [{ value: 'promotora', label: 'Promotora' }, { value: 'gerente_loja', label: 'Gerente de Loja' }, { value: 'vendedor_ruby', label: 'Vendedor Ruby Rose' }, { value: 'admin', label: 'Administrador' }])}
            {adminFormField('CNPJ da Loja', 'store_cnpj', 'text', '00.000.000/0001-00')}
            <button onClick={async () => {
              const d = await adminApiCall('/api/admin/users', 'POST', { name: formData.name, email: formData.email, password: formData.password, phone: formData.phone, cpf: formData.cpf, role: formData.role, store_cnpj: formData.store_cnpj, status: 'active' })
              if (d) { setShowCreateForm(false); setFormData({}); fetchAdminUsers() }
            }} className="w-full py-3 bg-pink-600 text-white rounded-xl font-semibold text-sm mt-2 flex items-center justify-center gap-2"><Save className="w-4 h-4" />Criar Usuario</button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingItem?.type === 'user' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingItem(null)} />
          <div className="relative bg-white rounded-3xl w-full max-w-[400px] p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar Usuario</h3>
              <button onClick={() => setEditingItem(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {adminFormField('Nome', 'name')}
            {adminFormField('Telefone', 'phone', 'tel')}
            {adminSelectField('Perfil', 'role', [{ value: 'promotora', label: 'Promotora' }, { value: 'gerente_loja', label: 'Gerente de Loja' }, { value: 'vendedor_ruby', label: 'Vendedor Ruby Rose' }, { value: 'admin', label: 'Administrador' }])}
            {adminSelectField('Status', 'status', [{ value: 'active', label: 'Ativo' }, { value: 'inactive', label: 'Inativo' }])}
            {adminFormField('CNPJ da Loja', 'store_cnpj')}
            <button onClick={async () => {
              const d = await adminApiCall(`/api/admin/users/${editingItem.id}`, 'PUT', { name: formData.name, phone: formData.phone, role: formData.role, status: formData.status, store_cnpj: formData.store_cnpj })
              if (d) { setEditingItem(null); setFormData({}); fetchAdminUsers() }
            }} className="w-full py-3 bg-pink-600 text-white rounded-xl font-semibold text-sm mt-2 flex items-center justify-center gap-2"><Save className="w-4 h-4" />Salvar Alteracoes</button>
          </div>
        </div>
      )}
    </div>
  )

  // ========== ADMIN PRODUCTS PAGE ==========
  const AdminProductsPage = () => (
    <div className="animate-fade-in p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setPage('admin_dash')} className="text-pink-600 text-sm flex items-center gap-1"><ChevronRight className="w-4 h-4 rotate-180" />Voltar</button>
        <h2 className="text-lg font-bold text-gray-800">Gestao de Produtos</h2>
        <button onClick={() => { setShowCreateForm(true); setFormData({ min_order: '1', stock_available: 'true', category: 'Maquiagem' }) }} className="bg-pink-600 text-white rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1"><Plus className="w-3 h-3" />Novo</button>
      </div>

      <div className="space-y-3">
        {adminProducts.map((p: Record<string, unknown>) => (
          <div key={String(p.id)} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-gray-800">{String(p.name)}</p>
                <p className="text-xs text-gray-500">EAN: {String(p.ean)} | Min: {String(p.min_order)} un</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg ${p.stock_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{p.stock_available ? 'Disponivel' : 'Indisponivel'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-pink-600">R${Number(p.price).toFixed(2)}</span>
                <span className="text-xs text-gray-400 ml-2">{String(p.category)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => { await adminApiCall(`/api/admin/products/${p.id}/toggle`, 'PATCH'); fetchAdminProducts() }} className="p-1.5 bg-gray-50 rounded-lg hover:bg-gray-100"><ToggleLeft className="w-4 h-4 text-gray-600" /></button>
                <button onClick={() => { setEditingItem({ type: 'product', ...p }); setFormData({ name: String(p.name), ean: String(p.ean || ''), price: String(p.price), category: String(p.category), description: String(p.description || ''), min_order: String(p.min_order), image: String(p.image || '') }) }} className="p-1.5 bg-gray-50 rounded-lg hover:bg-gray-100"><Edit3 className="w-4 h-4 text-gray-600" /></button>
                <button onClick={async () => { if (confirm('Remover este produto?')) { await adminApiCall(`/api/admin/products/${p.id}`, 'DELETE'); fetchAdminProducts() } }} className="p-1.5 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4 text-red-600" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Product Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateForm(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-[400px] p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Novo Produto</h3>
              <button onClick={() => setShowCreateForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {adminFormField('Nome do produto', 'name')}
            {adminFormField('Codigo EAN', 'ean')}
            {adminFormField('Preco (R$)', 'price', 'number', '0.00')}
            {adminSelectField('Categoria', 'category', [{ value: 'Maquiagem', label: 'Maquiagem' }, { value: 'Skincare', label: 'Skincare' }, { value: 'Unhas', label: 'Unhas' }, { value: 'Acessorios', label: 'Acessorios' }, { value: 'Cabelos', label: 'Cabelos' }])}
            {adminFormField('Descricao', 'description')}
            {adminFormField('Pedido minimo', 'min_order', 'number', '1')}
            {adminFormField('URL da imagem', 'image', 'url')}
            <button onClick={async () => {
              const d = await adminApiCall('/api/admin/products', 'POST', { name: formData.name, ean: formData.ean, price: parseFloat(formData.price), category: formData.category, description: formData.description, min_order: parseInt(formData.min_order) || 1, image: formData.image, stock_available: true })
              if (d) { setShowCreateForm(false); setFormData({}); fetchAdminProducts() }
            }} className="w-full py-3 bg-pink-600 text-white rounded-xl font-semibold text-sm mt-2 flex items-center justify-center gap-2"><Save className="w-4 h-4" />Criar Produto</button>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingItem?.type === 'product' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingItem(null)} />
          <div className="relative bg-white rounded-3xl w-full max-w-[400px] p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar Produto</h3>
              <button onClick={() => setEditingItem(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {adminFormField('Nome', 'name')}
            {adminFormField('Codigo EAN', 'ean')}
            {adminFormField('Preco (R$)', 'price', 'number')}
            {adminSelectField('Categoria', 'category', [{ value: 'Maquiagem', label: 'Maquiagem' }, { value: 'Skincare', label: 'Skincare' }, { value: 'Unhas', label: 'Unhas' }, { value: 'Acessorios', label: 'Acessorios' }, { value: 'Cabelos', label: 'Cabelos' }])}
            {adminFormField('Descricao', 'description')}
            {adminFormField('Pedido minimo', 'min_order', 'number')}
            {adminFormField('URL da imagem', 'image', 'url')}
            <button onClick={async () => {
              const d = await adminApiCall(`/api/admin/products/${editingItem.id}`, 'PUT', { name: formData.name, ean: formData.ean, price: parseFloat(formData.price), category: formData.category, description: formData.description, min_order: parseInt(formData.min_order) || 1, image: formData.image })
              if (d) { setEditingItem(null); setFormData({}); fetchAdminProducts() }
            }} className="w-full py-3 bg-pink-600 text-white rounded-xl font-semibold text-sm mt-2 flex items-center justify-center gap-2"><Save className="w-4 h-4" />Salvar Alteracoes</button>
          </div>
        </div>
      )}
    </div>
  )

  // ========== ADMIN BANNERS PAGE ==========
  const AdminBannersPage = () => (
    <div className="animate-fade-in p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setPage('admin_dash')} className="text-pink-600 text-sm flex items-center gap-1"><ChevronRight className="w-4 h-4 rotate-180" />Voltar</button>
        <h2 className="text-lg font-bold text-gray-800">Gestao de Banners</h2>
        <button onClick={() => { setShowCreateForm(true); setFormData({ position: 'home', active: 'true' }) }} className="bg-pink-600 text-white rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1"><Plus className="w-3 h-3" />Novo</button>
      </div>

      <div className="space-y-3">
        {adminBanners.map((b: Record<string, unknown>) => (
          <div key={String(b.id)} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-gray-800">{String(b.title)}</p>
                <p className="text-xs text-gray-500">Posicao: {String(b.position)} | Ordem: {String(b.order)}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg ${b.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{b.active ? 'Ativo' : 'Inativo'}</span>
            </div>
            {Boolean(b.image_url) && <div className="w-full h-20 bg-gray-100 rounded-xl mb-2 flex items-center justify-center overflow-hidden"><img src={String(b.image_url)} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /></div>}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{b.start_date ? `${String(b.start_date).slice(0, 10)} - ${String(b.end_date || '').slice(0, 10)}` : 'Sem periodo definido'}</span>
              <div className="flex gap-2">
                <button onClick={async () => { await adminApiCall(`/api/admin/banners/${b.id}/toggle`, 'PATCH'); fetchAdminBanners() }} className="p-1.5 bg-gray-50 rounded-lg hover:bg-gray-100"><ToggleLeft className="w-4 h-4 text-gray-600" /></button>
                <button onClick={async () => { if (confirm('Remover este banner?')) { await adminApiCall(`/api/admin/banners/${b.id}`, 'DELETE'); fetchAdminBanners() } }} className="p-1.5 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4 text-red-600" /></button>
              </div>
            </div>
          </div>
        ))}
        {adminBanners.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum banner cadastrado</p>}
      </div>

      {/* Create Banner Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateForm(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-[400px] p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Novo Banner</h3>
              <button onClick={() => setShowCreateForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {adminFormField('Titulo', 'title')}
            {adminFormField('Subtitulo', 'subtitle')}
            {adminFormField('URL da imagem', 'image_url', 'url')}
            {adminFormField('Cor de fundo', 'bg_color', 'text', '#BE185D')}
            {adminSelectField('Posicao', 'position', [{ value: 'home', label: 'Home' }, { value: 'catalogo', label: 'Catalogo' }, { value: 'destaque', label: 'Destaque' }])}
            {adminFormField('Data inicio', 'start_date', 'date')}
            {adminFormField('Data fim', 'end_date', 'date')}
            <button onClick={async () => {
              const d = await adminApiCall('/api/admin/banners', 'POST', { title: formData.title, subtitle: formData.subtitle, image_url: formData.image_url, bg_color: formData.bg_color || '#BE185D', position: formData.position || 'home', start_date: formData.start_date || null, end_date: formData.end_date || null })
              if (d) { setShowCreateForm(false); setFormData({}); fetchAdminBanners() }
            }} className="w-full py-3 bg-pink-600 text-white rounded-xl font-semibold text-sm mt-2 flex items-center justify-center gap-2"><Save className="w-4 h-4" />Criar Banner</button>
          </div>
        </div>
      )}
    </div>
  )

  // ========== ADMIN ORDERS PAGE ==========
  const AdminOrdersPage = () => (
    <div className="animate-fade-in p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setPage('admin_dash')} className="text-pink-600 text-sm flex items-center gap-1"><ChevronRight className="w-4 h-4 rotate-180" />Voltar</button>
        <h2 className="text-lg font-bold text-gray-800">Gestao de Pedidos</h2>
        <button onClick={() => fetchAdminOrders()} className="p-2 bg-pink-50 rounded-xl"><RefreshCw className="w-4 h-4 text-pink-600" /></button>
      </div>

      {adminOrders?.stats && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-gray-800">{adminOrders.stats.total}</p>
            <p className="text-[10px] text-gray-500">Total</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-pink-600">R${adminOrders.stats.total_value?.toFixed(0)}</p>
            <p className="text-[10px] text-gray-500">Valor Total</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-emerald-600">{adminOrders.stats.by_status?.entregue || 0}</p>
            <p className="text-[10px] text-gray-500">Entregues</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(adminOrders?.orders || []).map((o: Record<string, unknown>) => {
          const StatusIcon = statusIcons[String(o.status)] || Package
          return (
            <div key={String(o.id)} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <StatusIcon className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-bold text-gray-800">Pedido #{String(o.id).slice(-6)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg ${statusColors[String(o.status)] || 'bg-gray-100'}`}>{statusLabels[String(o.status)] || String(o.status)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Vendedora: {String(o.user_name || '—')}</span>
                <span className="font-bold text-gray-800">R${Number(o.total_value).toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{String(o.created_at || '').slice(0, 16).replace('T', ' ')}</p>
            </div>
          )
        })}
        {(!adminOrders?.orders || adminOrders.orders.length === 0) && <p className="text-center text-gray-400 py-8">Nenhum pedido encontrado</p>}
      </div>
    </div>
  )

  // ========== ADMIN COMPANY SETTINGS PAGE ==========
  const AdminCompanyPage = () => {
    const [companyForm, setCompanyForm] = useState(adminCompany || {})
    const updateField = (key: string, val: string) => setCompanyForm((p: Record<string, string>) => ({ ...p, [key]: val }))

    return (
      <div className="animate-fade-in p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setPage('admin_dash')} className="text-pink-600 text-sm flex items-center gap-1"><ChevronRight className="w-4 h-4 rotate-180" />Voltar</button>
          <h2 className="text-lg font-bold text-gray-800">Configuracoes da Empresa</h2>
          <div className="w-16" />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome da empresa</label>
            <input value={companyForm.name || ''} onChange={e => updateField('name', e.target.value)} className="w-full py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL do logotipo</label>
            <input value={companyForm.logo_url || ''} onChange={e => updateField('logo_url', e.target.value)} className="w-full py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cor primaria</label>
              <div className="flex items-center gap-2">
                <input type="color" value={companyForm.primary_color || '#BE185D'} onChange={e => updateField('primary_color', e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                <input value={companyForm.primary_color || ''} onChange={e => updateField('primary_color', e.target.value)} className="flex-1 py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cor secundaria</label>
              <div className="flex items-center gap-2">
                <input type="color" value={companyForm.secondary_color || '#EC4899'} onChange={e => updateField('secondary_color', e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                <input value={companyForm.secondary_color || ''} onChange={e => updateField('secondary_color', e.target.value)} className="flex-1 py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email de contato</label>
            <input type="email" value={companyForm.contact_email || ''} onChange={e => updateField('contact_email', e.target.value)} className="w-full py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
            <input value={companyForm.contact_phone || ''} onChange={e => updateField('contact_phone', e.target.value)} className="w-full py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ</label>
            <input value={companyForm.cnpj || ''} onChange={e => updateField('cnpj', e.target.value)} className="w-full py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Endereco</label>
            <input value={companyForm.address || ''} onChange={e => updateField('address', e.target.value)} className="w-full py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
            <input value={companyForm.website || ''} onChange={e => updateField('website', e.target.value)} className="w-full py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sobre a empresa</label>
            <textarea rows={3} value={companyForm.about || ''} onChange={e => updateField('about', e.target.value)} className="w-full py-2.5 px-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-pink-400 resize-none" />
          </div>

          <button onClick={async () => {
            const d = await adminApiCall('/api/admin/company', 'PUT', companyForm)
            if (d) { fetchAdminCompany(); showToast('Configuracoes salvas com sucesso!') }
          }} className="w-full py-3.5 bg-pink-600 text-white rounded-xl font-semibold text-sm mt-2 flex items-center justify-center gap-2"><Save className="w-4 h-4" />Salvar Configuracoes</button>

          {adminCompany?.updated_at && <p className="text-xs text-gray-400 text-center mt-2">Ultima atualizacao: {adminCompany.updated_at.slice(0, 16).replace('T', ' ')}</p>}
        </div>
      </div>
    )
  }

  // ========== ADMIN LOGS / SECURITY PAGE ==========
  const AdminLogsPage = () => (
    <div className="animate-fade-in p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setPage('admin_dash')} className="text-pink-600 text-sm flex items-center gap-1"><ChevronRight className="w-4 h-4 rotate-180" />Voltar</button>
        <h2 className="text-lg font-bold text-gray-800">Seguranca e Logs</h2>
        <button onClick={() => fetchAdminLogs()} className="p-2 bg-pink-50 rounded-xl"><RefreshCw className="w-4 h-4 text-pink-600" /></button>
      </div>

      {/* Permissions matrix */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><Lock className="w-4 h-4 text-pink-600" />Permissoes por Perfil</h3>
        <div className="space-y-2">
          {[
            { role: 'admin', perms: ['Acesso total', 'Gestao de usuarios', 'Configuracoes', 'Logs'] },
            { role: 'vendedor_ruby', perms: ['Dashboard', 'Ver promotoras', 'Relatorios'] },
            { role: 'gerente_loja', perms: ['Dashboard', 'Pedidos da loja', 'Promotoras da loja'] },
            { role: 'promotora', perms: ['Catalogo', 'Fazer pedidos', 'Desafios', 'Resgatar premios'] },
          ].map(item => (
            <div key={item.role} className="border border-gray-100 rounded-xl p-3">
              <p className="text-sm font-bold text-gray-800 capitalize mb-1">{item.role.replace('_', ' ')}</p>
              <div className="flex flex-wrap gap-1">
                {item.perms.map(p => <span key={p} className="text-[10px] bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full">{p}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity logs */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-pink-600" />Logs de Atividade</h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {adminLogs.map((log: Record<string, string>, i: number) => (
            <div key={i} className="border-b border-gray-50 pb-2 last:border-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-800">{log.action?.replace('_', ' ')}</p>
                <span className="text-[10px] text-gray-400">{(log.timestamp || '').slice(0, 16).replace('T', ' ')}</span>
              </div>
              <p className="text-xs text-gray-500">{log.user_name} — {log.details}</p>
            </div>
          ))}
          {adminLogs.length === 0 && <p className="text-center text-gray-400 py-4">Nenhuma atividade registrada</p>}
        </div>
      </div>
    </div>
  )


  // ========== MAIN LAYOUT ==========
  const isAdminPage = page.startsWith('admin_')

  const pages: Record<Page, () => JSX.Element> = {
    inicio: HomePage,
    catalogo: CatalogoPage,
    pedidos: PedidosPage,
    desafios: DesafiosPage,
    perfil: PerfilPage,
    admin_dash: AdminDashPage,
    admin_users: AdminUsersPage,
    admin_products: AdminProductsPage,
    admin_banners: AdminBannersPage,
    admin_orders: AdminOrdersPage,
    admin_company: AdminCompanyPage,
    admin_logs: AdminLogsPage,
  }

  const navItems: { id: Page; icon: any; label: string }[] = isAdminPage ? [
    { id: 'admin_dash', icon: BarChart3, label: 'Dashboard' },
    { id: 'admin_users', icon: Users, label: 'Usuarios' },
    { id: 'admin_products', icon: ShoppingBag, label: 'Produtos' },
    { id: 'admin_orders', icon: Package, label: 'Pedidos' },
    { id: 'inicio', icon: Home, label: 'App' },
  ] : [
    { id: 'inicio', icon: Home, label: 'Inicio' },
    { id: 'catalogo', icon: ShoppingCart, label: 'Catalogo' },
    { id: 'pedidos', icon: Package, label: 'Pedidos' },
    { id: 'desafios', icon: Trophy, label: 'Desafios' },
    ...(isAdmin ? [{ id: 'admin_dash' as Page, icon: Settings, label: 'Admin' }] : [{ id: 'perfil' as Page, icon: User, label: 'Perfil' }]),
  ]

  const CurrentPage = pages[page] || HomePage

  return (
    <div className="app-container">
      <div className="main-scroll">
        <CurrentPage />
      </div>

      {/* Cart floating button */}
      {cart.length > 0 && !showCart && !isAdminPage && (
        <button onClick={() => setShowCart(true)} className="fixed bottom-24 right-4 z-30 bg-pink-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg">
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-800 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{cart.length}</span>
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-2 py-1.5 flex items-center justify-around z-20">
        {navItems.map(item => {
          const active = page === item.id
          return (
            <button key={item.id} onClick={() => setPage(item.id)} className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${active ? 'text-pink-600' : 'text-gray-400'}`}>
              <item.icon className={`w-5 h-5 ${active ? 'text-pink-600' : 'text-gray-400'}`} />
              <span className={`text-[10px] ${active ? 'font-semibold text-pink-600' : 'text-gray-400'}`}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Modals */}
      <CartModal />
      <OrderDetailModal />
      <OrderSuccessModal />
      <RewardKitsModal />
      <LGPDBanner />
      <PrivacyModal />
      <DeleteModal />
      <Toast />
    </div>
  )
}

export default App

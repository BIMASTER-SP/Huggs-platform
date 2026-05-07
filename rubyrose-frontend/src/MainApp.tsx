import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { Search, Home, ShoppingCart, Package, Trophy, User, ChevronRight, Gift, Camera, X, Check, ShoppingBag, Sparkles, Plus, Minus, MapPin, CheckCircle, Truck, Award, Target, Send, FileText, Shield, Trash2, AlertTriangle, LogOut, Settings, Users, BarChart3, ToggleLeft, Save, Activity, BookOpen, ExternalLink, Image, Database, Link2, Menu, Upload, Wifi, WifiOff, ChevronLeft, TrendingUp, PieChart as PieChartIcon } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

const RAW_API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

let API = RAW_API
let tunnelAuth: string | null = null
try {
  const u = new URL(RAW_API)
  if (u.username) {
    tunnelAuth = btoa(`${u.username}:${u.password}`)
    u.username = ''
    u.password = ''
    API = u.origin + u.pathname.replace(/\/$/, '')
  }
} catch { /* not a valid URL, use as-is */ }

let authToken: string | null = localStorage.getItem('auth_token')

const apiFetch = async (path: string, opts?: RequestInit) => {
  const headers: Record<string, string> = { ...(opts?.headers as Record<string, string> || {}) }
  if (tunnelAuth) headers['Authorization'] = `Basic ${tunnelAuth}`
  if (authToken) headers['X-Auth-Token'] = authToken
  if (!tunnelAuth && authToken) headers['Authorization'] = `Bearer ${authToken}`
  const res = await fetch(`${API}${path}`, { ...opts, headers })
  if (res.status === 401) { authToken = null; localStorage.removeItem('auth_token'); window.location.reload() }
  if (!res.ok) { const err = await res.json().catch(() => ({ message: 'Erro de conexao' })); throw new Error(err.message || err.detail || `Erro ${res.status}`) }
  return res
}

type Page = 'inicio' | 'catalogo' | 'pedidos' | 'desafios' | 'perfil' | 'admin_dash' | 'admin_users' | 'admin_products' | 'admin_banners' | 'admin_orders' | 'admin_company' | 'admin_logs' | 'admin_stock' | 'admin_images' | 'admin_integrations'

interface CartItem { product_id: number; name: string; price: number; quantity: number; min_order: number; image: string }

const CHART_COLORS = ['#BE185D', '#EC4899', '#F472B6', '#FB923C', '#A78BFA', '#34D399', '#60A5FA', '#FBBF24']

function MainApp() {
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
  const [showOrderDetail, setShowOrderDetail] = useState<any>(null)
  const [showRewardKits, setShowRewardKits] = useState(false)
  const [showLGPD, setShowLGPD] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [privacyData, setPrivacyData] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [orderSuccess, setOrderSuccess] = useState<any>(null)
  const [adminStats, setAdminStats] = useState<any>(null)
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [adminProducts, setAdminProducts] = useState<any[]>([])
  const [adminBanners, setAdminBanners] = useState<any[]>([])
  const [adminOrders, setAdminOrders] = useState<any>(null)
  const [adminCompany, setAdminCompany] = useState<any>(null)
  const [adminLogs, setAdminLogs] = useState<any[]>([])
  const [_editingItem, setEditingItem] = useState<any>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [adminStock, setAdminStock] = useState<any[]>([])
  const [adminImages, setAdminImages] = useState<any[]>([])
  const [adminIntegrations, setAdminIntegrations] = useState<any[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [adminSearchQuery, setAdminSearchQuery] = useState('')
  const [adminPage, setAdminPage] = useState(1)
  const [adminTotalPages, setAdminTotalPages] = useState(1)
  const [adminFilterRole, setAdminFilterRole] = useState('')
  const [adminFilterStatus, setAdminFilterStatus] = useState('')
  const [adminFilterCategory, setAdminFilterCategory] = useState('')
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
  const unwrap = (resp: any) => resp.data !== undefined ? resp.data : resp

  // Login is handled by /login (LoginPage). After successful login the user lands here
  // and the LGPD banner is shown until they accept it once.
  useEffect(() => {
    if (isLoggedIn && !localStorage.getItem('lgpd_consent_b2b')) setShowLGPD(true)
  }, [isLoggedIn])

  const doLogout = () => {
    authToken = null
    localStorage.removeItem('auth_token')
    setIsLoggedIn(false)
    setUser(null)
    setDashboard(null)
    setCart([])
    setOrders([])
    setChallenges([])
    window.location.assign('/login')
  }

  const fetchDashboard = useCallback(async () => { if (!authToken) return; try { const res = await apiFetch('/api/dashboard'); const resp = await res.json(); const d = unwrap(resp); setDashboard(d); setUser(d.user) } catch { } }, [])
  const fetchCatalog = useCallback(async (cat?: string) => { try { const q = cat && cat !== 'Todas' ? `?category=${encodeURIComponent(cat)}` : ''; const res = await apiFetch(`/api/catalog${q}`); const resp = await res.json(); const d = unwrap(resp); setCatalog(Array.isArray(d) ? d : resp.data || []) } catch { } }, [])
  const fetchCategories = useCallback(async () => { try { const res = await apiFetch('/api/catalog/categories'); const resp = await res.json(); const d = unwrap(resp); setCategories(d.categories || d || []) } catch { } }, [])
  const fetchOrders = useCallback(async () => { if (!authToken) return; try { const res = await apiFetch('/api/orders'); const resp = await res.json(); const d = unwrap(resp); setOrders(Array.isArray(d) ? d : d.orders || []) } catch { } }, [])
  const fetchChallenges = useCallback(async () => { if (!authToken) return; try { const res = await apiFetch('/api/challenges'); const resp = await res.json(); const d = unwrap(resp); setChallenges(d.challenges || d || []) } catch { } }, [])
  const fetchRewardKits = useCallback(async () => { try { const res = await apiFetch('/api/rewards/kits'); const resp = await res.json(); const d = unwrap(resp); setRewardKits(d.kits || d || []) } catch { } }, [])

  const fetchAdminStats = useCallback(async () => { try { const r = await apiFetch('/api/admin/stats'); const resp = await r.json(); setAdminStats(unwrap(resp)) } catch { } }, [])
  const fetchAdminUsers = useCallback(async (pg = 1, search = '', role = '', status = '') => { try { const p = new URLSearchParams({ page: String(pg), per_page: '20' }); if (search) p.set('search', search); if (role) p.set('role', role); if (status) p.set('status', status); const r = await apiFetch(`/api/admin/users?${p}`); const resp = await r.json(); setAdminUsers(unwrap(resp) || []); if (resp.pagination) { setAdminTotalPages(resp.pagination.total_pages); setAdminPage(resp.pagination.page) } } catch { } }, [])
  const fetchAdminProducts = useCallback(async (pg = 1, search = '', category = '') => { try { const p = new URLSearchParams({ page: String(pg), per_page: '20' }); if (search) p.set('search', search); if (category) p.set('category', category); const r = await apiFetch(`/api/admin/products?${p}`); const resp = await r.json(); setAdminProducts(unwrap(resp) || []); if (resp.pagination) { setAdminTotalPages(resp.pagination.total_pages); setAdminPage(resp.pagination.page) } } catch { } }, [])
  const fetchAdminBanners = useCallback(async () => { try { const r = await apiFetch('/api/admin/banners'); const resp = await r.json(); const d = unwrap(resp); setAdminBanners(Array.isArray(d) ? d : d.banners || []) } catch { } }, [])
  const fetchAdminOrders = useCallback(async (pg = 1, search = '', status = '') => { try { const p = new URLSearchParams({ page: String(pg), per_page: '20' }); if (search) p.set('search', search); if (status) p.set('status', status); const r = await apiFetch(`/api/admin/orders?${p}`); const resp = await r.json(); setAdminOrders({ orders: unwrap(resp) || [], pagination: resp.pagination }) } catch { } }, [])
  const fetchAdminCompany = useCallback(async () => { try { const r = await apiFetch('/api/admin/company'); const resp = await r.json(); setAdminCompany(unwrap(resp)) } catch { } }, [])
  const fetchAdminLogs = useCallback(async (pg = 1, search = '') => { try { const p = new URLSearchParams({ page: String(pg), per_page: '50' }); if (search) p.set('search', search); const r = await apiFetch(`/api/admin/logs?${p}`); const resp = await r.json(); setAdminLogs(unwrap(resp) || []) } catch { } }, [])
  const fetchAdminStock = useCallback(async (pg = 1, search = '') => { try { const p = new URLSearchParams({ page: String(pg), per_page: '20' }); if (search) p.set('search', search); const r = await apiFetch(`/api/admin/stock?${p}`); const resp = await r.json(); setAdminStock(unwrap(resp) || []) } catch { } }, [])
  const fetchAdminImages = useCallback(async (pg = 1, search = '') => { try { const p = new URLSearchParams({ page: String(pg), per_page: '20' }); if (search) p.set('search', search); const r = await apiFetch(`/api/admin/images?${p}`); const resp = await r.json(); setAdminImages(unwrap(resp) || []) } catch { } }, [])
  const fetchAdminIntegrations = useCallback(async () => { try { const r = await apiFetch('/api/admin/integrations'); const resp = await r.json(); setAdminIntegrations(unwrap(resp) || []) } catch { } }, [])

  useEffect(() => { if (isLoggedIn) { fetchDashboard(); fetchCatalog(); fetchCategories(); fetchOrders(); fetchChallenges(); fetchRewardKits() } }, [isLoggedIn, fetchDashboard, fetchCatalog, fetchCategories, fetchOrders, fetchChallenges, fetchRewardKits])

  useEffect(() => {
    if (isLoggedIn && user?.role === 'admin' && page.startsWith('admin_')) {
      fetchAdminStats()
      if (page === 'admin_users') fetchAdminUsers(1, adminSearchQuery, adminFilterRole, adminFilterStatus)
      if (page === 'admin_products') fetchAdminProducts(1, adminSearchQuery, adminFilterCategory)
      if (page === 'admin_banners') fetchAdminBanners()
      if (page === 'admin_orders') fetchAdminOrders(1, adminSearchQuery, adminFilterStatus)
      if (page === 'admin_company') fetchAdminCompany()
      if (page === 'admin_logs') fetchAdminLogs(1, adminSearchQuery)
      if (page === 'admin_stock') fetchAdminStock(1, adminSearchQuery)
      if (page === 'admin_images') fetchAdminImages(1, adminSearchQuery)
      if (page === 'admin_integrations') fetchAdminIntegrations()
    }
    setAdminSearchQuery(''); setAdminPage(1); setAdminFilterRole(''); setAdminFilterStatus(''); setAdminFilterCategory('')
  }, [isLoggedIn, user?.role, page])

  useEffect(() => { if (dashboard?.banners?.length > 1) { const t = setInterval(() => setCurrentBanner(b => (b + 1) % dashboard.banners.length), 4000); return () => clearInterval(t) } }, [dashboard?.banners])

  const addToCart = (product: any) => { setCart(prev => { const existing = prev.find(i => i.product_id === product.id); if (existing) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + product.min_order } : i); return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: product.min_order, min_order: product.min_order, image: product.image }] }); showToast(`${product.name} adicionado ao carrinho`) }
  const updateCartQty = (productId: number, delta: number) => { setCart(prev => prev.map(i => { if (i.product_id !== productId) return i; const newQty = i.quantity + delta; return newQty >= i.min_order ? { ...i, quantity: newQty } : i }).filter(i => i.quantity >= i.min_order)) }
  const removeFromCart = (productId: number) => { setCart(prev => prev.filter(i => i.product_id !== productId)) }

  const submitOrder = async () => { if (cart.length === 0) return; try { const res = await apiFetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })) }) }); const resp = await res.json(); setOrderSuccess(unwrap(resp)); setCart([]); setShowCart(false); fetchOrders(); fetchDashboard() } catch (e: any) { showToast(e.message) } }
  const submitChallenge = async (challengeId: string) => { try { const res = await apiFetch('/api/challenges/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge_id: challengeId, notes: 'Foto da vitrine enviada via app' }) }); const resp = await res.json(); showToast(resp.message || 'Enviado!'); fetchChallenges(); fetchDashboard() } catch (e: any) { showToast(e.message) } }
  const redeemKit = async (kitId: string) => { try { const res = await apiFetch('/api/rewards/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kit_id: kitId }) }); const resp = await res.json(); showToast(resp.message || 'Resgatado!'); fetchDashboard(); fetchRewardKits() } catch (e: any) { showToast(e.message) } }

  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (!file) return null
    if (file.size > 5 * 1024 * 1024) { showToast('Arquivo muito grande. Max: 5MB'); return null }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { showToast('Tipo nao permitido'); return null }
    setUploading(true)
    try { const fd = new FormData(); fd.append('file', file); const res = await apiFetch('/api/upload', { method: 'POST', body: fd }); const resp = await res.json(); setUploading(false); return unwrap(resp)?.url || null } catch (e: any) { showToast(e.message); setUploading(false); return null }
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const statusColors: Record<string, string> = { enviado: 'bg-blue-100 text-blue-700', aprovado: 'bg-emerald-100 text-emerald-700', em_separacao: 'bg-yellow-100 text-yellow-700', em_transito: 'bg-purple-100 text-purple-700', entregue: 'bg-green-100 text-green-700', cancelado: 'bg-red-100 text-red-700' }
  const statusLabels: Record<string, string> = { enviado: 'Enviado', aprovado: 'Aprovado', em_separacao: 'Em Separacao', em_transito: 'Em Transito', entregue: 'Entregue', cancelado: 'Cancelado' }
  const statusIcons: Record<string, any> = { enviado: Send, aprovado: CheckCircle, em_separacao: Package, em_transito: Truck, entregue: Check, cancelado: X }

  // Pagination component
  const PaginationControls = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (p: number) => void }) => {
    if (totalPages <= 1) return null
    return (<div className="flex items-center justify-center gap-2 mt-4 pb-2">
      <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="p-2 rounded-lg bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4)); const pg = start + i; if (pg > totalPages) return null; return <button key={pg} onClick={() => onPageChange(pg)} className={`w-8 h-8 rounded-lg text-sm font-medium ${pg === currentPage ? 'bg-pink-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{pg}</button> })}
      <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="p-2 rounded-lg bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
      <span className="text-xs text-gray-500 ml-2">{currentPage}/{totalPages}</span>
    </div>)
  }

  const AdminSearchBar = ({ placeholder, onSearch, filters }: { placeholder?: string, onSearch: (q: string) => void, filters?: React.ReactNode }) => (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder={placeholder || 'Buscar...'} value={adminSearchQuery} onChange={e => { setAdminSearchQuery(e.target.value); onSearch(e.target.value) }} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-400" /></div>
      {filters}
    </div>
  )

  const ImageUploadZone = ({ onUpload, preview }: { onUpload: (url: string) => void, preview?: string | null }) => (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-pink-400 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
      <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp,image/gif" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setUploadPreview(reader.result as string); reader.readAsDataURL(file); const url = await handleImageUpload(file); if (url) onUpload(url) }} className="hidden" />
      {(preview || uploadPreview) ? (<div><img src={preview || uploadPreview || ''} alt="Preview" className="mx-auto max-h-32 rounded-lg object-cover" /><p className="text-xs text-gray-500 mt-2">{uploading ? 'Enviando...' : 'Clique para trocar'}</p></div>) : (<div><Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-500">{uploading ? 'Enviando...' : 'Clique ou arraste uma imagem'}</p><p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF - Max 5MB</p></div>)}
    </div>
  )

  // Login screen lives at /login (see App.tsx). MainApp is only rendered behind <ProtectedRoute>,
  // so isLoggedIn is always true here; doLogout below redirects to /login.

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

  // ========== ADMIN FORM HELPERS ==========
  const adminFormField = (label: string, key: string, type = 'text', placeholder = '') => (
    <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label><input type={type} value={formData[key] || ''} onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-400" /></div>
  )
  const adminSelectField = (label: string, key: string, options: { value: string, label: string }[]) => (
    <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label><select value={formData[key] || ''} onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))} className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-400">{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
  )
  const adminApiCall = async (method: string, url: string, body?: any, successMsg?: string) => {
    try {
      const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
      if (body) opts.body = JSON.stringify(body)
      const res = await apiFetch(url, opts)
      const resp = await res.json()
      showToast(resp.message || successMsg || 'Sucesso!')
      setShowCreateForm(false); setEditingItem(null); setFormData({})
      return resp
    } catch (e: any) { showToast(e.message); return null }
  }

  // ========== ADMIN DASHBOARD WITH RECHARTS ==========
  const AdminDashPage = () => {
    if (!adminStats) return <div className="p-6 text-center text-gray-500">Carregando...</div>
    const charts = adminStats.charts || {}
    return (
    <div className="p-4 lg:p-6 animate-fade-in admin-content-area">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-6 h-6 text-pink-600" />Dashboard Administrativo</h2>
      {/* KPI Cards */}
      <div className="admin-kpi-grid mb-6">
        {[
          { label: 'Usuarios', value: adminStats.total_users, icon: Users, color: 'bg-pink-50 text-pink-600' },
          { label: 'Pedidos', value: adminStats.total_orders, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
          { label: 'Receita', value: `R$ ${(adminStats.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Produtos', value: adminStats.total_products, icon: Package, color: 'bg-purple-50 text-purple-600' },
          { label: 'Lojas', value: adminStats.total_stores, icon: MapPin, color: 'bg-orange-50 text-orange-600' },
          { label: 'Desafios', value: adminStats.active_challenges, icon: Trophy, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Estoque Baixo', value: adminStats.low_stock_count || 0, icon: AlertTriangle, color: adminStats.low_stock_count > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600' },
          { label: 'Integracoes', value: `${adminStats.active_integrations || 0}/${adminStats.total_integrations || 0}`, icon: Link2, color: 'bg-indigo-50 text-indigo-600' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center mb-2`}><kpi.icon className="w-5 h-5" /></div>
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className="text-lg font-bold text-gray-800">{kpi.value}</p>
          </div>
        ))}
      </div>
      {/* Charts Row */}
      <div className="admin-charts-grid mb-6">
        {/* Sales by Period - Line Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-pink-600" />Vendas por Periodo</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.sales_by_period || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Vendas']} />
              <Line type="monotone" dataKey="vendas" stroke="#BE185D" strokeWidth={2} dot={{ fill: '#BE185D' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Order Status - Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-blue-600" />Status dos Pedidos</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={charts.orders_by_status || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`}>
                {(charts.orders_by_status || []).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="admin-charts-grid">
        {/* Top Products - Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-600" />Top Produtos</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.top_products || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Valor']} />
              <Bar dataKey="valor" fill="#A78BFA" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Stock Alerts */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Alertas de Estoque</h3>
          {(charts.stock_alerts || []).length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Nenhum alerta de estoque</p> : (
            <div className="space-y-2 max-h-52 overflow-y-auto">{(charts.stock_alerts || []).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-gray-700">{item.name}</span>
                <span className="text-sm font-bold text-red-600">{item.quantity} un</span>
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  )}

  // ========== ADMIN USERS PAGE (with search/filters/pagination) ==========
  const AdminUsersPage = () => (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users className="w-6 h-6 text-pink-600" />Usuarios</h2>
        <button onClick={() => { setFormData({ role: 'promotora', status: 'pending' }); setShowCreateForm(true) }} className="px-4 py-2 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 transition flex items-center gap-1"><Plus className="w-4 h-4" />Novo</button></div>
      <AdminSearchBar placeholder="Buscar usuario..." onSearch={q => fetchAdminUsers(1, q, adminFilterRole, adminFilterStatus)} filters={<>
        <select value={adminFilterRole} onChange={e => { setAdminFilterRole(e.target.value); fetchAdminUsers(1, adminSearchQuery, e.target.value, adminFilterStatus) }} className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"><option value="">Todos perfis</option><option value="admin">Admin</option><option value="promotora">Promotora</option><option value="vendedor_ruby">Vendedor</option><option value="gerente_loja">Gerente</option></select>
        <select value={adminFilterStatus} onChange={e => { setAdminFilterStatus(e.target.value); fetchAdminUsers(1, adminSearchQuery, adminFilterRole, e.target.value) }} className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"><option value="">Todos status</option><option value="active">Ativo</option><option value="pending">Pendente</option><option value="inactive">Inativo</option></select>
      </>} />
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">Nome</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Perfil</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Pontos</th><th className="px-4 py-3 text-right">Acoes</th></tr></thead>
        <tbody>{adminUsers.map((u: any) => (<tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/50">
          <td className="px-4 py-3 font-medium">{u.name}</td><td className="px-4 py-3 text-gray-500">{u.email}</td>
          <td className="px-4 py-3"><span className="px-2 py-1 bg-pink-50 text-pink-700 rounded-lg text-xs">{u.role}</span></td>
          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs ${u.status === 'active' ? 'bg-green-50 text-green-700' : u.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>{u.status}</span></td>
          <td className="px-4 py-3">{u.points}</td>
          <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
            {u.status === 'pending' && <button onClick={async () => { await adminApiCall('PATCH', `/api/admin/users/${u.id}/approve`); fetchAdminUsers(adminPage, adminSearchQuery) }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button>}
            <button onClick={async () => { await adminApiCall('PATCH', `/api/admin/users/${u.id}/toggle`); fetchAdminUsers(adminPage, adminSearchQuery) }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><ToggleLeft className="w-4 h-4" /></button>
          </div></td>
        </tr>))}</tbody></table></div>
      </div>
      <PaginationControls currentPage={adminPage} totalPages={adminTotalPages} onPageChange={p => fetchAdminUsers(p, adminSearchQuery, adminFilterRole, adminFilterStatus)} />
      {showCreateForm && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Novo Usuario</h3>
        {adminFormField('Nome', 'name')}{adminFormField('Email', 'email', 'email')}{adminFormField('Senha', 'password', 'password')}{adminFormField('CPF', 'cpf')}{adminFormField('Telefone', 'phone', 'tel')}
        {adminSelectField('Perfil', 'role', [{ value: 'promotora', label: 'Promotora' }, { value: 'vendedor_ruby', label: 'Vendedor Ruby' }, { value: 'gerente_loja', label: 'Gerente de Loja' }, { value: 'admin', label: 'Admin' }])}
        {adminSelectField('Status', 'status', [{ value: 'pending', label: 'Pendente' }, { value: 'active', label: 'Ativo' }])}
        {adminFormField('CNPJ da Loja', 'store_cnpj')}
        <div className="flex gap-2 mt-4"><button onClick={() => setShowCreateForm(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
          <button onClick={async () => { await adminApiCall('POST', '/api/admin/users', formData, 'Usuario criado!'); fetchAdminUsers() }} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium">Criar</button></div>
      </div></div>}
    </div>
  )

  // ========== ADMIN PRODUCTS PAGE (with search/filters/pagination) ==========
  const AdminProductsPage = () => (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Package className="w-6 h-6 text-pink-600" />Produtos</h2>
        <button onClick={() => { setFormData({ min_order: '6', stock_available: 'true', category: 'Maquiagem' }); setShowCreateForm(true) }} className="px-4 py-2 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 transition flex items-center gap-1"><Plus className="w-4 h-4" />Novo</button></div>
      <AdminSearchBar placeholder="Buscar produto..." onSearch={q => fetchAdminProducts(1, q, adminFilterCategory)} filters={
        <select value={adminFilterCategory} onChange={e => { setAdminFilterCategory(e.target.value); fetchAdminProducts(1, adminSearchQuery, e.target.value) }} className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"><option value="">Todas categorias</option><option value="Maquiagem">Maquiagem</option><option value="Skincare">Skincare</option><option value="Acessorios">Acessorios</option><option value="Unhas">Unhas</option></select>
      } />
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">Produto</th><th className="px-4 py-3 text-left">EAN</th><th className="px-4 py-3 text-left">Categoria</th><th className="px-4 py-3 text-right">Preco</th><th className="px-4 py-3 text-center">Ped. Min</th><th className="px-4 py-3 text-center">Disponivel</th><th className="px-4 py-3 text-right">Acoes</th></tr></thead>
        <tbody>{adminProducts.map((p: any) => (<tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
          <td className="px-4 py-3 font-medium">{p.name}</td><td className="px-4 py-3 text-gray-500 text-xs">{p.ean}</td>
          <td className="px-4 py-3"><span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs">{p.category}</span></td>
          <td className="px-4 py-3 text-right font-medium">R$ {p.price?.toFixed(2)}</td><td className="px-4 py-3 text-center">{p.min_order}</td>
          <td className="px-4 py-3 text-center">{p.stock_available ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-red-600 mx-auto" />}</td>
          <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
            <button onClick={async () => { await adminApiCall('PATCH', `/api/admin/products/${p.id}/toggle`); fetchAdminProducts(adminPage, adminSearchQuery) }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><ToggleLeft className="w-4 h-4" /></button>
            <button onClick={async () => { await adminApiCall('DELETE', `/api/admin/products/${p.id}`); fetchAdminProducts(adminPage, adminSearchQuery) }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
          </div></td>
        </tr>))}</tbody></table></div>
      </div>
      <PaginationControls currentPage={adminPage} totalPages={adminTotalPages} onPageChange={p => fetchAdminProducts(p, adminSearchQuery, adminFilterCategory)} />
      {showCreateForm && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Novo Produto</h3>
        {adminFormField('Nome', 'name')}{adminFormField('EAN', 'ean')}{adminFormField('Preco', 'price', 'number')}{adminFormField('Descricao', 'description')}{adminFormField('Pedido Minimo', 'min_order', 'number')}
        {adminSelectField('Categoria', 'category', [{ value: 'Maquiagem', label: 'Maquiagem' }, { value: 'Skincare', label: 'Skincare' }, { value: 'Acessorios', label: 'Acessorios' }, { value: 'Unhas', label: 'Unhas' }])}
        <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">Imagem do Produto</label><ImageUploadZone onUpload={url => setFormData(p => ({ ...p, image: url }))} preview={formData.image} /></div>
        <div className="flex gap-2 mt-4"><button onClick={() => setShowCreateForm(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
          <button onClick={async () => { const fd = { ...formData, price: parseFloat(formData.price || '0'), min_order: parseInt(formData.min_order || '6'), stock_available: true }; await adminApiCall('POST', '/api/admin/products', fd); fetchAdminProducts() }} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium">Criar</button></div>
      </div></div>}
    </div>
  )

  // ========== ADMIN BANNERS PAGE ==========
  const AdminBannersPage = () => (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><BookOpen className="w-6 h-6 text-pink-600" />Banners</h2>
        <button onClick={() => { setFormData({ color: 'rose', position: '1', active: 'true' }); setShowCreateForm(true) }} className="px-4 py-2 bg-pink-600 text-white rounded-xl text-sm font-medium flex items-center gap-1"><Plus className="w-4 h-4" />Novo</button></div>
      <div className="space-y-3">{adminBanners.map((b: any) => (
        <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
          <div><h3 className="font-medium text-gray-800">{b.title}</h3><p className="text-sm text-gray-500">{b.subtitle}</p><div className="flex items-center gap-2 mt-1"><span className={`px-2 py-0.5 rounded text-xs ${b.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{b.active ? 'Ativo' : 'Inativo'}</span><span className="text-xs text-gray-400">Pos: {b.position}</span><span className={`w-3 h-3 rounded-full bg-${b.color}-400`} /></div></div>
          <div className="flex gap-1"><button onClick={async () => { await adminApiCall('PATCH', `/api/admin/banners/${b.id}/toggle`); fetchAdminBanners() }} className="p-2 hover:bg-gray-100 rounded-lg"><ToggleLeft className="w-4 h-4 text-gray-500" /></button>
            <button onClick={async () => { await adminApiCall('DELETE', `/api/admin/banners/${b.id}`); fetchAdminBanners() }} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button></div>
        </div>
      ))}</div>
      {showCreateForm && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Novo Banner</h3>
        {adminFormField('Titulo', 'title')}{adminFormField('Subtitulo', 'subtitle')}{adminFormField('Descricao', 'description')}{adminFormField('Posicao', 'position', 'number')}
        {adminSelectField('Cor', 'color', [{ value: 'rose', label: 'Rosa' }, { value: 'purple', label: 'Roxo' }, { value: 'emerald', label: 'Verde' }, { value: 'blue', label: 'Azul' }])}
        <div className="flex gap-2 mt-4"><button onClick={() => setShowCreateForm(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
          <button onClick={async () => { await adminApiCall('POST', '/api/admin/banners', { ...formData, position: parseInt(formData.position || '1'), active: true, highlight: false }); fetchAdminBanners() }} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium">Criar</button></div>
      </div></div>}
    </div>
  )

  // ========== ADMIN ORDERS PAGE (with search/filters/pagination) ==========
  const AdminOrdersPage = () => {
    const ordersList = adminOrders?.orders || []
    return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-pink-600" />Pedidos</h2>
      <AdminSearchBar placeholder="Buscar pedido..." onSearch={q => fetchAdminOrders(1, q, adminFilterStatus)} filters={
        <select value={adminFilterStatus} onChange={e => { setAdminFilterStatus(e.target.value); fetchAdminOrders(1, adminSearchQuery, e.target.value) }} className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"><option value="">Todos status</option><option value="enviado">Enviado</option><option value="aprovado">Aprovado</option><option value="em_separacao">Em Separacao</option><option value="em_transito">Em Transito</option><option value="entregue">Entregue</option><option value="cancelado">Cancelado</option></select>
      } />
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">ID</th><th className="px-4 py-3 text-left">Loja</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-left">Data</th></tr></thead>
        <tbody>{ordersList.map((o: any) => (<tr key={o.id} className="border-t border-gray-50 hover:bg-gray-50/50">
          <td className="px-4 py-3 text-xs font-mono">{o.id?.slice(0, 12)}</td><td className="px-4 py-3">{o.store_name}</td>
          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs ${statusColors[o.status] || 'bg-gray-100'}`}>{statusLabels[o.status] || o.status}</span></td>
          <td className="px-4 py-3 text-right font-medium">R$ {o.total_value?.toFixed(2)}</td><td className="px-4 py-3 text-xs text-gray-500">{o.created_at?.slice(0, 10)}</td>
        </tr>))}</tbody></table></div>
      </div>
      {adminOrders?.pagination && <PaginationControls currentPage={adminOrders.pagination.page} totalPages={adminOrders.pagination.total_pages} onPageChange={p => fetchAdminOrders(p, adminSearchQuery, adminFilterStatus)} />}
    </div>
  )}

  // ========== ADMIN COMPANY SETTINGS ==========
  const AdminCompanyPage = () => {
    const [companyForm, setCompanyForm] = useState<Record<string, string>>({})
    useEffect(() => { if (adminCompany) setCompanyForm({ name: adminCompany.name || '', cnpj: adminCompany.cnpj || '', email: adminCompany.email || '', phone: adminCompany.phone || '', website: adminCompany.website || '', address: adminCompany.address || '', primary_color: adminCompany.primary_color || '#BE185D', logo_url: adminCompany.logo_url || '' }) }, [adminCompany])
    const saveCompany = async () => { try { const res = await apiFetch('/api/admin/company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(companyForm) }); const resp = await res.json(); showToast(resp.message || 'Salvo!'); fetchAdminCompany() } catch (e: any) { showToast(e.message) } }
    return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Settings className="w-6 h-6 text-pink-600" />Configuracoes da Empresa</h2>
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-2xl space-y-4">
        <div className="mb-4"><label className="block text-xs font-medium text-gray-600 mb-1">Logo da Empresa</label><ImageUploadZone onUpload={url => setCompanyForm(p => ({ ...p, logo_url: url }))} preview={companyForm.logo_url} /></div>
        {[{ l: 'Nome da Empresa', k: 'name' }, { l: 'CNPJ', k: 'cnpj' }, { l: 'Email', k: 'email', t: 'email' }, { l: 'Telefone', k: 'phone', t: 'tel' }, { l: 'Website', k: 'website', t: 'url' }, { l: 'Endereco', k: 'address' }].map(f => (
          <div key={f.k}><label className="block text-xs font-medium text-gray-600 mb-1">{f.l}</label><input type={f.t || 'text'} value={companyForm[f.k] || ''} onChange={e => setCompanyForm(p => ({ ...p, [f.k]: e.target.value }))} className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-400" /></div>
        ))}
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Cor Primaria</label><div className="flex items-center gap-2"><input type="color" value={companyForm.primary_color || '#BE185D'} onChange={e => setCompanyForm(p => ({ ...p, primary_color: e.target.value }))} className="w-10 h-10 rounded-lg border-0 cursor-pointer" /><span className="text-sm text-gray-500">{companyForm.primary_color}</span></div></div>
        <button onClick={saveCompany} className="w-full py-3 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 transition flex items-center justify-center gap-2"><Save className="w-4 h-4" />Salvar Configuracoes</button>
      </div>
    </div>
  )}

  // ========== ADMIN LOGS PAGE (with search/pagination) ==========
  const AdminLogsPage = () => (
    <div className="p-4 lg:p-6 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-6 h-6 text-pink-600" />Logs de Atividade</h2>
      <AdminSearchBar placeholder="Buscar em logs..." onSearch={q => fetchAdminLogs(1, q)} />
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">Data/Hora</th><th className="px-4 py-3 text-left">Usuario</th><th className="px-4 py-3 text-left">Acao</th><th className="px-4 py-3 text-left">Detalhes</th></tr></thead>
        <tbody>{adminLogs.map((item: any, i: number) => (<tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
          <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{item.timestamp?.replace('T', ' ').slice(0, 19)}</td>
          <td className="px-4 py-2.5 text-sm">{item.user_name}</td>
          <td className="px-4 py-2.5"><span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{item.action}</span></td>
          <td className="px-4 py-2.5 text-sm text-gray-600 max-w-xs truncate">{item.details}</td>
        </tr>))}</tbody></table></div>
      </div>
    </div>
  )

  // ========== ADMIN STOCK PAGE (with search/pagination) ==========
  const AdminStockPage = () => (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Database className="w-6 h-6 text-pink-600" />Gestao de Estoque</h2>
        <button onClick={() => { setFormData({ quantity: '100', low_stock_alert: '10', warehouse: 'SP-Principal' }); setShowCreateForm(true) }} className="px-4 py-2 bg-pink-600 text-white rounded-xl text-sm font-medium flex items-center gap-1"><Plus className="w-4 h-4" />Novo</button></div>
      <AdminSearchBar placeholder="Buscar no estoque..." onSearch={q => fetchAdminStock(1, q)} />
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">Produto</th><th className="px-4 py-3 text-left">EAN</th><th className="px-4 py-3 text-center">Quantidade</th><th className="px-4 py-3 text-center">Alerta</th><th className="px-4 py-3 text-left">Deposito</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-right">Acoes</th></tr></thead>
        <tbody>{adminStock.map((s: any) => (
          <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
            <td className="px-4 py-3 font-medium">{s.product_name}</td><td className="px-4 py-3 text-xs text-gray-500">{s.ean}</td>
            <td className="px-4 py-3 text-center font-medium">{s.quantity}</td><td className="px-4 py-3 text-center text-gray-500">{s.low_stock_alert}</td>
            <td className="px-4 py-3 text-sm">{s.warehouse}</td>
            <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-lg text-xs ${s.quantity <= s.low_stock_alert ? 'bg-red-50 text-red-700' : s.quantity <= s.low_stock_alert * 2 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>{s.quantity <= s.low_stock_alert ? 'Baixo' : s.quantity <= s.low_stock_alert * 2 ? 'Medio' : 'OK'}</span></td>
            <td className="px-4 py-3 text-right"><button onClick={async () => { await adminApiCall('DELETE', `/api/admin/stock/${s.id}`); fetchAdminStock() }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></td>
          </tr>
        ))}</tbody></table></div>
      </div>
      {showCreateForm && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Novo Registro de Estoque</h3>
        {adminFormField('Nome do Produto', 'product_name')}{adminFormField('EAN', 'ean')}{adminFormField('Quantidade', 'quantity', 'number')}{adminFormField('Alerta Estoque Baixo', 'low_stock_alert', 'number')}{adminFormField('Deposito', 'warehouse')}
        <div className="flex gap-2 mt-4"><button onClick={() => setShowCreateForm(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
          <button onClick={async () => { await adminApiCall('POST', '/api/admin/stock', { ...formData, quantity: parseInt(formData.quantity || '0'), low_stock_alert: parseInt(formData.low_stock_alert || '10') }); fetchAdminStock() }} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium">Criar</button></div>
      </div></div>}
    </div>
  )

  // ========== ADMIN IMAGES PAGE (with search, upload) ==========
  const AdminImagesPage = () => (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Image className="w-6 h-6 text-pink-600" />Galeria de Imagens</h2>
        <button onClick={() => { setFormData({ type: 'produto' }); setUploadPreview(null); setShowCreateForm(true) }} className="px-4 py-2 bg-pink-600 text-white rounded-xl text-sm font-medium flex items-center gap-1"><Plus className="w-4 h-4" />Nova</button></div>
      <AdminSearchBar placeholder="Buscar imagens..." onSearch={q => fetchAdminImages(1, q)} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {adminImages.map((img: any) => (
          <div key={img.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm group">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">{img.url ? <img src={img.url.startsWith('/') ? `${API}${img.url}` : img.url} alt={img.name} className="w-full h-full object-cover" /> : <Image className="w-8 h-8 text-gray-300" />}</div>
            <div className="p-3">
              <p className="text-sm font-medium text-gray-800 truncate">{img.name}</p>
              <p className="text-xs text-gray-500">{img.type} {img.product_name ? `- ${img.product_name}` : ''}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{img.size ? `${(img.size / 1024).toFixed(0)}KB` : '-'}</span>
                <button onClick={async () => { await adminApiCall('DELETE', `/api/admin/images/${img.id}`); fetchAdminImages() }} className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showCreateForm && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Nova Imagem</h3>
        <div className="mb-4"><ImageUploadZone onUpload={url => setFormData(p => ({ ...p, url }))} /></div>
        {adminFormField('Nome', 'name')}{adminFormField('Produto Associado', 'product_name')}
        {adminSelectField('Tipo', 'type', [{ value: 'produto', label: 'Produto' }, { value: 'banner', label: 'Banner' }, { value: 'marketing', label: 'Marketing' }, { value: 'vitrine', label: 'Vitrine' }])}
        <div className="flex gap-2 mt-4"><button onClick={() => { setShowCreateForm(false); setUploadPreview(null) }} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
          <button onClick={async () => { await adminApiCall('POST', '/api/admin/images', formData); fetchAdminImages(); setUploadPreview(null) }} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium">Salvar</button></div>
      </div></div>}
    </div>
  )

  // ========== ADMIN INTEGRATIONS PAGE ==========
  const AdminIntegrationsPage = () => (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Link2 className="w-6 h-6 text-pink-600" />Integracoes & APIs</h2>
        <button onClick={() => { setFormData({ type: 'erp', active: 'true' }); setShowCreateForm(true) }} className="px-4 py-2 bg-pink-600 text-white rounded-xl text-sm font-medium flex items-center gap-1"><Plus className="w-4 h-4" />Nova</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminIntegrations.map((ig: any) => (
          <div key={ig.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ig.active ? 'bg-green-50' : 'bg-gray-100'}`}>{ig.active ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-gray-400" />}</div>
                <div><h3 className="font-medium text-gray-800">{ig.name}</h3><p className="text-xs text-gray-500">{ig.type}</p></div></div>
              <span className={`px-2 py-1 rounded-lg text-xs ${ig.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{ig.active ? 'Conectado' : 'Desconectado'}</span>
            </div>
            {ig.description && <p className="text-sm text-gray-600 mb-2">{ig.description}</p>}
            {ig.api_url && <p className="text-xs text-gray-400 mb-1">URL: {ig.api_url}</p>}
            {ig.api_key_masked && <p className="text-xs text-gray-400 mb-2">API Key: {ig.api_key_masked}</p>}
            {ig.last_sync && <p className="text-xs text-gray-400 mb-3">Ultima sync: {ig.last_sync?.replace('T', ' ').slice(0, 19)}</p>}
            <div className="flex gap-2"><button onClick={async () => { await adminApiCall('PATCH', `/api/admin/integrations/${ig.id}/toggle`); fetchAdminIntegrations() }} className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${ig.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{ig.active ? 'Desconectar' : 'Conectar'}</button>
              <button onClick={async () => { await adminApiCall('DELETE', `/api/admin/integrations/${ig.id}`); fetchAdminIntegrations() }} className="py-2 px-3 bg-gray-50 text-gray-600 rounded-xl text-xs hover:bg-gray-100"><Trash2 className="w-3.5 h-3.5" /></button></div>
          </div>
        ))}
      </div>
      {showCreateForm && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Nova Integracao</h3>
        {adminFormField('Nome', 'name')}{adminFormField('URL da API', 'api_url', 'url')}{adminFormField('API Key', 'api_key')}{adminFormField('Descricao', 'description')}
        {adminSelectField('Tipo', 'type', [{ value: 'erp', label: 'ERP' }, { value: 'logistica', label: 'Logistica' }, { value: 'pagamento', label: 'Pagamento' }, { value: 'marketing', label: 'Marketing' }, { value: 'analytics', label: 'Analytics' }])}
        <div className="flex gap-2 mt-4"><button onClick={() => setShowCreateForm(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
          <button onClick={async () => { await adminApiCall('POST', '/api/admin/integrations', { ...formData, active: true }); fetchAdminIntegrations() }} className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium">Criar</button></div>
      </div></div>}
    </div>
  )


  // ========== PAGE MAPPING & NAVIGATION ==========
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
    admin_stock: AdminStockPage,
    admin_images: AdminImagesPage,
    admin_integrations: AdminIntegrationsPage,
  }

  const adminSidebarItems: { page: Page, icon: any, label: string }[] = [
    { page: 'admin_dash', icon: BarChart3, label: 'Dashboard' },
    { page: 'admin_users', icon: Users, label: 'Usuarios' },
    { page: 'admin_products', icon: Package, label: 'Produtos' },
    { page: 'admin_stock', icon: Database, label: 'Estoque' },
    { page: 'admin_orders', icon: ShoppingCart, label: 'Pedidos' },
    { page: 'admin_banners', icon: BookOpen, label: 'Banners' },
    { page: 'admin_images', icon: Image, label: 'Imagens' },
    { page: 'admin_integrations', icon: Link2, label: 'Integracoes' },
    { page: 'admin_company', icon: Settings, label: 'Empresa' },
    { page: 'admin_logs', icon: Activity, label: 'Logs' },
  ]

  const mobileNavItems: { page: Page, icon: any, label: string }[] = [
    { page: 'inicio', icon: Home, label: 'Inicio' },
    { page: 'catalogo', icon: ShoppingBag, label: 'Catalogo' },
    { page: 'pedidos', icon: Package, label: 'Pedidos' },
    { page: 'desafios', icon: Trophy, label: 'Desafios' },
    { page: 'perfil', icon: User, label: 'Perfil' },
  ]

  const CurrentPage = pages[page] || HomePage
  const isAdminPage = page.startsWith('admin_')

  // ========== MAIN LAYOUT ==========
  return (
    <div className={`app-container ${isAdminPage ? 'admin-active' : ''}`}>
      {/* ADMIN SIDEBAR (desktop) */}
      {isAdminPage && (
        <div className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-100 shadow-sm transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-16'} hidden lg:flex flex-col`}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            {sidebarOpen && <div className="flex items-center gap-2"><Sparkles className="w-6 h-6 text-pink-600" /><span className="font-bold text-gray-800">Admin</span></div>}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Menu className="w-5 h-5 text-gray-500" /></button>
          </div>
          <nav className="flex-1 py-2 overflow-y-auto">
            {adminSidebarItems.map(item => (
              <button key={item.page} onClick={() => setPage(item.page)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-pink-50 ${page === item.page ? 'bg-pink-50 text-pink-700 font-medium border-r-2 border-pink-600' : 'text-gray-600'}`}>
                <item.icon className="w-5 h-5 flex-shrink-0" />{sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <button onClick={() => setPage('inicio')} className="w-full flex items-center gap-2 py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-xl"><Home className="w-4 h-4" />{sidebarOpen && <span>Voltar ao App</span>}</button>
            <button onClick={doLogout} className="w-full flex items-center gap-2 py-2 px-3 text-sm text-red-500 hover:bg-red-50 rounded-xl mt-1"><LogOut className="w-4 h-4" />{sidebarOpen && <span>Sair</span>}</button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className={`main-scroll ${isAdminPage ? (sidebarOpen ? 'lg:ml-60' : 'lg:ml-16') : ''}`}>
        {/* Admin mobile header */}
        {isAdminPage && (
          <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-pink-600" /><span className="font-bold text-gray-800 text-sm">Admin Panel</span></div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage('inicio')} className="p-2 hover:bg-gray-100 rounded-lg"><Home className="w-4 h-4" /></button>
              <button onClick={doLogout} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        )}
        {/* Admin mobile nav tabs */}
        {isAdminPage && (
          <div className="lg:hidden overflow-x-auto border-b border-gray-100 bg-white">
            <div className="flex min-w-max">{adminSidebarItems.map(item => (
              <button key={item.page} onClick={() => setPage(item.page)} className={`flex flex-col items-center gap-1 px-4 py-2.5 text-xs whitespace-nowrap transition ${page === item.page ? 'text-pink-700 border-b-2 border-pink-600 font-medium' : 'text-gray-500'}`}>
                <item.icon className="w-4 h-4" /><span>{item.label}</span>
              </button>
            ))}</div>
          </div>
        )}

        <CurrentPage />
      </div>

      {/* PROMOTORA BOTTOM NAV (non-admin) */}
      {!isAdminPage && (
        <div className="bottom-nav">
          {mobileNavItems.map(item => (
            <button key={item.page} onClick={() => setPage(item.page)} className={`nav-item ${page === item.page ? 'active' : ''}`}>
              <item.icon className="w-5 h-5" /><span className="text-xs">{item.label}</span>
            </button>
          ))}
          {user?.role === 'admin' && (
            <button onClick={() => setPage('admin_dash')} className="nav-item"><Settings className="w-5 h-5" /><span className="text-xs">Admin</span></button>
          )}
        </div>
      )}

      {/* FLOATING CART */}
      {!isAdminPage && cartCount > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} className="fixed bottom-20 right-4 z-30 bg-pink-600 text-white rounded-full p-3.5 shadow-lg flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" /><span className="text-sm font-medium">{cartCount}</span>
        </button>
      )}

      {/* MODALS */}
      {showCart && <CartModal />}
      {showOrderDetail && <OrderDetailModal />}
      {orderSuccess && <OrderSuccessModal />}
      {showRewardKits && <RewardKitsModal />}
      {showLGPD && <LGPDBanner />}
      {showPrivacy && <PrivacyModal />}
      {showDeleteConfirm && <DeleteModal />}
      {toast && <Toast />}
    </div>
  )
}

export default MainApp

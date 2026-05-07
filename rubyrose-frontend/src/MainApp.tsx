import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { ShoppingCart, Package, X, Check, CheckCircle, Truck, Send } from 'lucide-react'

import { API_URL, tokenStorage } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/contexts/ToastContext'
import { AppModals, type ModalState } from '@/components/AppModals'
import { BottomNav } from '@/components/BottomNav'
import { AdminSidebar, AdminMobileChrome } from '@/components/AdminSidebar'
import { HomePage } from '@/pages/HomePage'
import { CatalogoPage } from '@/pages/CatalogoPage'
import { PedidosPage } from '@/pages/PedidosPage'
import { DesafiosPage } from '@/pages/DesafiosPage'
import { PerfilPage } from '@/pages/PerfilPage'
import {
  AdminDashPage, AdminUsersPage, AdminProductsPage, AdminBannersPage, AdminOrdersPage,
  AdminCompanyPage, AdminLogsPage, AdminStockPage, AdminImagesPage, AdminIntegrationsPage,
  type AdminPageProps,
} from '@/pages/admin/AdminPages'

// Thin fetch helper that wraps `fetch` with the same JWT Bearer + 401 handling
// as `lib/api.ts` but returns the raw Response so the existing call sites
// (which read `.json()` and unwrap manually) keep working. Page-by-page
// migration to `api.get/post` happens in subsequent PRs.
const apiFetch = async (path: string, opts?: RequestInit) => {
  const headers = new Headers(opts?.headers)
  const token = tokenStorage.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers })
  if (res.status === 401) {
    tokenStorage.clear()
    window.location.assign('/login')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro de conexao' }))
    throw new Error(err.message || err.detail || `Erro ${res.status}`)
  }
  return res
}

export type Page =
  | 'inicio' | 'catalogo' | 'pedidos' | 'desafios' | 'perfil'
  | 'admin_dash' | 'admin_users' | 'admin_products' | 'admin_banners' | 'admin_orders'
  | 'admin_company' | 'admin_logs' | 'admin_stock' | 'admin_images' | 'admin_integrations'

function MainApp() {
  // ----- contexts -----
  const { logout } = useAuth()
  const { showToast } = useToast()
  // CartContext owns items/total/qty/clear/submit. cartItems/cartCount used by main UI;
  // CartModal pulls the rest from the context directly.
  const { items: cartItems, count: cartCount, clear: clearCart, submit: submitCart } = useCart()

  // ----- local state -----
  const [page, setPage] = useState<Page>('inicio')
  const isLoggedIn = !!tokenStorage.get()
  const [user, setUser] = useState<any>(null)
  const [dashboard, setDashboard] = useState<any>(null)
  const [catalog, setCatalog] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [orders, setOrders] = useState<any[]>([])
  const [challenges, setChallenges] = useState<any[]>([])
  const [rewardKits, setRewardKits] = useState<any[]>([])
  const [showCart, setShowCart] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentBanner, setCurrentBanner] = useState(0)
  const [showOrderDetail, setShowOrderDetail] = useState<any>(null)
  const [showRewardKits, setShowRewardKits] = useState(false)
  const [showLGPD, setShowLGPD] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [privacyData, setPrivacyData] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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

  const unwrap = (resp: any) => (resp.data !== undefined ? resp.data : resp)

  // Login is handled by /login (LoginPage). After successful login the user lands here
  // and the LGPD banner is shown until they accept it once.
  useEffect(() => {
    if (isLoggedIn && !localStorage.getItem('lgpd_consent_b2b')) setShowLGPD(true)
  }, [isLoggedIn])

  const doLogout = () => {
    logout()
    clearCart()
    setUser(null)
    setDashboard(null)
    setOrders([])
    setChallenges([])
    window.location.assign('/login')
  }

  const fetchDashboard = useCallback(async () => { if (!tokenStorage.get()) return; try { const res = await apiFetch('/api/dashboard'); const resp = await res.json(); const d = unwrap(resp); setDashboard(d); setUser(d.user) } catch { } }, [])
  const fetchCatalog = useCallback(async (cat?: string) => { try { const q = cat && cat !== 'Todas' ? `?category=${encodeURIComponent(cat)}` : ''; const res = await apiFetch(`/api/catalog${q}`); const resp = await res.json(); const d = unwrap(resp); setCatalog(Array.isArray(d) ? d : resp.data || []) } catch { } }, [])
  const fetchCategories = useCallback(async () => { try { const res = await apiFetch('/api/catalog/categories'); const resp = await res.json(); const d = unwrap(resp); setCategories(d.categories || d || []) } catch { } }, [])
  const fetchOrders = useCallback(async () => { if (!tokenStorage.get()) return; try { const res = await apiFetch('/api/orders'); const resp = await res.json(); const d = unwrap(resp); setOrders(Array.isArray(d) ? d : d.orders || []) } catch { } }, [])
  const fetchChallenges = useCallback(async () => { if (!tokenStorage.get()) return; try { const res = await apiFetch('/api/challenges'); const resp = await res.json(); const d = unwrap(resp); setChallenges(d.challenges || d || []) } catch { } }, [])
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.role, page])

  useEffect(() => { if (dashboard?.banners?.length > 1) { const t = setInterval(() => setCurrentBanner(b => (b + 1) % dashboard.banners.length), 4000); return () => clearInterval(t) } }, [dashboard?.banners])

  // Cart logic now lives in CartContext (addToCart, updateCartQty, removeFromCart, clearCart, submitCart).
  const submitOrder = async () => {
    if (cartItems.length === 0) return
    const result = await submitCart()
    if (!result) return
    setOrderSuccess({ message: 'Pedido enviado com sucesso!', order: result.order })
    setShowCart(false)
    fetchOrders()
    fetchDashboard()
  }
  const submitChallenge = async (challengeId: string) => { try { const res = await apiFetch('/api/challenges/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge_id: challengeId, notes: 'Foto da vitrine enviada via app' }) }); const resp = await res.json(); showToast(resp.message || 'Enviado!'); fetchChallenges(); fetchDashboard() } catch (e: any) { showToast(e.message) } }
  const redeemKit = async (kitId: string) => { try { const res = await apiFetch('/api/rewards/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kit_id: kitId }) }); const resp = await res.json(); showToast(resp.message || 'Resgatado!'); fetchDashboard(); fetchRewardKits() } catch (e: any) { showToast(e.message) } }

  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (!file) return null
    if (file.size > 5 * 1024 * 1024) { showToast('Arquivo muito grande. Max: 5MB'); return null }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { showToast('Tipo nao permitido'); return null }
    setUploading(true)
    try { const fd = new FormData(); fd.append('file', file); const res = await apiFetch('/api/upload', { method: 'POST', body: fd }); const resp = await res.json(); setUploading(false); return unwrap(resp)?.url || null } catch (e: any) { showToast(e.message); setUploading(false); return null }
  }

  const statusColors: Record<string, string> = { enviado: 'bg-blue-100 text-blue-700', aprovado: 'bg-emerald-100 text-emerald-700', em_separacao: 'bg-yellow-100 text-yellow-700', em_transito: 'bg-purple-100 text-purple-700', entregue: 'bg-green-100 text-green-700', cancelado: 'bg-red-100 text-red-700' }
  const statusLabels: Record<string, string> = { enviado: 'Enviado', aprovado: 'Aprovado', em_separacao: 'Em Separacao', em_transito: 'Em Transito', entregue: 'Entregue', cancelado: 'Cancelado' }
  const statusIcons: Record<string, any> = { enviado: Send, aprovado: CheckCircle, em_separacao: Package, em_transito: Truck, entregue: Check, cancelado: X }

  // ========== MODAL CALLBACKS ==========
  const acceptLgpd = () => {
    setShowLGPD(false)
    localStorage.setItem('lgpd_consent_b2b', 'true')
    apiFetch('/api/lgpd/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent_data_collection: true, consent_marketing: true, consent_third_party: false }),
    }).catch(() => {})
  }
  const requestPrivacy = () => {
    setShowPrivacy(true)
    if (!privacyData) apiFetch('/api/lgpd/privacy-policy').then((r) => r.json()).then(setPrivacyData).catch(() => {})
  }
  const confirmDeleteAccount = async () => {
    try {
      await apiFetch('/api/lgpd/data', { method: 'DELETE' })
      doLogout()
    } catch { /* swallowed */ }
  }

  // adminApiCall stays here because it closes over MainApp's setShowCreateForm/setEditingItem.
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

  // ========== ADMIN PAGE BUNDLE ==========
  const adminBundle: AdminPageProps = {
    formData, setFormData, showCreateForm, setShowCreateForm,
    adminSearchQuery, setAdminSearchQuery, adminPage, adminTotalPages,
    adminFilterRole, setAdminFilterRole, adminFilterStatus, setAdminFilterStatus,
    adminFilterCategory, setAdminFilterCategory,
    uploadPreview, setUploadPreview, uploading, fileInputRef, handleImageUpload,
    adminApiCall, apiFetch, showToast,
    statusColors, statusLabels,
    adminStats, adminUsers, adminProducts, adminBanners, adminOrders, adminCompany,
    adminLogs, adminStock, adminImages, adminIntegrations,
    fetchAdminUsers, fetchAdminProducts, fetchAdminBanners, fetchAdminOrders,
    fetchAdminCompany, fetchAdminLogs, fetchAdminStock, fetchAdminImages, fetchAdminIntegrations,
  }

  // ========== PAGE MAPPING ==========
  const pages: Record<Page, () => JSX.Element> = {
    inicio: () => (
      <HomePage
        user={user}
        dashboard={dashboard}
        currentBanner={currentBanner}
        statusColors={statusColors}
        statusLabels={statusLabels}
        statusIcons={statusIcons}
        setPage={setPage}
        setShowOrderDetail={setShowOrderDetail}
        setShowRewardKits={setShowRewardKits}
      />
    ),
    catalogo: () => (
      <CatalogoPage
        catalog={catalog}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        fetchCatalog={fetchCatalog}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    ),
    pedidos: () => (
      <PedidosPage
        orders={orders}
        statusColors={statusColors}
        statusLabels={statusLabels}
        statusIcons={statusIcons}
        setPage={setPage}
        setShowOrderDetail={setShowOrderDetail}
      />
    ),
    desafios: () => <DesafiosPage challenges={challenges} submitChallenge={submitChallenge} />,
    perfil: () => (
      <PerfilPage
        user={user}
        dashboard={dashboard}
        privacyData={privacyData}
        setPrivacyData={setPrivacyData}
        setShowPrivacy={setShowPrivacy}
        setShowRewardKits={setShowRewardKits}
        setShowDeleteConfirm={setShowDeleteConfirm}
        doLogout={doLogout}
      />
    ),
    admin_dash: () => <AdminDashPage {...adminBundle} />,
    admin_users: () => <AdminUsersPage {...adminBundle} />,
    admin_products: () => <AdminProductsPage {...adminBundle} />,
    admin_banners: () => <AdminBannersPage {...adminBundle} />,
    admin_orders: () => <AdminOrdersPage {...adminBundle} />,
    admin_company: () => <AdminCompanyPage {...adminBundle} />,
    admin_logs: () => <AdminLogsPage {...adminBundle} />,
    admin_stock: () => <AdminStockPage {...adminBundle} />,
    admin_images: () => <AdminImagesPage {...adminBundle} />,
    admin_integrations: () => <AdminIntegrationsPage {...adminBundle} />,
  }

  const CurrentPage = pages[page] || pages.inicio
  const isAdminPage = page.startsWith('admin_')

  // ========== MAIN LAYOUT ==========
  const modalProps: ModalState = {
    showCart, setShowCart, onSubmitOrder: submitOrder,
    showOrderDetail, setShowOrderDetail, statusColors, statusLabels,
    orderSuccess, setOrderSuccess, onViewOrders: () => setPage('pedidos'),
    showRewardKits, setShowRewardKits, rewardKits, user, onRedeem: redeemKit,
    showLGPD, setShowLGPD, setShowPrivacy, privacyData, setPrivacyData,
    onAcceptLgpd: acceptLgpd, onRequestPrivacy: requestPrivacy,
    showPrivacy,
    showDeleteConfirm, setShowDeleteConfirm, onConfirmDelete: confirmDeleteAccount,
  }

  return (
    <div className={`app-container ${isAdminPage ? 'admin-active' : ''}`}>
      {isAdminPage && (
        <AdminSidebar
          current={page}
          onChange={setPage}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          onBackToApp={() => setPage('inicio')}
          onLogout={doLogout}
        />
      )}

      <div className={`main-scroll ${isAdminPage ? (sidebarOpen ? 'lg:ml-60' : 'lg:ml-16') : ''}`}>
        {isAdminPage && (
          <AdminMobileChrome
            current={page}
            onChange={setPage}
            onBackToApp={() => setPage('inicio')}
            onLogout={doLogout}
          />
        )}
        <CurrentPage />
      </div>

      {!isAdminPage && (
        <BottomNav current={page} onChange={setPage} showAdmin={user?.role === 'admin'} />
      )}

      {!isAdminPage && cartCount > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-20 right-4 z-30 bg-brand-600 text-white rounded-full p-3.5 shadow-lg flex items-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-sm font-medium">{cartCount}</span>
        </button>
      )}

      <AppModals {...modalProps} />
    </div>
  )
}

export default MainApp

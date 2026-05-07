import { useEffect, useState, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from 'react'
import {
  Search, Plus, Check, X, ChevronLeft, ChevronRight, Trash2, ToggleLeft,
  Upload, Wifi, WifiOff, Save, Settings, Activity, BookOpen, Database, Image,
  Link2, Package, ShoppingCart, Trophy, Users, BarChart3, MapPin, AlertTriangle,
  TrendingUp, PieChart as PieChartIcon,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { API_URL } from '@/lib/api'

const CHART_COLORS = ['#BE185D', '#EC4899', '#F472B6', '#FB923C', '#A78BFA', '#34D399', '#60A5FA', '#FBBF24']

// =====================================================================
// Shared bundle that MainApp passes to every admin page. Pages destructure
// only what they need.
// =====================================================================
export interface AdminPageProps {
  // Generic form state (used by Create modals)
  formData: Record<string, string>
  setFormData: Dispatch<SetStateAction<Record<string, string>>>
  showCreateForm: boolean
  setShowCreateForm: (v: boolean) => void

  // Search and filters (shared across listing pages)
  adminSearchQuery: string
  setAdminSearchQuery: (v: string) => void
  adminPage: number
  adminTotalPages: number
  adminFilterRole: string
  setAdminFilterRole: (v: string) => void
  adminFilterStatus: string
  setAdminFilterStatus: (v: string) => void
  adminFilterCategory: string
  setAdminFilterCategory: (v: string) => void

  // Upload
  uploadPreview: string | null
  setUploadPreview: (v: string | null) => void
  uploading: boolean
  fileInputRef: RefObject<HTMLInputElement>
  handleImageUpload: (file: File) => Promise<string | null>

  // API helpers (live in MainApp scope — passed in)
  adminApiCall: (method: string, url: string, body?: any, successMsg?: string) => Promise<any>
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>
  showToast: (msg: string) => void

  // Status maps (used by AdminOrders)
  statusColors: Record<string, string>
  statusLabels: Record<string, string>

  // Lists + their fetchers
  adminStats: any
  adminUsers: any[]
  adminProducts: any[]
  adminBanners: any[]
  adminOrders: any
  adminCompany: any
  adminLogs: any[]
  adminStock: any[]
  adminImages: any[]
  adminIntegrations: any[]

  fetchAdminUsers: (pg?: number, search?: string, role?: string, status?: string) => void
  fetchAdminProducts: (pg?: number, search?: string, category?: string) => void
  fetchAdminBanners: () => void
  fetchAdminOrders: (pg?: number, search?: string, status?: string) => void
  fetchAdminCompany: () => void
  fetchAdminLogs: (pg?: number, search?: string) => void
  fetchAdminStock: (pg?: number, search?: string) => void
  fetchAdminImages: (pg?: number, search?: string) => void
  fetchAdminIntegrations: () => void
}

// =====================================================================
// Shared UI helpers
// =====================================================================

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (p: number) => void
}

export function PaginationControls({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-4 pb-2">
      <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="p-2 rounded-lg bg-gray-100 disabled:opacity-30">
        <ChevronLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
        const pg = start + i
        if (pg > totalPages) return null
        return (
          <button
            key={pg}
            onClick={() => onPageChange(pg)}
            className={`w-8 h-8 rounded-lg text-sm font-medium ${pg === currentPage ? 'bg-brand-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {pg}
          </button>
        )
      })}
      <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="p-2 rounded-lg bg-gray-100 disabled:opacity-30">
        <ChevronRight className="w-4 h-4" />
      </button>
      <span className="text-xs text-gray-500 ml-2">{currentPage}/{totalPages}</span>
    </div>
  )
}

interface SearchBarProps {
  query: string
  setQuery: (v: string) => void
  placeholder?: string
  onSearch: (q: string) => void
  filters?: ReactNode
}

function AdminSearchBar({ query, setQuery, placeholder, onSearch, filters }: SearchBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder || 'Buscar...'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onSearch(e.target.value)
          }}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
        />
      </div>
      {filters}
    </div>
  )
}

interface ImageUploadProps {
  onUpload: (url: string) => void
  preview?: string | null
  fileInputRef: RefObject<HTMLInputElement>
  uploadPreview: string | null
  setUploadPreview: (v: string | null) => void
  uploading: boolean
  handleImageUpload: (file: File) => Promise<string | null>
}

function ImageUploadZone({ onUpload, preview, fileInputRef, uploadPreview, setUploadPreview, uploading, handleImageUpload }: ImageUploadProps) {
  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-brand-400 transition cursor-pointer"
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => setUploadPreview(reader.result as string)
          reader.readAsDataURL(file)
          const url = await handleImageUpload(file)
          if (url) onUpload(url)
        }}
        className="hidden"
      />
      {preview || uploadPreview ? (
        <div>
          <img src={preview || uploadPreview || ''} alt="Preview" className="mx-auto max-h-32 rounded-lg object-cover" />
          <p className="text-xs text-gray-500 mt-2">{uploading ? 'Enviando...' : 'Clique para trocar'}</p>
        </div>
      ) : (
        <div>
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{uploading ? 'Enviando...' : 'Clique ou arraste uma imagem'}</p>
          <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF - Max 5MB</p>
        </div>
      )}
    </div>
  )
}

// Form-field render helpers (used in Create modals). Receive a setter so they can
// live outside MainApp's scope.
function adminFormField(
  label: string,
  key: string,
  formData: Record<string, string>,
  setFormData: Dispatch<SetStateAction<Record<string, string>>>,
  type = 'text',
  placeholder = '',
) {
  return (
    <div className="mb-3" key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={formData[key] || ''}
        onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
      />
    </div>
  )
}

function adminSelectField(
  label: string,
  key: string,
  options: { value: string; label: string }[],
  formData: Record<string, string>,
  setFormData: Dispatch<SetStateAction<Record<string, string>>>,
) {
  return (
    <div className="mb-3" key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={formData[key] || ''}
        onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
        className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// =====================================================================
// Pages
// =====================================================================

export function AdminDashPage({ adminStats }: AdminPageProps) {
  if (!adminStats) return <div className="p-6 text-center text-gray-500">Carregando...</div>
  const charts = adminStats.charts || {}
  const kpis = [
    { label: 'Usuarios', value: adminStats.total_users, icon: Users, color: 'bg-brand-50 text-brand-600' },
    { label: 'Pedidos', value: adminStats.total_orders, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Receita', value: `R$ ${(adminStats.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Produtos', value: adminStats.total_products, icon: Package, color: 'bg-purple-50 text-purple-600' },
    { label: 'Lojas', value: adminStats.total_stores, icon: MapPin, color: 'bg-orange-50 text-orange-600' },
    { label: 'Desafios', value: adminStats.active_challenges, icon: Trophy, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Estoque Baixo', value: adminStats.low_stock_count || 0, icon: AlertTriangle, color: adminStats.low_stock_count > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600' },
    { label: 'Integracoes', value: `${adminStats.active_integrations || 0}/${adminStats.total_integrations || 0}`, icon: Link2, color: 'bg-indigo-50 text-indigo-600' },
  ]
  return (
    <div className="p-4 lg:p-6 animate-fade-in admin-content-area">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-brand-600" />Dashboard Administrativo
      </h2>

      <div className="admin-kpi-grid mb-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center mb-2`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className="text-lg font-bold text-gray-800">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="admin-charts-grid mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" />Vendas por Periodo
          </h3>
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
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-blue-600" />Status dos Pedidos
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={charts.orders_by_status || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`}>
                {(charts.orders_by_status || []).map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="admin-charts-grid">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />Top Produtos
          </h3>
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
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />Alertas de Estoque
          </h3>
          {(charts.stock_alerts || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum alerta de estoque</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {(charts.stock_alerts || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="text-sm font-bold text-red-600">{item.quantity} un</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AdminUsersPage(p: AdminPageProps) {
  const filters = (
    <>
      <select
        value={p.adminFilterRole}
        onChange={(e) => { p.setAdminFilterRole(e.target.value); p.fetchAdminUsers(1, p.adminSearchQuery, e.target.value, p.adminFilterStatus) }}
        className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
      >
        <option value="">Todos perfis</option>
        <option value="admin">Admin</option>
        <option value="promotora">Promotora</option>
        <option value="vendedor_ruby">Vendedor</option>
        <option value="gerente_loja">Gerente</option>
      </select>
      <select
        value={p.adminFilterStatus}
        onChange={(e) => { p.setAdminFilterStatus(e.target.value); p.fetchAdminUsers(1, p.adminSearchQuery, p.adminFilterRole, e.target.value) }}
        className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
      >
        <option value="">Todos status</option>
        <option value="active">Ativo</option>
        <option value="pending">Pendente</option>
        <option value="inactive">Inativo</option>
      </select>
    </>
  )
  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users className="w-6 h-6 text-brand-600" />Usuarios</h2>
        <button
          onClick={() => { p.setFormData({ role: 'promotora', status: 'pending' }); p.setShowCreateForm(true) }}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />Novo
        </button>
      </div>
      <AdminSearchBar
        query={p.adminSearchQuery}
        setQuery={p.setAdminSearchQuery}
        placeholder="Buscar usuario..."
        onSearch={(q) => p.fetchAdminUsers(1, q, p.adminFilterRole, p.adminFilterStatus)}
        filters={filters}
      />
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Perfil</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Pontos</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {p.adminUsers.map((u: any) => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs">{u.role}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs ${u.status === 'active' ? 'bg-green-50 text-green-700' : u.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>{u.status}</span></td>
                  <td className="px-4 py-3">{u.points}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {u.status === 'pending' && (
                        <button onClick={async () => { await p.adminApiCall('PATCH', `/api/admin/users/${u.id}/approve`); p.fetchAdminUsers(p.adminPage, p.adminSearchQuery) }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={async () => { await p.adminApiCall('PATCH', `/api/admin/users/${u.id}/toggle`); p.fetchAdminUsers(p.adminPage, p.adminSearchQuery) }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                        <ToggleLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <PaginationControls
        currentPage={p.adminPage}
        totalPages={p.adminTotalPages}
        onPageChange={(pg) => p.fetchAdminUsers(pg, p.adminSearchQuery, p.adminFilterRole, p.adminFilterStatus)}
      />
      {p.showCreateForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Novo Usuario</h3>
            {adminFormField('Nome', 'name', p.formData, p.setFormData)}
            {adminFormField('Email', 'email', p.formData, p.setFormData, 'email')}
            {adminFormField('Senha', 'password', p.formData, p.setFormData, 'password')}
            {adminFormField('CPF', 'cpf', p.formData, p.setFormData)}
            {adminFormField('Telefone', 'phone', p.formData, p.setFormData, 'tel')}
            {adminSelectField('Perfil', 'role', [
              { value: 'promotora', label: 'Promotora' },
              { value: 'vendedor_ruby', label: 'Vendedor Ruby' },
              { value: 'gerente_loja', label: 'Gerente de Loja' },
              { value: 'admin', label: 'Admin' },
            ], p.formData, p.setFormData)}
            {adminSelectField('Status', 'status', [
              { value: 'pending', label: 'Pendente' },
              { value: 'active', label: 'Ativo' },
            ], p.formData, p.setFormData)}
            {adminFormField('CNPJ da Loja', 'store_cnpj', p.formData, p.setFormData)}
            <div className="flex gap-2 mt-4">
              <button onClick={() => p.setShowCreateForm(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
              <button onClick={async () => { await p.adminApiCall('POST', '/api/admin/users', p.formData, 'Usuario criado!'); p.fetchAdminUsers() }} className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminProductsPage(p: AdminPageProps) {
  const filters = (
    <select
      value={p.adminFilterCategory}
      onChange={(e) => { p.setAdminFilterCategory(e.target.value); p.fetchAdminProducts(1, p.adminSearchQuery, e.target.value) }}
      className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
    >
      <option value="">Todas categorias</option>
      <option value="Maquiagem">Maquiagem</option>
      <option value="Skincare">Skincare</option>
      <option value="Acessorios">Acessorios</option>
      <option value="Unhas">Unhas</option>
    </select>
  )
  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Package className="w-6 h-6 text-brand-600" />Produtos</h2>
        <button
          onClick={() => { p.setFormData({ min_order: '6', stock_available: 'true', category: 'Maquiagem' }); p.setShowCreateForm(true) }}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />Novo
        </button>
      </div>
      <AdminSearchBar
        query={p.adminSearchQuery}
        setQuery={p.setAdminSearchQuery}
        placeholder="Buscar produto..."
        onSearch={(q) => p.fetchAdminProducts(1, q, p.adminFilterCategory)}
        filters={filters}
      />
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-left">EAN</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-right">Preco</th>
                <th className="px-4 py-3 text-center">Ped. Min</th>
                <th className="px-4 py-3 text-center">Disponivel</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {p.adminProducts.map((prod: any) => (
                <tr key={prod.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium">{prod.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{prod.ean}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs">{prod.category}</span></td>
                  <td className="px-4 py-3 text-right font-medium">R$ {prod.price?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">{prod.min_order}</td>
                  <td className="px-4 py-3 text-center">{prod.stock_available ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-red-600 mx-auto" />}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={async () => { await p.adminApiCall('PATCH', `/api/admin/products/${prod.id}/toggle`); p.fetchAdminProducts(p.adminPage, p.adminSearchQuery) }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                        <ToggleLeft className="w-4 h-4" />
                      </button>
                      <button onClick={async () => { await p.adminApiCall('DELETE', `/api/admin/products/${prod.id}`); p.fetchAdminProducts(p.adminPage, p.adminSearchQuery) }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <PaginationControls
        currentPage={p.adminPage}
        totalPages={p.adminTotalPages}
        onPageChange={(pg) => p.fetchAdminProducts(pg, p.adminSearchQuery, p.adminFilterCategory)}
      />
      {p.showCreateForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Novo Produto</h3>
            {adminFormField('Nome', 'name', p.formData, p.setFormData)}
            {adminFormField('EAN', 'ean', p.formData, p.setFormData)}
            {adminFormField('Preco', 'price', p.formData, p.setFormData, 'number')}
            {adminFormField('Descricao', 'description', p.formData, p.setFormData)}
            {adminFormField('Pedido Minimo', 'min_order', p.formData, p.setFormData, 'number')}
            {adminSelectField('Categoria', 'category', [
              { value: 'Maquiagem', label: 'Maquiagem' },
              { value: 'Skincare', label: 'Skincare' },
              { value: 'Acessorios', label: 'Acessorios' },
              { value: 'Unhas', label: 'Unhas' },
            ], p.formData, p.setFormData)}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Imagem do Produto</label>
              <ImageUploadZone
                onUpload={(url) => p.setFormData((prev) => ({ ...prev, image: url }))}
                preview={p.formData.image}
                fileInputRef={p.fileInputRef}
                uploadPreview={p.uploadPreview}
                setUploadPreview={p.setUploadPreview}
                uploading={p.uploading}
                handleImageUpload={p.handleImageUpload}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => p.setShowCreateForm(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
              <button
                onClick={async () => {
                  const fd = { ...p.formData, price: parseFloat(p.formData.price || '0'), min_order: parseInt(p.formData.min_order || '6'), stock_available: true }
                  await p.adminApiCall('POST', '/api/admin/products', fd)
                  p.fetchAdminProducts()
                }}
                className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminBannersPage(p: AdminPageProps) {
  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><BookOpen className="w-6 h-6 text-brand-600" />Banners</h2>
        <button
          onClick={() => { p.setFormData({ color: 'rose', position: '1', active: 'true' }); p.setShowCreateForm(true) }}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />Novo
        </button>
      </div>
      <div className="space-y-3">
        {p.adminBanners.map((b: any) => (
          <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800">{b.title}</h3>
              <p className="text-sm text-gray-500">{b.subtitle}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs ${b.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{b.active ? 'Ativo' : 'Inativo'}</span>
                <span className="text-xs text-gray-400">Pos: {b.position}</span>
                <span className={`w-3 h-3 rounded-full bg-${b.color}-400`} />
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={async () => { await p.adminApiCall('PATCH', `/api/admin/banners/${b.id}/toggle`); p.fetchAdminBanners() }} className="p-2 hover:bg-gray-100 rounded-lg">
                <ToggleLeft className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={async () => { await p.adminApiCall('DELETE', `/api/admin/banners/${b.id}`); p.fetchAdminBanners() }} className="p-2 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {p.showCreateForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Novo Banner</h3>
            {adminFormField('Titulo', 'title', p.formData, p.setFormData)}
            {adminFormField('Subtitulo', 'subtitle', p.formData, p.setFormData)}
            {adminFormField('Descricao', 'description', p.formData, p.setFormData)}
            {adminFormField('Posicao', 'position', p.formData, p.setFormData, 'number')}
            {adminSelectField('Cor', 'color', [
              { value: 'rose', label: 'Rosa' },
              { value: 'purple', label: 'Roxo' },
              { value: 'emerald', label: 'Verde' },
              { value: 'blue', label: 'Azul' },
            ], p.formData, p.setFormData)}
            <div className="flex gap-2 mt-4">
              <button onClick={() => p.setShowCreateForm(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
              <button
                onClick={async () => {
                  await p.adminApiCall('POST', '/api/admin/banners', { ...p.formData, position: parseInt(p.formData.position || '1'), active: true, highlight: false })
                  p.fetchAdminBanners()
                }}
                className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminOrdersPage(p: AdminPageProps) {
  const ordersList = p.adminOrders?.orders || []
  const filters = (
    <select
      value={p.adminFilterStatus}
      onChange={(e) => { p.setAdminFilterStatus(e.target.value); p.fetchAdminOrders(1, p.adminSearchQuery, e.target.value) }}
      className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
    >
      <option value="">Todos status</option>
      <option value="enviado">Enviado</option>
      <option value="aprovado">Aprovado</option>
      <option value="em_separacao">Em Separacao</option>
      <option value="em_transito">Em Transito</option>
      <option value="entregue">Entregue</option>
      <option value="cancelado">Cancelado</option>
    </select>
  )
  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-brand-600" />Pedidos</h2>
      <AdminSearchBar
        query={p.adminSearchQuery}
        setQuery={p.setAdminSearchQuery}
        placeholder="Buscar pedido..."
        onSearch={(q) => p.fetchAdminOrders(1, q, p.adminFilterStatus)}
        filters={filters}
      />
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Loja</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {ordersList.map((o: any) => (
                <tr key={o.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs font-mono">{o.id?.slice(0, 12)}</td>
                  <td className="px-4 py-3">{o.store_name}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs ${p.statusColors[o.status] || 'bg-gray-100'}`}>{p.statusLabels[o.status] || o.status}</span></td>
                  <td className="px-4 py-3 text-right font-medium">R$ {o.total_value?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{o.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {p.adminOrders?.pagination && (
        <PaginationControls
          currentPage={p.adminOrders.pagination.page}
          totalPages={p.adminOrders.pagination.total_pages}
          onPageChange={(pg) => p.fetchAdminOrders(pg, p.adminSearchQuery, p.adminFilterStatus)}
        />
      )}
    </div>
  )
}

export function AdminCompanyPage(p: AdminPageProps) {
  const [companyForm, setCompanyForm] = useState<Record<string, string>>({})
  useEffect(() => {
    if (p.adminCompany) {
      setCompanyForm({
        name: p.adminCompany.name || '',
        cnpj: p.adminCompany.cnpj || '',
        email: p.adminCompany.email || '',
        phone: p.adminCompany.phone || '',
        website: p.adminCompany.website || '',
        address: p.adminCompany.address || '',
        primary_color: p.adminCompany.primary_color || '#BE185D',
        logo_url: p.adminCompany.logo_url || '',
      })
    }
  }, [p.adminCompany])

  const saveCompany = async () => {
    try {
      const res = await p.apiFetch('/api/admin/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      })
      const resp = await res.json()
      p.showToast(resp.message || 'Salvo!')
      p.fetchAdminCompany()
    } catch (e: any) {
      p.showToast(e.message)
    }
  }

  const fields: { l: string; k: string; t?: string }[] = [
    { l: 'Nome da Empresa', k: 'name' },
    { l: 'CNPJ', k: 'cnpj' },
    { l: 'Email', k: 'email', t: 'email' },
    { l: 'Telefone', k: 'phone', t: 'tel' },
    { l: 'Website', k: 'website', t: 'url' },
    { l: 'Endereco', k: 'address' },
  ]

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Settings className="w-6 h-6 text-brand-600" />Configuracoes da Empresa</h2>
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-2xl space-y-4">
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Logo da Empresa</label>
          <ImageUploadZone
            onUpload={(url) => setCompanyForm((prev) => ({ ...prev, logo_url: url }))}
            preview={companyForm.logo_url}
            fileInputRef={p.fileInputRef}
            uploadPreview={p.uploadPreview}
            setUploadPreview={p.setUploadPreview}
            uploading={p.uploading}
            handleImageUpload={p.handleImageUpload}
          />
        </div>
        {fields.map((f) => (
          <div key={f.k}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{f.l}</label>
            <input
              type={f.t || 'text'}
              value={companyForm[f.k] || ''}
              onChange={(e) => setCompanyForm((prev) => ({ ...prev, [f.k]: e.target.value }))}
              className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cor Primaria</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={companyForm.primary_color || '#BE185D'}
              onChange={(e) => setCompanyForm((prev) => ({ ...prev, primary_color: e.target.value }))}
              className="w-10 h-10 rounded-lg border-0 cursor-pointer"
            />
            <span className="text-sm text-gray-500">{companyForm.primary_color}</span>
          </div>
        </div>
        <button onClick={saveCompany} className="w-full py-3 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />Salvar Configuracoes
        </button>
      </div>
    </div>
  )
}

export function AdminLogsPage(p: AdminPageProps) {
  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-6 h-6 text-brand-600" />Logs de Atividade</h2>
      <AdminSearchBar
        query={p.adminSearchQuery}
        setQuery={p.setAdminSearchQuery}
        placeholder="Buscar em logs..."
        onSearch={(q) => p.fetchAdminLogs(1, q)}
      />
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-4 py-3 text-left">Data/Hora</th>
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left">Acao</th>
                <th className="px-4 py-3 text-left">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {p.adminLogs.map((item: any, i: number) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{item.timestamp?.replace('T', ' ').slice(0, 19)}</td>
                  <td className="px-4 py-2.5 text-sm">{item.user_name}</td>
                  <td className="px-4 py-2.5"><span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{item.action}</span></td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 max-w-xs truncate">{item.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function AdminStockPage(p: AdminPageProps) {
  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Database className="w-6 h-6 text-brand-600" />Gestao de Estoque</h2>
        <button
          onClick={() => { p.setFormData({ quantity: '100', low_stock_alert: '10', warehouse: 'SP-Principal' }); p.setShowCreateForm(true) }}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />Novo
        </button>
      </div>
      <AdminSearchBar
        query={p.adminSearchQuery}
        setQuery={p.setAdminSearchQuery}
        placeholder="Buscar no estoque..."
        onSearch={(q) => p.fetchAdminStock(1, q)}
      />
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-left">EAN</th>
                <th className="px-4 py-3 text-center">Quantidade</th>
                <th className="px-4 py-3 text-center">Alerta</th>
                <th className="px-4 py-3 text-left">Deposito</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {p.adminStock.map((s: any) => (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium">{s.product_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.ean}</td>
                  <td className="px-4 py-3 text-center font-medium">{s.quantity}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{s.low_stock_alert}</td>
                  <td className="px-4 py-3 text-sm">{s.warehouse}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-lg text-xs ${s.quantity <= s.low_stock_alert ? 'bg-red-50 text-red-700' : s.quantity <= s.low_stock_alert * 2 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                      {s.quantity <= s.low_stock_alert ? 'Baixo' : s.quantity <= s.low_stock_alert * 2 ? 'Medio' : 'OK'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={async () => { await p.adminApiCall('DELETE', `/api/admin/stock/${s.id}`); p.fetchAdminStock() }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {p.showCreateForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Novo Registro de Estoque</h3>
            {adminFormField('Nome do Produto', 'product_name', p.formData, p.setFormData)}
            {adminFormField('EAN', 'ean', p.formData, p.setFormData)}
            {adminFormField('Quantidade', 'quantity', p.formData, p.setFormData, 'number')}
            {adminFormField('Alerta Estoque Baixo', 'low_stock_alert', p.formData, p.setFormData, 'number')}
            {adminFormField('Deposito', 'warehouse', p.formData, p.setFormData)}
            <div className="flex gap-2 mt-4">
              <button onClick={() => p.setShowCreateForm(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
              <button
                onClick={async () => {
                  await p.adminApiCall('POST', '/api/admin/stock', {
                    ...p.formData,
                    quantity: parseInt(p.formData.quantity || '0'),
                    low_stock_alert: parseInt(p.formData.low_stock_alert || '10'),
                  })
                  p.fetchAdminStock()
                }}
                className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminImagesPage(p: AdminPageProps) {
  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Image className="w-6 h-6 text-brand-600" />Galeria de Imagens</h2>
        <button
          onClick={() => { p.setFormData({ type: 'produto' }); p.setUploadPreview(null); p.setShowCreateForm(true) }}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />Nova
        </button>
      </div>
      <AdminSearchBar
        query={p.adminSearchQuery}
        setQuery={p.setAdminSearchQuery}
        placeholder="Buscar imagens..."
        onSearch={(q) => p.fetchAdminImages(1, q)}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {p.adminImages.map((img: any) => (
          <div key={img.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm group">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {img.url ? (
                <img src={img.url.startsWith('/') ? `${API_URL}${img.url}` : img.url} alt={img.name} className="w-full h-full object-cover" />
              ) : (
                <Image className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-gray-800 truncate">{img.name}</p>
              <p className="text-xs text-gray-500">{img.type} {img.product_name ? `- ${img.product_name}` : ''}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{img.size ? `${(img.size / 1024).toFixed(0)}KB` : '-'}</span>
                <button
                  onClick={async () => { await p.adminApiCall('DELETE', `/api/admin/images/${img.id}`); p.fetchAdminImages() }}
                  className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {p.showCreateForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Nova Imagem</h3>
            <div className="mb-4">
              <ImageUploadZone
                onUpload={(url) => p.setFormData((prev) => ({ ...prev, url }))}
                fileInputRef={p.fileInputRef}
                uploadPreview={p.uploadPreview}
                setUploadPreview={p.setUploadPreview}
                uploading={p.uploading}
                handleImageUpload={p.handleImageUpload}
              />
            </div>
            {adminFormField('Nome', 'name', p.formData, p.setFormData)}
            {adminFormField('Produto Associado', 'product_name', p.formData, p.setFormData)}
            {adminSelectField('Tipo', 'type', [
              { value: 'produto', label: 'Produto' },
              { value: 'banner', label: 'Banner' },
              { value: 'marketing', label: 'Marketing' },
              { value: 'vitrine', label: 'Vitrine' },
            ], p.formData, p.setFormData)}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { p.setShowCreateForm(false); p.setUploadPreview(null) }} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
              <button
                onClick={async () => {
                  await p.adminApiCall('POST', '/api/admin/images', p.formData)
                  p.fetchAdminImages()
                  p.setUploadPreview(null)
                }}
                className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminIntegrationsPage(p: AdminPageProps) {
  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Link2 className="w-6 h-6 text-brand-600" />Integracoes & APIs</h2>
        <button
          onClick={() => { p.setFormData({ type: 'erp', active: 'true' }); p.setShowCreateForm(true) }}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />Nova
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {p.adminIntegrations.map((ig: any) => (
          <div key={ig.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ig.active ? 'bg-green-50' : 'bg-gray-100'}`}>
                  {ig.active ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-gray-400" />}
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{ig.name}</h3>
                  <p className="text-xs text-gray-500">{ig.type}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-lg text-xs ${ig.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {ig.active ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            {ig.description && <p className="text-sm text-gray-600 mb-2">{ig.description}</p>}
            {ig.api_url && <p className="text-xs text-gray-400 mb-1">URL: {ig.api_url}</p>}
            {ig.api_key_masked && <p className="text-xs text-gray-400 mb-2">API Key: {ig.api_key_masked}</p>}
            {ig.last_sync && <p className="text-xs text-gray-400 mb-3">Ultima sync: {ig.last_sync?.replace('T', ' ').slice(0, 19)}</p>}
            <div className="flex gap-2">
              <button
                onClick={async () => { await p.adminApiCall('PATCH', `/api/admin/integrations/${ig.id}/toggle`); p.fetchAdminIntegrations() }}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${ig.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
              >
                {ig.active ? 'Desconectar' : 'Conectar'}
              </button>
              <button
                onClick={async () => { await p.adminApiCall('DELETE', `/api/admin/integrations/${ig.id}`); p.fetchAdminIntegrations() }}
                className="py-2 px-3 bg-gray-50 text-gray-600 rounded-xl text-xs hover:bg-gray-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {p.showCreateForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Nova Integracao</h3>
            {adminFormField('Nome', 'name', p.formData, p.setFormData)}
            {adminFormField('URL da API', 'api_url', p.formData, p.setFormData, 'url')}
            {adminFormField('API Key', 'api_key', p.formData, p.setFormData)}
            {adminFormField('Descricao', 'description', p.formData, p.setFormData)}
            {adminSelectField('Tipo', 'type', [
              { value: 'erp', label: 'ERP' },
              { value: 'logistica', label: 'Logistica' },
              { value: 'pagamento', label: 'Pagamento' },
              { value: 'marketing', label: 'Marketing' },
              { value: 'analytics', label: 'Analytics' },
            ], p.formData, p.setFormData)}
            <div className="flex gap-2 mt-4">
              <button onClick={() => p.setShowCreateForm(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">Cancelar</button>
              <button
                onClick={async () => {
                  await p.adminApiCall('POST', '/api/admin/integrations', { ...p.formData, active: true })
                  p.fetchAdminIntegrations()
                }}
                className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Use this to forward unused suppression for the prop bundle in MainApp.
export type _AdminPageBundle = AdminPageProps

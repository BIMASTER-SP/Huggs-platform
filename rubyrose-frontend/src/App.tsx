import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { Search, Home, Gamepad2, Receipt, User, ChevronRight, Star, Gift, Users, Diamond, Trophy, Camera, Keyboard, X, Check, ShoppingBag, Sparkles, Heart, ArrowRight, ScanLine, DollarSign, Percent, Truck, ThumbsUp, Ticket, CreditCard, Zap, Crown, Shield, Trash2, FileText, AlertTriangle } from 'lucide-react'

const RAW_API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function parseApiUrl(raw: string): { url: string; headers: Record<string, string> } {
  try {
    const u = new URL(raw)
    if (u.username) {
      const creds = btoa(`${u.username}:${u.password}`)
      u.username = ''
      u.password = ''
      return { url: u.origin, headers: { 'Authorization': `Basic ${creds}` } }
    }
  } catch {}
  return { url: raw, headers: {} }
}

const { url: API, headers: AUTH_HEADERS } = parseApiUrl(RAW_API)

const apiFetch = async (path: string, opts?: RequestInit) => {
  const merged = { ...opts, headers: { ...AUTH_HEADERS, ...(opts?.headers || {}) } }
  const res = await fetch(`${API}${path}`, merged)
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res
}

const safeJson = async (path: string, fallback: unknown) => {
  try {
    const res = await apiFetch(path)
    return await res.json()
  } catch {
    return fallback
  }
}

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

// Parceiros Ruby Rose - lojas que vendem produtos da marca
const parceirosRubyRose = [
  { name: 'Ruby Rose', cashback: '15%', color: '#C62828', initials: 'RR' },
  { name: 'Beleza Web', cashback: 'Até 8%', color: '#6A1B9A', initials: 'BW' },
  { name: 'MakeB Store', cashback: '5,5%', color: '#AD1457', initials: 'MB' },
  { name: 'GlamShop', cashback: 'Até 10%', color: '#00695C', initials: 'GS' },
  { name: 'Beauty Box', cashback: '10%', color: '#E65100', initials: 'BB' },
  { name: 'Rede Farma', cashback: '6%', color: '#0277BD', initials: 'RF' },
  { name: 'Perfumaria', cashback: '4%', color: '#4527A0', initials: 'PF' },
  { name: 'Make & Cia', cashback: '7%', color: '#B71C1C', initials: 'MC' },
]

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
  const [accessKey, setAccessKey] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentBanner, setCurrentBanner] = useState(0)
  const [showLGPDConsent, setShowLGPDConsent] = useState(() => !localStorage.getItem('lgpd_consent'))
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [privacyPolicyData, setPrivacyPolicyData] = useState<any>(null)

  // Fallback data for when API is unreachable
  const fallbackUser = { id: 'user-001', name: 'Maria Silva', email: 'maria@email.com', cpf: '***.***.***-45', points: 2850, cashback_balance: 47.90, total_cashback_earned: 234.50, receipts_count: 18, level: 'Ouro' }
  const fallbackProducts = [
    { id: 1, name: 'Base Liquida HD Ruby Rose', image: 'base', price: 39.90, cashback_percent: 15, category: 'Maquiagem', brand: 'Ruby Rose', max_per_person: 2 },
    { id: 2, name: 'Paleta de Sombras 18 Cores', image: 'paleta', price: 49.90, cashback_percent: 20, category: 'Maquiagem', brand: 'Ruby Rose', max_per_person: 1 },
    { id: 3, name: 'Batom Matte Longa Duracao', image: 'batom', price: 19.90, cashback_percent: 25, category: 'Maquiagem', brand: 'Ruby Rose', max_per_person: 3 },
    { id: 4, name: 'Mascara de Cilios Volume Max', image: 'mascara', price: 29.90, cashback_percent: 10, category: 'Maquiagem', brand: 'Ruby Rose', max_per_person: 2 },
    { id: 5, name: 'Po Compacto HD', image: 'po', price: 25.90, cashback_percent: 12, category: 'Maquiagem', brand: 'Ruby Rose', max_per_person: 2 },
    { id: 6, name: 'Primer Facial Hidratante', image: 'primer', price: 34.90, cashback_percent: 18, category: 'Skincare', brand: 'Ruby Rose', max_per_person: 1 },
    { id: 7, name: 'Serum Vitamina C', image: 'serum', price: 44.90, cashback_percent: 30, category: 'Skincare', brand: 'Ruby Rose', max_per_person: 1 },
    { id: 8, name: 'Agua Micelar 200ml', image: 'micelar', price: 22.90, cashback_percent: 15, category: 'Skincare', brand: 'Ruby Rose', max_per_person: 2 },
    { id: 9, name: 'Kit Pinceis Maquiagem 12pcs', image: 'pinceis', price: 59.90, cashback_percent: 20, category: 'Acessorios', brand: 'Ruby Rose', max_per_person: 1 },
    { id: 10, name: 'Esmalte Gel Ruby Rose', image: 'esmalte', price: 12.90, cashback_percent: 50, category: 'Unhas', brand: 'Ruby Rose', max_per_person: 5 },
    { id: 11, name: 'Lip Gloss Volumizador', image: 'gloss', price: 24.90, cashback_percent: 22, category: 'Maquiagem', brand: 'Ruby Rose', max_per_person: 2 },
    { id: 12, name: 'Corretivo Liquido HD', image: 'corretivo', price: 18.90, cashback_percent: 15, category: 'Maquiagem', brand: 'Ruby Rose', max_per_person: 2 },
  ]
  const fallbackCategories = ['Todas', 'Super Cashback', 'Maquiagem', 'Skincare', 'Unhas', 'Acessorios']
  const fallbackOffers = { banners: [
    { id: 1, title: 'Cashback de Boas-vindas', subtitle: 'Na sua primeira compra Ruby Rose', description: 'Ate R$30 de volta', color: 'purple', highlight: true },
    { id: 2, title: 'Semana Skincare', subtitle: 'Ate 30% de retorno', description: 'Valido esta semana', color: 'pink', highlight: false },
    { id: 3, title: 'Especial Beauty', subtitle: 'Pontos em dobro', description: 'Promocao limitada', color: 'rose', highlight: false },
  ]}
  const fallbackServices = [
    { id: 1, name: 'Quiz Beauty', icon: 'gamepad', badge: 'NOVO', badge_color: 'green' },
    { id: 2, name: 'Clube VIP', icon: 'diamond', badge: null, badge_color: null },
    { id: 3, name: 'Premios', icon: 'gift', badge: 'ESPECIAL', badge_color: 'pink' },
    { id: 4, name: 'Convide Amigas', icon: 'users', badge: null, badge_color: null },
  ]
  const fallbackRewards = [
    { id: 1, name: 'Desconto 15% na proxima compra', points_required: 200, type: 'discount', icon: 'percent', available: true },
    { id: 2, name: 'Frete Gratis', points_required: 300, type: 'shipping', icon: 'truck', available: true },
    { id: 3, name: 'Kit Miniatura Exclusivo', points_required: 500, type: 'product', icon: 'gift', available: true },
    { id: 4, name: 'Cashback R$10', points_required: 350, type: 'cashback', icon: 'dollar-sign', available: true },
    { id: 5, name: 'Sorteio Viagem Spa', points_required: 100, type: 'raffle', icon: 'star', available: true },
    { id: 6, name: 'Paleta Exclusiva Edicao Limitada', points_required: 1000, type: 'product', icon: 'palette', available: true },
  ]
  const fallbackMissions = [
    { id: 1, name: 'Envie 3 notas fiscais', description: 'Envie 3 cupons fiscais esta semana', points_reward: 100, progress: 1, total: 3, type: 'receipt' },
    { id: 2, name: 'Compre produtos Skincare', description: 'Compre qualquer produto da linha Skincare', points_reward: 150, progress: 0, total: 1, type: 'purchase' },
    { id: 3, name: 'Indique um amigo', description: 'Convide um amigo para usar o app', points_reward: 200, progress: 0, total: 1, type: 'referral' },
  ]

  const acceptLGPDConsent = () => {
    localStorage.setItem('lgpd_consent', JSON.stringify({ accepted: true, date: new Date().toISOString(), marketing: true, third_party: false }))
    setShowLGPDConsent(false)
    // Try to send consent to API
    apiFetch('/api/lgpd/consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent_data_collection: true, consent_marketing: true, consent_third_party: false }) }).catch(() => {})
  }

  const openPrivacyPolicy = async () => {
    setShowPrivacyPolicy(true)
    if (!privacyPolicyData) {
      try {
        const res = await apiFetch('/api/lgpd/privacy-policy')
        setPrivacyPolicyData(await res.json())
      } catch {
        setPrivacyPolicyData({ title: 'Politica de Privacidade', version: '1.0', sections: [{ title: 'Carregando...', content: 'Nao foi possivel carregar a politica de privacidade.' }] })
      }
    }
  }

  const fetchData = useCallback(async () => {
    const [u, p, c, o, s, rec, rew, m] = await Promise.all([
      safeJson('/api/user', fallbackUser),
      safeJson('/api/products', fallbackProducts),
      safeJson('/api/categories', fallbackCategories),
      safeJson('/api/offers', fallbackOffers),
      safeJson('/api/services', fallbackServices),
      safeJson('/api/receipts', { receipts: [] }),
      safeJson('/api/rewards', fallbackRewards),
      safeJson('/api/missions', fallbackMissions),
    ])
    setUser(u); setProducts(p); setCategories(c); setOffers(o)
    setServices(s); setReceipts(rec.receipts || []); setRewards(rew); setMissions(m)
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
    const path = cat === 'Todas' ? '/api/products' : `/api/products?category=${encodeURIComponent(cat)}`
    const p = await apiFetch(path).then(r => r.json())
    setProducts(p)
  }

  const submitCupom = async () => {
    if (!accessKey.trim()) return
    setScanning(true)
    try {
      const res = await apiFetch('/api/cupom/lookup', {
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

  // ========== HOME PAGE ==========
  const HomePage = () => (
    <div className="animate-fade-in">
      {/* Ruby Rose branded header - deep rose to white gradient */}
      <div style={{ background: 'linear-gradient(180deg, #F8D7DA 0%, #FCEEF0 50%, #FFFFFF 100%)' }} className="px-4 pt-4 pb-2">
        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Encontre produtos Ruby Rose"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full py-3.5 pl-4 pr-12 bg-white rounded-2xl text-gray-700 text-sm border border-gray-200 shadow-sm focus:outline-none focus:border-pink-300"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>

        {/* Banner Carousel */}
        {offers.banners?.length > 0 && (
          <div className="mb-4">
            <div className="relative overflow-hidden rounded-2xl">
              {offers.banners.map((b: any, i: number) => (
                <div key={b.id} className={`transition-all duration-500 ${i === currentBanner ? 'block' : 'hidden'}`}>
                  <div className="relative h-40 rounded-2xl overflow-hidden" style={{
                    background: b.color === 'purple'
                      ? 'linear-gradient(135deg, #8E24AA 0%, #AB47BC 100%)'
                      : b.color === 'pink'
                      ? 'linear-gradient(135deg, #E91E63 0%, #F06292 100%)'
                      : 'linear-gradient(135deg, #EC407A 0%, #F48FB1 100%)'
                  }}>
                    <div className="p-5 h-full flex flex-col justify-center">
                      {b.highlight && <span className="bg-yellow-400 text-purple-900 text-[10px] font-bold px-2.5 py-1 rounded-full self-start mb-2">DESTAQUE</span>}
                      <h3 className="text-white text-xl font-bold leading-tight">{b.title}</h3>
                      <p className="text-white/90 text-sm mt-1">{b.subtitle}</p>
                      <p className="text-white/70 text-xs mt-1">{b.description}</p>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
                    <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-white/10" />
                  </div>
                </div>
              ))}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {offers.banners.map((_: any, i: number) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentBanner ? 'bg-pink-500 w-5' : 'bg-gray-300 w-1.5'}`} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mundo Ruby Rose - brand services */}
      <div className="px-4 py-4">
        <h2 className="text-gray-900 font-bold text-lg mb-4">Mundo Ruby Rose</h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {services.map(s => {
            const Icon = serviceIcons[s.icon] || Gift
            return (
              <div key={s.id} className="flex-shrink-0 w-[120px] bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center shadow-sm">
                <div className="relative w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center mb-2">
                  <Icon className="w-6 h-6 text-pink-500" />
                </div>
                <span className="text-xs text-gray-700 font-medium text-center leading-tight">{s.name}</span>
                {s.badge && (
                  <span className={`mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full text-white ${s.badge_color === 'green' ? 'bg-green-500' : 'bg-pink-500'}`}>
                    {s.badge}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="section-divider" />

      {/* Mais Vendidos - top selling products */}
      <div className="py-4">
        <h2 className="text-gray-900 font-bold text-lg px-4 mb-4">Mais Vendidos</h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-2">
          {filteredProducts.slice(0, 6).map(p => (
            <div key={p.id} className="flex-shrink-0 w-[180px] bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="h-36 bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-3">
                <ShoppingBag className="w-14 h-14 text-pink-300" />
              </div>
              <div className="p-3">
                <p className="text-gray-400 text-[10px] font-medium mb-0.5">Ruby Rose</p>
                <p className="text-gray-800 text-xs font-medium leading-tight line-clamp-2 mb-1.5">{p.name}</p>
                <p className="text-gray-900 font-bold text-sm">R$ {p.price?.toFixed(2)}</p>
                <p className="text-pink-600 text-xs font-semibold">{p.cashback_percent}% cashback</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider" />

      {/* Enviar Nota Fiscal */}
      <div className="px-4 py-4">
        <button
          onClick={() => { setPage('notas'); setTimeout(() => setShowScanner(true), 100) }}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 flex items-center gap-3 shadow-lg active:scale-[0.98] transition-transform"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <ScanLine className="w-6 h-6 text-white" />
          </div>
          <div className="text-left flex-1">
            <p className="text-white font-bold text-[15px]">Enviar nota fiscal</p>
            <p className="text-white/80 text-xs">Escaneie o QR Code e ganhe cashback</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/80" />
        </button>
      </div>

      <div className="section-divider" />

      {/* Onde Encontrar - Ruby Rose authorized retailers */}
      <div className="py-4">
        <div className="flex items-center justify-between px-4 mb-1">
          <h2 className="text-gray-900 font-bold text-lg">Onde Encontrar</h2>
          <span className="text-rose-600 text-sm font-medium">Ver todas</span>
        </div>
        <p className="text-gray-500 text-xs px-4 mb-4">Lojas parceiras com cashback Ruby Rose</p>

        {/* Partner Highlight Banner */}
        <div className="px-4 mb-4">
          <div className="h-40 rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #880E4F 0%, #C2185B 40%, #AD1457 100%)' }}>
            <div className="p-5 h-full flex flex-col justify-center relative z-10">
              <p className="text-white/90 text-sm font-medium mb-1">Exclusivo para voce</p>
              <p className="text-white text-lg font-bold leading-tight">Cashback especial<br/><span className="text-rose-200">nos nossos parceiros</span></p>
            </div>
            <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute right-8 bottom-4 w-16 h-16 rounded-full bg-white/10" />
            <div className="absolute -left-2 -bottom-6 w-20 h-20 rounded-full bg-white/5" />
          </div>
        </div>

        {/* Partner Grid 4x2 */}
        <div className="grid grid-cols-4 gap-y-5 gap-x-2 px-4">
          {parceirosRubyRose.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1.5 shadow-sm border border-gray-100" style={{ background: s.color + '15' }}>
                <span className="font-bold text-sm" style={{ color: s.color }}>{s.initials}</span>
              </div>
              <span className="text-[10px] text-gray-600 text-center leading-tight truncate w-full">{s.name}</span>
              <span className="text-xs font-bold text-gray-800">{s.cashback}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider" />

      {/* Promocoes Exclusivas section */}
      <div className="py-4">
        <h2 className="text-gray-900 font-bold text-lg px-4 mb-4">Promocoes Exclusivas</h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-2">
          <div className="flex-shrink-0 w-[300px] h-44 rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #4A0E2E 0%, #7B1340 50%, #4A0E2E 100%)' }}>
            <div className="p-5 h-full flex flex-col justify-center relative z-10">
              <p className="text-white/80 text-xs">Novos membros</p>
              <p className="text-white text-2xl font-bold">Cashback total</p>
              <p className="text-rose-300 text-3xl font-black">na 1a compra</p>
              <p className="text-white/80 text-sm">Ate R$ 30 de volta</p>
              <div className="mt-2 bg-rose-600 rounded-full px-4 py-1.5 self-start">
                <span className="text-white text-xs font-bold">Aproveitar</span>
              </div>
            </div>
            <div className="absolute right-4 top-4 w-20 h-20 bg-rose-500/20 rounded-full" />
            <div className="absolute right-12 bottom-6 w-12 h-12 bg-amber-500/20 rounded-full" />
          </div>
          <div className="flex-shrink-0 w-[300px] h-44 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #C62828 0%, #E53935 100%)' }}>
            <div className="p-5 h-full flex flex-col justify-center">
              <p className="text-white/80 text-xs">Convide amigas</p>
              <p className="text-white text-xl font-bold">Ganhe R$ 20</p>
              <p className="text-white/90 text-sm mt-1">por cada indicacao</p>
              <div className="mt-2 bg-white/20 rounded-full px-4 py-1.5 self-start">
                <span className="text-white text-xs font-bold">Convidar</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-divider" />

      {/* Cupons de Desconto */}
      <div className="py-4">
        <h2 className="text-gray-900 font-bold text-lg px-4 mb-1">Cupons de Desconto</h2>
        <p className="text-gray-500 text-xs px-4 mb-4">Ofertas selecionadas para voce</p>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-2">
          {[
            { store: 'Ruby Rose', discount: '20% OFF', code: 'RUBY20' },
            { store: 'Drogasil', discount: 'R$30 OFF', code: 'DROGA30' },
            { store: 'Panvel', discount: '15% OFF', code: 'PANVEL15' },
          ].map((c, i) => (
            <div key={i} className="flex-shrink-0 w-[160px] bg-pink-50 rounded-2xl p-4 border border-pink-100">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-2 shadow-sm">
                <Ticket className="w-5 h-5 text-pink-500" />
              </div>
              <p className="text-gray-500 text-[10px] font-medium">{c.store}</p>
              <p className="text-gray-900 font-black text-lg leading-tight">CUPOM</p>
              <p className="text-pink-600 font-black text-xl leading-tight">{c.discount}</p>
              <div className="mt-2 bg-pink-500 rounded-full px-3 py-1 text-center">
                <span className="text-white text-[10px] font-bold">{c.code}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider" />

      {/* Categorias */}
      <div className="py-4 px-4">
        <h2 className="text-gray-900 font-bold text-lg mb-3">Categorias</h2>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {categories.map(c => (
            <button key={c} onClick={() => fetchProducts(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === c ? 'bg-pink-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
            >{c}</button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 font-bold text-lg">Vitrine Ruby Rose</h2>
            <span className="text-rose-600 text-sm font-medium">Ver todos</span>
        </div>
        <div className="space-y-3">
          {filteredProducts.slice(0, 4).map(p => (
            <div key={p.id} className="bg-white rounded-xl p-3 flex gap-3 border border-gray-100 shadow-sm">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-10 h-10 text-pink-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-[10px] font-medium">Ruby Rose</p>
                <p className="text-gray-800 text-sm font-medium leading-tight line-clamp-2 mb-1">{p.name}</p>
                <p className="text-gray-900 font-bold text-base">R$ {p.price?.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-pink-600 text-xs font-semibold">Ate {p.cashback_percent}% cashback</span>
                  <div className="flex items-center gap-1 text-gray-400">
                    <ThumbsUp className="w-3 h-3" />
                    <span className="text-[10px]">{Math.floor(Math.random() * 200 + 50)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider" />

      {/* Lojas Visitadas */}
      <div className="py-4">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-gray-900 font-bold text-lg">Parceiros em Alta</h2>
          <span className="text-rose-600 text-sm font-medium">Ver todos</span>
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-2">
            {parceirosRubyRose.slice(0, 5).map((s, i) => (
              <div key={i} className="flex-shrink-0 w-[200px] bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: s.color + '15' }}>
                    <span className="font-bold text-sm" style={{ color: s.color }}>{s.initials}</span>
                  </div>
                  <div>
                    <p className="text-gray-800 text-sm font-medium">{s.name}</p>
                    <p className="text-rose-600 text-xs font-semibold">Ate {s.cashback} cashback</p>
                  </div>
                </div>
                <div className="h-0.5 bg-rose-500 rounded-full w-1/3" />
              </div>
            ))}
        </div>
      </div>

      {/* Missoes */}
      <div className="section-divider" />
      <div className="py-4 px-4 pb-6">
        <h2 className="text-gray-900 font-bold text-lg mb-3">Desafios da Semana</h2>
        {missions.slice(0, 3).map(m => (
          <div key={m.id} className="bg-white rounded-xl p-3 mb-2 shadow-sm flex items-center gap-3 border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-pink-500" />
            </div>
            <div className="flex-1">
              <p className="text-gray-800 text-sm font-medium">{m.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-gradient-to-r from-pink-400 to-pink-500 rounded-full" style={{ width: `${(m.progress / m.total) * 100}%` }} />
                </div>
                <span className="text-[10px] text-gray-500">{m.progress}/{m.total}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-pink-500 text-xs font-bold">+{m.points_reward}</span>
              <p className="text-[9px] text-gray-400">pts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ========== NOTAS PAGE ==========
  const NotasPage = () => (
    <div className="animate-fade-in">
      <div style={{ background: 'linear-gradient(180deg, #F8D7DA 0%, #FFFFFF 100%)' }} className="px-4 pt-6 pb-6">
        <h1 className="text-gray-900 font-bold text-xl mb-1">Meus Cupons Fiscais</h1>
        <p className="text-gray-500 text-sm mb-4">Envie seus cupons fiscais e ganhe cashback</p>
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl p-4 text-center shadow-sm border border-pink-100">
            <p className="text-pink-600 text-2xl font-bold">{receipts.length}</p>
            <p className="text-gray-500 text-xs">Notas enviadas</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-4 text-center shadow-sm border border-pink-100">
            <p className="text-pink-600 text-2xl font-bold">R$ {receipts.reduce((s, r) => s + r.cashback_total, 0).toFixed(2)}</p>
            <p className="text-gray-500 text-xs">Cashback total</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-2 mb-4">
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

      <div className="px-4 mb-5">
        <h3 className="text-gray-900 font-bold text-base mb-3">Como funciona</h3>
        <div className="flex gap-3">
          {[
            { icon: Camera, title: 'Escaneie', desc: 'o QR Code da nota' },
            { icon: Search, title: 'Identificamos', desc: 'produtos Ruby Rose' },
            { icon: DollarSign, title: 'Cashback', desc: 'creditado na hora' },
          ].map((step, i) => (
            <div key={i} className="flex-1 bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-2">
                <step.icon className="w-5 h-5 text-pink-500" />
              </div>
              <p className="text-gray-800 text-xs font-semibold">{step.title}</p>
              <p className="text-gray-400 text-[10px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider" />

      <div className="px-4 py-4">
        <h3 className="text-gray-900 font-bold text-base mb-3">Historico</h3>
        {receipts.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Nenhuma nota enviada</p>
            <p className="text-gray-400 text-xs">Envie seu primeiro cupom fiscal!</p>
          </div>
        ) : (
          receipts.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-gray-800 text-sm font-semibold">{r.store.name}</p>
                    <p className="text-gray-400 text-[10px]">{r.store.city} - {r.store.state}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-600 font-bold text-sm">+R$ {r.cashback_total.toFixed(2)}</p>
                  <p className="text-green-500 text-[10px]">+{r.points_earned} pts</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 mb-1.5">
                <p className="text-gray-500 text-[10px]">{r.items.length} itens | {r.ruby_rose_items} Ruby Rose</p>
                <p className="text-gray-500 text-[10px]">R$ {r.total_value.toFixed(2)}</p>
              </div>
              {r.items.filter(it => it.is_ruby_rose).map((it, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-gray-700 text-xs">{it.name}</span>
                  </div>
                  <span className="text-green-600 text-xs font-semibold">+R$ {(it.cashback_value || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )

  // ========== CONTA PAGE ==========
  const ContaPage = () => (
    <div className="animate-fade-in">
      <div style={{ background: 'linear-gradient(180deg, #FDE4EC 0%, #FFFFFF 100%)' }} className="px-4 pt-6 pb-6">
        <h1 className="text-gray-900 font-bold text-xl mb-4">Minha Conta</h1>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center">
              <User className="w-7 h-7 text-pink-500" />
            </div>
            <div>
              <p className="text-gray-800 font-bold text-base">{user?.name || 'Carregando...'}</p>
              <p className="text-gray-400 text-xs">{user?.email}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Crown className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-xs font-semibold text-yellow-600">Nivel {user?.level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-2">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Pontos', value: user?.points?.toLocaleString('pt-BR') || '0', icon: Star, color: 'text-yellow-500' },
            { label: 'Cashback', value: `R$ ${user?.cashback_balance?.toFixed(2) || '0.00'}`, icon: DollarSign, color: 'text-green-500' },
            { label: 'Notas', value: user?.receipts_count || 0, icon: Receipt, color: 'text-pink-500' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-gray-800 font-bold text-sm">{s.value}</p>
              <p className="text-gray-400 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider" />

      <div className="px-4 py-4">
        <h3 className="text-gray-900 font-bold text-base mb-3">Recompensas</h3>
        <div className="grid grid-cols-2 gap-3">
          {rewards.map(r => {
            const Icon = rewardIcons[r.icon] || Gift
            return (
              <div key={r.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-pink-500" />
                  </div>
                  <p className="text-gray-800 text-xs font-medium flex-1 leading-tight">{r.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{r.points_required} pts</span>
                  <span className="text-[10px] text-pink-500 font-semibold bg-pink-50 px-2 py-0.5 rounded-full">Resgatar</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="section-divider" />

      <div className="px-4 py-4">
        <h3 className="text-gray-900 font-bold text-base mb-3">Missoes ativas</h3>
        {missions.map(m => (
          <div key={m.id} className="bg-white rounded-xl p-3 mb-2 shadow-sm flex items-center gap-3 border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-pink-500" />
            </div>
            <div className="flex-1">
              <p className="text-gray-800 text-sm font-medium">{m.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-pink-400 rounded-full" style={{ width: `${(m.progress / m.total) * 100}%` }} />
                </div>
                <span className="text-[10px] text-gray-500">{m.progress}/{m.total}</span>
              </div>
            </div>
            <span className="text-pink-500 text-xs font-bold">+{m.points_reward} pts</span>
          </div>
        ))}
      </div>

      <div className="section-divider" />

      {/* LGPD / Configuracoes */}
      <div className="px-4 py-4 pb-6">
        <h3 className="text-gray-900 font-bold text-base mb-3">Configuracoes e Privacidade</h3>
        <div className="space-y-2">
          <button onClick={openPrivacyPolicy} className="w-full flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm active:bg-gray-50">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-800 text-sm font-medium">Politica de Privacidade</p>
              <p className="text-gray-400 text-[10px]">LGPD - Seus direitos e dados</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button onClick={openPrivacyPolicy} className="w-full flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm active:bg-gray-50">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-800 text-sm font-medium">Exportar meus dados</p>
              <p className="text-gray-400 text-[10px]">Baixar copia dos seus dados</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center gap-3 bg-white rounded-xl p-3 border border-red-100 shadow-sm active:bg-red-50">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-red-600 text-sm font-medium">Excluir minha conta</p>
              <p className="text-gray-400 text-[10px]">Remover todos os seus dados</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  )

  // ========== LGPD CONSENT BANNER ==========
  const LGPDConsentBanner = () => showLGPDConsent ? (
    <div className="fixed bottom-16 left-0 right-0 z-50 flex justify-center px-4 animate-slide-up">
      <div className="w-full max-w-[430px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3 mb-3">
          <Shield className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-gray-900 font-bold text-sm">Sua privacidade importa</h3>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed">
              Utilizamos seus dados para personalizar ofertas de cashback e melhorar sua experiencia. 
              Voce pode gerenciar suas preferencias a qualquer momento em Perfil {'>'} Configuracoes.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={openPrivacyPolicy} className="flex-1 py-2.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-xl">
            Saiba mais
          </button>
          <button onClick={acceptLGPDConsent} className="flex-1 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl shadow">
            Aceitar e continuar
          </button>
        </div>
      </div>
    </div>
  ) : null

  // ========== PRIVACY POLICY MODAL ==========
  const PrivacyPolicyModal = () => showPrivacyPolicy ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowPrivacyPolicy(false)}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white w-full max-w-[430px] rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <h2 className="text-gray-900 font-bold text-base">Politica de Privacidade</h2>
          </div>
          <button onClick={() => setShowPrivacyPolicy(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          {privacyPolicyData ? (
            <div className="space-y-4">
              <p className="text-gray-400 text-xs">Versao {privacyPolicyData.version} | Ultima atualizacao: {privacyPolicyData.last_updated || '2026-03-01'}</p>
              {privacyPolicyData.sections?.map((s: any, i: number) => (
                <div key={i}>
                  <h3 className="text-gray-900 font-bold text-sm mb-1">{s.title}</h3>
                  <p className="text-gray-600 text-xs leading-relaxed">{s.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Carregando...</p>
          )}
        </div>
      </div>
    </div>
  ) : null

  // ========== DELETE ACCOUNT CONFIRMATION ==========
  const DeleteConfirmModal = () => showDeleteConfirm ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowDeleteConfirm(false)}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white w-full max-w-[350px] rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-3">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-gray-900 font-bold text-base mb-1">Excluir conta?</h3>
          <p className="text-gray-500 text-xs mb-4 leading-relaxed">
            Esta acao e irreversivel. Todos os seus dados, pontos e cashback serao permanentemente removidos conforme a LGPD.
          </p>
          <div className="flex gap-2 w-full">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl">
              Cancelar
            </button>
            <button onClick={() => { setShowDeleteConfirm(false); alert('Solicitacao de exclusao enviada. Seus dados serao removidos em ate 15 dias uteis.') }} className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl">
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null

  // ========== PREMIOS PAGE ==========
  const JogosPage = () => (
    <div className="animate-fade-in">
      <div style={{ background: 'linear-gradient(180deg, #F8D7DA 0%, #FFFFFF 100%)' }} className="px-4 pt-6 pb-6">
        <h1 className="text-gray-900 font-bold text-xl mb-1">Ganhe Premios</h1>
        <p className="text-gray-500 text-sm">Participe e acumule pontos Ruby Rose</p>
      </div>
      <div className="px-4 space-y-3 pb-6">
        {[
          { name: 'Quiz de Beleza', desc: 'Teste seus conhecimentos de make', pts: 500, icon: Zap, bg: 'from-rose-600 to-rose-800' },
          { name: 'Avalie Produtos', desc: 'De sua opiniao e ganhe pontos', pts: 200, icon: Star, bg: 'from-pink-500 to-pink-700' },
          { name: 'Desafio Semanal', desc: 'Complete metas e suba de nivel', pts: 100, icon: Trophy, bg: 'from-amber-500 to-amber-700' },
          { name: 'Convide Amigas', desc: 'Indique e ganhe pontos extras', pts: 300, icon: Gift, bg: 'from-purple-500 to-purple-700' },
        ].map((g, i) => (
          <div key={i} className={`bg-gradient-to-r ${g.bg} rounded-2xl p-4 flex items-center gap-4 shadow-lg`}>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <g.icon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-base">{g.name}</p>
              <p className="text-white/80 text-xs">{g.desc}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">+{g.pts}</p>
              <p className="text-white/70 text-[10px]">pontos</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ========== RESGATE PAGE ==========
  const PixPage = () => (
    <div className="animate-fade-in">
      <div style={{ background: 'linear-gradient(180deg, #F8D7DA 0%, #FFFFFF 100%)' }} className="px-4 pt-6 pb-6">
        <h1 className="text-gray-900 font-bold text-xl mb-1">Resgate</h1>
        <p className="text-gray-500 text-sm">Transfira seu cashback para sua conta</p>
      </div>
      <div className="px-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 text-center mb-4">
          <p className="text-gray-500 text-sm">Saldo disponivel</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">R$ {user?.cashback_balance?.toFixed(2) || '0.00'}</p>
          <button className="mt-4 w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 rounded-xl active:scale-[0.98] transition-transform shadow-lg">
            Sacar via Pix
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-pink-500" />
            <h3 className="text-gray-900 font-bold text-sm">Chave Pix</h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs">CPF</p>
            <p className="text-gray-800 text-sm font-medium">{user?.cpf || '***.***.***-**'}</p>
          </div>
        </div>

        <h3 className="text-gray-900 font-bold text-base mb-3">Historico</h3>
        {[
          { desc: 'Saque Pix', value: -25.00, date: '10/03/2026' },
          { desc: 'Cashback - Drogasil', value: 12.50, date: '08/03/2026' },
          { desc: 'Cashback - Ruby Rose', value: 38.90, date: '05/03/2026' },
        ].map((t, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.value > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {t.value > 0 ? <ArrowRight className="w-4 h-4 text-green-600 rotate-[-45deg]" /> : <ArrowRight className="w-4 h-4 text-red-600 rotate-[135deg]" />}
              </div>
              <div>
                <p className="text-gray-800 text-sm font-medium">{t.desc}</p>
                <p className="text-gray-400 text-[10px]">{t.date}</p>
              </div>
            </div>
            <p className={`font-bold text-sm ${t.value > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {t.value > 0 ? '+' : ''}R$ {Math.abs(t.value).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  // ========== SCANNER MODAL ==========
  const ScannerModal = () => (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => { setShowScanner(false); setLookupResult(null) }}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white w-full max-w-[430px] rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-gray-900 font-bold text-base">Enviar cupom fiscal</h2>
          <button onClick={() => { setShowScanner(false); setLookupResult(null) }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {!lookupResult ? (
          <div className="p-4">
            {/* Tab buttons */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <Camera className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">QR Code</span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pink-50 border border-pink-200">
                <Keyboard className="w-4 h-4 text-pink-600" />
                <span className="text-sm text-pink-600 font-medium">Chave manual</span>
              </div>
            </div>

            <p className="text-gray-700 text-sm font-medium mb-2">Chave de acesso da NFe (44 digitos)</p>
            <textarea
              value={accessKey}
              onChange={e => setAccessKey(e.target.value)}
              placeholder="Ex: 35260312345678000195550010001234561001234567"
              className="w-full h-20 p-3 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:border-pink-400"
            />
            <p className="text-gray-400 text-[10px] mt-1 mb-2">A chave de acesso esta no cupom fiscal, abaixo do codigo de barras. Sao 44 numeros.</p>

            <p className="text-gray-500 text-xs mb-2">Chaves de teste:</p>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setAccessKey('35260312345678000195550010001234561001234567')} className="text-xs bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-medium border border-pink-200">Teste 1</button>
              <button onClick={() => setAccessKey('31260498765432000155650020002345672002345678')} className="text-xs bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-medium border border-pink-200">Teste 2</button>
            </div>

            <button
              onClick={submitCupom}
              disabled={!accessKey.trim() || scanning}
              className={`w-full py-3.5 rounded-xl font-bold text-white transition-all ${accessKey.trim() && !scanning ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg active:scale-[0.98]' : 'bg-gray-300'}`}
            >
              {scanning ? 'Consultando...' : 'Consultar cupom fiscal'}
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="bg-green-50 rounded-2xl p-5 text-center mb-4 border border-green-200">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg">Cupom processado!</h3>
              <p className="text-green-700 text-sm mt-1">{lookupResult.message}</p>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-[10px]">Loja</p>
              <p className="text-gray-900 font-bold">{lookupResult.receipt.store.name}</p>
              <p className="text-gray-500 text-xs">{lookupResult.receipt.store.city} - {lookupResult.receipt.store.state}</p>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-green-50 rounded-xl p-3 text-center border border-green-100">
                <p className="text-green-700 font-bold text-lg">R$ {lookupResult.cashback_earned.toFixed(2)}</p>
                <p className="text-green-600 text-[10px]">Cashback ganho</p>
              </div>
              <div className="flex-1 bg-yellow-50 rounded-xl p-3 text-center border border-yellow-100">
                <p className="text-yellow-700 font-bold text-lg">+{lookupResult.points_earned}</p>
                <p className="text-yellow-600 text-[10px]">Pontos</p>
              </div>
            </div>

            <h4 className="text-gray-900 font-bold text-sm mb-2">Produtos encontrados</h4>
            {lookupResult.receipt.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {it.is_ruby_rose && <Heart className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-gray-800 text-xs font-medium truncate">{it.name}</p>
                    <p className="text-gray-400 text-[10px]">{it.quantity}x R$ {it.unit_price.toFixed(2)}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-gray-800 text-xs font-medium">R$ {it.total.toFixed(2)}</p>
                  {it.is_ruby_rose && <p className="text-green-600 text-[10px] font-semibold">+R$ {(it.cashback_value || 0).toFixed(2)}</p>}
                </div>
              </div>
            ))}

            <button
              onClick={() => { setShowScanner(false); setLookupResult(null) }}
              className="w-full mt-4 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg active:scale-[0.98] transition-transform"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const pages: Record<Page, JSX.Element> = {
    inicio: <HomePage />,
    jogos: <JogosPage />,
    pix: <PixPage />,
    notas: <NotasPage />,
    conta: <ContaPage />,
  }

  const navItems: { id: Page; label: string; icon: any }[] = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'jogos', label: 'Premios', icon: Gift },
    { id: 'pix', label: 'Resgatar', icon: DollarSign },
    { id: 'notas', label: 'Cupons', icon: Receipt },
    { id: 'conta', label: 'Perfil', icon: User },
  ]

  return (
    <div className="app-container">
      <div className="main-scroll">
        {pages[page]}
      </div>

      {/* Bottom Navigation - Ruby Rose branded */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 pb-2 pt-1.5 z-40" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-around">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex flex-col items-center py-1 px-3 transition-all ${page === item.id ? 'text-rose-600' : 'text-gray-400'}`}
            >
              <item.icon className={`w-5 h-5 ${page === item.id ? 'text-rose-600' : 'text-gray-400'}`} />
              <span className={`text-[10px] mt-0.5 font-medium ${page === item.id ? 'text-rose-600' : 'text-gray-400'}`}>{item.label}</span>
              {page === item.id && <div className="w-1 h-1 rounded-full bg-rose-600 mt-0.5" />}
            </button>
          ))}
        </div>
      </div>

      {showScanner && <ScannerModal />}
      <LGPDConsentBanner />
      {showPrivacyPolicy && <PrivacyPolicyModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
    </div>
  )
}

export default App

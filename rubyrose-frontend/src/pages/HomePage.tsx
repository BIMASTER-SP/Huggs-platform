import { ChevronRight, MapPin, ShoppingCart, Trophy, Gift, Package, Check, Target } from 'lucide-react'
import type { Page } from '@/MainApp'

interface Props {
  user: any
  dashboard: any
  currentBanner: number
  statusColors: Record<string, string>
  statusLabels: Record<string, string>
  statusIcons: Record<string, any>
  setPage: (page: Page) => void
  setShowOrderDetail: (order: any) => void
  setShowRewardKits: (open: boolean) => void
}

const bannerBg = (color: string) => {
  switch (color) {
    case 'rose': return 'linear-gradient(135deg, #9F1239 0%, #F43F5E 100%)'
    case 'purple': return 'linear-gradient(135deg, #7E22CE 0%, #A855F7 100%)'
    case 'emerald': return 'linear-gradient(135deg, #065F46 0%, #10B981 100%)'
    default: return 'linear-gradient(135deg, #BE185D 0%, #EC4899 100%)'
  }
}

export function HomePage({ user, dashboard, currentBanner, statusColors, statusLabels, statusIcons, setPage, setShowOrderDetail, setShowRewardKits }: Props) {
  const quickActions = [
    { icon: ShoppingCart, label: 'Novo Pedido', color: 'bg-brand-100 text-brand-600', action: () => setPage('catalogo') },
    { icon: Trophy, label: 'Desafios', color: 'bg-purple-100 text-purple-600', action: () => setPage('desafios') },
    { icon: Gift, label: 'Premios', color: 'bg-emerald-100 text-emerald-600', action: () => setShowRewardKits(true) },
    { icon: Package, label: 'Pedidos', color: 'bg-blue-100 text-blue-600', action: () => setPage('pedidos') },
  ]

  return (
    <div className="animate-fade-in">
      <div className="bg-brand-gradient-vertical px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-xs">Ola,</p>
            <h2 className="text-white font-bold text-lg">{user?.name || 'Vendedora'}</h2>
            {dashboard?.store && (
              <p className="text-white/70 text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" />{dashboard.store.name}
              </p>
            )}
          </div>
          <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
            <p className="text-yellow-300 text-xl font-bold">{user?.points || 0}</p>
            <p className="text-white/80 text-[10px]">pontos</p>
          </div>
        </div>

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

        {dashboard?.banners?.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl">
            {dashboard.banners.map((b: any, i: number) => (
              <div key={b.id} className={`transition-all duration-500 ${i === currentBanner ? 'block' : 'hidden'}`}>
                <div className="relative h-32 rounded-2xl overflow-hidden" style={{ background: bannerBg(b.color) }}>
                  <div className="p-4 h-full flex flex-col justify-center">
                    {b.highlight && (
                      <span className="bg-yellow-400 text-purple-900 text-[9px] font-bold px-2 py-0.5 rounded-full self-start mb-1">DESTAQUE</span>
                    )}
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

      <div className="px-4 -mt-2">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 grid grid-cols-4 gap-3">
          {quickActions.map((a, i) => (
            <button key={i} onClick={a.action} className="flex flex-col items-center gap-1.5">
              <div className={`w-12 h-12 rounded-2xl ${a.color} flex items-center justify-center`}>
                <a.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-gray-600 font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {dashboard?.active_challenges?.length > 0 && (
        <div className="px-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm">Desafios Ativos</h3>
            <button onClick={() => setPage('desafios')} className="text-brand-600 text-xs font-medium flex items-center gap-0.5">
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
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
                      <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.min(100, (c.progress / c.goal) * 100)}%` }} />
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

      {dashboard?.recent_orders?.length > 0 && (
        <div className="px-4 mt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm">Ultimos Pedidos</h3>
            <button onClick={() => setPage('pedidos')} className="text-brand-600 text-xs font-medium flex items-center gap-0.5">
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
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
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[o.status] || o.status}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

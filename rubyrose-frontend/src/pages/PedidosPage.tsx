import { Package } from 'lucide-react'
import type { Page } from '@/MainApp'

interface Props {
  orders: any[]
  statusColors: Record<string, string>
  statusLabels: Record<string, string>
  statusIcons: Record<string, any>
  setPage: (page: Page) => void
  setShowOrderDetail: (order: any) => void
}

export function PedidosPage({ orders, statusColors, statusLabels, statusIcons, setPage, setShowOrderDetail }: Props) {
  return (
    <div className="animate-fade-in">
      <div className="bg-brand-600 px-4 pt-4 pb-5">
        <h2 className="text-white font-bold text-lg">Meus Pedidos</h2>
        <p className="text-white/70 text-xs mt-0.5">{orders.length} pedido(s) encontrado(s)</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhum pedido ainda</p>
            <button onClick={() => setPage('catalogo')} className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm">
              Fazer primeiro pedido
            </button>
          </div>
        ) : (
          orders.map((o) => {
            const Icon = statusIcons[o.status] || Package
            return (
              <button
                key={o.id}
                onClick={() => setShowOrderDetail(o)}
                className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-500">{o.id}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[o.status] || 'bg-gray-100'}`}>
                    {statusLabels[o.status] || o.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800">{o.store_name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(o.created_at).toLocaleDateString('pt-BR')} - {o.items?.length || 0} item(ns)
                </p>
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
          })
        )}
      </div>
    </div>
  )
}

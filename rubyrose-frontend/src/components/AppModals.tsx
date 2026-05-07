import {
  X, ShoppingCart, ShoppingBag, Minus, Plus, Send, CheckCircle,
  Award, Shield, Trash2, AlertTriangle, FileText, ChevronRight,
} from 'lucide-react'
import { useCart } from '@/contexts/CartContext'

export interface ModalState {
  // Cart
  showCart: boolean
  setShowCart: (v: boolean) => void
  onSubmitOrder: () => void

  // Order detail
  showOrderDetail: any
  setShowOrderDetail: (v: any) => void
  statusColors: Record<string, string>
  statusLabels: Record<string, string>

  // Order success
  orderSuccess: any
  setOrderSuccess: (v: any) => void
  onViewOrders: () => void

  // Reward kits
  showRewardKits: boolean
  setShowRewardKits: (v: boolean) => void
  rewardKits: any[]
  user: any
  onRedeem: (kitId: string) => void

  // LGPD banner
  showLGPD: boolean
  setShowLGPD: (v: boolean) => void
  setShowPrivacy: (v: boolean) => void
  privacyData: any
  setPrivacyData: (v: any) => void
  onAcceptLgpd: () => void
  onRequestPrivacy: () => void

  // Privacy
  showPrivacy: boolean

  // Delete account
  showDeleteConfirm: boolean
  setShowDeleteConfirm: (v: boolean) => void
  onConfirmDelete: () => void
}

export function AppModals(p: ModalState) {
  return (
    <>
      <CartModal {...p} />
      <OrderDetailModal {...p} />
      <OrderSuccessModal {...p} />
      <RewardKitsModal {...p} />
      <LgpdBanner {...p} />
      <PrivacyModal {...p} />
      <DeleteAccountModal {...p} />
    </>
  )
}

function CartModal({ showCart, setShowCart, onSubmitOrder }: ModalState) {
  const { items, count, total, updateQty, remove } = useCart()
  if (!showCart) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
      <div className="relative bg-white rounded-t-3xl w-full max-w-[430px] max-h-[80vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Carrinho ({count} itens)</h3>
          <button onClick={() => setShowCart(false)}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Carrinho vazio</p>
            </div>
          ) : (
            <>
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-12 h-12 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-5 h-5 text-brand-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-400">R${item.price.toFixed(2)}/un</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.product_id, -1)} className="w-6 h-6 rounded-full bg-white border flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product_id, 1)} className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center"><Plus className="w-3 h-3 text-brand-600" /></button>
                  </div>
                  <button onClick={() => remove(item.product_id)}><X className="w-4 h-4 text-red-400" /></button>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Total do pedido</span>
                  <span className="text-lg font-bold text-gray-800">R${total.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mb-3">+{Math.floor(total / 20)} pontos estimados</p>
                <button onClick={onSubmitOrder} className="w-full py-3.5 bg-brand-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Enviar Pedido para Loja
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderDetailModal({ showOrderDetail, setShowOrderDetail, statusColors, statusLabels }: ModalState) {
  if (!showOrderDetail) return null
  return (
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
  )
}

function OrderSuccessModal({ orderSuccess, setOrderSuccess, onViewOrders }: ModalState) {
  if (!orderSuccess) return null
  return (
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
        <button onClick={() => { setOrderSuccess(null); onViewOrders() }} className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm">Ver Meus Pedidos</button>
      </div>
    </div>
  )
}

function RewardKitsModal({ showRewardKits, setShowRewardKits, rewardKits, user, onRedeem }: ModalState) {
  if (!showRewardKits) return null
  return (
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
          {rewardKits.map((k) => {
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
                      <button
                        onClick={() => canRedeem && onRedeem(k.id)}
                        disabled={!canRedeem}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium ${canRedeem ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`}
                      >
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
  )
}

function LgpdBanner({ showLGPD, onAcceptLgpd, onRequestPrivacy }: ModalState) {
  if (!showLGPD) return null
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-[410px] px-3">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-gray-800">Privacidade e Dados</h4>
            <p className="text-xs text-gray-500 mt-1">
              Utilizamos seus dados para processar pedidos, calcular pontos e melhorar sua experiencia.
              Ao continuar, voce concorda com nossa politica de privacidade.
            </p>
            <div className="flex gap-2 mt-3">
              <button onClick={onAcceptLgpd} className="flex-1 py-2 bg-brand-600 text-white rounded-xl text-xs font-medium">Aceitar</button>
              <button onClick={onRequestPrivacy} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-medium">Ler mais</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PrivacyModal({ showPrivacy, setShowPrivacy, privacyData }: ModalState) {
  if (!showPrivacy) return null
  return (
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
  )
}

function DeleteAccountModal({ showDeleteConfirm, setShowDeleteConfirm, onConfirmDelete }: ModalState) {
  if (!showDeleteConfirm) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />
      <div className="relative bg-white rounded-3xl w-full max-w-[380px] p-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Excluir conta?</h3>
        <p className="text-sm text-gray-500 mb-4">
          Esta acao e irreversivel. Todos os seus dados, pedidos, pontos e historico serao removidos
          permanentemente conforme a LGPD.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Cancelar</button>
          <button onClick={onConfirmDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-medium">Excluir</button>
        </div>
      </div>
    </div>
  )
}

// Re-export icons used in PerfilPage privacy buttons (kept here to avoid missed imports)
export { FileText, Trash2, ChevronRight }

import { ChevronRight, FileText, Gift, LogOut, MapPin, Shield, Trash2, User } from 'lucide-react'
import { lgpdService } from '@/services'

interface Props {
  user: any
  dashboard: any
  privacyData: any
  setPrivacyData: (v: any) => void
  setShowPrivacy: (v: boolean) => void
  setShowRewardKits: (v: boolean) => void
  setShowDeleteConfirm: (v: boolean) => void
  doLogout: () => void
}

const roleLabel = (role?: string) => {
  switch (role) {
    case 'promotora': return 'Promotora'
    case 'gerente_loja': return 'Gerente de Loja'
    case 'vendedor_ruby': return 'Vendedor Ruby Rose'
    case 'admin': return 'Admin'
    default: return role || ''
  }
}

export function PerfilPage({
  user, dashboard, privacyData, setPrivacyData, setShowPrivacy,
  setShowRewardKits, setShowDeleteConfirm, doLogout,
}: Props) {
  const openPrivacy = () => {
    setShowPrivacy(true)
    if (!privacyData) {
      lgpdService.privacyPolicy().then(setPrivacyData).catch(() => {})
    }
  }

  const exportData = async () => {
    try {
      const data = await lgpdService.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'meus_dados_rubyrose.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* swallowed */ }
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-brand-600 px-4 pt-4 pb-8">
        <h2 className="text-white font-bold text-lg">Meu Perfil</h2>
      </div>
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
              <User className="w-7 h-7 text-brand-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{user?.name}</h3>
              <p className="text-xs text-gray-500">{user?.email}</p>
              <p className="text-[10px] text-brand-600 font-medium">{roleLabel(user?.role)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-yellow-600">{user?.points || 0}</p>
              <p className="text-[10px] text-gray-500">Pontos</p>
            </div>
            <div className="bg-brand-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-brand-600">{user?.level || 'Bronze'}</p>
              <p className="text-[10px] text-gray-500">Nivel</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-purple-600">{user?.challenges_completed || 0}</p>
              <p className="text-[10px] text-gray-500">Desafios</p>
            </div>
          </div>
        </div>

        {dashboard?.store && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-3">
            <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-600" /> Minha Loja
            </h4>
            <p className="text-sm text-gray-700">{dashboard.store.name}</p>
            <p className="text-xs text-gray-500">{dashboard.store.address}</p>
            <p className="text-xs text-gray-500">{dashboard.store.city} - {dashboard.store.state}</p>
            <p className="text-[10px] text-gray-400 mt-1">CNPJ: {dashboard.store.cnpj}</p>
          </div>
        )}

        <button
          onClick={() => setShowRewardKits(true)}
          className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-3 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Gift className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">Resgatar Premios</p>
            <p className="text-[10px] text-gray-500">Troque seus pontos por kits de produtos</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-3 overflow-hidden">
          <button onClick={openPrivacy} className="w-full p-4 flex items-center gap-3 text-left border-b border-gray-50">
            <Shield className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-700">Politica de Privacidade</span>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </button>
          <button onClick={exportData} className="w-full p-4 flex items-center gap-3 text-left border-b border-gray-50">
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

        <button
          onClick={doLogout}
          className="w-full bg-gray-100 rounded-2xl p-4 mt-3 mb-4 flex items-center justify-center gap-2 text-gray-600 font-medium text-sm"
        >
          <LogOut className="w-4 h-4" /> Sair da conta
        </button>
      </div>
    </div>
  )
}

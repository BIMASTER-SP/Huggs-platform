import {
  BarChart3, Users, Package, Database, ShoppingCart, BookOpen,
  Image, Link2, Settings, Activity, Sparkles, Menu, Home, LogOut,
} from 'lucide-react'
import type { Page } from '@/MainApp'

interface AdminItem {
  page: Page
  icon: typeof BarChart3
  label: string
}

const adminItems: AdminItem[] = [
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

interface SidebarProps {
  current: Page
  onChange: (page: Page) => void
  open: boolean
  setOpen: (v: boolean) => void
  onBackToApp: () => void
  onLogout: () => void
}

export function AdminSidebar({ current, onChange, open, setOpen, onBackToApp, onLogout }: SidebarProps) {
  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-100 shadow-sm transition-all duration-300 ${
        open ? 'w-60' : 'w-16'
      } hidden lg:flex flex-col`}
    >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        {open && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-600" />
            <span className="font-bold text-gray-800">Admin</span>
          </div>
        )}
        <button onClick={() => setOpen(!open)} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <Menu className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {adminItems.map((item) => (
          <button
            key={item.page}
            onClick={() => onChange(item.page)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-brand-50 ${
              current === item.page
                ? 'bg-brand-50 text-brand-700 font-medium border-r-2 border-brand-600'
                : 'text-gray-600'
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {open && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onBackToApp}
          className="w-full flex items-center gap-2 py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-xl"
        >
          <Home className="w-4 h-4" />
          {open && <span>Voltar ao App</span>}
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 py-2 px-3 text-sm text-red-500 hover:bg-red-50 rounded-xl mt-1"
        >
          <LogOut className="w-4 h-4" />
          {open && <span>Sair</span>}
        </button>
      </div>
    </div>
  )
}

interface MobileChromeProps {
  current: Page
  onChange: (page: Page) => void
  onBackToApp: () => void
  onLogout: () => void
}

export function AdminMobileChrome({ current, onChange, onBackToApp, onLogout }: MobileChromeProps) {
  return (
    <>
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-600" />
          <span className="font-bold text-gray-800 text-sm">Admin Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onBackToApp} className="p-2 hover:bg-gray-100 rounded-lg"><Home className="w-4 h-4" /></button>
          <button onClick={onLogout} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="lg:hidden overflow-x-auto border-b border-gray-100 bg-white">
        <div className="flex min-w-max">
          {adminItems.map((item) => (
            <button
              key={item.page}
              onClick={() => onChange(item.page)}
              className={`flex flex-col items-center gap-1 px-4 py-2.5 text-xs whitespace-nowrap transition ${
                current === item.page
                  ? 'text-brand-700 border-b-2 border-brand-600 font-medium'
                  : 'text-gray-500'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

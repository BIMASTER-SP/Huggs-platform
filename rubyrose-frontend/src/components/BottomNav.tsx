import { Home, ShoppingBag, Package, Trophy, User, Settings } from 'lucide-react'
import type { Page } from '@/MainApp'

interface NavItem {
  page: Page
  icon: typeof Home
  label: string
}

const items: NavItem[] = [
  { page: 'inicio', icon: Home, label: 'Inicio' },
  { page: 'catalogo', icon: ShoppingBag, label: 'Catalogo' },
  { page: 'pedidos', icon: Package, label: 'Pedidos' },
  { page: 'desafios', icon: Trophy, label: 'Desafios' },
  { page: 'perfil', icon: User, label: 'Perfil' },
]

interface Props {
  current: Page
  onChange: (page: Page) => void
  showAdmin: boolean
}

export function BottomNav({ current, onChange, showAdmin }: Props) {
  return (
    <div className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.page}
          onClick={() => onChange(item.page)}
          className={`nav-item ${current === item.page ? 'active' : ''}`}
        >
          <item.icon className="w-5 h-5" />
          <span className="text-xs">{item.label}</span>
        </button>
      ))}
      {showAdmin && (
        <button onClick={() => onChange('admin_dash')} className="nav-item">
          <Settings className="w-5 h-5" />
          <span className="text-xs">Admin</span>
        </button>
      )}
    </div>
  )
}

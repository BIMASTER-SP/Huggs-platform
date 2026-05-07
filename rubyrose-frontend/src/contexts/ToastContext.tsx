import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  variant: 'info' | 'success' | 'error'
}

interface ToastApi {
  toasts: Toast[]
  showToast: (message: string, variant?: Toast['variant']) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: Toast['variant'] = 'info') => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, message, variant }])
      setTimeout(() => dismiss(id), 3000)
    },
    [dismiss],
  )

  const value = useMemo<ToastApi>(() => ({ toasts, showToast, dismiss }), [toasts, showToast, dismiss])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

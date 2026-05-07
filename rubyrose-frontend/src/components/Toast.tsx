import { useToast } from '@/contexts/ToastContext'

const variantClasses: Record<string, string> = {
  info: 'bg-gray-900 text-white',
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
}

export function ToastViewport() {
  const { toasts } = useToast()
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl px-4 py-2 text-sm shadow-lg animate-fade-in ${variantClasses[t.variant]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

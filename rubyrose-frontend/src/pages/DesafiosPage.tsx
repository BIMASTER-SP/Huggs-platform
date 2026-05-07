import { Camera, Check, CheckCircle, Gift, ShoppingCart, Target } from 'lucide-react'

interface Props {
  challenges: any[]
  submitChallenge: (challengeId: string) => void
}

const iconForType = (type: string) => {
  switch (type) {
    case 'vitrine': return Camera
    case 'vendas': return ShoppingCart
    case 'social': return Gift
    default: return Target
  }
}

export function DesafiosPage({ challenges, submitChallenge }: Props) {
  return (
    <div className="animate-fade-in">
      <div className="bg-purple-600 px-4 pt-4 pb-5">
        <h2 className="text-white font-bold text-lg">Desafios</h2>
        <p className="text-white/70 text-xs mt-0.5">Complete desafios e ganhe pontos e premios</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        {challenges.map((c) => {
          const pct = Math.min(100, (c.progress / c.goal) * 100)
          const done = c.completed
          const Icon = iconForType(c.type)
          return (
            <div key={c.id} className={`bg-white rounded-xl border p-4 ${done ? 'border-green-200' : 'border-gray-100'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-100' : 'bg-purple-100'}`}>
                  {done ? <CheckCircle className="w-6 h-6 text-green-600" /> : <Icon className="w-6 h-6 text-purple-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-800">{c.title}</h4>
                    <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">{c.points_reward} pts</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{c.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${done ? 'bg-green-500' : 'bg-purple-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">{c.progress}/{c.goal}</span>
                  </div>
                  {c.reward_kit && (
                    <p className="text-[10px] text-emerald-600 mt-1.5 flex items-center gap-1">
                      <Gift className="w-3 h-3" />Premio: {c.reward_kit.name}
                    </p>
                  )}
                  {!done && (
                    <button
                      onClick={() => submitChallenge(c.id)}
                      className="mt-3 w-full py-2 bg-purple-600 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" /> Enviar Comprovante
                    </button>
                  )}
                  {done && (
                    <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Desafio concluido!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

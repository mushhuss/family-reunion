import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReunionTheme } from '../lib/themes'

interface Props {
  icon: ReactNode
  label: string
  description: string
  to: string
  theme: ReunionTheme
  color: string  // one of theme.coreColors — unique per pillar
}

export default function PillarCard({ icon, label, description, to, theme, color }: Props) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(to)}
      className="group flex items-center gap-4 rounded-2xl border-2 p-5 text-left shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] w-full sm:flex-col sm:items-center sm:gap-4 sm:p-8 sm:text-center"
      style={{
        backgroundColor: theme.pillarBg,
        borderColor: `${color}40`,  // 25% opacity tint of the pillar's own color
      }}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors sm:h-20 sm:w-20"
        style={{ backgroundColor: `${color}18`, color }}  // 9% opacity bg tint
      >
        <div className="h-7 w-7 sm:h-10 sm:w-10">{icon}</div>
      </div>
      <div>
        <div className="text-lg font-crayon transition-colors sm:text-2xl" style={{ color }}>
          {label}
        </div>
        <div className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">{description}</div>
      </div>
    </button>
  )
}

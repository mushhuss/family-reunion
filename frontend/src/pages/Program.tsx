import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getProgram } from '../lib/api'
import type { ProgramEvent } from '../lib/types'
import ProgramTimeline from '../components/ProgramTimeline'
import { useReunionTheme } from '../lib/useReunionTheme'

export default function Program() {
  const { year } = useParams<{ year: string }>()
  const navigate = useNavigate()
  const [events, setEvents] = useState<ProgramEvent[]>([])
  const [loading, setLoading] = useState(true)
  const theme = useReunionTheme(year)

  useEffect(() => {
    if (!year) return
    getProgram(year)
      .then(setEvents)
      .finally(() => setLoading(false))
  }, [year])

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.pageBg }}>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <button
          onClick={() => navigate(`/${year}`)}
          className="flex items-center gap-1.5 text-sm transition-colors mb-6 min-h-[44px] sm:mb-8"
          style={{ color: theme.accentColor }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to {year} Reunion
        </button>

        <h1 className="font-crayon text-3xl sm:text-4xl mb-1">
          <span style={{ color: theme.coreColors[1] }}>Programs</span>
        </h1>
        <p className="text-sm text-gray-500 mb-8 sm:text-base sm:mb-10">
          Schedule and activities for the {year} reunion
        </p>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl" style={{ backgroundColor: theme.pillarIconBg }} />
            ))}
          </div>
        ) : (
          <ProgramTimeline events={events} />
        )}
      </div>
    </div>
  )
}

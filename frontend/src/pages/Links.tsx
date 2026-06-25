import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getLinks } from '../lib/api'
import type { Link } from '../lib/types'
import LinksList from '../components/LinksList'
import { useReunionTheme } from '../lib/useReunionTheme'

export default function Links() {
  const { year } = useParams<{ year: string }>()
  const navigate = useNavigate()
  const [links, setLinks] = useState<Link[]>([])
  const [loading, setLoading] = useState(true)
  const theme = useReunionTheme(year)

  useEffect(() => {
    if (!year) return
    getLinks(year)
      .then(setLinks)
      .finally(() => setLoading(false))
  }, [year])

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.pageBg }}>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <button
          onClick={() => navigate(`/${year}`)}
          className="flex items-center gap-1.5 text-sm transition-colors mb-6 min-h-[44px] sm:mb-8"
          style={{ color: theme.accentColor }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to {year} Reunion
        </button>

        <h1 className="font-crayon text-3xl sm:text-4xl mb-1">
          {['Links', '&', 'Resources'].map(word => (
            <span key={word} className="inline-block mr-2" style={{ color: theme.coreColors[2] }}>
              {word}
            </span>
          ))}
        </h1>
        <p className="text-sm text-gray-500 mb-8 sm:text-base sm:mb-10">
          Useful links and information for the {year} reunion
        </p>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl" style={{ backgroundColor: theme.pillarIconBg }} />
            ))}
          </div>
        ) : (
          <LinksList links={links} />
        )}
      </div>
    </div>
  )
}

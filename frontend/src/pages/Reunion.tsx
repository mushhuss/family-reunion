import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Camera, Gamepad2, FileText, Users, ArrowLeft } from 'lucide-react'
import { getReunion } from '../lib/api'
import type { Reunion as ReunionType } from '../lib/types'
import PillarCard from '../components/PillarCard'
import ContactsModal from '../components/ContactsModal'
import { getReunionTheme } from '../lib/themes'

export default function Reunion() {
  const { year } = useParams<{ year: string }>()
  const navigate = useNavigate()
  const [reunion, setReunion] = useState<ReunionType | null>(null)
  const [loading, setLoading] = useState(true)
  const [showContacts, setShowContacts] = useState(false)

  useEffect(() => {
    if (!year) return
    getReunion(year)
      .then(setReunion)
      .catch(() => setReunion(null))
      .finally(() => setLoading(false))
  }, [year])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-reunion-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-reunion-200 border-t-reunion-500" />
      </div>
    )
  }

  if (!reunion) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-reunion-50 px-6">
        <p className="text-gray-500 text-lg">Reunion not found.</p>
        <button onClick={() => navigate('/')} className="text-reunion-600 hover:underline">
          ← Back to home
        </button>
      </div>
    )
  }

  const theme = getReunionTheme(reunion.theme_slug)
  const titleWords = ['Hussaini', 'Family', 'Reunion', String(reunion.year)]
  const { coreColors } = theme

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.pageBg }}>
      {reunion.hero_image_url && (
        <div
          className="h-40 w-full bg-cover bg-center sm:h-64"
          style={{ backgroundImage: `url(${reunion.hero_image_url})` }}
        >
          <div className="h-full w-full bg-black/30" />
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-reunion-600 hover:text-reunion-800 transition-colors min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>All Reunions</span>
          </button>
          <button
            onClick={() => setShowContacts(true)}
            className="flex items-center gap-1.5 rounded-full border border-reunion-300 bg-white px-3 py-2 text-xs font-medium text-reunion-700 shadow-sm hover:bg-reunion-50 transition-all min-h-[44px] sm:px-4 sm:text-sm"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Contacts</span>
          </button>
        </div>

        {/* Title */}
        <div className="mt-6 text-center sm:mt-8">
          <h1 className="font-crayon text-4xl sm:text-6xl leading-tight">
            {titleWords.map((word, i) => (
              <span
                key={word}
                className="inline-block"
                style={{
                  color: coreColors[i % 3],
                  marginRight: '0.2em',
                  textShadow: '2px 3px 0 rgba(0,0,0,0.10)',
                }}
              >
                {word}
              </span>
            ))}
          </h1>
          {reunion.welcome_message && (
            <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-600 leading-relaxed sm:mt-6 sm:text-lg">
              {reunion.welcome_message}
            </p>
          )}
        </div>

        {/* Pillars */}
        <div className="mt-8 grid gap-4 sm:mt-14 sm:grid-cols-3 sm:gap-6">
          <PillarCard
            icon={<Camera />}
            label="Photo Album"
            description="Upload and browse family memories"
            to={`/${year}/photos`}
            theme={theme}
            color={coreColors[0]}
          />
          <PillarCard
            icon={<Gamepad2 />}
            label="Programs"
            description="Schedule and activities"
            to={`/${year}/program`}
            theme={theme}
            color={coreColors[1]}
          />
          <PillarCard
            icon={<FileText />}
            label="Links"
            description="Important resources and info"
            to={`/${year}/links`}
            theme={theme}
            color={coreColors[2]}
          />
        </div>
      </div>

      {showContacts && year && (
        <ContactsModal year={year} onClose={() => setShowContacts(false)} />
      )}
    </div>
  )
}

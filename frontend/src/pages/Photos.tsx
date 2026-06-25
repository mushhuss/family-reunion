import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Video } from 'lucide-react'
import { getPhotos } from '../lib/api'
import type { Media } from '../lib/types'
import PhotoGrid from '../components/PhotoGrid'
import PhotoUpload from '../components/PhotoUpload'
import { useReunionTheme } from '../lib/useReunionTheme'

export default function Photos() {
  const { year } = useParams<{ year: string }>()
  const navigate = useNavigate()
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const theme = useReunionTheme(year)

  const refresh = useCallback(async () => {
    if (!year) return
    const all = await getPhotos(year)
    setMedia(all)
  }, [year])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const videoCount = media.filter(m => m.type === 'video').length

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.pageBg }}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <button
          onClick={() => navigate(`/${year}`)}
          className="flex items-center gap-1.5 text-sm transition-colors mb-6 min-h-[44px] sm:mb-8"
          style={{ color: theme.accentColor }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to {year} Reunion
        </button>

        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h1 className="font-crayon text-3xl sm:text-4xl">
            {['Photo', 'Album'].map(word => (
              <span key={word} className="inline-block mr-2" style={{ color: theme.coreColors[0] }}>
                {word}
              </span>
            ))}
          </h1>
          {videoCount > 0 && (
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium sm:text-sm"
              style={{ backgroundColor: theme.pillarIconBg, color: theme.pillarIconColor }}
            >
              <Video className="h-3.5 w-3.5" /> {videoCount} video{videoCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {year && (
          <div className="mb-6 sm:mb-8">
            <PhotoUpload year={year} onUploaded={refresh} />
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg" style={{ backgroundColor: theme.pillarIconBg }} />
            ))}
          </div>
        ) : (
          <PhotoGrid items={media} />
        )}
      </div>
    </div>
  )
}

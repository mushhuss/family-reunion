// Photo album page — behavior depends on reunion.status:
//   active   → upload form + gallery (normal operation during the reunion)
//   locked   → gallery only + amber "uploads closed" banner (post-reunion, before slideshow)
//   archived → YouTube embed (or placeholder) instead of gallery (slideshow is ready)
// Fetches both media and reunion in parallel so the status check has zero extra latency.
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Video, Lock } from 'lucide-react'
import { getPhotos, getReunion } from '../lib/api'
import type { Media, Reunion } from '../lib/types'
import PhotoGrid from '../components/PhotoGrid'
import PhotoUpload from '../components/PhotoUpload'
import { useReunionTheme } from '../lib/useReunionTheme'
import { extractYoutubeId } from '../lib/utils'

export default function Photos() {
  const { year } = useParams<{ year: string }>()
  const navigate = useNavigate()
  const [media, setMedia] = useState<Media[]>([])
  const [reunion, setReunion] = useState<Reunion | null>(null)
  const [loading, setLoading] = useState(true)
  const theme = useReunionTheme(year)

  const refresh = useCallback(async () => {
    if (!year) return
    const [all, r] = await Promise.all([getPhotos(year), getReunion(year)])
    setMedia(all)
    setReunion(r)
  }, [year])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const status = reunion?.status ?? 'active'
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

        {/* ── Archived: show YouTube slideshow ── */}
        {status === 'archived' ? (
          <div>
            <h1 className="font-crayon text-3xl sm:text-4xl mb-6">
              {['The', 'Slideshow'].map(word => (
                <span key={word} className="inline-block mr-2" style={{ color: theme.coreColors[0] }}>{word}</span>
              ))}
            </h1>
            {reunion?.youtube_url ? (
              <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYoutubeId(reunion.youtube_url) ?? ''}`}
                  title="Family Reunion Slideshow"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
                <p className="text-lg font-crayon">Slideshow coming soon!</p>
                <p className="text-sm">Check back — we're still putting it together.</p>
              </div>
            )}
          </div>
        ) : (
          /* ── Active or Locked: show gallery ── */
          <>
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <h1 className="font-crayon text-3xl sm:text-4xl">
                {['Photo', 'Album'].map(word => (
                  <span key={word} className="inline-block mr-2" style={{ color: theme.coreColors[0] }}>{word}</span>
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

            {status === 'active' && year && (
              <div className="mb-6 sm:mb-8">
                <PhotoUpload year={year} onUploaded={refresh} />
              </div>
            )}

            {status === 'locked' && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:mb-8">
                <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Uploads are now closed</p>
                  <p className="text-xs text-amber-600 mt-0.5">Thanks for sharing your memories! We're turning everything into a slideshow — check back soon.</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="mb-3 aspect-square animate-pulse rounded-2xl" style={{ backgroundColor: theme.pillarIconBg }} />
                ))}
              </div>
            ) : (
              <PhotoGrid items={media} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

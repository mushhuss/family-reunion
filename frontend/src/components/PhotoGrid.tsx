// Masonry photo/video gallery with IntersectionObserver-based pagination.
//
// Key design decisions:
//   - Gallery shows thumb_url (1200px preview), never the full original — keeps page fast.
//   - Download Original button in the lightbox links to url (full quality) for slideshows.
//   - Videos do NOT render a <video> element in the grid — only a thumbnail image + play icon.
//     This avoids any network request until the user actually taps the video.
//   - Lightbox video: src is withheld for 800ms after open (misclick guard). A spinner shows
//     during the wait. If the user closes before 800ms, the timeout is cancelled and no video
//     data is fetched at all.
//   - IntersectionObserver fires 500px before the sentinel reaches the viewport, pre-warming
//     the next batch of images so the grid feels instant.
import { useEffect, useRef, useState } from 'react'
import { X, PlayCircle, Loader2, Download } from 'lucide-react'
import type { Media } from '../lib/types'

function colCount() {
  if (window.innerWidth >= 1024) return 3
  if (window.innerWidth >= 640) return 2
  return 1
}

// Calculates how many items fill ~1.5 screen-heights — enough to fill the viewport
// with one extra screenful pre-loaded. Snapped to a full row count (× cols).
function calcPageSize() {
  const cols = colCount()
  const itemH = window.innerWidth / cols
  return Math.ceil((window.innerHeight * 1.5) / itemH) * cols
}

interface Props {
  items: Media[]
}

export default function PhotoGrid({ items }: Props) {
  const [visible, setVisible] = useState(() => calcPageSize())
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Media | null>(null)
  // Delayed video src — only set after 800ms in lightbox to avoid misclick loads
  const [videoSrc, setVideoSrc] = useState<string | null>(null)

  useEffect(() => {
    const onResize = () => setVisible(v => Math.max(v, calcPageSize()))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => { setVisible(calcPageSize()) }, [items])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(v => Math.min(v + calcPageSize(), items.length))
      },
      { rootMargin: '500px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [items.length])

  // Wait 800ms before loading video src — lets accidental taps bail out cleanly
  useEffect(() => {
    if (!selected || selected.type !== 'video') {
      setVideoSrc(null)
      return
    }
    setVideoSrc(null)
    const t = setTimeout(() => setVideoSrc(selected.url), 800)
    return () => clearTimeout(t)
  }, [selected])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg">No photos yet — be the first to upload!</p>
      </div>
    )
  }

  const visibleItems = items.slice(0, visible)

  return (
    <>
      {/* Mobile: 1-column feed. Tablet+: 2–3 column masonry. */}
      <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
        {visibleItems.map(item => (
          <div key={item.id} className="mb-3 break-inside-avoid">
            <button
              className="relative block w-full overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => setSelected(item)}
            >
              {item.type === 'video' ? (
                <div className="relative aspect-video w-full bg-gray-900">
                  {item.thumb_url && (
                    <img
                      src={item.thumb_url}
                      alt={item.caption ?? 'Video'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <PlayCircle className="h-14 w-14 text-white/90 drop-shadow-lg" />
                  </div>
                </div>
              ) : (
                <img
                  src={item.thumb_url ?? item.url}
                  alt={item.caption ?? 'Family photo'}
                  className="w-full object-cover"
                  loading="lazy"
                />
              )}
            </button>
            {item.caption && (
              <p className="mt-1 text-center text-xs text-gray-500">{item.caption}</p>
            )}
          </div>
        ))}
      </div>

      <div ref={sentinelRef} />

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors z-10"
            onClick={() => setSelected(null)}
          >
            <X className="h-6 w-6" />
          </button>

          {selected.type === 'video' ? (
            videoSrc ? (
              <video
                src={videoSrc}
                controls
                autoPlay
                playsInline
                className="max-h-[90vh] max-w-[90vw] rounded-lg"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              /* Still within the 800ms window — show spinner so user knows it's loading */
              <div
                className="flex flex-col items-center gap-3 text-white"
                onClick={e => e.stopPropagation()}
              >
                <Loader2 className="h-10 w-10 animate-spin" />
                <p className="text-sm text-white/70">Loading video…</p>
              </div>
            )
          ) : (
            <img
              src={selected.thumb_url ?? selected.url}
              alt={selected.caption ?? ''}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={e => e.stopPropagation()}
            />
          )}

          {/* Caption + download original button */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {selected.caption && (
              <span className="rounded-full bg-black/60 px-4 py-1.5 text-sm text-white whitespace-nowrap">
                {selected.caption}
              </span>
            )}
            {selected.type === 'photo' && (
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white hover:bg-black/80 transition-colors whitespace-nowrap"
                title="Download original quality"
              >
                <Download className="h-3.5 w-3.5" /> Original
              </a>
            )}
          </div>
        </div>
      )}
    </>
  )
}

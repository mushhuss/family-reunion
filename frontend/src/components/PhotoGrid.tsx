import { useState } from 'react'
import { X, PlayCircle } from 'lucide-react'
import type { Media } from '../lib/types'

interface Props {
  items: Media[]
}

export default function PhotoGrid({ items }: Props) {
  const [selected, setSelected] = useState<Media | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg">No photos yet — be the first to upload!</p>
      </div>
    )
  }

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {items.map(item => (
          <div key={item.id} className="mb-3 break-inside-avoid">
            <button
              className="relative block w-full overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => setSelected(item)}
            >
              {item.type === 'video' ? (
                <>
                  <video
                    src={item.url}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
                  </div>
                </>
              ) : (
                <img
                  src={item.url}
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
            <video
              src={selected.url}
              controls
              autoPlay
              playsInline
              className="max-h-[90vh] max-w-[90vw] rounded-lg"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={selected.url}
              alt={selected.caption ?? ''}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={e => e.stopPropagation()}
            />
          )}

          {selected.caption && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1 text-sm text-white whitespace-nowrap">
              {selected.caption}
            </div>
          )}
        </div>
      )}
    </>
  )
}

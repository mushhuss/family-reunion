// Renders the links list as a responsive 2-column card grid (1 col on mobile).
// Each card opens the link in a new tab with rel="noopener noreferrer" for security.
import { ExternalLink } from 'lucide-react'
import type { Link } from '../lib/types'

interface Props {
  links: Link[]
}

export default function LinksList({ links }: Props) {
  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg">Links will be added soon!</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {links.map(link => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 rounded-xl border border-reunion-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-reunion-300 transition-all duration-200"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-reunion-100 text-reunion-600 group-hover:bg-reunion-200 transition-colors">
            <ExternalLink className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-800 group-hover:text-reunion-700 transition-colors truncate">
              {link.title}
            </div>
            {link.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{link.description}</p>
            )}
          </div>
        </a>
      ))}
    </div>
  )
}

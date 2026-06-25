import { Clock, MapPin } from 'lucide-react'
import type { ProgramEvent } from '../lib/types'

interface Props {
  events: ProgramEvent[]
}

function formatTime(t: string | null) {
  if (!t) return null
  const [h, m] = t.split(':')
  const d = new Date()
  d.setHours(Number(h), Number(m))
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDayHeader(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    weekday: d.toLocaleDateString([], { weekday: 'long' }),
    date: d.toLocaleDateString([], { month: 'long', day: 'numeric' }),
  }
}

function groupByDate(events: ProgramEvent[]): [string, ProgramEvent[]][] {
  const map = new Map<string, ProgramEvent[]>()
  for (const e of events) {
    const key = e.event_date ?? 'tbd'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return Array.from(map.entries())
}

const DAY_COLORS = [
  { bg: 'bg-reunion-600', light: 'bg-reunion-50 border-reunion-200' },
  { bg: 'bg-reunion-700', light: 'bg-amber-50 border-amber-200' },
  { bg: 'bg-reunion-800', light: 'bg-orange-50 border-orange-200' },
]

export default function ProgramTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg">Program schedule coming soon!</p>
      </div>
    )
  }

  const groups = groupByDate(events)

  return (
    <div className="space-y-8">
      {groups.map(([dateKey, dayEvents], dayIndex) => {
        const color = DAY_COLORS[dayIndex % DAY_COLORS.length]
        const isTbd = dateKey === 'tbd'
        const header = isTbd ? null : formatDayHeader(dateKey)
        const dayLabel = header
          ? `Day ${dayIndex + 1} — ${header.weekday}`
          : 'General'

        return (
          <div key={dateKey}>
            {/* Day header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color.bg} text-white text-sm font-bold`}>
                {isTbd ? '?' : dayIndex + 1}
              </div>
              <div>
                <div className="font-bold text-gray-800 text-lg leading-tight">
                  {dayLabel}
                </div>
                {header && (
                  <div className="text-sm text-gray-500">{header.date}</div>
                )}
              </div>
              <div className="flex-1 h-px bg-reunion-200 ml-2" />
            </div>

            {/* Events for this day */}
            <div className="ml-5 space-y-3 pl-8 border-l-2 border-reunion-100">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className={`rounded-xl border p-4 ${color.light}`}
                >
                  <div className="font-semibold text-gray-800">{event.title}</div>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-gray-500">
                    {(event.start_time || event.end_time) && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(event.start_time)}
                        {event.end_time && ` – ${formatTime(event.end_time)}`}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                      {event.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

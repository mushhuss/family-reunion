import { useEffect, useState } from 'react'
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

const TAB_COLORS = [
  { tab: '#DC2626', card: 'bg-red-50 border-red-200' },
  { tab: '#D97706', card: 'bg-amber-50 border-amber-200' },
  { tab: '#16A34A', card: 'bg-green-50 border-green-200' },
  { tab: '#2563EB', card: 'bg-blue-50 border-blue-200' },
  { tab: '#9333EA', card: 'bg-purple-50 border-purple-200' },
]

export default function ProgramTimeline({ events }: Props) {
  const groups = groupByDate(events)
  const [activeDay, setActiveDay] = useState<string>(groups[0]?.[0] ?? '')

  useEffect(() => {
    if (groups.length > 0) {
      const keys = groups.map(([k]) => k)
      if (!keys.includes(activeDay)) setActiveDay(keys[0])
    }
  }, [events])

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg">Program schedule coming soon!</p>
      </div>
    )
  }

  const activeDayIndex = groups.findIndex(([k]) => k === activeDay)
  const dayEvents = groups[activeDayIndex]?.[1] ?? []
  const isTbd = activeDay === 'tbd'
  const header = !isTbd && activeDay ? formatDayHeader(activeDay) : null
  const color = TAB_COLORS[activeDayIndex % TAB_COLORS.length]

  return (
    <div>
      {/* Day tabs */}
      <div className="flex gap-2 flex-wrap mb-8">
        {groups.map(([dateKey], i) => {
          const tbd = dateKey === 'tbd'
          const h = !tbd ? formatDayHeader(dateKey) : null
          const isActive = activeDay === dateKey
          const c = TAB_COLORS[i % TAB_COLORS.length]
          return (
            <button
              key={dateKey}
              onClick={() => setActiveDay(dateKey)}
              className="rounded-full px-4 py-2 text-sm font-medium transition-all border-2 min-h-[40px]"
              style={{
                backgroundColor: isActive ? c.tab : 'transparent',
                borderColor: c.tab,
                color: isActive ? 'white' : c.tab,
              }}
            >
              {tbd ? 'General' : `Day ${i + 1}${h ? ` · ${h.weekday}` : ''}`}
            </button>
          )
        })}
      </div>

      {/* Date subtitle */}
      {header && (
        <p className="text-sm text-gray-400 mb-5">{header.date}</p>
      )}

      {/* Events */}
      <div className="space-y-3">
        {dayEvents.map(event => (
          <div key={event.id} className={`rounded-xl border p-4 ${color.card}`}>
            <div className="font-bold text-gray-800">{event.title}</div>
            <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-gray-500">
              {(event.start_time || event.end_time) ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(event.start_time)}
                  {event.end_time && ` – ${formatTime(event.end_time)}`}
                </span>
              ) : (
                <span className="flex items-center gap-1 italic text-gray-400">
                  <Clock className="h-3 w-3" /> Time TBD
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
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{event.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

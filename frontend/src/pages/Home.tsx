import { useEffect, useMemo, useState } from 'react'
import { getReunions } from '../lib/api'
import type { Reunion } from '../lib/types'
import YearCard from '../components/YearCard'
import HomeSun from '../components/decorations/HomeSun'
import HomeGarden from '../components/decorations/HomeGarden'
import { pickTitleColors, THEMES } from '../lib/themes'

export default function Home() {
  const [reunions, setReunions] = useState<Reunion[]>([])
  const [loading, setLoading] = useState(true)
  const titleColors = useMemo(() => pickTitleColors(3, THEMES.default.titlePalette), [])

  useEffect(() => {
    getReunions()
      .then(setReunions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-reunion-50">
      <HomeSun />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:py-20">

        {/* Title — each word in a freshly-picked colour on every load */}
        <h1
          className="font-crayon leading-tight tracking-wide"
          style={{ fontSize: 'clamp(2.8rem, 9.5vw, 6.5rem)' }}
        >
          {['Hussaini', 'Family', 'Reunion'].map((word, i) => (
            <span
              key={word}
              className="inline-block"
              style={{
                color: titleColors[i],
                transform: `rotate(${[-1.4, 0.9, -0.7][i]}deg)`,
                textShadow: '2px 3px 0 rgba(0,0,0,0.10)',
              }}
            >
              {word}
            </span>
          )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ' ', el], [])}
        </h1>

        {/* Post-it note: year selector */}
        <div className="mt-14 sm:mt-16 w-full max-w-xl" style={{ transform: 'rotate(-0.6deg)' }}>
          <div
            className="rounded-sm bg-yellow-100 px-6 pb-8 pt-5"
            style={{
              boxShadow: '4px 5px 12px rgba(0,0,0,0.18), -1px -1px 4px rgba(0,0,0,0.06)',
            }}
          >
            {/* Sticky-note ruled top line */}
            <div className="mb-4 border-t-2 border-yellow-300" />

            <p className="font-crayon text-2xl text-amber-700 mb-6 sm:text-3xl">
              pick a year ↓
            </p>

            {loading ? null : reunions.length === 0 ? (
              <p className="font-crayon text-lg text-amber-600">no reunions yet!</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-5 sm:gap-7">
                {reunions.map((r, i) => (
                  <YearCard key={r.id} reunion={r} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <HomeGarden />
    </div>
  )
}

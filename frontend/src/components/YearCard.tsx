// Sticky-note style card for each reunion year on the Home page.
// Color and rotation are randomized via useMemo so they vary per page load
// but stay stable across re-renders within the same session.
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Reunion } from '../lib/types'

interface Props {
  reunion: Reunion
  index: number
}

const NOTE_THEMES = [
  { bg: '#FEF9C3', line: '#FDE047', text: '#78350F' }, // yellow
  { bg: '#D1FAE5', line: '#6EE7B7', text: '#065F46' }, // green
  { bg: '#DBEAFE', line: '#93C5FD', text: '#1E3A8A' }, // blue
  { bg: '#FCE7F3', line: '#F9A8D4', text: '#831843' }, // pink
  { bg: '#FEE2E2', line: '#FCA5A5', text: '#7F1D1D' }, // red
  { bg: '#EDE9FE', line: '#C4B5FD', text: '#4C1D95' }, // purple
  { bg: '#FFEDD5', line: '#FDBA74', text: '#7C2D12' }, // orange
  { bg: '#ECFCCB', line: '#A3E635', text: '#365314' }, // lime
]

export default function YearCard({ reunion }: Props) {
  const navigate = useNavigate()
  const { bg, line, text: textColor } = useMemo(
    () => NOTE_THEMES[Math.floor(Math.random() * NOTE_THEMES.length)],
    [],
  )
  const rot = useMemo(() => Math.random() * 6 - 3, [])

  return (
    <button
      onClick={() => navigate(`/${reunion.year}`)}
      className="flex flex-col items-center rounded-sm p-5 w-36 sm:w-44 transition-all duration-200
                 hover:scale-105 hover:rotate-0 active:scale-95"
      style={{
        backgroundColor: bg,
        transform: `rotate(${rot}deg)`,
        boxShadow: '3px 5px 10px rgba(0,0,0,0.20), -1px -1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Top ruled line (sticky edge) */}
      <div className="w-full mb-3 border-t-2" style={{ borderColor: line }} />

      {reunion.hero_image_url && (
        <div
          className="w-full h-20 mb-3 rounded-sm bg-cover bg-center opacity-80"
          style={{ backgroundImage: `url(${reunion.hero_image_url})` }}
        />
      )}

      <span
        className="leading-none"
        style={{
          fontSize: '3.25rem',
          color: textColor,
          WebkitTextStroke: `0.6px ${textColor}`,
          paddingRight: '0.1em',
        }}
      >
        {reunion.year}
      </span>

      <span
        className="mt-2 text-base"
        style={{ color: textColor, opacity: 0.7 }}
      >
        tap to open →
      </span>
    </button>
  )
}

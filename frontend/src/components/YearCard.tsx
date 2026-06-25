import { useNavigate } from 'react-router-dom'
import type { Reunion } from '../lib/types'

interface Props {
  reunion: Reunion
  index: number
}

// Cycling post-it colours
const NOTE_BG   = ['#FEF9C3', '#D1FAE5', '#DBEAFE', '#FCE7F3', '#FEF3C7']
const NOTE_LINE = ['#FDE047', '#6EE7B7', '#93C5FD', '#F9A8D4', '#FCD34D']
const NOTE_TEXT = ['#78350F', '#065F46', '#1E3A8A', '#831843', '#78350F']
// Slight alternating rotations for that stuck-to-a-board look
const ROTATIONS = [-2.5, 1.8, -1.2, 2.2, -0.8]

export default function YearCard({ reunion, index }: Props) {
  const navigate  = useNavigate()
  const bg        = NOTE_BG[index % NOTE_BG.length]
  const line      = NOTE_LINE[index % NOTE_LINE.length]
  const textColor = NOTE_TEXT[index % NOTE_TEXT.length]
  const rot       = ROTATIONS[index % ROTATIONS.length]

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

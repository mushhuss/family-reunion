const RAYS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]

export default function HomeSun() {
  return (
    <div
      className="pointer-events-none absolute right-0 top-0 z-0 w-32 sm:w-44 lg:w-56"
      style={{ transform: 'translate(22%, -18%)' }}
      aria-hidden="true"
    >
      <svg viewBox="-105 -105 210 210" width="100%" height="100%">
        {/* Rays — alternating long/short for star-like feel */}
        {RAYS.map((deg, i) => {
          const rad = (deg * Math.PI) / 180
          const r1 = 60
          const r2 = i % 2 === 0 ? 98 : 82
          return (
            <line
              key={deg}
              x1={Math.cos(rad) * r1} y1={Math.sin(rad) * r1}
              x2={Math.cos(rad) * r2} y2={Math.sin(rad) * r2}
              stroke="#F59E0B"
              strokeWidth="7"
              strokeLinecap="round"
            />
          )
        })}

        {/* Sun body */}
        <circle cx="0" cy="0" r="55" fill="#FDE68A" stroke="#FBBF24" strokeWidth="4.5" />

        {/* Eyes */}
        <circle cx="-17" cy="-9" r="6" fill="#92400E" />
        <circle cx="17"  cy="-9" r="6" fill="#92400E" />
        {/* Eye shine */}
        <circle cx="-14" cy="-12" r="2.5" fill="white" />
        <circle cx="20"  cy="-12" r="2.5" fill="white" />

        {/* Smile */}
        <path
          d="M-20,12 Q0,32 20,12"
          stroke="#92400E"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />

        {/* Rosy cheeks */}
        <circle cx="-30" cy="6" r="9" fill="#FCA5A5" opacity="0.5" />
        <circle cx="30"  cy="6" r="9" fill="#FCA5A5" opacity="0.5" />
      </svg>
    </div>
  )
}

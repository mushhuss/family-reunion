// ─── Sub-shapes (all return SVG elements, used inside <svg>) ─────────────────

type FlowerProps = { x: number; y: number; color: string; accent?: string; size?: number }

function Flower({ x, y, color, accent = '#FBBF24', size = 1 }: FlowerProps) {
  const stemH = 40 * size
  const pr    = 10 * size   // petal radius
  const cr    = 7.5 * size  // center radius
  const tx    = x
  const ty    = y - stemH

  return (
    <g>
      {/* Stem — slight S-curve for hand-drawn feel */}
      <path
        d={`M${x},${y} C${x + 5 * size},${y - stemH * 0.45} ${x - 5 * size},${y - stemH * 0.7} ${tx},${ty}`}
        stroke="#15803d"
        strokeWidth={2.8 * size}
        fill="none"
        strokeLinecap="round"
      />
      {/* Petals (6, spaced 60°) */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        return (
          <circle
            key={i}
            cx={tx + Math.cos(rad) * pr}
            cy={ty + Math.sin(rad) * pr}
            r={pr}
            fill={color}
            stroke="white"
            strokeWidth={2}
          />
        )
      })}
      {/* Center */}
      <circle cx={tx} cy={ty} r={cr} fill={accent} stroke="white" strokeWidth={2} />
    </g>
  )
}

function GrassBlade({ x, y, h, lean }: { x: number; y: number; h: number; lean: number }) {
  return (
    <path
      d={`M${x},${y} C${x + lean * 0.4},${y - h * 0.45} ${x + lean},${y - h * 0.78} ${x + lean * 0.25},${y - h}`}
      stroke="#166534"
      strokeWidth="2.8"
      fill="none"
      strokeLinecap="round"
    />
  )
}

function Cloud({ cx, cy, big = false }: { cx: number; cy: number; big?: boolean }) {
  const s = big ? 1.3 : 1
  return (
    <g opacity="0.88">
      <ellipse cx={cx}           cy={cy}           rx={62 * s} ry={34 * s} fill="white" stroke="#e5e7eb" strokeWidth="2"/>
      <ellipse cx={cx + 55 * s}  cy={cy + 6 * s}   rx={48 * s} ry={27 * s} fill="white" stroke="#e5e7eb" strokeWidth="2"/>
      <ellipse cx={cx - 48 * s}  cy={cy + 6 * s}   rx={38 * s} ry={24 * s} fill="white" stroke="#e5e7eb" strokeWidth="2"/>
      <ellipse cx={cx + 16 * s}  cy={cy - 22 * s}  rx={44 * s} ry={30 * s} fill="white" stroke="#e5e7eb" strokeWidth="2"/>
    </g>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FLOWERS: FlowerProps[] = [
  { x: 88,   y: 198, color: '#F9A8D4', size: 1.1 },
  { x: 232,  y: 178, color: '#FDE68A', accent: '#FB923C', size: 0.95 },
  { x: 405,  y: 190, color: '#C4B5FD', size: 1.2 },
  { x: 572,  y: 175, color: '#FCA5A5', accent: '#F87171', size: 1.05 },
  { x: 742,  y: 177, color: '#FED7AA', accent: '#F97316', size: 1.3 },
  { x: 912,  y: 170, color: '#7DD3FC', accent: '#38BDF8', size: 0.9 },
  { x: 1082, y: 179, color: '#FDE68A', accent: '#FB923C', size: 1.1 },
  { x: 1248, y: 185, color: '#F9A8D4', size: 1.0 },
  { x: 1393, y: 193, color: '#C4B5FD', size: 0.85 },
]

const GRASS_CLUSTERS = [155, 328, 492, 662, 830, 1002, 1168, 1336]

// ─── Main export ──────────────────────────────────────────────────────────────

export default function HomeGarden() {
  return (
    <svg
      viewBox="0 0 1440 290"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {/* Floating clouds (upper portion, won't overlap content on typical screen) */}
      <Cloud cx={130}  cy={68} />
      <Cloud cx={1300} cy={75} big />

      {/* ── Hills (back → front) ─────────────────────────────────── */}

      {/* Back hill — lightest */}
      <path
        d="M0,180 C75,140 195,120 318,142 C440,164 538,114 660,132 C782,150 898,110 1018,128 C1138,144 1268,116 1440,135 L1440,290 L0,290 Z"
        fill="#D1FAE5"
        stroke="#A7F3D0"
        strokeWidth="2.5"
      />

      {/* Mid hill */}
      <path
        d="M0,208 C96,184 235,170 375,188 C515,206 618,160 738,177 C858,194 976,163 1096,179 C1216,195 1358,172 1440,183 L1440,290 L0,290 Z"
        fill="#86EFAC"
        stroke="#4ADE80"
        strokeWidth="2.5"
      />

      {/* Front strip */}
      <path
        d="M0,244 C106,229 245,240 396,235 C547,230 698,242 848,237 C998,232 1148,244 1298,238 L1440,240 L1440,290 L0,290 Z"
        fill="#4ADE80"
        stroke="#22C55E"
        strokeWidth="2.5"
      />

      {/* ── Flowers ──────────────────────────────────────────────── */}
      {FLOWERS.map((f, i) => <Flower key={i} {...f} />)}

      {/* ── Grass blade clusters (on the front strip) ─────────────── */}
      {GRASS_CLUSTERS.map(gx => (
        <g key={gx}>
          <GrassBlade x={gx}      y={238} h={24} lean={-7} />
          <GrassBlade x={gx + 8}  y={237} h={30} lean={5}  />
          <GrassBlade x={gx + 16} y={238} h={22} lean={8}  />
          <GrassBlade x={gx + 4}  y={237} h={27} lean={-3} />
        </g>
      ))}

      {/* A couple of small butterflies for whimsy */}
      <g transform="translate(330, 148)" opacity="0.8">
        <path d="M0,0 Q-14,-16 -8,-24 Q-2,-16 0,0" fill="#F9A8D4" stroke="#F472B6" strokeWidth="1.5"/>
        <path d="M0,0 Q14,-16 8,-24  Q2,-16  0,0" fill="#F9A8D4" stroke="#F472B6" strokeWidth="1.5"/>
        <path d="M0,0 Q-10,12 -5,18  Q-1,12  0,0" fill="#C4B5FD" stroke="#A78BFA" strokeWidth="1.5"/>
        <path d="M0,0 Q10,12  5,18   Q1,12   0,0" fill="#C4B5FD" stroke="#A78BFA" strokeWidth="1.5"/>
        <circle cx="0" cy="0" r="2.5" fill="#92400E"/>
      </g>

      <g transform="translate(1105, 155) scale(-1,1)" opacity="0.8">
        <path d="M0,0 Q-14,-16 -8,-24 Q-2,-16 0,0" fill="#FDE68A" stroke="#FBBF24" strokeWidth="1.5"/>
        <path d="M0,0 Q14,-16 8,-24  Q2,-16  0,0" fill="#FDE68A" stroke="#FBBF24" strokeWidth="1.5"/>
        <path d="M0,0 Q-10,12 -5,18  Q-1,12  0,0" fill="#7DD3FC" stroke="#38BDF8" strokeWidth="1.5"/>
        <path d="M0,0 Q10,12  5,18   Q1,12   0,0" fill="#7DD3FC" stroke="#38BDF8" strokeWidth="1.5"/>
        <circle cx="0" cy="0" r="2.5" fill="#92400E"/>
      </g>
    </svg>
  )
}

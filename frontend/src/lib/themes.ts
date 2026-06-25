// ─── Reunion Theme System ─────────────────────────────────────────────────────
//
// To add a theme for a future reunion:
//   1. Add an entry to THEMES below with a new slug key.
//   2. Run the site — the slug will automatically appear in the admin dropdown.
//   3. In the admin dashboard, edit the reunion and select the new theme.
//   No other code changes needed.

export interface ReunionTheme {
  label: string
  pageBg: string
  accentColor: string
  pillarBg: string
  pillarBorder: string
  pillarIconBg: string
  pillarIconColor: string
  // Full palette for the main reunion title (more variety)
  titlePalette: string[]
  // 3 core colours for sub-page headers — tighter, more on-brand
  coreColors: [string, string, string]
}

export const THEMES: Record<string, ReunionTheme> = {
  default: {
    label: 'Warm Amber (default)',
    pageBg: '#fdf8f0',
    accentColor: '#c4741f',
    pillarBg: '#ffffff',
    pillarBorder: '#f5ddb3',
    pillarIconBg: '#faefd9',
    pillarIconColor: '#c4741f',
    coreColors: ['#DC2626', '#D97706', '#16A34A'],
    titlePalette: ['#DC2626', '#EA580C', '#D97706', '#CA8A04', '#16A34A', '#C026D3', '#DB2777', '#2563EB'],
  },
  ocean: {
    label: 'Ocean Blue',
    pageBg: '#eff6ff',
    accentColor: '#2563eb',
    pillarBg: '#ffffff',
    pillarBorder: '#bfdbfe',
    pillarIconBg: '#dbeafe',
    pillarIconColor: '#1d4ed8',
    coreColors: ['#1d4ed8', '#0891b2', '#7c3aed'],
    titlePalette: ['#1d4ed8', '#0369a1', '#0891b2', '#0d9488', '#7c3aed', '#6d28d9', '#0284c7', '#0e7490'],
  },
  forest: {
    label: 'Forest Green',
    pageBg: '#f0fdf4',
    accentColor: '#16a34a',
    pillarBg: '#ffffff',
    pillarBorder: '#bbf7d0',
    pillarIconBg: '#dcfce7',
    pillarIconColor: '#15803d',
    coreColors: ['#166534', '#0d9488', '#65a30d'],
    titlePalette: ['#166534', '#15803d', '#065f46', '#0d9488', '#65a30d', '#4d7c0f', '#16a34a', '#047857'],
  },
  sunset: {
    label: 'Sunset',
    pageBg: '#fff7ed',
    accentColor: '#ea580c',
    pillarBg: '#ffffff',
    pillarBorder: '#fed7aa',
    pillarIconBg: '#ffedd5',
    pillarIconColor: '#ea580c',
    coreColors: ['#c2410c', '#dc2626', '#be185d'],
    titlePalette: ['#c2410c', '#b45309', '#9d174d', '#dc2626', '#ea580c', '#d97706', '#be185d', '#e11d48'],
  },
  berry: {
    label: 'Berry',
    pageBg: '#fdf4ff',
    accentColor: '#9333ea',
    pillarBg: '#ffffff',
    pillarBorder: '#e9d5ff',
    pillarIconBg: '#f3e8ff',
    pillarIconColor: '#9333ea',
    coreColors: ['#7e22ce', '#be185d', '#4f46e5'],
    titlePalette: ['#7e22ce', '#be185d', '#4f46e5', '#9333ea', '#c026d3', '#db2777', '#7c3aed', '#a21caf'],
  },
}

export function getReunionTheme(slug: string): ReunionTheme {
  return THEMES[slug] ?? THEMES.default
}

// ─── Title colour picker ──────────────────────────────────────────────────────
// Picks `count` unique colours from `palette` on every call.
// Home page passes THEMES.default.titlePalette; reunion pages pass their theme's palette.

export function pickTitleColors(count: number, palette: string[]): string[] {
  const pool = [...palette]
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) pool.push(...palette)
    const idx = Math.floor(Math.random() * pool.length)
    result.push(pool.splice(idx, 1)[0])
  }
  return result
}

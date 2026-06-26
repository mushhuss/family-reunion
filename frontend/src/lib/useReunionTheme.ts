// Convenience hook used by Photos, Program, and Links pages.
// Fetches the reunion for the given year and returns its ReunionTheme.
// Starts with 'default' while loading so sub-pages never flash unstyled.
import { useEffect, useState } from 'react'
import { getReunion } from './api'
import { getReunionTheme } from './themes'
import type { ReunionTheme } from './themes'

export function useReunionTheme(year: string | undefined): ReunionTheme {
  const [theme, setTheme] = useState<ReunionTheme>(getReunionTheme('default'))

  useEffect(() => {
    if (!year) return
    getReunion(year)
      .then(r => setTheme(getReunionTheme(r.theme_slug)))
      .catch(() => {})
  }, [year])

  return theme
}

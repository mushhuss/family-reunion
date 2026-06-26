import { describe, it, expect } from 'vitest'
import { getReunionTheme, pickTitleColors, THEMES } from './themes'

describe('getReunionTheme', () => {
  it('returns the matching theme for a known slug', () => {
    expect(getReunionTheme('ocean')).toBe(THEMES.ocean)
    expect(getReunionTheme('forest')).toBe(THEMES.forest)
  })

  it('falls back to default for an unknown slug', () => {
    expect(getReunionTheme('nonexistent')).toBe(THEMES.default)
  })

  it('falls back to default for an empty string', () => {
    expect(getReunionTheme('')).toBe(THEMES.default)
  })

  it('every theme has 3 coreColors', () => {
    for (const theme of Object.values(THEMES)) {
      expect(theme.coreColors).toHaveLength(3)
    }
  })

  it('every theme has 8 titlePalette colors', () => {
    for (const theme of Object.values(THEMES)) {
      expect(theme.titlePalette).toHaveLength(8)
    }
  })
})

describe('pickTitleColors', () => {
  it('returns the requested number of colors', () => {
    expect(pickTitleColors(2, THEMES.default.titlePalette)).toHaveLength(2)
    expect(pickTitleColors(3, THEMES.default.titlePalette)).toHaveLength(3)
  })

  it('returns only colors that exist in the palette', () => {
    const palette = THEMES.default.titlePalette
    const colors = pickTitleColors(4, palette)
    for (const c of colors) {
      expect(palette).toContain(c)
    }
  })

  it('never returns duplicate colors when count <= palette size', () => {
    const colors = pickTitleColors(8, THEMES.default.titlePalette)
    expect(new Set(colors).size).toBe(8)
  })

  it('handles count > palette size by recycling', () => {
    // Should not throw; just picks more than the palette has
    const colors = pickTitleColors(10, THEMES.default.titlePalette)
    expect(colors).toHaveLength(10)
  })

  it('returns valid hex color strings', () => {
    const colors = pickTitleColors(2, THEMES.default.titlePalette)
    for (const c of colors) {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

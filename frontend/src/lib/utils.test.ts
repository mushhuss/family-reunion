import { describe, it, expect } from 'vitest'
import { extractYoutubeId } from './utils'

describe('extractYoutubeId', () => {
  it('handles watch?v= format', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('handles youtu.be shortlink', () => {
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('handles embed URL', () => {
    expect(extractYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('handles shorts URL', () => {
    expect(extractYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('handles watch?v= with extra query params', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ')
  })

  it('returns null for a non-YouTube URL', () => {
    expect(extractYoutubeId('https://vimeo.com/123456789')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(extractYoutubeId('')).toBeNull()
  })

  it('returns null for a plain string with no URL structure', () => {
    expect(extractYoutubeId('not a url at all')).toBeNull()
  })
})

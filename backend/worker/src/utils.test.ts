import { describe, it, expect } from 'vitest'
import { isAdmin, getMediaType, isSizeAllowed, EXT_MAP, IMAGE_MAX, VIDEO_MAX } from './utils'

describe('isAdmin', () => {
  it('accepts the correct Bearer token', () => {
    expect(isAdmin('Bearer supersecret', 'supersecret')).toBe(true)
  })

  it('rejects an incorrect token', () => {
    expect(isAdmin('Bearer wrong', 'supersecret')).toBe(false)
  })

  it('rejects a token without the Bearer prefix', () => {
    expect(isAdmin('supersecret', 'supersecret')).toBe(false)
  })

  it('rejects a null header', () => {
    expect(isAdmin(null, 'supersecret')).toBe(false)
  })

  it('rejects an undefined header', () => {
    expect(isAdmin(undefined, 'supersecret')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isAdmin('', 'supersecret')).toBe(false)
  })
})

describe('getMediaType', () => {
  it('identifies all accepted image types as photo', () => {
    expect(getMediaType('image/jpeg')).toBe('photo')
    expect(getMediaType('image/png')).toBe('photo')
    expect(getMediaType('image/webp')).toBe('photo')
    expect(getMediaType('image/heic')).toBe('photo')
  })

  it('identifies all accepted video types as video', () => {
    expect(getMediaType('video/mp4')).toBe('video')
    expect(getMediaType('video/quicktime')).toBe('video')
  })

  it('returns null for unsupported types', () => {
    expect(getMediaType('application/pdf')).toBeNull()
    expect(getMediaType('text/html')).toBeNull()
    expect(getMediaType('image/gif')).toBeNull()
    expect(getMediaType('video/avi')).toBeNull()
  })
})

describe('isSizeAllowed', () => {
  it('allows images exactly at the 20 MB limit', () => {
    expect(isSizeAllowed(IMAGE_MAX, 'image/jpeg')).toBe(true)
  })

  it('rejects images 1 byte over the 20 MB limit', () => {
    expect(isSizeAllowed(IMAGE_MAX + 1, 'image/jpeg')).toBe(false)
  })

  it('allows videos exactly at the 500 MB limit', () => {
    expect(isSizeAllowed(VIDEO_MAX, 'video/mp4')).toBe(true)
  })

  it('rejects videos 1 byte over the 500 MB limit', () => {
    expect(isSizeAllowed(VIDEO_MAX + 1, 'video/mp4')).toBe(false)
  })

  it('applies the image limit to HEIC files', () => {
    expect(isSizeAllowed(IMAGE_MAX + 1, 'image/heic')).toBe(false)
  })

  it('applies the video limit to MOV files', () => {
    expect(isSizeAllowed(VIDEO_MAX, 'video/quicktime')).toBe(true)
  })
})

describe('EXT_MAP', () => {
  it('maps every accepted MIME type to an extension', () => {
    const expectedMappings: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
    }
    for (const [mime, ext] of Object.entries(expectedMappings)) {
      expect(EXT_MAP[mime]).toBe(ext)
    }
  })
})

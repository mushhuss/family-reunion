// Pure utility functions extracted from index.ts so they can be unit-tested
// without requiring the Cloudflare Workers runtime environment.

export const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
export const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime'])
export const IMAGE_MAX = 20 * 1024 * 1024   // 20 MB
export const VIDEO_MAX = 500 * 1024 * 1024  // 500 MB

export const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
}

// Returns true only if the Authorization header is exactly "Bearer <secret>".
export function isAdmin(authHeader: string | null | undefined, secret: string): boolean {
  return authHeader === `Bearer ${secret}`
}

// Returns 'photo', 'video', or null for unsupported types.
export function getMediaType(mimeType: string): 'photo' | 'video' | null {
  if (IMAGE_TYPES.has(mimeType)) return 'photo'
  if (VIDEO_TYPES.has(mimeType)) return 'video'
  return null
}

// Returns false if the file exceeds the per-type size limit.
export function isSizeAllowed(size: number, mimeType: string): boolean {
  const max = VIDEO_TYPES.has(mimeType) ? VIDEO_MAX : IMAGE_MAX
  return size <= max
}

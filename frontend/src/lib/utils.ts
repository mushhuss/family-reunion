// Pure utility functions shared across the app.
// Kept separate so they can be unit-tested without importing React or DOM APIs.

// Extracts the YouTube video ID from any common URL format.
// Handles: watch?v=, youtu.be/, /embed/, /shorts/
export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&\s]+)/,
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /youtube\.com\/shorts\/([^?&\s]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}

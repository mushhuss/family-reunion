// TypeScript interfaces mirroring the Supabase DB schema.
// Every fetch response from the Worker is typed against these; keep in sync with schema.sql.

export interface Reunion {
  id: string
  year: number
  title: string
  welcome_message: string | null
  hero_image_url: string | null
  theme_slug: string
  start_date: string | null  // first day of the reunion (Thursday), e.g. "2026-07-02"
  status: 'active' | 'locked' | 'archived'
  youtube_url: string | null // set when status = 'archived'
  created_at: string
}

export interface Media {
  id: string
  reunion_id: string
  // Two R2 URLs per photo: `url` is the full-quality original (downloads/slideshows);
  // `thumb_url` is a browser-generated 1200px JPEG preview (gallery display).
  // Videos only have `url` — no thumbnail is generated (they get a canvas-captured frame instead,
  // which the Worker stores in `thumb_url` via the `thumb` form field in PhotoUpload.tsx).
  url: string           // original full-quality file (use for downloads/slideshow)
  thumb_url: string | null  // 1200px compressed preview (use for gallery display)
  r2_key: string
  type: 'photo' | 'video'
  caption: string | null
  uploaded_by: string | null
  created_at: string
}

export interface ProgramEvent {
  id: string
  reunion_id: string
  title: string
  description: string | null
  event_date: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  sort_order: number
  created_at: string
}

export interface Link {
  id: string
  reunion_id: string
  title: string
  url: string
  description: string | null
  sort_order: number
  created_at: string
}

export interface Contact {
  id: string
  reunion_id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  sort_order: number
}

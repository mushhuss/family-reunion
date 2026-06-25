export interface Reunion {
  id: string
  year: number
  title: string
  welcome_message: string | null
  hero_image_url: string | null
  theme_slug: string
  created_at: string
}

export interface Media {
  id: string
  reunion_id: string
  url: string
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

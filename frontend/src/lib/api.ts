import type { Reunion, Media, ProgramEvent, Link, Contact } from './types'

const BASE = import.meta.env.VITE_API_URL as string

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status))
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

async function patch<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status))
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

async function del(path: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(String(res.status))
}

// ─── Public ───────────────────────────────────────────────────────────────────

export const getReunions = () => get<Reunion[]>('/api/reunions')
export const getReunion = (year: string) => get<Reunion>(`/api/reunions/${year}`)
export const getPhotos = (year: string) => get<Media[]>(`/api/reunions/${year}/media`)
export const getVideoCount = (year: string) => get<{ count: number }>(`/api/reunions/${year}/video-count`)
export const getProgram = (year: string) => get<ProgramEvent[]>(`/api/reunions/${year}/program`)
export const getLinks = (year: string) => get<Link[]>(`/api/reunions/${year}/links`)
export const getContacts = (year: string) => get<Contact[]>(`/api/reunions/${year}/contacts`)

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadMedia(
  file: File,
  year: string,
  uploadedBy?: string,
  caption?: string,
): Promise<{ url: string; type: string; key: string }> {
  let lastError: Error = new Error('Upload failed')
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 1500 * attempt))
    try {
      // Rebuild FormData each attempt — avoids any stream-already-consumed issues
      const form = new FormData()
      form.append('file', file)
      form.append('year', year)
      if (uploadedBy) form.append('uploaded_by', uploadedBy)
      if (caption) form.append('caption', caption)

      const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
      if (!res.ok) {
        const msg = await res.text().catch(() => `Upload failed (${res.status})`)
        throw new Error(msg)
      }
      return res.json() as Promise<{ url: string; type: string; key: string }>
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }
  throw lastError
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export const checkAdmin = (token: string) =>
  post<{ ok: boolean }>('/admin/check', {}, token)

export const createReunion = (body: object, token: string) =>
  post<Reunion>('/admin/reunions', body, token)

export const deleteReunion = (id: string, token: string) =>
  del(`/admin/reunions/${id}`, token)

export const createProgramEvent = (reunionId: string, body: object, token: string) =>
  post<ProgramEvent>(`/admin/reunions/${reunionId}/program`, body, token)

export const deleteProgramEvent = (id: string, token: string) =>
  del(`/admin/program/${id}`, token)

export const createLink = (reunionId: string, body: object, token: string) =>
  post<Link>(`/admin/reunions/${reunionId}/links`, body, token)

export const deleteLink = (id: string, token: string) =>
  del(`/admin/links/${id}`, token)

export const createContact = (reunionId: string, body: object, token: string) =>
  post<Contact>(`/admin/reunions/${reunionId}/contacts`, body, token)

export const deleteContact = (id: string, token: string) =>
  del(`/admin/contacts/${id}`, token)

export const updateReunion = (id: string, body: object, token: string) =>
  patch<Reunion>(`/admin/reunions/${id}`, body, token)

export const updateProgramEvent = (id: string, body: object, token: string) =>
  patch<ProgramEvent>(`/admin/program/${id}`, body, token)

export const updateLink = (id: string, body: object, token: string) =>
  patch<Link>(`/admin/links/${id}`, body, token)

export const updateContact = (id: string, body: object, token: string) =>
  patch<Contact>(`/admin/contacts/${id}`, body, token)

export const deleteMedia = (id: string, token: string) =>
  del(`/admin/media/${id}`, token)

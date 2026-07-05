// Cloudflare Worker API — the single backend for the entire site.
// Built with Hono (lightweight router). Handles:
//   - All public data reads (reunions, media, program, links, contacts)
//   - Photo/video uploads to R2 + metadata insert into Supabase
//   - Admin CRUD (protected by Authorization: Bearer <ADMIN_SECRET>)
//
// The Supabase service key lives only here — never in the frontend.
// Secrets (ADMIN_SECRET, SUPABASE_SERVICE_KEY) are set via `wrangler secret put`.
// Non-secret config (SUPABASE_URL, BUCKET_PUBLIC_URL) lives in wrangler.toml.
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'
import { IMAGE_TYPES, VIDEO_TYPES, IMAGE_MAX, VIDEO_MAX, EXT_MAP, isAdmin as checkAdmin, getMediaType, isSizeAllowed } from './utils'

type Bindings = {
  BUCKET: R2Bucket
  BUCKET_PUBLIC_URL: string
  ADMIN_SECRET: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

const db = (env: Bindings) =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

const isAdmin = (authHeader: string | null | undefined, secret: string) =>
  checkAdmin(authHeader, secret)

// ─── Public: reunions ────────────────────────────────────────────────────────

app.get('/api/reunions', async (c) => {
  const { data } = await db(c.env).from('reunions').select('*').order('year', { ascending: false })
  return c.json(data ?? [])
})

app.get('/api/reunions/:year', async (c) => {
  const { data } = await db(c.env)
    .from('reunions').select('*')
    .eq('year', Number(c.req.param('year')))
    .single()
  if (!data) return c.json({ error: 'Not found' }, 404)
  return c.json(data)
})

// ─── Public: per-reunion data ────────────────────────────────────────────────

app.get('/api/reunions/:year/media', async (c) => {
  const reunion = await getReunionByYear(c.env, c.req.param('year'))
  if (!reunion) return c.json([])
  const { data } = await db(c.env)
    .from('media')
    // Explicit column list — avoids fetching r2_key and reunion_id which the frontend never uses.
    // thumb_url is intentionally included: gallery displays it instead of the full original.
    .select('id, url, thumb_url, preview_url, type, caption, uploaded_by')
    .eq('reunion_id', reunion.id)
    .order('created_at', { ascending: false })
  return c.json(data ?? [])
})

app.get('/api/reunions/:year/video-count', async (c) => {
  const reunion = await getReunionByYear(c.env, c.req.param('year'))
  if (!reunion) return c.json({ count: 0 })
  const { count } = await db(c.env)
    .from('media').select('*', { count: 'exact', head: true })
    .eq('reunion_id', reunion.id)
    .eq('type', 'video')
  return c.json({ count: count ?? 0 })
})

app.get('/api/reunions/:year/program', async (c) => {
  const reunion = await getReunionByYear(c.env, c.req.param('year'))
  if (!reunion) return c.json([])
  const { data } = await db(c.env)
    .from('program_events').select('*')
    .eq('reunion_id', reunion.id)
    .order('event_date', { ascending: true, nullsFirst: false })
    .order('start_time', { ascending: true, nullsFirst: true })
    .order('sort_order')
  return c.json(data ?? [])
})

app.get('/api/reunions/:year/links', async (c) => {
  const reunion = await getReunionByYear(c.env, c.req.param('year'))
  if (!reunion) return c.json([])
  const { data } = await db(c.env)
    .from('links').select('*')
    .eq('reunion_id', reunion.id)
    .order('sort_order')
  return c.json(data ?? [])
})

app.get('/api/reunions/:year/contacts', async (c) => {
  const reunion = await getReunionByYear(c.env, c.req.param('year'))
  if (!reunion) return c.json([])
  const { data } = await db(c.env)
    .from('contacts').select('*')
    .eq('reunion_id', reunion.id)
    .order('sort_order')
  return c.json(data ?? [])
})

// ─── Upload: R2 + Supabase ───────────────────────────────────────────────────

app.post('/upload', async (c) => {
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Invalid form data' }, 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return c.json({ error: 'Missing file field' }, 400)

  const mediaType = getMediaType(file.type)
  if (!mediaType) return c.json({ error: 'Unsupported file type' }, 415)

  const isImage = mediaType === 'photo'
  const isVideo = mediaType === 'video'

  if (!isSizeAllowed(file.size, file.type)) {
    return c.json({ error: `File too large (max ${isVideo ? '500 MB' : '20 MB'})` }, 413)
  }

  const year = (formData.get('year') as string | null) ?? String(new Date().getFullYear())
  const reunion = await getReunionByYear(c.env, year)
  if (!reunion) return c.json({ error: `No reunion found for year ${year}` }, 404)

  const ext = EXT_MAP[file.type]
  const uid = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const key = `${year}/${mediaType}/${uid}.${ext}`

  await c.env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  })

  const url = `${c.env.BUCKET_PUBLIC_URL}/${key}`

  // thumb  → 1200px JPEG (lightbox quality), generated by the browser via Canvas
  // preview → 400px JPEG (grid quality), also generated in the browser — much smaller,
  //           fixes heavy loading on desktop where grids show items at ~250px wide
  const thumbFile = formData.get('thumb')
  let thumbUrl: string | null = null
  if (thumbFile instanceof File) {
    const thumbKey = `${year}/thumb/${uid}.jpg`
    await c.env.BUCKET.put(thumbKey, thumbFile.stream(), { httpMetadata: { contentType: 'image/jpeg' } })
    thumbUrl = `${c.env.BUCKET_PUBLIC_URL}/${thumbKey}`
  }

  const previewFile = formData.get('preview')
  let previewUrl: string | null = null
  if (previewFile instanceof File) {
    const previewKey = `${year}/preview/${uid}.jpg`
    await c.env.BUCKET.put(previewKey, previewFile.stream(), { httpMetadata: { contentType: 'image/jpeg' } })
    previewUrl = `${c.env.BUCKET_PUBLIC_URL}/${previewKey}`
  }

  await db(c.env).from('media').insert({
    reunion_id: reunion.id,
    url,
    thumb_url: thumbUrl,
    preview_url: previewUrl,
    r2_key: key,
    type: mediaType,
    caption: (formData.get('caption') as string | null) || null,
    uploaded_by: (formData.get('uploaded_by') as string | null) || null,
  })

  return c.json({ url, thumb_url: thumbUrl, preview_url: previewUrl, type: mediaType, key })
})

// ─── Admin: auth check ────────────────────────────────────────────────────────

app.post('/admin/check', (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return c.json({ ok: true })
})

// ─── Admin: reunions ──────────────────────────────────────────────────────────

app.post('/admin/reunions', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json<Record<string, unknown>>()
  const { data, error } = await db(c.env).from('reunions').insert(body).select().single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

app.delete('/admin/reunions/:id', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  await db(c.env).from('reunions').delete().eq('id', c.req.param('id'))
  return new Response(null, { status: 204 })
})

// ─── Admin: program events ────────────────────────────────────────────────────

app.post('/admin/reunions/:id/program', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json<Record<string, unknown>>()
  const { data, error } = await db(c.env)
    .from('program_events').insert({ ...body, reunion_id: c.req.param('id') }).select().single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

app.delete('/admin/program/:id', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  await db(c.env).from('program_events').delete().eq('id', c.req.param('id'))
  return new Response(null, { status: 204 })
})

// ─── Admin: links ─────────────────────────────────────────────────────────────

app.post('/admin/reunions/:id/links', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json<Record<string, unknown>>()
  const { data, error } = await db(c.env)
    .from('links').insert({ ...body, reunion_id: c.req.param('id') }).select().single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

app.delete('/admin/links/:id', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  await db(c.env).from('links').delete().eq('id', c.req.param('id'))
  return new Response(null, { status: 204 })
})

// ─── Admin: contacts ──────────────────────────────────────────────────────────

app.post('/admin/reunions/:id/contacts', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json<Record<string, unknown>>()
  const { data, error } = await db(c.env)
    .from('contacts').insert({ ...body, reunion_id: c.req.param('id') }).select().single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

app.delete('/admin/contacts/:id', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  await db(c.env).from('contacts').delete().eq('id', c.req.param('id'))
  return new Response(null, { status: 204 })
})

// ─── Admin: PATCH (edit) ──────────────────────────────────────────────────────

app.patch('/admin/reunions/:id', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json<Record<string, unknown>>()
  const { data, error } = await db(c.env)
    .from('reunions').update(body).eq('id', c.req.param('id')).select().single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

app.patch('/admin/program/:id', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json<Record<string, unknown>>()
  const { data, error } = await db(c.env)
    .from('program_events').update(body).eq('id', c.req.param('id')).select().single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

app.patch('/admin/links/:id', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json<Record<string, unknown>>()
  const { data, error } = await db(c.env)
    .from('links').update(body).eq('id', c.req.param('id')).select().single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

app.patch('/admin/contacts/:id', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json<Record<string, unknown>>()
  const { data, error } = await db(c.env)
    .from('contacts').update(body).eq('id', c.req.param('id')).select().single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// ─── Admin: delete media (R2 + Supabase) ─────────────────────────────────────

app.delete('/admin/media/:id', async (c) => {
  if (!isAdmin(c.req.header('Authorization'), c.env.ADMIN_SECRET)) return c.json({ error: 'Unauthorized' }, 401)
  const { data } = await db(c.env)
    .from('media').select('r2_key').eq('id', c.req.param('id')).single()
  if (data?.r2_key) await c.env.BUCKET.delete(data.r2_key)
  await db(c.env).from('media').delete().eq('id', c.req.param('id'))
  return new Response(null, { status: 204 })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getReunionByYear(env: Bindings, year: string) {
  const { data } = await db(env)
    .from('reunions').select('id').eq('year', Number(year)).single()
  return data as { id: string } | null
}

export default app

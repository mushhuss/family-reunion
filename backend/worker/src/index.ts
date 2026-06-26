import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'

type Bindings = {
  BUCKET: R2Bucket
  BUCKET_PUBLIC_URL: string
  ADMIN_SECRET: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime'])
const IMAGE_MAX = 20 * 1024 * 1024
const VIDEO_MAX = 500 * 1024 * 1024
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
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
  authHeader === `Bearer ${secret}`

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
    .from('media').select('id, url, type, caption, uploaded_by')
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

  const isImage = IMAGE_TYPES.has(file.type)
  const isVideo = VIDEO_TYPES.has(file.type)
  if (!isImage && !isVideo) return c.json({ error: 'Unsupported file type' }, 415)

  const maxSize = isVideo ? VIDEO_MAX : IMAGE_MAX
  if (file.size > maxSize) {
    return c.json({ error: `File too large (max ${isVideo ? '500 MB' : '20 MB'})` }, 413)
  }

  const year = (formData.get('year') as string | null) ?? String(new Date().getFullYear())
  const reunion = await getReunionByYear(c.env, year)
  if (!reunion) return c.json({ error: `No reunion found for year ${year}` }, 404)

  const mediaType = isVideo ? 'video' : 'photo'
  const ext = EXT_MAP[file.type]
  const key = `${year}/${mediaType}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

  await c.env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  })

  const url = `${c.env.BUCKET_PUBLIC_URL}/${key}`

  await db(c.env).from('media').insert({
    reunion_id: reunion.id,
    url,
    r2_key: key,
    type: mediaType,
    caption: (formData.get('caption') as string | null) || null,
    uploaded_by: (formData.get('uploaded_by') as string | null) || null,
  })

  return c.json({ url, type: mediaType, key })
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

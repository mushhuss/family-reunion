export interface Env {
  BUCKET: R2Bucket
  BUCKET_PUBLIC_URL: string
  ADMIN_SECRET: string
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
const MAX_SIZE = 20 * 1024 * 1024

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method === 'DELETE') {
      if (request.headers.get('Authorization') !== `Bearer ${env.ADMIN_SECRET}`) {
        return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS })
      }

      const { key } = await request.json() as { key: string }
      await env.BUCKET.delete(key)
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return new Response('Invalid form data', { status: 400, headers: CORS_HEADERS })
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return new Response('Missing file field', { status: 400, headers: CORS_HEADERS })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return new Response('Unsupported file type', { status: 415, headers: CORS_HEADERS })
    }

    if (file.size > MAX_SIZE) {
      return new Response('File too large (max 20 MB)', { status: 413, headers: CORS_HEADERS })
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const key = `photos/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    })

    return new Response(JSON.stringify({ url: `${env.BUCKET_PUBLIC_URL}/${key}` }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  },
}

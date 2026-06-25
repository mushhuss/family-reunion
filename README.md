# DispoCam — Ammber & Umair's Wedding

A disposable camera web app for wedding guests. Guests scan a QR code, enter their name, get 10 shots, and their photos appear in a live shared album. Built with Vite + React + TypeScript, Supabase (database + realtime), and Cloudflare R2 (image storage via Worker).

---

## Project Structure

```
dispocamera/
├── frontend/               # Vite React TypeScript app
│   ├── src/
│   │   ├── App.tsx                    # Router: /, /how-it-works, /camera, /album
│   │   ├── main.tsx                   # React DOM entry
│   │   ├── index.css                  # All styles (single file, no CSS modules)
│   │   ├── types.ts                   # Session, Photo, Comment interfaces
│   │   ├── vite-env.d.ts              # Vite import.meta.env types
│   │   ├── lib/
│   │   │   ├── supabase.ts            # Supabase client (singleton)
│   │   │   ├── upload.ts              # POST to R2 Worker, returns public URL
│   │   │   ├── filters.ts             # Filter types, CSS preview values, canvas baking
│   │   │   └── retry.ts               # withRetry() — exponential backoff for DB/upload calls
│   │   ├── pages/
│   │   │   ├── Home.tsx               # Name entry → creates Supabase session
│   │   │   ├── HowItWorks.tsx         # Explanation page, Start Camera button
│   │   │   ├── Camera.tsx             # Live viewfinder, shutter, filter selector
│   │   │   └── Album.tsx              # Photo grid with Supabase Realtime live updates
│   │   └── components/
│   │       └── PhotoCard.tsx          # Full-screen modal: photo + comments + download + Realtime
│   ├── .env                           # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_R2_WORKER_URL
│   ├── index.html                     # Google Fonts (Cormorant Garamond + Nunito), viewport meta
│   └── package.json
│
├── backend/
│   ├── supabase/
│   │   └── schema.sql                 # Full DB schema + RLS policies + Realtime publication
│   └── worker/
│       ├── src/index.ts               # Cloudflare Worker: accepts multipart POST → streams to R2 → returns URL
│       ├── wrangler.toml              # R2 bucket binding (BUCKET), BUCKET_PUBLIC_URL var
│       └── package.json
│
└── .gitignore
```

---

## How the App Works

### User Flow
1. Guest scans QR code → lands on `/` (Home)
2. Enters name → Supabase creates a row in `sessions` table → name + session_id stored in `localStorage`
3. **Name is locked for the session** — if `session_id` already exists in `localStorage`, Home redirects immediately to `/camera`. The user cannot re-enter a different name.
4. Redirected to `/how-it-works` (explanation page) → clicks "Start My Camera"
5. `/camera` — live camera viewfinder, 10 shots, 6 filter options
6. On capture: photo is drawn to canvas with filter baked in → uploaded to R2 Worker → URL saved in Supabase `photos` table → `photos_remaining` decremented in `sessions` table
7. `/album` — grid of all photos from all guests, chronological descending. Realtime: new photos pop in as they're taken. Click a photo to open modal with comments (also Realtime) and a download button.

### Session Model
- No auth. Sessions are identified by UUID stored in `localStorage`.
- `localStorage` persists across tabs and browser restarts (unlike `sessionStorage`). A guest who closes the tab and reopens the app is sent straight to `/camera` as the same guest.
- `localStorage` keys: `session_id` (UUID), `session_name` (string)
- Only clears if the guest manually clears browser data or uses incognito mode.

---

## Database (Supabase)

**Tables:**

```sql
sessions  (id uuid PK, name text, photos_remaining int default 10, created_at timestamp)
photos    (id uuid PK, session_id uuid → sessions, image_url text, created_at timestamp)
comments  (id uuid PK, photo_id uuid → photos, name text, text text, created_at timestamp)
```

**RLS:** Enabled on all tables. Policies allow full public SELECT + INSERT (no auth required). Sessions also allow UPDATE (to decrement `photos_remaining`).

**Realtime:** `photos` and `comments` tables are added to `supabase_realtime` publication. Album page subscribes to photo INSERTs; PhotoCard subscribes to comment INSERTs filtered by `photo_id`.

**Joining:** Photos are fetched with `.select('*, session:sessions(name)')` to get the guest name without a separate query.

**To reset the database** (clear all photos/sessions between test runs):
```sql
truncate table comments, photos, sessions restart identity cascade;
```

**To set up from scratch:** paste `backend/supabase/schema.sql` into the Supabase SQL Editor and run it.

**Free tier note:** Supabase's free tier allows ~50 concurrent DB connections. Each query holds a connection for milliseconds then releases it, so 150 active users is fine under normal usage. Spikes (e.g. everyone scanning the QR at once) are handled by the retry logic in the frontend — see below.

**Supabase pauses free projects** after ~1 week of inactivity. If the app stops working, go to supabase.com/dashboard and click Restore on your project.

---

## Image Storage (Cloudflare R2 + Worker)

**Why a Worker:** R2 requires server-side credentials. The Worker acts as a lightweight upload proxy — the browser POSTs a multipart form to the Worker, the Worker streams to R2, and returns the public URL.

**Worker (`backend/worker/src/index.ts`):**
- Accepts `POST` with `multipart/form-data`, field name `file`
- Validates type (jpeg/png/webp/heic) and size (max 20 MB)
- Streams directly to R2 with key `photos/{timestamp}-{uuid}.ext`
- Returns `{ url: "https://pub-xxx.r2.dev/photos/..." }`
- Full CORS headers on all responses (including OPTIONS preflight)
- No secrets required — only the R2 bucket binding and `BUCKET_PUBLIC_URL` var

**Frontend (`frontend/src/lib/upload.ts`):**
- Reads `VITE_R2_WORKER_URL` from env
- POSTs blob as `FormData`
- Throws if the env var is the placeholder value

**To deploy the Worker:**
```bash
cd backend/worker
npm install
npx wrangler login
npx wrangler deploy
```
Then paste the deployed URL into `frontend/.env` as `VITE_R2_WORKER_URL`.

**wrangler.toml config:**
- R2 binding name: `BUCKET`
- Bucket name: `dispocamera-photos`
- `BUCKET_PUBLIC_URL` var: paste your R2 public dev URL (`https://pub-xxxx.r2.dev`)

---

## Retry Logic (`frontend/src/lib/retry.ts`)

All Supabase reads and writes, and the R2 upload, are wrapped in `withRetry()`. On failure it retries up to 3 times with exponential backoff (600ms → 1.2s → 2.4s). This silently handles brief connection spikes without the user seeing an error.

**Covered operations:**
| Operation | File |
|---|---|
| Session creation | `Home.tsx` |
| Load photos remaining | `Camera.tsx` |
| Upload photo to R2 | `Camera.tsx` |
| Save photo + update session | `Camera.tsx` |
| Load album photos | `Album.tsx` |
| Load comments | `PhotoCard.tsx` |

---

## Photo Download

- **Album grid:** hovering a thumbnail reveals a small download button (bottom-right). Clicking it downloads the photo without opening the modal.
- **Photo modal:** a gold "↓ Save" button appears in the meta bar next to the guest name.
- Both fetch the image as a blob and trigger a file download. Falls back to opening in a new tab if the fetch fails (e.g. CORS issue).

---

## Camera Filters (`frontend/src/lib/filters.ts`)

Six filters. Each has a `previewCss` string applied to the `<video>` element live, and a separate capture path that bakes the effect into the canvas.

| Filter | Preview CSS | Capture method |
|--------|-------------|----------------|
| Classic | `none` | Direct `drawImage` |
| Vivid | `saturate(290%) contrast(148%) brightness(110%) hue-rotate(5deg)` | `ctx.filter` = same |
| B&W | `grayscale(100%) contrast(180%) brightness(80%)` | `ctx.filter` = same |
| Sepia | `sepia(100%) saturate(180%) contrast(120%) brightness(88%)` | `ctx.filter` = same |
| Retro | `contrast(60%) brightness(152%) saturate(55%) sepia(35%) hue-rotate(-10deg)` | **Pixel manipulation**: lifts blacks to floor ~42, compresses highlights to ~218, adds warm cast (+20R +8G -28B), desaturates 35% toward luminance |
| Fisheye | `none` (circular mask overlay shown) | **Barrel distortion**: per-pixel mapping with `factor = 1 + 0.38 * r²`, black vignette at edges |

**Why Retro uses pixel manipulation:** CSS `filter` cannot lift the shadow floor (set a minimum black level). The pixel approach maps the 0–255 range to 42–218, which is what makes old Polaroid prints look genuinely faded rather than just darkened.

**Fisheye is slow on high-res captures.** The barrel distortion loop runs ~2 million iterations on a 1920x1080 frame. On a fast phone this takes ~300–600ms. It only runs once at capture time (not per frame), so it is acceptable.

---

## Styling (`frontend/src/index.css`)

Single CSS file, no modules, no Tailwind. All styles are global classes.

**Theme:** Deep burgundy-red backgrounds (`#580A0A` base), metallic gold text and accents. South Asian wedding aesthetic.

**Key CSS variables:**
```css
--bg:          #580A0A   /* main page background */
--bg-deep:     #3A0505   /* darker surfaces (modal, inputs) */
--surface:     #6E1010   /* cards, strips */
--gold-metal:  linear-gradient(105deg, #7A5500, #C4960A, #FFE566, #D4A820, #FFE566, #C4960A, #7A5500)
--text:        #FFF5D6   /* warm cream body text */
--text-gold:   #F0C84A   /* gold-tinted text */
--serif:       'Cormorant Garamond', Georgia, serif
--sans:        'Nunito', -apple-system, sans-serif
```

**Gold metallic text** is applied via `background-clip: text` + `-webkit-text-fill-color: transparent` with the `--gold-metal` gradient. Used on all major headings.

**Mobile:** All pages use `min-height: 100svh`. Camera page uses `position: fixed; inset: 0` so it is truly locked full-screen with no scroll. All interactive elements have `min-height: 44–52px` touch targets. `font-size: 16px` on all inputs prevents iOS auto-zoom. Safe area insets via `env(safe-area-inset-*)` throughout.

---

## Environment Variables

**`frontend/.env`**
```
VITE_SUPABASE_URL=https://bwgqgzgrtdppbhthjouf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  (anon key, safe to be client-side)
VITE_R2_WORKER_URL=https://dispocamera-upload.your-subdomain.workers.dev
```

**`backend/worker/wrangler.toml`**
```toml
[vars]
BUCKET_PUBLIC_URL = "https://pub-xxxx.r2.dev"
```
The R2 bucket is bound via `[[r2_buckets]]` with `binding = "BUCKET"` and `bucket_name = "dispocamera-photos"`.

No Worker secrets are required — the Worker only needs the R2 bucket binding which is configured in `wrangler.toml`.

---

## Running Locally

```bash
# Frontend
cd frontend
npm install
npm run dev        # starts on localhost:5173, also exposed on LAN for mobile testing

# Worker (local dev — needs backend/worker/.dev.vars with BUCKET_PUBLIC_URL if overriding)
cd backend/worker
npm install
npx wrangler dev   # starts on localhost:8787
```

For local testing, set `VITE_R2_WORKER_URL=http://localhost:8787` in `frontend/.env`.

The frontend Vite config has `server: { host: true }` so mobile devices on the same WiFi can access it via the LAN IP that Vite prints on startup.

---

## Key Decisions & Gotchas

- **`localStorage` not `sessionStorage`.** Sessions persist across tabs and browser restarts. A guest who closes the tab and reopens the app is sent straight to `/camera` as the same guest with their remaining shots intact.

- **Photo count (10) is set in two places:** `PHOTOS_PER_ROLL` in `Home.tsx` (used when inserting the session row) and `TOTAL_SHOTS` in `Camera.tsx` (used for the UI dot bar). Keep them in sync if you change the limit.

- **R2 CORS is handled by the Worker, not R2 bucket settings.** The Worker returns `Access-Control-Allow-Origin: *` on every response including OPTIONS preflight. Do not try to upload directly from the browser to R2 — it will fail without the Worker proxy.

- **Supabase Realtime** requires the tables to be in the `supabase_realtime` publication. This is done in `schema.sql`. If live updates stop working, check Supabase Dashboard → Database → Publications → `supabase_realtime` and confirm `photos` and `comments` are listed.

- **Comment name lock.** `PhotoCard.tsx` checks `localStorage` for `session_name`. If present, the name field is replaced with a static `<span>`. Guests who open the album directly (no session) can still comment with any name they type.

- **`ctx.filter` on canvas** is well-supported in modern mobile browsers (Chrome, Safari 18+). If a filter does not render on an older device, it gracefully degrades to unfiltered because the filter is always reset to `'none'` after the draw call.

- **`.gitignore`** excludes `frontend/.env` and `backend/worker/.dev.vars`. Never commit credentials.

- **Fonts** are loaded via Google Fonts CDN in `index.html`. Cormorant Garamond (serif) for headings and decorative text. Nunito (sans-serif) for buttons and UI labels.

- **No emojis** anywhere in the UI — all decorative elements are CSS shapes, Unicode punctuation, or text.

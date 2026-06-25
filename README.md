# Hussaini Family Reunion

A reusable biennial family reunion website. Family members upload photos and videos from their own devices, browse a shared photo album, view the event program, and find relevant links and contacts — all organized by reunion year. Built to last across multiple reunions with a per-year theme system.

Built with **Vite + React + TypeScript + Tailwind CSS**, **Cloudflare Workers (Hono)**, **Supabase (PostgreSQL)**, and **Cloudflare R2** for media storage.

---

## Architecture

```
Browser (React SPA)
  └─ fetch → Cloudflare Worker (Hono)
                ├─ Supabase (all DB reads/writes via service key)
                └─ R2 (binary photo/video storage)
```

**The frontend never touches Supabase directly.** All database access goes through the Worker API. The frontend only needs one env var: `VITE_API_URL` pointing at the Worker.

**Videos are write-only on the frontend.** They upload to R2 and are recorded in the DB with `type = 'video'`, but are not rendered (avoids R2 egress costs). A count badge tells the family how many videos are vaulted. Videos are accessible via the R2 dashboard or a future admin feature.

**Upload retry:** `uploadMedia` in `frontend/src/lib/api.ts` automatically retries up to 3 times (1.5s then 3s delay) on failure. After all retries fail, the `PhotoUpload` component shows a manual "Try again" button that re-submits without requiring the user to re-pick files. FormData is rebuilt each attempt to avoid stream-consumed issues.

**Concurrent uploads:** Cloudflare Workers auto-scale; each upload request runs in an isolated V8 isolate. Multiple people uploading simultaneously don't interfere.

---

## Project Structure

```
family-reunion/
├── README.md
├── backend/
│   ├── supabase/
│   │   └── schema.sql              # Run once in Supabase SQL Editor
│   └── worker/
│       ├── src/index.ts            # Hono API — all routes
│       ├── wrangler.toml           # R2 bucket binding + SUPABASE_URL + BUCKET_PUBLIC_URL
│       ├── .dev.vars               # Local secrets (git-ignored: ADMIN_SECRET, SUPABASE_SERVICE_KEY)
│       └── package.json
│
└── frontend/
    ├── public/
    │   └── fonts/
    │       └── pastel-crayon.ttf   # Custom handwritten font used sitewide
    ├── src/
    │   ├── App.tsx                 # React Router v6 route definitions
    │   ├── main.tsx
    │   ├── index.css               # Tailwind + Google Fonts import + @font-face for PastelCrayon
    │   ├── lib/
    │   │   ├── api.ts              # All fetch calls to the Worker (get/post/patch/del helpers)
    │   │   ├── types.ts            # TypeScript interfaces for all DB shapes
    │   │   ├── themes.ts           # THEMES record, getReunionTheme(), pickTitleColors()
    │   │   └── useReunionTheme.ts  # Hook: fetches reunion, returns its ReunionTheme
    │   ├── pages/
    │   │   ├── Home.tsx            # Year selection with playful SVG decorations
    │   │   ├── Reunion.tsx         # 3-pillar hub + Point of Contacts modal trigger
    │   │   ├── Photos.tsx          # Photo grid + drag-and-drop upload
    │   │   ├── Program.tsx         # Event schedule (chronological)
    │   │   ├── Links.tsx           # Links & resources
    │   │   └── admin/
    │   │       ├── AdminLogin.tsx      # Password form (validates against ADMIN_SECRET via Worker)
    │   │       └── AdminDashboard.tsx  # Tabbed CRUD for all 5 tables; uses font-readable
    │   └── components/
    │       ├── YearCard.tsx            # Post-it note style year card; rotating/colored per index
    │       ├── PillarCard.tsx          # Clickable pillar tile; accepts unique `color` prop per pillar
    │       ├── ContactsModal.tsx        # Slide-up modal listing contacts for the year
    │       ├── PhotoGrid.tsx           # Responsive photo grid (photos only; videos show count badge)
    │       ├── PhotoUpload.tsx         # Drag-and-drop + file picker with retry logic
    │       ├── ProgramTimeline.tsx     # Day-grouped event timeline
    │       ├── LinksList.tsx           # Link cards
    │       └── decorations/
    │           ├── HomeSun.tsx         # Absolute-positioned SVG sun (top-right of Home)
    │           └── HomeGarden.tsx      # Full-width SVG flowers/grass/butterflies (Home footer)
    ├── .env.example
    ├── tailwind.config.js
    └── package.json
```

---

## Font System

The site uses **PastelCrayon** (`public/fonts/pastel-crayon.ttf`) as the default body font everywhere, giving a hand-drawn crayon aesthetic. It is set on `body` in `index.css` and cascades to all elements.

```css
/* index.css */
body { font-family: 'PastelCrayon', 'Caveat', cursive; }
.font-readable { font-family: 'Inter', system-ui, sans-serif; }
```

**Rule:** `font-readable` (Inter) is used **only** on admin pages (`AdminDashboard.tsx`, `AdminLogin.tsx`). All public-facing pages — including subtitles, descriptions, and program event text — inherit PastelCrayon. Never add `font-readable` to non-admin components.

Tailwind font utilities available:
- `font-crayon` — PastelCrayon with Caveat fallback (explicit override)
- `font-caveat` — Caveat only
- `font-kalam` — Kalam
- `font-display` — Playfair Display (admin headings only)

---

## Theme System

Themes are defined in `frontend/src/lib/themes.ts` as a `THEMES: Record<string, ReunionTheme>` object. Each reunion year has a `theme_slug` column in the DB that maps to a key in `THEMES`.

### ReunionTheme shape

```typescript
interface ReunionTheme {
  label: string           // Shown in admin dropdown
  pageBg: string          // Page background color
  accentColor: string     // Back button + nav accents
  pillarBg: string        // Pillar card background
  pillarBorder: string    // Pillar card border
  pillarIconBg: string    // Loading skeleton + icon circle bg
  pillarIconColor: string // Fallback icon color
  titlePalette: string[]  // 8 colors — random pool for HOME title only
  coreColors: [string, string, string]  // Fixed per-pillar colors for sub-pages
}
```

### Color rules

- **Home page title** (`"Hussaini Family Reunion"`): calls `pickTitleColors(3, THEMES.default.titlePalette)` on every render — random from the default palette, different on each page load. Uses `useMemo` so colors are stable within a single session.
- **Reunion hub title** (`"Hussaini Family Reunion 2026"`): uses `coreColors[i % 3]` — deterministic, no randomness, always on-theme.
- **Sub-page headers** (Photos, Program, Links): each gets its own fixed `coreColors` index:
  - Photos → `coreColors[0]`
  - Program → `coreColors[1]`
  - Links → `coreColors[2]`
- **Per-pillar color** passes through to sub-pages via the same `coreColors` indices, so the pillar card color matches the sub-page header color.

### Adding a new theme

1. Add a new entry to `THEMES` in `frontend/src/lib/themes.ts` with a unique slug key.
2. Deploy — the new slug appears automatically in the admin dashboard's theme dropdown.
3. Edit the reunion in the admin and select it. Done.

No other code changes needed.

### `useReunionTheme` hook

Sub-pages (`Photos`, `Program`, `Links`) call this hook:

```typescript
const theme = useReunionTheme(year)
```

It fetches the reunion by year, looks up its `theme_slug`, and returns the matching `ReunionTheme`. Starts with `'default'` theme while the fetch is in-flight (no flash/blank state).

---

## Database (Supabase)

Five tables, all accessed via the service key **from the Worker only**. Schema file: `backend/supabase/schema.sql`.

```
reunions (id, year, title, welcome_message, hero_image_url, theme_slug, created_at)
  └─ media (id, reunion_id, url, r2_key, type[photo|video], caption, uploaded_by, created_at)
  └─ program_events (id, reunion_id, title, description, event_date, start_time, end_time, location, sort_order, created_at)
  └─ links (id, reunion_id, title, url, description, sort_order, created_at)
  └─ contacts (id, reunion_id, name, role, phone, email, sort_order)
```

**Note:** `theme_slug` was added after initial schema creation. If running the schema fresh, it is included. If upgrading an existing DB, run:
```sql
alter table reunions add column theme_slug text not null default 'default';
```

**`sort_order`** on `program_events`, `links`, and `contacts` controls display order. Set lower numbers to appear first. Change order without re-inserting rows.

**To add a new reunion year:** insert a row into `reunions` via the admin dashboard — it appears on the home page automatically.

**To reset media between test runs:**
```sql
truncate table media;
```

---

## Worker API Routes

All routes live in `backend/worker/src/index.ts` (Hono). Admin routes require `Authorization: Bearer <ADMIN_SECRET>`.

### Public

| Method | Path | Description |
|---|---|---|
| GET | `/api/reunions` | List all reunion years |
| GET | `/api/reunions/:year` | Single reunion details |
| GET | `/api/reunions/:year/media` | Photos for the year (excludes nothing — frontend filters by type) |
| GET | `/api/reunions/:year/video-count` | Count of stored videos |
| GET | `/api/reunions/:year/program` | Program events ordered by date → start_time → sort_order |
| GET | `/api/reunions/:year/links` | Links ordered by sort_order |
| GET | `/api/reunions/:year/contacts` | Contacts ordered by sort_order |
| POST | `/upload` | Upload photo/video → R2 → insert metadata row in Supabase |

### Admin (Bearer token required)

| Method | Path | Description |
|---|---|---|
| POST | `/admin/check` | Validate admin password |
| POST | `/admin/reunions` | Create reunion |
| PATCH | `/admin/reunions/:id` | Edit reunion (title, welcome_message, hero_image_url, theme_slug) |
| DELETE | `/admin/reunions/:id` | Delete reunion |
| POST | `/admin/reunions/:id/program` | Add program event |
| PATCH | `/admin/program/:id` | Edit program event |
| DELETE | `/admin/program/:id` | Delete program event |
| POST | `/admin/reunions/:id/links` | Add link |
| PATCH | `/admin/links/:id` | Edit link |
| DELETE | `/admin/links/:id` | Delete link |
| POST | `/admin/reunions/:id/contacts` | Add contact |
| PATCH | `/admin/contacts/:id` | Edit contact |
| DELETE | `/admin/contacts/:id` | Delete contact |
| DELETE | `/admin/media/:id` | Delete media — removes from R2 (`r2_key`) then Supabase |

### Upload behavior

- Accepted image types: `image/jpeg`, `image/png`, `image/webp`, `image/heic` (max 20 MB)
- Accepted video types: `video/mp4`, `video/quicktime` (max 500 MB)
- R2 key format: `{year}/{photo|video}/{timestamp}-{8-char-uuid}.{ext}`
- URL stored in DB: `{BUCKET_PUBLIC_URL}/{key}`

---

## Frontend Routes (React Router v6)

| Path | Component | Description |
|---|---|---|
| `/` | `Home.tsx` | Year selection cards (post-it note style) with SVG garden/sun |
| `/:year` | `Reunion.tsx` | 3 pillar cards + contacts modal |
| `/:year/photos` | `Photos.tsx` | Photo grid + drag-and-drop upload |
| `/:year/program` | `Program.tsx` | Day-grouped program timeline |
| `/:year/links` | `Links.tsx` | Link cards |
| `/admin` | `AdminLogin.tsx` | Password form |
| `/admin/dashboard` | `AdminDashboard.tsx` | Tabbed CRUD (Reunions / Program / Links / Contacts / Media) |

---

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Worker URL — `http://localhost:8787` locally, deployed URL in prod |

### Worker (`backend/worker/wrangler.toml` — not secret)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `BUCKET_PUBLIC_URL` | R2 public URL (e.g. `https://pub-xxx.r2.dev`) — set after enabling public access |

### Worker secrets (via `wrangler secret put` in prod, `backend/worker/.dev.vars` locally — never commit)

| Secret | Description |
|---|---|
| `ADMIN_SECRET` | Admin password — arbitrary string you choose |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (Project Settings → API → service_role) |

---

## Running Locally

Two terminals needed: one for the Worker, one for the frontend.

### 1. Database (one-time)

1. Go to [supabase.com](https://supabase.com) → your project → **SQL Editor**
2. Paste contents of `backend/supabase/schema.sql` → **Run**

### 2. Worker

```bash
# backend/worker/.dev.vars  (git-ignored)
ADMIN_SECRET=any-local-password
SUPABASE_SERVICE_KEY=your-service-role-key
```

Fill in `SUPABASE_URL` in `backend/worker/wrangler.toml`.

```bash
cd backend/worker
npm install
npx wrangler dev
# Runs at http://localhost:8787
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local: VITE_API_URL=http://localhost:8787
npm run dev
# Runs at http://localhost:5173
```

### 4. Seed first reunion

Go to `http://localhost:5173/admin`, log in with your `ADMIN_SECRET`, and add a 2026 reunion under the **Reunions** tab.

---

## Deploying to Production

### Worker

```bash
cd backend/worker
npx wrangler login
npx wrangler r2 bucket create family-reunion-media

# Secrets — run once, not on each deploy
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put SUPABASE_SERVICE_KEY

npx wrangler deploy
# Copy the Worker URL from output
```

After deploying, enable R2 public access: **Cloudflare Dashboard → R2 → family-reunion-media → Settings → Public Access → Enable**. Copy the public URL (`https://pub-xxx.r2.dev`) into `wrangler.toml` as `BUCKET_PUBLIC_URL`, then re-deploy.

### Frontend

```bash
cd frontend
# Set VITE_API_URL to the deployed Worker URL in your host's env vars
npm run build
# Deploy dist/ to Vercel, Cloudflare Pages, Netlify, etc.
```

For **Vercel**: connect the repo, set Root Directory to `frontend`, add `VITE_API_URL` as an environment variable.

---

## Adding a Future Reunion Year

No code changes needed for a standard year:
1. Go to `/admin` → **Reunions** tab → add a new row (e.g. year 2028).
2. Select a theme from the dropdown (or add a new theme to `themes.ts` first).
3. The new year card appears on the home page automatically.

---

## Key Design Decisions

- **All DB access through the Worker** so the Supabase service key never reaches the browser. The frontend's only credential is `VITE_API_URL`.
- **Admin auth is server-side only.** The Worker checks `Authorization: Bearer` against `ADMIN_SECRET`. The browser never receives or stores the correct password — it only gets 200 or 401.
- **Videos stored, not served.** Uploaded to R2, recorded in `media` with `type='video'`, but the frontend only renders `type='photo'` rows. Videos are a time capsule for later access via R2 or a future admin feature.
- **Theme slug in DB.** `reunions.theme_slug` maps to a key in `THEMES`. Changing a reunion's visual theme requires only a DB row update — no redeployment.
- **PastelCrayon everywhere (public).** The custom font is set on `body` and cascades. Only admin pages override it with `font-readable` (Inter). Never apply `font-readable` outside admin.
- **Upload retry.** `uploadMedia` retries 3× automatically. `PhotoUpload` shows a "Try again" button on final failure, preserving the file reference so the user doesn't re-pick.
- **`sort_order` columns** on program, links, and contacts control display order without requiring row re-insertion.
- **Never commit** `backend/worker/.dev.vars` or `frontend/.env.local` — both are in `.gitignore`.

# Family Reunion

A reusable biennial family reunion website. Family members upload photos and videos from their own devices, browse a shared photo album, view the event program, and find relevant links and contacts — all organized by reunion year. Built to last across multiple reunions with a per-year theme system.

Built with **Vite + React + TypeScript + Tailwind CSS**, **Cloudflare Workers (Hono)**, **Supabase (PostgreSQL)**, and **Cloudflare R2** for media storage.

---

## Live URLs

| Service | URL |
|---|---|
| Frontend (alias) | https://hussainifamilyreunion.vercel.app |
| Worker API | https://family-reunion-upload.hussainifamily.workers.dev |
| Vercel project | `werenotinlove` scope → `familyreunion` project |

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

## Reunion Lifecycle (status field)

Each reunion has a `status` column: `active` → `locked` → `archived`. This controls the Photos page behavior:

| Status | Photos page behavior |
|---|---|
| `active` | Upload form shown + photo gallery |
| `locked` | Amber "uploads closed" banner + gallery only (no upload form) |
| `archived` | YouTube embed (slideshow) replaces the gallery entirely |

**Typical flow:**
1. During the reunion → set status to `active`. Family uploads photos and videos.
2. After the reunion → set to `locked`. Uploads stop; gallery stays visible while you make the slideshow.
3. Once the YouTube slideshow is ready → set to `archived` and paste the YouTube URL. The gallery is replaced by the embedded video.

Change status via the Admin Dashboard → Reunions tab → edit the row. The YouTube URL field only appears when `archived` is selected.

---

## Media Storage (Dual-Quality System)

To support ~80GB of uploaded photos without R2 egress costs making the gallery slow or expensive:

**For every photo upload, two files are stored in R2:**
1. `{year}/photo/{timestamp}-{uuid}.{ext}` — the original full-quality file (never touched by compression)
2. `{year}/thumb/{timestamp}-{uuid}.jpg` — a browser-generated 1200px JPEG (82% quality)

The thumbnail is generated **in the browser** via Canvas API before the upload begins (`generateThumb` in `PhotoUpload.tsx`). It's sent as a separate `thumb` form field alongside the original.

**Gallery always shows `thumb_url`** — fast loads, low bandwidth.
**Lightbox "Download Original" button links to `url`** — full quality for slideshows.

R2 egress is **free**, so serving thumbnails costs nothing. Storage at $0.015/GB = ~$1.20/month for 80GB.

**Videos** don't have a resized version — `captureVideoThumb` grabs the first video frame via a hidden `<video>` element and Canvas API. That frame JPEG is uploaded as the `thumb` field and stored the same way. With `preload="metadata"`, the browser only downloads enough of the video to seek — not the full clip.

---

## Photo Grid — Lazy Loading

The gallery uses `IntersectionObserver` (not infinite scroll or timers) to load images as the user scrolls:

- **Initial page size**: calculated from screen dimensions — `Math.ceil((1.5 × window.innerHeight) / itemHeight) × columns`. This fills one screenful plus one extra screenful as a buffer.
- **Sentinel element** sits below the last visible item. When it enters the viewport (with `rootMargin: '500px'` — fires 500px early), the next batch is revealed.
- **Videos in the grid**: NO `<video>` element rendered. Only a thumbnail image + play icon overlay. Zero video network traffic until the user taps.
- **Video lightbox**: a 800ms `setTimeout` delays setting the video `src`. If the user closes the lightbox within 800ms (misclick), the timeout is cancelled and no video data is fetched at all. A spinner shows during the wait.

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
    ├── index.html                  # <title>Family Reunion</title>; favicon: /favicon.svg
    ├── public/
    │   ├── favicon.svg             # Crescent moon in amber on cream background
    │   └── fonts/
    │       └── pastel-crayon.ttf   # Custom handwritten font used sitewide
    ├── src/
    │   ├── App.tsx                 # React Router v6 route definitions
    │   ├── main.tsx
    │   ├── index.css               # Tailwind + @font-face for PastelCrayon + font-readable utility
    │   ├── lib/
    │   │   ├── api.ts              # All fetch calls to the Worker (get/post/patch/del helpers + uploadMedia with retry)
    │   │   ├── types.ts            # TypeScript interfaces for all DB shapes (includes start_date on Reunion)
    │   │   ├── themes.ts           # THEMES record, getReunionTheme(), pickTitleColors()
    │   │   └── useReunionTheme.ts  # Hook: fetches reunion, returns its ReunionTheme
    │   ├── pages/
    │   │   ├── Home.tsx            # "Family Reunion" title (2 words, random colors); year selection post-its
    │   │   ├── Reunion.tsx         # "Family Reunion {year}" (3 words); 3-pillar hub + contacts modal
    │   │   ├── Photos.tsx          # Photo grid + drag-and-drop upload
    │   │   ├── Program.tsx         # Day-tabbed event schedule (public view)
    │   │   ├── Links.tsx           # Links & resources
    │   │   └── admin/
    │   │       ├── AdminLogin.tsx      # Password form (validates against ADMIN_SECRET via Worker)
    │   │       └── AdminDashboard.tsx  # Tabbed CRUD for all 5 tables; uses font-readable
    │   └── components/
    │       ├── YearCard.tsx            # Post-it note style; random color + rotation per page load (useMemo stable within session)
    │       ├── PillarCard.tsx          # Clickable pillar tile; accepts unique `color` prop per pillar
    │       ├── ContactsModal.tsx        # Slide-up modal listing contacts for the year
    │       ├── PhotoGrid.tsx           # Responsive photo grid (photos only; videos show count badge)
    │       ├── PhotoUpload.tsx         # Drag-and-drop + file picker with retry logic + failedFiles state
    │       ├── ProgramTimeline.tsx     # Day-tabbed public program view (colored pill tabs, one tab per date)
    │       ├── LinksList.tsx           # Link cards
    │       └── decorations/
    │           ├── HomeSun.tsx         # Absolute-positioned SVG sun (top-right of Home)
    │           └── HomeGarden.tsx      # Full-width SVG flowers/grass/butterflies (Home footer)
    ├── vercel.json                 # SPA rewrite: all paths → /index.html (required for React Router)
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

- **Home page title** (`"Family Reunion"`): calls `pickTitleColors(2, THEMES.default.titlePalette)` on every render — random from the default palette, different on each page load. Uses `useMemo` so colors are stable within a single session.
- **Reunion hub title** (`"Family Reunion 2026"`): uses `coreColors[i % 3]` — deterministic, no randomness, always on-theme.
- **Sub-page headers** (Photos, Program, Links): each gets its own fixed `coreColors` index:
  - Photos → `coreColors[0]`
  - Program/Programs → `coreColors[1]`
  - Links → `coreColors[2]`

### Adding a new theme

1. Add a new entry to `THEMES` in `frontend/src/lib/themes.ts` with a unique slug key.
2. Deploy — the new slug appears automatically in the admin dashboard's theme dropdown.
3. Edit the reunion in the admin and select it. Done.

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
reunions (id, year, title, welcome_message, hero_image_url, theme_slug, start_date, status, youtube_url, created_at)
  └─ media (id, reunion_id, url, thumb_url, r2_key, type[photo|video], caption, uploaded_by, created_at)
  └─ program_events (id, reunion_id, title, description, event_date, start_time, end_time, location, sort_order, created_at)
  └─ links (id, reunion_id, title, url, description, sort_order, created_at)
  └─ contacts (id, reunion_id, name, role, phone, email, sort_order)
```

**Key columns:**
- `reunions.status` — `'active' | 'locked' | 'archived'` (drives Photos page behavior, see Reunion Lifecycle above)
- `reunions.youtube_url` — set when `status = 'archived'`; shown as embedded video on the Photos page
- `media.url` — original full-quality R2 file; used for downloads and slideshows
- `media.thumb_url` — browser-generated 1200px JPEG preview; used for gallery display (fast)

### Migration notes (for existing DBs)

If running fresh, the schema.sql includes everything. If upgrading an existing DB, apply these one at a time:

```sql
-- Added after initial schema
alter table reunions add column theme_slug text not null default 'default';

-- Added to support day pills in admin Program tab
alter table reunions add column start_date date;

-- Added for reunion lifecycle (active → locked → archived)
alter table reunions add column status text not null default 'active'
  check (status in ('active', 'locked', 'archived'));
alter table reunions add column youtube_url text;

-- Added for dual-quality photo storage (gallery shows thumb, downloads use original)
alter table media add column thumb_url text;
```

### `start_date` column

`reunions.start_date` is the **first day (Thursday)** of the reunion weekend. Setting it unlocks:
- Day pills (Thu / Fri / Sat / Sun / Mon) in the admin Program form instead of a raw date picker
- Day filter tabs in the admin Program list so you can work one day at a time
- The selected day persists across saves — add 5 events to Thursday without re-clicking

The admin label says: "Reunion start date (first day — usually Thursday)". Thu–Mon are computed by adding 0–4 days to `start_date`.

### `sort_order` columns

`program_events`, `links`, and `contacts` have a `sort_order` integer. The admin UI lets you drag rows to reorder; on drop, all rows in the list are PATCHed with their new index. The public pages read in `sort_order` order (ascending).

### To add a new reunion year

Insert a row into `reunions` via the admin dashboard — it appears on the home page automatically. No code changes needed.

### To reset media between test runs

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
| GET | `/api/reunions/:year/media` | Photos/videos metadata for the year (frontend filters by type) |
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
| PATCH | `/admin/reunions/:id` | Edit reunion fields (title, welcome_message, hero_image_url, theme_slug, start_date) |
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
| DELETE | `/admin/media/:id` | Delete media — removes from R2 (via `r2_key`) then Supabase |

### Upload behavior

- Accepted image types: `image/jpeg`, `image/png`, `image/webp`, `image/heic` (max 20 MB)
- Accepted video types: `video/mp4`, `video/quicktime` (max 500 MB)
- R2 key format: `{year}/{photo|video}/{timestamp}-{8-char-uuid}.{ext}`
- URL stored in DB: `{BUCKET_PUBLIC_URL}/{key}`
- Media query selects: `id, url, thumb_url, type, caption, uploaded_by` (never `select('*')` to minimize data transfer; `r2_key` and `reunion_id` are server-side only)

---

## Frontend Routes (React Router v6)

| Path | Component | Description |
|---|---|---|
| `/` | `Home.tsx` | Year selection cards (post-it note style) with SVG garden/sun decorations |
| `/:year` | `Reunion.tsx` | 3 pillar cards + contacts modal |
| `/:year/photos` | `Photos.tsx` | Photo grid + drag-and-drop upload |
| `/:year/program` | `Program.tsx` | Day-tabbed program timeline (public) |
| `/:year/links` | `Links.tsx` | Link cards |
| `/admin` | `AdminLogin.tsx` | Password form |
| `/admin/dashboard` | `AdminDashboard.tsx` | Tabbed CRUD (Reunions / Program / Links / Contacts / Media) |

**SPA routing:** `frontend/vercel.json` contains a catch-all rewrite rule (`"source": "/(.*)"` → `"/index.html"`) so React Router handles all paths. Without this, refreshing or direct-linking any sub-path returns 404.

---

## Admin Dashboard Features

The admin dashboard at `/admin/dashboard` has 5 tabs. All use `font-readable` (Inter). All write through the Worker.

### Reunions tab
Create/edit/delete reunion years. Fields: year, title, welcome message, hero image URL, theme, `start_date`. Setting `start_date` enables day pills in the Program tab.

### Program tab
- **Day filter tabs** (colored pills — red/amber/green/blue/purple): appear when the reunion has a `start_date`. Click a day to filter the list to that day only and pre-fill the form.
- **Persisted active day**: the last-clicked day stays selected across saves — add multiple events to the same day without re-clicking the tab.
- **Form day pills**: show Thu–Mon date pills in the add/edit form when `start_date` is set; falls back to a plain date input otherwise.
- **Drag to reorder**: native HTML5 drag-and-drop; `sort_order` is PATCHed for all rows on drop. Reorder is scoped to the filtered day view.
- **General tab**: events with no date assigned appear under the "General" tab.

### Links tab
- Drag to reorder (same pattern as Program tab).
- `sort_order` PATCHed on drop.

### Contacts tab
Standard CRUD table with sort_order field.

### Media tab
- Grid view of all uploaded photos and videos for the selected reunion.
- **Multi-select delete**: click to select, "Select all" / "Clear" buttons, "Delete N" bulk button with confirmation.
- Individual hover trash button still works for single items.
- Videos show a play icon overlay and `preload="metadata"`.

---

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Worker URL — `http://localhost:8787` locally, `https://family-reunion-upload.hussainifamily.workers.dev` in prod |

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

Fill in `SUPABASE_URL` and `BUCKET_PUBLIC_URL` in `backend/worker/wrangler.toml`.

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

Go to `http://localhost:5173/admin`, log in with your `ADMIN_SECRET`, and add a 2026 reunion under the **Reunions** tab. Set a `start_date` (e.g. `2026-07-02` for Thursday July 2) to unlock day pills in the Program tab.

---

## Deploying to Production

### Worker

```bash
cd backend/worker
npx wrangler login

# One-time: create the R2 bucket
npx wrangler r2 bucket create family-reunion-media

# One-time: set secrets (never in wrangler.toml)
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put SUPABASE_SERVICE_KEY

npx wrangler deploy
# Copy the Worker URL from output
```

After deploying, enable R2 public access: **Cloudflare Dashboard → R2 → family-reunion-media → Settings → Public Access → Enable**. Copy the public URL (`https://pub-xxx.r2.dev`) into `wrangler.toml` as `BUCKET_PUBLIC_URL`, then re-deploy.

### Frontend (Vercel)

Always deploy from the `frontend/` directory. Scope is `werenotinlove`, project is `familyreunion`.

```bash
cd frontend
npx vercel --prod --yes --scope werenotinlove
```

After every deploy, re-point the alias (Vercel creates a new URL each time):

```bash
npx vercel alias set <new-deployment-url>.vercel.app hussainifamilyreunion.vercel.app --scope werenotinlove
```

**IMPORTANT:** Always `cd frontend` before running `vercel` commands. Running from `backend/worker` will deploy the wrong directory.

If the site shows a Vercel login wall after deploy: **Vercel Dashboard → Settings → Deployment Protection → set to None**.

---

## Adding a Future Reunion Year

No code changes needed for a standard year:
1. Go to `/admin` → **Reunions** tab → add a new row (e.g. year 2028).
2. Set a `start_date` (the Thursday of that reunion weekend).
3. Select a theme from the dropdown (or add a new theme to `themes.ts` first).
4. The new year card appears on the home page automatically.

---

## Key Design Decisions

- **All DB access through the Worker** so the Supabase service key never reaches the browser. The frontend's only credential is `VITE_API_URL`.
- **Admin auth is server-side only.** The Worker checks `Authorization: Bearer` against `ADMIN_SECRET`. The browser never receives or stores the correct password — it only gets 200 or 401. The password is held in `sessionStorage` (clears when tab closes).
- **Reunion lifecycle (active → locked → archived).** `reunions.status` drives Photos page behavior. Flip to `locked` after the reunion to stop uploads; flip to `archived` + add `youtube_url` when the slideshow is ready. Only a DB row update — no redeployment.
- **Dual-quality media storage.** Every photo upload stores two R2 files: the original and a browser-generated 1200px JPEG thumbnail. Gallery shows thumbnails (fast); lightbox "Download Original" links to the full-quality file. Browser Canvas generates the thumbnail client-side before upload — no server-side processing needed.
- **Videos stored, not streamed.** Uploaded to R2, recorded in `media` with `type='video'`, but the frontend only renders `type='photo'` rows in the gallery. Videos get a canvas-captured frame as a thumbnail. A count badge shows how many are vaulted. Videos are a time capsule for later access via R2 or a future admin feature.
- **No `<video>` in the gallery.** Video items show only a thumbnail + play icon. Clicking opens the lightbox, which then waits 800ms before setting `src` — this cancels cleanly on misclicks without triggering any video data fetch.
- **IntersectionObserver pagination.** Photo grid starts with ~1.5 screen-heights of items, then pre-loads the next batch 500px before the sentinel enters view. No fixed page size — adapts to device dimensions.
- **Theme slug in DB.** `reunions.theme_slug` maps to a key in `THEMES`. Changing a reunion's visual theme requires only a DB row update — no redeployment.
- **`start_date` drives day UX.** Once set on a reunion, it powers day pills in the Program form and day filter tabs in the admin list. If not set, plain date inputs appear instead — nothing breaks.
- **PastelCrayon everywhere (public).** The custom font is set on `body` and cascades. Only admin pages override it with `font-readable` (Inter). Never apply `font-readable` outside admin.
- **Upload retry.** `uploadMedia` retries 3× automatically. `PhotoUpload` shows a "Try again" button on final failure, preserving the file reference so the user doesn't re-pick.
- **Drag-to-reorder.** Native HTML5 drag-and-drop (no library) for program events and links. `sort_order` is PATCHed for all affected rows on drop. Preview reorder is computed via `useMemo` while dragging.
- **Post-it color randomization.** `YearCard` picks a random color from 8 themes using `useMemo` — stable within a session, different on each page load.
- **`sort_order` columns** on program, links, and contacts control display order without requiring row re-insertion.
- **Never commit** `backend/worker/.dev.vars` or `frontend/.env.local` — both are in `.gitignore`.

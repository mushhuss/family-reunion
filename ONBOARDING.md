# Onboarding Guide

Welcome to the family reunion codebase. This doc gets you from zero to fully productive as fast as possible. The [README](./README.md) is the technical reference — come back to it for API route tables, DB schema details, and env var lists. Start here first.

---

## What this app does

A recurring family website. Every two years a new reunion gets added. Family members upload their own photos and videos from personal devices, browse the shared gallery, and check the event schedule and links. After the reunion ends, the admin locks uploads and eventually replaces the gallery with a YouTube slideshow.

One codebase serves every reunion year — you add a new year in the admin dashboard, not in the code.

---

## The architecture in one picture

```
Your browser
    │
    ├─ reads/uploads → Cloudflare Worker (the only backend)
    │                       ├─ Supabase Postgres (metadata, text, URLs)
    │                       └─ Cloudflare R2 (the actual photo/video files)
    │
    └─ never talks to Supabase directly
```

**Why a Worker in the middle?** The Supabase service key (which can read and write everything) must never reach the browser. The Worker holds that key. The frontend only knows the Worker's URL.

**Why R2 for files?** R2 egress (serving files to browsers) is free. With ~80 GB of family photos that matters.

---

## Prerequisites

You need these installed before anything else:

| Tool | Why |
|---|---|
| Node.js 20+ | Runs the frontend dev server and wrangler |
| Git | Obviously |
| A Cloudflare account | Hosts the Worker and R2 bucket |
| A Supabase account | Hosts the Postgres database |

You do **not** need Docker, a local database, or any other infrastructure. Everything is managed services.

---

## First-time setup (do this once)

### 1. Clone and install

```bash
git clone https://github.com/mushhuss/family-reunion.git
cd family-reunion

# Install frontend deps
cd frontend && npm install && cd ..

# Install worker deps
cd backend/worker && npm install && cd ../..
```

### 2. Set up the database

1. Go to [supabase.com](https://supabase.com) → your project → **SQL Editor**
2. Paste the contents of `backend/supabase/schema.sql` and click **Run**

That's it — Supabase handles the rest.

### 3. Configure the Worker

Create `backend/worker/.dev.vars` (this file is git-ignored — never commit it):

```
ADMIN_SECRET=any-password-you-want-locally
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
```

Get the service role key from: **Supabase Dashboard → Project Settings → API → service_role**

The non-secret values (`SUPABASE_URL`, `BUCKET_PUBLIC_URL`) are already in `backend/worker/wrangler.toml`.

### 4. Configure the frontend

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `.env.local`:
```
VITE_API_URL=http://localhost:8787
```

### 5. Run everything

You need two terminals:

**Terminal 1 — Worker:**
```bash
cd backend/worker
npx wrangler dev
# Runs at http://localhost:8787
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Runs at http://localhost:5173
```

### 6. Seed your first reunion

Go to `http://localhost:5173/admin` → log in with the `ADMIN_SECRET` you set in `.dev.vars` → **Reunions tab** → add a row:

| Field | Example value |
|---|---|
| Year | 2026 |
| Title | Hussaini Family Reunion 2026 |
| Start date | 2026-07-02 (the Thursday of that weekend) |
| Theme | Warm Amber (default) |
| Status | active |

Hit save. Go to `http://localhost:5173` — you should see a year card.

---

## Project tour

Here's what actually matters and where to find it:

```
family-reunion/
├── .github/workflows/ci.yml   ← CI pipeline (read this to understand deploys)
├── README.md                  ← Technical reference (API routes, DB schema, env vars)
├── ONBOARDING.md              ← You are here
│
├── backend/
│   ├── supabase/schema.sql    ← Run once to set up the database
│   └── worker/src/
│       ├── index.ts           ← Every API route lives here (Hono)
│       └── utils.ts           ← Pure functions extracted for testing
│
└── frontend/src/
    ├── App.tsx                ← All client-side routes defined here
    ├── lib/
    │   ├── api.ts             ← Every fetch call to the Worker
    │   ├── types.ts           ← TypeScript interfaces for DB rows
    │   ├── themes.ts          ← Color themes (add new themes here)
    │   ├── useReunionTheme.ts ← Hook used by Photos/Program/Links pages
    │   └── utils.ts           ← Pure helpers (e.g. extractYoutubeId)
    ├── pages/
    │   ├── Home.tsx           ← Year picker
    │   ├── Reunion.tsx        ← Hub page (3 pillars + contacts modal)
    │   ├── Photos.tsx         ← Gallery + upload (status-aware)
    │   ├── Program.tsx        ← Event schedule
    │   ├── Links.tsx          ← Links & resources
    │   └── admin/
    │       ├── AdminLogin.tsx     ← Password form
    │       └── AdminDashboard.tsx ← All admin CRUD (biggest file in the project)
    └── components/
        ├── PhotoGrid.tsx      ← Masonry gallery with lazy loading
        ├── PhotoUpload.tsx    ← Drag-and-drop uploader with progress
        ├── ProgramTimeline.tsx← Day-tabbed schedule view
        ├── ContactsModal.tsx  ← Contacts slide-up
        ├── LinksList.tsx      ← Links card grid
        ├── YearCard.tsx       ← Post-it note year picker card
        ├── PillarCard.tsx     ← Navigation tile (Photos / Programs / Links)
        └── decorations/       ← SVG art for the home page (sun, garden)
```

### Files you'll edit most often

- **Adding a feature to the gallery or upload?** → `PhotoGrid.tsx`, `PhotoUpload.tsx`, `Photos.tsx`
- **Changing how the program schedule looks?** → `ProgramTimeline.tsx`, `Program.tsx`
- **Adding an API route?** → `backend/worker/src/index.ts` + `frontend/src/lib/api.ts`
- **Adding a new color theme?** → `frontend/src/lib/themes.ts` only (see below)
- **Changing the DB schema?** → `backend/supabase/schema.sql` + `frontend/src/lib/types.ts` + the affected Worker routes

---

## Key concepts

### The reunion lifecycle

Every reunion row has a `status` field. It moves in one direction:

```
active  →  locked  →  archived
```

| Status | What the Photos page shows |
|---|---|
| `active` | Upload form + gallery — normal operation during the event |
| `locked` | Gallery only, amber "uploads closed" banner — post-event |
| `archived` | YouTube embed (the finished slideshow) — long-term |

Change it in the admin dashboard → Reunions tab → edit the row.

### Photos: two files per upload

Every photo upload stores two things in R2:
- **Original** — full quality, never compressed, used for downloads and making the slideshow
- **Thumbnail** — 1200px JPEG generated in the browser via Canvas before upload, used for gallery display

The browser generates the thumbnail — no server-side image processing. This keeps the Worker simple and costs nothing extra.

Videos work similarly: a frame is captured from the video client-side and stored as a thumbnail. The video itself is stored but never auto-played in the gallery (R2 bandwidth concerns).

### The theme system

Each reunion has a `theme_slug` DB column. To add a new theme:
1. Open `frontend/src/lib/themes.ts`
2. Add a new entry to the `THEMES` object with a unique key
3. Deploy — it appears automatically in the admin dropdown

No other changes needed anywhere.

### The `start_date` field

Setting `start_date` on a reunion (the Thursday of that weekend) unlocks day pills (Thu / Fri / Sat / Sun / Mon) in the admin program form. Without it you get a plain date picker. Public program view always shows colored day tabs regardless.

---

## Making changes

### The development loop

1. Make your change
2. `npx tsc --noEmit` in `frontend/` — catches type errors before you commit
3. `npm test` in `frontend/` and `backend/worker/` — runs the unit tests
4. Test in the browser manually (golden path + the edge case you changed)
5. Push — CI runs automatically

### Running tests

```bash
# Frontend (18 tests — utils, themes)
cd frontend && npm test

# Worker (16 tests — auth, MIME validation, size limits)
cd backend/worker && npm test
```

### What's tested and why

| Test file | What it covers |
|---|---|
| `frontend/src/lib/utils.test.ts` | `extractYoutubeId` — multiple URL formats that are easy to silently break |
| `frontend/src/lib/themes.test.ts` | `pickTitleColors` unique-color contract; `getReunionTheme` fallback behavior |
| `backend/worker/src/utils.test.ts` | Admin auth (`isAdmin`), MIME type allowlist, per-type size limits, extension mapping |

We don't test React components (too much DOM mocking for too little value) or the Canvas thumbnail logic (can't run in Node).

---

## Deploying

### Frontend (automatic)

Push to `main` → Vercel detects it → builds from the `frontend/` directory → deploys. Nothing to do.

If you need to deploy manually:
```bash
cd frontend
npx vercel --prod --yes --scope werenotinlove
# Then re-alias:
npx vercel alias set <new-url>.vercel.app hussainifamilyreunion.vercel.app --scope werenotinlove
```

### Worker (automatic via CI)

Push to `main` → GitHub Actions runs type-check + all 34 tests → if they pass, deploys the Worker to Cloudflare.

Manual deploy:
```bash
cd backend/worker
npx wrangler deploy
```

### The CI pipeline (`.github/workflows/ci.yml`)

Every push and PR runs:
1. Install frontend deps → type-check → run frontend tests
2. Install worker deps → run worker tests
3. If on `main` and tests pass → deploy Worker

The frontend deploy is not in CI — Vercel's GitHub integration handles it in parallel.

---

## Common admin tasks

### Add a new reunion year

Admin dashboard → Reunions tab → fill in year, title, start date, theme → save. Appears on the home page immediately.

### Lock uploads after the reunion ends

Admin dashboard → Reunions tab → edit the row → set Status to `locked` → save.

### Publish the slideshow

1. Upload the finished video to YouTube
2. Admin dashboard → Reunions tab → edit the row → set Status to `archived` → paste the YouTube URL → save
3. The Photos page now shows the embedded video instead of the gallery

### Delete photos (e.g. after making the slideshow)

Admin dashboard → Media tab → select reunion → multi-select photos → Delete. This removes from R2 and the database.

### Reorder program events or links

Admin dashboard → Program or Links tab → drag rows to reorder → the order saves automatically on drop.

---

## Secrets and security

| Secret | Where it lives | Never in |
|---|---|---|
| `ADMIN_SECRET` | `wrangler secret put` (prod) / `.dev.vars` (local) | `wrangler.toml`, git |
| `SUPABASE_SERVICE_KEY` | `wrangler secret put` (prod) / `.dev.vars` (local) | `wrangler.toml`, git, frontend |
| `CLOUDFLARE_API_TOKEN` | GitHub repo secret (for CI Worker deploy) | code, git |

The frontend has zero secrets. Its only env var is `VITE_API_URL` which is just a URL.

---

## Troubleshooting

**Site shows a Vercel login wall after deploy**
Vercel Dashboard → Settings → Deployment Protection → set to None.

**Worker deploys but API calls return 401**
The `ADMIN_SECRET` wrangler secret may not be set in production. Run `npx wrangler secret put ADMIN_SECRET` from `backend/worker/`.

**Photos not loading / upload fails**
Check that `BUCKET_PUBLIC_URL` in `wrangler.toml` matches the public R2 URL and that public access is enabled on the bucket (Cloudflare Dashboard → R2 → family-reunion-media → Settings → Public Access).

**`vite: command not found` on Vercel**
The Vercel project's Root Directory is not set to `frontend`. Fix: Vercel Dashboard → familyreunion project → Settings → General → Root Directory → set to `frontend`.

**Type errors on `tsc --noEmit` locally but not in CI**
CI uses a clean install (`npm ci`). You may have a stale local package. Run `rm -rf node_modules && npm install` in `frontend/`.

**Day pills not showing in the admin Program tab**
The reunion's `start_date` column is null. Edit the reunion in the admin and set it to the first day (Thursday) of that reunion weekend.

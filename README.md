# Hussaini Family Reunion

A reusable biennial family reunion website. Family members upload photos and videos from their own devices, browse a shared photo album, view the event program, and find relevant links and contacts — all organized by reunion year.

Built with **Vite + React + TypeScript**, **Cloudflare Workers (Hono)**, **Supabase (PostgreSQL)**, and **Cloudflare R2** for media storage.

---

## How It Works

```
Browser (React)
  └─ fetch → Cloudflare Worker (Hono)
                ├─ Supabase (all database reads/writes — service key stays secret)
                └─ R2 (photo/video storage)
```

The frontend never touches Supabase directly. All data access goes through the Worker API. Only one env var is needed in the frontend: the Worker URL.

**Videos are write-only** — they upload to R2 and are recorded in the database, but are not streamed back to the browser (avoids R2 egress costs). They serve as a time capsule accessible via the R2 dashboard.

---

## Project Structure

```
family-reunion/
├── frontend/                   # Vite + React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── App.tsx             # React Router routes
│   │   ├── main.tsx
│   │   ├── index.css           # Tailwind + Google Fonts
│   │   ├── lib/
│   │   │   ├── api.ts          # All fetch calls to the Worker
│   │   │   └── types.ts        # TypeScript interfaces
│   │   ├── pages/
│   │   │   ├── Home.tsx        # Year selection
│   │   │   ├── Reunion.tsx     # 3-pillar hub + Point of Contacts modal
│   │   │   ├── Photos.tsx      # Photo grid + upload
│   │   │   ├── Program.tsx     # Event schedule
│   │   │   ├── Links.tsx       # Relevant links
│   │   │   └── admin/
│   │   │       ├── AdminLogin.tsx
│   │   │       └── AdminDashboard.tsx   # Tabbed CRUD for all content
│   │   └── components/
│   │       ├── YearCard.tsx
│   │       ├── PillarCard.tsx
│   │       ├── ContactsModal.tsx
│   │       ├── PhotoGrid.tsx
│   │       ├── PhotoUpload.tsx
│   │       ├── ProgramTimeline.tsx
│   │       └── LinksList.tsx
│   ├── .env.example
│   └── package.json
│
└── backend/
    ├── supabase/
    │   └── schema.sql          # Run once in Supabase SQL Editor
    └── worker/
        ├── src/index.ts        # Hono API: all routes
        ├── wrangler.toml       # R2 bucket binding + SUPABASE_URL
        └── package.json
```

---

## Routes

### Frontend (React Router)

| Path | Page |
|---|---|
| `/` | Home — year selection cards |
| `/:year` | Reunion hub — 3 pillars + POC modal |
| `/:year/photos` | Photo album + upload |
| `/:year/program` | Event schedule |
| `/:year/links` | Links & resources |
| `/admin` | Admin login |
| `/admin/dashboard` | CRUD for reunions, program, links, contacts |

### Worker API (Hono)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/reunions` | — | List all reunion years |
| GET | `/api/reunions/:year` | — | Single reunion details |
| GET | `/api/reunions/:year/media` | — | Photos for the year |
| GET | `/api/reunions/:year/video-count` | — | Count of stored videos |
| GET | `/api/reunions/:year/program` | — | Program events |
| GET | `/api/reunions/:year/links` | — | Links |
| GET | `/api/reunions/:year/contacts` | — | Point of contacts |
| POST | `/upload` | — | Upload photo/video → R2 + Supabase |
| POST | `/admin/check` | Bearer token | Validate admin password |
| POST | `/admin/reunions` | Bearer token | Create reunion |
| DELETE | `/admin/reunions/:id` | Bearer token | Delete reunion |
| POST | `/admin/reunions/:id/program` | Bearer token | Add event |
| DELETE | `/admin/program/:id` | Bearer token | Delete event |
| POST | `/admin/reunions/:id/links` | Bearer token | Add link |
| DELETE | `/admin/links/:id` | Bearer token | Delete link |
| POST | `/admin/reunions/:id/contacts` | Bearer token | Add contact |
| DELETE | `/admin/contacts/:id` | Bearer token | Delete contact |

Admin routes require `Authorization: Bearer <ADMIN_SECRET>` — the same password you set as the wrangler secret.

---

## Database (Supabase)

Five tables, all accessed via the service key from the Worker:

```sql
reunions       (id, year, title, welcome_message, hero_image_url)
media          (id, reunion_id, url, r2_key, type[photo|video], caption, uploaded_by)
program_events (id, reunion_id, title, description, event_date, start_time, end_time, location, sort_order)
links          (id, reunion_id, title, url, description, sort_order)
contacts       (id, reunion_id, name, role, phone, email, sort_order)
```

**To add a new reunion year:** add a row to `reunions` via the admin dashboard — it automatically appears on the home page.

**To reset media between test runs:**
```sql
truncate table media;
```

---

## Running Locally

You need two terminals: one for the Worker, one for the frontend.

### 1. Set up the database (one-time)

1. Go to [supabase.com](https://supabase.com) → open your project
2. Left sidebar → **SQL Editor** → paste the contents of `backend/supabase/schema.sql` → **Run**

### 2. Start the Worker locally

Create a secrets file for local development:

```bash
# backend/worker/.dev.vars  (git-ignored — never commit this)
ADMIN_SECRET=any-password-for-local-dev
SUPABASE_SERVICE_KEY=your-service-key-from-supabase
```

Get your Supabase service key: **Project Settings → API → service_role** (secret).

Also fill in your Supabase URL in `backend/worker/wrangler.toml`:
```toml
SUPABASE_URL = "https://your-project.supabase.co"
```

Then start the Worker:
```bash
cd backend/worker
npm install
npx wrangler dev
# Worker is now running at http://localhost:8787
```

### 3. Start the frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_API_URL=http://localhost:8787
```

Then:
```bash
npm run dev
# App is now running at http://localhost:5173
```

### 4. Seed your first reunion

Go to `http://localhost:5173/admin`, enter the `ADMIN_SECRET` you set in `.dev.vars`, and add a 2026 reunion under the **Reunions** tab.

---

## Deploying to Production

### Worker

```bash
cd backend/worker

# Log in to Cloudflare
npx wrangler login

# Create the R2 bucket
npx wrangler r2 bucket create family-reunion-media

# Set secrets (only needed once, not re-run on each deploy)
npx wrangler secret put ADMIN_SECRET         # your chosen admin password
npx wrangler secret put SUPABASE_SERVICE_KEY # from Supabase: Project Settings → API → service_role

# Deploy
npx wrangler deploy
# Copy the Worker URL from the output (e.g. https://family-reunion-upload.xxx.workers.dev)
```

After the bucket is created, enable public access in the Cloudflare dashboard:
**R2 → family-reunion-media → Settings → Public Access → Enable**

Then copy the public URL (`https://pub-xxx.r2.dev`) into `wrangler.toml`:
```toml
BUCKET_PUBLIC_URL = "https://pub-xxx.r2.dev"
```

Re-deploy after updating `wrangler.toml`:
```bash
npx wrangler deploy
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Set VITE_API_URL to your deployed Worker URL
npm run build
# Deploy the dist/ folder to Vercel, Netlify, Cloudflare Pages, etc.
```

For Vercel: connect the repo, set `Root Directory` to `frontend`, and add `VITE_API_URL` as an environment variable.

---

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Where to get it |
|---|---|
| `VITE_API_URL` | Your Worker URL (local: `http://localhost:8787`, prod: from `wrangler deploy` output) |

### Worker

Set in `wrangler.toml` (not secret):

| Variable | Value |
|---|---|
| `BUCKET_PUBLIC_URL` | R2 public URL (`https://pub-xxx.r2.dev`) |
| `SUPABASE_URL` | Your Supabase project URL |

Set via `wrangler secret put` (never in `wrangler.toml`):

| Secret | Where to get it |
|---|---|
| `ADMIN_SECRET` | Pick any strong password — this is your admin login |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → `service_role` |

For local dev, put secrets in `backend/worker/.dev.vars` (already in `.gitignore`).

---

## Adding a Future Reunion

No code changes needed. Go to `/admin`, log in, and add a new row in the **Reunions** tab with the next year (e.g. 2028). The home page will show the new year card automatically.

---

## Key Decisions

- **All DB access through the Worker** so the Supabase service key never reaches the browser.
- **Videos stored but not displayed** to avoid ongoing R2 read costs. A count badge shows the family how many videos are in the vault.
- **Admin password validated server-side** — the Worker checks the `Authorization` header against `ADMIN_SECRET`. The browser never knows the correct password, it just gets a 200 or 401 back.
- **`sort_order` column on program, links, and contacts** — set this to control display order without needing to re-insert rows.
- **Never commit `.dev.vars` or `.env.local`** — both are listed in `.gitignore`.

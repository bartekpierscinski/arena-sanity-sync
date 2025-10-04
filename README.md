# Are.na → Sanity Sync

Sync your [Are.na](https://www.are.na) channels into [Sanity](https://www.sanity.io) as structured content.
Built as a framework-agnostic **core sync engine** + thin adapters.
Currently ships with a **Nuxt adapter** (server route + cron-friendly endpoint).

---

## ✨ What it is

- **Core sync engine** (`@arena-sanity/core`)
  Handles paging through Are.na, writing to Sanity, image upload policy, retries, drift correction.

- **Nuxt adapter** (`adapter-nuxt`)
  Provides an `/api/sync` endpoint you can run locally or deploy to Vercel/Render/Node server.

- **Schemas** (`/schemas/arena`)
  Ready-to-paste Sanity schema files (`arenaBlock`, `arenaSyncConfig`) so synced docs just appear in Studio.

---

## 📐 Architecture

Are.na API ───▶ @arena-sanity/core ───▶ Sanity dataset
▲
│
Nuxt adapter (/api/sync)

- Core is framework-agnostic
- Adapter wires runtime config + HTTP endpoint
- Sync is idempotent and safe:
  - compares `arenaUpdatedAt` + fingerprint
  - only overwrites **ARENA_OWNED** fields
  - respects `syncPolicy` + locks

---

## 🚀 Quickstart (Nuxt)

Clone the repo and install:

```bash
git clone https://github.com/YOU/arena-sanity-sync.git
cd arena-sanity-sync
pnpm install

Set up the Nuxt example adapter:

cd packages/adapter-nuxt
cp .env.example .env
# Fill in SANITY_* and ARENA_* values

Run dev server:

pnpm dev

Trigger a sync:

curl -X POST http://localhost:3000/api/sync \
  -H "Authorization: Bearer $SYNC_CRON_SECRET"

Open Sanity Studio and you’ll see fresh areNaBlock documents.

⸻

⚙️ Env vars

.env.example shows all required vars:

SANITY_PROJECT_ID=your-id
SANITY_DATASET=production
SANITY_API_TOKEN=your-write-token
ARENA_ACCESS_TOKEN=your-arena-token
ARENA_CHANNELS=your-channel-slug-1,your-channel-slug-2
SYNC_CRON_SECRET=optional-shared-secret

	•	ARENA_CHANNELS = default channel slugs to sync
	•	SYNC_CRON_SECRET = protect your endpoint (Authorization: Bearer ...)

⸻

🏗️ Schemas (copy-paste)

Paste these into your Sanity schema folder:
	•	schemas/arena/arenaBlock.jsx
	•	schemas/arena/arenaSyncConfig.js

These declare the areNaBlock doc type, fields owned by sync, and config doc.

⸻

🌀 Curl example

Manual trigger (with secret):

curl -X POST https://your-deployment.com/api/sync \
  -H "Authorization: Bearer $SYNC_CRON_SECRET"


⸻

🖼️ Image upload modes & costs

Configure via options.imageUpload:
	•	"off" → never upload images, just store external URLs
	•	"auto" (default) → upload only if signature changed & no main image
	•	"on" → always upload new image versions

Use "off" if you want zero asset cost (only remote URLs).

⸻

⏱️ Limits & timeouts
	•	perPage = 100 (Are.na API page size)
	•	Default timeouts:
	•	Are.na requests: 15s
	•	Sanity requests: 20s
	•	Image fetch: 15s
	•	Retries: 3 with linear backoff
	•	Drift correction: removes orphaned slugs, marks doc isOrphan
	•	Time budget: timeBudgetMs (default = unlimited)
Useful for serverless functions (e.g. Vercel 60s)

⸻

📂 Monorepo structure

packages/
  core/           # sync engine (framework-agnostic)
  adapter-nuxt/   # Nuxt server route adapter
schemas/
  arena/          # Sanity schema files


⸻

📝 License

MIT

⸻

🛠️ Roadmap
	•	Next.js adapter
	•	Cloudflare Worker adapter
	•	CLI for bare-metal cron
	•	Sanity Studio tool UI

---

👉 This README is ready to drop into your repo root.
Do you want me to also make a **diagram SVG/ASCII** (for GitHub README) so the architecture is visual, not just text?
```

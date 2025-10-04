# Arena ↔ Sanity Sync

Sync Are.na channels into Sanity.

This monorepo provides:

- 🛠️ **@arena-sanity/core** – framework-agnostic sync engine (Are.na → Sanity).
- ⚡ **@arena-sanity/adapter-nuxt** – ready-made Nuxt 3 API route for triggering syncs.
- 🎛️ **sanity-plugin-arena-sync** – Sanity Studio dashboard plugin (view status, configure channels, trigger syncs manually).

---

## 📦 Packages

### [@arena-sanity/core](./packages/core)

The low-level sync engine.

- Syncs Are.na blocks into Sanity documents.
- Handles retries, image uploads, drift-fix, idempotency.
- Use directly in Node, serverless functions, or custom cron jobs.

👉 [Read docs](./packages/core/README.md)

---

### [@arena-sanity/adapter-nuxt](./packages/adapter-nuxt)

Nuxt 3 example adapter.

- Exposes a `POST /api/sync` endpoint.
- Reads config from `.env` and `runtimeConfig`.
- Useful for CRON jobs or manual triggers in Nuxt apps.

👉 [Read docs](./packages/adapter-nuxt/README.md)

---

### [sanity-plugin-arena-sync](./packages/sanity-plugin-arena-sync)

Sanity Studio plugin.

- Adds an “Are.na Sync” dashboard tool.
- Displays configured channel slugs, last sync status, and logs.
- Allows manual sync trigger from Studio.

👉 [Read docs](./packages/sanity-plugin-arena-sync/README.md)

---

## ⚡ Quickstart (Nuxt adapter)

1. Install dependencies

```bash
pnpm add @arena-sanity/core @sanity/client
```

2. Add a Nuxt API route (`server/api/sync.post.ts`)

```ts
import { syncArenaChannels } from "@arena-sanity/core";
import { createArenaClient } from "../utils/arenaClient";
import { createClient } from "@sanity/client";

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig();

  const sanity = createClient({
    projectId: cfg.sanityProjectId,
    dataset: cfg.sanityDataset,
    token: cfg.sanityApiToken,
    apiVersion: "2024-05-15",
  });

  const arena = createArenaClient({ accessToken: cfg.arenaAccessToken });

  const result = await syncArenaChannels({
    arena,
    sanity,
    options: { channels: process.env.ARENA_CHANNELS?.split(",") ?? [] },
  });

  return result;
});
```

3. Configure `.env`

```
SANITY_PROJECT_ID=xxx
SANITY_DATASET=production
SANITY_API_TOKEN=...
ARENA_ACCESS_TOKEN=...
ARENA_CHANNELS=my-channel-1,my-channel-2
SYNC_CRON_SECRET=optional-secret
```

4. Run locally

```bash
pnpm -F @arena-sanity/adapter-nuxt dev
```

---

## 🗂 Example Sanity schemas

This repository includes ready-to-use Sanity schema examples in `schemas/arena/` that you can copy into your Sanity Studio and use as a starting point.

Files in `schemas/arena/` include (examples):

- `arenaBlock.jsx` — example document schema for Are.na blocks.
- `arenaChannelSettings.js` — channel settings schema.
- `arenaSyncConfig.js` — sync configuration example.

How to use

1. Copy the `schemas/arena/` files into your Studio's `schemas/` folder (or import the individual files you need).
2. Import and include the schema(s) in your Studio's schema registry (for example, in `schema.js` or `schemaTypes.js`):

```js
import areNaBlock from "./arena/arenaBlock";
export const schemaTypes = [
  /* ...other schemas..., */
  areNaBlock,
];
```

3. Adjust field types or asset handling to match your dataset and CORS/asset settings as needed.

Note: the example schemas demonstrate the arena* fields the sync uses. The sync engine only updates fields prefixed with `arena*`and respects`lockAll`/`lockImage` flags when present.

---

🌐 cURL example

Trigger sync via the Nuxt API route:

```bash
curl -X POST "https://your-app.com/api/sync" \
  -H "Authorization: Bearer $SYNC_CRON_SECRET"
```

---

## 🖼️ Image upload modes

| Mode | Behavior                                        |
| ---- | ----------------------------------------------- |
| off  | Never uploads images (only stores Are.na URLs). |
| auto | Uploads if missing in Sanity (default).         |
| on   | Always uploads if changed.                      |

Uploading into Sanity counts toward asset storage costs.

---

## ⏱ Limits & timeouts

- Are.na API: ~60 requests/minute — syncs large channels page-by-page.
- Time budget (`timeBudgetMs`): the sync can stop early if it runs too long.
- Retries & exponential backoff are built in.

---

## 🏗 Monorepo structure

```
arena-sanity-sync/
├─ packages/
│  ├─ core/                  # @arena-sanity/core
│  ├─ adapter-nuxt/          # @arena-sanity/adapter-nuxt
│  └─ sanity-plugin-arena-sync/ # Sanity Studio plugin
├─ schemas/arena/            # Example Sanity schemas
├─ tsconfig.base.json
├─ pnpm-workspace.yaml
└─ README.md                 # (this file)
```

---

📄 License

MIT © Bartek Pierściński

# Arena-Sanity Sync

Sync Are.na channels into Sanity.

This monorepo provides:

- **arena-sanity-core** - framework-agnostic sync engine (Are.na to Sanity)
- **arena-sanity-adapter-nuxt** - Nuxt 3 API route for triggering syncs
- **sanity-plugin-arena-sync** - Sanity Studio dashboard plugin

---

## Packages

### [arena-sanity-core](./packages/core)

The low-level sync engine.

- Syncs Are.na blocks into Sanity documents
- Handles retries, image uploads, drift-fix, idempotency
- Use directly in Node, serverless functions, or custom cron jobs

[Read docs](./packages/core/README.md)

---

### [arena-sanity-adapter-nuxt](./packages/adapter-nuxt)

Nuxt 3 adapter.

- Exposes a `POST /api/sync` endpoint
- Reads config from `.env` and `runtimeConfig`
- Useful for cron jobs or manual triggers

[Read docs](./packages/adapter-nuxt/README.md)

---

### [sanity-plugin-arena-sync](./packages/sanity-plugin-arena-sync)

Sanity Studio plugin.

- Adds an "Are.na Sync" dashboard tool
- Displays configured channel slugs, last sync status, and logs
- Allows manual sync trigger from Studio

[Read docs](./packages/sanity-plugin-arena-sync/README.md)

---

## Quickstart

### 1. Install dependencies

```bash
npm install arena-sanity-core @sanity/client are.na
```

### 2. Create a sync endpoint

Example Nuxt API route (`server/api/sync.post.ts`):

```ts
import {
  syncArenaChannels,
  createSanityClient,
  createArenaClient,
} from "arena-sanity-core";

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig();

  const sanity = createSanityClient({
    projectId: cfg.sanityProjectId,
    dataset: cfg.sanityDataset,
    token: cfg.sanityApiToken,
  });

  const arena = createArenaClient({
    accessToken: cfg.arenaAccessToken,
  });

  const result = await syncArenaChannels({
    arena,
    sanity,
    options: {
      channels: process.env.ARENA_CHANNELS?.split(",") ?? [],
    },
  });

  return result;
});
```

### 3. Configure environment variables

```
SANITY_PROJECT_ID=xxx
SANITY_DATASET=production
SANITY_API_TOKEN=...
ARENA_ACCESS_TOKEN=...
ARENA_CHANNELS=my-channel-1,my-channel-2
SYNC_CRON_SECRET=optional-secret
```

### 4. Trigger a sync

```bash
curl -X POST "https://your-app.com/api/sync" \
  -H "Authorization: Bearer $SYNC_CRON_SECRET"
```

---

## Sanity schemas

Example schemas are provided in `schemas/arena/`:

- `arenaBlock.jsx` - document schema for Are.na blocks
- `arenaChannelSettings.js` - channel settings schema
- `arenaSyncConfig.js` - sync configuration

Copy these into your Studio's `schemas/` folder and import them:

```js
import areNaBlock from "./arena/arenaBlock";

export const schemaTypes = [areNaBlock];
```

The sync engine only updates fields prefixed with `arena*` and respects `lockAll`/`lockImage` flags.

---

## Image upload modes

| Mode | Behavior |
| ---- | -------- |
| off  | Never uploads images (stores Are.na URLs only) |
| auto | Uploads if missing in Sanity (default) |
| on   | Always uploads if changed |

Uploading to Sanity counts toward asset storage costs.

---

## Rate limits

- Are.na API: ~60 requests/minute (retries and backoff are built in)
- Use `timeBudgetMs` option to set a soft timeout for long syncs

---

## Monorepo structure

```
arena-sanity-sync/
├── packages/
│   ├── core/                     # arena-sanity-core
│   ├── adapter-nuxt/             # arena-sanity-adapter-nuxt
│   └── sanity-plugin-arena-sync/ # Sanity Studio plugin
├── schemas/arena/                # Example Sanity schemas
├── examples/                     # Example configurations
└── README.md
```

---

## License

MIT - Bartek Pierscinski

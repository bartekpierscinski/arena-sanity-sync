# arena-sanity-adapter-nuxt

Nuxt 3 adapter for [arena-sanity-core](../core). Provides a ready-made API route for triggering Are.na to Sanity syncs.

---

## Features

- **POST /api/sync** endpoint for triggering syncs
- Reads configuration from `runtimeConfig` and environment variables
- Optional authorization via `SYNC_CRON_SECRET`
- Works with cron jobs, webhooks, or manual triggers

---

## Installation

This package is part of the arena-sanity-sync monorepo. To use it in your own Nuxt project, copy the relevant files or use it as a reference implementation.

Required dependencies:

```bash
npm install arena-sanity-core @sanity/client are.na
```

---

## Configuration

### Environment variables

```
SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
SANITY_API_TOKEN=your-token
ARENA_ACCESS_TOKEN=your-arena-token
ARENA_CHANNELS=channel-1,channel-2
SYNC_CRON_SECRET=optional-auth-secret
```

### Nuxt runtime config

In `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    sanityProjectId: process.env.SANITY_PROJECT_ID,
    sanityDataset: process.env.SANITY_DATASET,
    sanityApiToken: process.env.SANITY_API_TOKEN,
    arenaAccessToken: process.env.ARENA_ACCESS_TOKEN,
  },
});
```

---

## API route

The adapter exposes `POST /api/sync`:

```ts
// server/api/sync.post.ts
import {
  syncArenaChannels,
  createSanityClient,
  createArenaClient,
} from "arena-sanity-core";

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig();

  // Optional auth check
  const secret = cfg.SYNC_CRON_SECRET || process.env.SYNC_CRON_SECRET;
  const auth = getHeader(event, "authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    setResponseStatus(event, 401);
    return { success: false, message: "Unauthorized" };
  }

  const sanity = createSanityClient({
    projectId: cfg.sanityProjectId,
    dataset: cfg.sanityDataset,
    token: cfg.sanityApiToken,
  });

  const arena = createArenaClient({
    accessToken: cfg.arenaAccessToken,
  });

  // Allow channels from request body or env
  const body = await readBody<{ channels?: string[] }>(event).catch(() => ({}));
  const envChannels = (process.env.ARENA_CHANNELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const channels = body?.channels?.length ? body.channels : envChannels;

  if (!channels.length) {
    setResponseStatus(event, 400);
    return { success: false, message: "No channels provided" };
  }

  const result = await syncArenaChannels({
    arena,
    sanity,
    options: {
      channels,
      imageUpload: "auto",
      timeBudgetMs: 260_000,
      onLog: (e) => console.log(JSON.stringify(e)),
    },
  });

  setResponseStatus(event, result.success ? 200 : 500);
  return result;
});
```

---

## Usage

### Trigger via cURL

```bash
curl -X POST "https://your-app.com/api/sync" \
  -H "Authorization: Bearer $SYNC_CRON_SECRET"
```

### Trigger with specific channels

```bash
curl -X POST "https://your-app.com/api/sync" \
  -H "Authorization: Bearer $SYNC_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"channels": ["my-channel"]}'
```

### Cron job (Vercel example)

In `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## Development

```bash
pnpm -F arena-sanity-adapter-nuxt dev
```

---

## Related packages

- [arena-sanity-core](../core) - sync engine
- [sanity-plugin-arena-sync](../sanity-plugin-arena-sync) - Studio dashboard plugin

---

## License

MIT - Bartek Pierscinski

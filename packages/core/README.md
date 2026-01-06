# arena-sanity-core

Framework-agnostic sync engine for keeping [Are.na](https://are.na) channels in sync with your [Sanity](https://www.sanity.io) dataset.

This package provides the core sync logic only. Use it to build your own adapter (Nuxt, Next.js, Cloudflare Workers, CLI, etc.).

---

## Features

- **Sync Are.na to Sanity** - mirrors Are.na blocks as Sanity documents
- **Idempotent updates** - only patches changed blocks (uses fingerprint + `updated_at`)
- **Image upload modes** - control whether to import images or store remote URLs
- **Timeouts and retries** - robust against network hiccups
- **Framework-agnostic** - works in Node, serverless, or custom cron jobs
- **Field protection** - only updates `arena*` fields; respects `lockAll` and `lockImage` flags

---

## Installation

```bash
npm install arena-sanity-core
```

### Peer dependencies

- `@sanity/client` (required) - install with `npm install @sanity/client`
- `are.na` (optional) - only needed if using `createArenaClient` helper or CLI

---

## CLI

Run syncs from the command line without writing code:

```bash
npx arena-sanity-core --channels my-channel
```

### Options

```
-c, --channels <slugs>    Comma-separated channel slugs (required)
-i, --image-upload <mode> Image upload mode: off, auto, on (default: auto)
-d, --dry-run             Print what would happen without making changes
-v, --verbose             Show detailed progress logs
-h, --help                Show help
--version                 Show version
```

### Environment variables

```bash
export ARENA_ACCESS_TOKEN=your-arena-token
export SANITY_PROJECT_ID=your-project-id
export SANITY_DATASET=production
export SANITY_TOKEN=your-sanity-token
```

### Examples

```bash
# Sync a single channel
npx arena-sanity-core -c my-channel

# Sync multiple channels without images
npx arena-sanity-core -c channel-1,channel-2 -i off

# Verbose output
npx arena-sanity-core -c my-channel -v
```

---

## Deployment strategies

Sync duration depends on channel size and image upload settings. Choose your deployment strategy accordingly.

### Timeout reference

| Platform | Timeout |
| -------: | :------ |
| Vercel Hobby | 10s |
| Vercel Pro | 60s |
| Netlify Functions | 10-26s |
| Cloudflare Workers | 30s |
| VPS / Long-running server | No limit |
| Local CLI | No limit |

### Recommendations

**Small channels or metadata-only sync:**
- Use serverless (Vercel, Netlify, Cloudflare)
- Set `imageUpload: "off"` to stay within timeout limits

**Large channels or full image sync:**
- Use CLI locally or on a VPS
- Or run initial sync locally, then use serverless for incremental updates

**Incremental syncs:**
- First sync is the longest (all blocks are new)
- Subsequent syncs skip unchanged blocks via fingerprinting
- Serverless works well for incremental syncs on small-to-medium channels

### Local development workflow

Run the initial sync with images on your local machine:

```bash
npx arena-sanity-core -c my-channel -i on -v
```

Then configure serverless for incremental syncs with `imageUpload: "off"`.

---

## Programmatic usage

### Create clients

```js
import {
  syncArenaChannels,
  createSanityClient,
  createArenaClient,
} from "arena-sanity-core";

const sanity = createSanityClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
});

// Requires `are.na` package: npm install are.na
const arena = createArenaClient({
  accessToken: process.env.ARENA_ACCESS_TOKEN,
});
```

### Run a sync

```js
const result = await syncArenaChannels({
  arena,
  sanity,
  options: {
    channels: ["my-channel-slug", "another-channel"],
    imageUpload: "auto",
    timeBudgetMs: 250_000,
    onLog: (e) => console.log(e),
  },
});

console.log(result);
```

### Example result

```json
{
  "success": true,
  "syncRunId": "1696438307123-abc123",
  "updatedOrCreated": 42,
  "channels": [
    { "channel": "my-channel-slug", "created": 10, "updated": 30 },
    { "channel": "another-channel", "created": 2, "updated": 0 }
  ]
}
```

---

## Options

| Option | Default | Description |
| -----: | :------ | :---------- |
| channels | required | Array of Are.na channel slugs to sync |
| perPage | 100 | Page size for Are.na API calls |
| arenaTimeoutMs | 15000 | Timeout per Are.na API request (ms) |
| imageTimeoutMs | 15000 | Timeout per image fetch (ms) |
| sanityTimeoutMs | 20000 | Timeout for Sanity queries (ms) |
| retries | 3 | Retry count for Are.na fetches |
| backoffMs | 600 | Backoff multiplier between retries (ms) |
| logProgressEvery | 25 | Log heartbeat every N blocks |
| heartbeatMs | 10000 | Channel heartbeat log interval (ms) |
| imageUpload | "auto" | `"off"` (never), `"auto"` (if missing), `"on"` (always) |
| imageConcurrency | 3 | Parallel image uploads |
| normalizeChannels | true | Normalize channel titles and `_key` values |
| driftFix | true | Remove channel refs if block disappears from Are.na |
| timeBudgetMs | Infinity | Soft stop after N ms |
| onLog | noop | Callback for structured logs |

---

## Return type

`syncArenaChannels()` resolves to a `SyncResult`:

```ts
interface SyncResult {
  success: boolean;
  overallSuccess: boolean;
  message: string;
  updatedOrCreated: number;
  syncRunId: string;
  channels: Array<{ channel: string } & ChannelResult>;
  statusMessages: string[];
}

interface ChannelResult {
  success: boolean;
  created: number;
  updated: number;
  skippedUnchanged: number;
  orphanedUpdated: number;
  errors: number;
  message: string;
  blocksProcessed: number;
}
```

---

## Example: Cloudflare Worker

```js
import {
  syncArenaChannels,
  createSanityClient,
  createArenaClient,
} from "arena-sanity-core";

export default {
  async scheduled(event, env, ctx) {
    const sanity = createSanityClient({
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET,
      token: env.SANITY_API_TOKEN,
    });

    const arena = createArenaClient({
      accessToken: env.ARENA_ACCESS_TOKEN,
    });

    ctx.waitUntil(
      syncArenaChannels({
        arena,
        sanity,
        options: { channels: env.ARENA_CHANNELS.split(",") },
      })
    );
  },
};
```

---

## Custom Arena client

If you prefer not to use `createArenaClient`, implement the `ArenaClient` interface:

```ts
interface ArenaClient {
  getChannelPage(
    slug: string,
    params: { page: number; per: number }
  ): Promise<{ contents: any[]; total_pages?: number; title?: string }>;

  getChannelInfo?(slug: string): Promise<{ title?: string }>;
}
```

---

## Limits and notes

- **Are.na API rate limits**: ~60 requests/minute. Retries and backoff are built in.
- **Images**: Uploading to Sanity consumes storage. Use `imageUpload: "off"` to disable.
- **Field protection**: Only updates `arena*` fields and `channels`. Respects `lockAll` and `lockImage`.

---

## Related packages

- [arena-sanity-adapter-nuxt](../adapter-nuxt) - Nuxt 3 API route
- [sanity-plugin-arena-sync](../sanity-plugin-arena-sync) - Studio dashboard plugin

---

## License

MIT - Bartek Pierscinski

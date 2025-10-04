# arena-sanity-core

The framework-agnostic sync engine for keeping [Are.na](https://are.na) channels in sync with your [Sanity](https://www.sanity.io) dataset.

This package provides the core sync logic only — no Nuxt integration or Studio UI. Use it to build your own adapter (Next.js, Cloudflare Workers, CLI, etc.).

---

## Features

- 🔗 Sync Are.na → Sanity: Keep Are.na blocks mirrored as Sanity documents.
- 🔑 Idempotent updates: Only patches changed blocks (uses fingerprint & updated_at).
- 🖼️ Image upload modes: Control whether to import images to Sanity or store remote URLs.
- ⚡ Timeouts & retries: Robust against network hiccups.
- 🧩 Framework-agnostic: Works in Node, serverless environments, or custom cron jobs.
- 🛡️ Field protection: Only updates `arena*` fields and `channels`. Respects `lockAll` and `lockImage` if present.

## Installation

Install from npm:

```bash
npm install arena-sanity-core
```

## Usage

1. Create clients

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

const arena = createArenaClient({
  accessToken: process.env.ARENA_ACCESS_TOKEN,
});
```

2. Run a sync

```js
const result = await syncArenaChannels({
  arena,
  sanity,
  options: {
    channels: ["my-channel-slug", "another-channel"],
    imageUpload: "auto", // "auto" | "on" | "off"
    timeBudgetMs: 250_000,
    onLog: (e) => console.log(e),
  },
});

console.log(result);
```

Example result (shape):

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

## Options

|            Option | Default  | Description                                                                               |
| ----------------: | :------- | :---------------------------------------------------------------------------------------- |
|          channels | required | Array of Are.na channel slugs to sync.                                                    |
|           perPage | 100      | Page size for Are.na API calls.                                                           |
|    arenaTimeoutMs | 15000    | Timeout per Are.na API request (ms).                                                      |
|    imageTimeoutMs | 15000    | Timeout per image fetch (ms).                                                             |
|   sanityTimeoutMs | 20000    | Timeout for Sanity queries (ms).                                                          |
|           retries | 3        | Retry count for Are.na fetches.                                                           |
|         backoffMs | 600      | Backoff multiplier between retries (ms).                                                  |
|  logProgressEvery | 25       | Log heartbeat every N blocks.                                                             |
|       heartbeatMs | 10000    | Channel heartbeat log interval (ms).                                                      |
|       imageUpload | "auto"   | Image handling: "off" (never upload), "auto" (only if missing), "on" (always if changed). |
|  imageConcurrency | 3        | Parallel image uploads.                                                                   |
| normalizeChannels | true     | Normalize channel titles + \_keys.                                                        |
|          driftFix | true     | Remove channel slugs from docs if a block disappears.                                     |
|      timeBudgetMs | ∞        | Soft stop after N ms.                                                                     |
|             onLog | noop     | Callback for structured logs.                                                             |

## Returned result

`syncArenaChannels()` resolves to a `SyncResult` object (TypeScript shape):

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

## Example: Cloudflare Worker

```js
import {
  syncArenaChannels,
  createSanityClient,
  createArenaClient,
} from "arena-sanity-core;

export default {
  async scheduled(event, env, ctx) {
    const sanity = createSanityClient({
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET,
      token: env.SANITY_API_TOKEN,
    });

    const arena = createArenaClient({ accessToken: env.ARENA_ACCESS_TOKEN });

    ctx.waitUntil(
      syncArenaChannels({
        arena,
        sanity,
        options: { channels: env.ARENA_CHANNELS.split(",") },
      }),
    );
  },
};
```

## Limits & notes

- Are.na API rate limits: ~60 requests/minute. Retries and backoff are built in.
- Images: Uploading into Sanity consumes storage/bandwidth — disable with `imageUpload: "off"` if needed.
- Field protection: Only updates `arena*` fields and `channels`. Respects `lockAll` and `lockImage` if present.

## Related

- `arena-sanity-adapter-nuxt` — drop-in Nuxt 3 API route.
- `sanity-plugin-arena-sync` — Studio dashboard plugin for config and manual sync trigger.

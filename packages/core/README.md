# arena-sanity-core

Sync [Are.na](https://are.na) channels to your [Sanity](https://www.sanity.io) dataset.

---

## Quickstart

### 1. Install

```bash
npm install arena-sanity-core @sanity/client are.na
```

### 2. Add the schema to your Sanity project

Copy the schema file from this repository into your Sanity project:

```bash
# From the arena-sanity-sync repo
cp schemas/arena/arenaBlock.jsx your-sanity-project/schemas/
```

Or download directly:
- [`arenaBlock.jsx`](https://github.com/bartekpierscinski/arena-sanity-sync/blob/main/schemas/arena/arenaBlock.jsx)

Then import it in your `schemas/index.js`:

```js
import areNaBlock from './arenaBlock'

export const schemaTypes = [areNaBlock]
```

### 3. Set environment variables

```bash
export ARENA_ACCESS_TOKEN=your-arena-token
export SANITY_PROJECT_ID=your-project-id
export SANITY_DATASET=production
export SANITY_TOKEN=your-sanity-write-token
```

### 4. Run your first sync

```bash
npx arena-sanity-core -c your-channel-slug -v
```

Check your Sanity Studio. Your Are.na blocks are now documents.

---

## CLI

```
npx arena-sanity-core [options]

Options:
  -c, --channels <slugs>    Comma-separated channel slugs (required)
  -i, --image-upload <mode> off, auto, on (default: auto)
  -d, --dry-run             Show what would happen without syncing
  -v, --verbose             Show detailed logs
  -h, --help                Show help
  --version                 Show version
```

Examples:

```bash
# Sync multiple channels
npx arena-sanity-core -c channel-1,channel-2

# Sync without uploading images (faster, uses Are.na URLs)
npx arena-sanity-core -c my-channel -i off
```

---

## Deployment strategies

| Approach | Best for |
|----------|----------|
| CLI + cron/CI | Large channels, full image sync |
| Serverless endpoint | Small channels, incremental syncs |
| Local only | Development, one-time imports |

### Timeout limits

| Platform | Limit |
|----------|-------|
| Vercel Hobby | 10s |
| Vercel Pro | 60s |
| Netlify | 10-26s |
| Cloudflare Workers | 30s |
| VPS / CLI | No limit |

### Recommended workflow

1. Run initial sync locally with images: `npx arena-sanity-core -c my-channel -i on -v`
2. Set up serverless for incremental syncs with `imageUpload: "off"`
3. Incremental syncs skip unchanged blocks automatically

---

## Programmatic usage

```js
import {
  syncArenaChannels,
  createSanityClient,
  createArenaClient,
} from "arena-sanity-core";

const sanity = createSanityClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_TOKEN,
});

const arena = createArenaClient({
  accessToken: process.env.ARENA_ACCESS_TOKEN,
});

const result = await syncArenaChannels({
  arena,
  sanity,
  options: {
    channels: ["my-channel"],
    imageUpload: "auto",
  },
});

console.log(result);
// { success: true, updatedOrCreated: 42, ... }
```

### Nuxt API route

```ts
// server/api/sync.post.ts
import { syncArenaChannels, createSanityClient, createArenaClient } from "arena-sanity-core";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();

  const sanity = createSanityClient({
    projectId: config.sanityProjectId,
    dataset: config.sanityDataset,
    token: config.sanityToken,
  });

  const arena = createArenaClient({
    accessToken: config.arenaAccessToken,
  });

  return await syncArenaChannels({
    arena,
    sanity,
    options: { channels: config.arenaChannels.split(",") },
  });
});
```

---

## Options

| Option | Default | Description |
|--------|---------|-------------|
| channels | required | Array of channel slugs |
| imageUpload | "auto" | "off" / "auto" / "on" |
| timeBudgetMs | Infinity | Stop after N ms |
| perPage | 100 | Are.na page size |
| retries | 3 | Retry count |
| driftFix | true | Remove orphaned channel refs |
| onLog | noop | Log callback |

---

## Schema

The sync creates documents of type `areNaBlock`. The full schema includes:

- Basic fields (title, image, description)
- Are.na metadata (blockType, sourceUrl, timestamps)
- Multi-channel support
- Field locking (`lockAll`, `lockImage`)
- Raw Are.na data preservation

Schema files:
- [`schemas/arena/arenaBlock.jsx`](https://github.com/bartekpierscinski/arena-sanity-sync/blob/main/schemas/arena/arenaBlock.jsx) - main block schema
- [`schemas/arena/arenaSyncConfig.js`](https://github.com/bartekpierscinski/arena-sanity-sync/blob/main/schemas/arena/arenaSyncConfig.js) - optional config document for Studio plugin

---

## Related packages

- [sanity-plugin-arena-sync](https://www.npmjs.com/package/sanity-plugin-arena-sync) - Studio dashboard

---

## License

MIT

# sanity-plugin-arena-sync

Sanity Studio v3 plugin for managing Are.na channel sync — browse, search, and toggle channels directly from Studio.

---

## Features

- **Interactive channel picker** — browse all your Are.na channels in a searchable, filterable grid
- **Toggle sync per channel** — click a card to add/remove it from `arenaSyncConfig.channelSlugs` (auto-saves)
- **Search & filter** — client-side search by title/slug, filter tabs (All / Selected / Public / Private)
- **Bulk actions** — Select All / Deselect All within the current filter
- **Last sync status** — shows timestamp and result summary at the top
- **Manual sync trigger** — POST to your backend endpoint from the UI
- **Real-time updates** — listens for `arenaSyncConfig` changes via Sanity listener

This plugin is part of the [arena-sanity-sync](https://github.com/bartekpierscinski/arena-sanity-sync) ecosystem.

---

## Installation

```bash
npm install sanity-plugin-arena-sync
```

Add it to your `sanity.config.ts`:

```ts
import { defineConfig } from "sanity";
import { arenaSyncPlugin } from "sanity-plugin-arena-sync";

export default defineConfig({
  // ...
  plugins: [arenaSyncPlugin()],
});
```

---

## Configuration

### Are.na access token (required)

The plugin needs your Are.na API token to fetch your channels. Provide it in one of two ways:

**Option A: Environment variable (recommended)**

Add to your Studio `.env`:

```bash
SANITY_STUDIO_ARENA_ACCESS_TOKEN=your_arena_token
```

Vite auto-exposes `SANITY_STUDIO_*` vars via `import.meta.env`.

**Option B: Plugin config**

```ts
plugins: [
  arenaSyncPlugin({ arenaAccessToken: "your_arena_token" }),
],
```

### Sync endpoint (optional)

To enable the "Trigger Sync" button, configure the URL the plugin will POST to.

**Via Sanity document:** set the `syncEndpoint` field on the `arenaSyncConfig` document.

**Via environment variable:**

```bash
SANITY_STUDIO_SYNC_ENDPOINT=https://your-app.xyz/api/sync
```

### Sanity schema

The plugin reads/writes the `arenaSyncConfig` singleton document (ID: `arenaSyncConfig`). A ready-to-use schema is available at:

```
schemas/arena/arenaSyncConfig.js
```

Copy it to your Studio's schemas folder and register it:

```js
import arenaSyncConfig from "./arenaSyncConfig";

export const schemaTypes = [arenaSyncConfig /* , ...other types */];
```

The document stores:

| Field | Type | Description |
|-------|------|-------------|
| `channelSlugs` | `string[]` | Channel slugs selected for sync (managed by the plugin) |
| `syncEndpoint` | `url` | POST target for "Trigger Sync" button |
| `lastSyncDate` | `datetime` | Set by CLI/adapter after sync completes |
| `lastSyncStatus` | `text` | Summary of last sync result |

---

## How it works

1. On mount, the plugin calls `GET /v3/me` with your token to resolve your Are.na user
2. Paginates `GET /v3/users/{slug}/contents?type=Channel` to load all channels
3. Fetches `arenaSyncConfig` from Sanity to determine which channels are selected
4. Toggling a channel card immediately patches `channelSlugs` in the config doc (optimistic UI)
5. If the config doc doesn't exist yet, it's created on first toggle

---

## Sync endpoint requirements

Your endpoint should:

1. Accept POST requests
2. Call `syncArenaChannels()` from `arena-sanity-core`
3. Return JSON with `success: boolean` (or `overallSuccess: boolean`)

Example implementation: see [arena-sanity-adapter-nuxt](../adapter-nuxt).

---

## Development

This plugin uses [@sanity/plugin-kit](https://github.com/sanity-io/plugin-kit).

```bash
# Build
pnpm build

# Lint
pnpm lint

# Watch mode
pnpm watch
```

A test studio is available at `studio/` in the monorepo root:

```bash
pnpm -C studio dev
```

---

## Related packages

- [arena-sanity-core](../core) - sync engine & CLI
- [arena-sanity-adapter-nuxt](../adapter-nuxt) - Nuxt 3 API route

---

## License

MIT - Bartek Pierscinski

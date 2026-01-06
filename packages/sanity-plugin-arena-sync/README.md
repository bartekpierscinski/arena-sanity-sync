# sanity-plugin-arena-sync

Sanity Studio v3 plugin for the Are.na sync dashboard.

---

## Features

- Shows configured Are.na channel slugs
- Displays last sync status and timestamp
- Manual sync trigger button (calls your backend endpoint)
- Auto-refreshes when configuration changes

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

The plugin does not perform syncs directly. It POSTs to an HTTP endpoint you host (Nuxt, Next.js, Cloudflare Worker, etc.) that runs [arena-sanity-core](../core).

### Option 1: Configuration document (recommended)

Create a document with ID `arenaSyncConfig` containing:

- `channelSlugs` - array of Are.na channel slugs to sync
- `syncEndpoint` - URL to POST to when triggering sync

A ready-to-use schema is available at:

```
schemas/arena/arenaSyncConfig.js
```

Copy it to your Studio's `schemas/` folder and import it:

```js
import arenaSyncConfig from "./arena/arenaSyncConfig";

export const schemaTypes = [arenaSyncConfig];
```

### Option 2: Environment variable

Set in your Studio environment:

```bash
SANITY_STUDIO_SYNC_ENDPOINT=https://your-app.xyz/api/sync
```

The plugin will POST to this URL when an editor clicks "Trigger Full Sync Now".

---

## Sync endpoint requirements

Your endpoint should:

1. Accept POST requests
2. Call `syncArenaChannels()` from `arena-sanity-core`
3. Return a JSON response with `success: boolean`
4. Optionally check authorization (e.g., `Authorization: Bearer <secret>`)

Example implementation: see [arena-sanity-adapter-nuxt](../adapter-nuxt).

---

## Testing the endpoint

```bash
curl -X POST "$SANITY_STUDIO_SYNC_ENDPOINT" \
  -H "Authorization: Bearer $SYNC_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Development

This plugin uses [@sanity/plugin-kit](https://github.com/sanity-io/plugin-kit).

```bash
# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint
```

See [Testing a plugin in Sanity Studio](https://github.com/sanity-io/plugin-kit#testing-a-plugin-in-sanity-studio) for local development instructions.

---

## Related packages

- [arena-sanity-core](../core) - sync engine
- [arena-sanity-adapter-nuxt](../adapter-nuxt) - Nuxt 3 API route

---

## License

MIT - Bartek Pierscinski

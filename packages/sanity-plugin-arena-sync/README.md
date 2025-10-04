# sanity-plugin-arena-sync

> Sanity Studio v3 plugin — Are.na sync dashboard

Adds an Are.na Sync dashboard to your Studio:

- Shows which Are.na channels are being synced.
- Displays last sync status and time.
- Lets editors trigger a manual sync (the plugin calls your backend endpoint).
- Auto-refreshes when configuration changes.

---

## Installation

Install the plugin in your Studio project:

```bash
npm install sanity-plugin-arena-sync
```

Then add it to your `sanity.config.ts` (or `.js`):

```ts
import {defineConfig} from 'sanity'
import {arenaSyncPlugin} from 'sanity-plugin-arena-sync'

export default defineConfig({
  // ...
  plugins: [arenaSyncPlugin()],
})
```

---

## Setting up the sync endpoint

The plugin does not perform the sync itself. Instead it POSTs to an HTTP endpoint you host (Nuxt/Next/Node/Serverless). That endpoint should call `@arena-sanity/core` (for example `syncArenaChannels`) to run the sync.

Guidance:

- Example: a Nuxt `POST /api/sync` endpoint that calls `syncArenaChannels`.
- Protect the endpoint with a secret (e.g. `Authorization: Bearer <SYNC_CRON_SECRET>`).
- Ensure the endpoint is reachable from your Studio (configure CORS if needed).

You can configure the endpoint in two ways (priority: config document → env var):

1. Add a configuration document in Sanity with the ID `arenaSyncConfig` (preferred).
2. Or set the `SANITY_STUDIO_SYNC_ENDPOINT` environment variable in your Studio host.

---

## Configuration document

The plugin looks for a document with ID `arenaSyncConfig`. That document can contain channel slugs, the optional `syncEndpoint`, and stores the last sync status.

A ready-to-use schema for this config document is available at the following link:

```
schemas/arena/arenaSyncConfig.js
```

[View arenaSyncConfig.js](https://github.com/bartekpierscinski/arena-sanity-sync/blob/main/schemas/arena/arenaSyncConfig.js)

Copy the file `arenaSyncConfig.js` into your Studio's `schemas/` folder, then import it into your schema registry.


How to import it (example):

```js
import arenaSyncConfig from '../schemas/arena/arenaSyncConfig'

export const schemaTypes = [
  // ...other schemas
  arenaSyncConfig,
]
```

Note: the example schemas in `schemas/arena/` show the `arena*` fields the sync engine uses. The sync only updates fields prefixed with `arena*` and respects `lockAll` / `lockImage` flags when present.

---

## Environment variables (Studio)

If you prefer not to use the config document for the endpoint, set this env var in your Studio environment:

```bash
SANITY_STUDIO_SYNC_ENDPOINT=https://your-app.xyz/api/sync
```

The plugin will POST to this URL when an editor clicks **Trigger Full Sync Now** in the dashboard.

---

## Quick test (cURL)

Use this to test your sync endpoint before wiring it into the plugin:

```bash
curl -X POST "$SANITY_STUDIO_SYNC_ENDPOINT" \
	-H "Authorization: Bearer $SYNC_CRON_SECRET" \
	-H "Content-Type: application/json" \
	-d '{"test":true}'
```

The plugin expects a `200`/`2xx` response for success — adapt your endpoint to return an informative JSON body.

---

## Develop & test

This plugin uses `@sanity/plugin-kit` with default build & watch scripts. To develop locally with hot-reload, follow the Sanity docs on testing plugins in Studio (run your Studio in dev mode and include the plugin source).

See Sanity's official documentation: "Testing a plugin in Sanity Studio" for step-by-step instructions.

---

## License

MIT © Bartek Pierściński

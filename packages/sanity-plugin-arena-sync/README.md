# sanity-plugin-arena-sync

Sanity Studio v3 plugin for managing Are.na channel sync — channel picker, block browser, structure builder, and bundled schemas.

---

## Features

- **Channel picker** — browse all your Are.na channels in a searchable, filterable grid; toggle sync per channel
- **Block browser** — search, filter, and preview synced blocks without leaving the plugin tool
- **Structure builder** — organized desk hierarchy: All Blocks, By Type, By Channel, Orphans, Sync Config, Channel Settings
- **Bundled schemas** — `areNaBlock`, `arenaSyncConfig`, `arenaChannelSettings` auto-registered by the plugin
- **Extensible schemas** — disable auto-registration and spread/extend with your own fields
- **Real-time updates** — listens for `arenaSyncConfig` changes via Sanity listener
- **Manual sync trigger** — POST to your backend endpoint from the UI

This plugin is part of the [arena-sanity-sync](https://github.com/bartekpierscinski/arena-sanity-sync) ecosystem.

---

## Installation

```bash
npm install sanity-plugin-arena-sync
```

---

## Quick start (zero config)

```ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { arenaSyncPlugin, arenaStructure } from "sanity-plugin-arena-sync";

export default defineConfig({
  // ...
  plugins: [
    structureTool({ structure: arenaStructure }),
    arenaSyncPlugin(),
  ],
});
```

This auto-registers all three schemas and gives you the full desk structure. Done.

---

## Configuration

### Are.na access token (required for channel picker)

The plugin needs your Are.na API token to fetch your channels. Provide it in one of two ways:

**Option A: Environment variable (recommended)**

```bash
SANITY_STUDIO_ARENA_ACCESS_TOKEN=your_arena_token
```

Vite auto-exposes `SANITY_STUDIO_*` vars via `import.meta.env`.

**Option B: Plugin config**

```ts
arenaSyncPlugin({ arenaAccessToken: "your_arena_token" });
```

### Sync endpoint (optional)

To enable the "Trigger Sync" button, configure the URL the plugin will POST to.

**Via Sanity document:** set the `syncEndpoint` field on the `arenaSyncConfig` document.

**Via environment variable:**

```bash
SANITY_STUDIO_SYNC_ENDPOINT=https://your-app.xyz/api/sync
```

---

## Schemas

The plugin bundles three document schemas:

| Schema | Document type | Description |
|--------|--------------|-------------|
| `arenaBlockSchema` | `areNaBlock` | Are.na block with all sync fields |
| `arenaSyncConfigSchema` | `arenaSyncConfig` | Singleton managing channel slugs, sync status, endpoint |
| `arenaChannelSettingsSchema` | `arenaChannelSettings` | Per-channel settings (visibility toggle) |

By default, `arenaSyncPlugin()` auto-registers all three. No manual `schema.types` needed.

### Extending schemas with custom fields

The whole point of syncing to Sanity is adding your own fields. To extend a schema, disable auto-registration and spread the base:

```ts
import { defineConfig, defineField } from "sanity";
import { structureTool } from "sanity/structure";
import { colorInput } from "@sanity/color-input";
import {
  arenaSyncPlugin,
  arenaStructure,
  arenaBlockSchema,
  arenaSyncConfigSchema,
  arenaChannelSettingsSchema,
} from "sanity-plugin-arena-sync";

export default defineConfig({
  plugins: [
    structureTool({ structure: arenaStructure }),
    colorInput(),
    arenaSyncPlugin({ schemas: false }), // disable auto-registration
  ],
  schema: {
    types: [
      // Pass through unchanged
      arenaBlockSchema,
      arenaSyncConfigSchema,

      // Extend channel settings with a color field
      {
        ...arenaChannelSettingsSchema,
        fields: [
          ...arenaChannelSettingsSchema.fields,
          defineField({
            name: "channelColor",
            title: "Channel Color",
            type: "color",
            options: { disableAlpha: true },
          }),
        ],
      },
    ],
  },
});
```

The same pattern works for adding fields to `arenaBlockSchema` — e.g. a `featured` boolean, a `category` reference, or any custom field your frontend needs.

---

## Structure builder

The plugin exports two structure helpers:

### `arenaStructure(S, ctx)`

Complete structure resolver. Drop it into `structureTool()` for the full hierarchy:

```
Content
├── Are.na
│   ├── All Blocks
│   ├── By Type
│   │   ├── Images
│   │   ├── Text
│   │   ├── Links
│   │   ├── Attachments
│   │   └── Media
│   ├── By Channel          (dynamic — fetched from data)
│   │   ├── channel-slug-1
│   │   └── channel-slug-2
│   ├── Orphans              (isOrphan == true)
│   ├── ──────
│   ├── Sync Config          (singleton editor)
│   └── Channel Settings     (per-channel, auto-listed from config)
├── ──────
└── (other document types)
```

```ts
structureTool({ structure: arenaStructure });
```

### `arenaStructureItem(S, ctx)`

Just the Are.na list item — compose it with your own structure:

```ts
structureTool({
  structure: (S, ctx) =>
    S.list()
      .title("Content")
      .items([
        arenaStructureItem(S, ctx),
        S.divider(),
        // ...your other items
      ]),
});
```

---

## Block browser

The "Browse Blocks" tab in the plugin tool lets you search and filter synced blocks from Sanity:

- **Search** — debounced title search
- **Type filter** — All / Image / Text / Link / Attachment / Media
- **Channel filter** — dropdown populated from your data
- **Grid view** — responsive card grid with thumbnails
- **Preview dialog** — click a card to see full details, "Open in Editor" intent link, "View on Are.na" external link
- **Pagination** — "Load More" button

---

## Exports

```ts
// Plugin
export { arenaSyncPlugin };

// Structure
export { arenaStructure, arenaStructureItem };

// Schemas (for extending)
export { arenaBlockSchema, arenaSyncConfigSchema, arenaChannelSettingsSchema };

// All schemas as an array
export { arenaSchemas };
```

---

## Plugin options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `arenaAccessToken` | `string` | — | Are.na API token (falls back to env var) |
| `schemas` | `boolean` | `true` | Auto-register bundled schemas. Set `false` to manage yourself. |

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

Example: see [arena-sanity-adapter-nuxt](../adapter-nuxt).

---

## Development

```bash
pnpm build    # Build
pnpm lint     # Lint
pnpm watch    # Watch mode
```

Dev studio at `studio/` in the monorepo root:

```bash
cd studio && pnpm dev
```

---

## Related packages

- [arena-sanity-core](../core) — sync engine & CLI
- [arena-sanity-adapter-nuxt](../adapter-nuxt) — Nuxt 3 API route

---

## License

MIT - Bartek Pierscinski

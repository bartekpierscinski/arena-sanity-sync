# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
# Build all packages
pnpm build

# Build core package only
pnpm build:core

# Publish core package
pnpm publish:core

# Run the Nuxt adapter in dev mode
pnpm -F arena-sanity-adapter-nuxt dev

# Build the Sanity plugin
pnpm -C packages/sanity-plugin-arena-sync build

# Watch mode for core development
pnpm -C packages/core dev

# Lint the Sanity plugin
pnpm -C packages/sanity-plugin-arena-sync lint

# Run core tests
pnpm -C packages/core test

# Run core tests in watch mode
pnpm -C packages/core test:watch
```

## Architecture

This is a pnpm monorepo with three packages that sync Are.na channels to Sanity:

### packages/core (arena-sanity-core)
Framework-agnostic sync engine. Main exports:
- `syncArenaChannels()` - main sync function
- `createSanityClient()` - helper to create configured Sanity client
- `createArenaClient()` - helper to create Are.na client (requires optional `are.na` peer dep)

`syncArenaChannels()` behavior:
- Fetches Are.na channel pages via `ArenaClient` interface
- Creates/updates Sanity documents via `SanityClientLite` interface
- Uses fingerprint + `arenaUpdatedAt` for idempotent updates (skips unchanged blocks)
- Only writes to `arena*`-prefixed fields plus `channels` (protects user-edited fields)
- Respects `lockAll` and `lockImage` flags on documents
- Handles drift detection (removes orphaned channel references)
- Image upload modes: "off" (URLs only), "auto" (upload if missing), "on" (always upload)

Key types in `src/types.ts`:
- `SyncOptions`: channels, timeouts, retries, image upload mode, callbacks
- `SyncResult` / `ChannelResult`: sync statistics and status

### packages/adapter-nuxt (arena-sanity-adapter-nuxt)
Nuxt 3 adapter exposing a `POST /api/sync` endpoint. Uses runtime config for credentials.

### packages/sanity-plugin-arena-sync
Sanity Studio v3 plugin providing:
- Dashboard tool showing configured channels, last sync status
- Manual sync trigger button (calls external sync endpoint)
- Real-time config updates via Sanity listener
- Requires `arenaSyncConfig` document (ID: `arenaSyncConfig`) with `channelSlugs` array

## Sanity Document Conventions

- Block documents use ID pattern: `arenaBlock-{arenaId}`
- Document type: `areNaBlock`
- Config document ID: `arenaSyncConfig`
- Channel settings document ID pattern: `arena-channel-settings-{slug}`

## Environment Variables

```
SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_TOKEN
ARENA_ACCESS_TOKEN, ARENA_CHANNELS (comma-separated slugs)
SYNC_CRON_SECRET (optional auth)
SANITY_STUDIO_SYNC_ENDPOINT (for plugin manual sync)
```

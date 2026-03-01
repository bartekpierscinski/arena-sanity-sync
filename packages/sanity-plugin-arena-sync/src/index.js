import {SyncIcon} from '@sanity/icons'
import {createElement} from 'react'
import {definePlugin} from 'sanity'

import ArenaSyncTool from './arenaSyncTool.jsx'
import {arenaBlockSchema} from './schemas/arenaBlock'
import {arenaChannelSettingsSchema} from './schemas/arenaChannelSettings'
import {arenaSyncConfigSchema} from './schemas/arenaSyncConfig'

// Re-export schemas
export {arenaBlockSchema} from './schemas/arenaBlock'
export {arenaChannelSettingsSchema} from './schemas/arenaChannelSettings'
export {arenaSyncConfigSchema} from './schemas/arenaSyncConfig'

// Re-export structure helpers
export {arenaStructure, arenaStructureItem} from './structure/arenaStructure'

/** All schemas auto-registered by the plugin */
export const arenaSchemas = [arenaBlockSchema, arenaSyncConfigSchema, arenaChannelSettingsSchema]

/**
 * Are.na Sync plugin for Sanity Studio v3
 *
 * Auto-registers all three schemas (areNaBlock, arenaSyncConfig, arenaChannelSettings).
 * Set `schemas: false` to disable auto-registration and manage schemas yourself —
 * useful when you want to extend them with custom fields:
 *
 * @param {{ arenaAccessToken?: string, schemas?: boolean }} config
 *
 * @example Basic — zero config
 * ```ts
 * export default defineConfig({
 *   plugins: [
 *     structureTool({ structure: arenaStructure }),
 *     arenaSyncPlugin(),
 *   ],
 * })
 * ```
 *
 * @example Extended — add custom fields
 * ```ts
 * import {arenaSyncPlugin, arenaStructure, arenaBlockSchema} from 'sanity-plugin-arena-sync'
 *
 * export default defineConfig({
 *   plugins: [
 *     structureTool({ structure: arenaStructure }),
 *     arenaSyncPlugin({ schemas: false }),
 *   ],
 *   schema: {
 *     types: [
 *       { ...arenaBlockSchema, fields: [...arenaBlockSchema.fields, { name: 'featured', type: 'boolean' }] },
 *     ],
 *   },
 * })
 * ```
 */
export const arenaSyncPlugin = definePlugin((config = {}) => {
  const registerSchemas = config.schemas !== false

  return {
    name: 'sanity-plugin-arena-sync',
    tools: [
      {
        name: 'arena-sync-tool',
        title: 'Are.na Sync',
        icon: SyncIcon,
        component: () => createElement(ArenaSyncTool, {config}),
      },
    ],
    schema: registerSchemas
      ? {
          types: [arenaBlockSchema, arenaSyncConfigSchema, arenaChannelSettingsSchema],
        }
      : undefined,
  }
})

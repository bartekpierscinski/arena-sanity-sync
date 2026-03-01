import {SyncIcon} from '@sanity/icons'
import {createElement} from 'react'
import {definePlugin} from 'sanity'

import ArenaSyncTool from './arenaSyncTool.jsx'

/**
 * Are.na Sync plugin for Sanity Studio v3
 *
 * @param {{ arenaAccessToken?: string }} config
 *
 * @example
 * ```ts
 * import {defineConfig} from 'sanity'
 * import {arenaSyncPlugin} from 'sanity-plugin-arena-sync'
 *
 * export default defineConfig({
 *   plugins: [arenaSyncPlugin()],
 *   // or with explicit token:
 *   // plugins: [arenaSyncPlugin({ arenaAccessToken: '...' })],
 * })
 * ```
 */
export const arenaSyncPlugin = definePlugin((config = {}) => ({
  name: 'sanity-plugin-arena-sync',
  tools: [
    {
      name: 'arena-sync-tool',
      title: 'Are.na Sync',
      icon: SyncIcon,
      component: () => createElement(ArenaSyncTool, {config}),
    },
  ],
}))

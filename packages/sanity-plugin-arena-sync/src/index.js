import {definePlugin} from 'sanity'
import {SyncIcon} from '@sanity/icons'
import ArenaSyncTool from './arenaSyncTool.jsx'

/**
 * Are.na Sync plugin for Sanity Studio v3
 *
 * @example
 * ```ts
 * import {defineConfig} from 'sanity'
 * import {arenaSyncPlugin} from 'sanity-plugin-arena-sync'
 *
 * export default defineConfig({
 *   // ...
 *   plugins: [arenaSyncPlugin()],
 * })
 * ```
 */
export const arenaSyncPlugin = definePlugin({
  name: 'sanity-plugin-arena-sync',
  tools: [
    {
      name: 'arena-sync-tool',
      title: 'Are.na Sync',
      icon: SyncIcon,
      component: ArenaSyncTool,
    },
  ],
})

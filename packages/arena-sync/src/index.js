import {definePlugin} from 'sanity'
import ArenaSyncTool from './arenaSyncTool.jsx'

// interface MyPluginConfig {
//   /* nothing here yet */
// }

/**
 * Usage in `sanity.config.ts` (or .js)
 *
 * ```ts
 * import {defineConfig} from 'sanity'
 * import {myPlugin} from 'sanity-plugin-arena-sync'
 *
 * export default defineConfig({
 *   // ...
 *   plugins: [myPlugin()],
 * })
 * ```
 */
// export const myPlugin = definePlugin(() => {
//   // eslint-disable-next-line no-console
//   console.log('hello from sanity-plugin-arena-sync')
//   return {
//     name: 'sanity-plugin-arena-sync',
//   }
// })

// my-arena-sync-plugin/src/index.js

export const arenaSyncPlugin = definePlugin({
  name: 'sanity-plugin-arena-sync',
  title: 'Are.na Sync',
  tools: [
    {
      name: 'arena-sync-tool',
      title: 'Are.na Sync',
      component: ArenaSyncTool,
    },
  ],
})

// Per-channel display settings.
// Auto-registered by the plugin. Extend with your own fields via schemas: false.
import {defineField, defineType} from 'sanity'

export const arenaChannelSettingsSchema = defineType({
  name: 'arenaChannelSettings',
  title: 'Are.na Channel Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'isVisible',
      title: 'Visible on Website',
      type: 'boolean',
      description: 'Whether this channel should be visible on the website',
      initialValue: true,
    }),
  ],
})

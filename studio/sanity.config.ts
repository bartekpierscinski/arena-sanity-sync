import {colorInput} from '@sanity/color-input'
import {defineConfig, defineField} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {
  arenaSyncPlugin,
  arenaStructure,
  arenaBlockSchema,
  arenaSyncConfigSchema,
  arenaChannelSettingsSchema,
} from 'sanity-plugin-arena-sync'

export default defineConfig({
  name: 'arena-sync-studio',
  title: 'Are.na Sync Studio',

  projectId: 'xvcgq3yr',
  dataset: 'production',

  plugins: [
    structureTool({structure: arenaStructure}),
    visionTool(),
    colorInput(),
    // schemas: false — we manage schemas ourselves to add custom fields
    arenaSyncPlugin({schemas: false}),
  ],

  schema: {
    types: [
      arenaBlockSchema,
      arenaSyncConfigSchema,
      // Extend channel settings with a color field (requires colorInput plugin)
      {
        ...arenaChannelSettingsSchema,
        fields: [
          ...arenaChannelSettingsSchema.fields,
          defineField({
            name: 'channelColor',
            title: 'Channel Color',
            type: 'color',
            description: 'Color associated with this channel for visualization',
            options: {
              disableAlpha: true,
              colorList: [
                '#000000',
                '#555555',
                '#E31A1C',
                '#33A02C',
                '#1F78B4',
                '#B15928',
                '#FFD700',
                '#6A3D9A',
                '#1FB6AA',
                '#FB8C00',
              ],
            },
          }),
        ],
      },
    ],
  },
})

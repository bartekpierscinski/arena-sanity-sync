// schemas/arena/arenaSyncConfig.js
// Singleton document (ID: "arenaSyncConfig") managing sync configuration.
// Updated by the Sanity plugin channel picker and the CLI after each sync run.
export default {
  name: 'arenaSyncConfig',
  title: 'Are.na Sync Configuration',
  type: 'document',
  fields: [
    {
      name: 'channelSlugs',
      title: 'Are.na Channel Slugs to Sync',
      type: 'array',
      of: [
        {
          type: 'string',
          validation: (Rule) =>
            Rule.regex(/^[a-z0-9-_]+$/, {name: 'slug'}).error(
              'Slugs should only contain lowercase letters, numbers, hyphens, and underscores.',
            ),
        },
      ],
      description: 'Channel slugs selected for sync. Managed by the Studio plugin.',
      validation: (Rule) => Rule.unique().error('Channel slugs must be unique.'),
    },
    {
      name: 'lastSyncDate',
      title: 'Last Sync Date',
      type: 'datetime',
      readOnly: true,
      description: 'Timestamp of the most recent sync run (set by CLI).',
    },
    {
      name: 'lastSyncStatus',
      title: 'Last Sync Status',
      type: 'text',
      rows: 3,
      readOnly: true,
      description: 'Status message from the last sync run (set by CLI).',
    },
    {
      name: 'syncEndpoint',
      title: 'Sync Endpoint',
      type: 'url',
      description: 'URL the Studio plugin POSTs to trigger a sync (e.g. /api/sync).',
    },
  ],
  initialValue: () => ({
    _id: 'arenaSyncConfig',
    channelSlugs: [],
  }),
}

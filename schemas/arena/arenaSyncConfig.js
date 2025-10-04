// schemas/arenaSyncConfig.js
export default {
  name: 'arenaSyncConfig',
  title: 'Are.na Sync Configuration',
  type: 'document',
  // For making it a "singleton" document (only one instance)
  // You'll also need to customize your desk structure to enforce this
  // __experimental_actions: [/*'create',*/ 'update', /*'delete',*/ 'publish'], // To prevent creation of new ones and deletion
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
      description: 'Enter the slugs of the Are.na channels you want to sync.',
      validation: (Rule) => Rule.unique().error('Channel slugs must be unique.'),
    },
    {
      name: 'lastSyncDate',
      title: 'Last Sync Attempt Date', // Clarified title
      type: 'datetime',
      readOnly: true,
    },
    {
      name: 'lastSyncStatus',
      title: 'Last Sync Status Message', // Clarified title
      type: 'text',
      rows: 5, // Increased rows for better readability of potentially long messages
      readOnly: true,
    },
    {
      // --- NEW FIELD ---
      name: 'lastSuccessfullySyncedSlugs',
      title: 'Last Successfully Synced Channel Slugs',
      description:
        'List of channel slugs that were part of the last fully successful sync operation. Managed by the sync script.',
      type: 'array',
      of: [{type: 'string'}],
      readOnly: true, // This field is managed by the backend script
    },
    // --- END OF NEW FIELD ---
  ],
  // Initial value to create the document if it doesn't exist, with a fixed ID
  // This helps ensure the document 'arenaSyncConfiguration' can be reliably fetched.
  // Note: If the document already exists, this initialValue won't overwrite it.
  // It's primarily for when the document is first created via the Studio.
  initialValue: () => ({
    _id: 'arenaSyncConfiguration', // Ensures a predictable ID for the singleton
    channelSlugs: [],
    lastSuccessfullySyncedSlugs: [],
  }),
}

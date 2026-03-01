// schemas/arena/arenaBlock.jsx
// Matches arena-sanity-core sync output and Are.na v3 API response shape.
export default {
  name: 'areNaBlock',
  title: 'Are.na Block',
  type: 'document',
  groups: [
    {name: 'basic', title: 'Basic Info', default: true},
    {name: 'channels', title: 'Channels'},
    {name: 'content', title: 'Content'},
    {name: 'sync', title: 'Sync & Metadata'},
  ],
  fields: [
    // ─── Basic ──────────────────────────────────────────────
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'basic',
      description: 'Block title. May be user-edited in Studio or sourced from Are.na.',
    },
    {
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      group: 'basic',
      description: 'Uploaded to Sanity assets from the Are.na image when image sync is enabled.',
    },
    {
      name: 'arenaId',
      title: 'Are.na ID',
      type: 'number',
      readOnly: true,
      group: 'basic',
      validation: (Rule) => Rule.required(),
      description: 'Unique block identifier from Are.na.',
    },
    {
      name: 'arenaBlockUrl',
      title: 'Are.na Block URL',
      type: 'url',
      readOnly: true,
      group: 'basic',
      description: 'Direct link to the block on Are.na.',
    },
    {
      name: 'blockType',
      title: 'Block Type',
      type: 'string',
      readOnly: true,
      group: 'basic',
      description: "Are.na v3 block type: 'Text', 'Image', 'Link', 'Media', 'Attachment'.",
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
      group: 'basic',
      description: 'User-defined tags to categorize this block.',
    },

    // ─── Channels ───────────────────────────────────────────
    {
      name: 'channels',
      title: 'Channels',
      type: 'array',
      readOnly: true,
      group: 'channels',
      description: 'All Are.na channels this block belongs to.',
      of: [
        {
          type: 'object',
          name: 'channelRef',
          fields: [
            {name: 'slug', type: 'string', title: 'Slug'},
            {name: 'title', type: 'string', title: 'Title'},
          ],
        },
      ],
    },

    // ─── Content ────────────────────────────────────────────
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'content',
      description: 'Block description from Are.na (v3 `description` field).',
      hidden: ({document}) =>
        !document?.description &&
        !['Link', 'Image', 'Media', 'Attachment'].includes(document?.blockType),
    },
    {
      name: 'contentHtml',
      title: 'Content HTML',
      type: 'text',
      group: 'content',
      description: 'HTML content of the block (primarily for Text blocks).',
      hidden: ({document}) => document?.blockType !== 'Text',
    },
    {
      name: 'sourceUrl',
      title: 'Source URL',
      type: 'url',
      group: 'content',
      description: 'The primary URL for Link blocks.',
      hidden: ({document}) => document?.blockType !== 'Link',
    },
    {
      name: 'sourceTitle',
      title: 'Source Title',
      type: 'string',
      group: 'content',
      description: 'Title of the source URL (e.g. webpage title).',
      hidden: ({document}) => document?.blockType !== 'Link' || !document?.sourceTitle,
    },
    {
      name: 'sourceProviderName',
      title: 'Source Provider',
      type: 'string',
      group: 'content',
      description: "Provider of the source URL (e.g. 'youtube.com').",
      hidden: ({document}) => document?.blockType !== 'Link' || !document?.sourceProviderName,
    },
    {
      name: 'externalImageUrl',
      title: 'External Image URL',
      type: 'url',
      readOnly: true,
      group: 'content',
      description: 'Are.na image URL (v3 medium/src). Used when image upload is off.',
      hidden: ({document}) => !document?.externalImageUrl,
    },
    {
      name: 'externalImageThumbUrl',
      title: 'External Image Thumb URL',
      type: 'url',
      readOnly: true,
      group: 'content',
      description: 'Are.na thumbnail image URL (v3 small/src).',
      hidden: ({document}) => !document?.externalImageThumbUrl,
    },

    // ─── Sync & Metadata ────────────────────────────────────
    {
      name: 'arenaCreatedAt',
      title: 'Are.na Created At',
      type: 'datetime',
      readOnly: true,
      group: 'sync',
    },
    {
      name: 'arenaUpdatedAt',
      title: 'Are.na Updated At',
      type: 'datetime',
      readOnly: true,
      group: 'sync',
    },
    {
      name: 'arenaImageSignature',
      title: 'Image Signature',
      type: 'string',
      readOnly: true,
      group: 'sync',
      description: 'src|file_size hash for image change detection.',
      hidden: ({document}) => !document?.arenaImageSignature,
    },
    {
      name: 'arenaFingerprint',
      title: 'Content Fingerprint',
      type: 'string',
      readOnly: true,
      group: 'sync',
      description: 'Hash of core block fields used to skip unchanged blocks.',
      hidden: ({document}) => !document?.arenaFingerprint,
    },
    {
      name: 'lastSyncedAt',
      title: 'Last Synced At',
      type: 'datetime',
      readOnly: true,
      group: 'sync',
      hidden: ({document}) => !document?.lastSyncedAt,
    },
    {
      name: 'lastSyncedBy',
      title: 'Last Synced By',
      type: 'string',
      readOnly: true,
      group: 'sync',
      hidden: ({document}) => !document?.lastSyncedBy,
    },
    {
      name: 'isOrphan',
      title: 'Is Orphan',
      type: 'boolean',
      readOnly: true,
      group: 'sync',
      description: 'True if the block is no longer in any tracked channel.',
      hidden: ({document}) => !document?.isOrphan,
    },

    // ─── Lock controls ──────────────────────────────────────
    {
      name: 'lockAll',
      title: 'Lock All Are.na Updates',
      type: 'boolean',
      group: 'sync',
      description: 'When enabled, sync will not update any arena-owned fields on this document.',
    },
    {
      name: 'lockImage',
      title: 'Lock Main Image',
      type: 'boolean',
      group: 'sync',
      description: 'Prevents sync from replacing mainImage even if the Are.na image changes.',
    },
    {
      name: 'syncPolicy',
      title: 'Sync Policy',
      type: 'object',
      group: 'sync',
      description: 'Controls which system (studio vs arena) owns certain fields.',
      options: {collapsible: true, collapsed: true},
      fields: [
        {
          name: 'owner',
          title: 'Ownership Map',
          type: 'object',
          fields: [
            {name: 'title', type: 'string', description: "Owner of 'title' (studio|arena)"},
            {name: 'sourceTitle', type: 'string', description: "Owner of 'sourceTitle' (studio|arena)"},
            {name: 'mainImage', type: 'string', description: "Owner of 'mainImage' (studio|arena)"},
            {name: 'channels', type: 'string', description: "Owner of 'channels' (studio|arena)"},
          ],
        },
      ],
    },

    // ─── Raw Are.na v3 data ─────────────────────────────────
    {
      name: 'rawArenaData',
      title: 'Raw Are.na Data',
      type: 'object',
      group: 'sync',
      options: {collapsible: true, collapsed: true},
      fields: [
        {name: 'id', type: 'number'},
        {name: 'title', type: 'string'},
        {name: 'type', type: 'string', title: 'Type (Image, Text, Link, Attachment, Media)'},
        {name: 'base_type', type: 'string'},
        {name: 'state', type: 'string'},
        {name: 'visibility', type: 'string'},
        {name: 'description', type: 'text'},
        {name: 'content_html', type: 'text'},
        {name: 'created_at', type: 'datetime'},
        {name: 'updated_at', type: 'datetime'},
        {name: 'comment_count', type: 'number'},
        // v3 image object
        {
          name: 'image',
          title: 'Image',
          type: 'object',
          fields: [
            {name: 'src', type: 'url', title: 'Original Source URL'},
            {name: 'filename', type: 'string'},
            {name: 'content_type', type: 'string'},
            {name: 'file_size', type: 'number'},
            {name: 'width', type: 'number'},
            {name: 'height', type: 'number'},
            {name: 'aspect_ratio', type: 'number'},
            {name: 'alt_text', type: 'string'},
            {name: 'updated_at', type: 'datetime'},
            {
              name: 'small',
              type: 'object',
              fields: [
                {name: 'src', type: 'url'},
                {name: 'src_2x', type: 'url'},
                {name: 'width', type: 'number'},
                {name: 'height', type: 'number'},
              ],
            },
            {
              name: 'medium',
              type: 'object',
              fields: [
                {name: 'src', type: 'url'},
                {name: 'src_2x', type: 'url'},
                {name: 'width', type: 'number'},
                {name: 'height', type: 'number'},
              ],
            },
            {
              name: 'large',
              type: 'object',
              fields: [
                {name: 'src', type: 'url'},
                {name: 'src_2x', type: 'url'},
                {name: 'width', type: 'number'},
                {name: 'height', type: 'number'},
              ],
            },
            {
              name: 'square',
              type: 'object',
              fields: [
                {name: 'src', type: 'url'},
                {name: 'src_2x', type: 'url'},
                {name: 'width', type: 'number'},
                {name: 'height', type: 'number'},
              ],
            },
          ],
        },
        // v3 attachment object
        {
          name: 'attachment',
          title: 'Attachment',
          type: 'object',
          fields: [
            {name: 'url', type: 'url', title: 'URL'},
            {name: 'filename', type: 'string'},
            {name: 'content_type', type: 'string', title: 'Content Type'},
            {name: 'file_extension', type: 'string', title: 'File Extension'},
            {name: 'file_size', type: 'number', title: 'File Size'},
            {name: 'updated_at', type: 'datetime'},
          ],
        },
        // v3 source object
        {
          name: 'source',
          type: 'object',
          fields: [
            {name: 'url', type: 'url'},
            {name: 'title', type: 'string'},
            {
              name: 'provider',
              type: 'object',
              fields: [
                {name: 'name', type: 'string'},
                {name: 'url', type: 'string'},
              ],
            },
          ],
        },
        // v3 connection object (replaces flat connected_* fields)
        {
          name: 'connection',
          type: 'object',
          fields: [
            {name: 'id', type: 'number'},
            {name: 'connected_at', type: 'datetime'},
            {name: 'position', type: 'number'},
            {name: 'pinned', type: 'boolean'},
            {
              name: 'connected_by',
              type: 'object',
              fields: [
                {name: 'id', type: 'number'},
                {name: 'name', type: 'string'},
                {name: 'slug', type: 'string'},
                {name: 'type', type: 'string'},
                {name: 'avatar', type: 'string'},
                {name: 'initials', type: 'string'},
              ],
            },
          ],
        },
        // v3 user object (simplified)
        {
          name: 'user',
          type: 'object',
          fields: [
            {name: 'id', type: 'number'},
            {name: 'name', type: 'string'},
            {name: 'slug', type: 'string'},
            {name: 'type', type: 'string'},
            {name: 'avatar', type: 'string'},
            {name: 'initials', type: 'string'},
          ],
        },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
      blockType: 'blockType',
      firstChannelSlug: 'channels.0.slug',
    },
    prepare(selection) {
      const {title, blockType, firstChannelSlug, media} = selection
      const displaySubtitle = firstChannelSlug ? `${blockType} • ${firstChannelSlug}` : blockType
      return {
        title: title || 'Block',
        subtitle: displaySubtitle,
        media,
      }
    },
  },
}

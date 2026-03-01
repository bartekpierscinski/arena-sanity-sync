import {
  CogIcon,
  ControlsIcon,
  DocumentsIcon,
  DocumentZipIcon,
  HashIcon,
  ImageIcon,
  LinkIcon,
  PlayIcon,
  SyncIcon,
  TagsIcon,
  TextIcon,
  WarningOutlineIcon,
} from '@sanity/icons'

const ARENA_DOC_TYPES = new Set(['areNaBlock', 'arenaSyncConfig', 'arenaChannelSettings'])

const BLOCK_TYPES = [
  {value: 'Image', title: 'Images', icon: ImageIcon},
  {value: 'Text', title: 'Text', icon: TextIcon},
  {value: 'Link', title: 'Links', icon: LinkIcon},
  {value: 'Attachment', title: 'Attachments', icon: DocumentZipIcon},
  {value: 'Media', title: 'Media', icon: PlayIcon},
]

/**
 * Returns a single ListItem representing the entire Are.na section.
 * Compose with other items in your own structure resolver.
 *
 * @example
 * structureTool({
 *   structure: (S, ctx) =>
 *     S.list().title('Content').items([
 *       arenaStructureItem(S, ctx),
 *       S.divider(),
 *       ...S.documentTypeListItems().filter(item => !arenaDocTypes.has(item.getId())),
 *     ])
 * })
 */
export function arenaStructureItem(S, ctx) {
  const client = ctx.getClient({apiVersion: '2024-05-15'})

  return S.listItem()
    .title('Are.na')
    .icon(SyncIcon)
    .child(
      S.list()
        .title('Are.na')
        .items([
          // ── All Blocks ──────────────────────────────────────
          S.listItem()
            .title('All Blocks')
            .icon(DocumentsIcon)
            .schemaType('areNaBlock')
            .child(S.documentTypeList('areNaBlock').title('All Blocks')),

          // ── By Type ─────────────────────────────────────────
          S.listItem()
            .title('By Type')
            .icon(TagsIcon)
            .child(
              S.list()
                .title('By Type')
                .items(
                  BLOCK_TYPES.map(({value, title, icon}) =>
                    S.listItem()
                      .title(title)
                      .icon(icon)
                      .schemaType('areNaBlock')
                      .child(
                        S.documentList()
                          .title(title)
                          .schemaType('areNaBlock')
                          .filter('_type == "areNaBlock" && blockType == $blockType')
                          .params({blockType: value}),
                      ),
                  ),
                ),
            ),

          // ── By Channel ──────────────────────────────────────
          S.listItem()
            .title('By Channel')
            .icon(HashIcon)
            .child(() =>
              client
                .fetch(
                  `array::unique(*[_type == "areNaBlock" && defined(channels)].channels[].slug)`,
                )
                .then((slugs) => {
                  const sorted = (slugs || []).slice().sort()
                  return S.list()
                    .title('By Channel')
                    .items(
                      sorted.map((slug) =>
                        S.listItem()
                          .title(slug)
                          .icon(HashIcon)
                          .schemaType('areNaBlock')
                          .child(
                            S.documentList()
                              .title(slug)
                              .schemaType('areNaBlock')
                              .filter('_type == "areNaBlock" && $slug in channels[].slug')
                              .params({slug}),
                          ),
                      ),
                    )
                }),
            ),

          // ── Orphans ─────────────────────────────────────────
          S.listItem()
            .title('Orphans')
            .icon(WarningOutlineIcon)
            .schemaType('areNaBlock')
            .child(
              S.documentList()
                .title('Orphans')
                .schemaType('areNaBlock')
                .filter('_type == "areNaBlock" && isOrphan == true'),
            ),

          S.divider(),

          // ── Sync Config (singleton) ─────────────────────────
          S.listItem()
            .title('Sync Config')
            .icon(CogIcon)
            .child(S.document().schemaType('arenaSyncConfig').documentId('arenaSyncConfig')),

          // ── Channel Settings ────────────────────────────────
          S.listItem()
            .title('Channel Settings')
            .icon(ControlsIcon)
            .child(() =>
              client
                .fetch(
                  `coalesce(*[_id == "arenaSyncConfig"][0].channelSlugs, [])`,
                )
                .then((slugs) => {
                  const sorted = (slugs || []).slice().sort()
                  return S.list()
                    .title('Channel Settings')
                    .items(
                      sorted.map((slug) =>
                        S.listItem()
                          .title(slug)
                          .icon(ControlsIcon)
                          .child(
                            S.document()
                              .schemaType('arenaChannelSettings')
                              .documentId(`arena-channel-settings-${slug}`)
                              .title(`Settings: ${slug}`),
                          ),
                      ),
                    )
                }),
            ),
        ]),
    )
}

/**
 * Complete structure resolver — drop into `structureTool({ structure: arenaStructure })`.
 * Puts the Are.na section first, then all other document types.
 */
export function arenaStructure(S, ctx) {
  return S.list()
    .title('Content')
    .items([
      arenaStructureItem(S, ctx),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => !ARENA_DOC_TYPES.has(item.getId())),
    ])
}

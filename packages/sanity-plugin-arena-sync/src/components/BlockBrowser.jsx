import {useState, useEffect, useCallback, useMemo, useRef} from 'react'
import {
  Box,
  Card,
  Text,
  Button,
  Spinner,
  Stack,
  Flex,
  Grid,
  TextInput,
  Badge,
  Inline,
  Dialog,
  Select,
} from '@sanity/ui'
import {useClient} from 'sanity'
import {IntentLink} from 'sanity/router'
import {SearchIcon, LaunchIcon, EditIcon} from '@sanity/icons'
import BlockCard from './BlockCard'

const API_VERSION = '2024-05-15'
const PAGE_SIZE = 24

const BLOCK_QUERY = `*[_type == "areNaBlock"
  && ($search == "" || title match $search + "*")
  && ($type == "" || blockType == $type)
  && ($channel == "" || $channel in channels[].slug)
] | order(arenaUpdatedAt desc) [$start...$end] {
  _id, title, blockType, arenaId, arenaBlockUrl, description,
  "thumbUrl": coalesce(mainImage.asset->url + "?w=200&h=200&fit=crop", externalImageThumbUrl),
  "channelSlugs": channels[].slug, isOrphan
}`

const CHANNEL_SLUGS_QUERY = `array::unique(*[_type == "areNaBlock" && defined(channels)].channels[].slug)`

const TYPE_FILTERS = [
  {id: '', label: 'All'},
  {id: 'Image', label: 'Image'},
  {id: 'Text', label: 'Text'},
  {id: 'Link', label: 'Link'},
  {id: 'Attachment', label: 'Attachment'},
  {id: 'Media', label: 'Media'},
]

export default function BlockBrowser() {
  const client = useClient({apiVersion: API_VERSION})

  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [channelOptions, setChannelOptions] = useState([])

  // Preview
  const [selected, setSelected] = useState(null)

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  // Load channel options once
  useEffect(() => {
    client.fetch(CHANNEL_SLUGS_QUERY).then((slugs) => {
      setChannelOptions((slugs || []).sort())
    })
  }, [client])

  // Fetch blocks when filters change
  const fetchBlocks = useCallback(
    async (start = 0) => {
      setLoading(true)
      try {
        const end = start + PAGE_SIZE
        const results = await client.fetch(BLOCK_QUERY, {
          search: debouncedSearch,
          type: typeFilter,
          channel: channelFilter,
          start,
          end,
        })
        if (start === 0) {
          setBlocks(results)
        } else {
          setBlocks((prev) => [...prev, ...results])
        }
        setHasMore(results.length === PAGE_SIZE)
      } catch (err) {
        console.error('Block fetch failed:', err)
      } finally {
        setLoading(false)
      }
    },
    [client, debouncedSearch, typeFilter, channelFilter],
  )

  // Reset and reload when filters change
  useEffect(() => {
    fetchBlocks(0)
  }, [fetchBlocks])

  const loadMore = useCallback(() => {
    fetchBlocks(blocks.length)
  }, [fetchBlocks, blocks.length])

  const handleCardClick = useCallback((block) => {
    setSelected(block)
  }, [])

  const handleClosePreview = useCallback(() => {
    setSelected(null)
  }, [])

  return (
    <Stack space={4}>
      {/* ── Filter bar ─────────────────────────────────── */}
      <Flex gap={3} align="center" wrap="wrap">
        <Box flex={1} style={{minWidth: 200}}>
          <TextInput
            icon={SearchIcon}
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
        </Box>
        <Inline space={1}>
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.id}
              text={f.label}
              mode={typeFilter === f.id ? 'default' : 'ghost'}
              tone={typeFilter === f.id ? 'primary' : 'default'}
              fontSize={1}
              padding={2}
              onClick={() => setTypeFilter(f.id)}
            />
          ))}
        </Inline>
      </Flex>

      {/* ── Channel dropdown ───────────────────────────── */}
      {channelOptions.length > 0 && (
        <Flex gap={3} align="center">
          <Text size={1} muted style={{whiteSpace: 'nowrap'}}>
            Channel:
          </Text>
          <Box style={{maxWidth: 240}}>
            <Select
              fontSize={1}
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.currentTarget.value)}
            >
              <option value="">All Channels</option>
              {channelOptions.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </Select>
          </Box>
          <Box flex={1} />
          <Badge tone="default">
            {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            {hasMore ? '+' : ''}
          </Badge>
        </Flex>
      )}

      {/* ── Block grid ─────────────────────────────────── */}
      {loading && blocks.length === 0 ? (
        <Flex align="center" justify="center" padding={6}>
          <Spinner size={4} />
        </Flex>
      ) : blocks.length === 0 ? (
        <Card padding={5} tone="transparent" radius={2}>
          <Flex align="center" justify="center">
            <Text muted>No blocks match your filters.</Text>
          </Flex>
        </Card>
      ) : (
        <>
          <Grid columns={[2, 3, 4, 6]} gap={3}>
            {blocks.map((block) => (
              <BlockCard key={block._id} block={block} onClick={handleCardClick} />
            ))}
          </Grid>

          {hasMore && (
            <Flex justify="center" padding={3}>
              <Button
                text={loading ? 'Loading...' : 'Load More'}
                mode="ghost"
                tone="primary"
                disabled={loading}
                onClick={loadMore}
              />
            </Flex>
          )}
        </>
      )}

      {/* ── Preview dialog ─────────────────────────────── */}
      {selected && (
        <Dialog
          id="block-preview"
          header={selected.title || `Block ${selected.arenaId}`}
          onClose={handleClosePreview}
          width={1}
        >
          <Box padding={4}>
            <Stack space={4}>
              {selected.thumbUrl && (
                <Box style={{textAlign: 'center'}}>
                  <img
                    src={selected.thumbUrl}
                    alt={selected.title || ''}
                    style={{maxWidth: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 4}}
                  />
                </Box>
              )}

              <Flex gap={2} align="center" wrap="wrap">
                <Badge tone="primary" fontSize={0}>
                  {selected.blockType}
                </Badge>
                {selected.isOrphan && (
                  <Badge tone="caution" fontSize={0}>
                    Orphan
                  </Badge>
                )}
                {selected.channelSlugs?.map((slug) => (
                  <Badge key={slug} tone="default" fontSize={0}>
                    {slug}
                  </Badge>
                ))}
              </Flex>

              {selected.description && (
                <Card padding={3} radius={2} tone="transparent">
                  <Text size={1}>{selected.description}</Text>
                </Card>
              )}

              <Flex gap={2} wrap="wrap">
                <IntentLink
                  intent="edit"
                  params={{id: selected._id, type: 'areNaBlock'}}
                  style={{textDecoration: 'none'}}
                >
                  <Button text="Open in Editor" icon={EditIcon} mode="ghost" tone="primary" />
                </IntentLink>
                {selected.arenaBlockUrl && (
                  <a
                    href={selected.arenaBlockUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{textDecoration: 'none'}}
                  >
                    <Button text="View on Are.na" icon={LaunchIcon} mode="ghost" />
                  </a>
                )}
              </Flex>
            </Stack>
          </Box>
        </Dialog>
      )}
    </Stack>
  )
}

import {useState, useCallback, useEffect, useMemo} from 'react'
import {
  Box,
  Card,
  Heading,
  Text,
  Button,
  Spinner,
  Stack,
  useToast,
  Flex,
  Badge,
  TextInput,
  Grid,
  Checkbox,
  Avatar,
  Inline,
} from '@sanity/ui'
import {useClient} from 'sanity'
import {SearchIcon, SyncIcon, CheckmarkCircleIcon, CloseCircleIcon} from '@sanity/icons'

const SANITY_API_VERSION = '2024-05-15'
const CONFIG_DOC_ID = 'arenaSyncConfig'
const CONFIG_DOC_TYPE = 'arenaSyncConfig'
const ARENA_API = 'https://api.are.na/v3'
const PER_PAGE = 100

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

async function arenaFetch(path, token) {
  const res = await fetch(`${ARENA_API}${path}`, {
    headers: {Authorization: `Bearer ${token}`},
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Are.na API ${res.status}: ${body || res.statusText}`)
  }
  return res.json()
}

async function fetchAllChannels(slug, token) {
  const channels = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const res = await arenaFetch(
      `/users/${slug}/contents?type=Channel&per=${PER_PAGE}&page=${page}`,
      token,
    )
    channels.push(...(res.data || []))
    hasMore = res.meta?.has_more_pages ?? false
    page++
  }
  return channels
}

function visibilityTone(visibility) {
  if (visibility === 'public') return 'positive'
  if (visibility === 'private') return 'critical'
  return 'caution' // closed
}

/* ------------------------------------------------------------------ */
/*  Filter tabs                                                       */
/* ------------------------------------------------------------------ */

const FILTERS = [
  {id: 'all', label: 'All'},
  {id: 'selected', label: 'Selected'},
  {id: 'public', label: 'Public'},
  {id: 'private', label: 'Private'},
]

/* ------------------------------------------------------------------ */
/*  Channel Card                                                      */
/* ------------------------------------------------------------------ */

function ChannelCard({channel, selected, onToggle}) {
  return (
    <Card
      padding={3}
      radius={2}
      shadow={1}
      tone={selected ? 'primary' : 'default'}
      style={{cursor: 'pointer', transition: 'border-color 0.15s'}}
      onClick={() => onToggle(channel.slug)}
    >
      <Flex align="center" gap={3}>
        <Checkbox checked={selected} readOnly style={{pointerEvents: 'none'}} />
        <Stack space={2} flex={1}>
          <Text weight="semibold" size={1} textOverflow="ellipsis">
            {channel.title}
          </Text>
          <Flex gap={2} align="center" wrap="wrap">
            <Badge tone={visibilityTone(channel.visibility)} fontSize={0}>
              {channel.visibility}
            </Badge>
            <Text muted size={0}>
              {channel.counts?.contents ?? 0} blocks
            </Text>
          </Flex>
          <Text muted size={0} textOverflow="ellipsis">
            {channel.slug}
          </Text>
        </Stack>
      </Flex>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

const ArenaSyncTool = ({config: pluginConfig = {}}) => {
  const client = useClient({apiVersion: SANITY_API_VERSION})
  const toast = useToast()

  // Are.na state
  const token =
    pluginConfig.arenaAccessToken ||
    (typeof import.meta !== 'undefined' && import.meta.env?.SANITY_STUDIO_ARENA_ACCESS_TOKEN) ||
    ''
  const [user, setUser] = useState(null)
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Sanity config state
  const [selectedSlugs, setSelectedSlugs] = useState([])
  const [configDoc, setConfigDoc] = useState(null)

  // UI state
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [isTriggeringSync, setIsTriggeringSync] = useState(false)

  /* ---- Load Are.na data ---- */
  const loadArena = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const me = await arenaFetch('/me', token)
      setUser(me)
      const allChannels = await fetchAllChannels(me.slug, token)
      setChannels(allChannels)
    } catch (err) {
      console.error('Are.na load failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  /* ---- Load Sanity config + listen ---- */
  const loadConfig = useCallback(async () => {
    try {
      const doc = await client.getDocument(CONFIG_DOC_ID)
      setConfigDoc(doc || null)
      setSelectedSlugs(doc?.channelSlugs || [])
    } catch (err) {
      console.error('Config load failed:', err)
    }
  }, [client])

  useEffect(() => {
    loadArena()
    loadConfig()

    const sub = client.listen(`*[_id == "${CONFIG_DOC_ID}"]`).subscribe((update) => {
      if (update.result) {
        setConfigDoc(update.result)
        setSelectedSlugs(update.result.channelSlugs || [])
      }
    })
    return () => sub.unsubscribe()
  }, [client, loadArena, loadConfig])

  /* ---- Toggle channel ---- */
  const toggleChannel = useCallback(
    async (slug) => {
      const prev = selectedSlugs
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]

      // Optimistic update
      setSelectedSlugs(next)

      try {
        if (configDoc) {
          await client.patch(CONFIG_DOC_ID).set({channelSlugs: next}).commit()
        } else {
          await client.createOrReplace({
            _id: CONFIG_DOC_ID,
            _type: CONFIG_DOC_TYPE,
            channelSlugs: next,
          })
          setConfigDoc({_id: CONFIG_DOC_ID, _type: CONFIG_DOC_TYPE, channelSlugs: next})
        }
      } catch (err) {
        console.error('Failed to update config:', err)
        // Revert
        setSelectedSlugs(prev)
        toast.push({status: 'error', title: 'Failed to save', description: err.message})
      }
    },
    [client, configDoc, selectedSlugs, toast],
  )

  /* ---- Bulk actions ---- */
  const filteredChannels = useMemo(() => {
    let list = channels
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
      )
    }
    if (filter === 'selected') list = list.filter((c) => selectedSlugs.includes(c.slug))
    if (filter === 'public') list = list.filter((c) => c.visibility === 'public')
    if (filter === 'private') list = list.filter((c) => c.visibility === 'private')
    return list
  }, [channels, search, filter, selectedSlugs])

  const selectAllVisible = useCallback(async () => {
    const visibleSlugs = filteredChannels.map((c) => c.slug)
    const merged = [...new Set([...selectedSlugs, ...visibleSlugs])]
    setSelectedSlugs(merged)
    try {
      if (configDoc) {
        await client.patch(CONFIG_DOC_ID).set({channelSlugs: merged}).commit()
      } else {
        await client.createOrReplace({
          _id: CONFIG_DOC_ID,
          _type: CONFIG_DOC_TYPE,
          channelSlugs: merged,
        })
        setConfigDoc({_id: CONFIG_DOC_ID, _type: CONFIG_DOC_TYPE, channelSlugs: merged})
      }
    } catch (err) {
      toast.push({status: 'error', title: 'Failed to save', description: err.message})
      setSelectedSlugs(selectedSlugs)
    }
  }, [client, configDoc, filteredChannels, selectedSlugs, toast])

  const deselectAllVisible = useCallback(async () => {
    const visibleSlugs = new Set(filteredChannels.map((c) => c.slug))
    const remaining = selectedSlugs.filter((s) => !visibleSlugs.has(s))
    setSelectedSlugs(remaining)
    try {
      if (configDoc) {
        await client.patch(CONFIG_DOC_ID).set({channelSlugs: remaining}).commit()
      } else {
        await client.createOrReplace({
          _id: CONFIG_DOC_ID,
          _type: CONFIG_DOC_TYPE,
          channelSlugs: remaining,
        })
        setConfigDoc({_id: CONFIG_DOC_ID, _type: CONFIG_DOC_TYPE, channelSlugs: remaining})
      }
    } catch (err) {
      toast.push({status: 'error', title: 'Failed to save', description: err.message})
      setSelectedSlugs(selectedSlugs)
    }
  }, [client, configDoc, filteredChannels, selectedSlugs, toast])

  /* ---- Trigger sync ---- */
  const handleTriggerSync = useCallback(async () => {
    const endpoint =
      configDoc?.syncEndpoint ||
      (typeof import.meta !== 'undefined' && import.meta.env?.SANITY_STUDIO_SYNC_ENDPOINT) ||
      ''
    if (!endpoint) {
      toast.push({status: 'warning', title: 'No sync endpoint configured'})
      return
    }
    setIsTriggeringSync(true)
    try {
      const res = await fetch(endpoint, {method: 'POST'})
      if (!res.ok) throw new Error(`Sync endpoint returned ${res.status}`)
      const data = await res.json().catch(() => ({}))
      const ok = data.success ?? data.overallSuccess ?? false
      if (!ok) throw new Error(data.message || 'Sync reported failure')
      toast.push({status: 'success', title: 'Sync triggered', description: data.message})
    } catch (err) {
      toast.push({status: 'error', title: 'Sync failed', description: err.message})
    } finally {
      setIsTriggeringSync(false)
    }
  }, [configDoc, toast])

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  // No token → setup instructions
  if (!token) {
    return (
      <Box padding={5}>
        <Card padding={5} radius={3} shadow={1} tone="caution">
          <Stack space={4}>
            <Heading size={3}>Are.na Sync Setup</Heading>
            <Text>
              To use the channel picker, provide your Are.na access token. Add it to your studio's{' '}
              <code>.env</code> file:
            </Text>
            <Card padding={3} radius={2} tone="default">
              <Text family="monospace" size={1}>
                SANITY_STUDIO_ARENA_ACCESS_TOKEN=your_token_here
              </Text>
            </Card>
            <Text muted size={1}>
              Or pass it directly via plugin config:{' '}
              <code>{"arenaSyncPlugin({ arenaAccessToken: '...' })"}</code>
            </Text>
          </Stack>
        </Card>
      </Box>
    )
  }

  // Loading
  if (loading) {
    return (
      <Flex align="center" justify="center" padding={6}>
        <Spinner size={4} />
      </Flex>
    )
  }

  // Error
  if (error) {
    return (
      <Box padding={5}>
        <Card padding={5} radius={3} shadow={1} tone="critical">
          <Stack space={4}>
            <Heading size={3}>Failed to load Are.na data</Heading>
            <Text>{error}</Text>
            <Button text="Retry" tone="primary" onClick={loadArena} />
          </Stack>
        </Card>
      </Box>
    )
  }

  const syncEndpoint =
    configDoc?.syncEndpoint ||
    (typeof import.meta !== 'undefined' && import.meta.env?.SANITY_STUDIO_SYNC_ENDPOINT) ||
    ''

  return (
    <Box padding={[3, 3, 4, 5]}>
      <Stack space={4}>
        {/* ---- Header ---- */}
        <Flex align="center" gap={3}>
          {user?.avatar && <Avatar src={user.avatar} size={1} />}
          <Stack space={2} flex={1}>
            <Heading size={3}>{user?.name || 'Are.na Sync'}</Heading>
            <Text muted size={1}>
              {selectedSlugs.length} of {channels.length} channels selected for sync
            </Text>
          </Stack>
          {syncEndpoint && (
            <Button
              text="Trigger Sync"
              icon={isTriggeringSync ? Spinner : SyncIcon}
              tone="positive"
              disabled={isTriggeringSync}
              onClick={handleTriggerSync}
            />
          )}
        </Flex>

        {/* ---- Last Sync Status ---- */}
        <Card padding={3} radius={2} tone={configDoc?.lastSyncDate ? 'positive' : 'default'}>
          <Flex align="center" gap={2}>
            {configDoc?.lastSyncDate ? <CheckmarkCircleIcon /> : <CloseCircleIcon />}
            <Text size={1}>
              {configDoc?.lastSyncDate
                ? `Last sync: ${new Date(configDoc.lastSyncDate).toLocaleString()}`
                : 'No sync recorded'}
            </Text>
            {configDoc?.lastSyncStatus && (
              <Text muted size={0} style={{marginLeft: 'auto'}}>
                {configDoc.lastSyncStatus}
              </Text>
            )}
          </Flex>
        </Card>

        {/* ---- Search + Filters ---- */}
        <Flex gap={3} align="center" wrap="wrap">
          <Box flex={1} style={{minWidth: 200}}>
            <TextInput
              icon={SearchIcon}
              placeholder="Search channels..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
          </Box>
          <Inline space={1}>
            {FILTERS.map((f) => (
              <Button
                key={f.id}
                text={f.label}
                mode={filter === f.id ? 'default' : 'ghost'}
                tone={filter === f.id ? 'primary' : 'default'}
                fontSize={1}
                padding={2}
                onClick={() => setFilter(f.id)}
              />
            ))}
          </Inline>
        </Flex>

        {/* ---- Toolbar ---- */}
        <Flex gap={2} align="center">
          <Button text="Select All" mode="ghost" fontSize={1} padding={2} onClick={selectAllVisible} />
          <Button
            text="Deselect All"
            mode="ghost"
            fontSize={1}
            padding={2}
            onClick={deselectAllVisible}
          />
          <Box flex={1} />
          <Badge tone="default">
            {filteredChannels.length} channel{filteredChannels.length !== 1 ? 's' : ''}
          </Badge>
        </Flex>

        {/* ---- Channel Grid ---- */}
        {filteredChannels.length === 0 ? (
          <Card padding={5} tone="transparent" radius={2}>
            <Flex align="center" justify="center">
              <Text muted>No channels match your search.</Text>
            </Flex>
          </Card>
        ) : (
          <Grid columns={[1, 1, 2, 3]} gap={3}>
            {filteredChannels.map((ch) => (
              <ChannelCard
                key={ch.slug}
                channel={ch}
                selected={selectedSlugs.includes(ch.slug)}
                onToggle={toggleChannel}
              />
            ))}
          </Grid>
        )}

      </Stack>
    </Box>
  )
}

export default ArenaSyncTool

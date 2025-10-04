// my-arena-sync-plugin/src/ArenaSyncTool.jsx
import React, {useState, useCallback, useEffect} from 'react'
import {
  Box,
  Card,
  Heading,
  Text,
  Button,
  Spinner,
  Stack,
  useToast,
  Code,
  Flex,
  Badge,
} from '@sanity/ui'
import {useClient} from 'sanity'
import {LinkIcon} from '@sanity/icons'

const SANITY_API_VERSION = '2024-05-15'
const CONFIG_DOC_ID = 'arenaSyncConfiguration'

const ArenaSyncTool = () => {
  const client = useClient({apiVersion: SANITY_API_VERSION})
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [config, setConfig] = useState(null)
  const [isTriggeringSync, setIsTriggeringSync] = useState(false)
  const toast = useToast()

  const fetchConfig = useCallback(async () => {
    setIsLoading(true)
    try {
      const fetchedConfig = await client.getDocument(CONFIG_DOC_ID)
      setConfig(fetchedConfig)
      if (!fetchedConfig) {
        setStatusMessage(
          'Are.na Sync Configuration document not found. Please create it with the ID "arenaSyncConfiguration".',
        )
      } else {
        setStatusMessage('Configuration loaded.')
      }
    } catch (error) {
      // Log the full error for better debugging
      console.error('Failed to fetch config:', error)
      setStatusMessage(`Error fetching config: ${error.message}`)
      toast.push({status: 'error', title: 'Failed to load config', description: error.message})
    }
    setIsLoading(false)
  }, [client, toast])

  useEffect(() => {
    fetchConfig()
    const subscription = client.listen(`*[_id == "${CONFIG_DOC_ID}"]`).subscribe((update) => {
      setConfig(update.result)
      toast.push({status: 'info', title: 'Sync configuration updated.'})
    })
    return () => subscription.unsubscribe()
  }, [client, fetchConfig, toast])

  const handleManualSyncTrigger = useCallback(async () => {
    setIsTriggeringSync(true)
    setStatusMessage('Attempting to trigger manual sync...')
    toast.push({
      status: 'info',
      title: 'Triggering Sync...',
      description: 'This will invoke the backend sync function.',
    })

    try {
      // Optional: allow URL to come from config doc if you add it later
      const syncApiEndpoint =
        (config && config.syncEndpoint) || 'https://melisacenik.xyz/api/sync-arena-channels'

      const response = await fetch(syncApiEndpoint, {method: 'POST'})

      if (!response.ok) {
        let errorMessage = `API request failed with status ${response.status}: ${response.statusText}`
        try {
          // prefer JSON body if present
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            const errorData = await response.json()
            errorMessage = errorData.message || errorData.error || errorMessage
          } else {
            const errorText = await response.text()
            if (errorText) errorMessage = `${errorMessage} - ${errorText}`
          }
        } catch {
          /* ignore parse errors */
        }
        throw new Error(errorMessage)
      }

      // Parse success response
      let result = {}
      try {
        result = await response.json()
      } catch {
        throw new Error('API returned a non-JSON response')
      }

      // Accept either "success" or "overallSuccess"
      const ok = result.success ?? result.overallSuccess ?? false

      if (!ok) {
        throw new Error(result.message || 'API reported an unsuccessful sync operation.')
      }

      const summary = [
        result.message || 'Sync completed.',
        result.syncRunId ? `Run: ${result.syncRunId}` : null,
        typeof result.updatedOrCreated === 'number'
          ? `Updated/created: ${result.updatedOrCreated}`
          : null,
      ]
        .filter(Boolean)
        .join(' • ')

      setStatusMessage(summary)
      toast.push({
        status: 'success',
        title: 'Sync Triggered',
        description: summary,
      })

      // Refresh the config/status box
      fetchConfig()
    } catch (error) {
      console.error('Manual sync trigger failed:', error)
      setStatusMessage(`Error triggering sync: ${error.message}`)
      toast.push({status: 'error', title: 'Sync Trigger Failed', description: error.message})
    } finally {
      setIsTriggeringSync(false)
    }
  }, [toast, fetchConfig, config])

  // The rest of your JSX remains the same
  return (
    <Card padding={5} radius={3} shadow={1}>
      <Stack space={5}>
        <Heading as="h1" size={4}>
          Are.na Channel Sync Dashboard
        </Heading>
        {isLoading && (
          <Flex align="center" justify="center">
            <Spinner size={3} />
          </Flex>
        )}

        {!isLoading && !config && (
          <Card padding={4} tone="critical" radius={2} shadow={1}>
            <Flex gap={2} align="center">
              <Badge tone="critical" fontSize={2}>
                {' '}
                {/* Consider using an Icon component here */}!
              </Badge>
              <Text>
                Configuration document not found. Please create a document with ID{' '}
                <Code>{CONFIG_DOC_ID}</Code> of type <Code>arenaSyncConfig</Code>.
              </Text>
            </Flex>
          </Card>
        )}

        {config && (
          <Stack space={5}>
            {/* Channels */}
            <Box>
              <Heading as="h2" size={3}>
                Channels Being Synced:
              </Heading>
              {config.channelSlugs && config.channelSlugs.length > 0 ? (
                <Flex gap={2} wrap="wrap" marginTop={2}>
                  {config.channelSlugs.map((slug) => (
                    <Badge key={slug} tone="primary" padding={2}>
                      {slug}
                    </Badge>
                  ))}
                </Flex>
              ) : (
                <Text muted>No channels configured for sync.</Text>
              )}
            </Box>

            {/* Last Sync Status */}
            <Box>
              <Heading as="h2" size={3}>
                Last Sync Status:
              </Heading>
              <Text muted size={1} marginTop={1}>
                {config.lastSyncDate
                  ? `As of: ${new Date(config.lastSyncDate).toLocaleString()}`
                  : 'No sync recorded.'}
              </Text>
              <Box
                marginTop={2}
                padding={3}
                radius={2}
                style={{border: '1px solid var(--card-border-color)', whiteSpace: 'pre-wrap'}}
              >
                <Text size={1}>{config.lastSyncStatus || 'No status recorded.'}</Text>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Flex gap={3} direction={['column', 'sm:row']} marginTop={1}>
              <Button
                text="Edit Sync Configuration"
                tone="primary"
                icon={LinkIcon}
                onClick={() => {
                  window.location.href = `structure/areNaSyncConfiguration`
                }}
              />
              <Button
                text="Refresh Status"
                onClick={fetchConfig}
                disabled={isLoading}
                tone="default"
              />
            </Flex>
          </Stack>
        )}

        {/* Manual Sync Section */}
        <Box style={{borderTop: '1px solid var(--card-border-color)'}} paddingTop={4} marginTop={4}>
          {' '}
          {/* Added marginTop for better separation */}
          <Heading as="h2" size={3}>
            Manual Sync
          </Heading>
          <Text size={2} muted>
            {' '}
            {/* Increased size for better readability */}
            The sync runs automatically every 10 minutes. You can also trigger it manually.
          </Text>
          <Button
            marginTop={3}
            text="Trigger Full Sync Now"
            tone="positive"
            onClick={handleManualSyncTrigger}
            disabled={isTriggeringSync || isLoading}
            icon={isTriggeringSync ? Spinner : undefined}
          />
        </Box>

        {/* Status Message */}
        {!!statusMessage &&
          !isLoading && ( // Ensure statusMessage is not empty before rendering Text
            <Text muted size={1} marginTop={2}>
              {' '}
              {/* Added marginTop */}
              {statusMessage}
            </Text>
          )}
      </Stack>
    </Card>
  )
}

export default ArenaSyncTool

import {Card, Text, Badge, Flex, Stack, Box} from '@sanity/ui'

const PLACEHOLDER =
  'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect width=%22200%22 height=%22200%22 fill=%22%23e8e8e8%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2214%22%3ENo image%3C/text%3E%3C/svg%3E'

function typeTone(blockType) {
  switch (blockType) {
    case 'Image':
      return 'primary'
    case 'Text':
      return 'positive'
    case 'Link':
      return 'caution'
    case 'Attachment':
      return 'default'
    case 'Media':
      return 'critical'
    default:
      return 'default'
  }
}

export default function BlockCard({block, onClick}) {
  const thumbUrl = block.thumbUrl || PLACEHOLDER

  return (
    <Card
      padding={2}
      radius={2}
      shadow={1}
      tone={block.isOrphan ? 'caution' : 'default'}
      style={{cursor: 'pointer', overflow: 'hidden'}}
      onClick={() => onClick(block)}
    >
      <Stack space={2}>
        <Box
          style={{
            width: '100%',
            paddingTop: '100%',
            position: 'relative',
            borderRadius: 4,
            overflow: 'hidden',
            background: '#f0f0f0',
          }}
        >
          <img
            src={thumbUrl}
            alt={block.title || ''}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </Box>

        <Box padding={1}>
          <Stack space={2}>
            <Text size={1} weight="semibold" textOverflow="ellipsis">
              {block.title || `Block ${block.arenaId}`}
            </Text>
            <Flex gap={2} align="center" wrap="wrap">
              <Badge tone={typeTone(block.blockType)} fontSize={0}>
                {block.blockType}
              </Badge>
              {block.isOrphan && (
                <Badge tone="caution" fontSize={0}>
                  Orphan
                </Badge>
              )}
            </Flex>
            {block.channelSlugs?.length > 0 && (
              <Text size={0} muted textOverflow="ellipsis">
                {block.channelSlugs.join(', ')}
              </Text>
            )}
          </Stack>
        </Box>
      </Stack>
    </Card>
  )
}

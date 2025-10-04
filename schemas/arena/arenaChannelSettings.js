export default {
  name: 'arenaChannelSettings',
  title: 'Are.na Channel Settings',
  type: 'document',
  fields: [
    {
      name: 'isVisible',
      title: 'Visible on Website',
      type: 'boolean',
      description: 'Whether this channel should be visible on the website',
      initialValue: true,
    },
    {
      name: 'channelColor',
      title: 'Channel Color',
      type: 'color',
      description: 'Color associated with this channel for visualization',
      options: {
        disableAlpha: true,
        colorList: [
          '#000000', // Black
          '#555555', // Dark Gray
          '#E31A1C', // Red
          '#33A02C', // Green
          '#1F78B4', // Blue
          '#B15928', // Brown
          '#FFD700', // Yellow
          '#6A3D9A', // Purple
          '#1FB6AA', // Teal
          '#FB8C00', // Orange
        ],
      },
    },
  ],
}

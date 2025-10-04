import { syncArenaChannels } from '@arena-sanity/core';
export default async function handler() {
  return await syncArenaChannels({ options: { channels: [] } });
}

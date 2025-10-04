import {
  syncArenaChannels,
  createSanityClient,
  createArenaClient,
} from "@arena-sanity/core";

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig();

  // (Optional) simple bearer for manual triggering
  // const auth = getHeader(event, 'authorization');
  // if (process.env.SYNC_CRON_SECRET && auth !== `Bearer ${process.env.SYNC_CRON_SECRET}`) {
  //   throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  // }

  // build clients
  const sanity = createSanityClient({
    projectId: cfg.sanityProjectId!,
    dataset: cfg.sanityDataset!,
    token: cfg.sanityApiToken!,
  });
  const arena = createArenaClient({ accessToken: cfg.arenaAccessToken! });

  // for demo: accept channels via JSON body OR env list
  const body = await readBody<{ channels?: string[] }>(event).catch(
    () => ({} as any)
  );
  const channelsEnv = (process.env.ARENA_CHANNELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const channels = body?.channels?.length ? body.channels : channelsEnv;

  if (!channels.length) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'No channels provided. Pass JSON { "channels": ["slug1","slug2"] } or set ARENA_CHANNELS in env.',
    });
  }

  const result = await syncArenaChannels({
    sanity,
    arena,
    options: {
      channels,
      perPage: 100,
      imageUpload: "auto",
      imageConcurrency: 3,
      timeBudgetMs: 260_000,
    },
  });

  setResponseStatus(event, result.success ? 200 : 500);
  return result;
});

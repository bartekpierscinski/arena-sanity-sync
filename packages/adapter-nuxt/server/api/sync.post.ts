// server/api/sync.post.ts
import { syncArenaChannels } from "arena-sanity-core";
import { createClient } from "@sanity/client";
import { createArenaClient } from "../utils/arenaClient";

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig();

  // Optional: simple auth
  const secret = cfg.SYNC_CRON_SECRET || process.env.SYNC_CRON_SECRET;
  const auth = getHeader(event, "authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    setResponseStatus(event, 401);
    return { success: false, message: "Unauthorized" };
  }

  const sanity = createClient({
    projectId: cfg.sanityProjectId!,
    dataset: cfg.sanityDataset!,
    token: cfg.sanityApiToken!,
    apiVersion: "2024-05-15",
    useCdn: false,
  });

  const arena = createArenaClient({ accessToken: cfg.arenaAccessToken! });

  const body = await readBody<{ channels?: string[] }>(event).catch(
    () => ({}) as any,
  );

  const envChannels = (process.env.ARENA_CHANNELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const channels = (
    body?.channels?.length ? body.channels : envChannels
  ).filter(Boolean);

  if (!channels.length) {
    setResponseStatus(event, 400);
    return {
      success: false,
      message: "No channels provided. Pass in body or ARENA_CHANNELS.",
    };
  }

  const result = await syncArenaChannels({
    arena,
    sanity,
    options: {
      channels,
      imageUpload: "auto",
      imageConcurrency: 3,
      timeBudgetMs: 260_000,
      onLog: (e) => console.log(JSON.stringify(e)),
    },
  });

  setResponseStatus(event, result.success ? 200 : 500);
  return result;
});

import {
  SyncOptions,
  SyncResult,
  ChannelResult,
  ArenaClient,
  SanityClientLite,
  ImageUploadMode,
} from "./types.js";
import {
  delay,
  withTimeout,
  retry,
  fetchWithTimeout,
  sanitizeObjectForSanity,
  pruneArenaRaw,
  buildImageSignature,
  computeFingerprint,
  ensureKeys,
  channelsEqual,
  mergeChannels,
} from "./utils.js";

// Fields you allow core to write (protects user-edited fields)
const ARENA_OWNED = new Set([
  "arenaId",
  "arenaBlockUrl",
  "blockType",
  "description",
  "contentHtml",
  "sourceUrl",
  "sourceTitle",
  "sourceProviderName",
  "arenaCreatedAt",
  "arenaUpdatedAt",
  "rawArenaData",
  "externalImageUrl",
  "externalImageThumbUrl",
  "channels",
  "arenaImageSignature",
  "arenaFingerprint",
  "isOrphan",
  "lastSyncedAt",
  "lastSyncedBy",
]);

function shouldUploadImage(
  mode: ImageUploadMode,
  ctx: { existing: any; imageSignatureChanged: boolean },
) {
  if (mode === "off") return false;
  if (mode === "on") return ctx.imageSignatureChanged;
  // 'auto'
  return !ctx.existing?.mainImage && ctx.imageSignatureChanged;
}

export async function syncArenaChannels(input: {
  arena: ArenaClient;
  sanity: SanityClientLite;
  options: SyncOptions;
}): Promise<SyncResult> {
  const { arena, sanity } = input;
  const opts: Required<SyncOptions> = {
    perPage: 100,
    arenaTimeoutMs: 15000,
    imageTimeoutMs: 15000,
    sanityTimeoutMs: 20000,
    retries: 3,
    backoffMs: 600,
    logProgressEvery: 25,
    heartbeatMs: 10000,
    imageUpload: "auto",
    imageConcurrency: 3,
    normalizeChannels: true,
    driftFix: true,
    timeBudgetMs: Number.MAX_SAFE_INTEGER,
    onLog: () => {},
    ...input.options,
  };

  const startedAt = Date.now();
  const withinBudget = () =>
    Date.now() - startedAt < (opts.timeBudgetMs ?? Number.MAX_SAFE_INTEGER);

  const syncRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const statusMessages: string[] = [];
  const detailedResults: (ChannelResult & { channel: string })[] = [];
  let totalUpdatedOrCreated = 0;
  let overallSuccess = true;

  // Build channelMap (slug -> title), if possible
  const channelMap = new Map<string, string>();
  for (const slug of opts.channels) {
    try {
      if (arena.getChannelInfo) {
        const info = await arena.getChannelInfo(slug);
        channelMap.set(slug, info?.title || slug);
      } else {
        // fallback: resolve title from page 1 call later
        channelMap.set(slug, slug);
      }
    } catch {
      channelMap.set(slug, slug);
    }
  }

  const log = (
    lvl: "log" | "warn" | "error",
    msg: string,
    extra: Record<string, unknown> = {},
  ) => opts.onLog?.({ run: syncRunId, lvl, msg, ...extra });

  for (const channelSlug of opts.channels) {
    const res = await syncSingleChannel({
      arena,
      sanity,
      channelSlug,
      channelMap,
      opts,
      syncRunId,
      withinBudget,
      log,
    });
    detailedResults.push({ channel: channelSlug, ...res });
    totalUpdatedOrCreated += (res.created || 0) + (res.updated || 0);
    statusMessages.push(`${channelSlug}: ${res.message}`);
    if (!res.success) overallSuccess = false;
    if (!withinBudget()) break; // time budget soft stop
  }

  const allFailed =
    detailedResults.length && detailedResults.every((r) => !r.success);
  return {
    success: !allFailed,
    overallSuccess: !allFailed,
    message: allFailed
      ? "One or more channels failed during sync."
      : "All channels processed successfully.",
    syncRunId,
    updatedOrCreated: totalUpdatedOrCreated,
    channels: detailedResults,
    statusMessages,
  };
}

// -----------------------------
// Per-channel implementation
// -----------------------------
async function syncSingleChannel(ctx: {
  arena: ArenaClient;
  sanity: SanityClientLite;
  channelSlug: string;
  channelMap: Map<string, string>;
  opts: Required<SyncOptions>;
  syncRunId: string;
  withinBudget: () => boolean;
  log: (
    lvl: "log" | "warn" | "error",
    msg: string,
    extra?: Record<string, unknown>,
  ) => void;
}): Promise<ChannelResult> {
  const {
    arena,
    sanity,
    channelSlug,
    channelMap,
    opts,
    syncRunId,
    withinBudget,
    log,
  } = ctx;

  let page = 1;
  let totalPages = 1;
  const seenIds = new Set<number | string>();
  const stats = {
    created: 0,
    updated: 0,
    skippedUnchanged: 0,
    errors: 0,
    orphanedUpdated: 0,
  };
  let processedInChannel = 0;
  const heartbeat = setInterval(
    () => log("log", "heartbeat", { ch: channelSlug }),
    opts.heartbeatMs,
  );

  const processPage = async (blocks: any[]) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return;
    for (const block of blocks) {
      if (!withinBudget()) break;

      try {
        if (!block?.id && block?.id !== 0) {
          log("warn", "invalid_block", { ch: channelSlug });
          continue;
        }
        seenIds.add(block.id);
        const docId = `arenaBlock-${block.id}`;

        let existing: any = null;
        try {
          existing = await sanity.getDocument(docId);
        } catch (readErr: any) {
          log("warn", "get_document_failed", {
            id: block.id,
            err: readErr?.message,
          });
        }

        const blockChannels = [
          {
            slug: channelSlug,
            title: channelMap.get(channelSlug) || channelSlug,
          },
        ];
        const channels = mergeChannels(
          existing?.channels,
          blockChannels,
          channelMap,
        );

        const imageSignature = buildImageSignature(block);
        const fingerprint = computeFingerprint(block);
        const arenaUpdatedAt = block.updated_at;
        const sourceTitle = block.title || block.generated_title || null;
        const fallbackTitle = `Block ${block.id}`;

        // idempotent short-circuit
        if (
          existing &&
          existing.arenaUpdatedAt === arenaUpdatedAt &&
          existing.arenaFingerprint === fingerprint
        ) {
          if (existing.lockAll) {
            stats.skippedUnchanged++;
          } else {
            const merged = mergeChannels(
              existing?.channels,
              channels,
              channelMap,
            );
            if (!channelsEqual(merged, existing.channels || [])) {
              await sanity
                .patch(docId)
                .set({
                  channels: merged,
                  lastSyncedAt: new Date().toISOString(),
                  lastSyncedBy: "arena-sync",
                })
                .commit();
              stats.updated++;
            } else {
              stats.skippedUnchanged++;
            }
          }
          processedInChannel++;
          if (processedInChannel % opts.logProgressEvery === 0)
            log("log", "progress", {
              ch: channelSlug,
              processed: processedInChannel,
            });
          continue;
        }

        // image upload policy
        const ownership = existing?.syncPolicy?.owner || {};
        const allowImageUpdate =
          !existing ||
          (!existing.lockAll &&
            !existing.lockImage &&
            ownership.mainImage !== "studio");
        const imageSignatureChanged =
          !!imageSignature && imageSignature !== existing?.arenaImageSignature;

        let mainImagePatch: Record<string, unknown> = {};
        const wantUpload =
          allowImageUpdate &&
          shouldUploadImage(opts.imageUpload, {
            existing,
            imageSignatureChanged,
          });
        const canUpload =
          wantUpload && (block.class === "Image" || block.class === "Link");
        if (canUpload) {
          const url = block?.image?.original?.url;
          if (url) {
            try {
              log("log", "image_fetch_start", {
                id: block.id,
                host: safeHost(url),
              });
              const resp = await fetchWithTimeout(url, opts.imageTimeoutMs);
              if (!resp.ok) {
                log("warn", "image_fetch_not_ok", {
                  id: block.id,
                  status: resp.status,
                  statusText: resp.statusText,
                });
              } else {
                const buf = await resp.arrayBuffer();
                const asset = await sanity.assets.upload("image", buf, {
                  filename:
                    block.image.filename ||
                    `arena-${block.id}-${Date.now()}.${block.image.content_type ? block.image.content_type.split("/")[1] : "jpg"}`,
                });
                mainImagePatch.mainImage = {
                  _type: "image",
                  asset: { _type: "reference", _ref: asset._id },
                };
                log("log", "image_uploaded", {
                  id: block.id,
                  assetId: (asset as any)._id,
                });
              }
            } catch (e: any) {
              log("warn", "image_upload_failed", {
                id: block.id,
                err: e?.message,
              });
            }
          }
        }

        const arenaPatch = {
          channels,
          arenaId: block.id,
          arenaBlockUrl: `https://www.are.na/block/${block.id}`,
          blockType: block.class,
          description: block.description_html || null,
          contentHtml: block.content_html || null,
          sourceUrl: block.source?.url || null,
          sourceTitle,
          sourceProviderName: block.source?.provider?.name || null,
          externalImageUrl: block.image?.display?.url || null,
          externalImageThumbUrl: block.image?.thumb?.url || null,
          arenaCreatedAt: block.created_at,
          arenaUpdatedAt,
          rawArenaData: sanitizeObjectForSanity(pruneArenaRaw(block)),
          arenaImageSignature: imageSignature || null,
          arenaFingerprint: fingerprint || null,
          lastSyncedAt: new Date().toISOString(),
          lastSyncedBy: "arena-sync",
          ...mainImagePatch,
        };
        const filteredArenaPatch = Object.fromEntries(
          Object.entries(arenaPatch).filter(([k]) => ARENA_OWNED.has(k)),
        );

        if (!existing) {
          await sanity.create({
            _id: docId,
            _type: "areNaBlock",
            title: sourceTitle || fallbackTitle,
            ...filteredArenaPatch,
            syncPolicy: {
              owner: {
                title: "studio",
                sourceTitle: "arena",
                mainImage: "arena",
                channels: "arena",
              },
            },
          });
          stats.created++;
          log("log", "doc_committed", { id: block.id, action: "create" });
        } else {
          if (existing.lockAll) {
            stats.skippedUnchanged++;
          } else {
            const patch = sanity
              .patch(docId)
              .set(filteredArenaPatch)
              .unset(["rawArenaData.metadata", "rawArenaData.embed"])
              .setIfMissing({ title: sourceTitle || fallbackTitle })
              .setIfMissing({
                syncPolicy: {
                  owner: {
                    title: "studio",
                    sourceTitle: "arena",
                    mainImage: "arena",
                    channels: "arena",
                  },
                },
              });

            // Always merge channels non-destructively
            const merged = mergeChannels(
              existing?.channels,
              channels,
              channelMap,
            );
            patch.set({ channels: merged });

            await patch.commit();
            stats.updated++;
            log("log", "doc_committed", { id: block.id, action: "update" });
          }
        }

        processedInChannel++;
        if (processedInChannel % opts.logProgressEvery === 0)
          log("log", "progress", {
            ch: channelSlug,
            processed: processedInChannel,
          });
      } catch (perBlockErr: any) {
        stats.errors++;
        log("warn", "block_processing_failed", {
          id: block?.id,
          err: perBlockErr?.message,
        });
      }
    }
  };

  try {
    // initial fetch
    const initial = await retry(
      () =>
        withTimeout(
          arena.getChannelPage(channelSlug, { page, per: opts.perPage }),
          opts.arenaTimeoutMs,
          "arena.initial",
        ),
      {
        retries: opts.retries,
        backoffMs: opts.backoffMs,
        label: "arena.initial",
      },
    );

    if (!initial?.contents) {
      log("warn", "empty_channel", { ch: channelSlug });
      return {
        success: true,
        ...stats,
        message: "empty_or_inaccessible",
        blocksProcessed: 0,
      };
    }

    const channelTitle = initial.title || channelSlug;
    if (!channelMap.has(channelSlug)) channelMap.set(channelSlug, channelTitle);

    totalPages = initial.total_pages || 1;
    log("log", "first_page", {
      ch: channelSlug,
      count: initial.contents.length,
      totalPages,
    });

    await processPage(initial.contents);

    // subsequent pages
    for (page = 2; page <= totalPages && withinBudget(); page++) {
      log("log", "fetching_page", { ch: channelSlug, page, totalPages });
      const cp = await retry(
        () =>
          withTimeout(
            arena.getChannelPage(channelSlug, { page, per: opts.perPage }),
            opts.arenaTimeoutMs,
            "arena.page",
          ),
        {
          retries: opts.retries,
          backoffMs: opts.backoffMs,
          label: `arena.page.${page}`,
        },
      );
      const pageCount = cp?.contents?.length || 0;
      log("log", "page_fetched", { ch: channelSlug, page, added: pageCount });
      if (pageCount > 0) await processPage(cp.contents);
    }

    // drift fix
    if (opts.driftFix && withinBudget()) {
      const driftQuery =
        '*[_type=="areNaBlock" && channels[].slug==$slug]{ _id, arenaId, channels }';
      let docs: any[] = [];
      try {
        docs = await withTimeout(
          sanity.fetch(driftQuery, { slug: channelSlug }),
          opts.sanityTimeoutMs,
          "sanity.drift.fetch",
        );
      } catch (e: any) {
        log("warn", "drift_fetch_timeout", {
          ch: channelSlug,
          err: e?.message,
        });
        docs = [];
      }

      for (const d of docs) {
        if (!seenIds.has(d.arenaId)) {
          const newChannels = ensureKeys(
            (d.channels || []).filter((c: any) => c.slug !== channelSlug),
          );
          try {
            const patch = sanity.patch(d._id).set({
              channels: newChannels,
              lastSyncedAt: new Date().toISOString(),
              lastSyncedBy: "arena-sync",
            });
            if (!newChannels.length) patch.set({ isOrphan: true });
            await patch.commit();
            stats.orphanedUpdated++;
            log("log", "orphaned_updated", { id: d._id });
          } catch (patchErr: any) {
            stats.errors++;
            log("warn", "orphan_patch_failed", {
              id: d._id,
              err: patchErr?.message,
            });
          }
        }
      }
    }

    clearInterval(heartbeat);
    return {
      success: true,
      ...stats,
      message: "channel_processed",
      blocksProcessed: processedInChannel,
    };
  } catch (e: any) {
    clearInterval(heartbeat);
    log("error", "channel_error", { ch: channelSlug, error: e?.message });
    stats.errors++;
    return {
      success: false,
      ...stats,
      message: e?.message || "error",
      blocksProcessed: processedInChannel,
    };
  }
}

// helper
function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

export * from "./types.js";
export * from "./utils.js";
export { createSanityClient } from "./sanity.js";
export { createArenaClient } from "./arena.js";

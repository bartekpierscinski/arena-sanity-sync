import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncArenaChannels } from "./index.js";
import {
  makeBlock,
  createMockArenaClient,
  createMockSanityClient,
} from "./__test-helpers__/mocks.js";
import { computeFingerprint, buildImageSignature } from "./utils.js";

function setup(
  channelData: Record<string, any[][]>,
  channelTitles?: Record<string, string>,
) {
  const arena = createMockArenaClient(channelData, channelTitles);
  const sanity = createMockSanityClient();
  return { arena, sanity };
}

describe("syncArenaChannels", () => {
  // 1. Create new documents
  it("creates new documents for new blocks", async () => {
    const blocks = [makeBlock({ id: 1 }), makeBlock({ id: 2 }), makeBlock({ id: 3 })];
    const { arena, sanity } = setup({ "test-ch": [blocks] });

    const result = await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["test-ch"], imageUpload: "off" },
    });

    expect(result.success).toBe(true);
    expect(result.channels[0].created).toBe(3);
    expect(sanity._docs.has("arenaBlock-1")).toBe(true);
    expect(sanity._docs.has("arenaBlock-2")).toBe(true);
    expect(sanity._docs.has("arenaBlock-3")).toBe(true);

    const doc = sanity._docs.get("arenaBlock-1");
    expect(doc._type).toBe("areNaBlock");
    expect(doc._id).toBe("arenaBlock-1");
  });

  // 2. Idempotent skip
  it("skips unchanged blocks (same fingerprint + updatedAt)", async () => {
    const block = makeBlock({ id: 10 });
    const { arena, sanity } = setup({ ch: [[block]] });

    // Pre-populate with matching fingerprint
    sanity._docs.set("arenaBlock-10", {
      _id: "arenaBlock-10",
      _type: "areNaBlock",
      arenaUpdatedAt: block.updated_at,
      arenaFingerprint: computeFingerprint(block),
      channels: [{ _key: "k1", slug: "ch", title: "ch" }],
    });

    const result = await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch"], imageUpload: "off" },
    });

    expect(result.channels[0].skippedUnchanged).toBe(1);
    expect(result.channels[0].updated).toBe(0);
    expect(result.channels[0].created).toBe(0);
  });

  // 3. Update changed blocks
  it("updates blocks with different updatedAt", async () => {
    const block = makeBlock({ id: 20, updated_at: "2025-06-01T00:00:00.000Z" });
    const { arena, sanity } = setup({ ch: [[block]] });

    sanity._docs.set("arenaBlock-20", {
      _id: "arenaBlock-20",
      _type: "areNaBlock",
      arenaUpdatedAt: "2025-01-01T00:00:00.000Z", // older
      arenaFingerprint: "old-fp",
      channels: [{ _key: "k1", slug: "ch", title: "ch" }],
    });

    const result = await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch"], imageUpload: "off" },
    });

    expect(result.channels[0].updated).toBe(1);
    const doc = sanity._docs.get("arenaBlock-20");
    expect(doc.arenaUpdatedAt).toBe("2025-06-01T00:00:00.000Z");
  });

  // 4. Multi-channel membership
  it("block in 2 channels has both in channels array", async () => {
    const block = makeBlock({ id: 30 });
    const { arena, sanity } = setup({
      "ch-a": [[block]],
      "ch-b": [[block]],
    });

    await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch-a", "ch-b"], imageUpload: "off" },
    });

    const doc = sanity._docs.get("arenaBlock-30");
    const slugs = doc.channels.map((c: any) => c.slug);
    expect(slugs).toContain("ch-a");
    expect(slugs).toContain("ch-b");
  });

  // 5. lockAll flag
  it("skips document when lockAll is true", async () => {
    const block = makeBlock({ id: 40, updated_at: "2025-06-01T00:00:00.000Z" });
    const { arena, sanity } = setup({ ch: [[block]] });

    sanity._docs.set("arenaBlock-40", {
      _id: "arenaBlock-40",
      _type: "areNaBlock",
      lockAll: true,
      arenaUpdatedAt: "2025-01-01T00:00:00.000Z",
      arenaFingerprint: "old",
      channels: [{ _key: "k1", slug: "ch", title: "ch" }],
    });

    const result = await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch"], imageUpload: "off" },
    });

    expect(result.channels[0].skippedUnchanged).toBe(1);
    expect(result.channels[0].updated).toBe(0);
    // Original values unchanged
    expect(sanity._docs.get("arenaBlock-40").arenaUpdatedAt).toBe("2025-01-01T00:00:00.000Z");
  });

  // 6. lockImage flag
  it("updates fields but not image when lockImage is true", async () => {
    const block = makeBlock({
      id: 50,
      updated_at: "2025-06-01T00:00:00.000Z",
      type: "Image",
      image: {
        src: "https://example.com/new.jpg",
        file_size: 999,
        content_type: "image/jpeg",
        filename: "new.jpg",
        medium: { src: "https://example.com/display.jpg" },
        small: { src: "https://example.com/thumb.jpg" },
      },
    });
    const { arena, sanity } = setup({ ch: [[block]] });

    sanity._docs.set("arenaBlock-50", {
      _id: "arenaBlock-50",
      _type: "areNaBlock",
      lockImage: true,
      mainImage: { _type: "image", asset: { _ref: "old-asset" } },
      arenaUpdatedAt: "2025-01-01T00:00:00.000Z",
      arenaFingerprint: "old",
      channels: [{ _key: "k1", slug: "ch", title: "ch" }],
    });

    await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch"], imageUpload: "on" },
    });

    // mainImage should NOT have been changed (lockImage blocks image upload)
    expect(sanity._uploads.length).toBe(0);
    // But other fields should be updated
    const doc = sanity._docs.get("arenaBlock-50");
    expect(doc.arenaUpdatedAt).toBe("2025-06-01T00:00:00.000Z");
  });

  // 7. Image upload: off
  it("does not upload images when imageUpload is off", async () => {
    const block = makeBlock({
      id: 60,
      type: "Image",
      image: {
        src: "https://example.com/img.jpg",
        file_size: 100,
        medium: { src: "https://example.com/d.jpg" },
        small: { src: "https://example.com/t.jpg" },
      },
    });
    const { arena, sanity } = setup({ ch: [[block]] });

    await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch"], imageUpload: "off" },
    });

    expect(sanity._uploads.length).toBe(0);
  });

  // 8. Image upload: auto (new doc)
  it("uploads image for new doc when imageUpload is auto", async () => {
    const imgUrl = "https://example.com/auto-new.jpg";
    const block = makeBlock({
      id: 70,
      type: "Image",
      image: {
        src: imgUrl,
        file_size: 200,
        filename: "test.jpg",
        content_type: "image/jpeg",
        medium: { src: imgUrl },
        small: { src: imgUrl },
      },
    });
    const { arena, sanity } = setup({ ch: [[block]] });

    // Mock fetchWithTimeout by stubbing global fetch for the image URL
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      if (typeof url === "string" && url === imgUrl) {
        return new Response(new ArrayBuffer(10), { status: 200 });
      }
      return originalFetch(url, opts);
    });

    try {
      await syncArenaChannels({
        arena,
        sanity,
        options: { channels: ["ch"], imageUpload: "auto" },
      });

      expect(sanity._uploads.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 9. Image upload: auto (existing doc with mainImage)
  it("does not upload when auto and mainImage already exists", async () => {
    const block = makeBlock({
      id: 80,
      type: "Image",
      image: {
        src: "https://example.com/existing.jpg",
        file_size: 100,
        medium: { src: "https://example.com/d.jpg" },
        small: { src: "https://example.com/t.jpg" },
      },
    });
    const { arena, sanity } = setup({ ch: [[block]] });

    sanity._docs.set("arenaBlock-80", {
      _id: "arenaBlock-80",
      _type: "areNaBlock",
      mainImage: { _type: "image", asset: { _ref: "existing-asset" } },
      arenaUpdatedAt: "2024-01-01T00:00:00.000Z",
      arenaFingerprint: "old",
      arenaImageSignature: buildImageSignature(block),
      channels: [{ _key: "k1", slug: "ch", title: "ch" }],
    });

    await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch"], imageUpload: "auto" },
    });

    expect(sanity._uploads.length).toBe(0);
  });

  // 10. Image upload: on
  it("uploads when mode is 'on' and signature changed", async () => {
    const imgUrl = "https://example.com/on-new.jpg";
    const block = makeBlock({
      id: 90,
      type: "Image",
      updated_at: "2025-06-01T00:00:00.000Z",
      image: {
        src: imgUrl,
        file_size: 300,
        filename: "on.jpg",
        content_type: "image/jpeg",
        medium: { src: imgUrl },
        small: { src: imgUrl },
      },
    });
    const { arena, sanity } = setup({ ch: [[block]] });

    sanity._docs.set("arenaBlock-90", {
      _id: "arenaBlock-90",
      _type: "areNaBlock",
      mainImage: { _type: "image", asset: { _ref: "old" } },
      arenaUpdatedAt: "2025-01-01T00:00:00.000Z",
      arenaFingerprint: "old",
      arenaImageSignature: "old-sig", // different from current
      channels: [{ _key: "k1", slug: "ch", title: "ch" }],
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      if (typeof url === "string" && url === imgUrl) {
        return new Response(new ArrayBuffer(10), { status: 200 });
      }
      return originalFetch(url, opts);
    });

    try {
      await syncArenaChannels({
        arena,
        sanity,
        options: { channels: ["ch"], imageUpload: "on" },
      });

      expect(sanity._uploads.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 11. Drift detection
  it("removes orphaned channel reference and sets isOrphan", async () => {
    // Channel has no blocks
    const { arena, sanity } = setup({ ch: [[]] });

    // But sanity has a doc claiming to be in this channel
    sanity._docs.set("arenaBlock-100", {
      _id: "arenaBlock-100",
      _type: "areNaBlock",
      arenaId: 100,
      channels: [{ _key: "k1", slug: "ch", title: "ch" }],
    });

    await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch"], imageUpload: "off", driftFix: true },
    });

    const doc = sanity._docs.get("arenaBlock-100");
    expect(doc.channels).toEqual([]);
    expect(doc.isOrphan).toBe(true);
  });

  // 12. Error recovery
  it("continues processing after one block fails", async () => {
    const blocks = [
      makeBlock({ id: 110 }),
      makeBlock({ id: 111 }),
      makeBlock({ id: 112 }),
    ];
    const { arena, sanity } = setup({ ch: [blocks] });

    // Make create throw for block 111 — this triggers the per-block catch
    const origCreate = sanity.create.bind(sanity);
    sanity.create = async (doc: any) => {
      if (doc._id === "arenaBlock-111") {
        throw new Error("Simulated create failure");
      }
      return origCreate(doc);
    };

    const result = await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch"], imageUpload: "off" },
    });

    expect(result.channels[0].errors).toBe(1);
    // The other 2 blocks should still have been created
    expect(result.channels[0].created).toBe(2);
    expect(result.success).toBe(true);
  });

  // 13. Time budget
  it("stops early when timeBudgetMs is exceeded", async () => {
    // Spread blocks across multiple pages so the budget check fires between pages
    const page1 = Array.from({ length: 25 }, (_, i) => makeBlock({ id: 200 + i }));
    const page2 = Array.from({ length: 25 }, (_, i) => makeBlock({ id: 225 + i }));
    const { arena, sanity } = setup({ ch: [page1, page2] });

    // Stub Date.now to advance time after page 1 is done
    let callCount = 0;
    const realNow = Date.now;
    const start = realNow();
    vi.spyOn(Date, "now").mockImplementation(() => {
      callCount++;
      // After enough calls (page 1 processing), make time jump past budget
      if (callCount > 30) return start + 100_000;
      return start;
    });

    const result = await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch"], imageUpload: "off", timeBudgetMs: 50_000 },
    });

    vi.restoreAllMocks();

    // Should have processed page 1 but stopped before finishing page 2
    const totalProcessed =
      result.channels[0].created +
      result.channels[0].updated +
      result.channels[0].skippedUnchanged;
    expect(totalProcessed).toBeLessThan(50);
    expect(totalProcessed).toBeGreaterThan(0);
  });

  // 14. Empty channel
  it("returns success with empty_or_inaccessible for empty channel", async () => {
    const { arena, sanity } = setup({ empty: [[]] });

    // Override to return null contents
    const origArena = createMockArenaClient({});
    const mockArena = {
      ...origArena,
      async getChannelPage() {
        return { contents: null as any, total_pages: 0 };
      },
      async getChannelInfo() {
        return { title: "empty" };
      },
    };

    const result = await syncArenaChannels({
      arena: mockArena,
      sanity,
      options: { channels: ["empty"], imageUpload: "off" },
    });

    expect(result.success).toBe(true);
    expect(result.channels[0].message).toBe("empty_or_inaccessible");
  });

  // 15. ARENA_OWNED filtering
  it("does not leak extra block fields into sanity document", async () => {
    const block = makeBlock({
      id: 300,
      extraWeirdField: "should not appear",
      anotherCustom: 42,
    });
    const { arena, sanity } = setup({ ch: [[block]] });

    await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch"], imageUpload: "off" },
    });

    const doc = sanity._docs.get("arenaBlock-300");
    expect(doc.extraWeirdField).toBeUndefined();
    expect(doc.anotherCustom).toBeUndefined();
    // But arena-owned fields are present
    expect(doc.arenaId).toBe(300);
    expect(doc.blockType).toBe("Text");
  });

  // 16. Channels get _key
  it("every channels[] entry has a _key property", async () => {
    const blocks = [makeBlock({ id: 400 }), makeBlock({ id: 401 })];
    const { arena, sanity } = setup({ ch: [blocks] });

    await syncArenaChannels({
      arena,
      sanity,
      options: { channels: ["ch"], imageUpload: "off" },
    });

    for (const [, doc] of sanity._docs) {
      if (doc.channels) {
        for (const ch of doc.channels) {
          expect(ch._key).toBeDefined();
          expect(typeof ch._key).toBe("string");
          expect(ch._key.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

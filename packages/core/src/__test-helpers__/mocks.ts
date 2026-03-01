import type { ArenaClient, SanityClientLite, SanityPatchBuilder } from "../types.js";

// ─── Arena helpers ────────────────────────────────────────

/** Create a minimal Are.na block for testing */
export function makeBlock(overrides: Record<string, any> = {}) {
  const id = overrides.id ?? Math.floor(Math.random() * 100_000);
  return {
    id,
    title: `Block ${id}`,
    class: "Text",
    updated_at: "2025-01-01T00:00:00.000Z",
    created_at: "2025-01-01T00:00:00.000Z",
    description_html: null,
    content_html: `<p>Content of ${id}</p>`,
    generated_title: null,
    source: null,
    image: null,
    ...overrides,
  };
}

/**
 * Creates a mock ArenaClient backed by a provided map of slug → pages.
 * `channelData[slug]` is an array of pages where each page is an array of blocks.
 */
export function createMockArenaClient(
  channelData: Record<string, any[][]>,
  channelTitles?: Record<string, string>,
): ArenaClient {
  return {
    async getChannelPage(slug, { page }) {
      const pages = channelData[slug];
      if (!pages || pages.length === 0) {
        return { contents: [], total_pages: 0 };
      }
      const idx = page - 1; // pages are 1-based
      return {
        contents: pages[idx] ?? [],
        total_pages: pages.length,
        title: channelTitles?.[slug] ?? slug,
      };
    },
    async getChannelInfo(slug) {
      return { title: channelTitles?.[slug] ?? slug };
    },
  };
}

// ─── Sanity helpers ───────────────────────────────────────

/**
 * In-memory mock of SanityClientLite that tracks all operations.
 */
export function createMockSanityClient() {
  const docs = new Map<string, any>();
  const operations: Array<{ type: string; id?: string; data?: any }> = [];
  const uploads: Array<{ type: string; body: unknown; options?: any }> = [];

  function makePatchBuilder(id: string): SanityPatchBuilder {
    const sets: Record<string, unknown>[] = [];
    const unsets: string[][] = [];
    const setIfMissings: Record<string, unknown>[] = [];

    const builder: SanityPatchBuilder = {
      set(v) {
        sets.push(v);
        return builder;
      },
      unset(paths) {
        unsets.push(paths);
        return builder;
      },
      setIfMissing(v) {
        setIfMissings.push(v);
        return builder;
      },
      async commit() {
        const doc = docs.get(id) ?? { _id: id };
        // Apply setIfMissing first
        for (const obj of setIfMissings) {
          for (const [k, v] of Object.entries(obj)) {
            if (doc[k] === undefined || doc[k] === null) {
              doc[k] = v;
            }
          }
        }
        // Apply sets
        for (const obj of sets) {
          Object.assign(doc, obj);
        }
        // Apply unsets
        for (const paths of unsets) {
          for (const p of paths) {
            delete doc[p];
          }
        }
        docs.set(id, doc);
        operations.push({ type: "patch", id, data: { sets, unsets, setIfMissings } });
        return doc;
      },
    };
    return builder;
  }

  const client: SanityClientLite & {
    _docs: Map<string, any>;
    _operations: typeof operations;
    _uploads: typeof uploads;
  } = {
    _docs: docs,
    _operations: operations,
    _uploads: uploads,

    async getDocument(id: string) {
      return docs.get(id) ?? null;
    },

    async create(doc: any) {
      docs.set(doc._id, { ...doc });
      operations.push({ type: "create", id: doc._id, data: doc });
      return doc;
    },

    async fetch(query: string, params?: Record<string, unknown>) {
      // Simple mock: return docs matching channel slug if drift query
      if (query.includes("channels[].slug==$slug") && params?.slug) {
        return Array.from(docs.values()).filter((d: any) =>
          d.channels?.some((c: any) => c.slug === params.slug),
        );
      }
      return [];
    },

    patch(id: string) {
      return makePatchBuilder(id);
    },

    assets: {
      async upload(type: string, body: unknown, options?: any) {
        const assetId = `image-asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        uploads.push({ type, body, options });
        return { _id: assetId };
      },
    },
  };

  return client;
}

export type ImageUploadMode = "off" | "auto" | "on";

export interface SyncOptions {
  channels: string[]; // required
  perPage?: number; // default 100
  arenaTimeoutMs?: number; // default 15000
  imageTimeoutMs?: number; // default 15000
  sanityTimeoutMs?: number; // default 20000
  retries?: number; // default 3
  backoffMs?: number; // default 600
  logProgressEvery?: number; // default 25
  heartbeatMs?: number; // default 10000
  imageUpload?: ImageUploadMode; // default 'auto'
  imageConcurrency?: number; // default 3
  normalizeChannels?: boolean; // default true
  driftFix?: boolean; // default true
  timeBudgetMs?: number; // soft cap; optional
  onLog?: (evt: Record<string, unknown>) => void; // structured logs
}

export interface ChannelResult {
  channel: string;
  success: boolean;
  created: number;
  updated: number;
  skippedUnchanged: number;
  orphanedUpdated: number;
  errors: number;
  message: string;
  blocksProcessed: number;
}

export interface SyncResult {
  success: boolean;
  overallSuccess?: boolean; // kept for compatibility with your plugin
  message: string;
  updatedOrCreated: number;
  channels: (ChannelResult & { channel: string })[];
  statusMessages: string[];
  syncRunId: string;
}

export interface ArenaClient {
  // Must behave like: arena.channel(slug).get({page, per})
  getChannelPage: (
    slug: string,
    params: { page: number; per: number }
  ) => Promise<{ contents: any[]; total_pages?: number; title?: string }>;

  // Optional helper (so core can build channelMap); if not provided, titles fallback to slug.
  getChannelInfo?: (slug: string) => Promise<{ title?: string }>;
}

export interface SanityAssetRef {
  _id: string;
}

export interface SanityPatchBuilder {
  set(v: Record<string, unknown>): SanityPatchBuilder;
  unset(paths: string[]): SanityPatchBuilder;
  setIfMissing(v: Record<string, unknown>): SanityPatchBuilder;
  commit(): Promise<any>;
}

export interface SanityClientLite {
  getDocument: (id: string) => Promise<any | null>;
  create: (doc: any) => Promise<any>;
  fetch: (query: string, params?: Record<string, unknown>) => Promise<any>;
  patch: (id: string) => SanityPatchBuilder;
  assets: {
    upload: (
      type: "image",
      file: ArrayBuffer | Buffer | Blob,
      options?: any
    ) => Promise<SanityAssetRef>;
  };
}

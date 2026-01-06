export type ImageUploadMode = "off" | "auto" | "on";

export interface SyncOptions {
  channels: string[];
  perPage?: number;
  arenaTimeoutMs?: number;
  imageTimeoutMs?: number;
  sanityTimeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  logProgressEvery?: number;
  heartbeatMs?: number;
  imageUpload?: ImageUploadMode;
  imageConcurrency?: number;
  normalizeChannels?: boolean;
  driftFix?: boolean;
  timeBudgetMs?: number;
  onLog?: (e: Record<string, unknown>) => void;
}

/** Per-channel stats/result (NO 'channel' here) */
export interface ChannelResult {
  success: boolean;
  created: number;
  updated: number;
  skippedUnchanged: number;
  orphanedUpdated: number;
  errors: number;
  message: string;
  blocksProcessed: number;
}

/** Top-level result holds channel name alongside ChannelResult */
export interface SyncResult {
  success: boolean;
  overallSuccess?: boolean;
  message: string;
  updatedOrCreated: number;
  channels: Array<{ channel: string } & ChannelResult>;
  statusMessages: string[];
  syncRunId: string;
}

export interface ArenaClient {
  getChannelPage: (
    slug: string,
    params: { page: number; per: number },
  ) => Promise<{ contents: any[]; total_pages?: number; title?: string }>;
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
    // Be permissive so @sanity/client’s overloads fit structurally
    upload: (
      // real client accepts 'file' | 'image'
      type: string,
      // real client accepts Blob | File | ArrayBuffer | ArrayBufferView | Readable etc.
      body: unknown,
      options?: any,
    ) => Promise<SanityAssetRef | any>;
  };
}

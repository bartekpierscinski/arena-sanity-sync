// --- Small helpers (platform-agnostic) ---

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "timeout"
): Promise<T> {
  let timer: any;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function retry<T>(
  fn: () => Promise<T>,
  {
    retries = 3,
    backoffMs = 600,
    label = "retry",
  }: { retries?: number; backoffMs?: number; label?: string } = {}
): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await delay(backoffMs * attempt);
    }
  }
  const e = new Error(
    `${label} failed after ${retries} attempts: ${lastErr?.message || lastErr}`
  );
  (e as any).cause = lastErr;
  throw e;
}

// Use global fetch (Node 18+/browsers). If older Node, user can polyfill.
export async function fetchWithTimeout(url: string, ms: number) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), ms);
  try {
    const resp = await fetch(url, { signal: ac.signal });
    return resp;
  } finally {
    clearTimeout(to);
  }
}

export function sanitizeObjectForSanity(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((i) => sanitizeObjectForSanity(i));
  if (typeof obj === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = k.replace(/[^a-zA-Z0-9_-]/g, "_");
      out[key] = sanitizeObjectForSanity(v);
    }
    return out;
  }
  return obj;
}

export function pruneArenaRaw(block: any) {
  const pruned = { ...block };
  delete pruned.metadata;
  delete pruned.embed;
  return pruned;
}

export function buildImageSignature(block: any) {
  const orig = block?.image?.original;
  return orig?.url ? `${orig.url}|${orig.file_size || ""}` : null;
}

export function computeFingerprint(block: any) {
  try {
    const core = {
      id: block.id,
      title: block.title,
      class: block.class,
      updated_at: block.updated_at,
      description_html: block.description_html,
      source: block.source
        ? { url: block.source.url, title: block.source.title }
        : null,
      image: block.image?.original
        ? {
            url: block.image.original.url,
            size: block.image.original.file_size,
          }
        : null,
    };
    return btoa(JSON.stringify(core));
  } catch {
    return null;
  }
}

export function ensureKeys<T extends { _key?: string }>(arr: T[] = []): T[] {
  return (arr || []).map((item) =>
    item && typeof item === "object"
      ? item._key
        ? item
        : { ...item, _key: cryptoRandomUUID() }
      : item
  ) as any;
}

// light uuid without importing node:crypto in browser contexts
function cryptoRandomUUID() {
  if (typeof globalThis.crypto?.randomUUID === "function")
    return globalThis.crypto.randomUUID();
  // fallback (not RFC4122-strong, but fine for _key)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function channelsEqual(a: any[], b: any[]) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.slug !== b[i]?.slug) return false;
    if (a[i]?.title !== b[i]?.title) return false;
  }
  return true;
}

export function mergeChannels(
  existing: any[] = [],
  fromArena: any[] = [],
  channelMap: Map<string, string>
) {
  const bySlug = new Map(
    (existing || []).filter(Boolean).map((c: any) => [c.slug, c])
  );
  for (const c of fromArena || []) {
    if (!c?.slug) continue;
    const prior = bySlug.get(c.slug);
    bySlug.set(c.slug, {
      _key: prior?._key || cryptoRandomUUID(),
      slug: c.slug,
      title: channelMap.get(c.slug) || c.title || c.slug,
    });
  }
  const existingOrder = (existing || [])
    .map((c: any) => c?.slug)
    .filter(Boolean);
  const all = Array.from(bySlug.values());
  const added = all.filter((c: any) => !existingOrder.includes(c.slug));
  const kept = existingOrder.map((slug) => bySlug.get(slug)).filter(Boolean);
  return ensureKeys([...kept, ...added]);
}

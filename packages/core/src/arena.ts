import type { ArenaClient } from "./types.js";
import type {
  ArenaClientOptions,
  ArenaV3Meta,
  RateLimitState,
} from "./arena-types.js";
import { delay } from "./utils.js";

const DEFAULT_BASE_URL = "https://api.are.na/v3";
const MAX_429_RETRIES = 3;

/**
 * Typed error thrown when the Are.na v3 API returns a non-OK response.
 */
export class ArenaApiError extends Error {
  status: number;
  code: string;
  details?: string;

  constructor(status: number, body: { error: string; code: string; details?: string }) {
    super(body.error);
    this.name = "ArenaApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

function parseRateLimitHeaders(headers: Headers): RateLimitState | null {
  const limit = headers.get("x-ratelimit-limit");
  if (!limit) return null;
  return {
    limit: Number(limit),
    remaining: Number(headers.get("x-ratelimit-remaining") ?? 0),
    tier: headers.get("x-ratelimit-tier") ?? "unknown",
    windowSec: Number(headers.get("x-ratelimit-window") ?? 0),
    resetAt: Number(headers.get("x-ratelimit-reset") ?? 0),
  };
}

/**
 * Creates an ArenaClient backed by the Are.na v3 HTTP API using native fetch.
 *
 * Handles:
 * - Bearer token auth
 * - Rate limit observability via onRateLimit callback
 * - 429 retry with X-RateLimit-Reset backoff (up to 3 retries)
 * - Structured v3 error parsing into ArenaApiError
 */
export function createArenaClient(options: ArenaClientOptions): ArenaClient {
  const { accessToken, onRateLimit } = options;
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

  async function request(path: string, retries = 0): Promise<Response> {
    const url = `${baseUrl}${path}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Fire rate-limit callback for observability
    const rl = parseRateLimitHeaders(resp.headers);
    if (rl && onRateLimit) onRateLimit(rl);

    if (resp.status === 429) {
      if (retries >= MAX_429_RETRIES) {
        throw new ArenaApiError(429, {
          error: "Rate limited after max retries",
          code: "rate_limited",
        });
      }
      const resetAt = Number(resp.headers.get("x-ratelimit-reset") || 0);
      const waitMs = resetAt > 0
        ? Math.max(0, resetAt * 1000 - Date.now())
        : 1000 * (retries + 1);
      await delay(waitMs);
      return request(path, retries + 1);
    }

    if (!resp.ok) {
      let body: { error: string; code: string; details?: string };
      try {
        body = await resp.json();
      } catch {
        body = {
          error: resp.statusText || "Unknown error",
          code: "unknown",
        };
      }
      throw new ArenaApiError(resp.status, body);
    }

    return resp;
  }

  return {
    async getChannelPage(
      slug: string,
      { page, per }: { page: number; per: number },
    ) {
      const encoded = encodeURIComponent(slug);
      const resp = await request(
        `/channels/${encoded}/contents?page=${page}&per=${per}`,
      );
      const json = await resp.json();

      // v3 returns { data: [...], meta: { ... } }
      const data: any[] = json.data ?? json.contents ?? [];
      const meta: ArenaV3Meta | undefined = json.meta;
      return {
        contents: data,
        total_pages: meta?.total_pages ?? json.total_pages ?? 1,
        title: json.title,
      };
    },

    async getChannelInfo(slug: string) {
      const encoded = encodeURIComponent(slug);
      const resp = await request(`/channels/${encoded}`);
      const json = await resp.json();
      return { title: json.title ?? json.data?.title };
    },
  };
}

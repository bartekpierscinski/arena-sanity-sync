// Types for the Are.na v3 API

/** Pagination metadata returned by v3 endpoints */
export interface ArenaV3Meta {
  current_page: number;
  total_pages: number;
  total_count: number;
  per: number;
  has_more_pages: boolean;
}

/** Standard v3 paginated response envelope */
export interface ArenaV3Response<T> {
  data: T[];
  meta: ArenaV3Meta;
}

/** Structured error body from the v3 API */
export interface ArenaV3Error {
  error: string;
  code: string;
  details?: string;
}

/** Parsed rate-limit headers from v3 responses */
export interface RateLimitState {
  limit: number;
  remaining: number;
  tier: string;
  windowSec: number;
  resetAt: number;
}

/** Options accepted by createArenaClient */
export interface ArenaClientOptions {
  accessToken: string;
  baseUrl?: string;
  /** Called after every request with the parsed rate-limit headers */
  onRateLimit?: (state: RateLimitState) => void;
}

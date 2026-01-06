import type { ArenaClient } from "./types.js";

/**
 * Creates an ArenaClient using the 'are.na' npm package.
 *
 * Note: Requires 'are.na' package to be installed separately.
 * Install with: npm install are.na
 *
 * @example
 * ```ts
 * import { createArenaClient } from "arena-sanity-core";
 * const arena = createArenaClient({ accessToken: process.env.ARENA_ACCESS_TOKEN });
 * ```
 */
export function createArenaClient({
  accessToken,
}: {
  accessToken: string;
}): ArenaClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Arena = require("are.na");
  const api = new Arena({ accessToken });

  return {
    async getChannelPage(
      slug: string,
      { page, per }: { page: number; per: number }
    ) {
      const res = await api.channel(slug).get({ page, per });
      return {
        contents: res?.contents ?? [],
        total_pages: res?.total_pages ?? 1,
        title: res?.title,
      };
    },
    async getChannelInfo(slug: string) {
      const res = await api.channel(slug).get();
      return { title: res?.title };
    },
  };
}

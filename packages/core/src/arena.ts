import Arena from "are.na";

export function createArenaClient({ accessToken }: { accessToken: string }) {
  const api = new (Arena as any)({ accessToken });
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
  };
}

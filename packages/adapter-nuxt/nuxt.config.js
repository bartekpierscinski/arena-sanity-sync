// minimal
export default defineNuxtConfig({
  nitro: { preset: "node-server" },
  runtimeConfig: {
    // server only
    sanityProjectId: process.env.SANITY_PROJECT_ID,
    sanityDataset: process.env.SANITY_DATASET,
    sanityApiToken: process.env.SANITY_API_TOKEN,
    arenaAccessToken: process.env.ARENA_ACCESS_TOKEN,
    public: {},
  },
});

// sanity.config.ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { arenaSyncPlugin } from "sanity-plugin-arena-sync";
import { schemaTypes } from "./schemaTypes";
import Arena from "are.na"; // used only to resolve channel titles (optional)

// Schema / IDs used by the sync system
const ARENA_CONFIG_SCHEMA = "arenaSyncConfig"; // config doc schema
const ARENA_CONFIG_ID = "arenaSyncConfig"; // config doc _id (singleton)
const ARENA_BLOCK_SCHEMA = "areNaBlock"; // synced block schema
const ARENA_CHANNEL_SETTINGS_SCHEMA = "arenaChannelSettings"; // per-channel settings (optional)

// Optional: fetch pretty titles for channels if a token is available
async function fetchChannelTitles(slugs: string[]) {
  const token = process.env.SANITY_STUDIO_ARENA_ACCESS_TOKEN;
  if (!token) return slugs.map((slug) => ({ slug, title: slug }));
  const arena = new Arena({ accessToken: token });
  const results = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const data = await arena.channel(slug).get();
        return { slug, title: data?.title || slug };
      } catch {
        return { slug, title: slug };
      }
    }),
  );
  return results;
}

export default defineConfig({
  name: "default",
  title: "Studio",

  // replace with your project details
  projectId: "<your-project-id>",
  dataset: "<your-dataset>",

  plugins: [
    structureTool({
      structure: (S, { getClient }) =>
        S.list()
          .title("Content")
          .items([
            // 1) Are.na Sync Configuration (singleton)
            S.listItem()
              .title("Are.na Sync Configuration")
              .child(
                S.document()
                  .schemaType(ARENA_CONFIG_SCHEMA)
                  .documentId(ARENA_CONFIG_ID)
                  .title("Configure Are.na Sync"),
              ),

            S.divider(),

            // 2) Are.na Channels (dynamic list based on config)
            S.listItem()
              .title("Are.na Channels")
              .child(async () => {
                const client = getClient({ apiVersion: "2024-05-15" });
                const config = await client.fetch(
                  `*[_type == $t && _id == $id][0]`,
                  { t: ARENA_CONFIG_SCHEMA, id: ARENA_CONFIG_ID },
                );

                const slugs: string[] = config?.channelSlugs || [];
                if (!slugs.length) {
                  return S.component()
                    .title("No Channels Configured")
                    .id("arena-no-channels")
                    .setHtml(
                      "Add channel slugs in “Are.na Sync Configuration”.",
                    );
                }

                const channels = await fetchChannelTitles(slugs);

                return S.list()
                  .title("Are.na Channels")
                  .items(
                    channels.map(({ slug, title }) =>
                      S.listItem()
                        .title(title)
                        .id(slug)
                        .child(
                          S.list()
                            .title(`Channel: ${title}`)
                            .items([
                              // Blocks filtered by channel slug
                              S.listItem()
                                .title("Blocks")
                                .child(
                                  S.documentList()
                                    .title(`Blocks in ${title}`)
                                    .filter(
                                      `_type == $type && arenaChannelSlug == $slug`,
                                    )
                                    .params({ type: ARENA_BLOCK_SCHEMA, slug })
                                    .defaultOrdering([
                                      {
                                        field: "arenaCreatedAt",
                                        direction: "desc",
                                      },
                                    ]),
                                ),

                              // Optional: per-channel settings singleton
                              S.listItem()
                                .title("Settings")
                                .child(
                                  S.document()
                                    .schemaType(ARENA_CHANNEL_SETTINGS_SCHEMA)
                                    .documentId(
                                      `arena-channel-settings-${slug}`,
                                    )
                                    .title(`Settings for: ${title}`),
                                ),
                            ]),
                        ),
                    ),
                  );
              }),

            S.divider(),

            // 3) All Are.na Blocks (unfiltered)
            S.documentTypeListItem(ARENA_BLOCK_SCHEMA).title(
              "All Are.na Blocks",
            ),
          ]),
    }),

    // Studio-side dashboard (manual trigger + status)
    arenaSyncPlugin(),

    // Optional dev tool
    visionTool(),
  ],

  schema: { types: schemaTypes },
});

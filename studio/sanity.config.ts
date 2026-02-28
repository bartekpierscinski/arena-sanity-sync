import { colorInput } from "@sanity/color-input";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { arenaSyncPlugin } from "sanity-plugin-arena-sync";
import arenaBlock from "../schemas/arena/arenaBlock";
import arenaSyncConfig from "../schemas/arena/arenaSyncConfig";
import arenaChannelSettings from "../schemas/arena/arenaChannelSettings";

export default defineConfig({
  name: "arena-sync-studio",
  title: "Are.na Sync Studio",

  projectId: "xvcgq3yr",
  dataset: "production",

  plugins: [
    structureTool(),
    visionTool(),
    colorInput(),
    arenaSyncPlugin(),
  ],

  schema: {
    types: [arenaBlock, arenaSyncConfig, arenaChannelSettings],
  },
});

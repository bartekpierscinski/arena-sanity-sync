#!/usr/bin/env node

import { parseArgs } from "node:util";
import { syncArenaChannels } from "./index.js";
import { createSanityClient } from "./sanity.js";
import { createArenaClient } from "./arena.js";
import type { ImageUploadMode } from "./types.js";

const VERSION = "0.3.1";

const HELP = `
arena-sanity-core - Sync Are.na channels to Sanity

Usage:
  npx arena-sanity-core [options]

Options:
  -c, --channels <slugs>    Comma-separated channel slugs (required)
  -i, --image-upload <mode> Image upload mode: off, auto, on (default: auto)
  -d, --dry-run             Print what would happen without making changes
  -v, --verbose             Show detailed progress logs
  -h, --help                Show this help message
  --version                 Show version

Environment Variables (required):
  ARENA_ACCESS_TOKEN        Are.na API access token
  SANITY_PROJECT_ID         Sanity project ID
  SANITY_DATASET            Sanity dataset name
  SANITY_TOKEN              Sanity API token with write access

Examples:
  # Sync a single channel
  npx arena-sanity-core --channels my-channel

  # Sync multiple channels without images
  npx arena-sanity-core -c channel-1,channel-2 -i off

  # Verbose output
  npx arena-sanity-core -c my-channel -v
`;

interface CliOptions {
  channels: string[];
  imageUpload: ImageUploadMode;
  dryRun: boolean;
  verbose: boolean;
}

function parseCliArgs(): CliOptions | null {
  try {
    const { values } = parseArgs({
      options: {
        channels: { type: "string", short: "c" },
        "image-upload": { type: "string", short: "i" },
        "dry-run": { type: "boolean", short: "d", default: false },
        verbose: { type: "boolean", short: "v", default: false },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", default: false },
      },
      strict: true,
    });

    if (values.help) {
      console.log(HELP);
      process.exit(0);
    }

    if (values.version) {
      console.log(`arena-sanity-core v${VERSION}`);
      process.exit(0);
    }

    const channelsRaw = values.channels;
    if (!channelsRaw) {
      console.error("Error: --channels is required\n");
      console.log(HELP);
      process.exit(1);
    }

    const channels = channelsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    if (channels.length === 0) {
      console.error("Error: at least one channel slug is required\n");
      process.exit(1);
    }

    const imageUploadRaw = values["image-upload"] || "auto";
    if (!["off", "auto", "on"].includes(imageUploadRaw)) {
      console.error(`Error: invalid --image-upload value: ${imageUploadRaw}`);
      console.error("Valid options: off, auto, on\n");
      process.exit(1);
    }

    return {
      channels,
      imageUpload: imageUploadRaw as ImageUploadMode,
      dryRun: values["dry-run"] ?? false,
      verbose: values.verbose ?? false,
    };
  } catch (err: any) {
    console.error(`Error: ${err.message}\n`);
    console.log(HELP);
    process.exit(1);
  }
}

function getEnvOrExit(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Error: missing environment variable ${name}`);
    process.exit(1);
  }
  return value;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

async function main() {
  const opts = parseCliArgs();
  if (!opts) return;

  const arenaToken = getEnvOrExit("ARENA_ACCESS_TOKEN");
  const sanityProjectId = getEnvOrExit("SANITY_PROJECT_ID");
  const sanityDataset = getEnvOrExit("SANITY_DATASET");
  const sanityToken = getEnvOrExit("SANITY_TOKEN");

  console.log("arena-sanity-core sync");
  console.log("─".repeat(40));
  console.log(`Channels:     ${opts.channels.join(", ")}`);
  console.log(`Image upload: ${opts.imageUpload}`);
  if (opts.dryRun) console.log("Mode:         DRY RUN (no changes)");
  console.log("");

  if (opts.dryRun) {
    console.log("Dry run mode - would sync the following channels:");
    opts.channels.forEach((ch) => console.log(`  - ${ch}`));
    console.log("\nNo changes made.");
    process.exit(0);
  }

  const arena = createArenaClient({ accessToken: arenaToken });
  const sanity = createSanityClient({
    projectId: sanityProjectId,
    dataset: sanityDataset,
    token: sanityToken,
  }) as any;

  const startTime = Date.now();

  try {
    const result = await syncArenaChannels({
      arena,
      sanity,
      options: {
        channels: opts.channels,
        imageUpload: opts.imageUpload,
        onLog: opts.verbose
          ? (e: Record<string, unknown>) => {
              const lvl = String(e.lvl || "log");
              const msg = String(e.msg || "");
              const { lvl: _, msg: __, ...extra } = e;
              const timestamp = new Date().toISOString().slice(11, 19);
              const extraStr = Object.keys(extra).length
                ? ` ${JSON.stringify(extra)}`
                : "";
              console.log(`[${timestamp}] ${lvl.toUpperCase()} ${msg}${extraStr}`);
            }
          : undefined,
      },
    });

    const duration = Date.now() - startTime;
    console.log("");
    console.log("─".repeat(40));
    console.log(`Status:   ${result.success ? "SUCCESS" : "FAILED"}`);
    console.log(`Duration: ${formatDuration(duration)}`);
    console.log(`Updated:  ${result.updatedOrCreated} documents`);
    console.log("");

    if (result.channels) {
      console.log("Per-channel results:");
      for (const ch of result.channels) {
        const status = ch.success ? "✓" : "✗";
        console.log(
          `  ${status} ${ch.channel}: ${ch.created} created, ${ch.updated} updated, ${ch.skippedUnchanged} unchanged`
        );
        if (ch.errors && ch.errors > 0) {
          console.log(`    (${ch.errors} errors)`);
        }
      }
    }

    process.exit(result.success ? 0 : 1);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error("");
    console.error("─".repeat(40));
    console.error(`Status:   FAILED`);
    console.error(`Duration: ${formatDuration(duration)}`);
    console.error(`Error:    ${err.message}`);
    process.exit(1);
  }
}

main();

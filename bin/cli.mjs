#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = join(homedir(), ".mcp-server-untitled-ui");
const INDEX_PATH = join(DATA_DIR, "index.json");
const VERSION = "1.0.0";
const DEFAULT_TTL_DAYS = 7;

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.error(`mcp-server-untitled-ui v${VERSION}

Offline MCP server for Untitled UI components.

Usage:
  npx mcp-server-untitled-ui              Start server (auto-setup on first run)
  npx mcp-server-untitled-ui --setup      Download/rebuild index only
  npx mcp-server-untitled-ui --rebuild    Force re-download from GitHub
  npx mcp-server-untitled-ui --version    Print version
  npx mcp-server-untitled-ui --help       Show this help

Auto-refresh options:
  --ttl <days>         Days before the index is considered stale and rebuilt
                       automatically on startup (default: ${DEFAULT_TTL_DAYS})
  --no-auto-refresh    Disable automatic index refresh entirely`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.error(`mcp-server-untitled-ui v${VERSION}`);
  process.exit(0);
}

const forceRebuild = args.includes("--rebuild");
const setupOnly = args.includes("--setup");
const noAutoRefresh = args.includes("--no-auto-refresh");
const needsSetup = forceRebuild || !existsSync(INDEX_PATH);

/**
 * Parse --ttl <days> from argv, falling back to the UNTITLED_UI_MCP_REFRESH_DAYS
 * environment variable, and then to the built-in default.
 * @returns {number} TTL in days
 */
function parseTtlDays() {
  const ttlFlagIndex = args.indexOf("--ttl");
  if (ttlFlagIndex !== -1) {
    const value = parseFloat(args[ttlFlagIndex + 1]);
    if (!Number.isNaN(value) && value >= 0) return value;
    console.error(`Warning: invalid --ttl value "${args[ttlFlagIndex + 1]}", using default (${DEFAULT_TTL_DAYS} days).`);
  }
  const envValue = parseFloat(process.env.MCP_SERVER_UNTITLED_UI_REFRESH_DAYS ?? "");
  if (!Number.isNaN(envValue) && envValue >= 0) return envValue;
  return DEFAULT_TTL_DAYS;
}

/**
 * Returns true if the index should be rebuilt because it is older than ttlDays.
 * An index with a missing or unparseable generatedAt timestamp is always treated
 * as stale so that a corrupt or hand-edited file triggers a safe rebuild.
 * @param {object} index
 * @param {number} ttlDays
 * @returns {boolean}
 */
export function isIndexStale(index, ttlDays) {
  if (!index.generatedAt) return true;
  const generatedAt = new Date(index.generatedAt);
  if (Number.isNaN(generatedAt.getTime())) return true;
  const ageMs = Date.now() - generatedAt.getTime();
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  return ageMs > ttlMs;
}

async function setup() {
  const { downloadAll, cleanup } = await import("../src/download.mjs");
  const { buildIndex, writeIndex } = await import("../src/index-builder.mjs");

  const log = (msg) => console.error(msg);

  log("Downloading Untitled UI components from GitHub...");
  const { componentsDir, iconsDir, tempDir } = await downloadAll(log);

  try {
    log("Building index...");
    const index = buildIndex(componentsDir, iconsDir);
    writeIndex(index, INDEX_PATH);

    log(`Index built: ${index.components.length} components, ${index.icons.length} icons`);
    log(`Saved to ${INDEX_PATH}`);
    return index;
  } finally {
    cleanup(tempDir);
  }
}

async function main() {
  try {
    let index;

    if (needsSetup) {
      index = await setup();
      if (setupOnly || forceRebuild) {
        console.error("Setup complete.");
        process.exit(0);
      }
    } else {
      try {
        index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
      } catch (parseErr) {
        throw new Error(`Corrupt index file (${parseErr.message}). Re-run with --rebuild.`);
      }
      if (!Array.isArray(index.components) || !Array.isArray(index.icons)) {
        throw new Error("Corrupt index file. Re-run with --rebuild.");
      }

      if (!setupOnly && !noAutoRefresh) {
        const ttlDays = parseTtlDays();
        if (isIndexStale(index, ttlDays)) {
          const generatedAt = new Date(index.generatedAt);
          const ageMsg = Number.isNaN(generatedAt.getTime())
            ? "Index has unknown age"
            : `Index is ${Math.floor((Date.now() - generatedAt.getTime()) / (24 * 60 * 60 * 1000))} day(s) old`;
          console.error(
            `${ageMsg} (TTL: ${ttlDays} day(s)). Auto-refreshing...`
          );
          try {
            index = await setup();
          } catch (refreshErr) {
            console.error(`Auto-refresh failed (${refreshErr.message}), using existing index.`);
          }
        }
      }
    }

    if (setupOnly) {
      console.error("Index already exists. Use --rebuild to force re-download.");
      process.exit(0);
    }

    console.error("Starting MCP server on stdio...");
    const { startServer } = await import("../src/server.mjs");
    await startServer(index);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

// Only run when executed directly (not when imported by tests or other modules).
// Resolve symlinks so the check works when invoked via npx/npm bin links.
try {
  if (realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
    main();
  }
} catch {
  // realpathSync can throw if the path doesn't exist (e.g. esm loader edge cases)
  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
  }
}

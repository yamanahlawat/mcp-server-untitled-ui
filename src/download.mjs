import { createWriteStream, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pipeline } from "node:stream/promises";
import { get } from "node:https";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_REDIRECTS = 10;

const DEFAULT_COMPONENTS_TARBALL = "https://github.com/untitleduico/react/archive/refs/heads/main.tar.gz";
const DEFAULT_ICONS_TARBALL = "https://github.com/untitleduico/icons/archive/refs/heads/main.tar.gz";

/**
 * URL of the components tarball, overridable via
 * MCP_SERVER_UNTITLED_UI_COMPONENTS_URL to pin a release or use a private mirror.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function resolveComponentsUrl(env = process.env) {
  return env.MCP_SERVER_UNTITLED_UI_COMPONENTS_URL || DEFAULT_COMPONENTS_TARBALL;
}

/**
 * URL of the icons tarball, overridable via MCP_SERVER_UNTITLED_UI_ICONS_URL.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function resolveIconsUrl(env = process.env) {
  return env.MCP_SERVER_UNTITLED_UI_ICONS_URL || DEFAULT_ICONS_TARBALL;
}

function httpsGet(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirectCount >= MAX_REDIRECTS) {
          res.resume();
          reject(new Error(`Too many redirects (>${MAX_REDIRECTS}) fetching ${url}`));
          return;
        }
        res.resume();
        httpsGet(res.headers.location, redirectCount + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        return;
      }
      resolve(res);
    }).on("error", reject);
  });
}

async function downloadAndExtract(url, destDir) {
  mkdirSync(destDir, { recursive: true });
  const tarPath = join(destDir, "archive.tar.gz");

  const response = await httpsGet(url);
  const fileStream = createWriteStream(tarPath);
  try {
    await pipeline(response, fileStream);
  } catch (err) {
    try { rmSync(tarPath); } catch {}
    throw err;
  }

  await execFileAsync("tar", ["-xzf", tarPath, "-C", destDir]);
  rmSync(tarPath);
}

function findExtractedDir(baseDir, targetName) {
  for (const entry of readdirSync(baseDir)) {
    const fullPath = join(baseDir, entry);
    if (!statSync(fullPath).isDirectory()) continue;
    const candidate = join(fullPath, targetName);
    try {
      if (statSync(candidate).isDirectory()) return candidate;
    } catch {}
  }
  return null;
}

export async function downloadAll(onProgress) {
  const tempDir = join(tmpdir(), `mcp-server-untitled-ui-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    const compDest = join(tempDir, "react");
    const iconDest = join(tempDir, "icons");

    if (onProgress) onProgress("Downloading components from GitHub...");
    await downloadAndExtract(resolveComponentsUrl(), compDest);

    if (onProgress) onProgress("Downloading icons from GitHub...");
    await downloadAndExtract(resolveIconsUrl(), iconDest);

    const componentsDir = findExtractedDir(compDest, "components");
    const iconsDir = findExtractedDir(iconDest, "icons");

    if (!componentsDir) throw new Error("Could not find 'components' directory in downloaded archive. The upstream repo structure may have changed.");
    if (!iconsDir) throw new Error("Could not find 'icons' directory in downloaded archive. The upstream repo structure may have changed.");

    return { componentsDir, iconsDir, tempDir };
  } catch (err) {
    cleanup(tempDir);
    throw err;
  }
}

export function cleanup(tempDir) {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {}
}

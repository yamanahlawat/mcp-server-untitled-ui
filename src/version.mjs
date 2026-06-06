import { readFileSync } from "node:fs";

/**
 * The package version, read from package.json so it lives in exactly one place.
 * package.json is always present in the published package (npm includes it
 * regardless of the "files" allowlist), and is resolved relative to this module
 * so it works the same when run from source or from an installed package.
 */
export const VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
).version;

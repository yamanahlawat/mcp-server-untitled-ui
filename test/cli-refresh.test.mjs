import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { CURRENT_INDEX_VERSION, isIndexStale, isIndexVersionStale, resolveDataDir } from "../bin/cli.mjs";

// Helper: produce an ISO timestamp offset by `days` from now (negative = past).
function timestampDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("isIndexStale", () => {
  it("returns false when the index was generated today", () => {
    assert.equal(isIndexStale({ generatedAt: timestampDaysAgo(0) }, 7), false);
  });

  it("returns false when the index age is less than the TTL", () => {
    assert.equal(isIndexStale({ generatedAt: timestampDaysAgo(3) }, 7), false);
  });

  it("returns true when the index age exceeds the TTL", () => {
    assert.equal(isIndexStale({ generatedAt: timestampDaysAgo(8) }, 7), true);
  });

  it("returns true exactly at the TTL boundary (strictly greater)", () => {
    // 7 days exactly is NOT stale (ageMs === ttlMs is not > ttlMs)
    assert.equal(isIndexStale({ generatedAt: timestampDaysAgo(7) }, 7), false);
  });

  it("returns true when generatedAt is missing", () => {
    assert.equal(isIndexStale({}, 7), true);
  });

  it("returns true when generatedAt is null", () => {
    assert.equal(isIndexStale({ generatedAt: null }, 7), true);
  });

  it("returns true when generatedAt is an invalid date string", () => {
    assert.equal(isIndexStale({ generatedAt: "not-a-date" }, 7), true);
  });

  it("returns true when TTL is 0 (always rebuild)", () => {
    // Even an index generated right now would be ageMs=~0ms, but 0 days TTL
    // means ttlMs=0 so ageMs (>0) > 0 is true.
    assert.equal(isIndexStale({ generatedAt: timestampDaysAgo(0.0001) }, 0), true);
  });

  it("works with fractional TTL days", () => {
    // 1 hour ago vs 0.5-day TTL → not stale
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    assert.equal(isIndexStale({ generatedAt: oneHourAgo }, 0.5), false);

    // 13 hours ago vs 0.5-day TTL → stale
    const thirteenHoursAgo = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    assert.equal(isIndexStale({ generatedAt: thirteenHoursAgo }, 0.5), true);
  });
});

describe("resolveDataDir", () => {
  it("uses MCP_SERVER_UNTITLED_UI_DATA_DIR when set", () => {
    assert.equal(resolveDataDir({ MCP_SERVER_UNTITLED_UI_DATA_DIR: "/tmp/custom" }), "/tmp/custom");
  });

  it("falls back to a directory under $HOME when unset", () => {
    assert.equal(resolveDataDir({}), join(homedir(), ".mcp-server-untitled-ui"));
  });
});

describe("isIndexVersionStale", () => {
  it("returns true when version is below current", () => {
    assert.equal(isIndexVersionStale({ version: 1 }), true);
  });
  it("returns true when version is missing", () => {
    assert.equal(isIndexVersionStale({}), true);
  });
  it("returns false when version matches current", () => {
    assert.equal(isIndexVersionStale({ version: CURRENT_INDEX_VERSION }), false);
  });
  it("returns false when version is newer than current", () => {
    assert.equal(isIndexVersionStale({ version: CURRENT_INDEX_VERSION + 1 }), false);
  });
});

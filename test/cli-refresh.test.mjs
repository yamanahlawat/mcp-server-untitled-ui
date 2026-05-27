import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isIndexStale } from "../bin/cli.mjs";

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

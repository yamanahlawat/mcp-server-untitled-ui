import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveComponentsUrl, resolveIconsUrl } from "../src/download.mjs";

describe("resolveComponentsUrl", () => {
  it("uses MCP_SERVER_UNTITLED_UI_COMPONENTS_URL when set", () => {
    assert.equal(
      resolveComponentsUrl({ MCP_SERVER_UNTITLED_UI_COMPONENTS_URL: "https://example.com/react.tar.gz" }),
      "https://example.com/react.tar.gz"
    );
  });

  it("falls back to the official GitHub tarball when unset", () => {
    assert.ok(resolveComponentsUrl({}).includes("untitleduico/react"));
  });
});

describe("resolveIconsUrl", () => {
  it("uses MCP_SERVER_UNTITLED_UI_ICONS_URL when set", () => {
    assert.equal(
      resolveIconsUrl({ MCP_SERVER_UNTITLED_UI_ICONS_URL: "https://example.com/icons.tar.gz" }),
      "https://example.com/icons.tar.gz"
    );
  });

  it("falls back to the official GitHub tarball when unset", () => {
    assert.ok(resolveIconsUrl({}).includes("untitleduico/icons"));
  });
});

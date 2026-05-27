import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseComponentFile, extractProps, extractExports, extractDependencies } from "../src/index-builder.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureSource = readFileSync(join(__dirname, "fixtures/sample-component.tsx"), "utf-8");

describe("extractExports", () => {
  it("extracts named function exports", () => {
    const exports = extractExports(fixtureSource);
    assert.ok(exports.includes("AppStoreButton"));
    assert.ok(exports.includes("GooglePlayButton"));
  });

  it("does not include type-only exports", () => {
    const exports = extractExports(fixtureSource);
    assert.ok(!exports.includes("AppStoreButtonProps"));
    assert.ok(!exports.includes("StoreType"));
  });
});

describe("extractProps", () => {
  it("extracts interface declarations", () => {
    const props = extractProps(fixtureSource);
    assert.ok(props.some((p) => p.includes("AppStoreButtonProps")));
  });

  it("extracts type declarations", () => {
    const props = extractProps(fixtureSource);
    assert.ok(props.some((p) => p.includes("StoreType")));
  });
});

describe("extractDependencies", () => {
  it("extracts internal imports", () => {
    const deps = extractDependencies(fixtureSource);
    assert.ok(deps.includes("@/utils/cx"));
    assert.ok(deps.includes("@/components/base/buttons/button"));
  });

  it("does not include external package imports", () => {
    const deps = extractDependencies(fixtureSource);
    assert.ok(!deps.includes("react"));
  });
});

describe("parseComponentFile", () => {
  it("returns full component metadata", () => {
    const result = parseComponentFile(
      fixtureSource,
      "base/buttons/app-store-buttons.tsx"
    );
    assert.equal(result.name, "app-store-buttons");
    assert.equal(result.category, "base");
    assert.equal(result.subcategory, "buttons");
    assert.equal(result.relativePath, "base/buttons/app-store-buttons.tsx");
    assert.ok(result.exports.includes("AppStoreButton"));
    assert.ok(result.exports.includes("GooglePlayButton"));
    assert.ok(result.props.length > 0);
    assert.ok(result.dependencies.includes("@/utils/cx"));
    assert.equal(result.source, fixtureSource);
  });
});

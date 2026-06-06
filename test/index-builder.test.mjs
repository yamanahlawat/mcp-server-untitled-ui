import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { CURRENT_INDEX_VERSION, buildIndex, extractDependencies, extractExports, extractProps, isComponentModule, parseComponentFile } from "../src/index-builder.mjs";

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

  it("includes the component directory as dir", () => {
    const result = parseComponentFile(
      fixtureSource,
      "base/buttons/app-store-buttons.tsx"
    );
    assert.equal(result.dir, "base/buttons");
  });
});

describe("isComponentModule", () => {
  it("accepts a PascalCase (component) export", () => {
    assert.equal(isComponentModule(["Button"]), true);
  });

  it("accepts a hook-style export", () => {
    assert.equal(isComponentModule(["useToggle"]), true);
  });

  it("accepts when at least one export qualifies", () => {
    assert.equal(isComponentModule(["sizes", "SelectContext"]), true);
  });

  it("rejects a pure util module (only camelCase exports)", () => {
    assert.equal(isComponentModule(["getInitials"]), false);
    assert.equal(isComponentModule(["badgeTypes"]), false);
  });

  it("rejects a module with no exports", () => {
    assert.equal(isComponentModule([]), false);
  });
});

describe("buildIndex demo + version handling", () => {
  const treeDir = join(__dirname, "fixtures/tree");

  it("indexes .demo.tsx into examples[], not components[]", () => {
    const index = buildIndex(treeDir, null);
    assert.equal(index.version, CURRENT_INDEX_VERSION);
    assert.ok(Array.isArray(index.examples));

    const compNames = index.components.map((c) => c.name);
    assert.ok(compNames.includes("button"));
    assert.ok(!compNames.includes("button.demo"));
    assert.ok(!compNames.includes("button.story"));

    const demo = index.examples.find((e) => e.relativePath.endsWith("button.demo.tsx"));
    assert.ok(demo, "expected a button demo in examples[]");
    assert.equal(demo.name, "button");
    assert.equal(demo.dir, "base/buttons");
    assert.ok(demo.source.includes("Default"));
  });

  it("excludes .story.tsx entirely", () => {
    const index = buildIndex(treeDir, null);
    assert.ok(!index.examples.some((e) => e.relativePath.includes(".story.")));
    assert.ok(!index.components.some((c) => c.relativePath.includes(".story.")));
  });

  it("excludes pure util modules with no component/hook export", () => {
    const index = buildIndex(treeDir, null);
    const names = index.components.map((c) => c.name);
    assert.ok(names.includes("button"));
    assert.ok(!names.includes("format-utils"), "format-utils.ts should not be indexed as a component");
  });
});

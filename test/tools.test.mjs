import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleSearchComponents, handleListComponents, handleGetComponent, handleGetComponentFile, handleSearchIcons, handleGetComponentProps, handleGetComponentDependencies } from "../src/tools.mjs";
import { createComponentSearch, createIconSearch } from "../src/search.mjs";

const sampleIndex = {
  components: [
    {
      name: "button",
      category: "base",
      subcategory: "buttons",
      relativePath: "base/buttons/button.tsx",
      importPath: "@/components/base/buttons/button",
      exports: ["Button"],
      source: 'export function Button() { return <button>Click</button>; }',
      props: ['export interface ButtonProps { variant?: "primary" | "secondary"; }'],
      dependencies: ["@/utils/cx"],
    },
    {
      name: "avatar",
      category: "base",
      subcategory: "avatar",
      relativePath: "base/avatar/avatar.tsx",
      importPath: "@/components/base/avatar/avatar",
      exports: ["Avatar", "AvatarGroup"],
      source: 'export function Avatar() { return <div />; }',
      props: [],
      dependencies: [],
    },
    {
      name: "date-picker",
      category: "application",
      subcategory: "date-picker",
      relativePath: "application/date-picker/date-picker.tsx",
      importPath: "@/components/application/date-picker/date-picker",
      exports: ["DatePicker"],
      source: 'export function DatePicker() { return <div />; }',
      props: [],
      dependencies: ["@/utils/cx"],
    },
  ],
  icons: [
    { name: "arrow-down", file: "arrow-down.svg" },
    { name: "plus", file: "plus.svg" },
  ],
};

const componentSearch = createComponentSearch(sampleIndex.components);
const iconSearch = createIconSearch(sampleIndex.icons);

describe("handleSearchComponents", () => {
  it("returns matching components", () => {
    const result = handleSearchComponents({ query: "button", limit: 10 }, componentSearch);
    assert.ok(result.content[0].text.includes("button"));
  });

  it("returns a message when no components match", () => {
    const result = handleSearchComponents({ query: "zzzznonexistent", limit: 10 }, componentSearch);
    assert.ok(result.content[0].text.includes("No components found"));
    assert.ok(!result.isError);
  });
});

describe("handleListComponents", () => {
  it("lists components in a category", () => {
    const result = handleListComponents({ category: "base" }, sampleIndex);
    assert.ok(result.content[0].text.includes("button"));
    assert.ok(result.content[0].text.includes("avatar"));
  });

  it("lists components in a category (case-insensitive)", () => {
    const result = handleListComponents({ category: "BaSe" }, sampleIndex);
    assert.ok(result.content[0].text.includes("button"));
    assert.ok(result.content[0].text.includes("avatar"));
  });

  it("filters by subcategory", () => {
    const result = handleListComponents({ category: "base", subcategory: "buttons" }, sampleIndex);
    assert.ok(result.content[0].text.includes("button"));
    assert.ok(!result.content[0].text.includes("avatar"));
  });

  it("filters by subcategory (case-insensitive)", () => {
    const result = handleListComponents({ category: "base", subcategory: "BuTtOnS" }, sampleIndex);
    assert.ok(result.content[0].text.includes("button"));
    assert.ok(!result.content[0].text.includes("avatar"));
  });

  it("returns error for unknown category", () => {
    const result = handleListComponents({ category: "nonexistent" }, sampleIndex);
    assert.ok(result.isError);
  });
});

describe("handleGetComponent", () => {
  it("returns component source code", () => {
    const result = handleGetComponent({ name: "button" }, sampleIndex);
    assert.ok(result.content[0].text.includes("export function Button"));
  });

  it("returns error for unknown component", () => {
    const result = handleGetComponent({ name: "nonexistent" }, sampleIndex);
    assert.ok(result.isError);
  });
});

describe("handleGetComponentFile", () => {
  it("returns source by relative path", () => {
    const result = handleGetComponentFile({ path: "base/buttons/button.tsx" }, sampleIndex);
    assert.ok(result.content[0].text.includes("export function Button"));
  });

  it("returns error for unknown path", () => {
    const result = handleGetComponentFile({ path: "base/buttons/nonexistent.tsx" }, sampleIndex);
    assert.ok(result.isError);
  });
});

describe("handleSearchIcons", () => {
  it("returns matching icons", () => {
    const result = handleSearchIcons({ query: "arrow", limit: 10 }, iconSearch);
    assert.ok(result.content[0].text.includes("arrow-down"));
  });

  it("returns a message when no icons match", () => {
    const result = handleSearchIcons({ query: "zzzznonexistent", limit: 10 }, iconSearch);
    assert.ok(result.content[0].text.includes("No icons found"));
    assert.ok(!result.isError);
  });
});

describe("handleGetComponentProps", () => {
  it("returns props for a component", () => {
    const result = handleGetComponentProps({ name: "button" }, sampleIndex);
    assert.ok(result.content[0].text.includes("ButtonProps"));
  });

  it("returns message when no props found", () => {
    const result = handleGetComponentProps({ name: "avatar" }, sampleIndex);
    assert.ok(result.content[0].text.includes("No props"));
  });
});

describe("handleGetComponentDependencies", () => {
  it("returns dependencies", () => {
    const result = handleGetComponentDependencies({ name: "button" }, sampleIndex);
    assert.ok(result.content[0].text.includes("@/utils/cx"));
  });

  it("returns message when no dependencies", () => {
    const result = handleGetComponentDependencies({ name: "avatar" }, sampleIndex);
    assert.ok(result.content[0].text.includes("No internal"));
  });
});

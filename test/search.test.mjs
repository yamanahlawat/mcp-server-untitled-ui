import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createComponentSearch, createIconSearch } from "../src/search.mjs";

const sampleComponents = [
  {
    name: "button",
    category: "base",
    subcategory: "buttons",
    relativePath: "base/buttons/button.tsx",
    exports: ["Button"],
  },
  {
    name: "social-button",
    category: "base",
    subcategory: "buttons",
    relativePath: "base/buttons/social-button.tsx",
    exports: ["SocialButton", "GoogleButton"],
  },
  {
    name: "date-picker",
    category: "application",
    subcategory: "date-picker",
    relativePath: "application/date-picker/date-picker.tsx",
    exports: ["DatePicker", "DateRangePicker"],
  },
  {
    name: "avatar",
    category: "base",
    subcategory: "avatar",
    relativePath: "base/avatar/avatar.tsx",
    exports: ["Avatar", "AvatarGroup"],
  },
];

describe("createComponentSearch", () => {
  it("finds exact name match", () => {
    const search = createComponentSearch(sampleComponents);
    const results = search("button", 10);
    assert.ok(results.length > 0);
    assert.equal(results[0].name, "button");
  });

  it("finds by export name", () => {
    const search = createComponentSearch(sampleComponents);
    const results = search("GoogleButton", 10);
    assert.ok(results.some((r) => r.name === "social-button"));
  });

  it("finds by category", () => {
    const search = createComponentSearch(sampleComponents);
    const results = search("application", 10);
    assert.ok(results.some((r) => r.name === "date-picker"));
  });

  it("respects limit", () => {
    const search = createComponentSearch(sampleComponents);
    const results = search("button", 1);
    assert.equal(results.length, 1);
  });

  it("returns empty array for no match", () => {
    const search = createComponentSearch(sampleComponents);
    const results = search("zzzznonexistent", 10);
    assert.equal(results.length, 0);
  });
});

const sampleIcons = [
  { name: "arrow-down", file: "arrow-down.svg" },
  { name: "arrow-up", file: "arrow-up.svg" },
  { name: "chevron-left", file: "chevron-left.svg" },
  { name: "plus", file: "plus.svg" },
];

describe("createIconSearch", () => {
  it("finds exact icon name", () => {
    const search = createIconSearch(sampleIcons);
    const results = search("plus", 10);
    assert.ok(results.length > 0);
    assert.equal(results[0].name, "plus");
  });

  it("finds partial icon name", () => {
    const search = createIconSearch(sampleIcons);
    const results = search("arrow", 10);
    assert.ok(results.length >= 2);
  });

  it("respects limit", () => {
    const search = createIconSearch(sampleIcons);
    const results = search("arrow", 1);
    assert.equal(results.length, 1);
  });
});

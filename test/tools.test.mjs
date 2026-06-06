import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createComponentSearch, createIconSearch } from "../src/search.mjs";
import { firstExampleFor, handleGetComponent, handleGetComponentDependencies, handleGetComponentExamples, handleGetComponentFile, handleGetComponentProps, handleGetInstallCommand, handleListComponents, handleSearchComponents, handleSearchIcons } from "../src/tools.mjs";

const sampleIndex = {
  components: [
    {
      name: "button",
      category: "base",
      subcategory: "buttons",
      relativePath: "base/buttons/button.tsx",
      dir: "base/buttons",
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
      dir: "base/avatar",
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
      dir: "application/date-picker",
      importPath: "@/components/application/date-picker/date-picker",
      exports: ["DatePicker"],
      source: 'export function DatePicker() { return <div />; }',
      props: [],
      dependencies: [
        "@/components/base/buttons/button",
        "@/components/application/date-picker/calendar",
        "@/utils/cx",
      ],
    },
    {
      name: "calendar",
      category: "application",
      subcategory: "date-picker",
      relativePath: "application/date-picker/calendar.tsx",
      dir: "application/date-picker",
      importPath: "@/components/application/date-picker/calendar",
      exports: ["Calendar"],
      source: 'export function Calendar() { return <div />; }',
      props: [],
      dependencies: ["@/components/base/buttons/button"],
    },
    // A directory with multiple components sharing demos, used to exercise
    // example matching by export reference (tab-item) and exclusion of an
    // unrelated co-located helper (tab-internal).
    {
      name: "tabs",
      category: "application",
      subcategory: "tabs",
      relativePath: "application/tabs/tabs.tsx",
      dir: "application/tabs",
      importPath: "@/components/application/tabs/tabs",
      exports: ["Tabs", "TabList"],
      source: 'export function Tabs() { return <div />; }',
      props: [],
      dependencies: [],
    },
    {
      name: "tab-item",
      category: "application",
      subcategory: "tabs",
      relativePath: "application/tabs/tab-item.tsx",
      dir: "application/tabs",
      importPath: "@/components/application/tabs/tab-item",
      exports: ["TabItem"],
      source: 'export function TabItem() { return <div />; }',
      props: [],
      dependencies: [],
    },
    {
      name: "tab-internal",
      category: "application",
      subcategory: "tabs",
      relativePath: "application/tabs/tab-internal.tsx",
      dir: "application/tabs",
      importPath: "@/components/application/tabs/tab-internal",
      exports: ["TabInternal"],
      source: 'export function TabInternal() { return <div />; }',
      props: [],
      dependencies: [],
    },
  ],
  examples: [
    {
      name: "date-picker",
      relativePath: "application/date-picker/date-picker.demo.tsx",
      dir: "application/date-picker",
      source: "export const DatePickerDemo = () => <DatePicker />;",
    },
    {
      name: "calendar",
      relativePath: "application/date-picker/calendar.demo.tsx",
      dir: "application/date-picker",
      source: "export const CalendarDemo = () => <Calendar />;",
    },
    // tabs.demo demonstrates Tabs, TabList and TabItem; overview.demo only Tabs.
    {
      name: "tabs",
      relativePath: "application/tabs/tabs.demo.tsx",
      dir: "application/tabs",
      source: "export const TabsDemo = () => (<Tabs><TabList><TabItem /></TabList></Tabs>);",
    },
    {
      name: "overview",
      relativePath: "application/tabs/overview.demo.tsx",
      dir: "application/tabs",
      source: "export const OverviewDemo = () => <Tabs />;",
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

  it("appends an Example section when a same-dir demo exists", () => {
    const result = handleGetComponent({ name: "date-picker" }, sampleIndex);
    const text = result.content[0].text;
    assert.ok(text.includes("## Example"));
    assert.ok(text.includes("DatePickerDemo"));
  });

  it("omits the Example section when no demo exists", () => {
    const result = handleGetComponent({ name: "avatar" }, sampleIndex);
    assert.ok(!result.content[0].text.includes("## Example"));
  });

  it("does not append an unrelated co-located demo as the Example", () => {
    // tab-internal shares a directory with tabs.demo.tsx but is never referenced
    const result = handleGetComponent({ name: "tab-internal" }, sampleIndex);
    assert.ok(!result.content[0].text.includes("## Example"));
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

describe("handleGetComponentExamples", () => {
  it("returns demos that reference the component, excluding unrelated siblings", () => {
    const result = handleGetComponentExamples({ name: "date-picker" }, sampleIndex);
    assert.ok(result.content[0].text.includes("DatePickerDemo"));
    // calendar.demo.tsx does not reference DatePicker, so it must NOT be attached
    assert.ok(!result.content[0].text.includes("CalendarDemo"));
    assert.ok(!result.isError);
  });

  it("returns all demos that demonstrate the component", () => {
    const result = handleGetComponentExamples({ name: "tabs" }, sampleIndex);
    const text = result.content[0].text;
    assert.ok(text.includes("TabsDemo"));
    assert.ok(text.includes("OverviewDemo"));
  });

  it("matches a demo by export reference even without a name-matching file", () => {
    // tab-item has no tab-item.demo.tsx, but tabs.demo.tsx renders <TabItem />
    const result = handleGetComponentExamples({ name: "tab-item" }, sampleIndex);
    assert.ok(result.content[0].text.includes("TabsDemo"));
    assert.ok(!result.isError);
  });

  it("does not attach an unrelated co-located demo to a helper component", () => {
    // tab-internal lives in application/tabs but no demo references TabInternal
    const result = handleGetComponentExamples({ name: "tab-internal" }, sampleIndex);
    assert.ok(result.content[0].text.includes("No usage examples available"));
    assert.ok(!result.isError);
  });

  it("orders the name-matching demo first", () => {
    const result = handleGetComponentExamples({ name: "tabs" }, sampleIndex);
    const text = result.content[0].text;
    // tabs.demo.tsx (name match) must appear before overview.demo.tsx (export match)
    assert.ok(text.indexOf("tabs.demo.tsx") < text.indexOf("overview.demo.tsx"));
  });

  it("returns a non-error message when no demo exists in the directory", () => {
    const result = handleGetComponentExamples({ name: "avatar" }, sampleIndex);
    assert.ok(result.content[0].text.includes("No usage examples available"));
    assert.ok(!result.isError);
  });

  it("returns an error for an unknown component", () => {
    const result = handleGetComponentExamples({ name: "nope" }, sampleIndex);
    assert.ok(result.isError);
  });
});

describe("firstExampleFor", () => {
  it("returns the name-matching demo for a component that has one", () => {
    const calendar = sampleIndex.components.find((c) => c.name === "calendar");
    const result = firstExampleFor(calendar, sampleIndex);
    assert.ok(result);
    assert.equal(result.name, "calendar");
    assert.ok(result.source.includes("CalendarDemo"));
  });

  it("returns null when the component has no same-dir demo", () => {
    const avatar = sampleIndex.components.find((c) => c.name === "avatar");
    assert.equal(firstExampleFor(avatar, sampleIndex), null);
  });
});

describe("handleGetInstallCommand", () => {
  it("emits the official non-interactive add command", () => {
    const result = handleGetInstallCommand({ name: "date-picker" }, sampleIndex);
    assert.ok(result.content[0].text.includes("npx untitledui@latest add date-picker --yes"));
  });

  it("notes that the CLI installs dependencies automatically", () => {
    const result = handleGetInstallCommand({ name: "date-picker" }, sampleIndex);
    assert.ok(/installs all required dependencies/i.test(result.content[0].text));
  });

  it("does not enumerate internal dependencies (the CLI owns that)", () => {
    const result = handleGetInstallCommand({ name: "date-picker" }, sampleIndex);
    const text = result.content[0].text;
    assert.ok(!text.includes("Internal Untitled UI components"));
    // no bullet list of component deps
    assert.ok(!text.split("\n").some((l) => l.startsWith("- ")));
  });

  it("returns an error for an unknown component", () => {
    const result = handleGetInstallCommand({ name: "nope" }, sampleIndex);
    assert.ok(result.isError);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registerPrompts } from "../src/prompts.mjs";
import { registerResources } from "../src/resources.mjs";
import { createServer } from "../src/server.mjs";

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
      source: "export function Button() { return <button>Click</button>; }",
      props: ['export interface ButtonProps { variant?: "primary" | "secondary"; }'],
      dependencies: ["@/utils/cx"],
    }
  ],
  icons: [
    { name: "arrow-down", file: "arrow-down.svg" },
  ],
  examples: [
    {
      name: "button",
      relativePath: "base/buttons/button.demo.tsx",
      dir: "base/buttons",
      source: "export default function ButtonDemo() { return <Button variant=\"primary\">Demo</Button>; }",
    },
  ],
};

const mockComponentSearch = (query) => {
  return sampleIndex.components.filter((c) => c.name.includes(query));
};

describe("MCP Resources and Prompts registration", () => {
  it("registers static and template resources and handles reading them", async () => {
    const registeredResources = {};
    const registeredResourceTemplates = {};

    const mockServer = {
      registerResource(id, uriOrTemplate, metadata, readCallback) {
        if (typeof uriOrTemplate === "string") {
          registeredResources[id] = { uri: uriOrTemplate, metadata, readCallback };
        } else {
          registeredResourceTemplates[id] = { template: uriOrTemplate, metadata, readCallback };
        }
      }
    };

    registerResources(mockServer, sampleIndex);

    // 1. Test Static Resource: component-categories
    const catResource = registeredResources["component-categories"];
    assert.ok(catResource);
    assert.equal(catResource.uri, "untitled-ui://components");
    assert.equal(catResource.metadata.mimeType, "application/json");

    const catResult = catResource.readCallback();
    assert.equal(catResult.contents[0].uri, "untitled-ui://components");
    const catData = JSON.parse(catResult.contents[0].text);
    assert.equal(catData[0].name, "base");
    assert.equal(catData[0].count, 1);
    assert.ok(catData[0].subcategories.includes("buttons"));

    // 2. Test Template Resource: components-by-category
    const compByCatTemplate = registeredResourceTemplates["components-by-category"];
    assert.ok(compByCatTemplate);
    assert.ok(compByCatTemplate.template);

    // Test listing matching resources
    const listCatResult = await compByCatTemplate.template.listCallback();
    assert.equal(listCatResult.resources[0].name, "base");
    assert.equal(listCatResult.resources[0].uri, "untitled-ui://components/base");

    // Test reading resource
    const readCatResult = compByCatTemplate.readCallback(
      new URL("untitled-ui://components/base"),
      { category: "base" }
    );
    assert.equal(readCatResult.contents[0].uri, "untitled-ui://components/base");
    const catComponents = JSON.parse(readCatResult.contents[0].text);
    assert.equal(catComponents[0].name, "button");
    assert.equal(catComponents[0].subcategory, "buttons");

    // 3. Test Template Resource: component-source
    const compSourceTemplate = registeredResourceTemplates["component-source"];
    assert.ok(compSourceTemplate);

    const listSourceResult = await compSourceTemplate.template.listCallback();
    assert.equal(listSourceResult.resources[0].name, "base/button");
    assert.equal(listSourceResult.resources[0].uri, "untitled-ui://components/base/button");

    const readSourceResult = compSourceTemplate.readCallback(
      new URL("untitled-ui://components/base/button"),
      { category: "base", name: "button" }
    );
    assert.equal(readSourceResult.contents[0].uri, "untitled-ui://components/base/button");
    assert.ok(readSourceResult.contents[0].text.includes("export function Button"));

    // 4. Test Static Resource: icon-index
    const iconResource = registeredResources["icon-index"];
    assert.ok(iconResource);
    assert.equal(iconResource.uri, "untitled-ui://icons");

    const iconResult = iconResource.readCallback();
    assert.equal(iconResult.contents[0].uri, "untitled-ui://icons");
    const iconData = JSON.parse(iconResult.contents[0].text);
    assert.equal(iconData[0].name, "arrow-down");
  });

  it("registers prompts and generates valid prompt messages", () => {
    const registeredPrompts = {};

    const mockServer = {
      registerPrompt(id, metadata, callback) {
        registeredPrompts[id] = { metadata, callback };
      }
    };

    registerPrompts(mockServer, sampleIndex, mockComponentSearch);

    // 1. Test build_component prompt
    const buildCompPrompt = registeredPrompts["build_component"];
    assert.ok(buildCompPrompt);
    const buildResult = buildCompPrompt.callback({ description: "button" });
    assert.ok(buildResult.messages[0].content.text.includes("### button"));
    assert.ok(buildResult.messages[0].content.text.includes("@/components/base/buttons/button"));

    // 2. Test map_design_to_components prompt
    const mapDesignPrompt = registeredPrompts["map_design_to_components"];
    assert.ok(mapDesignPrompt);
    const mapResult = mapDesignPrompt.callback({ design_description: "sign up form" });
    assert.ok(mapResult.messages[0].content.text.includes("sign up form"));

    // 3. Test component_usage prompt — found
    const compUsagePrompt = registeredPrompts["component_usage"];
    assert.ok(compUsagePrompt);
    const usageResult = compUsagePrompt.callback({ component_name: "button" });
    assert.ok(usageResult.messages[0].content.text.includes("import { Button } from \"@/components/base/buttons/button\""));
    assert.ok(usageResult.messages[0].content.text.includes("ButtonProps"));
    // Example block should appear when a same-dir demo exists
    assert.ok(usageResult.messages[0].content.text.includes("**Example:**"));
    assert.ok(usageResult.messages[0].content.text.includes("ButtonDemo"));

    // 3b. Test component_usage prompt — found, no same-dir demo
    const indexWithoutExamples = { ...sampleIndex, examples: [] };
    const registeredPromptsNoDemo = {};
    const mockServerNoDemo = {
      registerPrompt(id, metadata, callback) {
        registeredPromptsNoDemo[id] = { metadata, callback };
      }
    };
    registerPrompts(mockServerNoDemo, indexWithoutExamples, mockComponentSearch);
    const usageResultNoDemo = registeredPromptsNoDemo["component_usage"].callback({ component_name: "button" });
    assert.ok(!usageResultNoDemo.messages[0].content.text.includes("**Example:**"));

    // 4. Test component_usage prompt — not found
    const notFoundResult = compUsagePrompt.callback({ component_name: "nonexistent" });
    assert.ok(notFoundResult.messages[0].content.text.includes("not found"));
  });
});

describe("MCP Tool registration", () => {
  it("createServer registers get_component_examples and get_install_command", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");

    const registeredToolNames = [];
    const originalRegisterTool = McpServer.prototype.registerTool;
    McpServer.prototype.registerTool = function (name, config, callback) {
      registeredToolNames.push(name);
      return originalRegisterTool.call(this, name, config, callback);
    };

    try {
      createServer(sampleIndex);
    } finally {
      McpServer.prototype.registerTool = originalRegisterTool;
    }

    assert.ok(
      registeredToolNames.includes("get_component_examples"),
      `Expected get_component_examples in [${registeredToolNames.join(", ")}]`
    );
    assert.ok(
      registeredToolNames.includes("get_install_command"),
      `Expected get_install_command in [${registeredToolNames.join(", ")}]`
    );
  });
});

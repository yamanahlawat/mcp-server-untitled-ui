import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createComponentSearch, createIconSearch } from "./search.mjs";
import {
  handleSearchComponents,
  handleListComponents,
  handleGetComponent,
  handleGetComponentFile,
  handleSearchIcons,
  handleGetComponentProps,
  handleGetComponentDependencies,
} from "./tools.mjs";
import { registerResources } from "./resources.mjs";
import { registerPrompts } from "./prompts.mjs";

export function createServer(index) {
  const server = new McpServer({ name: "untitled-ui", version: "1.0.0" });
  const componentSearch = createComponentSearch(index.components);
  const iconSearch = createIconSearch(index.icons);

  server.registerTool(
    "search_components",
    {
      description:
        "Fuzzy search Untitled UI components by name, category, subcategory, or export name",
      inputSchema: {
        query: z.string().describe("Search query"),
        limit: z.number().default(20).describe("Max results to return"),
      },
    },
    ({ query, limit }) =>
      handleSearchComponents({ query, limit }, componentSearch)
  );

  server.registerTool(
    "list_components",
    {
      description:
        "List all components in a category, optionally filtered by subcategory",
      inputSchema: {
        category: z
          .string()
          .describe(
            "Component category (e.g. base, application, foundations)"
          ),
        subcategory: z
          .string()
          .optional()
          .describe("Component subcategory (e.g. buttons, avatar)"),
      },
    },
    ({ category, subcategory }) =>
      handleListComponents({ category, subcategory }, index)
  );

  server.registerTool(
    "get_component",
    {
      description: "Get the full source code of a component by name",
      inputSchema: {
        name: z.string().describe("Component name (e.g. button, date-picker)"),
      },
    },
    ({ name }) => handleGetComponent({ name }, index)
  );

  server.registerTool(
    "get_component_file",
    {
      description: "Get component source code by its relative file path",
      inputSchema: {
        path: z
          .string()
          .describe("Relative path (e.g. base/buttons/button.tsx)"),
      },
    },
    ({ path }) => handleGetComponentFile({ path }, index)
  );

  server.registerTool(
    "search_icons",
    {
      description: "Search Untitled UI icon names",
      inputSchema: {
        query: z.string().describe("Search query"),
        limit: z.number().default(20).describe("Max results to return"),
      },
    },
    ({ query, limit }) =>
      handleSearchIcons({ query, limit }, iconSearch)
  );

  server.registerTool(
    "get_component_props",
    {
      description: "Get TypeScript props/interfaces for a component",
      inputSchema: {
        name: z.string().describe("Component name"),
      },
    },
    ({ name }) => handleGetComponentProps({ name }, index)
  );

  server.registerTool(
    "get_component_dependencies",
    {
      description:
        "Show internal Untitled UI imports used by a component",
      inputSchema: {
        name: z.string().describe("Component name"),
      },
    },
    ({ name }) => handleGetComponentDependencies({ name }, index)
  );

  registerResources(server, index);
  registerPrompts(server, index, componentSearch);

  return server;
}

export async function startServer(index) {
  const server = createServer(index);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

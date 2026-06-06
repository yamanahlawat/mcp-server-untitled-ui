import { z } from "zod";
import { firstExampleFor } from "./tools.mjs";

export function registerPrompts(server, index, componentSearch) {
  server.registerPrompt(
    "build_component",
    {
      title: "Build Component",
      description: "Get system context and matching Untitled UI components for building a UI piece",
      argsSchema: {
        description: z.string().describe("Description of the UI component you want to build"),
      },
    },
    ({ description }) => {
      const MAX_SOURCE_LINES = 150;
      const matches = componentSearch(description, 5);
      const matchText = matches.length > 0
        ? matches.map((c) => {
            const lines = c.source.split("\n");
            const truncated = lines.length > MAX_SOURCE_LINES;
            const sourceText = truncated
              ? lines.slice(0, MAX_SOURCE_LINES).join("\n") + `\n// ... truncated (${lines.length - MAX_SOURCE_LINES} more lines) — use get_component for full source`
              : c.source;
            return `### ${c.name}\n- Path: ${c.relativePath}\n- Import: ${c.importPath}\n- Exports: ${c.exports.join(", ")}\n\n\`\`\`tsx\n${sourceText}\n\`\`\``;
          }).join("\n\n")
        : "No closely matching components found. You may need to build this from scratch.";

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `You are building a UI component using the Untitled UI library (React + Tailwind CSS + React Aria).

The user wants: ${description}

Here are the most relevant existing Untitled UI components you can reference or compose:

${matchText}

Instructions:
1. Use the existing Untitled UI components as building blocks where possible
2. Follow the same patterns: "use client" directive, Tailwind CSS classes, React Aria for accessibility
3. Import from @/components/... paths
4. Use the cx() utility from @/utils/cx for conditional class merging`,
          },
        }],
      };
    }
  );

  server.registerPrompt(
    "map_design_to_components",
    {
      title: "Map Design to Components",
      description: "Map a visual design description to Untitled UI components",
      argsSchema: {
        design_description: z.string().describe("Description of the visual design to map"),
      },
    },
    ({ design_description }) => {
      const categories = [...new Set(index.components.map((c) => c.category))];
      const totalComponents = index.components.length;
      const totalIcons = index.icons.length;

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `You are mapping a visual design to Untitled UI components.

Design: ${design_description}

Available Untitled UI library:
- ${totalComponents} components across categories: ${categories.join(", ")}
- ${totalIcons} icons

Instructions:
1. Break the design into logical UI sections
2. For each section, identify which Untitled UI components could be used
3. Use the search_components tool to find specific components by name or function
4. Use get_component to inspect source code of candidates
5. List the component mapping: design element → Untitled UI component → import path
6. Note any gaps where custom components are needed`,
          },
        }],
      };
    }
  );

  server.registerPrompt(
    "component_usage",
    {
      title: "Component Usage",
      description: "Get import path, props interface, and usage example for a component",
      argsSchema: {
        component_name: z.string().describe("Name of the component"),
      },
    },
    ({ component_name }) => {
      const component = index.components.find((c) => c.name === component_name);
      if (!component) {
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `Component "${component_name}" not found. Use the search_components tool to find the correct name.`,
            },
          }],
        };
      }

      const propsText = component.props.length > 0
        ? component.props.join("\n\n")
        : "No explicit props interface found. Check the source for inline prop types.";

      const firstExample = firstExampleFor(component, index);
      const exampleBlock = firstExample
        ? `\n\n**Example:**\n\`\`\`tsx\n${firstExample.source}\n\`\`\``
        : "";

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Show how to use the Untitled UI "${component.name}" component.

**Import:**
\`\`\`tsx
import { ${component.exports.join(", ")} } from "${component.importPath}";
\`\`\`

**Props/Types:**
\`\`\`tsx
${propsText}
\`\`\`

**Source:**
\`\`\`tsx
${component.source}
\`\`\`${exampleBlock}

Generate a complete usage example based on the source code above.`,
          },
        }],
      };
    }
  );
}

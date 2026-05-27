import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(server, index) {
  // 1. Static: all categories
  server.registerResource(
    "component-categories",
    "untitled-ui://components",
    { title: "Component Categories", description: "All Untitled UI component categories with counts", mimeType: "application/json" },
    () => {
      const categories = {};
      for (const c of index.components) {
        if (!categories[c.category]) categories[c.category] = { count: 0, subcategories: new Set() };
        categories[c.category].count++;
        if (c.subcategory) categories[c.category].subcategories.add(c.subcategory);
      }
      const result = Object.entries(categories).map(([name, data]) => ({
        name, count: data.count, subcategories: [...data.subcategories],
      }));
      return { contents: [{ uri: "untitled-ui://components", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // 2. Template: components by category
  server.registerResource(
    "components-by-category",
    new ResourceTemplate("untitled-ui://components/{category}", {
      list: async () => ({
        resources: [...new Set(index.components.map(c => c.category))].map(cat => ({
          uri: `untitled-ui://components/${cat}`,
          name: cat,
        }))
      })
    }),
    { title: "Components by Category", description: "List components in a specific category", mimeType: "application/json" },
    (uri, { category }) => {
      const filtered = index.components.filter(c => c.category === category);
      const result = filtered.map(c => ({ name: c.name, subcategory: c.subcategory, exports: c.exports, path: c.relativePath }));
      return { contents: [{ uri: uri.href, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // 3. Template: component source by category + name
  server.registerResource(
    "component-source",
    new ResourceTemplate("untitled-ui://components/{category}/{name}", {
      list: async () => ({
        resources: index.components.map(c => ({
          uri: `untitled-ui://components/${c.category}/${c.name}`,
          name: `${c.category}/${c.name}`,
        }))
      })
    }),
    { title: "Component Source", description: "Full source code of a specific component", mimeType: "text/typescript" },
    (uri, { category, name }) => {
      const component = index.components.find(c => c.category === category && c.name === name);
      if (!component) {
        return { contents: [{ uri: uri.href, text: `Component ${name} not found in ${category}.` }] };
      }
      return { contents: [{ uri: uri.href, text: component.source }] };
    }
  );

  // 4. Static: icon index
  server.registerResource(
    "icon-index",
    "untitled-ui://icons",
    { title: "Icon Index", description: "Full index of all Untitled UI icons", mimeType: "application/json" },
    () => ({ contents: [{ uri: "untitled-ui://icons", text: JSON.stringify(index.icons, null, 2) }] })
  );
}

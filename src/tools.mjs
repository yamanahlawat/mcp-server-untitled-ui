/**
 * Tool handler functions for the Untitled UI MCP server.
 * Each function returns an MCP-compatible response object:
 * { content: [{ type: "text", text: "..." }] }
 * or { content: [...], isError: true } for errors.
 */

/**
 * Search components using the provided search function.
 * @param {{ query: string, limit?: number }} args
 * @param {Function} searchFn
 */
export function handleSearchComponents({ query, limit = 20 }, searchFn) {
  const results = searchFn(query, limit);

  if (results.length === 0) {
    return {
      content: [{ type: "text", text: `No components found matching "${query}".` }],
    };
  }

  const lines = results.map(
    (c) => `- **${c.name}** (${c.category}/${c.subcategory}) — \`${c.importPath}\``
  );

  return {
    content: [{ type: "text", text: `Found ${results.length} component(s):\n\n${lines.join("\n")}` }],
  };
}

/**
 * List components in a category, optionally filtered by subcategory.
 * @param {{ category: string, subcategory?: string }} args
 * @param {object} index
 */
export function handleListComponents({ category, subcategory }, index) {
  let components = index.components.filter(
    (c) => c.category.toLowerCase() === category.toLowerCase()
  );

  if (components.length === 0) {
    return {
      content: [{ type: "text", text: `Unknown category: "${category}".` }],
      isError: true,
    };
  }

  if (subcategory) {
    components = components.filter(
      (c) => c.subcategory.toLowerCase() === subcategory.toLowerCase()
    );
  }

  if (components.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No components found in category "${category}"${subcategory ? ` / "${subcategory}"` : ""}.`,
        },
      ],
      isError: true,
    };
  }

  const lines = components.map(
    (c) => `- **${c.name}** (${c.subcategory}) — \`${c.importPath}\``
  );

  return {
    content: [
      {
        type: "text",
        text: `Components in "${category}"${subcategory ? `/${subcategory}` : ""}:\n\n${lines.join("\n")}`,
      },
    ],
  };
}

/**
 * Get full source code of a component by name.
 * @param {{ name: string }} args
 * @param {object} index
 */
export function handleGetComponent({ name }, index) {
  const component = index.components.find((c) => c.name === name);

  if (!component) {
    return {
      content: [{ type: "text", text: `Component "${name}" not found.` }],
      isError: true,
    };
  }

  const header = [
    `# ${component.name}`,
    `**Category:** ${component.category}/${component.subcategory}`,
    `**Import:** \`${component.importPath}\``,
    `**Exports:** ${component.exports.join(", ")}`,
    "",
    "## Source",
    "```tsx",
    component.source,
    "```",
  ].join("\n");

  return {
    content: [{ type: "text", text: header }],
  };
}

/**
 * Get component source code by its relative file path.
 * @param {{ path: string }} args
 * @param {object} index
 */
export function handleGetComponentFile({ path }, index) {
  const component = index.components.find((c) => c.relativePath === path);

  if (!component) {
    return {
      content: [{ type: "text", text: `No component found at path "${path}".` }],
      isError: true,
    };
  }

  const header = [
    `# ${component.name}`,
    `**Category:** ${component.category}/${component.subcategory}`,
    `**Import:** \`${component.importPath}\``,
    `**Exports:** ${component.exports.join(", ")}`,
    "",
    "## Source",
    "```tsx",
    component.source,
    "```",
  ].join("\n");

  return {
    content: [{ type: "text", text: header }],
  };
}

/**
 * Search icons using the provided search function.
 * @param {{ query: string, limit?: number }} args
 * @param {Function} searchFn
 */
export function handleSearchIcons({ query, limit = 20 }, searchFn) {
  const results = searchFn(query, limit);

  if (results.length === 0) {
    return {
      content: [{ type: "text", text: `No icons found matching "${query}".` }],
    };
  }

  const lines = results.map((icon) => `- ${icon.name}`);

  return {
    content: [{ type: "text", text: `Found ${results.length} icon(s):\n\n${lines.join("\n")}` }],
  };
}

/**
 * Get TypeScript props/interfaces for a component.
 * @param {{ name: string }} args
 * @param {object} index
 */
export function handleGetComponentProps({ name }, index) {
  const component = index.components.find((c) => c.name === name);

  if (!component) {
    return {
      content: [{ type: "text", text: `Component "${name}" not found.` }],
      isError: true,
    };
  }

  if (!component.props || component.props.length === 0) {
    return {
      content: [{ type: "text", text: `No props interfaces found for "${name}".` }],
    };
  }

  const text = [
    `# Props for \`${name}\``,
    "",
    "```tsx",
    component.props.join("\n\n"),
    "```",
  ].join("\n");

  return {
    content: [{ type: "text", text }],
  };
}

/**
 * Show internal Untitled UI dependencies used by a component.
 * @param {{ name: string }} args
 * @param {object} index
 */
export function handleGetComponentDependencies({ name }, index) {
  const component = index.components.find((c) => c.name === name);

  if (!component) {
    return {
      content: [{ type: "text", text: `Component "${name}" not found.` }],
      isError: true,
    };
  }

  if (!component.dependencies || component.dependencies.length === 0) {
    return {
      content: [{ type: "text", text: `No internal dependencies for "${name}".` }],
    };
  }

  const lines = component.dependencies.map((dep) => `- \`${dep}\``);

  return {
    content: [
      {
        type: "text",
        text: `Internal dependencies of \`${name}\`:\n\n${lines.join("\n")}`,
      },
    ],
  };
}

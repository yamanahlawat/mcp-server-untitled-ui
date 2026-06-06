/**
 * Tool handler functions for the Untitled UI MCP server.
 * Each function returns an MCP-compatible response object:
 * { content: [{ type: "text", text: "..." }] }
 * or { content: [...], isError: true } for errors.
 */

/**
 * Standard error response for a name-based lookup that finds no component.
 * @param {string} name
 */
function componentNotFound(name) {
  return {
    content: [{ type: "text", text: `Component "${name}" not found.` }],
    isError: true,
  };
}

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

  if (!component) return componentNotFound(name);

  const sections = [
    `# ${component.name}`,
    `**Category:** ${component.category}/${component.subcategory}`,
    `**Import:** \`${component.importPath}\``,
    `**Exports:** ${component.exports.join(", ")}`,
    "",
    "## Source",
    "```tsx",
    component.source,
    "```",
  ];

  const example = firstExampleFor(component, index);
  if (example) {
    sections.push(
      "",
      `## Example (${example.relativePath})`,
      "```tsx",
      example.source,
      "```"
    );
  }

  return {
    content: [{ type: "text", text: sections.join("\n") }],
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

  if (!component) return componentNotFound(name);

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

  if (!component) return componentNotFound(name);

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

/**
 * Whether a demo is genuinely an example *for* this component, rather than just
 * a sibling that happens to share its directory. A demo qualifies if its file
 * basename matches the component name (e.g. button.demo.tsx → button) or if the
 * demo source references one of the component's exported names. This prevents
 * attaching an unrelated demo to a helper or util that co-locates with it
 * (e.g. date-picker.demo.tsx to the internal `cell`, or featured-cards.demo.tsx
 * to `nav-button`).
 * @param {object} example
 * @param {object} component
 * @returns {boolean}
 */
function exampleMatchesComponent(example, component) {
  if (example.name === component.name) return true;
  return (component.exports || []).some((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(example.source);
  });
}

/**
 * Find demo examples that actually demonstrate the named component, ordered so
 * that a demo whose basename matches the component name comes first.
 * @param {object} component
 * @param {object} index
 * @returns {Array<{name:string, relativePath:string, dir:string, source:string}>}
 */
function examplesForComponent(component, index) {
  const examples = (index.examples || []).filter(
    (e) => e.dir === component.dir && exampleMatchesComponent(e, component)
  );
  // Sort the demo whose basename matches the component name first.
  return examples.sort(
    (a, b) => (b.name === component.name) - (a.name === component.name)
  );
}

/**
 * Source of the first matching demo for a component, or null if none.
 * Used to fold an Example section into get_component and the usage prompt.
 * @param {object} component
 * @param {object} index
 * @returns {{name:string, relativePath:string, dir:string, source:string}|null}
 */
export function firstExampleFor(component, index) {
  return examplesForComponent(component, index)[0] ?? null;
}

/**
 * Produce the official Untitled UI CLI command to install a component into a
 * project. The CLI resolves and installs everything the component needs —
 * internal components, utilities, and npm packages — so this tool deliberately
 * defers to it rather than enumerating the dependency closure itself. The
 * `--yes` flag runs the CLI non-interactively (suitable for AI agents and CI).
 * @param {{ name: string }} args
 * @param {object} index
 */
export function handleGetInstallCommand({ name }, index) {
  const component = index.components.find((c) => c.name === name);

  if (!component) return componentNotFound(name);

  const text = [
    `npx untitledui@latest add ${name} --yes`,
    "",
    "The Untitled UI CLI installs all required dependencies (internal components, utilities, and npm packages) automatically.",
  ].join("\n");

  return {
    content: [{ type: "text", text }],
  };
}

/**
 * Get usage example(s) for a component from co-located .demo.tsx files.
 * @param {{ name: string }} args
 * @param {object} index
 */
export function handleGetComponentExamples({ name }, index) {
  const component = index.components.find((c) => c.name === name);

  if (!component) return componentNotFound(name);

  const matches = examplesForComponent(component, index);

  if (matches.length === 0) {
    return {
      content: [{ type: "text", text: `No usage examples available for "${name}".` }],
    };
  }

  const blocks = matches.map(
    (e) => `## ${e.relativePath}\n\`\`\`tsx\n${e.source}\n\`\`\``
  );

  return {
    content: [
      { type: "text", text: `# Examples for \`${name}\`\n\n${blocks.join("\n\n")}` },
    ],
  };
}

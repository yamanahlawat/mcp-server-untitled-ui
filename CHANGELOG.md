# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-06-06

### Added

- `get_component_examples` tool — returns usage examples sourced offline from `.demo.tsx` files.
- `get_install_command` tool — emits the official Untitled UI CLI command to install a component (`npx untitledui@latest add <name> --yes`); the CLI resolves all dependencies automatically.
- `get_component` output and the `component_usage` prompt now include an Example section when a demo exists.
- `MCP_SERVER_UNTITLED_UI_DATA_DIR` environment variable — overrides where the index/cache is stored (CI, isolated instances).
- `MCP_SERVER_UNTITLED_UI_COMPONENTS_URL` / `MCP_SERVER_UNTITLED_UI_ICONS_URL` environment variables — override the source tarballs (pin a release or use a private mirror).

### Fixed

- Examples are now matched to the components they actually render, instead of attaching any demo that happens to share a directory. Helpers like `cell` or `nav-button` no longer show an unrelated sibling demo.
- Pure utility/data modules (e.g. `utils.ts`, `badge-types.ts`) are no longer indexed as components.

### Changed

- Index schema bumped to v3 (excludes util modules and refines demo→component matching; v2 added `examples[]` and a per-component `dir`). Existing installs auto-rebuild on next start.

### Removed

- Dropped the undocumented-in-code `MCP_SERVER_UNTITLED_UI_SEARCH_LIMIT` and `MCP_SERVER_UNTITLED_UI_SEARCH_THRESHOLD` from the README (they were never implemented; per-call `limit` already exists).

---

## [1.0.0] - 2026-05-27

### Added

- **Offline-first MCP server** — downloads Untitled UI component source from GitHub once,
  builds a local index at `~/.mcp-server-untitled-ui/index.json`, and serves it over stdio with no
  API keys, no network calls at runtime, and no rate limits.

- **7 MCP Tools**
  - `search_components` — fuzzy search by name, category, subcategory, or export name
  - `list_components` — list all components in a category, optionally filtered by subcategory
  - `get_component` — retrieve full TypeScript source code by component name
  - `get_component_file` — retrieve source code by relative file path
  - `search_icons` — search Untitled UI icon names
  - `get_component_props` — extract TypeScript interfaces and type declarations
  - `get_component_dependencies` — show internal `@/...` imports used by a component

- **4 MCP Resources** — browsable without tool calls
  - `untitled-ui://components` — all categories with component counts
  - `untitled-ui://components/{category}` — components in a category
  - `untitled-ui://components/{category}/{name}` — full TypeScript source of a component
  - `untitled-ui://icons` — full icon index

- **3 MCP Prompts** — pre-built workflow templates
  - `build_component` — system context + relevant component source for building a UI piece
  - `map_design_to_components` — guided mapping of a visual design to Untitled UI components
  - `component_usage` — import path, props interface, and usage example for a component

- **TTL-based auto-refresh** — index is automatically rebuilt when older than the TTL
  (default: 7 days). Configurable via `--ttl <days>`, `--no-auto-refresh`, and the
  `MCP_SERVER_UNTITLED_UI_REFRESH_DAYS` environment variable.

- **CLI flags**: `--setup`, `--rebuild`, `--ttl`, `--no-auto-refresh`, `--version`, `--help`

[1.0.0]: https://github.com/yamanahlawat/mcp-server-untitled-ui/releases/tag/v1.0.0

# mcp-server-untitled-ui

> **The offline Model Context Protocol (MCP) server for Untitled UI.** No API keys. No remote calls at runtime. No rate limits. Downloads components from GitHub once, builds a local index, and serves it locally forever.

This MCP server provides access to Untitled UI component source code, interfaces/props, dependencies, and icons, complete with fuzzy-search capabilities, pre-built workflow prompts, and browsable resources.

---

## Key Features

- **100% Offline at Runtime**: Downloads and indexes the Untitled UI components and icons on the first run. Subsequent server startups are instant and completely local.
- **Cascading Fuzzy Search**: Rich scoring algorithm for components based on name, exports, subcategory, and path.
- **TypeScript Interface/Props Extraction**: Dynamically parses TypeScript interface and type declarations from the components so the LLM gets exact prop types.
- **Internal Dependency Analysis**: Reveals a component's internal Untitled UI imports — handy when inlining source directly (the official CLI install resolves dependencies on its own).
- **Usage Examples & Official Install Command**: Surfaces real `.demo.tsx` usage examples, and emits the official Untitled UI CLI command (`npx untitledui@latest add <name> --yes`) to drop a component straight into your project — the CLI resolves every dependency for you.

---

## Configuration

To use this server with your AI assistant, add it to your client's configuration file. The server will automatically download the components and build the search index on its first run.

### Claude Desktop / Claude Code

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "untitled-ui": {
      "command": "npx",
      "args": ["-y", "mcp-server-untitled-ui"]
    }
  }
}
```

### Cursor

1. Go to **Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in:
   - **Name**: `untitled-ui`
   - **Type**: `command`
   - **Command**: `npx -y mcp-server-untitled-ui`

### Continue / Other stdio clients

Configure using the standard stdio protocol pattern by executing `npx -y mcp-server-untitled-ui`.

---

## CLI Options & Manual Setup (Optional)

If you want to manually run the download/index setup or rebuild the local cache, you can run the server directly in your terminal:

```bash
npx mcp-server-untitled-ui [options]

Options:
  --setup              Download/rebuild index only and exit (useful for CI/CD or pre-setup)
  --rebuild            Force re-download from GitHub and rebuild index
  --ttl <days>         Days before the index is automatically refreshed on startup (default: 7)
  --no-auto-refresh    Disable automatic index refresh on startup
  --version            Print server version
  --help               Show this help menu
```

### First Run Experience

When the server starts (either manually or via an MCP client) for the first time, it will:

1. Download the latest component tarball from GitHub (`untitleduico/react` and `untitleduico/icons`).
2. Extract them to a temporary directory.
3. Parse and index component `.tsx`/`.ts` files (ignoring stories, tests, and pure utility modules), indexing `.demo.tsx` files separately as usage examples that are matched back to the components they actually render.
4. Save the generated search index to `~/.mcp-server-untitled-ui/index.json`.
5. Start the stdio MCP server.

Subsequent starts run the server instantly using the local index.

### Auto-Refresh

The server tracks when the index was built (`generatedAt`). On each startup it compares the index age against a TTL (default: **7 days**). If the index is older than the TTL, it silently re-downloads and rebuilds the index before starting — keeping your component library current without any user action.

To override the TTL:

```bash
# Rebuild if the index is older than 14 days
npx mcp-server-untitled-ui --ttl 14

# Never auto-refresh (serve the cached index indefinitely)
npx mcp-server-untitled-ui --no-auto-refresh
```

The TTL can also be set persistently via the `MCP_SERVER_UNTITLED_UI_REFRESH_DAYS` environment variable (see [Environment Variables](#environment-variables) below).

---

## Environment Variables

The following environment variables can be used to customize server behaviour without passing CLI flags:

| Variable                                | Default                     | Description                                                                                                                        |
| --------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `MCP_SERVER_UNTITLED_UI_DATA_DIR`       | `~/.mcp-server-untitled-ui` | Override the directory where the index and cache are stored. Useful for running multiple isolated instances or in CI environments. |
| `MCP_SERVER_UNTITLED_UI_REFRESH_DAYS`   | `7`                         | Days before the cached index is considered stale and automatically rebuilt on startup. Set to `0` to always rebuild.               |
| `MCP_SERVER_UNTITLED_UI_COMPONENTS_URL` | GitHub `main` tarball       | Override the URL for the components tarball. Useful for pinning a specific release or pointing at a private mirror.                 |
| `MCP_SERVER_UNTITLED_UI_ICONS_URL`      | GitHub `main` tarball       | Override the URL for the icons tarball.                                                                                            |

Example — store the index in a project-local cache:

```bash
MCP_SERVER_UNTITLED_UI_DATA_DIR=./.cache/untitled-ui npx mcp-server-untitled-ui
```

---

## How It Works

The server is split into two layers, each chosen to avoid Untitled UI's remote rate limits:

- **Search & reference — local cache.** Component source, props, dependencies, examples, and icons are served from a local index built once from the public GitHub repos. Browsing and searching never touch a remote API, so there are no keys, no rate limits, and no per-call latency.
- **Installation — official CLI.** When you actually want a component in a real project, `get_install_command` hands off to the official `untitledui` CLI. You get the supported, up-to-date install path, and dependency resolution is the CLI's job — not ours.

### Two ways to use a component

1. **Inline the source** — use `get_component`, `get_component_examples`, and `get_component_dependencies` to read the code and have the assistant write it (and the internal imports it lists) into your project directly.
2. **Install via the CLI** — use `get_install_command` to get `npx untitledui@latest add <name> --yes`. Running it copies the component into your project along with every dependency the CLI determines it needs. The `--yes` flag runs non-interactively (suitable for AI agents and CI).

> **Note on names:** component names in this server are derived from file paths (kebab-case, e.g. `date-picker`). The official CLI resolves names against its own curated registry, which is largely the same but not identical — some internal sub-components (e.g. `avatar-label-group`) aren't separately installable and come in as part of their parent component group. If the CLI reports "No components found", install the parent component instead.

---

## MCP Capabilities Exposed

### 1. Tools

| Tool                         | Input Parameters                                      | Description                                                             |
| ---------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `search_components`          | `query` (string), `limit` (number, default: 20)       | Fuzzy search components by name, category, subcategory, or export name. |
| `list_components`            | `category` (string), `subcategory` (string, optional) | List all components in a category (case-insensitive).                   |
| `get_component`              | `name` (string)                                       | Retrieve full TypeScript source code of a component by name.            |
| `get_component_file`         | `path` (string)                                       | Retrieve component source code by relative path.                        |
| `search_icons`               | `query` (string), `limit` (number, default: 20)       | Search Untitled UI icon names.                                          |
| `get_component_props`        | `name` (string)                                       | Get TypeScript prop interfaces/types for a component.                   |
| `get_component_dependencies` | `name` (string)                                       | Show internal Untitled UI imports utilized by the component.            |
| `get_component_examples`     | `name` (string)                                       | Get usage example(s) for a component from its co-located `.demo.tsx` files. |
| `get_install_command`        | `name` (string)                                       | Get the official `untitledui` CLI command to install a component (the CLI resolves all dependencies automatically). |

### 2. Resources

Enables client side resource browsing for components without requiring tool calls:

- `untitled-ui://components` — JSON array of all component categories with counts.
- `untitled-ui://components/{category}` — JSON array of components under the specified category.
- `untitled-ui://components/{category}/{name}` — Full raw TypeScript source code of a specific component.
- `untitled-ui://icons` — JSON list of all icons.

### 3. Prompts

Provides templated workflows to assist LLMs in building UI screens:

- `build_component` (`description`): Emits system context and matches existing components relevant to the UI screen you want to build.
- `map_design_to_components` (`design_description`): Guides the LLM to break a visual design description into logical sections and map them to Untitled UI components.
- `component_usage` (`component_name`): Generates imports, props descriptions, and a complete usage example for a component.

---

## Development

### Run Tests

This project uses Node.js's native test runner. You can execute the test suites by running:

```bash
npm test
```

### Run Locally

To run the server locally during development:

```bash
npm start
```

To force a rebuild of the index locally:

```bash
node bin/cli.mjs --rebuild
```

---

## License

This project is licensed under the [MIT License](LICENSE).

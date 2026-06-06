import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";

// Schema version of the on-disk index. Bump when the index shape or contents
// change so stale installs auto-rebuild. bin/cli.mjs imports this as its single
// source. v3: exclude pure util modules from components[] and match demos to the
// components they actually render.
export const CURRENT_INDEX_VERSION = 3;

/**
 * Directory portion of a relative path (everything but the final segment),
 * always using forward slashes. Used to co-locate components with their demos.
 * @param {string} relativePath
 * @returns {string}
 */
function dirOf(relativePath) {
  return relativePath.split(/[/\\]/).slice(0, -1).join("/");
}

export function extractExports(source) {
  const names = [];
  const funcRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  const constRegex = /export\s+(?:const|let|var)\s+(\w+)/g;
  const defaultRegex = /export\s+default\s+(?:(?:function|class)\s+)?(\w+)/g;

  for (const regex of [funcRegex, constRegex, defaultRegex]) {
    let match;
    while ((match = regex.exec(source)) !== null) {
      names.push(match[1]);
    }
  }
  return [...new Set(names)];
}

function extractBalancedBlock(source, startIndex) {
  let depth = 0;
  for (let i = startIndex; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(startIndex, i + 1);
    }
  }
  return source.slice(startIndex);
}

export function extractProps(source) {
  const props = [];
  const interfaceRegex = /export\s+interface\s+\w+\s*(?:extends\s+[^{]*)?\{/g;
  let match;
  while ((match = interfaceRegex.exec(source)) !== null) {
    const braceStart = source.indexOf("{", match.index);
    const block = extractBalancedBlock(source, braceStart);
    const full = source.slice(match.index, braceStart) + block;
    props.push(full.trim());
  }
  const typeRegex = /export\s+type\s+\w+\s*=/g;
  while ((match = typeRegex.exec(source)) !== null) {
    const afterEquals = match.index + match[0].length;
    const rest = source.slice(afterEquals).trimStart();
    if (rest.startsWith("{")) {
      const block = extractBalancedBlock(source, afterEquals + (source.slice(afterEquals).indexOf("{")));
      props.push((match[0] + " " + block.trim() + ";").trim());
    } else {
      const semi = source.indexOf(";", afterEquals);
      if (semi !== -1) {
        props.push(source.slice(match.index, semi + 1).trim());
      }
    }
  }
  return props;
}

/**
 * Whether a parsed module looks like a UI component rather than a pure utility
 * or data module. We require at least one PascalCase export (a component or
 * context) or a hook-style export (useX). This filters out helpers such as
 * `utils.ts` (getInitials) or `badge-types.ts` (badgeTypes) that live in the
 * component tree but are not components themselves.
 * @param {string[]} exports
 * @returns {boolean}
 */
export function isComponentModule(exports) {
  return exports.some((name) => /^[A-Z]/.test(name) || /^use[A-Z]/.test(name));
}

export function extractDependencies(source) {
  const deps = [];
  const regex = /import\s+[\s\S]*?from\s+["'](@\/[^"']+)["']/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    deps.push(match[1]);
  }
  return [...new Set(deps)];
}

export function parseComponentFile(source, relativePath) {
  const fileName = basename(relativePath, extname(relativePath));
  const parts = relativePath.split(/[/\\]/);
  const category = parts[0] || "";
  const subcategory = parts.length > 2 ? parts[1] : "";

  return {
    name: fileName,
    category,
    subcategory,
    relativePath,
    dir: dirOf(relativePath),
    importPath: `@/components/${relativePath.replace(extname(relativePath), "")}`,
    exports: extractExports(source),
    source,
    props: extractProps(source),
    dependencies: extractDependencies(source),
  };
}

export function buildIndex(componentsDir, iconsDir) {
  const components = [];
  const examples = [];
  const icons = [];

  if (componentsDir) {
    walkComponents(componentsDir, componentsDir, components, examples);
  }

  if (iconsDir) {
    walkIcons(iconsDir, icons);
  }

  return {
    version: CURRENT_INDEX_VERSION,
    generatedAt: new Date().toISOString(),
    components,
    examples,
    icons,
  };
}

function walkComponents(dir, baseDir, components, examples) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === "internal" || entry === "shared-assets") continue;
      walkComponents(fullPath, baseDir, components, examples);
    } else if (entry.endsWith(".demo.tsx")) {
      const source = readFileSync(fullPath, "utf-8");
      const relPath = relative(baseDir, fullPath);
      examples.push({
        name: basename(relPath, ".demo.tsx"),
        relativePath: relPath,
        dir: dirOf(relPath),
        source,
      });
    } else if (
      (entry.endsWith(".tsx") || entry.endsWith(".ts")) &&
      !entry.endsWith(".story.tsx") &&
      !entry.endsWith(".test.tsx") &&
      !entry.endsWith(".d.ts")
    ) {
      const source = readFileSync(fullPath, "utf-8");
      const relPath = relative(baseDir, fullPath);
      const parsed = parseComponentFile(source, relPath);
      if (isComponentModule(parsed.exports)) {
        components.push(parsed);
      }
    }
  }
}

function walkIcons(dir, icons, baseDir = dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      walkIcons(fullPath, icons, baseDir);
    } else if (entry.endsWith(".svg")) {
      icons.push({
        name: basename(entry, ".svg"),
        file: relative(baseDir, fullPath),
      });
    }
  }
}

export function writeIndex(index, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(index, null, 2));
}

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename, dirname, relative, extname } from "node:path";

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
    importPath: `@/components/${relativePath.replace(extname(relativePath), "")}`,
    exports: extractExports(source),
    source,
    props: extractProps(source),
    dependencies: extractDependencies(source),
  };
}

export function buildIndex(componentsDir, iconsDir) {
  const components = [];
  const icons = [];

  if (componentsDir) {
    walkComponents(componentsDir, componentsDir, components);
  }

  if (iconsDir) {
    walkIcons(iconsDir, icons);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    components,
    icons,
  };
}

function walkComponents(dir, baseDir, components) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === "internal" || entry === "shared-assets") continue;
      walkComponents(fullPath, baseDir, components);
    } else if (
      (entry.endsWith(".tsx") || entry.endsWith(".ts")) &&
      !entry.endsWith(".demo.tsx") &&
      !entry.endsWith(".story.tsx") &&
      !entry.endsWith(".test.tsx") &&
      !entry.endsWith(".d.ts")
    ) {
      const source = readFileSync(fullPath, "utf-8");
      const relPath = relative(baseDir, fullPath);
      const parsed = parseComponentFile(source, relPath);
      if (parsed.exports.length > 0) {
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

import Fuse from "fuse.js";

export function createComponentSearch(components) {
  const fuse = new Fuse(components, {
    keys: [
      { name: "name", weight: 2.0 },
      { name: "exports", weight: 1.5 },
      { name: "subcategory", weight: 1.0 },
      { name: "category", weight: 0.8 },
      { name: "relativePath", weight: 0.5 },
    ],
    threshold: 0.4,
    includeScore: true,
  });

  return function search(query, limit = 20) {
    const results = fuse.search(query, { limit });
    return results.map((r) => r.item);
  };
}

export function createIconSearch(icons) {
  const fuse = new Fuse(icons, {
    keys: [{ name: "name", weight: 1.0 }],
    threshold: 0.4,
    includeScore: true,
  });

  return function search(query, limit = 20) {
    const results = fuse.search(query, { limit });
    return results.map((r) => r.item);
  };
}

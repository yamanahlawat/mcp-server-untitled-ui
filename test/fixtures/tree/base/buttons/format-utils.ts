// A pure utility module that lives in the component tree but is not a component.
// buildIndex should NOT index this as a component (no PascalCase/hook export).
export const formatLabel = (label: string) => label.trim();

export function toSlug(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

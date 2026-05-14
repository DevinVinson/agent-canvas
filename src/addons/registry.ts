import type { AddonRegistryEntry } from "./types";
import { addonRegistry } from "./registry.generated";

const addonById = new Map(addonRegistry.map((entry) => [entry.id, entry]));

function compareAddonEntries(
  first: AddonRegistryEntry,
  second: AddonRegistryEntry,
): number {
  if (first.order !== second.order) {
    return first.order - second.order;
  }

  return first.manifest.title.localeCompare(second.manifest.title);
}

export function getAddonById(
  addonId: string | undefined,
): AddonRegistryEntry | undefined {
  if (!addonId) return undefined;
  return addonById.get(addonId);
}

export function getAddonSidebarEntries(): AddonRegistryEntry[] {
  return [...addonRegistry].sort(compareAddonEntries);
}

export { addonRegistry };

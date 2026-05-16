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

export function getAddonSidebarEntries(
  entries: AddonRegistryEntry[] = addonRegistry,
): AddonRegistryEntry[] {
  return entries
    .filter(
      (entry) => entry.hasRoute && entry.manifest.sidebar?.visible !== false,
    )
    .sort(compareAddonEntries);
}

export function getAddonAppStyleEntries(): AddonRegistryEntry[] {
  return addonRegistry.filter((entry) => entry.hasAppCss);
}

export function getAddonAppStyleAttribute(
  entries: AddonRegistryEntry[] = addonRegistry,
): string | undefined {
  const addonIds = entries
    .filter((entry) => entry.hasAppCss)
    .map((entry) => entry.id)
    .join(" ");

  return addonIds || undefined;
}

export { addonRegistry };

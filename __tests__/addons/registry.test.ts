import { describe, expect, it } from "vitest";
import {
  getAddonAppStyleAttribute,
  getAddonSidebarEntries,
} from "#/addons/registry";
import type { AddonRegistryEntry } from "#/addons/types";

function makeEntry(
  id: string,
  overrides: Partial<AddonRegistryEntry> = {},
): AddonRegistryEntry {
  return {
    id,
    manifest: {
      name: id,
      title: id,
      frontend: { entry: "src/index.tsx" },
      sidebar: {},
    },
    order: 500,
    hasAppCss: false,
    hasRoute: true,
    load: async () => ({
      default: () => ({
        Component: () => null,
      }),
    }),
    ...overrides,
  };
}

describe("add-on registry helpers", () => {
  it("hides route-less and explicitly hidden add-ons from the sidebar", () => {
    const entries = [
      makeEntry("visible", { order: 200 }),
      makeEntry("style-only", {
        hasRoute: false,
        manifest: {
          name: "style-only",
          title: "Style Only",
          frontend: { route: false },
          sidebar: { visible: false },
        },
      }),
      makeEntry("hidden-route", {
        hasRoute: true,
        manifest: {
          name: "hidden-route",
          title: "Hidden Route",
          frontend: { entry: "src/index.tsx" },
          sidebar: { visible: false },
        },
      }),
    ];

    expect(getAddonSidebarEntries(entries).map((entry) => entry.id)).toEqual([
      "visible",
    ]);
  });

  it("returns a stable app style attribute for add-ons with app CSS", () => {
    const entries = [
      makeEntry("plain"),
      makeEntry("canvas-polish", { hasAppCss: true }),
      makeEntry("focus-mode", { hasAppCss: true }),
    ];

    expect(getAddonAppStyleAttribute(entries)).toBe("canvas-polish focus-mode");
  });

  it("omits the app style attribute when no add-ons contribute app CSS", () => {
    expect(getAddonAppStyleAttribute([makeEntry("plain")])).toBeUndefined();
  });
});

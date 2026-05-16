import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AddonRegistryProvider,
  RUNTIME_ADDONS_QUERY_KEY,
  useAddonRegistry,
  useAddonSidebarEntries,
} from "#/addons/runtime-registry";
import type { AddonRegistryEntry } from "#/addons/types";

const serviceMocks = vi.hoisted(() => ({
  getRegistry: vi.fn(),
  openEventStream: vi.fn(),
  isAvailable: vi.fn(),
}));

vi.mock("#/api/addon-runtime-service/addon-runtime-service.api", () => ({
  default: serviceMocks,
}));

vi.mock("#/addons/registry", () => ({
  addonRegistry: [
    {
      id: "generated-addon",
      manifest: {
        name: "generated-addon",
        title: "generated-addon",
        frontend: { entry: "src/index.tsx" },
      },
      order: 500,
      hasAppCss: false,
      hasRoute: true,
      load: async () => ({
        default: () => ({ Component: () => null }),
      }),
    },
  ],
  getAddonSidebarEntries: (entries: AddonRegistryEntry[]) =>
    entries
      .filter(
        (entry) => entry.hasRoute && entry.manifest.sidebar?.visible !== false,
      )
      .sort((first, second) => first.order - second.order),
  getAddonAppStyleAttribute: (entries: AddonRegistryEntry[]) => {
    const ids = entries
      .filter((entry) => entry.hasAppCss)
      .map((entry) => entry.id)
      .join(" ");
    return ids || undefined;
  },
}));

function renderWithProvider(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AddonRegistryProvider>{ui}</AddonRegistryProvider>
      </QueryClientProvider>,
    ),
  };
}

function SidebarProbe() {
  const entries = useAddonSidebarEntries();
  return (
    <ul>
      {entries.map((entry) => (
        <li key={entry.id}>{entry.id}</li>
      ))}
    </ul>
  );
}

function RefreshProbe() {
  const { refreshRuntimeAddons } = useAddonRegistry();
  return (
    <button type="button" onClick={refreshRuntimeAddons}>
      refresh
    </button>
  );
}

describe("AddonRegistryProvider", () => {
  beforeEach(() => {
    serviceMocks.isAvailable.mockReturnValue(true);
    serviceMocks.getRegistry.mockResolvedValue({
      version: "v1",
      diagnostics: [],
      addons: [
        {
          id: "runtime-addon",
          manifest: {
            name: "runtime-addon",
            title: "Runtime Add-on",
            frontend: { entry: "src/index.tsx" },
          },
          order: 100,
          hasRoute: true,
          hasAppCss: true,
          entryUrl: "/__agent_canvas_addons/v1/runtime-addon/entry.js",
          styleUrls: ["/__agent_canvas_addons/v1/runtime-addon/style.css"],
          appStyleUrls: [
            "/__agent_canvas_addons/v1/runtime-addon/app-css/app.css",
          ],
        },
      ],
    });
    serviceMocks.openEventStream.mockImplementation(
      () => new Promise(() => {}),
    );
    document.head
      .querySelectorAll("link[data-agent-canvas-runtime-addon]")
      .forEach((node) => node.remove());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("combines generated and runtime sidebar entries", async () => {
    renderWithProvider(<SidebarProbe />);

    expect(await screen.findByText("runtime-addon")).toBeInTheDocument();
    expect(screen.getByText("generated-addon")).toBeInTheDocument();
  });

  it("injects runtime CSS links and avoids interval polling", async () => {
    renderWithProvider(<SidebarProbe />);

    await screen.findByText("runtime-addon");
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    await Promise.resolve();

    expect(
      document.head.querySelectorAll("link[data-agent-canvas-runtime-addon]"),
    ).toHaveLength(2);
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it("invalidates the runtime registry once when an add-on event arrives", async () => {
    let eventHandler:
      | Parameters<typeof serviceMocks.openEventStream>[0]
      | undefined;
    serviceMocks.openEventStream.mockImplementation((onEvent) => {
      eventHandler = onEvent;
      return new Promise(() => {});
    });

    const { queryClient } = renderWithProvider(<SidebarProbe />);
    await screen.findByText("runtime-addon");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    eventHandler?.({
      type: "addons:changed",
      version: "v2",
      addonIds: ["runtime-addon"],
      diagnostics: [],
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: RUNTIME_ADDONS_QUERY_KEY,
      });
    });
  });

  it("manual refresh invalidates the runtime registry", async () => {
    const { queryClient } = renderWithProvider(<RefreshProbe />);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    screen.getByRole("button", { name: "refresh" }).click();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: RUNTIME_ADDONS_QUERY_KEY,
    });
  });
});

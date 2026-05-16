import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AddonHostRoute from "#/routes/addon-host";
import {
  NavigationProvider,
  type NavigationContextValue,
} from "#/context/navigation-context";
import type { AddonRegistryEntry } from "#/addons/types";

const getAddonByIdMock = vi.hoisted(() => vi.fn());

vi.mock("#/addons/registry", () => ({
  getAddonById: getAddonByIdMock,
}));

function makeEntry(
  id: string,
  overrides: Partial<AddonRegistryEntry> = {},
): AddonRegistryEntry {
  return {
    id,
    manifest: {
      name: id,
      title: "Example Add-on",
      frontend: { entry: "src/index.tsx" },
    },
    order: 500,
    hasAppCss: false,
    hasRoute: true,
    load: async () => ({
      default: () => ({
        Component: ({ basePath }) => (
          <p data-testid="addon-page">mounted at {basePath}</p>
        ),
      }),
    }),
    ...overrides,
  };
}

function renderAddonRoute(path = "/addons/example") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const navigation: NavigationContextValue = {
    currentPath: path,
    conversationId: null,
    isNavigating: false,
    navigate: vi.fn(),
  };

  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <NavigationProvider value={navigation}>
          <Routes>
            <Route path="/addons/:addonId/*" element={<AddonHostRoute />} />
          </Routes>
        </NavigationProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("AddonHostRoute", () => {
  beforeEach(() => {
    getAddonByIdMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a not-found state when the add-on is missing", () => {
    getAddonByIdMock.mockReturnValue(undefined);

    renderAddonRoute("/addons/missing");

    expect(screen.getByText("ADDONS$NOT_FOUND_TITLE")).toBeInTheDocument();
    expect(screen.getByText("ADDONS$NOT_FOUND_MESSAGE")).toBeInTheDocument();
  });

  it("shows a no-route state for style-only add-ons", () => {
    getAddonByIdMock.mockReturnValue(
      makeEntry("canvas-polish", {
        hasRoute: false,
        manifest: {
          name: "canvas-polish",
          title: "Canvas Polish",
          frontend: { route: false },
        },
        load: undefined,
      }),
    );

    renderAddonRoute("/addons/canvas-polish");

    expect(screen.getByText("Canvas Polish")).toBeInTheDocument();
    expect(screen.getByText("ADDONS$NO_ROUTE_MESSAGE")).toBeInTheDocument();
  });

  it("loads and renders a routed add-on page", async () => {
    getAddonByIdMock.mockReturnValue(makeEntry("example"));

    renderAddonRoute();

    expect(await screen.findByTestId("addon-page")).toHaveTextContent(
      "mounted at /addons/example",
    );
  });

  it("shows an error state when registration returns no component", async () => {
    getAddonByIdMock.mockReturnValue(
      makeEntry("broken", {
        load: async () => ({
          default: () => ({}) as never,
        }),
      }),
    );

    renderAddonRoute("/addons/broken");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Add-on register function must return a Component.",
      );
    });
  });

  it("catches crashes from the registered add-on component", async () => {
    getAddonByIdMock.mockReturnValue(
      makeEntry("crashy", {
        load: async () => ({
          default: () => ({
            Component: () => {
              throw new Error("render exploded");
            },
          }),
        }),
      }),
    );

    renderAddonRoute("/addons/crashy");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("render exploded");
    });
  });
});

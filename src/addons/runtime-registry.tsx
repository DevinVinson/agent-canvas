import React from "react";
import * as ReactDOM from "react-dom";
import * as jsxRuntime from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AddonRuntimeService, {
  type RuntimeAddonRegistryEntry,
} from "#/api/addon-runtime-service/addon-runtime-service.api";
import {
  addonRegistry as generatedAddonRegistry,
  getAddonAppStyleAttribute,
  getAddonSidebarEntries,
} from "./registry";
import type { AddonModule, AddonRegistryEntry, RegisterAddon } from "./types";

const RUNTIME_ADDONS_QUERY_KEY = ["addons", "runtime-registry"] as const;
const RUNTIME_LINK_ATTRIBUTE = "data-agent-canvas-runtime-addon";

interface AgentCanvasAddonHost {
  React: typeof React;
  ReactDOM: typeof ReactDOM;
  jsxRuntime: typeof jsxRuntime;
}

declare global {
  interface Window {
    AgentCanvasAddonHost?: AgentCanvasAddonHost;
    __agentCanvasRuntimeAddons?: Record<string, RegisterAddon | undefined>;
    __agentCanvasRuntimeAddonVersions?: Record<string, string | undefined>;
  }
}

interface AddonRegistryContextValue {
  entries: AddonRegistryEntry[];
  diagnostics: string[];
  runtimeVersion?: string;
  refreshRuntimeAddons(): void;
}

const AddonRegistryContext =
  React.createContext<AddonRegistryContextValue | null>(null);

function loadRuntimeAddonModule(
  entry: AddonRegistryEntry,
): Promise<AddonModule> {
  if (!entry.entryUrl) {
    return Promise.reject(new Error("Runtime add-on is missing entryUrl."));
  }
  const entryUrl = entry.entryUrl;

  const existingRegister = window.__agentCanvasRuntimeAddons?.[entry.id];
  const existingVersion = window.__agentCanvasRuntimeAddonVersions?.[entry.id];
  if (existingRegister && existingVersion === entry.runtimeVersion) {
    return Promise.resolve({ default: existingRegister });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = entryUrl;
    script.dataset.agentCanvasRuntimeAddonEntry = entry.id;
    script.onload = () => {
      const register = window.__agentCanvasRuntimeAddons?.[entry.id];
      if (register) {
        window.__agentCanvasRuntimeAddonVersions ||= {};
        window.__agentCanvasRuntimeAddonVersions[entry.id] =
          entry.runtimeVersion;
        resolve({ default: register });
      } else {
        reject(new Error(`Runtime add-on ${entry.id} did not register.`));
      }
    };
    script.onerror = () => {
      reject(new Error(`Failed to load runtime add-on ${entry.id}.`));
    };
    document.head.append(script);
  });
}

function toRegistryEntry(
  runtimeEntry: RuntimeAddonRegistryEntry,
  version: string,
): AddonRegistryEntry {
  return {
    id: runtimeEntry.id,
    manifest: runtimeEntry.manifest,
    order: runtimeEntry.order,
    hasAppCss: runtimeEntry.hasAppCss,
    hasRoute: runtimeEntry.hasRoute,
    entryUrl: runtimeEntry.entryUrl,
    styleUrls: runtimeEntry.styleUrls,
    appStyleUrls: runtimeEntry.appStyleUrls,
    iconUrl: runtimeEntry.iconUrl,
    builtAt: runtimeEntry.builtAt,
    runtimeVersion: version,
    load: runtimeEntry.entryUrl
      ? () =>
          loadRuntimeAddonModule({ ...runtimeEntry, runtimeVersion: version })
      : undefined,
  };
}

function combineEntries(
  runtimeEntries: RuntimeAddonRegistryEntry[],
  version: string,
): AddonRegistryEntry[] {
  const entriesById = new Map<string, AddonRegistryEntry>();
  for (const entry of generatedAddonRegistry) {
    entriesById.set(entry.id, entry);
  }
  for (const entry of runtimeEntries) {
    entriesById.set(entry.id, toRegistryEntry(entry, version));
  }
  return Array.from(entriesById.values());
}

function syncRuntimeCss(entries: AddonRegistryEntry[]) {
  const urls = new Map<string, { addonId: string; url: string }>();
  for (const entry of entries) {
    for (const url of [
      ...(entry.styleUrls ?? []),
      ...(entry.appStyleUrls ?? []),
    ]) {
      urls.set(url, { addonId: entry.id, url });
    }
  }

  const existingLinks = document.querySelectorAll<HTMLLinkElement>(
    `link[${RUNTIME_LINK_ATTRIBUTE}]`,
  );
  for (const link of existingLinks) {
    if (!urls.has(link.href) && !urls.has(link.getAttribute("href") ?? "")) {
      link.remove();
    }
  }

  for (const { addonId, url } of urls.values()) {
    const selector = `link[${RUNTIME_LINK_ATTRIBUTE}="${addonId}"][href="${url}"]`;
    if (document.querySelector(selector)) continue;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.setAttribute(RUNTIME_LINK_ATTRIBUTE, addonId);
    document.head.append(link);
  }
}

function syncAppStyleAttribute(entries: AddonRegistryEntry[]) {
  const value = getAddonAppStyleAttribute(entries);
  const roots = document.querySelectorAll("[data-agent-server-ui]");
  if (roots.length === 0) return;

  for (const root of roots) {
    if (value) {
      root.setAttribute("data-agent-canvas-addons", value);
    } else {
      root.removeAttribute("data-agent-canvas-addons");
    }
  }
}

function useRuntimeAddonEvents(enabled: boolean) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    AddonRuntimeService.openEventStream(() => {
      void queryClient.invalidateQueries({
        queryKey: RUNTIME_ADDONS_QUERY_KEY,
      });
    }, controller.signal).catch(() => {
      if (!controller.signal.aborted) {
        // Manual refresh remains available; avoid reconnect loops for v1.
      }
    });

    return () => {
      controller.abort();
    };
  }, [enabled, queryClient]);
}

export function AddonRegistryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (typeof window === "undefined") {
    return (
      <AddonRegistryContext.Provider
        value={{
          entries: generatedAddonRegistry,
          diagnostics: [],
          refreshRuntimeAddons() {},
        }}
      >
        {children}
      </AddonRegistryContext.Provider>
    );
  }

  return <ClientAddonRegistryProvider>{children}</ClientAddonRegistryProvider>;
}

function ClientAddonRegistryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const registryQuery = useQuery({
    queryKey: RUNTIME_ADDONS_QUERY_KEY,
    queryFn: () => AddonRuntimeService.getRegistry(),
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const runtimeRegistry = registryQuery.data;
  if (typeof window !== "undefined") {
    window.AgentCanvasAddonHost = { React, ReactDOM, jsxRuntime };
  }
  const entries = React.useMemo(
    () =>
      combineEntries(
        runtimeRegistry?.addons ?? [],
        runtimeRegistry?.version ?? "unavailable",
      ),
    [runtimeRegistry?.addons, runtimeRegistry?.version],
  );

  useRuntimeAddonEvents(AddonRuntimeService.isAvailable());

  React.useEffect(() => {
    syncRuntimeCss(entries);
    syncAppStyleAttribute(entries);
  }, [entries]);

  const value = React.useMemo<AddonRegistryContextValue>(
    () => ({
      entries,
      diagnostics: runtimeRegistry?.diagnostics ?? [],
      runtimeVersion: runtimeRegistry?.version,
      refreshRuntimeAddons() {
        void queryClient.invalidateQueries({
          queryKey: RUNTIME_ADDONS_QUERY_KEY,
        });
      },
    }),
    [
      entries,
      queryClient,
      runtimeRegistry?.diagnostics,
      runtimeRegistry?.version,
    ],
  );

  return (
    <AddonRegistryContext.Provider value={value}>
      {children}
    </AddonRegistryContext.Provider>
  );
}

export function useAddonRegistry(): AddonRegistryContextValue {
  const context = React.useContext(AddonRegistryContext);
  if (!context) {
    return {
      entries: generatedAddonRegistry,
      diagnostics: [],
      refreshRuntimeAddons() {},
    };
  }
  return context;
}

export function useAddonById(
  addonId: string | undefined,
): AddonRegistryEntry | undefined {
  const { entries } = useAddonRegistry();
  return React.useMemo(
    () => entries.find((entry) => entry.id === addonId),
    [addonId, entries],
  );
}

export function useAddonSidebarEntries(): AddonRegistryEntry[] {
  const { entries } = useAddonRegistry();
  return React.useMemo(() => getAddonSidebarEntries(entries), [entries]);
}

export { RUNTIME_ADDONS_QUERY_KEY };

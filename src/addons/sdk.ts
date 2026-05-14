import type { QueryClient } from "@tanstack/react-query";
import { getAgentServerClientOptions } from "#/api/agent-server-client-options";
import type { AddonApi, AddonRegistryEntry } from "./types";

interface CreateAddonApiOptions {
  entry: AddonRegistryEntry;
  navigate: AddonApi["navigate"];
  queryClient: QueryClient;
}

function resolveAddonApiUrl(path: string, host: string): string {
  try {
    return new URL(path, `${host.replace(/\/+$/, "")}/`).toString();
  } catch {
    return path;
  }
}

function resolveAddonNavigationTarget(to: string, basePath: string): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(to) || to.startsWith("/")) {
    return to;
  }

  const relativePath = to.replace(/^\.\//, "").replace(/^\/+/, "");
  if (!relativePath || relativePath === ".") {
    return basePath;
  }

  return `${basePath}/${relativePath}`;
}

async function parseAddonResponse<TResponse>(
  response: Response,
): Promise<TResponse> {
  if (response.status === 204) {
    return undefined as TResponse;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as TResponse;
  }

  return (await response.text()) as TResponse;
}

export function createAddonApi({
  entry,
  navigate,
  queryClient,
}: CreateAddonApiOptions): AddonApi {
  const basePath = `/addons/${entry.id}`;

  return {
    addonId: entry.id,
    basePath,
    manifest: entry.manifest,
    navigate(to, options) {
      navigate(resolveAddonNavigationTarget(to, basePath), options);
    },
    queryClient,
    async fetchJSON<TResponse = unknown>(path: string, init: RequestInit = {}) {
      const { host, apiKey } = getAgentServerClientOptions();
      const headers = new Headers(init.headers);

      if (apiKey) {
        headers.set("X-Session-API-Key", apiKey);
      }

      if (
        init.body !== undefined &&
        typeof init.body === "string" &&
        !headers.has("Content-Type")
      ) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(resolveAddonApiUrl(path, host), {
        ...init,
        headers,
      });

      if (!response.ok) {
        throw new Error(
          `Request failed with ${response.status} ${response.statusText}`,
        );
      }

      return parseAddonResponse<TResponse>(response);
    },
  };
}

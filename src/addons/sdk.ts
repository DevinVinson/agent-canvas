import { HttpClient } from "@openhands/typescript-client/client/http-client";
import type { QueryClient } from "@tanstack/react-query";
import { getAgentServerHttpClientOptions } from "#/api/agent-server-client-options";
import type {
  AddonApi,
  AddonFetchJSONOptions,
  AddonRegistryEntry,
} from "./types";

interface CreateAddonApiOptions {
  entry: AddonRegistryEntry;
  navigate: AddonApi["navigate"];
  queryClient: QueryClient;
}

function resolveAddonApiPath(path: string): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) {
    throw new Error("Add-on API paths must target the active agent-server.");
  }

  const normalizedPath = path.trim();
  if (!normalizedPath) {
    throw new Error("Add-on API path is required.");
  }

  return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
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
    async fetchJSON<TResponse = unknown>(
      path: string,
      options?: AddonFetchJSONOptions,
    ): Promise<TResponse> {
      const url = resolveAddonApiPath(path);
      const client = new HttpClient(getAgentServerHttpClientOptions());
      const response = await client.request<TResponse>({
        ...options,
        method: options?.method ?? "GET",
        url,
      });

      return response.data;
    },
  };
}

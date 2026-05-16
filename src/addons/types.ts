import type React from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { RequestOptions } from "@openhands/typescript-client/client/http-client";

export const ADDON_API_VERSION = 1;

export interface AddonManifest {
  name: string;
  title: string;
  frontend: {
    entry?: string;
    route?: boolean;
  };
  sidebar?: {
    icon?: string;
    order?: number;
    visible?: boolean;
  };
  styling?: {
    appCss?: string[];
  };
  compatibility?: {
    addon_api_version?: number;
    min_gui_version?: string;
  };
}

export interface AddonPageProps {
  api: AddonApi;
  manifest: AddonManifest;
  basePath: string;
}

export interface AddonRegistration {
  Component: React.ComponentType<AddonPageProps>;
}

export type AddonFetchJSONOptions = Omit<RequestOptions, "method" | "url"> & {
  method?: RequestOptions["method"];
  url?: never;
};

export interface AddonApi {
  addonId: string;
  basePath: string;
  manifest: AddonManifest;
  fetchJSON<TResponse = unknown>(
    path: string,
    options?: AddonFetchJSONOptions,
  ): Promise<TResponse>;
  navigate(to: string, options?: { replace?: boolean }): void;
  queryClient: QueryClient;
}

export type RegisterAddon = (
  api: AddonApi,
) => AddonRegistration | Promise<AddonRegistration>;

export interface AddonModule {
  default: RegisterAddon;
}

export type AddonIconComponent = React.ComponentType<
  React.SVGProps<SVGSVGElement>
>;

export interface AddonRegistryEntry {
  id: string;
  manifest: AddonManifest;
  order: number;
  hasAppCss: boolean;
  hasRoute: boolean;
  load?: () => Promise<AddonModule>;
  Icon?: AddonIconComponent;
  entryUrl?: string;
  styleUrls?: string[];
  appStyleUrls?: string[];
  iconUrl?: string;
  builtAt?: string;
  runtimeVersion?: string;
}

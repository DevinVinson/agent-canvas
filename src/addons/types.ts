import type React from "react";
import type { QueryClient } from "@tanstack/react-query";

export const ADDON_API_VERSION = 1;

export interface AddonManifest {
  name: string;
  title: string;
  frontend: {
    entry: string;
  };
  sidebar?: {
    icon?: string;
    order?: number;
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

export interface AddonApi {
  addonId: string;
  basePath: string;
  manifest: AddonManifest;
  fetchJSON<TResponse = unknown>(
    path: string,
    init?: RequestInit,
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
  load: () => Promise<AddonModule>;
  Icon?: AddonIconComponent;
}

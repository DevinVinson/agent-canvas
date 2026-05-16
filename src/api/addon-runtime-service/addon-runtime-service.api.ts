import axios from "axios";
import {
  getActiveBackend,
  getEffectiveLocalBackend,
} from "../backend-registry/active-store";
import type { AddonManifest } from "#/addons/types";

const ADDONS_BASE_PATH = "/api/addons";

export interface RuntimeAddonRegistryEntry {
  id: string;
  manifest: AddonManifest;
  order: number;
  hasRoute: boolean;
  hasAppCss: boolean;
  entryUrl?: string;
  styleUrls: string[];
  appStyleUrls: string[];
  iconUrl?: string;
  builtAt?: string;
}

export interface RuntimeAddonRegistryResponse {
  version: string;
  addons: RuntimeAddonRegistryEntry[];
  diagnostics: string[];
}

export interface RuntimeAddonRebuildResponse extends RuntimeAddonRegistryResponse {
  rebuiltAddonIds: string[];
}

export interface RuntimeAddonChangedEvent {
  type: "addons:changed";
  version: string;
  addonIds: string[];
  diagnostics: string[];
}

const localAddonsAxios = axios.create();

localAddonsAxios.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  if (!nextConfig.baseURL) nextConfig.baseURL = getEffectiveLocalBackend().host;

  const apiKey = import.meta.env.VITE_ADDONS_API_KEY?.trim();
  if (apiKey) {
    nextConfig.headers.set("X-API-Key", apiKey);
  }
  return nextConfig;
});

function addonsUnavailable(): RuntimeAddonRegistryResponse {
  return { version: "unavailable", addons: [], diagnostics: [] };
}

class AddonRuntimeService {
  static isAvailable(): boolean {
    return getActiveBackend().backend.kind !== "cloud";
  }

  static async getRegistry(): Promise<RuntimeAddonRegistryResponse> {
    if (!AddonRuntimeService.isAvailable()) {
      return addonsUnavailable();
    }

    try {
      const { data } = await localAddonsAxios.get<RuntimeAddonRegistryResponse>(
        `${ADDONS_BASE_PATH}/registry`,
      );
      return data;
    } catch {
      return addonsUnavailable();
    }
  }

  static async rebuild(addonId?: string): Promise<RuntimeAddonRebuildResponse> {
    const { data } = await localAddonsAxios.post<RuntimeAddonRebuildResponse>(
      `${ADDONS_BASE_PATH}/rebuild`,
      addonId ? { addonId } : {},
    );
    return data;
  }

  static async openEventStream(
    onEvent: (event: RuntimeAddonChangedEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    if (!AddonRuntimeService.isAvailable()) return;

    const apiKey = import.meta.env.VITE_ADDONS_API_KEY?.trim();
    const response = await fetch(
      `${getEffectiveLocalBackend().host}${ADDONS_BASE_PATH}/events`,
      {
        headers: apiKey ? { "X-API-Key": apiKey } : undefined,
        signal,
      },
    );

    if (!response.ok || !response.body) {
      throw new Error(`Add-on event stream failed with ${response.status}`);
    }

    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let buffer = "";

    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        const dataLine = rawEvent
          .split("\n")
          .find((line) => line.startsWith("data:"));
        if (!dataLine) continue;

        try {
          const event = JSON.parse(dataLine.slice(5).trim());
          if (event?.type === "addons:changed") {
            onEvent(event as RuntimeAddonChangedEvent);
          }
        } catch {
          // Ignore malformed event payloads; the next rebuild will emit again.
        }
      }
    }
  }
}

export default AddonRuntimeService;

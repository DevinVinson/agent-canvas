import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { HttpClient } from "@openhands/typescript-client/client/http-client";
import { createAddonApi } from "#/addons/sdk";
import type { AddonRegistryEntry } from "#/addons/types";
import { getAgentServerHttpClientOptions } from "#/api/agent-server-client-options";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@openhands/typescript-client/client/http-client", () => ({
  HttpClient: vi.fn(function HttpClientMock() {
    return {
      request: requestMock,
    };
  }),
}));

vi.mock("#/api/agent-server-client-options", () => ({
  getAgentServerHttpClientOptions: vi.fn(() => ({
    baseUrl: "http://agent-server",
    apiKey: "session-key",
  })),
}));

const addonEntry: AddonRegistryEntry = {
  id: "example",
  manifest: {
    name: "example",
    title: "Example",
    frontend: { entry: "src/index.tsx" },
  },
  order: 500,
  hasAppCss: false,
  hasRoute: true,
  load: async () => ({
    default: () => ({ Component: () => null }),
  }),
};

function makeApi(navigate = vi.fn()) {
  return createAddonApi({
    entry: addonEntry,
    navigate,
    queryClient: new QueryClient(),
  });
}

describe("createAddonApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves relative navigation inside the add-on namespace", () => {
    const navigate = vi.fn();
    const api = makeApi(navigate);

    api.navigate("details");
    api.navigate("./settings", { replace: true });
    api.navigate("/conversations");

    expect(navigate).toHaveBeenNthCalledWith(
      1,
      "/addons/example/details",
      undefined,
    );
    expect(navigate).toHaveBeenNthCalledWith(2, "/addons/example/settings", {
      replace: true,
    });
    expect(navigate).toHaveBeenNthCalledWith(3, "/conversations", undefined);
  });

  it("uses the typed HttpClient options for agent-server JSON requests", async () => {
    requestMock.mockResolvedValue({ data: { ok: true } });
    const api = makeApi();

    await expect(
      api.fetchJSON("/server_info", {
        method: "POST",
        data: { probe: true },
        headers: { "X-Test": "yes" },
      }),
    ).resolves.toEqual({ ok: true });

    expect(getAgentServerHttpClientOptions).toHaveBeenCalledOnce();
    expect(HttpClient).toHaveBeenCalledWith({
      baseUrl: "http://agent-server",
      apiKey: "session-key",
    });
    expect(requestMock).toHaveBeenCalledWith({
      method: "POST",
      data: { probe: true },
      headers: { "X-Test": "yes" },
      url: "/server_info",
    });
  });

  it("rejects absolute API URLs so add-ons use the active agent-server", async () => {
    const api = makeApi();

    await expect(api.fetchJSON("https://example.com/api")).rejects.toThrow(
      "active agent-server",
    );
    expect(requestMock).not.toHaveBeenCalled();
  });
});

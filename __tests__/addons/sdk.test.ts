import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createAddonApi } from "#/addons/sdk";
import type { AddonRegistryEntry } from "#/addons/types";

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

describe("createAddonApi", () => {
  it("resolves relative navigation inside the add-on namespace", () => {
    const navigate = vi.fn();
    const api = createAddonApi({
      entry: addonEntry,
      navigate,
      queryClient: new QueryClient(),
    });

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
});

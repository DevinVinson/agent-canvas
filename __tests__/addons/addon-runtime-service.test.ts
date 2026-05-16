import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough, Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const runtimeServiceModule =
  await import("../../scripts/addon-runtime-service.mjs");

const { createRuntimeService } = runtimeServiceModule;

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

async function makeTempRoot() {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "agent-canvas-runtime-addons-"),
  );
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ version: "1.0.0" }),
  );
  return root;
}

async function writeRoutedAddon(addonsDir: string, id = "valid-addon") {
  const addonRoot = path.join(addonsDir, id);
  await writeJson(path.join(addonRoot, ".openhands/addon.json"), {
    name: id,
    title: "Valid Add-on",
    frontend: { entry: "src/index.ts" },
    compatibility: { addon_api_version: 1 },
  });
  await fs.mkdir(path.join(addonRoot, "src"), { recursive: true });
  await fs.writeFile(
    path.join(addonRoot, "src/index.ts"),
    "export default function register() { return { Component: () => null }; }\n",
  );
}

async function writeStyleOnlyAddon(addonsDir: string) {
  const addonRoot = path.join(addonsDir, "canvas-polish");
  await writeJson(path.join(addonRoot, ".openhands/addon.json"), {
    name: "canvas-polish",
    title: "Canvas Polish",
    frontend: { route: false },
    sidebar: { visible: false },
    styling: { appCss: ["src/agent-canvas.css"] },
    compatibility: { addon_api_version: 1 },
  });
  await fs.mkdir(path.join(addonRoot, "src"), { recursive: true });
  await fs.writeFile(
    path.join(addonRoot, "src/agent-canvas.css"),
    "[data-agent-canvas-addons~='canvas-polish'] { color: white; }\n",
  );
}

function requestService(
  service: ReturnType<typeof createRuntimeService>,
  options: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  },
): Promise<{ statusCode?: number; body: string }> {
  return new Promise((resolve) => {
    const req = new PassThrough() as PassThrough & {
      method: string;
      url: string;
      headers: Record<string, string>;
    };
    const chunks: Buffer[] = [];
    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    }) as any;
    req.method = options.method;
    req.url = options.url;
    req.headers = options.headers ?? {};
    res.writeHead = (
      statusCode: number,
      headers: Record<string, string | number> = {},
    ) => {
      res.statusCode = statusCode;
      res.headers = headers;
    };
    res.end = (chunk?: string | Buffer) => {
      if (chunk) chunks.push(Buffer.from(chunk));
      resolve({
        statusCode: res.statusCode,
        body: Buffer.concat(chunks).toString("utf8"),
      });
    };

    service.server.emit("request", req, res);
    req.end(options.body ? JSON.stringify(options.body) : undefined);
  });
}

describe("addon-runtime-service", () => {
  let cleanupRoots: string[] = [];

  beforeEach(() => {
    cleanupRoots = [];
  });

  afterEach(async () => {
    await Promise.all(
      cleanupRoots.map((root) => fs.rm(root, { recursive: true, force: true })),
    );
  });

  it("builds routed and style-only add-ons into the runtime registry", async () => {
    const root = await makeTempRoot();
    cleanupRoots.push(root);
    const addonsDir = path.join(root, "addons");
    const buildRoot = path.join(root, "builds");
    await writeRoutedAddon(addonsDir);
    await writeStyleOnlyAddon(addonsDir);

    const service = createRuntimeService({
      root,
      addonsDir,
      buildRoot,
      apiKey: "secret",
    });

    const response = (await service.rebuild()) as any;
    const ids = response.addons.map((addon: any) => addon.id);

    expect(ids).toEqual(["canvas-polish", "valid-addon"]);
    expect(
      response.addons.find((addon: any) => addon.id === "valid-addon"),
    ).toMatchObject({
      hasRoute: true,
      entryUrl: expect.stringContaining("/__agent_canvas_addons/"),
    });
    expect(
      response.addons.find((addon: any) => addon.id === "canvas-polish"),
    ).toMatchObject({
      hasAppCss: true,
      appStyleUrls: [expect.stringContaining("agent-canvas.css")],
    });
  }, 30000);

  it("reports diagnostics for invalid add-ons", async () => {
    const root = await makeTempRoot();
    cleanupRoots.push(root);
    const addonsDir = path.join(root, "addons");
    const addonRoot = path.join(addonsDir, "broken-addon");
    await writeJson(path.join(addonRoot, ".openhands/addon.json"), {
      name: "broken-addon",
      title: "Broken",
      frontend: { entry: "../outside.ts" },
    });

    const service = createRuntimeService({
      root,
      addonsDir,
      buildRoot: path.join(root, "builds"),
      apiKey: "secret",
    });
    const response = (await service.rebuild()) as any;

    expect(response.addons).toEqual([]);
    expect(response.diagnostics.join("\n")).toContain(
      "frontend.entry must stay inside the add-on directory",
    );
  });

  it("protects rebuild and events endpoints with the configured API key", async () => {
    const root = await makeTempRoot();
    cleanupRoots.push(root);
    const service = createRuntimeService({
      root,
      addonsDir: path.join(root, "addons"),
      buildRoot: path.join(root, "builds"),
      apiKey: "secret",
    });

    await expect(
      requestService(service, { method: "GET", url: "/api/addons/registry" }),
    ).resolves.toMatchObject({ statusCode: 200 });
    await expect(
      requestService(service, { method: "POST", url: "/api/addons/rebuild" }),
    ).resolves.toMatchObject({ statusCode: 401 });
    await expect(
      requestService(service, { method: "GET", url: "/api/addons/events" }),
    ).resolves.toMatchObject({ statusCode: 401 });
    await expect(
      requestService(service, {
        method: "POST",
        url: "/api/addons/rebuild",
        headers: { authorization: "Bearer secret" },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });
    await expect(
      requestService(service, {
        method: "POST",
        url: "/api/addons/rebuild",
        headers: { "x-api-key": "secret" },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });
  });
});

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const generatorScript = path.join(
  repoRoot,
  "scripts/generate-addons-registry.mjs",
);

async function makeTempRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-canvas-addons-"));
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ version: "1.0.0" }),
  );
  return root;
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

async function runGenerator(root: string, extraArgs: string[] = []) {
  await execFileAsync(process.execPath, [
    generatorScript,
    "--root",
    root,
    "--quiet",
    ...extraArgs,
  ]);
  return fs.readFile(
    path.join(root, "src/addons/registry.generated.ts"),
    "utf8",
  );
}

describe("generate-addons-registry", () => {
  it("generates an empty registry when the add-ons directory is absent", async () => {
    const root = await makeTempRoot();

    const generated = await runGenerator(root);

    expect(generated).toContain("export const addonRegistry");
    expect(generated).toContain("AddonRegistryEntry[] = [];");
  });

  it("discovers valid routed add-ons and imports their entry and icon", async () => {
    const root = await makeTempRoot();
    const addonRoot = path.join(root, "addons/valid-addon");

    await writeJson(path.join(addonRoot, ".openhands/addon.json"), {
      name: "valid-addon",
      title: "Valid Add-on",
      frontend: { entry: "src/index.tsx" },
      sidebar: { icon: "src/sidebar.svg", order: 120 },
      compatibility: { addon_api_version: 1, min_gui_version: "0.1.0" },
    });
    await fs.mkdir(path.join(addonRoot, "src"), { recursive: true });
    await fs.writeFile(
      path.join(addonRoot, "src/index.tsx"),
      "export default function register() { return { Component: () => null }; }\n",
    );
    await fs.writeFile(path.join(addonRoot, "src/sidebar.svg"), "<svg />\n");

    const generated = await runGenerator(root);

    expect(generated).toContain('id: "valid-addon"');
    expect(generated).toContain('title": "Valid Add-on"');
    expect(generated).toContain("order: 120");
    expect(generated).toContain("hasAppCss: false");
    expect(generated).toContain("hasRoute: true");
    expect(generated).toContain('import("../../addons/valid-addon/src/index")');
    expect(generated).toContain(
      'from "../../addons/valid-addon/src/sidebar.svg?react"',
    );
  });

  it("discovers style-only add-ons without route entries", async () => {
    const root = await makeTempRoot();
    const addonRoot = path.join(root, "addons/canvas-polish");

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

    const generated = await runGenerator(root);

    expect(generated).toContain('id: "canvas-polish"');
    expect(generated).toContain(
      'import "../../addons/canvas-polish/src/agent-canvas.css";',
    );
    expect(generated).toContain('"route": false');
    expect(generated).toContain('"visible": false');
    expect(generated).toContain("hasAppCss: true");
    expect(generated).toContain("hasRoute: false");
    expect(generated).not.toContain(
      'import("../../addons/canvas-polish/src/index")',
    );
  });

  it("skips route-less add-ons that try to register JavaScript", async () => {
    const root = await makeTempRoot();
    const addonRoot = path.join(root, "addons/route-less-script");

    await writeJson(path.join(addonRoot, ".openhands/addon.json"), {
      name: "route-less-script",
      title: "Route-less Script",
      frontend: { route: false, entry: "src/index.tsx" },
      compatibility: { addon_api_version: 1 },
    });
    await fs.mkdir(path.join(addonRoot, "src"), { recursive: true });
    await fs.writeFile(
      path.join(addonRoot, "src/index.tsx"),
      "export default function register() { return { Component: () => null }; }\n",
    );

    const generated = await runGenerator(root);

    expect(generated).not.toContain("route-less-script");
  });

  it("skips add-ons with invalid app CSS entries", async () => {
    const root = await makeTempRoot();
    const addonRoot = path.join(root, "addons/broken-styles");

    await writeJson(path.join(addonRoot, ".openhands/addon.json"), {
      name: "broken-styles",
      title: "Broken Styles",
      frontend: { route: false },
      styling: { appCss: ["src/agent-canvas.scss"] },
      compatibility: { addon_api_version: 1 },
    });
    await fs.mkdir(path.join(addonRoot, "src"), { recursive: true });
    await fs.writeFile(
      path.join(addonRoot, "src/agent-canvas.scss"),
      ".broken { color: white; }\n",
    );

    const generated = await runGenerator(root);

    expect(generated).not.toContain("broken-styles");
  });

  it("supports an explicit add-ons directory outside the root", async () => {
    const root = await makeTempRoot();
    const externalRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "agent-canvas-external-addons-"),
    );
    const addonRoot = path.join(externalRoot, "external-addon");

    await writeJson(path.join(addonRoot, ".openhands/addon.json"), {
      name: "external-addon",
      title: "External Add-on",
      frontend: { entry: "src/index.tsx" },
      compatibility: { addon_api_version: 1 },
    });
    await fs.mkdir(path.join(addonRoot, "src"), { recursive: true });
    await fs.writeFile(
      path.join(addonRoot, "src/index.tsx"),
      "export default function register() { return { Component: () => null }; }\n",
    );

    const generated = await runGenerator(root, ["--addons-dir", externalRoot]);

    expect(generated).toContain('id: "external-addon"');
    expect(generated).toContain("external-addon/src/index");
  });

  it("skips invalid routed add-ons", async () => {
    const root = await makeTempRoot();
    const addonRoot = path.join(root, "addons/broken-addon");

    await writeJson(path.join(addonRoot, ".openhands/addon.json"), {
      name: "broken-addon",
      title: "Broken Add-on",
      frontend: { entry: "../outside.tsx" },
      compatibility: { addon_api_version: 1 },
    });

    const generated = await runGenerator(root);

    expect(generated).not.toContain("broken-addon");
  });
});

#!/usr/bin/env node

import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import svgr from "vite-plugin-svgr";
import {
  ADDONS_DIR_ENV,
  discoverAddons,
  pathExists,
  resolveConfigPath,
  resolveDefaultRuntimeAddonsDir,
} from "./addon-discovery.mjs";

const DEFAULT_PORT = 18002;
const DEFAULT_BUILD_ROOT = path.join(
  os.homedir(),
  ".openhands",
  "agent-canvas",
  "addon-builds",
);
const ASSET_PREFIX = "/__agent_canvas_addons";
const API_PREFIX = "/api/addons";
const MIME = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function parseArgs(argv = process.argv.slice(2), env = process.env) {
  const config = {
    host: env.ADDONS_HOST ?? "127.0.0.1",
    port: Number.parseInt(env.ADDONS_PORT ?? "", 10) || DEFAULT_PORT,
    root: process.cwd(),
    addonsDir: env[ADDONS_DIR_ENV]
      ? resolveConfigPath(env[ADDONS_DIR_ENV], process.cwd())
      : resolveDefaultRuntimeAddonsDir(),
    buildRoot: env.AGENT_CANVAS_ADDON_BUILDS_DIR
      ? resolveConfigPath(env.AGENT_CANVAS_ADDON_BUILDS_DIR, process.cwd())
      : DEFAULT_BUILD_ROOT,
    apiKey: env.OPENHANDS_ADDONS_API_KEY ?? env.ADDONS_API_KEY ?? "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--host") {
      config.host = argv[++index] ?? config.host;
    } else if (arg === "--port") {
      config.port = Number.parseInt(argv[++index] ?? "", 10) || config.port;
    } else if (arg === "--root") {
      config.root = path.resolve(argv[++index] ?? config.root);
    } else if (arg === "--addons-dir") {
      config.addonsDir = resolveConfigPath(argv[++index] ?? "", config.root);
    } else if (arg === "--build-root") {
      config.buildRoot = resolveConfigPath(argv[++index] ?? "", config.root);
    } else if (arg === "--api-key") {
      config.apiKey = argv[++index] ?? config.apiKey;
    } else if (arg === "--help" || arg === "-h") {
      showHelp();
      process.exit(0);
    }
  }

  return config;
}

function showHelp() {
  console.log(`
Agent Canvas runtime add-on service

USAGE:
  node scripts/addon-runtime-service.mjs [options]

OPTIONS:
  --host <host>             Host to bind (default: 127.0.0.1)
  --port <port>             Port to bind (default: 18002)
  --root <dir>              Agent Canvas repo root
  --addons-dir <dir>        Source add-ons dir
  --build-root <dir>        Built add-ons dir
  --api-key <key>           Required key for rebuild/events
`);
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-cache",
  });
  res.end(payload);
}

function parseAuthHeader(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization === "string") {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (match) return match[1].trim();
  }

  const apiKey = req.headers["x-api-key"];
  return Array.isArray(apiKey) ? apiKey[0] : apiKey;
}

function isAuthorized(req, apiKey) {
  if (!apiKey) return true;
  return parseAuthHeader(req) === apiKey;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error(`Invalid JSON: ${error.message}`));
      }
    });
    req.on("error", reject);
  });
}

function isPathInsideDir(dirAbs, filePath) {
  const relativePath = path.relative(dirAbs, filePath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function publicUrl(...parts) {
  return [ASSET_PREFIX, ...parts.map((part) => encodeURIComponent(part))].join(
    "/",
  );
}

async function copyFileIntoDir(sourceFile, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, path.basename(sourceFile));
  await fs.copyFile(sourceFile, targetFile);
  return targetFile;
}

async function listFiles(dir) {
  const children = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    children.map(async (child) => {
      const childPath = path.join(dir, child.name);
      if (child.isDirectory()) return listFiles(childPath);
      return child.isFile() ? [childPath] : [];
    }),
  );
  return files.flat();
}

function toAssetUrl(buildRoot, filePath) {
  const relativePath = path.relative(buildRoot, filePath).split(path.sep);
  return publicUrl(...relativePath);
}

function makeWrapperSource(entryFile, addonId) {
  return `import register from ${JSON.stringify(pathToFileURL(entryFile).href)};

globalThis.__agentCanvasRuntimeAddons ||= {};
globalThis.__agentCanvasRuntimeAddons[${JSON.stringify(addonId)}] = register;
`;
}

function safeGlobalName(addonId) {
  return `AgentCanvasRuntimeAddon_${addonId.replace(/[^a-zA-Z0-9_$]/g, "_")}`;
}

async function buildRoutedAddon({ entry, addonBuildDir, wrapperDir, root }) {
  const { build } = await import("vite");
  const wrapperFile = path.join(wrapperDir, `${entry.id}.mjs`);
  await fs.mkdir(wrapperDir, { recursive: true });
  await fs.writeFile(wrapperFile, makeWrapperSource(entry.entryFile, entry.id));

  await build({
    root,
    base: `${publicUrl(path.basename(path.dirname(addonBuildDir)), entry.id)}/`,
    configFile: false,
    logLevel: "error",
    plugins: [svgr()],
    resolve: {
      alias: {
        "#": path.join(root, "src"),
      },
    },
    build: {
      outDir: addonBuildDir,
      emptyOutDir: true,
      cssCodeSplit: false,
      sourcemap: true,
      lib: {
        entry: wrapperFile,
        formats: ["iife"],
        name: safeGlobalName(entry.id),
        fileName: () => "entry.js",
      },
      rollupOptions: {
        external: ["react", "react/jsx-runtime", "react-dom"],
        output: {
          assetFileNames: "assets/[name]-[hash][extname]",
          globals: {
            react: "AgentCanvasAddonHost.React",
            "react/jsx-runtime": "AgentCanvasAddonHost.jsxRuntime",
            "react-dom": "AgentCanvasAddonHost.ReactDOM",
          },
        },
      },
    },
  });
}

async function buildEntry({ entry, version, config }) {
  const addonBuildDir = path.join(config.buildRoot, version, entry.id);
  const wrapperDir = path.join(config.buildRoot, ".tmp");
  const diagnostics = [];

  if (entry.hasRoute) {
    try {
      await buildRoutedAddon({
        entry,
        addonBuildDir,
        wrapperDir,
        root: config.root,
      });
    } catch (error) {
      diagnostics.push(`${entry.id} build failed: ${error.message}`);
      return { addon: null, diagnostics };
    }
  } else {
    await fs.rm(addonBuildDir, { recursive: true, force: true });
    await fs.mkdir(addonBuildDir, { recursive: true });
  }

  const appStyleUrls = [];
  for (const appCssFile of entry.appCssFiles) {
    const copiedFile = await copyFileIntoDir(
      appCssFile,
      path.join(addonBuildDir, "app-css"),
    );
    appStyleUrls.push(toAssetUrl(config.buildRoot, copiedFile));
  }

  let iconUrl;
  if (entry.iconFile) {
    const copiedIcon = await copyFileIntoDir(
      entry.iconFile,
      path.join(addonBuildDir, "icons"),
    );
    iconUrl = toAssetUrl(config.buildRoot, copiedIcon);
  }

  const builtFiles = (await listFiles(addonBuildDir)).filter(
    (filePath) => !filePath.includes(`${path.sep}app-css${path.sep}`),
  );
  const styleUrls = builtFiles
    .filter((filePath) => path.extname(filePath) === ".css")
    .map((filePath) => toAssetUrl(config.buildRoot, filePath));

  return {
    addon: {
      id: entry.id,
      manifest: entry.manifest,
      order: entry.order,
      hasRoute: entry.hasRoute,
      hasAppCss: entry.hasAppCss,
      entryUrl: entry.hasRoute
        ? publicUrl(version, entry.id, "entry.js")
        : undefined,
      styleUrls,
      appStyleUrls,
      iconUrl,
      builtAt: new Date().toISOString(),
    },
    diagnostics,
  };
}

function createVersion() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRuntimeState() {
  return {
    version: createVersion(),
    addons: [],
    diagnostics: [],
  };
}

function createRuntimeService(config) {
  let state = createRuntimeState();
  const clients = new Set();

  function registryResponse() {
    return {
      version: state.version,
      addons: state.addons,
      diagnostics: state.diagnostics,
    };
  }

  function emitChanged(payload) {
    const data = JSON.stringify({ type: "addons:changed", ...payload });
    for (const res of clients) {
      res.write(`event: addons:changed\n`);
      res.write(`data: ${data}\n\n`);
    }
  }

  async function rebuild(addonId) {
    const version = createVersion();
    const { entries, diagnostics } = await discoverAddons({
      root: config.root,
      addonsDir: config.addonsDir,
      packageVersion: undefined,
    });
    const selectedEntries = addonId
      ? entries.filter((entry) => entry.id === addonId)
      : entries;
    const rebuiltAddonIds = selectedEntries.map((entry) => entry.id);
    const previousAddons = addonId
      ? state.addons.filter((addon) => addon.id !== addonId)
      : [];
    const builtAddons = [];
    const buildDiagnostics = [...diagnostics];

    for (const entry of selectedEntries) {
      const result = await buildEntry({ entry, version, config });
      buildDiagnostics.push(...result.diagnostics);
      if (result.addon) builtAddons.push(result.addon);
    }

    if (addonId && selectedEntries.length === 0) {
      buildDiagnostics.push(`${addonId} was not discovered`);
    }

    const addons = [...previousAddons, ...builtAddons].sort((first, second) => {
      if (first.order !== second.order) return first.order - second.order;
      return first.manifest.title.localeCompare(second.manifest.title);
    });

    state = {
      version,
      addons,
      diagnostics: buildDiagnostics,
    };

    const response = {
      ...registryResponse(),
      rebuiltAddonIds,
    };
    emitChanged({
      version,
      addonIds: rebuiltAddonIds,
      diagnostics: buildDiagnostics,
    });
    return response;
  }

  async function serveAsset(req, res) {
    const rawPath = req.url.split("?")[0].slice(ASSET_PREFIX.length);
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }

    const filePath = path.resolve(config.buildRoot, `.${decodedPath}`);
    const buildRootAbs = path.resolve(config.buildRoot);
    if (
      !isPathInsideDir(buildRootAbs, filePath) ||
      !(await pathExists(filePath))
    ) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    res.writeHead(200, {
      "Content-Type":
        MIME[path.extname(filePath).toLowerCase()] ??
        "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    createReadStream(filePath).pipe(res);
  }

  async function handleApi(req, res) {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === `${API_PREFIX}/registry`) {
      json(res, 200, registryResponse());
      return;
    }

    if (req.method === "GET" && url.pathname === `${API_PREFIX}/events`) {
      if (!isAuthorized(req, config.apiKey)) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      res.write(": connected\n\n");
      clients.add(res);
      req.on("close", () => {
        clients.delete(res);
      });
      return;
    }

    if (req.method === "POST" && url.pathname === `${API_PREFIX}/rebuild`) {
      if (!isAuthorized(req, config.apiKey)) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }

      let body;
      try {
        body = await readBody(req);
      } catch (error) {
        json(res, 400, { error: error.message });
        return;
      }

      const addonId =
        body && typeof body.addonId === "string" && body.addonId.trim()
          ? body.addonId.trim()
          : undefined;
      const response = await rebuild(addonId);
      json(res, 200, response);
      return;
    }

    json(res, 404, { error: "Not Found" });
  }

  const server = createServer((req, res) => {
    if (req.url?.startsWith(ASSET_PREFIX)) {
      serveAsset(req, res).catch((error) => {
        console.error(`[addons] asset error: ${error.stack ?? error.message}`);
        if (!res.headersSent)
          json(res, 500, { error: "Internal Server Error" });
      });
      return;
    }

    if (req.url?.startsWith(API_PREFIX)) {
      handleApi(req, res).catch((error) => {
        console.error(`[addons] api error: ${error.stack ?? error.message}`);
        if (!res.headersSent)
          json(res, 500, { error: "Internal Server Error" });
      });
      return;
    }

    json(res, 404, { error: "Not Found" });
  });

  return { server, rebuild, registryResponse };
}

async function main() {
  const config = parseArgs();
  await fs.mkdir(config.addonsDir, { recursive: true });
  await fs.mkdir(config.buildRoot, { recursive: true });

  const service = createRuntimeService(config);
  await service.rebuild();

  service.server.listen(config.port, config.host, () => {
    console.log(
      `[addons] Runtime service listening on http://${config.host}:${config.port}`,
    );
    console.log(`[addons] Source: ${config.addonsDir}`);
    console.log(`[addons] Builds: ${config.buildRoot}`);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`[addons] ${error.stack ?? error.message}`);
    process.exit(1);
  });
}

export { API_PREFIX, ASSET_PREFIX, createRuntimeService, parseArgs };

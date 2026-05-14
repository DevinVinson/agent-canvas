#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const ADDON_API_VERSION = 1;
const ADDONS_DIR_NAME = "addons";
const MANIFEST_PATH = ".openhands/addon.json";
const DEFAULT_OUT_FILE = "src/addons/registry.generated.ts";
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const FRONTEND_ENTRY_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    addonsDir: null,
    out: null,
    quiet: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--root") {
      options.root = path.resolve(argv[index + 1] ?? options.root);
      index += 1;
    } else if (arg === "--addons-dir") {
      options.addonsDir = path.resolve(argv[index + 1] ?? "");
      index += 1;
    } else if (arg === "--out") {
      options.out = path.resolve(argv[index + 1] ?? "");
      index += 1;
    } else if (arg === "--quiet") {
      options.quiet = true;
    }
  }

  options.addonsDir ??= path.join(options.root, ADDONS_DIR_NAME);
  options.out ??= path.join(options.root, DEFAULT_OUT_FILE);

  return options;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeImportPath(fromFile, targetFile) {
  let relativePath = path.relative(path.dirname(fromFile), targetFile);
  relativePath = relativePath.split(path.sep).join(path.posix.sep);

  if (!relativePath.startsWith(".")) {
    return `./${relativePath}`;
  }

  return relativePath;
}

function resolveInsideAddon(addonDir, relativePath) {
  const resolved = path.resolve(addonDir, relativePath);
  const normalizedAddonDir = path.resolve(addonDir);
  const prefix = `${normalizedAddonDir}${path.sep}`;

  if (resolved !== normalizedAddonDir && !resolved.startsWith(prefix)) {
    return null;
  }

  return resolved;
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function isAtLeastVersion(currentVersion, minimumVersion) {
  const current = parseSemver(currentVersion);
  const minimum = parseSemver(minimumVersion);
  if (!current || !minimum) return true;

  if (current.major !== minimum.major) return current.major > minimum.major;
  if (current.minor !== minimum.minor) return current.minor > minimum.minor;
  return current.patch >= minimum.patch;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function getPackageVersion(root) {
  return fs
    .readFile(path.join(root, "package.json"), "utf8")
    .then((raw) => JSON.parse(raw).version ?? "0.0.0")
    .catch(() => "0.0.0");
}

function validateManifestShape(manifest, addonId) {
  const errors = [];

  if (!isRecord(manifest)) {
    return ["manifest must be a JSON object"];
  }

  if (typeof manifest.name !== "string" || !manifest.name.trim()) {
    errors.push("manifest.name is required");
  } else if (!ID_PATTERN.test(manifest.name)) {
    errors.push(
      "manifest.name must use lowercase letters, numbers, dot, dash, or underscore",
    );
  } else if (manifest.name !== addonId) {
    errors.push("manifest.name must match the add-on directory name");
  }

  if (typeof manifest.title !== "string" || !manifest.title.trim()) {
    errors.push("manifest.title is required");
  }

  if (!isRecord(manifest.frontend)) {
    errors.push("manifest.frontend is required");
  } else if (
    typeof manifest.frontend.entry !== "string" ||
    !manifest.frontend.entry.trim()
  ) {
    errors.push("manifest.frontend.entry is required");
  }

  if (manifest.sidebar !== undefined && !isRecord(manifest.sidebar)) {
    errors.push("manifest.sidebar must be an object when provided");
  }

  if (
    isRecord(manifest.sidebar) &&
    manifest.sidebar.order !== undefined &&
    typeof manifest.sidebar.order !== "number"
  ) {
    errors.push("manifest.sidebar.order must be a number when provided");
  }

  if (
    isRecord(manifest.sidebar) &&
    manifest.sidebar.icon !== undefined &&
    typeof manifest.sidebar.icon !== "string"
  ) {
    errors.push("manifest.sidebar.icon must be a string when provided");
  }

  if (
    manifest.compatibility !== undefined &&
    !isRecord(manifest.compatibility)
  ) {
    errors.push("manifest.compatibility must be an object when provided");
  }

  return errors;
}

async function validateAddon({
  addonDir,
  addonId,
  root,
  outFile,
  packageVersion,
}) {
  const manifestFile = path.join(addonDir, MANIFEST_PATH);
  const diagnostics = [];

  if (!(await pathExists(manifestFile))) {
    return null;
  }

  let manifest;
  try {
    manifest = await readJson(manifestFile);
  } catch (error) {
    diagnostics.push(
      `Invalid JSON in ${path.relative(root, manifestFile)}: ${error.message}`,
    );
    return { entry: null, diagnostics };
  }

  const shapeErrors = validateManifestShape(manifest, addonId);
  if (shapeErrors.length > 0) {
    diagnostics.push(`${addonId} was skipped: ${shapeErrors.join("; ")}`);
    return { entry: null, diagnostics };
  }

  const addonApiVersion = manifest.compatibility?.addon_api_version;
  if (addonApiVersion !== undefined && addonApiVersion !== ADDON_API_VERSION) {
    diagnostics.push(
      `${addonId} was skipped: addon_api_version ${addonApiVersion} is not supported by host API ${ADDON_API_VERSION}`,
    );
    return { entry: null, diagnostics };
  }

  const minimumGuiVersion = manifest.compatibility?.min_gui_version;
  if (
    typeof minimumGuiVersion === "string" &&
    minimumGuiVersion.trim() &&
    !isAtLeastVersion(packageVersion, minimumGuiVersion)
  ) {
    diagnostics.push(
      `${addonId} was skipped: requires GUI ${minimumGuiVersion} or newer`,
    );
    return { entry: null, diagnostics };
  }

  const entryFile = resolveInsideAddon(addonDir, manifest.frontend.entry);
  if (!entryFile) {
    diagnostics.push(
      `${addonId} was skipped: frontend.entry must stay inside the add-on directory`,
    );
    return { entry: null, diagnostics };
  }

  if (!FRONTEND_ENTRY_EXTENSIONS.has(path.extname(entryFile))) {
    diagnostics.push(
      `${addonId} was skipped: frontend.entry must be a JS or TS module`,
    );
    return { entry: null, diagnostics };
  }

  if (!(await pathExists(entryFile))) {
    diagnostics.push(
      `${addonId} was skipped: missing frontend entry ${manifest.frontend.entry}`,
    );
    return { entry: null, diagnostics };
  }

  let iconFile = null;
  if (typeof manifest.sidebar?.icon === "string" && manifest.sidebar.icon) {
    const resolvedIcon = resolveInsideAddon(addonDir, manifest.sidebar.icon);
    if (!resolvedIcon) {
      diagnostics.push(
        `${addonId}: sidebar.icon must stay inside the add-on directory`,
      );
    } else if (path.extname(resolvedIcon) !== ".svg") {
      diagnostics.push(`${addonId}: sidebar.icon must be an SVG file`);
    } else if (!(await pathExists(resolvedIcon))) {
      diagnostics.push(`${addonId}: sidebar.icon file was not found`);
    } else {
      iconFile = resolvedIcon;
    }
  }

  return {
    entry: {
      id: addonId,
      manifest,
      order: manifest.sidebar?.order ?? 500,
      entryImportPath: normalizeImportPath(outFile, entryFile),
      iconImportPath: iconFile ? normalizeImportPath(outFile, iconFile) : null,
    },
    diagnostics,
  };
}

function formatGeneratedRegistry(entries) {
  const iconImports = entries
    .filter((entry) => entry.iconImportPath)
    .map(
      (entry, index) =>
        `import AddonIcon${index} from ${JSON.stringify(`${entry.iconImportPath}?react`)};`,
    );

  let iconIndex = 0;
  const registryEntries = entries.map((entry) => {
    const iconReference = entry.iconImportPath
      ? `\n    Icon: AddonIcon${iconIndex++},`
      : "";
    const manifestLiteral = JSON.stringify(entry.manifest, null, 4).replace(
      /\n/g,
      "\n    ",
    );

    return `  {
    id: ${JSON.stringify(entry.id)},
    manifest: ${manifestLiteral},
    order: ${entry.order},
    load: () => import(${JSON.stringify(entry.entryImportPath)}),${iconReference}
  },`;
  });

  const registryLiteral =
    registryEntries.length === 0 ? "[]" : `[\n${registryEntries.join("\n")}\n]`;

  return `// This file is generated by scripts/generate-addons-registry.mjs.
// Do not edit it by hand.
import type { AddonRegistryEntry } from "./types";
${iconImports.length > 0 ? `\n${iconImports.join("\n")}\n` : ""}
export const addonRegistry: AddonRegistryEntry[] = ${registryLiteral};
`;
}

async function discoverAddons(options) {
  const packageVersion = await getPackageVersion(options.root);
  const diagnostics = [];

  if (!(await pathExists(options.addonsDir))) {
    return { entries: [], diagnostics };
  }

  const children = await fs.readdir(options.addonsDir, { withFileTypes: true });
  const addonDirs = children
    .filter((child) => child.isDirectory() && ID_PATTERN.test(child.name))
    .map((child) => child.name)
    .sort();

  const entries = [];

  for (const addonId of addonDirs) {
    const result = await validateAddon({
      addonDir: path.join(options.addonsDir, addonId),
      addonId,
      root: options.root,
      outFile: options.out,
      packageVersion,
    });

    if (!result) continue;
    diagnostics.push(...result.diagnostics);
    if (result.entry) entries.push(result.entry);
  }

  entries.sort((first, second) => {
    if (first.order !== second.order) return first.order - second.order;
    return first.manifest.title.localeCompare(second.manifest.title);
  });

  return { entries, diagnostics };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { entries, diagnostics } = await discoverAddons(options);
  const generated = formatGeneratedRegistry(entries);

  await fs.mkdir(path.dirname(options.out), { recursive: true });
  await fs.writeFile(options.out, generated);

  if (!options.quiet) {
    for (const diagnostic of diagnostics) {
      console.warn(`[addons] ${diagnostic}`);
    }
    console.log(
      `[addons] Generated ${path.relative(options.root, options.out)} with ${entries.length} add-on(s).`,
    );
  }
}

main().catch((error) => {
  console.error(`[addons] ${error.stack ?? error.message}`);
  process.exit(1);
});

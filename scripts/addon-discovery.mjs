import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const ADDON_API_VERSION = 1;
export const ADDONS_DIR_NAME = "addons";
export const ADDONS_DIR_ENV = "AGENT_CANVAS_ADDONS_DIR";
export const MANIFEST_PATH = ".openhands/addon.json";
export const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
export const FRONTEND_ENTRY_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
]);

export function resolveConfigPath(value, root = process.cwd()) {
  if (value.startsWith("~/")) {
    return path.resolve(os.homedir(), value.slice(2));
  }

  return path.isAbsolute(value) ? value : path.resolve(root, value);
}

export function resolveDefaultRuntimeAddonsDir() {
  return path.join(os.homedir(), ".openhands", "agent-canvas", "addons");
}

export async function pathExists(filePath) {
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

export function normalizeImportPath(fromFile, targetFile) {
  let relativePath = path.relative(path.dirname(fromFile), targetFile);
  relativePath = relativePath.split(path.sep).join(path.posix.sep);

  if (!relativePath.startsWith(".")) {
    return `./${relativePath}`;
  }

  return relativePath;
}

export function normalizeFrontendImportPath(fromFile, targetFile) {
  const importPath = normalizeImportPath(fromFile, targetFile);
  const extension = path.extname(targetFile);

  if (FRONTEND_ENTRY_EXTENSIONS.has(extension)) {
    return importPath.slice(0, -extension.length);
  }

  return importPath;
}

export function resolveInsideAddon(addonDir, relativePath) {
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

async function getPackageVersion(root) {
  return fs
    .readFile(path.join(root, "package.json"), "utf8")
    .then((raw) => JSON.parse(raw).version ?? "0.0.0")
    .catch(() => "0.0.0");
}

export function validateManifestShape(manifest, addonId) {
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
  } else {
    if (
      manifest.frontend.route !== undefined &&
      typeof manifest.frontend.route !== "boolean"
    ) {
      errors.push("manifest.frontend.route must be a boolean when provided");
    }

    const routeEnabled = manifest.frontend.route !== false;
    if (
      manifest.frontend.entry !== undefined &&
      (typeof manifest.frontend.entry !== "string" ||
        !manifest.frontend.entry.trim())
    ) {
      errors.push("manifest.frontend.entry must be a non-empty string");
    } else if (routeEnabled && manifest.frontend.entry === undefined) {
      errors.push("manifest.frontend.entry is required");
    } else if (!routeEnabled && manifest.frontend.entry !== undefined) {
      errors.push(
        "manifest.frontend.entry is only supported for routed add-ons",
      );
    }
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
    isRecord(manifest.sidebar) &&
    manifest.sidebar.visible !== undefined &&
    typeof manifest.sidebar.visible !== "boolean"
  ) {
    errors.push("manifest.sidebar.visible must be a boolean when provided");
  }

  if (manifest.styling !== undefined && !isRecord(manifest.styling)) {
    errors.push("manifest.styling must be an object when provided");
  }

  if (
    isRecord(manifest.styling) &&
    manifest.styling.appCss !== undefined &&
    !Array.isArray(manifest.styling.appCss)
  ) {
    errors.push("manifest.styling.appCss must be an array when provided");
  }

  if (Array.isArray(manifest.styling?.appCss)) {
    manifest.styling.appCss.forEach((stylePath, index) => {
      if (typeof stylePath !== "string" || !stylePath.trim()) {
        errors.push(
          `manifest.styling.appCss[${index}] must be a non-empty string`,
        );
      }
    });
  }

  if (
    manifest.compatibility !== undefined &&
    !isRecord(manifest.compatibility)
  ) {
    errors.push("manifest.compatibility must be an object when provided");
  }

  return errors;
}

export async function validateAddon({
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

  const routeEnabled = manifest.frontend.route !== false;
  let entryImportPath = null;
  let entryFile = null;

  if (routeEnabled) {
    entryFile = resolveInsideAddon(addonDir, manifest.frontend.entry);
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

    entryImportPath = outFile
      ? normalizeFrontendImportPath(outFile, entryFile)
      : null;
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

  const appCssFiles = [];
  const appCssImportPaths = [];
  for (const stylePath of manifest.styling?.appCss ?? []) {
    const resolvedStyle = resolveInsideAddon(addonDir, stylePath);

    if (!resolvedStyle) {
      diagnostics.push(
        `${addonId} was skipped: styling.appCss entries must stay inside the add-on directory`,
      );
      return { entry: null, diagnostics };
    }

    if (path.extname(resolvedStyle) !== ".css") {
      diagnostics.push(
        `${addonId} was skipped: styling.appCss entries must be CSS files`,
      );
      return { entry: null, diagnostics };
    }

    if (!(await pathExists(resolvedStyle))) {
      diagnostics.push(
        `${addonId} was skipped: missing app CSS file ${stylePath}`,
      );
      return { entry: null, diagnostics };
    }

    appCssFiles.push(resolvedStyle);
    if (outFile) {
      appCssImportPaths.push(normalizeImportPath(outFile, resolvedStyle));
    }
  }

  return {
    entry: {
      id: addonId,
      manifest,
      order: manifest.sidebar?.order ?? 500,
      hasAppCss: appCssFiles.length > 0,
      hasRoute: routeEnabled,
      entryFile,
      entryImportPath,
      iconFile,
      iconImportPath:
        iconFile && outFile ? normalizeImportPath(outFile, iconFile) : null,
      appCssFiles,
      appCssImportPaths,
      addonDir,
    },
    diagnostics,
  };
}

export async function discoverAddons(options) {
  const packageVersion =
    options.packageVersion ?? (await getPackageVersion(options.root));
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
    if (options.addonId && options.addonId !== addonId) continue;

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

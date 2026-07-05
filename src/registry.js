import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { REGISTRY_DIRNAME, REGISTRY_FILENAME } from "./constants.js";
import { expandHome } from "./source.js";

export function registryPath(options = {}) {
  const scope = options.scope ?? "global";
  const cwd = options.cwd ?? process.cwd();
  const home = path.resolve(expandHome(options.home ?? os.homedir()));

  if (scope === "project") {
    return path.join(cwd, REGISTRY_DIRNAME, REGISTRY_FILENAME);
  }

  return path.join(home, REGISTRY_DIRNAME, REGISTRY_FILENAME);
}

export async function readRegistry(options = {}) {
  const filePath = registryPath(options);
  if (!existsSync(filePath)) {
    return { version: 1, installs: [] };
  }

  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return {
    version: parsed.version ?? 1,
    installs: Array.isArray(parsed.installs) ? parsed.installs : []
  };
}

export async function writeRegistry(registry, options = {}) {
  const filePath = registryPath(options);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(registry, null, 2)}\n`);
}

export function upsertInstall(registry, install) {
  const key = installKey(install);
  const index = registry.installs.findIndex((entry) => installKey(entry) === key);
  if (index >= 0) {
    registry.installs[index] = { ...registry.installs[index], ...install };
  } else {
    registry.installs.push(install);
  }
  registry.installs.sort((a, b) => installKey(a).localeCompare(installKey(b)));
}

export function removeInstall(registry, install) {
  const key = installKey(install);
  registry.installs = registry.installs.filter((entry) => installKey(entry) !== key);
}

export function installKey(install) {
  return `${install.scope}:${install.harness}:${install.profile}`;
}

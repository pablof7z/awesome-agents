import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SOURCE } from "./constants.js";
import { parseFrontmatter } from "./frontmatter.js";

const GITHUB_SHORTHAND = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function splitSourceSpec(spec) {
  if (!spec) {
    return { source: DEFAULT_SOURCE, profile: undefined };
  }

  const atIndex = spec.lastIndexOf("@");
  if (!spec.startsWith("git@") && atIndex > 0 && atIndex > spec.lastIndexOf("/")) {
    return {
      source: spec.slice(0, atIndex),
      profile: spec.slice(atIndex + 1)
    };
  }

  return { source: spec, profile: undefined };
}

export function expandHome(input, home = os.homedir()) {
  if (input === "~") {
    return home;
  }
  if (input.startsWith("~/")) {
    return path.join(home, input.slice(2));
  }
  return input;
}

export function isLocalSource(source, home = os.homedir()) {
  const expanded = expandHome(source, home);
  return path.isAbsolute(expanded) || source.startsWith(".") || source.startsWith("~") || existsSync(expanded);
}

export function normalizeGithubUrl(source) {
  if (GITHUB_SHORTHAND.test(source)) {
    return `https://github.com/${source}.git`;
  }

  const github = source.match(/^https:\/\/github\.com\/([^/]+\/[^/.]+)(?:\.git)?\/?$/);
  if (github) {
    return `https://github.com/${github[1]}.git`;
  }

  if (source.startsWith("git@github.com:") || source.endsWith(".git")) {
    return source;
  }

  return undefined;
}

export async function materializeSource(sourceInput = DEFAULT_SOURCE, options = {}) {
  const home = options.home ?? os.homedir();
  const source = sourceInput || DEFAULT_SOURCE;

  if (isLocalSource(source, home)) {
    const sourcePath = path.resolve(expandHome(source, home));
    await assertTouchGrassLayout(sourcePath);
    return {
      kind: "local",
      source: sourcePath,
      path: sourcePath,
      cleanup: async () => {}
    };
  }

  const gitUrl = normalizeGithubUrl(source);
  if (!gitUrl) {
    throw new Error(`Unsupported source "${source}". Use a local path, owner/repo, or GitHub URL.`);
  }

  const tmpRoot = options.tmpRoot ?? os.tmpdir();
  const cloneDir = await fs.mkdtemp(path.join(tmpRoot, "awesome-agents-source-"));
  const clone = spawnSync("git", ["clone", "--depth=1", gitUrl, cloneDir], {
    encoding: "utf8"
  });

  if (clone.status !== 0) {
    await fs.rm(cloneDir, { recursive: true, force: true });
    const detail = clone.stderr?.trim() || clone.stdout?.trim() || `git exited with ${clone.status}`;
    throw new Error(`Could not clone ${source}: ${detail}`);
  }

  await assertTouchGrassLayout(cloneDir);

  return {
    kind: "git",
    source,
    gitUrl,
    path: cloneDir,
    cleanup: async () => {
      await fs.rm(cloneDir, { recursive: true, force: true });
    }
  };
}

async function assertTouchGrassLayout(sourcePath) {
  const profilesDir = path.join(sourcePath, "agents", "profiles");
  if (!existsSync(profilesDir)) {
    throw new Error(`No agents/profiles directory found in ${sourcePath}`);
  }
}

export async function loadCatalog(sourcePath) {
  const profilesDir = path.join(sourcePath, "agents", "profiles");
  const adapterRoot = path.join(sourcePath, "agents", "adapters");
  const files = await fs.readdir(profilesDir, { withFileTypes: true });
  const profiles = [];

  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".md")) {
      continue;
    }

    const filePath = path.join(profilesDir, file.name);
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = parseFrontmatter(raw, filePath);
    const slug = parsed.attributes.slug ?? path.basename(file.name, ".md");

    profiles.push({
      slug,
      name: parsed.attributes.name ?? slug,
      summary: parsed.attributes.summary ?? "",
      attributes: parsed.attributes,
      body: parsed.body,
      raw,
      filePath,
      relativePath: path.relative(sourcePath, filePath),
      adapters: await loadAdapters(adapterRoot, slug, sourcePath)
    });
  }

  profiles.sort((a, b) => a.slug.localeCompare(b.slug));
  return { sourcePath, profiles };
}

async function loadAdapters(adapterRoot, slug, sourcePath) {
  if (!existsSync(adapterRoot)) {
    return {};
  }

  const adapters = {};
  const harnessDirs = await fs.readdir(adapterRoot, { withFileTypes: true });
  for (const harnessDir of harnessDirs) {
    if (!harnessDir.isDirectory()) {
      continue;
    }

    const adapterPath = path.join(adapterRoot, harnessDir.name, `${slug}.md`);
    if (!existsSync(adapterPath)) {
      continue;
    }

    const raw = await fs.readFile(adapterPath, "utf8");
    const parsed = parseFrontmatter(raw, adapterPath);
    adapters[harnessDir.name] = {
      harness: harnessDir.name,
      attributes: parsed.attributes,
      body: parsed.body,
      raw,
      filePath: adapterPath,
      relativePath: path.relative(sourcePath, adapterPath)
    };
  }

  return adapters;
}

export function resolvePackageRoot() {
  return path.dirname(path.dirname(fileURLToPath(import.meta.url)));
}

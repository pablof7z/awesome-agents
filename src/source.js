import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { parseFrontmatter } from "./frontmatter.js";

const GITHUB_SHORTHAND = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const PROFILE_SUFFIXES = [
  ".agent.yaml",
  ".agent.yml",
  ".agf.yaml",
  ".agf.yml",
  ".yaml",
  ".yml",
  ".agent.md",
  ".md"
];
const AGENT_DEFINITION_NAMES = [
  "agent.agent.yaml",
  "agent.agent.yml",
  "agent.agf.yaml",
  "agent.agf.yml",
  "agent.yaml",
  "agent.yml",
  "agent.agent.md",
  "agent.md",
  "profile.agent.yaml",
  "profile.agent.yml",
  "profile.agf.yaml",
  "profile.agf.yml",
  "profile.yaml",
  "profile.yml",
  "profile.agent.md",
  "profile.md"
];
const RESERVED_AGENT_DIRS = new Set(["profiles", "adapters"]);
const SUPPORT_DIRS = ["references", "scripts"];

export function splitSourceSpec(spec) {
  if (!spec) {
    return { source: undefined, profile: undefined };
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

export async function materializeSource(sourceInput, options = {}) {
  const home = options.home ?? os.homedir();
  const source = sourceInput;
  const requireAgentProfileLayout = options.requireAgentProfileLayout ?? true;

  if (!source) {
    throw new Error("Specify a source. Use a local path, owner/repo, or GitHub URL.");
  }

  if (isLocalSource(source, home)) {
    const sourcePath = path.resolve(expandHome(source, home));
    if (requireAgentProfileLayout) {
      await assertAgentProfileLayout(sourcePath);
    }
    return {
      kind: "local",
      source: sourcePath,
      path: sourcePath,
      cleanup: async () => {}
    };
  }

  const { sourceWithoutRef, ref } = splitGitRef(source);
  const gitUrl = normalizeGithubUrl(sourceWithoutRef);
  if (!gitUrl) {
    throw new Error(`Unsupported source "${source}". Use a local path, owner/repo, or GitHub URL.`);
  }

  const tmpRoot = options.tmpRoot ?? os.tmpdir();
  const cloneDir = await fs.mkdtemp(path.join(tmpRoot, "awesome-agents-source-"));
  const cloneArgs = ["clone", "--depth=1"];
  if (ref) {
    cloneArgs.push("--branch", ref);
  }
  cloneArgs.push(gitUrl, cloneDir);
  const clone = spawnSync("git", cloneArgs, {
    encoding: "utf8"
  });

  if (clone.status !== 0) {
    await fs.rm(cloneDir, { recursive: true, force: true });
    const detail = clone.stderr?.trim() || clone.stdout?.trim() || `git exited with ${clone.status}`;
    throw new Error(`Could not clone ${source}: ${detail}`);
  }

  if (requireAgentProfileLayout) {
    await assertAgentProfileLayout(cloneDir);
  }

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

function splitGitRef(source) {
  const hashIndex = source.lastIndexOf("#");
  if (hashIndex <= 0 || hashIndex === source.length - 1) {
    return { sourceWithoutRef: source, ref: undefined };
  }
  return {
    sourceWithoutRef: source.slice(0, hashIndex),
    ref: source.slice(hashIndex + 1)
  };
}

async function assertAgentProfileLayout(sourcePath) {
  const entries = await discoverProfileEntries(sourcePath);
  if (entries.length === 0) {
    throw new Error(`No agent profiles found in ${sourcePath}. Expected agents/<slug>/agent.yaml.`);
  }
}

export async function loadCatalog(sourcePath) {
  const entries = await discoverProfileEntries(sourcePath);
  const profiles = [];
  const seen = new Set();

  for (const entry of entries) {
    const profile = await loadProfileFile(entry.filePath, sourcePath, {
      slugHint: entry.slugHint,
      agentRoot: entry.agentRoot
    });
    if (seen.has(profile.slug)) {
      continue;
    }
    seen.add(profile.slug);
    profiles.push({
      ...profile,
      adapters: await loadProfileAdapters(entry, profile.slug, sourcePath),
      supportDirs: await loadSupportDirs(entry.agentRoot)
    });
  }

  profiles.sort((a, b) => a.slug.localeCompare(b.slug));
  return { sourcePath, profiles };
}

async function discoverProfileEntries(sourcePath) {
  return [
    ...await discoverAgentDirectoryProfiles(sourcePath),
    ...await discoverLegacyProfileDirectory(sourcePath)
  ];
}

async function discoverAgentDirectoryProfiles(sourcePath) {
  const agentsRoot = path.join(sourcePath, "agents");
  if (!existsSync(agentsRoot)) {
    return [];
  }

  const entries = [];
  const files = await fs.readdir(agentsRoot, { withFileTypes: true });
  for (const file of files) {
    if (!file.isDirectory() || RESERVED_AGENT_DIRS.has(file.name)) {
      continue;
    }
    const agentRoot = path.join(agentsRoot, file.name);
    const filePath = await findAgentDefinitionFile(agentRoot, file.name);
    if (!filePath) {
      continue;
    }
    entries.push({
      layout: "agent-directory",
      filePath,
      slugHint: file.name,
      agentRoot,
      adapterRoot: path.join(agentRoot, "adapters")
    });
  }
  return entries;
}

async function discoverLegacyProfileDirectory(sourcePath) {
  const profilesDir = path.join(sourcePath, "agents", "profiles");
  if (!existsSync(profilesDir)) {
    return [];
  }

  const entries = [];
  const files = await fs.readdir(profilesDir, { withFileTypes: true });
  for (const file of files) {
    if (!file.isFile() || !isProfileFile(file.name)) {
      continue;
    }
    entries.push({
      layout: "legacy-profiles-directory",
      filePath: path.join(profilesDir, file.name),
      slugHint: profileSlugFromFilename(file.name),
      adapterRoot: path.join(sourcePath, "agents", "adapters")
    });
  }
  return entries;
}

async function findAgentDefinitionFile(agentRoot, slug) {
  for (const name of AGENT_DEFINITION_NAMES) {
    const candidate = path.join(agentRoot, name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  for (const suffix of PROFILE_SUFFIXES) {
    const candidate = path.join(agentRoot, `${slug}${suffix}`);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

async function loadProfileAdapters(entry, slug, sourcePath) {
  const adapters = {};
  Object.assign(adapters, await loadAdapters(entry.adapterRoot, slug, sourcePath));
  if (entry.layout === "agent-directory") {
    Object.assign(adapters, await loadAdapters(path.join(sourcePath, "agents", "adapters"), slug, sourcePath));
  }
  return adapters;
}

async function loadSupportDirs(agentRoot) {
  if (!agentRoot) {
    return [];
  }
  const dirs = [];
  for (const kind of SUPPORT_DIRS) {
    const sourcePath = path.join(agentRoot, kind);
    if (existsSync(sourcePath)) {
      dirs.push({ kind, sourcePath });
    }
  }
  return dirs;
}

async function loadAdapters(adapterRoot, slug, sourcePath) {
  if (!adapterRoot || !existsSync(adapterRoot)) {
    return {};
  }

  const adapters = {};
  const harnessDirs = await fs.readdir(adapterRoot, { withFileTypes: true });
  for (const harnessDir of harnessDirs) {
    if (!harnessDir.isDirectory()) {
      continue;
    }

    const adapterPath = await findProfileLikeFile(path.join(adapterRoot, harnessDir.name), slug);
    if (!existsSync(adapterPath)) {
      continue;
    }

    const raw = await fs.readFile(adapterPath, "utf8");
    const parsed = await loadDefinitionFile(adapterPath, raw);
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

async function loadProfileFile(filePath, sourcePath, options = {}) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = await loadDefinitionFile(filePath, raw);
  const fallbackSlug = options.slugHint ?? profileSlugFromFilename(path.basename(filePath));
  const slug = parsed.attributes.slug ?? parsed.attributes.id ?? fallbackSlug;
  const name = parsed.attributes.name ?? titleize(slug);
  const summary = parsed.attributes.summary ?? parsed.attributes.description ?? "";

  return {
    slug,
    name,
    summary,
    attributes: {
      ...parsed.attributes,
      slug,
      name,
      summary
    },
    body: parsed.body,
    raw,
    filePath,
    relativePath: path.relative(sourcePath, filePath),
    format: parsed.format,
    agentRoot: options.agentRoot,
    layout: options.agentRoot ? "agent-directory" : "legacy-profiles-directory"
  };
}

async function loadDefinitionFile(filePath, rawInput) {
  const raw = rawInput ?? await fs.readFile(filePath, "utf8");
  if (isMarkdownProfile(filePath)) {
    const parsed = parseFrontmatter(raw, filePath);
    return {
      attributes: normalizeFlatAttributes(parsed.attributes),
      body: parsed.body,
      format: "markdown-frontmatter"
    };
  }

  let document;
  try {
    document = YAML.parse(raw) ?? {};
  } catch (error) {
    throw new Error(`Could not parse YAML profile in ${filePath}: ${error.message}`);
  }
  if (!isObject(document)) {
    throw new Error(`YAML profile in ${filePath} must be a mapping/object.`);
  }

  const normalized = normalizeYamlProfile(document, filePath);
  return {
    attributes: normalized.attributes,
    body: normalized.body,
    format: normalized.format
  };
}

function normalizeYamlProfile(document, filePath) {
  const metadata = isObject(document.metadata) ? document.metadata : {};
  const executionPolicy = isObject(document.execution_policy) ? document.execution_policy : {};
  const executionConfig = isObject(executionPolicy.config) ? executionPolicy.config : {};

  const id = firstString(
    document.slug,
    document.id,
    metadata.id,
    profileSlugFromFilename(path.basename(filePath))
  );
  const name = firstString(document.name, metadata.name, titleize(id));
  const description = firstString(document.summary, document.description, metadata.description, "");
  const instructions = firstString(
    document.instructions,
    document.instruction,
    document.prompt,
    document.system_prompt,
    executionConfig.instructions,
    ""
  );
  const model = firstString(document.recommended_model, document.model, executionConfig.model, "");
  const reasoningEffort = firstString(
    document.recommended_reasoning_effort,
    document.reasoning_effort,
    document.model_reasoning_effort,
    executionConfig.reasoning_effort,
    ""
  );
  const recommendedModels = document.recommended_models ?? document.models ?? undefined;

  const attributes = {
    ...document,
    slug: id,
    id,
    name,
    summary: description,
    description,
    kind: document.kind ?? document.type ?? "operational-agent-profile"
  };

  if (model && !attributes.recommended_model) {
    attributes.recommended_model = model;
  }
  if (reasoningEffort && !attributes.recommended_reasoning_effort) {
    attributes.recommended_reasoning_effort = reasoningEffort;
  }
  if (recommendedModels && !attributes.recommended_models) {
    attributes.recommended_models = recommendedModels;
  }

  return {
    attributes,
    body: renderYamlProfileBody(name, description, instructions),
    format: isAgentFormat(document) ? "agent-format-yaml" : "yaml"
  };
}

function normalizeFlatAttributes(attributes) {
  return {
    ...attributes,
    summary: attributes.summary ?? attributes.description ?? ""
  };
}

function renderYamlProfileBody(name, description, instructions) {
  const body = instructions || description || "No instructions provided.";
  return `# ${name}\n\n${body}`.trimEnd();
}

async function findProfileLikeFile(directory, slug) {
  for (const suffix of PROFILE_SUFFIXES) {
    const candidate = path.join(directory, `${slug}${suffix}`);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(directory, `${slug}.md`);
}

function isProfileFile(filename) {
  return PROFILE_SUFFIXES.some((suffix) => filename.endsWith(suffix));
}

function isMarkdownProfile(filePath) {
  return filePath.endsWith(".md");
}

function profileSlugFromFilename(filename) {
  const suffix = PROFILE_SUFFIXES.find((value) => filename.endsWith(value));
  return suffix ? filename.slice(0, -suffix.length) : path.basename(filename, path.extname(filename));
}

function isAgentFormat(document) {
  return isObject(document.metadata) && isObject(document.execution_policy);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function titleize(slug) {
  return String(slug)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

export function resolvePackageRoot() {
  return path.dirname(path.dirname(fileURLToPath(import.meta.url)));
}

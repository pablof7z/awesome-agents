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

  if (!source) {
    throw new Error("Specify a source. Use a local path, owner/repo, or GitHub URL.");
  }

  if (isLocalSource(source, home)) {
    const sourcePath = path.resolve(expandHome(source, home));
    await assertAgentProfileLayout(sourcePath);
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

  await assertAgentProfileLayout(cloneDir);

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

async function assertAgentProfileLayout(sourcePath) {
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
    if (!file.isFile() || !isProfileFile(file.name)) {
      continue;
    }

    const filePath = path.join(profilesDir, file.name);
    const profile = await loadProfileFile(filePath, sourcePath);
    profiles.push({
      ...profile,
      adapters: await loadAdapters(adapterRoot, profile.slug, sourcePath)
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

async function loadProfileFile(filePath, sourcePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = await loadDefinitionFile(filePath, raw);
  const fallbackSlug = profileSlugFromFilename(path.basename(filePath));
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
    format: parsed.format
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

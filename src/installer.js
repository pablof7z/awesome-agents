import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_AGENT, SUPPORTED_AGENTS } from "./constants.js";
import { contentHash, isGeneratedContent, normalizeAgentList, renderForAgent, resolveTargetPath } from "./renderers.js";
import { loadCatalog, materializeSource, splitSourceSpec } from "./source.js";
import { readRegistry, registryPath, removeInstall, upsertInstall, writeRegistry } from "./registry.js";

export async function listAvailable(sourceInput, options = {}) {
  const { source } = splitSourceSpec(sourceInput);
  const materialized = await materializeSource(source, options);
  try {
    const catalog = await loadCatalog(materialized.path);
    return catalog.profiles.map((profile) => profileSummary(profile, materialized.source));
  } finally {
    await materialized.cleanup();
  }
}

export async function installFromSource(sourceSpec, options = {}) {
  const split = splitSourceSpec(sourceSpec);
  const source = split.source;
  const optionProfiles = normalizeProfileSelectors(options.profiles ?? options.profile ?? options.skills ?? options.skill);
  const selectors = split.profile ? [...optionProfiles, split.profile] : optionProfiles;
  const scope = resolveScope(options);
  const harnesses = normalizeAgentList(options.agents ?? options.agent, {
    all: options.all,
    defaultAgent: DEFAULT_AGENT
  });

  const materialized = await materializeSource(source, options);
  try {
    const catalog = await loadCatalog(materialized.path);
    const profiles = selectProfiles(catalog.profiles, selectors, options.all);
    const registryOptions = { ...options, scope };
    const registry = await readRegistry(registryOptions);
    const operations = [];
    const installedAt = new Date().toISOString();

    for (const profile of profiles) {
      for (const harness of harnesses) {
        const content = renderForAgent(profile, harness, { source: materialized.source });
        const target = resolveTargetPath(profile, harness, { ...options, scope });
        await writeManagedFile(target, content, options);

        const install = {
          profile: profile.slug,
          name: profile.name,
          summary: profile.summary,
          harness,
          scope,
          source: materialized.source,
          sourceKind: materialized.kind,
          target,
          installedAt,
          contentSha256: contentHash(content),
          dryRun: Boolean(options.dryRun)
        };

        if (!options.dryRun) {
          upsertInstall(registry, install);
        }

        operations.push({
          action: options.dryRun ? "would-install" : "installed",
          ...install
        });
      }
    }

    if (!options.dryRun) {
      await writeRegistry(registry, registryOptions);
    }

    return { operations, registryPath: registryPath(registryOptions) };
  } finally {
    await materialized.cleanup();
  }
}

export async function useFromSource(sourceSpec, options = {}) {
  const split = splitSourceSpec(sourceSpec);
  const profileSelector = options.profile ?? options.skill ?? split.profile;
  if (!profileSelector) {
    throw new Error("Specify a profile with source@profile or --profile <profile>.");
  }

  const harness = normalizeAgentList(options.agent ? [options.agent] : options.agents, {
    defaultAgent: DEFAULT_AGENT
  })[0];
  const materialized = await materializeSource(split.source, options);
  try {
    const catalog = await loadCatalog(materialized.path);
    const [profile] = selectProfiles(catalog.profiles, [profileSelector], false);
    const content = renderForAgent(profile, harness, { source: materialized.source });
    return {
      profile: profile.slug,
      harness,
      source: materialized.source,
      content
    };
  } finally {
    await materialized.cleanup();
  }
}

export async function listInstalled(options = {}) {
  const scope = resolveScope(options);
  const registry = await readRegistry({ ...options, scope });
  const harnessInput = options.agents ?? options.agent;
  const harnessFilter = harnessInput ? new Set(normalizeAgentList(harnessInput)) : undefined;
  const installs = registry.installs
    .filter((install) => !harnessFilter || harnessFilter.has(install.harness))
    .map((install) => ({
      ...install,
      exists: existsSync(install.target)
    }));

  return {
    scope,
    registryPath: registryPath({ ...options, scope }),
    installs
  };
}

export async function removeInstalled(profileArgs = [], options = {}) {
  const scope = resolveScope(options);
  const registryOptions = { ...options, scope };
  const registry = await readRegistry(registryOptions);
  const selectors = normalizeProfileSelectors(profileArgs);
  const removeAll = Boolean(options.all);
  if (!removeAll && selectors.length === 0) {
    throw new Error("Specify at least one profile to remove, or pass --all.");
  }

  const harnessInput = options.agents ?? options.agent;
  const harnessFilter = harnessInput ? new Set(normalizeAgentList(harnessInput)) : undefined;
  const operations = [];
  const matched = registry.installs.filter((install) => {
    const profileMatch = removeAll || selectors.includes(install.profile);
    const harnessMatch = !harnessFilter || harnessFilter.has(install.harness);
    return install.scope === scope && profileMatch && harnessMatch;
  });

  for (const install of matched) {
    const exists = existsSync(install.target);
    if (exists) {
      const content = await fs.readFile(install.target, "utf8");
      if (!isGeneratedContent(content) && !options.force) {
        throw new Error(`Refusing to remove unmanaged file ${install.target}. Pass --force to override.`);
      }
      if (!options.dryRun) {
        await fs.rm(install.target, { force: true });
      }
    }

    if (!options.dryRun) {
      removeInstall(registry, install);
    }

    operations.push({
      action: options.dryRun ? "would-remove" : "removed",
      ...install,
      existed: exists
    });
  }

  if (!options.dryRun) {
    await writeRegistry(registry, registryOptions);
  }

  return { operations, registryPath: registryPath(registryOptions) };
}

export async function updateInstalled(profileArgs = [], options = {}) {
  const scope = resolveScope(options);
  const registryOptions = { ...options, scope };
  const registry = await readRegistry(registryOptions);
  const selectors = normalizeProfileSelectors(profileArgs);
  const harnessInput = options.agents ?? options.agent;
  const harnessFilter = harnessInput ? new Set(normalizeAgentList(harnessInput)) : undefined;
  const candidates = registry.installs.filter((install) => {
    const profileMatch = selectors.length === 0 || selectors.includes(install.profile);
    const harnessMatch = !harnessFilter || harnessFilter.has(install.harness);
    return install.scope === scope && profileMatch && harnessMatch;
  });

  const operations = [];
  for (const install of candidates) {
    const result = await installFromSource(install.source, {
      ...options,
      profiles: [install.profile],
      agents: [install.harness],
      global: scope === "global",
      project: scope === "project",
      force: true
    });
    operations.push(...result.operations.map((operation) => ({
      ...operation,
      action: options.dryRun ? "would-update" : "updated"
    })));
  }

  return { operations, registryPath: registryPath(registryOptions) };
}

export async function initProfile(name, options = {}) {
  const slug = slugify(name || "new-agent-profile");
  const root = options.cwd ?? process.cwd();
  const profilePath = path.join(root, "agents", "profiles", `${slug}.md`);
  const adapterPath = path.join(root, "agents", "adapters", "codex", `${slug}.md`);

  if (!options.force) {
    for (const target of [profilePath, adapterPath]) {
      if (existsSync(target)) {
        throw new Error(`${target} already exists. Pass --force to overwrite.`);
      }
    }
  }

  const title = titleCase(slug);
  const profileContent = `---\nslug: ${slug}\nname: ${title}\nkind: operational-agent-profile\nsummary: Describe when to use this agent profile.\nrecommended_model: inherit\nrecommended_reasoning_effort: medium\nhome_notes_template: "~/.agents/homes/${slug}/<project>/notes"\n---\n\n# ${title}\n\nDescribe the agent's mission, boundaries, tools, coordination model, notes, and reporting style.\n`;
  const adapterContent = `---\nslug: ${slug}\nprofile: ../../profiles/${slug}.md\nharness: codex\nmodel: inherit\nreasoning_effort: medium\nrequired_skills: []\n---\n\n# Codex Adapter: ${title}\n\nLoad the canonical profile at \`agents/profiles/${slug}.md\`.\n`;

  if (!options.dryRun) {
    await fs.mkdir(path.dirname(profilePath), { recursive: true });
    await fs.mkdir(path.dirname(adapterPath), { recursive: true });
    await fs.writeFile(profilePath, profileContent);
    await fs.writeFile(adapterPath, adapterContent);
  }

  return {
    action: options.dryRun ? "would-init" : "initialized",
    files: [profilePath, adapterPath]
  };
}

function selectProfiles(profiles, selectors, all = false) {
  if (all || selectors.length === 0 || selectors.includes("*")) {
    return profiles;
  }

  const selected = [];
  for (const selector of selectors) {
    const profile = profiles.find((candidate) => candidate.slug === selector || candidate.name === selector);
    if (!profile) {
      const available = profiles.map((candidate) => candidate.slug).join(", ");
      throw new Error(`Profile "${selector}" was not found. Available profiles: ${available}`);
    }
    selected.push(profile);
  }

  return [...new Map(selected.map((profile) => [profile.slug, profile])).values()];
}

async function writeManagedFile(target, content, options = {}) {
  if (options.dryRun) {
    return;
  }

  if (existsSync(target) && !options.force) {
    const existing = await fs.readFile(target, "utf8");
    if (!isGeneratedContent(existing)) {
      throw new Error(`Refusing to overwrite unmanaged file ${target}. Pass --force to override.`);
    }
  }

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
}

function resolveScope(options = {}) {
  if (options.project && options.global) {
    throw new Error("Use either --global or --project, not both.");
  }
  return options.global ? "global" : "project";
}

function normalizeProfileSelectors(values) {
  return [values]
    .flat(2)
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function profileSummary(profile, source) {
  return {
    slug: profile.slug,
    name: profile.name,
    summary: profile.summary,
    kind: profile.attributes.kind,
    source,
    adapters: Object.keys(profile.adapters)
  };
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "new-agent-profile";
}

function titleCase(slug) {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export { SUPPORTED_AGENTS };

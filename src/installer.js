import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_ALIASES, DEFAULT_AGENT, SUPPORTED_AGENTS } from "./constants.js";
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
  const { selectors, harnessInput } = resolveInstallSelection(split, options);
  const harnesses = normalizeAgentList(harnessInput, {
    all: options.all,
    defaultAgent: DEFAULT_AGENT
  });
  const scope = resolveScope(options, harnesses);

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

    return {
      operations,
      registryPath: registryPath(registryOptions),
      runInstructions: buildRunInstructions(operations)
    };
  } finally {
    await materialized.cleanup();
  }
}

export async function useFromSource(sourceSpec, options = {}) {
  const split = splitSourceSpec(sourceSpec);
  const { profileSelector, harnessInput } = resolveUseSelection(split, options);
  if (!profileSelector) {
    throw new Error("Specify a profile with source@profile or --profile <profile>.");
  }

  const harness = normalizeAgentList(harnessInput, {
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
  const harnessInput = options.agents ?? options.agent;
  const harnesses = harnessInput ? normalizeAgentList(harnessInput) : [];
  const scope = resolveScope(options, harnesses);
  const registry = await readRegistry({ ...options, scope });
  const harnessFilter = harnesses.length > 0 ? new Set(harnesses) : undefined;
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
  const harnessInput = options.agents ?? options.agent;
  const harnesses = harnessInput ? normalizeAgentList(harnessInput) : [];
  const scope = resolveScope(options, harnesses);
  const registryOptions = { ...options, scope };
  const registry = await readRegistry(registryOptions);
  const selectors = normalizeProfileSelectors(profileArgs);
  const removeAll = Boolean(options.all);
  if (!removeAll && selectors.length === 0) {
    throw new Error("Specify at least one profile to remove, or pass --all.");
  }

  const harnessFilter = harnesses.length > 0 ? new Set(harnesses) : undefined;
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
  const harnessInput = options.agents ?? options.agent;
  const harnesses = harnessInput ? normalizeAgentList(harnessInput) : [];
  const scope = resolveScope(options, harnesses);
  const registryOptions = { ...options, scope };
  const registry = await readRegistry(registryOptions);
  const selectors = normalizeProfileSelectors(profileArgs);
  const harnessFilter = harnesses.length > 0 ? new Set(harnesses) : undefined;
  const candidates = registry.installs.filter((install) => {
    const profileMatch = selectors.length === 0 || selectors.includes(install.profile);
    const harnessMatch = !harnessFilter || harnessFilter.has(install.harness);
    return install.scope === scope && profileMatch && harnessMatch;
  });

  const operations = [];
  const runInstructions = [];
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
    runInstructions.push(...result.runInstructions);
  }

  return { operations, registryPath: registryPath(registryOptions), runInstructions };
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

function buildRunInstructions(operations, env = process.env) {
  const instructions = [];
  const seen = new Set();

  for (const operation of operations) {
    if (String(operation.action).startsWith("would-")) {
      continue;
    }

    const instruction = runInstructionForOperation(operation, env);
    if (!instruction) {
      continue;
    }

    const key = `${instruction.harness}:${instruction.profile}:${instruction.command}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    instructions.push(instruction);
  }

  return instructions;
}

function runInstructionForOperation(operation, env) {
  if (operation.harness === "codex") {
    if (!commandExists("codex", env)) {
      return undefined;
    }
    return {
      profile: operation.profile,
      harness: operation.harness,
      command: `codex --profile ${shellWord(operation.profile)}`,
      note: "Starts Codex with this installed profile."
    };
  }

  if (operation.harness === "claude-code") {
    if (!commandExists("claude", env)) {
      return undefined;
    }
    return {
      profile: operation.profile,
      harness: operation.harness,
      command: `claude --agent ${shellWord(operation.profile)}`,
      note: "Starts Claude Code with this installed agent profile."
    };
  }

  if (operation.harness === "opencode") {
    if (!commandExists("opencode", env)) {
      return undefined;
    }
    return {
      profile: operation.profile,
      harness: operation.harness,
      command: "opencode",
      note: `Start OpenCode, then invoke @${operation.profile} in the session.`
    };
  }

  return undefined;
}

function commandExists(command, env) {
  const pathValue = env.PATH ?? "";
  if (!pathValue) {
    return false;
  }

  const extensions = process.platform === "win32"
    ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];

  return pathValue
    .split(path.delimiter)
    .filter(Boolean)
    .some((directory) => extensions.some((extension) => existsSync(path.join(directory, `${command}${extension}`))));
}

function shellWord(value) {
  const text = String(value);
  if (/^[A-Za-z0-9._/@:-]+$/.test(text)) {
    return text;
  }
  return `'${text.replaceAll("'", "'\\''")}'`;
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

function resolveScope(options = {}, harnesses = []) {
  if (options.project && options.global) {
    throw new Error("Use either --global or --project, not both.");
  }
  if (options.project && harnesses.includes("codex")) {
    throw new Error("Codex profiles are loaded from $CODEX_HOME/<name>.config.toml and cannot be installed project-locally. Use --global or choose a different harness.");
  }
  if (options.global) {
    return "global";
  }
  if (options.project) {
    return "project";
  }
  if (harnesses.includes("codex")) {
    return "global";
  }
  return "project";
}

function normalizeProfileSelectors(values) {
  return [values]
    .flat(2)
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function resolveInstallSelection(split, options = {}) {
  const selectors = [
    ...normalizeProfileSelectors(options.profiles ?? options.profile ?? options.skills ?? options.skill)
  ];
  const explicitHarnessInput = firstDefined(options.harnesses, options.harness, options.targets, options.target);
  const agentValues = normalizeProfileSelectors(options.agents ?? options.agent);
  const agentHarnesses = [];

  for (const value of agentValues) {
    if (isHarnessSelector(value)) {
      agentHarnesses.push(value);
    } else {
      selectors.push(value);
    }
  }

  if (split.profile) {
    selectors.push(split.profile);
  }

  return {
    selectors,
    harnessInput: explicitHarnessInput ?? (agentHarnesses.length > 0 ? agentHarnesses : undefined)
  };
}

function resolveUseSelection(split, options = {}) {
  const selectors = [
    ...normalizeProfileSelectors(options.profiles ?? options.profile ?? options.skills ?? options.skill)
  ];
  const explicitHarnessInput = firstDefined(options.harnesses, options.harness, options.targets, options.target);
  const agentValues = normalizeProfileSelectors(options.agents ?? options.agent);
  const agentHarnesses = [];

  for (const value of agentValues) {
    if (isHarnessSelector(value)) {
      agentHarnesses.push(value);
    } else {
      selectors.push(value);
    }
  }

  if (split.profile) {
    selectors.push(split.profile);
  }

  const uniqueSelectors = [...new Set(selectors)];
  if (uniqueSelectors.length > 1) {
    throw new Error(`Use renders one profile at a time. Received: ${uniqueSelectors.join(", ")}`);
  }

  return {
    profileSelector: uniqueSelectors[0],
    harnessInput: explicitHarnessInput ?? (agentHarnesses.length > 0 ? agentHarnesses : undefined)
  };
}

function isHarnessSelector(value) {
  const normalized = String(value).toLowerCase();
  return normalized === "*" || AGENT_ALIASES.has(normalized);
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined);
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

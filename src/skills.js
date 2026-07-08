import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import { expandHome, materializeSource } from "./source.js";

const SKILL_CONTAINER_DIRS = [
  "skills",
  "skills/.curated",
  "skills/.experimental",
  "skills/.system",
  ".agents/skills",
  ".claude/skills",
  ".codex/skills",
  ".opencode/skills"
];
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "__pycache__"]);

export async function installProfileSkills(profile, sourceRoot, options = {}) {
  const dependencies = normalizeSkillDependencies(profile.attributes.skills);
  if (dependencies.length === 0) {
    return [];
  }

  const home = path.resolve(expandHome(options.home ?? os.homedir()));
  const installed = [];

  for (const dependency of dependencies) {
    let resolved;
    try {
      resolved = await resolveSkillDependency(profile, dependency, sourceRoot, home, options);
    } catch (error) {
      console.warn(`Skipping skill "${dependency.selector ?? dependency.source}" for profile "${profile.slug}": ${error.message}`);
      continue;
    }

    const { skill, cleanup } = resolved;
    try {
      const target = path.join(home, ".agents", "homes", profile.slug, "skills", skill.installName);

      if (!options.dryRun) {
        await fs.rm(target, { recursive: true, force: true });
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.cp(skill.path, target, {
          recursive: true,
          dereference: true,
          preserveTimestamps: true
        });
      }

      installed.push({
        name: skill.installName,
        declaredName: dependency.selector ?? dependency.source ?? skill.name,
        source: skill.source,
        sourceKind: skill.sourceKind,
        path: target
      });
    } finally {
      await cleanup();
    }
  }

  return installed;
}

function normalizeSkillDependencies(value) {
  if (!value) {
    return [];
  }

  const entries = Array.isArray(value) ? value : [value];
  return entries.map(parseSkillDependency);
}

function parseSkillDependency(value) {
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) {
      throw new Error("Skill dependency entries must not be empty.");
    }

    const split = text.match(/^(\S+)\s+(.+)$/);
    if (split) {
      return { source: split[1], selector: split[2].trim(), raw: text };
    }

    const atSelector = splitAtSelector(text);
    if (atSelector) {
      return { source: atSelector.source, selector: atSelector.selector, raw: text };
    }

    if (looksLikeRemoteSource(text)) {
      return { source: text, selector: undefined, raw: text };
    }

    return { selector: text, raw: text };
  }

  if (isObject(value)) {
    const source = firstString(value.source, value.package, value.repository, value.repo);
    const selector = firstString(value.skill, value.name, value.slug, value.id);
    if (!source && !selector) {
      throw new Error("Skill dependency objects must include a skill/name or source field.");
    }
    return { source, selector, raw: value };
  }

  throw new Error("Skill dependencies must be strings or objects.");
}

function splitAtSelector(value) {
  if (value.startsWith("git@")) {
    return undefined;
  }
  const atIndex = value.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === value.length - 1 || atIndex <= value.lastIndexOf("/")) {
    return undefined;
  }
  return {
    source: value.slice(0, atIndex),
    selector: value.slice(atIndex + 1)
  };
}

function looksLikeRemoteSource(value) {
  return value.includes("/") || value.includes(":") || value.startsWith("~") || value.startsWith(".");
}

const NOOP_CLEANUP = async () => {};

async function resolveSkillDependency(profile, dependency, sourceRoot, home, options) {
  if (dependency.source) {
    const materialized = await materializeSource(dependency.source, {
      ...options,
      requireAgentProfileLayout: false
    });
    try {
      const skill = await selectSkillFromRoot(materialized.path, dependency.selector, {
        dependency,
        source: materialized.source,
        sourceKind: materialized.kind
      });
      return { skill, cleanup: materialized.cleanup };
    } catch (error) {
      await materialized.cleanup();
      throw error;
    }
  }

  const profileSkill = await findSkillInRoot(profile.agentRoot, dependency.selector, {
    dependency,
    source: profile.agentRoot,
    sourceKind: "profile-local"
  });
  if (profileSkill) {
    return { skill: profileSkill, cleanup: NOOP_CLEANUP };
  }

  const sourceSkill = await findSkillInRoot(sourceRoot, dependency.selector, {
    dependency,
    source: sourceRoot,
    sourceKind: "local-source"
  });
  if (sourceSkill) {
    return { skill: sourceSkill, cleanup: NOOP_CLEANUP };
  }

  const userSkillRoot = path.join(home, ".agents", "skills");
  const userSkill = await findSkillInRoot(userSkillRoot, dependency.selector, {
    dependency,
    source: userSkillRoot,
    sourceKind: "user-skills"
  });
  if (userSkill) {
    return { skill: userSkill, cleanup: NOOP_CLEANUP };
  }

  throw new Error(`Skill "${dependency.selector}" was not found in the profile source or ${userSkillRoot}.`);
}

async function findSkillInRoot(root, selector, context) {
  if (!root || !existsSync(root)) {
    return undefined;
  }

  const skills = await discoverSkills(root);
  if (skills.length === 0) {
    return undefined;
  }

  return findDiscoveredSkill(skills, selector, context);
}

async function selectSkillFromRoot(root, selector, context) {
  const skills = await discoverSkills(root);
  if (skills.length === 0) {
    throw new Error(`No skills found in ${context.source}. Expected SKILL.md files in the source root or skills/<name>/.`);
  }

  return selectDiscoveredSkill(skills, selector, context);
}

function selectDiscoveredSkill(skills, selector, context) {
  if (!selector) {
    if (skills.length === 1) {
      return withSource(skills[0], context);
    }
    throw new Error(`Skill source "${context.source}" contains multiple skills. Specify one of: ${skills.map((skill) => skill.name).join(", ")}`);
  }

  const normalized = sanitizeSkillName(selector);
  const selected = skills.find((skill) => {
    return sanitizeSkillName(skill.name) === normalized
      || sanitizeSkillName(skill.directoryName) === normalized
      || skill.installName === normalized;
  });

  if (!selected) {
    throw new Error(`Skill "${selector}" was not found in ${context.source}. Available skills: ${skills.map((skill) => skill.name).join(", ")}`);
  }

  return withSource(selected, context);
}

function findDiscoveredSkill(skills, selector, context) {
  if (!selector) {
    return skills.length === 1 ? withSource(skills[0], context) : undefined;
  }

  const normalized = sanitizeSkillName(selector);
  const selected = skills.find((skill) => {
    return sanitizeSkillName(skill.name) === normalized
      || sanitizeSkillName(skill.directoryName) === normalized
      || skill.installName === normalized;
  });

  return selected ? withSource(selected, context) : undefined;
}

function withSource(skill, context) {
  return {
    ...skill,
    source: context.source,
    sourceKind: context.sourceKind
  };
}

async function discoverSkills(root) {
  const discovered = [];
  const seenPaths = new Set();
  const seenNames = new Set();

  const addSkillAt = async (skillDir) => {
    const skillPath = path.join(skillDir, "SKILL.md");
    if (!existsSync(skillPath)) {
      return false;
    }

    const resolved = path.resolve(skillDir);
    if (seenPaths.has(resolved)) {
      return true;
    }

    let skill;
    try {
      skill = await readSkill(skillDir, root);
    } catch (error) {
      console.warn(`Skipping unreadable skill at ${skillDir}: ${error.message}`);
      return true;
    }
    if (seenNames.has(skill.installName)) {
      return true;
    }

    discovered.push(skill);
    seenPaths.add(resolved);
    seenNames.add(skill.installName);
    return true;
  };

  await addSkillAt(root);
  await discoverContainer(root, false, addSkillAt);
  for (const container of SKILL_CONTAINER_DIRS) {
    await discoverContainer(path.join(root, container), true, addSkillAt);
  }

  if (discovered.length === 0) {
    for (const skillDir of await findSkillDirs(root)) {
      await addSkillAt(skillDir);
    }
  }

  return discovered.sort((a, b) => a.installName.localeCompare(b.installName));
}

async function discoverContainer(container, walkGrandchildren, addSkillAt) {
  let entries;
  try {
    entries = await fs.readdir(container, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const childDir = path.join(container, entry.name);
    if (!await isDirectoryLike(entry, childDir)) {
      continue;
    }

    const found = await addSkillAt(childDir);
    if (found || !walkGrandchildren) {
      continue;
    }

    let grandchildren;
    try {
      grandchildren = await fs.readdir(childDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const grandchild of grandchildren) {
      if (SKIP_DIRS.has(grandchild.name)) {
        continue;
      }
      const grandchildDir = path.join(childDir, grandchild.name);
      if (await isDirectoryLike(grandchild, grandchildDir)) {
        await addSkillAt(grandchildDir);
      }
    }
  }
}

async function findSkillDirs(root) {
  const results = [];

  async function visit(directory) {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    if (existsSync(path.join(directory, "SKILL.md"))) {
      results.push(directory);
      return;
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      const entryPath = path.join(directory, entry.name);
      if (await isDirectoryLike(entry, entryPath)) {
        await visit(entryPath);
      }
    }
  }

  await visit(root);
  return results;
}

async function readSkill(skillDir, root) {
  const skillPath = path.join(skillDir, "SKILL.md");
  const raw = await fs.readFile(skillPath, "utf8");
  const parsed = parseFrontmatter(raw, skillPath);
  const directoryName = path.basename(skillDir);
  const name = firstString(parsed.attributes.name, directoryName);

  return {
    name,
    installName: sanitizeSkillName(name),
    directoryName,
    path: skillDir,
    relativePath: path.relative(root, skillDir)
  };
}

async function isDirectoryLike(entry, entryPath) {
  if (entry.isDirectory()) {
    return true;
  }
  if (!entry.isSymbolicLink()) {
    return false;
  }

  try {
    return (await fs.stat(entryPath)).isDirectory();
  } catch {
    return false;
  }
}

function sanitizeSkillName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 255) || "unnamed-skill";
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

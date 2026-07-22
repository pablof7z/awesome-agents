import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { AGENT_ALIASES, GENERATED_MARKER, SUPPORTED_AGENTS } from "./constants.js";
import { stringifyFrontmatter } from "./frontmatter.js";
import { expandHome } from "./source.js";

export function normalizeAgent(agent) {
  const normalized = AGENT_ALIASES.get(String(agent).toLowerCase());
  if (!normalized) {
    throw new Error(`Unsupported agent "${agent}". Supported agents: ${SUPPORTED_AGENTS.join(", ")}`);
  }
  return normalized;
}

export function normalizeAgentList(input, options = {}) {
  if (options.all) {
    return SUPPORTED_AGENTS;
  }

  const rawAgents = flattenValues(input);
  if (rawAgents.length === 0) {
    return arrayify(options.defaultAgent);
  }

  if (rawAgents.includes("*")) {
    return SUPPORTED_AGENTS;
  }

  return [...new Set(rawAgents.map(normalizeAgent))];
}

export function renderForAgent(profile, agent, context) {
  const normalized = normalizeAgent(agent);
  if (normalized === "codex") {
    return renderCodex(profile, context);
  }
  if (normalized === "claude-code") {
    return renderClaudeCode(profile, context);
  }
  if (normalized === "opencode") {
    return renderOpenCode(profile, context);
  }
  if (normalized === "goose") {
    return renderGoose(profile, context);
  }
  if (normalized === "hermes") {
    return renderHermes(profile, context);
  }
  throw new Error(`Unsupported agent "${agent}"`);
}

export function resolveTargetPath(profile, agent, options = {}) {
  const normalized = normalizeAgent(agent);
  const scope = options.scope ?? "global";
  const cwd = options.cwd ?? process.cwd();
  const home = path.resolve(expandHome(options.home ?? os.homedir()));

  if (normalized === "codex") {
    const codexHome = options.codexHome
      ? path.resolve(expandHome(options.codexHome, home))
      : process.env.CODEX_HOME
        ? path.resolve(expandHome(process.env.CODEX_HOME, home))
        : path.join(home, ".codex");
    return path.join(codexHome, `${profile.slug}.config.toml`);
  }

  if (normalized === "claude-code") {
    if (scope === "project") {
      return path.join(cwd, ".claude", "agents", `${profile.slug}.md`);
    }

    const claudeHome = options.claudeHome
      ? path.resolve(expandHome(options.claudeHome, home))
      : process.env.CLAUDE_HOME
        ? path.resolve(expandHome(process.env.CLAUDE_HOME, home))
        : path.join(home, ".claude");
    return path.join(claudeHome, "agents", `${profile.slug}.md`);
  }

  if (normalized === "opencode") {
    if (scope === "project") {
      return path.join(cwd, ".opencode", "agents", `${profile.slug}.md`);
    }

    const opencodeHome = options.opencodeHome
      ? path.resolve(expandHome(options.opencodeHome, home))
      : process.env.OPENCODE_CONFIG_DIR
        ? path.resolve(expandHome(process.env.OPENCODE_CONFIG_DIR, home))
        : path.join(process.env.XDG_CONFIG_HOME ? path.resolve(expandHome(process.env.XDG_CONFIG_HOME, home)) : path.join(home, ".config"), "opencode");
    return path.join(opencodeHome, "agents", `${profile.slug}.md`);
  }

  if (normalized === "goose") {
    if (scope === "project") {
      return path.join(cwd, ".agents", "agents", `${profile.slug}.md`);
    }

    const gooseHome = options.gooseHome
      ? path.resolve(expandHome(options.gooseHome, home))
      : process.env.GOOSE_HOME
        ? path.resolve(expandHome(process.env.GOOSE_HOME, home))
        : path.join(home, ".agents");
    return path.join(gooseHome, "agents", `${profile.slug}.md`);
  }

  if (normalized === "hermes") {
    const slug = hermesProfileSlug(profile.slug);
    const hermesHome = options.hermesHome
      ? path.resolve(expandHome(options.hermesHome, home))
      : process.env.HERMES_HOME
        ? path.resolve(expandHome(process.env.HERMES_HOME, home))
        : path.join(home, ".hermes");
    return path.join(hermesHome, "profiles", slug, "SOUL.md");
  }

  throw new Error(`Unsupported agent "${agent}"`);
}

export function contentHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function isGeneratedContent(content) {
  return content.includes(GENERATED_MARKER);
}

function renderCodex(profile, context) {
  const adapter = profile.adapters.codex;
  const model = adapter?.attributes.model ?? profile.attributes.recommended_model ?? first(profile.attributes.recommended_models);
  const effort = adapter?.attributes.reasoning_effort ?? profile.attributes.recommended_reasoning_effort;
  const instructions = buildInstructionBody(profile, adapter, "codex");
  const lines = [
    `# ${GENERATED_MARKER}.`,
    `# Source: ${context.source}`,
    `# Profile: ${profile.slug}`,
    `# Display name: ${tomlComment(profile.name)}`,
    `# Summary: ${tomlComment(profile.summary || profile.name)}`,
    ""
  ];

  if (model && model !== "inherit") {
    lines.push(`model = ${tomlString(model)}`);
  }
  if (effort && effort !== "inherit") {
    lines.push(`model_reasoning_effort = ${tomlString(effort)}`);
  }
  lines.push("");
  lines.push(`developer_instructions = ${tomlMultiline(instructions)}`);
  return `${lines.join("\n")}\n`;
}

function renderClaudeCode(profile, context) {
  const attributes = {
    name: profile.slug,
    description: profile.summary || profile.name
  };
  const model = chooseClaudeModel(profile);
  const effort = profile.attributes.recommended_reasoning_effort;

  if (model && model !== "inherit") {
    attributes.model = model;
  }
  if (effort && effort !== "inherit" && ["low", "medium", "high", "xhigh", "max"].includes(effort)) {
    attributes.effort = effort;
  }

  attributes.tools = "Bash";

  const marker = htmlMarker(profile, "claude-code", context);
  return stringifyFrontmatter(attributes, `${marker}\n\n${buildInstructionBody(profile, undefined, "claude-code")}`);
}

function renderOpenCode(profile, context) {
  const attributes = {
    description: profile.summary || profile.name,
    mode: "subagent",
    permission: {
      edit: "deny"
    }
  };
  const model = chooseOpenCodeModel(profile);
  if (model) {
    attributes.model = model;
  }

  const marker = htmlMarker(profile, "opencode", context);
  return stringifyFrontmatter(attributes, `${marker}\n\n${buildInstructionBody(profile, undefined, "opencode")}`);
}

function renderGoose(profile, context) {
  const attributes = {
    name: profile.slug,
    description: profile.summary || profile.name
  };
  const model = chooseGooseModel(profile);
  if (model && model !== "inherit") {
    attributes.model = model;
  }

  const marker = htmlMarker(profile, "goose", context);
  return stringifyFrontmatter(attributes, `${marker}\n\n${buildInstructionBody(profile, profile.adapters.goose ?? profile.adapters["claude-code"], "goose")}`);
}

function renderHermes(profile, context) {
  const marker = htmlMarker(profile, "hermes", context);
  return `${marker}\n\n${buildInstructionBody(profile, profile.adapters.hermes, "hermes")}\n`;
}

function buildInstructionBody(profile, adapter, harness) {
  const parts = [
    profile.body.trimEnd(),
    "",
    "## Installed Profile Context",
    "",
    `- Installed identity: \`${profile.slug}\``,
    `- Role/name: \`${profile.name}\``,
    `- Installed for: \`${harness}\``,
    "- When asked who you are, what agent is running, or what role you are acting as, answer with this identity and role.",
    "- This profile is a reusable operational agent profile, not a skill or local machine setup.",
    profile.agentHome
      ? `- Agent home: \`${profile.agentHome}\``
      : "- This render-only output does not install an agent home or support material."
  ];

  if (profile.supportRoots?.length) {
    parts.push(
      "",
      "## Agent-Owned Support",
      "",
      "Use these installed resources when the operating procedure calls for them. Resolve relative support paths against these roots.",
      ""
    );
    for (const support of profile.supportRoots) {
      parts.push(`- \`${support.kind}\`: \`${support.path}\``);
    }
  }

  if (profile.installedSkills?.length) {
    const skillBase = path.join(path.dirname(profile.installedSkills[0].path), "<skill>");
    parts.push(
      "",
      "## Immediately Relevant Skills",
      "",
      `Immediately relevant skills; you should load these right away from \`${skillBase}\`.`,
      ""
    );
    for (const skill of profile.installedSkills) {
      parts.push(`- \`${skill.name}\`: \`${skill.path}\``);
    }
  }

  if (adapter?.body) {
    parts.push("", "## Harness Adapter", "", adapter.body.trimEnd());
  }

  return parts.join("\n");
}

function htmlMarker(profile, harness, context) {
  const payload = JSON.stringify({
    package: "awesome-agents",
    profile: profile.slug,
    harness,
    source: context.source
  });
  return `<!-- ${GENERATED_MARKER}: ${payload} -->`;
}

function chooseClaudeModel(profile) {
  const candidates = [
    profile.attributes.recommended_model,
    ...arrayify(profile.attributes.recommended_models)
  ].filter(Boolean).map((value) => String(value).toLowerCase());

  if (candidates.some((model) => model.includes("opus"))) {
    return "opus";
  }
  if (candidates.some((model) => model.includes("sonnet"))) {
    return "sonnet";
  }
  if (candidates.some((model) => model.includes("haiku"))) {
    return "haiku";
  }
  if (candidates.some((model) => model.includes("fable"))) {
    return "fable";
  }
  return "inherit";
}

function chooseOpenCodeModel(profile) {
  const candidates = [
    profile.attributes.recommended_model,
    ...arrayify(profile.attributes.recommended_models)
  ].filter(Boolean).map(String);
  return candidates.find((model) => model.includes("/"));
}

function chooseGooseModel(profile) {
  const candidates = [
    profile.attributes.recommended_model,
    ...arrayify(profile.attributes.recommended_models)
  ].filter(Boolean).map((value) => String(value).toLowerCase());

  if (candidates.some((model) => model.includes("opus"))) {
    return "claude-3-5-sonnet";
  }
  if (candidates.some((model) => model.includes("sonnet"))) {
    return "claude-3-5-sonnet";
  }
  if (candidates.some((model) => model.includes("haiku"))) {
    return "claude-3-5-haiku";
  }
  if (candidates.some((model) => model.includes("gpt"))) {
    return candidates.find((model) => model.includes("gpt"));
  }
  return undefined;
}

function tomlString(value) {
  return JSON.stringify(String(value));
}

function tomlComment(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function tomlMultiline(value) {
  const text = String(value).trimEnd();
  if (!text.includes("'''")) {
    return `'''\n${text}\n'''`;
  }
  return `"""\n${text.replaceAll("\\", "\\\\").replaceAll('"""', '\\"\\"\\"')}\n"""`;
}

function first(value) {
  return arrayify(value)[0];
}

function arrayify(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

function flattenValues(values) {
  return arrayify(values)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function hermesProfileSlug(value) {
  const slug = String(value);
  const reserved = new Set(["hermes", "default", "test", "tmp", "root", "sudo"]);
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug) || reserved.has(slug)) {
    throw new Error(`Profile slug "${slug}" is not a valid Hermes profile name.`);
  }
  return slug;
}

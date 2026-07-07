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
  if (normalized === "tenex-edge") {
    return renderTenexEdge(profile, context);
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

  if (normalized === "tenex-edge") {
    const tenexEdgeHome = options.tenexEdgeHome
      ? path.resolve(expandHome(options.tenexEdgeHome, home))
      : process.env.TENEX_EDGE_HOME
        ? path.resolve(expandHome(process.env.TENEX_EDGE_HOME, home))
        : path.join(home, ".tenex-edge");
    return path.join(tenexEdgeHome, "agents", `${profile.slug}.json`);
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

function renderTenexEdge(profile, context) {
  const existing = tenexEdgeKeyMaterial(context.existingContent);
  const keyMaterial = existing ?? generateNostrKeypair();
  const commands = tenexEdgeCommands(profile, context);
  const agent = tenexEdgeInlineAgent(profile);

  const stored = {
    slug: profile.slug,
    secret_key: keyMaterial.secret_key,
    public_key: keyMaterial.public_key,
    created_at: keyMaterial.created_at ?? Math.floor(Date.now() / 1000),
    commands,
    byline: profile.summary || profile.name,
    managed_by: GENERATED_MARKER,
    source: context.source
  };

  if (hasInlineClaudeCommand(commands)) {
    stored.agent = agent;
  }

  return `${JSON.stringify(stored, null, 2)}\n`;
}

function tenexEdgeInlineAgent(profile) {
  const agent = {
    description: profile.summary || profile.name,
    prompt: buildInstructionBody(profile, profile.adapters["tenex-edge"] ?? profile.adapters["claude-code"], "tenex-edge")
  };
  const model = chooseClaudeModel(profile);
  const effort = profile.attributes.recommended_reasoning_effort;

  if (model && model !== "inherit") {
    agent.model = model;
  }
  if (effort && effort !== "inherit" && ["low", "medium", "high", "xhigh", "max"].includes(effort)) {
    agent.effort = effort;
  }

  return agent;
}

function tenexEdgeCommands(profile, context) {
  const commands = [];
  for (const harness of arrayify(context.selectedHarnesses)) {
    if (harness === "codex") {
      commands.push({
        name: "codex",
        argv: ["codex", "--profile", profile.slug]
      });
    } else if (harness === "claude-code") {
      commands.push({
        name: "claude",
        argv: ["claude", "--agent", profile.slug]
      });
    }
  }

  // Keep tenex-edge-only installs self-contained. tenex-edge expands this with
  // the inline `agent` definition as `claude --agents ... --agent <slug>`.
  if (!commands.some((command) => command.name === "claude")) {
    commands.push({
      name: "claude",
      argv: ["claude"]
    });
  }

  return uniqueBy(commands, (command) => command.name);
}

function hasInlineClaudeCommand(commands) {
  return commands.some((command) => (
    command.name === "claude" &&
    command.argv.length === 1 &&
    command.argv[0] === "claude"
  ));
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
    "- The runtime agent manages any profile-specific home directory and notes at task time."
  ];

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

function tenexEdgeKeyMaterial(content) {
  if (!content) {
    return undefined;
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }

  if (!isHex64(parsed.secret_key)) {
    return undefined;
  }

  const derived = derivePublicKey(parsed.secret_key);
  if (!derived) {
    return undefined;
  }

  return {
    secret_key: parsed.secret_key,
    public_key: isHex64(parsed.public_key) ? parsed.public_key : derived,
    created_at: Number.isInteger(parsed.created_at) ? parsed.created_at : undefined
  };
}

function generateNostrKeypair() {
  const ecdh = crypto.createECDH("secp256k1");
  const publicKey = ecdh.generateKeys(undefined, "uncompressed");
  return {
    secret_key: ecdh.getPrivateKey("hex"),
    public_key: publicKey.subarray(1, 33).toString("hex")
  };
}

function derivePublicKey(secretKey) {
  try {
    const ecdh = crypto.createECDH("secp256k1");
    ecdh.setPrivateKey(Buffer.from(secretKey, "hex"));
    return ecdh.getPublicKey(undefined, "uncompressed").subarray(1, 33).toString("hex");
  } catch {
    return undefined;
  }
}

function isHex64(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{64}$/.test(value);
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

function uniqueBy(values, keyForValue) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = keyForValue(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(value);
  }
  return out;
}

function flattenValues(values) {
  return arrayify(values)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

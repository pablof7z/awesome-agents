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

  const bashGuard = normalizeBashGuard(profile.attributes.bash_guard, profile);
  if (bashGuard) {
    attributes.hooks = buildBashGuardHooks(bashGuard);
  }

  const marker = htmlMarker(profile, "claude-code", context);
  return stringifyFrontmatter(attributes, `${marker}\n\n${buildInstructionBody(profile, undefined, "claude-code")}`);
}

// Bash utilities Claude Code already treats as free/read-only (or, for `git`,
// already classifies read vs. write itself) without any hook involvement.
// The guard defers to that existing classification instead of duplicating it.
const BASH_GUARD_FREE_PREFIXES = ["ls", "cat", "echo", "pwd", "head", "tail", "grep", "find", "wc", "which", "diff", "stat", "du", "cd"];
const BASH_GUARD_WRAPPERS = ["time", "timeout", "nice", "nohup", "stdbuf", "command", "builtin", "noglob"];
// Interpreters whose script argument the guard resolves as "the thing actually
// being invoked". `python3.12`-style versioned names are matched separately.
const BASH_GUARD_INTERPRETERS = ["python", "node", "bun", "deno", "ruby", "perl", "bash", "sh", "zsh"];
// Interpreter flags that take no argument and cannot carry inline code, so the
// script path can still be identified after them. Anything else (notably
// `-c`/`-e`, which smuggle a program in as a flag argument) forfeits the
// carve-out.
const BASH_GUARD_INTERPRETER_FLAGS = ["-u", "-B", "-E", "-I", "-O", "-OO", "-S", "-s", "-x", "--"];
const BASH_GUARD_HEREDOC_MARKER = "AWESOME_AGENTS_BASH_GUARD_V1";

// Generalizes to any profile that sets `bash_guard` in agent.yaml, not just
// chief-of-staff: a default-deny PreToolUse hook for Bash, with an explicit
// read-only allowlist and an unrestricted carve-out for the profile's own
// self-management path(s) (e.g. its tracking-repo/workflow-memory root).
//
// Two things anchor the carve-out, because a session's cwd is normally a
// *project* directory rather than the profile's own home:
//   - `selfManagementRoots`: cwd under one of them means unrestricted.
//   - `scriptRoots`: the invoked script resolving under one of them means the
//     profile is running its own code, regardless of cwd. The agent home is
//     always a script root, since that is where `awesome-agents` installs a
//     profile's `resources:` scripts and its declared skills.
function normalizeBashGuard(raw, profile = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }

  const selfManagementRoots = arrayify(raw.self_management_roots ?? raw.self_management_root)
    .map((value) => String(value).trim())
    .filter(Boolean);
  const allow = arrayify(raw.allow)
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (selfManagementRoots.length === 0 && allow.length === 0) {
    return undefined;
  }

  const scriptRoots = [...new Set([...selfManagementRoots, profile.agentHome].filter(Boolean))];

  return { selfManagementRoots, scriptRoots, allow };
}

function buildBashGuardHooks(bashGuard) {
  return {
    PreToolUse: [
      {
        matcher: "Bash",
        hooks: [
          {
            type: "command",
            command: bashGuardHookCommand(bashGuard)
          }
        ]
      }
    ]
  };
}

function bashGuardHookCommand(bashGuard) {
  const script = bashGuardHookScript(bashGuard);
  return `node -e "$(cat <<'${BASH_GUARD_HEREDOC_MARKER}'\n${script}\n${BASH_GUARD_HEREDOC_MARKER}\n)"`;
}

// Judgment call (see PR description): rather than reimplementing shell-grammar
// parsing, this splits on the common separators/operators and classifies each
// part by its leading token. Any `git` subcommand anywhere in the command
// causes the hook to defer entirely (no decision), leaving Claude Code's own
// built-in read-only-git classifier and permission system in control, since
// that already correctly distinguishes `git status` from `git push`. Command
// or process substitution (`$(...)`, backticks, `<(...)`, `>(...)`) is denied
// outright because it can smuggle an arbitrary command inside an
// otherwise-safe-looking prefix (e.g. `ls $(rm -rf /)`), which naive prefix
// matching cannot see through.
//
// A part is also safe when it invokes the profile's *own* code: either the
// leading token is a path under a script root, or it is a known interpreter
// whose script argument is. Only the script argument counts — an arbitrary
// argument that happens to live under a root does not make the surrounding
// command safe (`rm -rf / <root>` stays denied).
function bashGuardHookScript(bashGuard) {
  const selfRoots = JSON.stringify(bashGuard.selfManagementRoots);
  const scriptRoots = JSON.stringify(bashGuard.scriptRoots ?? bashGuard.selfManagementRoots);
  const allow = JSON.stringify(bashGuard.allow);
  const free = JSON.stringify(BASH_GUARD_FREE_PREFIXES);
  const wrappers = JSON.stringify(BASH_GUARD_WRAPPERS);
  const interpreters = JSON.stringify(BASH_GUARD_INTERPRETERS);
  const interpreterFlags = JSON.stringify(BASH_GUARD_INTERPRETER_FLAGS);

  return [
    'const fs = require("fs");',
    'const path = require("path");',
    'let raw = "";',
    'try { raw = fs.readFileSync(0, "utf8"); } catch (e) {}',
    'let data = {};',
    'try { data = JSON.parse(raw); } catch (e) {}',
    'const cwd = data.cwd || process.cwd();',
    'const command = (data.tool_input && data.tool_input.command) || "";',
    'const home = process.env.HOME || "";',
    'function expandTilde(p) { return p.replace(/^~(?=$|\\/)/, home); }',
    `const selfRoots = ${selfRoots}.map(expandTilde);`,
    `const scriptRoots = ${scriptRoots}.map(expandTilde);`,
    `const allow = ${allow};`,
    `const free = ${free};`,
    `const wrappers = ${wrappers};`,
    `const interpreters = ${interpreters};`,
    `const interpreterFlags = ${interpreterFlags};`,
    "",
    // A profile's home is routinely a symlink into its tracking repo, so a path
    // can be under a root lexically, physically, or only one of the two.
    "function realOrSelf(p) {",
    "  try { return fs.realpathSync(p); } catch (e) { return p; }",
    "}",
    "function within(child, parent) {",
    "  const rp = path.resolve(parent);",
    "  const rc = path.resolve(child);",
    "  const parents = [rp, realOrSelf(rp)];",
    "  const children = [rc, realOrSelf(rc)];",
    "  return parents.some((p) => children.some((c) => c === p || c.startsWith(p + path.sep)));",
    "}",
    "function decide(decision, reason) {",
    '  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: decision, permissionDecisionReason: reason } }));',
    "  process.exit(0);",
    "}",
    "",
    "if (selfRoots.some((root) => root && within(cwd, root))) {",
    '  decide("allow", "cwd is under a self-management root; unrestricted");',
    "}",
    "",
    "const QUOTES = [String.fromCharCode(34), String.fromCharCode(39)];",
    "function unquote(token) {",
    "  const t = token.trim();",
    "  if (t.length > 1 && t[0] === t[t.length - 1] && QUOTES.includes(t[0])) {",
    "    return t.slice(1, -1);",
    "  }",
    "  return t;",
    "}",
    "function isInterpreter(name) {",
    "  return interpreters.includes(name) || /^python[0-9.]*$/.test(name);",
    "}",
    "",
    'if (!command.trim()) {',
    '  decide("allow", "empty command");',
    "}",
    "",
    // \\x60 is a backtick — written as an escape, not a literal character, because a
    // literal backtick inside this script breaks shell parsing of the surrounding
    // `"$(cat <<'MARKER' ... )"` heredoc-in-command-substitution wrapper (see PR notes).
    "if (/\\$\\(|\\x60|<\\(|>\\(/.test(command)) {",
    '  decide("deny", "bash-guard: command/process substitution present; cannot safely classify, default-deny applies");',
    "}",
    "",
    "function firstToken(sub) {",
    "  let s = sub.trim();",
    "  let changed = true;",
    "  while (changed) {",
    "    changed = false;",
    '    const stripped = s.replace(/^[A-Za-z_][A-Za-z0-9_]*=\\S*\\s+/, "");',
    "    if (stripped !== s) { s = stripped; changed = true; }",
    "    for (const w of wrappers) {",
    '      if (s === w || s.startsWith(w + " ")) {',
    "        s = s.slice(w.length).trim();",
    "        changed = true;",
    "      }",
    "    }",
    "  }",
    "  return s;",
    "}",
    "",
    'const parts = command.split(/&&|\\|\\||;|\\||\\n/).map((p) => p.trim()).filter(Boolean);',
    "",
    'if (parts.some((part) => firstToken(part).split(/\\s+/)[0] === "git")) {',
    "  process.exit(0);",
    "}",
    "",
    // The path of the script this part actually runs, if it runs one: either the
    // leading token itself, or the script argument of a known interpreter.
    "function invokedScriptPath(sub) {",
    '  const tokens = firstToken(sub).split(/\\s+/).filter(Boolean).map(unquote);',
    "  if (tokens.length === 0) return undefined;",
    "  const head = tokens[0];",
    "  if (isInterpreter(path.basename(head))) {",
    "    let i = 1;",
    "    while (i < tokens.length && interpreterFlags.includes(tokens[i])) i++;",
    "    if (i >= tokens.length) return undefined;",
    '    if (tokens[i].startsWith("-")) return undefined;',
    "    return tokens[i];",
    "  }",
    '  if (head.includes("/") || head.startsWith("~")) return head;',
    "  return undefined;",
    "}",
    "function isOwnScript(sub) {",
    "  const script = invokedScriptPath(sub);",
    "  if (!script) return false;",
    "  const resolved = path.resolve(cwd, expandTilde(script));",
    "  return scriptRoots.some((root) => root && within(resolved, root));",
    "}",
    "",
    "function isSafe(sub) {",
    "  const s = firstToken(sub);",
    "  if (!s) return true;",
    "  if (isOwnScript(sub)) return true;",
    '  const first = s.split(/\\s+/)[0];',
    "  if (free.includes(first)) return true;",
    '  return allow.some((p) => s === p || s.startsWith(p + " "));',
    "}",
    "",
    "if (parts.every(isSafe)) {",
    '  decide("allow", parts.some(isOwnScript) ? "invokes a profile-owned script under its own script root" : "read-only investigation");',
    "}",
    "",
    'decide("deny", "bash-guard: command not recognized as read-only; default-deny applies outside the self-management root and no profile-owned script was invoked");'
  ].join("\n");
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

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, test } from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const bin = path.join(repoRoot, "bin", "awesome-agents.js");
const fixture = path.join(repoRoot, "test", "fixtures", "profile-source");

let tempRoot;
let home;

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "awesome-agents-test-"));
  home = path.join(tempRoot, "home");
  await fs.mkdir(home, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

test("top-level help is grouped and colorized", () => {
  const result = runCli(["--help"], {
    NO_COLOR: "",
    FORCE_COLOR: "",
    TERM: "xterm-256color"
  });
  assert.equal(result.status, 0, result.stderr);

  assert.match(result.stdout, /Operational profiles for Codex, Claude Code, OpenCode, and tenex-edge/);
  assert.match(result.stdout, /\x1b\[1mUsage:\x1b\[0m awesome-agents <command> \[options\]/);
  assert.match(result.stdout, /Manage Profiles:/);
  assert.match(result.stdout, /Add Options:/);
  assert.match(result.stdout, /Examples:/);
  assert.match(result.stdout, /awesome-agents add owner\/repo --agent triage-agent/);
  assert.doesNotMatch(result.stdout, /Commands:\n/);
});

test("NO_COLOR disables ANSI in help", () => {
  const result = runCli(["--help"], {
    NO_COLOR: "1",
    FORCE_COLOR: "",
    TERM: "xterm-256color"
  });
  assert.equal(result.status, 0, result.stderr);

  assert.doesNotMatch(result.stdout, /\x1b\[[0-9;]*m/);
  assert.match(result.stdout, /Operational profiles for Codex, Claude Code, OpenCode, and tenex-edge/);
  assert.match(result.stdout, /Usage: awesome-agents <command> \[options\]/);
  assert.match(result.stdout, /Manage Profiles:/);
});

test("add help explains the install workflow", () => {
  const result = runCli(["add", "--help"], {
    NO_COLOR: "",
    FORCE_COLOR: "",
    TERM: "xterm-256color"
  });
  assert.equal(result.status, 0, result.stderr);

  assert.match(result.stdout, /Usage:.*awesome-agents add <source> \[profile options\] \[target options\]/s);
  assert.match(result.stdout, /Install Flow:/);
  assert.match(result.stdout, /Source Forms:/);
  assert.match(result.stdout, /Select Profiles:/);
  assert.match(result.stdout, /Choose Targets:/);
  assert.match(result.stdout, /Target Files:/);
  assert.match(result.stdout, /~\/\.codex\/<profile>\.config\.toml/);
  assert.doesNotMatch(result.stdout, /Arguments:/);
});

test("lists available profiles from a local source as JSON", () => {
  const result = runCli(["add", fixture, "--list", "--json"]);
  assert.equal(result.status, 0, result.stderr);

  const parsed = JSON.parse(result.stdout);
  assert.deepEqual(
    parsed.profiles.map((profile) => profile.slug),
    ["ops-agent", "research-agent", "triage-agent"]
  );
});

test("add requires an explicit source", async () => {
  const project = path.join(tempRoot, "project");
  await fs.mkdir(project, { recursive: true });
  const result = runCli(["add"], { NO_COLOR: "1" }, { cwd: project });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ERROR\s+Missing required argument: source/);
  assert.match(result.stderr, /npx awesome-agents add <source> \[options\]/);
  assert.match(result.stderr, /npx awesome-agents add owner\/repo --agent triage-agent/);
  assert.doesNotMatch(result.stderr, /Install Flow:/);
  assert.equal(existsSync(path.join(home, ".codex", "ops-agent.config.toml")), false);
  assert.equal(existsSync(path.join(home, ".codex", "research-agent.config.toml")), false);
  assert.equal(existsSync(path.join(home, ".codex", "triage-agent.config.toml")), false);
});

test("dry-run install does not write target files or registry", () => {
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "codex",
    "--profile",
    "triage-agent",
    "--global",
    "--home",
    home,
    "--dry-run",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.operations[0].action, "would-install");
  assert.equal(existsSync(path.join(home, ".codex", "triage-agent.config.toml")), false);
  assert.equal(existsSync(path.join(home, ".awesome-agents", "installed.json")), false);
});

test("non-TTY install without a profile selector accepts the default profile set", async () => {
  const fakeBin = await createFakeCommand("codex");
  const result = runCli([
    "add",
    fixture,
    "--global",
    "--home",
    home
  ], { PATH: fakeBin, NO_COLOR: "1" });
  assert.equal(result.status, 0, result.stderr);

  assert.equal(existsSync(path.join(home, ".codex", "ops-agent.config.toml")), true);
  assert.equal(existsSync(path.join(home, ".codex", "research-agent.config.toml")), true);
  assert.equal(existsSync(path.join(home, ".codex", "triage-agent.config.toml")), true);
  assert.match(result.stdout, /installed: ops-agent -> codex/);
  assert.doesNotMatch(result.stdout, /Select agent profiles to install/);
});

test("installs a Codex profile and records it in the registry", async () => {
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "codex",
    "--profile",
    "triage-agent",
    "--global",
    "--home",
    home,
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const target = path.join(home, ".codex", "triage-agent.config.toml");
  const registry = path.join(home, ".awesome-agents", "installed.json");
  assert.equal(existsSync(target), true);
  assert.equal(existsSync(registry), true);

  const content = await fs.readFile(target, "utf8");
  assert.match(content, /Generated by awesome-agents/);
  assert.match(content, /# Profile: triage-agent/);
  assert.match(content, /# Display name: Triage Agent/);
  assert.doesNotMatch(content, /^name = /m);
  assert.doesNotMatch(content, /^description = /m);
  assert.match(content, /model = "gpt-5\.5"/);
  assert.match(content, /developer_instructions = '''/);
  assert.match(content, /Immediately Relevant Skills/);
  assert.match(content, /Immediately relevant skills; you should load these right away from/);
  assert.match(content, /gh-pages-publisher/);

  const skillTarget = path.join(home, ".agents", "homes", "triage-agent", "skills", "gh-pages-publisher");
  assert.equal(existsSync(path.join(skillTarget, "SKILL.md")), true);
  assert.equal(existsSync(path.join(skillTarget, "references", "publishing.md")), true);

  const installed = JSON.parse(await fs.readFile(registry, "utf8"));
  assert.equal(installed.installs[0].profile, "triage-agent");
  assert.equal(installed.installs[0].harness, "codex");
  assert.deepEqual(installed.installs[0].skillTargets, [skillTarget]);

  const parsed = JSON.parse(result.stdout);
  assert.deepEqual(parsed.operations[0].installedSkills, [
    {
      name: "gh-pages-publisher",
      declaredName: "gh-pages-publisher",
      source: path.join(fixture, "agents", "triage-agent"),
      sourceKind: "profile-local",
      path: skillTarget
    }
  ]);
});

test("installs profile skills from explicit source declarations", async () => {
  const profileSource = path.join(tempRoot, "profile-source");
  const skillSource = path.join(tempRoot, "skill-source");
  await fs.mkdir(path.join(profileSource, "agents", "sample-agent"), { recursive: true });
  await fs.mkdir(path.join(skillSource, "skills", "remote-helper"), { recursive: true });
  await fs.writeFile(
    path.join(profileSource, "agents", "sample-agent", "agent.yaml"),
    `schema: awesome-agents/v1
id: sample-agent
name: Sample Agent
description: Tests explicit skill source declarations.
skills:
  - ${skillSource} remote-helper
instructions: |
  Use helper skills when needed.
`,
    "utf8"
  );
  await fs.writeFile(
    path.join(skillSource, "skills", "remote-helper", "SKILL.md"),
    `---
name: remote-helper
description: Helps with remote-style skill declarations.
---

# Remote Helper
`,
    "utf8"
  );

  const result = runCli([
    "add",
    profileSource,
    "--agent",
    "sample-agent",
    "--harness",
    "codex",
    "--global",
    "--home",
    home,
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const skillTarget = path.join(home, ".agents", "homes", "sample-agent", "skills", "remote-helper");
  const target = path.join(home, ".codex", "sample-agent.config.toml");
  assert.equal(existsSync(path.join(skillTarget, "SKILL.md")), true);

  const content = await fs.readFile(target, "utf8");
  assert.match(content, new RegExp(escapeRegExp(`- \`remote-helper\`: \`${skillTarget}\``)));

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.operations[0].installedSkills[0].source, skillSource);
  assert.equal(parsed.operations[0].installedSkills[0].sourceKind, "local");
});

test("installs bare profile skills from the user skill directory fallback", async () => {
  const profileSource = path.join(tempRoot, "profile-source");
  const userSkill = path.join(home, ".agents", "skills", "tenex-edge");
  await fs.mkdir(path.join(profileSource, "agents", "planning-agent"), { recursive: true });
  await fs.mkdir(userSkill, { recursive: true });
  await fs.writeFile(
    path.join(profileSource, "agents", "planning-agent", "agent.yaml"),
    `schema: awesome-agents/v1
id: planning-agent
name: Planning Agent
description: Tests user skill fallback.
skills:
  - tenex-edge
instructions: |
  Plan the work.
`,
    "utf8"
  );
  await fs.writeFile(
    path.join(userSkill, "SKILL.md"),
    `---
name: tenex-edge
description: Coordinates over tenex-edge.
---

# tenex-edge
`,
    "utf8"
  );

  const result = runCli([
    "add",
    profileSource,
    "--agent",
    "planning-agent",
    "--harness",
    "codex",
    "--global",
    "--home",
    home,
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const skillTarget = path.join(home, ".agents", "homes", "planning-agent", "skills", "tenex-edge");
  assert.equal(existsSync(path.join(skillTarget, "SKILL.md")), true);

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.operations[0].installedSkills[0].source, path.join(home, ".agents", "skills"));
  assert.equal(parsed.operations[0].installedSkills[0].sourceKind, "user-skills");
});

test("installs an Agent Format YAML profile as a profile, not a skill", async () => {
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "ops-agent",
    "--harness",
    "codex",
    "--global",
    "--home",
    home,
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const target = path.join(home, ".codex", "ops-agent.config.toml");
  assert.equal(existsSync(target), true);

  const content = await fs.readFile(target, "utf8");
  assert.match(content, /# Profile: ops-agent/);
  assert.doesNotMatch(content, /^name = /m);
  assert.doesNotMatch(content, /^description = /m);
  assert.match(content, /Installed identity: `ops-agent`/);
  assert.match(content, /Role\/name: `Ops Agent`/);
  assert.match(content, /operational agent profile, not a skill/);
  assert.match(content, /You are an ops agent/);
  assert.doesNotMatch(content, /primary_skill/);
  assert.doesNotMatch(content, /skills\//);

  assert.equal(existsSync(path.join(home, ".agents", "homes", "ops-agent", "scripts", "heartbeat.sh")), true);
  assert.equal(existsSync(path.join(home, ".agents", "homes", "ops-agent", "references", "runbook.md")), true);

  const parsed = JSON.parse(result.stdout);
  assert.deepEqual(
    parsed.operations[0].supportTargets.map((targetPath) => path.relative(home, targetPath)).sort(),
    [
      ".agents/homes/ops-agent/references/runbook.md",
      ".agents/homes/ops-agent/scripts/heartbeat.sh"
    ]
  );
});

test("installs a GitHub shorthand source with --agent as the profile selector", async () => {
  const gitEnv = await createFakeGitClone(fixture, "https://github.com/example/agent-profiles.git");
  const result = runCli([
    "add",
    "example/agent-profiles",
    "--agent",
    "triage-agent",
    "--harness",
    "codex",
    "--global",
    "--home",
    home,
    "--json"
  ], gitEnv);
  assert.equal(result.status, 0, result.stderr);

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.operations[0].profile, "triage-agent");
  assert.equal(parsed.operations[0].harness, "codex");
  assert.equal(parsed.operations[0].source, "example/agent-profiles");
  assert.equal(existsSync(path.join(home, ".codex", "triage-agent.config.toml")), true);
});

test("uses --harness to choose a target when --agent selects the profile", async () => {
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "triage-agent",
    "--harness",
    "opencode",
    "--global",
    "--home",
    home,
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.operations[0].profile, "triage-agent");
  assert.equal(parsed.operations[0].harness, "opencode");
  assert.equal(existsSync(path.join(home, ".config", "opencode", "agents", "triage-agent.md")), true);
});

test("installs Claude Code and OpenCode profile renderings", async () => {
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "claude-code",
    "opencode",
    "--profile",
    "research-agent",
    "--global",
    "--home",
    home,
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const claudeTarget = path.join(home, ".claude", "agents", "research-agent.md");
  const opencodeTarget = path.join(home, ".config", "opencode", "agents", "research-agent.md");
  assert.equal(existsSync(claudeTarget), true);
  assert.equal(existsSync(opencodeTarget), true);

  const claude = await fs.readFile(claudeTarget, "utf8");
  const opencode = await fs.readFile(opencodeTarget, "utf8");
  assert.match(claude, /name: research-agent/);
  assert.match(claude, /model: opus/);
  assert.match(claude, /Installed identity: `research-agent`/);
  assert.match(opencode, /mode: subagent/);
  assert.match(opencode, /edit: deny/);
  assert.match(opencode, /Installed identity: `research-agent`/);
});

test("installs a tenex-edge agent and preserves its key on reinstall", async () => {
  const args = [
    "add",
    fixture,
    "--agent",
    "triage-agent",
    "--harness",
    "tenex-edge",
    "--global",
    "--home",
    home,
    "--json"
  ];
  const first = runCli(args);
  assert.equal(first.status, 0, first.stderr);

  const target = path.join(home, ".tenex-edge", "agents", "triage-agent.json");
  assert.equal(existsSync(target), true);

  const stored = JSON.parse(await fs.readFile(target, "utf8"));
  assert.equal(stored.slug, "triage-agent");
  assert.equal(stored.command, undefined);
  assert.deepEqual(stored.commands, [
    {
      name: "claude",
      argv: ["claude"]
    }
  ]);
  assert.match(stored.secret_key, /^[0-9a-f]{64}$/);
  assert.match(stored.public_key, /^[0-9a-f]{64}$/);
  assert.equal(stored.managed_by, "Generated by awesome-agents");
  assert.match(stored.byline, /Sorts incoming work/);
  assert.match(stored.agent.description, /Sorts incoming work/);
  assert.match(stored.agent.prompt, /Installed for: `tenex-edge`/);

  const parsed = JSON.parse(first.stdout);
  assert.equal(parsed.operations[0].harness, "tenex-edge");
  assert.equal(parsed.operations[0].target, target);
  assert.equal(parsed.operations[0].scope, "global");

  const second = runCli(args);
  assert.equal(second.status, 0, second.stderr);
  const reinstalled = JSON.parse(await fs.readFile(target, "utf8"));
  assert.equal(reinstalled.secret_key, stored.secret_key);
  assert.equal(reinstalled.public_key, stored.public_key);
  assert.equal(reinstalled.created_at, stored.created_at);
});

test("tenex-edge commands point at installed harness profile launch flags", async () => {
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "triage-agent",
    "--harness",
    "codex",
    "tenex-edge",
    "--global",
    "--home",
    home,
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const codexTarget = path.join(home, ".codex", "triage-agent.config.toml");
  const tenexTarget = path.join(home, ".tenex-edge", "agents", "triage-agent.json");
  assert.equal(existsSync(codexTarget), true);
  assert.equal(existsSync(tenexTarget), true);

  const stored = JSON.parse(await fs.readFile(tenexTarget, "utf8"));
  assert.deepEqual(stored.commands, [
    {
      name: "codex",
      argv: ["codex", "--profile", "triage-agent"]
    },
    {
      name: "claude",
      argv: ["claude"]
    }
  ]);
  assert.equal(stored.command, undefined);
});

test("tenex-edge uses Claude Code agent flags when the Claude profile is installed", async () => {
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "triage-agent",
    "--harness",
    "claude-code",
    "tenex-edge",
    "--global",
    "--home",
    home,
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const claudeTarget = path.join(home, ".claude", "agents", "triage-agent.md");
  const tenexTarget = path.join(home, ".tenex-edge", "agents", "triage-agent.json");
  assert.equal(existsSync(claudeTarget), true);
  assert.equal(existsSync(tenexTarget), true);

  const stored = JSON.parse(await fs.readFile(tenexTarget, "utf8"));
  assert.deepEqual(stored.commands, [
    {
      name: "claude",
      argv: ["claude", "--agent", "triage-agent"]
    }
  ]);
  assert.equal(stored.agent, undefined);
});

test("use renders a single profile without installing", () => {
  const result = runCli(["use", `${fixture}@triage-agent`, "--agent", "codex", "--home", home]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# Profile: triage-agent/);
  assert.doesNotMatch(result.stdout, /^name = /m);
  assert.doesNotMatch(result.stdout, /^description = /m);
  assert.equal(existsSync(path.join(home, ".codex", "triage-agent.config.toml")), false);
});

test("prints detected harness run instructions after install", async () => {
  const fakeBin = await createFakeCommand("codex");
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "ops-agent",
    "--home",
    home
  ], { PATH: fakeBin, NO_COLOR: "1" });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Run installed profiles:/);
  assert.match(result.stdout, /ops-agent -- Keeps operational follow-through moving across tools and teams\./);
  assert.match(result.stdout, /codex: codex --profile ops-agent/);
});

test("prints tenex-edge launch instructions when available", async () => {
  const fakeBin = await createFakeCommand("tenex-edge");
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "ops-agent",
    "--harness",
    "tenex-edge",
    "--home",
    home
  ], { PATH: fakeBin, NO_COLOR: "1" });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Run installed profiles:/);
  assert.match(result.stdout, /ops-agent -- Keeps operational follow-through moving across tools and teams\./);
  assert.match(result.stdout, /tenex-edge: tenex-edge launch ops-agent/);
});

test("defaults to installing every harness detected on PATH", async () => {
  const fakeBin = await createFakeCommands(["claude", "opencode", "tenex-edge"]);
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "ops-agent",
    "--global",
    "--home",
    home,
    "--json"
  ], { PATH: fakeBin });
  assert.equal(result.status, 0, result.stderr);

  const parsed = JSON.parse(result.stdout);
  assert.deepEqual(parsed.operations.map((operation) => operation.harness).sort(), ["claude-code", "opencode", "tenex-edge"]);
  assert.equal(existsSync(path.join(home, ".claude", "agents", "ops-agent.md")), true);
  assert.equal(existsSync(path.join(home, ".config", "opencode", "agents", "ops-agent.md")), true);
  assert.equal(existsSync(path.join(home, ".tenex-edge", "agents", "ops-agent.json")), true);
  assert.equal(existsSync(path.join(home, ".codex", "ops-agent.config.toml")), false);
});

test("requires a harness when no harness CLI is detected on PATH", async () => {
  const emptyBin = path.join(tempRoot, "empty-bin");
  await fs.mkdir(emptyBin, { recursive: true });
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "ops-agent",
    "--global",
    "--home",
    home,
    "--json"
  ], { PATH: emptyBin });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No supported harness CLI detected on PATH/);
  assert.equal(existsSync(path.join(home, ".codex", "ops-agent.config.toml")), false);
});

test("--harness limits install to a single harness even when others are detected on PATH", async () => {
  const fakeBin = await createFakeCommands(["codex", "claude", "opencode", "tenex-edge"]);
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "ops-agent",
    "--harness",
    "opencode",
    "--global",
    "--home",
    home,
    "--json"
  ], { PATH: fakeBin });
  assert.equal(result.status, 0, result.stderr);

  const parsed = JSON.parse(result.stdout);
  assert.deepEqual(parsed.operations.map((operation) => operation.harness), ["opencode"]);
  assert.equal(existsSync(path.join(home, ".config", "opencode", "agents", "ops-agent.md")), true);
  assert.equal(existsSync(path.join(home, ".codex", "ops-agent.config.toml")), false);
  assert.equal(existsSync(path.join(home, ".claude", "agents", "ops-agent.md")), false);
  assert.equal(existsSync(path.join(home, ".tenex-edge", "agents", "ops-agent.json")), false);
});

test("remove deletes only generated installs", async () => {
  const install = runCli([
    "add",
    fixture,
    "--agent",
    "codex",
    "--profile",
    "triage-agent",
    "--global",
    "--home",
    home
  ]);
  assert.equal(install.status, 0, install.stderr);

  const target = path.join(home, ".codex", "triage-agent.config.toml");
  assert.equal(existsSync(target), true);

  const remove = runCli(["remove", "triage-agent", "--agent", "codex", "--global", "--home", home, "--json"]);
  assert.equal(remove.status, 0, remove.stderr);
  assert.equal(existsSync(target), false);

  const registry = JSON.parse(await fs.readFile(path.join(home, ".awesome-agents", "installed.json"), "utf8"));
  assert.deepEqual(registry.installs, []);
});

async function createFakeCommand(command) {
  const fakeBin = await createFakeCommands([command]);
  return fakeBin;
}

async function createFakeCommands(commands) {
  const fakeBin = path.join(tempRoot, `fake-bin-${commands.join("-")}`);
  await fs.mkdir(fakeBin, { recursive: true });
  for (const command of commands) {
    const fakeCommand = path.join(fakeBin, command);
    await fs.writeFile(fakeCommand, "#!/bin/sh\nexit 0\n");
    await fs.chmod(fakeCommand, 0o755);
  }
  return fakeBin;
}

async function createFakeGitClone(source, expectedUrl) {
  const fakeBin = path.join(tempRoot, "fake-bin");
  const fakeGit = path.join(fakeBin, "git");
  await fs.mkdir(fakeBin, { recursive: true });
  await fs.writeFile(fakeGit, `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const [command, depthFlag, url, dest] = process.argv.slice(2);
if (command !== "clone" || depthFlag !== "--depth=1") {
  console.error(\`unexpected git args: \${process.argv.slice(2).join(" ")}\`);
  process.exit(2);
}
if (url !== process.env.AWESOME_AGENTS_EXPECTED_URL) {
  console.error(\`unexpected git url: \${url}\`);
  process.exit(2);
}

for (const entry of fs.readdirSync(process.env.AWESOME_AGENTS_FAKE_SOURCE)) {
  fs.cpSync(
    path.join(process.env.AWESOME_AGENTS_FAKE_SOURCE, entry),
    path.join(dest, entry),
    { recursive: true, force: true }
  );
}
`);
  await fs.chmod(fakeGit, 0o755);

  return {
    AWESOME_AGENTS_EXPECTED_URL: expectedUrl,
    AWESOME_AGENTS_FAKE_SOURCE: source,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ""}`
  };
}

function runCli(args, envOverrides = {}, options = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      CODEX_HOME: "",
      CLAUDE_HOME: "",
      OPENCODE_CONFIG_DIR: "",
      TENEX_EDGE_HOME: "",
      XDG_CONFIG_HOME: "",
      ...envOverrides
    }
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

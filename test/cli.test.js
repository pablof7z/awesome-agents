import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, test } from "node:test";
import { SUPPORTED_AGENTS } from "../src/constants.js";

const repoRoot = path.resolve(import.meta.dirname, "..");
const bin = path.join(repoRoot, "bin", "awesome-agents.js");
const fixture = path.join(repoRoot, "test", "fixtures", "profile-source");

let tempRoot;
let home;

test("supported harnesses stay explicit", () => {
  assert.deepEqual(SUPPORTED_AGENTS, ["codex", "claude-code", "opencode", "goose", "hermes"]);
});

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

  assert.match(result.stdout, /Operational profiles for Codex, Claude Code, OpenCode, Goose, and Hermes/);
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
  assert.match(result.stdout, /Operational profiles for Codex, Claude Code, OpenCode, Goose, and Hermes/);
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
  const userSkill = path.join(home, ".agents", "skills", "release-checklist");
  await fs.mkdir(path.join(profileSource, "agents", "planning-agent"), { recursive: true });
  await fs.mkdir(userSkill, { recursive: true });
  await fs.writeFile(
    path.join(profileSource, "agents", "planning-agent", "agent.yaml"),
    `schema: awesome-agents/v1
id: planning-agent
name: Planning Agent
description: Tests user skill fallback.
skills:
  - release-checklist
instructions: |
  Plan the work.
`,
    "utf8"
  );
  await fs.writeFile(
    path.join(userSkill, "SKILL.md"),
    `---
name: release-checklist
description: Coordinates release verification.
---

# Release checklist
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

  const skillTarget = path.join(home, ".agents", "homes", "planning-agent", "skills", "release-checklist");
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
  const agentHome = path.join(home, ".agents", "homes", "ops-agent");
  assert.match(content, new RegExp(escapeRegExp(`Agent home: \`${agentHome}\``)));
  assert.match(content, new RegExp(escapeRegExp(`- \`references\`: \`${path.join(agentHome, "references")}\``)));
  assert.match(content, new RegExp(escapeRegExp(`- \`scripts\`: \`${path.join(agentHome, "scripts")}\``)));
  assert.match(content, /You are an ops agent/);
  assert.doesNotMatch(content, /primary_skill/);
  assert.doesNotMatch(content, /skills\//);

  assert.equal(existsSync(path.join(home, ".agents", "homes", "ops-agent", "scripts", "heartbeat.sh")), true);
  assert.equal(existsSync(path.join(home, ".agents", "homes", "ops-agent", "references", "runbook.md")), true);

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.operations[0].agentHome, agentHome);
  assert.deepEqual(parsed.operations[0].supportRoots, [
    { kind: "references", path: path.join(agentHome, "references") },
    { kind: "scripts", path: path.join(agentHome, "scripts") }
  ]);
  assert.deepEqual(
    parsed.operations[0].supportTargets.map((targetPath) => path.relative(home, targetPath)).sort(),
    [
      ".agents/homes/ops-agent/references/runbook.md",
      ".agents/homes/ops-agent/scripts/heartbeat.sh"
    ]
  );
});

test("exposes agent-owned support paths in every installed harness profile", async () => {
  const harnesses = ["codex", "claude-code", "opencode", "goose", "hermes"];
  const agentHome = path.join(home, ".agents", "homes", "ops-agent");
  const references = path.join(agentHome, "references");
  const scripts = path.join(agentHome, "scripts");

  for (const harness of harnesses) {
    const result = runCli([
      "add",
      fixture,
      "--agent",
      "ops-agent",
      "--harness",
      harness,
      "--global",
      "--home",
      home,
      "--json"
    ]);
    assert.equal(result.status, 0, `${harness}: ${result.stderr}`);

    const [operation] = JSON.parse(result.stdout).operations;
    const installed = await fs.readFile(operation.target, "utf8");
    const prompt = installed;

    assert.match(prompt, new RegExp(escapeRegExp(`Agent home: \`${agentHome}\``)), harness);
    assert.match(prompt, new RegExp(escapeRegExp(`- \`references\`: \`${references}\``)), harness);
    assert.match(prompt, new RegExp(escapeRegExp(`- \`scripts\`: \`${scripts}\``)), harness);
  }
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

test("installs a Goose custom agent globally and project-locally", async () => {
  const globalResult = runCli([
    "add",
    fixture,
    "--agent",
    "triage-agent",
    "--harness",
    "goose",
    "--global",
    "--home",
    home,
    "--json"
  ]);
  assert.equal(globalResult.status, 0, globalResult.stderr);

  const globalTarget = path.join(home, ".agents", "agents", "triage-agent.md");
  assert.equal(existsSync(globalTarget), true);

  const globalContent = await fs.readFile(globalTarget, "utf8");
  assert.match(globalContent, /name: triage-agent/);
  assert.match(globalContent, /Generated by awesome-agents/);
  assert.match(globalContent, /Installed identity: `triage-agent`/);
  assert.match(globalContent, /Installed for: `goose`/);

  const parsed = JSON.parse(globalResult.stdout);
  assert.equal(parsed.operations[0].harness, "goose");
  assert.equal(parsed.operations[0].scope, "global");
  assert.equal(parsed.operations[0].target, globalTarget);

  const project = path.join(tempRoot, "project");
  await fs.mkdir(path.join(project, ".agents", "agents"), { recursive: true });
  const projectResult = runCli([
    "add",
    fixture,
    "--agent",
    "research-agent",
    "--harness",
    "goose",
    "--project",
    "--home",
    home
  ], {}, { cwd: project });
  assert.equal(projectResult.status, 0, projectResult.stderr);

  const projectTarget = path.join(project, ".agents", "agents", "research-agent.md");
  assert.equal(existsSync(projectTarget), true);
  const projectContent = await fs.readFile(projectTarget, "utf8");
  assert.match(projectContent, /name: research-agent/);
  assert.match(projectContent, /Generated by awesome-agents/);
});

test("installs a Hermes named profile as SOUL.md", async () => {
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "triage-agent",
    "--harness",
    "hermes",
    "--home",
    home,
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const target = path.join(home, ".hermes", "profiles", "triage-agent", "SOUL.md");
  assert.equal(existsSync(target), true);

  const content = await fs.readFile(target, "utf8");
  assert.match(content, /Generated by awesome-agents/);
  assert.match(content, /Installed identity: `triage-agent`/);
  assert.match(content, /Installed for: `hermes`/);
  assert.match(content, /Sort incoming work, identify blockers, and route tasks/);

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.operations[0].harness, "hermes");
  assert.equal(parsed.operations[0].scope, "global");
  assert.equal(parsed.operations[0].target, target);
});

test("respects HERMES_HOME for named profile installs", () => {
  const hermesHome = path.join(tempRoot, "custom-hermes-home");
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "triage-agent",
    "--harness",
    "hermes",
    "--global",
    "--home",
    home,
    "--json"
  ], { HERMES_HOME: hermesHome });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(path.join(hermesHome, "profiles", "triage-agent", "SOUL.md")), true);
});

test("lists, updates, and removes Hermes profiles through the registry", async () => {
  const target = path.join(home, ".hermes", "profiles", "triage-agent", "SOUL.md");
  const install = runCli([
    "add", fixture, "--agent", "triage-agent", "--harness", "hermes", "--home", home, "--json"
  ]);
  assert.equal(install.status, 0, install.stderr);

  const list = runCli(["list", "--global", "--agent", "hermes", "--home", home, "--json"]);
  assert.equal(list.status, 0, list.stderr);
  const listed = JSON.parse(list.stdout);
  assert.equal(listed.installs.length, 1);
  assert.equal(listed.installs[0].target, target);
  assert.equal(listed.installs[0].exists, true);

  const update = runCli(["update", "triage-agent", "--global", "--agent", "hermes", "--home", home, "--json"]);
  assert.equal(update.status, 0, update.stderr);
  assert.equal(JSON.parse(update.stdout).operations[0].harness, "hermes");

  const remove = runCli(["remove", "triage-agent", "--global", "--agent", "hermes", "--home", home, "--json"]);
  assert.equal(remove.status, 0, remove.stderr);
  assert.equal(JSON.parse(remove.stdout).operations[0].action, "removed");
  assert.equal(existsSync(target), false);
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

test("prints goose session instructions when available", async () => {
  const fakeBin = await createFakeCommand("goose");
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "ops-agent",
    "--harness",
    "goose",
    "--home",
    home
  ], { PATH: fakeBin, NO_COLOR: "1" });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Run installed profiles:/);
  assert.match(result.stdout, /ops-agent -- Keeps operational follow-through moving across tools and teams\./);
  assert.match(result.stdout, /goose: goose session/);
});

test("prints Hermes named-profile run instructions when available", async () => {
  const fakeBin = await createFakeCommand("hermes");
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "ops-agent",
    "--harness",
    "hermes",
    "--home",
    home
  ], { PATH: fakeBin, NO_COLOR: "1" });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Run installed profiles:/);
  assert.match(result.stdout, /hermes: hermes -p ops-agent chat/);
});

test("defaults to installing every harness detected on PATH", async () => {
  const fakeBin = await createFakeCommands(["claude", "opencode", "goose", "hermes"]);
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
  assert.deepEqual(parsed.operations.map((operation) => operation.harness).sort(), ["claude-code", "goose", "hermes", "opencode"]);
  assert.equal(existsSync(path.join(home, ".claude", "agents", "ops-agent.md")), true);
  assert.equal(existsSync(path.join(home, ".config", "opencode", "agents", "ops-agent.md")), true);
  assert.equal(existsSync(path.join(home, ".agents", "agents", "ops-agent.md")), true);
  assert.equal(existsSync(path.join(home, ".hermes", "profiles", "ops-agent", "SOUL.md")), true);
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
  const fakeBin = await createFakeCommands(["codex", "claude", "opencode", "goose", "hermes"]);
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
  assert.equal(existsSync(path.join(home, ".agents", "agents", "ops-agent.md")), false);
  assert.equal(existsSync(path.join(home, ".hermes", "profiles", "ops-agent", "SOUL.md")), false);
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
      GOOSE_HOME: "",
      HERMES_HOME: "",
      XDG_CONFIG_HOME: "",
      ...envOverrides
    }
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

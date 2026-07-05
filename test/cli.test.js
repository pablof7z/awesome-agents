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

  assert.match(result.stdout, /Operational profiles for Codex, Claude Code, and OpenCode/);
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
  assert.match(result.stdout, /Operational profiles for Codex, Claude Code, and OpenCode/);
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
  assert.match(content, /name = "triage-agent"/);
  assert.match(content, /description = "Sorts incoming work/);
  assert.match(content, /model = "gpt-5\.5"/);
  assert.match(content, /developer_instructions = '''/);

  const installed = JSON.parse(await fs.readFile(registry, "utf8"));
  assert.equal(installed.installs[0].profile, "triage-agent");
  assert.equal(installed.installs[0].harness, "codex");
});

test("installs an Agent Format YAML profile as a profile, not a skill", async () => {
  const result = runCli([
    "add",
    fixture,
    "--agent",
    "ops-agent",
    "--global",
    "--home",
    home,
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const target = path.join(home, ".codex", "ops-agent.config.toml");
  assert.equal(existsSync(target), true);

  const content = await fs.readFile(target, "utf8");
  assert.match(content, /name = "ops-agent"/);
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

test("use renders a single profile without installing", () => {
  const result = runCli(["use", `${fixture}@triage-agent`, "--agent", "codex", "--home", home]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /name = "triage-agent"/);
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
  assert.match(result.stdout, /ops-agent via codex: codex --profile ops-agent/);
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
  const fakeBin = path.join(tempRoot, `fake-${command}-bin`);
  const fakeCommand = path.join(fakeBin, command);
  await fs.mkdir(fakeBin, { recursive: true });
  await fs.writeFile(fakeCommand, "#!/bin/sh\nexit 0\n");
  await fs.chmod(fakeCommand, 0o755);
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
      XDG_CONFIG_HOME: "",
      ...envOverrides
    }
  });
}

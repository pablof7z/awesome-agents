import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const bin = path.join(root, "bin", "awesome-agents.js");

test("installs a local profile into a global Codex config file", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "awesome-agents-test-"));
  const source = path.join(temp, "source");
  const home = path.join(temp, "home");
  fs.mkdirSync(path.join(source, "agents", "profiles"), { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(
    path.join(source, "agents", "profiles", "sample.md"),
    `---\nslug: sample\nname: Sample Agent\nkind: operational-agent-profile\nsummary: Tests things.\nrecommended_model: gpt-5.5\nrecommended_reasoning_effort: high\n---\n\n# Sample Agent\n\nDo useful work.\n`,
    "utf8",
  );

  const project = path.join(temp, "project");
  fs.mkdirSync(project);
  const result = spawnSync(process.execPath, [bin, "install", source, "--profile", "sample", "--agent", "codex", "--global", "--home", home], {
    cwd: project,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const target = path.join(home, ".codex", "sample.config.toml");
  assert.equal(fs.existsSync(target), true);
  const content = fs.readFileSync(target, "utf8");
  assert.match(content, /# Profile: sample/);
  assert.match(content, /# Display name: Sample Agent/);
  assert.doesNotMatch(content, /^name = /m);
  assert.doesNotMatch(content, /^description = /m);
  assert.match(content, /model = "gpt-5.5"/);
  assert.match(content, /developer_instructions = /);
});

test("rejects project-local Codex profile installs", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "awesome-agents-test-"));
  const source = path.join(temp, "source");
  fs.mkdirSync(path.join(source, "agents", "profiles"), { recursive: true });
  fs.writeFileSync(
    path.join(source, "agents", "profiles", "sample.md"),
    `---\nslug: sample\nname: Sample Agent\nkind: operational-agent-profile\nsummary: Tests things.\n---\n\n# Sample Agent\n\nDo useful work.\n`,
    "utf8",
  );

  const project = path.join(temp, "project");
  fs.mkdirSync(project);
  const result = spawnSync(process.execPath, [bin, "install", source, "--profile", "sample", "--agent", "codex", "--project"], {
    cwd: project,
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cannot be installed project-locally/);
  assert.equal(fs.existsSync(path.join(project, ".codex", "agents", "sample.toml")), false);
});

test("rejects project-local tenex-edge profile installs", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "awesome-agents-test-"));
  const source = path.join(temp, "source");
  const home = path.join(temp, "home");
  fs.mkdirSync(path.join(source, "agents", "profiles"), { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(
    path.join(source, "agents", "profiles", "sample.md"),
    `---\nslug: sample\nname: Sample Agent\nkind: operational-agent-profile\nsummary: Tests things.\n---\n\n# Sample Agent\n\nDo useful work.\n`,
    "utf8",
  );

  const project = path.join(temp, "project");
  fs.mkdirSync(project);
  const result = spawnSync(process.execPath, [bin, "install", source, "--profile", "sample", "--agent", "tenex-edge", "--project", "--home", home], {
    cwd: project,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      TENEX_EDGE_HOME: "",
    },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /tenex-edge agents are machine-local/);
  assert.equal(fs.existsSync(path.join(home, ".tenex-edge", "agents", "sample.json")), false);
});

test("lists profiles from a source", () => {
  const source = path.join(root, "test", "fixtures", "profile-source");
  const result = spawnSync(process.execPath, [bin, "install", source, "--list"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /triage-agent/);
  assert.match(result.stdout, /research-agent/);
  assert.match(result.stdout, /ops-agent/);
});

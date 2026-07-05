import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const bin = path.join(root, "bin", "awesome-agents.js");

test("installs a local profile into a project Codex agent file", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "awesome-agents-test-"));
  const source = path.join(temp, "source");
  fs.mkdirSync(path.join(source, "agents", "profiles"), { recursive: true });
  fs.writeFileSync(
    path.join(source, "agents", "profiles", "sample.md"),
    `---\nslug: sample\nname: Sample Agent\nkind: operational-agent-profile\nsummary: Tests things.\nrecommended_model: gpt-5.5\nrecommended_reasoning_effort: high\n---\n\n# Sample Agent\n\nDo useful work.\n`,
    "utf8",
  );

  const project = path.join(temp, "project");
  fs.mkdirSync(project);
  const result = spawnSync(process.execPath, [bin, "install", source, "--profile", "sample", "--agent", "codex", "--project"], {
    cwd: project,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const target = path.join(project, ".codex", "agents", "sample.toml");
  assert.equal(fs.existsSync(target), true);
  const content = fs.readFileSync(target, "utf8");
  assert.match(content, /name = "sample"/);
  assert.match(content, /model = "gpt-5.5"/);
  assert.match(content, /developer_instructions = /);
});

test("lists profiles from a source", () => {
  const result = spawnSync(process.execPath, [bin, "install", "../touch-grass", "--list"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ios-tester/);
});

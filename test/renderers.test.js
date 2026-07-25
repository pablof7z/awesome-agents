import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { parseFrontmatter } from "../src/frontmatter.js";
import { renderForAgent } from "../src/renderers.js";
import { loadCatalog, materializeSource } from "../src/source.js";

const repoRoot = path.resolve(import.meta.dirname, "..");
const fixture = path.join(repoRoot, "test", "fixtures", "profile-source");

async function loadFixtureProfile(slug) {
  const materialized = await materializeSource(fixture, {});
  try {
    const catalog = await loadCatalog(materialized.path);
    const profile = catalog.profiles.find((candidate) => candidate.slug === slug);
    assert.ok(profile, `expected fixture profile "${slug}" to exist`);
    return profile;
  } finally {
    await materialized.cleanup();
  }
}

function runGuard(command, { cwd = "/tmp/work", tool_input, ...rest } = {}) {
  const input = JSON.stringify({ cwd, tool_input: tool_input ?? { command: rest.command }, ...rest });
  const result = spawnSync("/bin/sh", ["-c", command], { input, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  if (!result.stdout.trim()) {
    return { decision: "defer" };
  }
  const parsed = JSON.parse(result.stdout.trim());
  return {
    decision: parsed.hookSpecificOutput.permissionDecision,
    reason: parsed.hookSpecificOutput.permissionDecisionReason
  };
}

test("renderClaudeCode omits hooks when the profile has no bash_guard", async () => {
  const profile = await loadFixtureProfile("research-agent");
  const content = renderForAgent(profile, "claude-code", { source: fixture });
  const { attributes } = parseFrontmatter(content);
  assert.equal(attributes.hooks, undefined);
  assert.equal(attributes.tools, "Bash");
});

test("renderClaudeCode emits a PreToolUse Bash hook when bash_guard is set", async () => {
  const profile = await loadFixtureProfile("guarded-agent");
  const content = renderForAgent(profile, "claude-code", { source: fixture });
  const { attributes } = parseFrontmatter(content);

  assert.ok(attributes.hooks, "expected hooks frontmatter");
  assert.equal(attributes.hooks.PreToolUse.length, 1);
  const [entry] = attributes.hooks.PreToolUse;
  assert.equal(entry.matcher, "Bash");
  assert.equal(entry.hooks.length, 1);
  assert.equal(entry.hooks[0].type, "command");
  assert.match(entry.hooks[0].command, /^node -e "\$\(cat <<'AWESOME_AGENTS_BASH_GUARD_V1'\n/);
});

test("bash_guard hook: unrestricted inside the self-management root", async () => {
  const profile = await loadFixtureProfile("guarded-agent");
  const content = renderForAgent(profile, "claude-code", { source: fixture });
  const { attributes } = parseFrontmatter(content);
  const command = attributes.hooks.PreToolUse[0].hooks[0].command
    .replace("~/.agents/homes/guarded-agent", "/tmp/guarded-home");

  const result = runGuard(command, { cwd: "/tmp/guarded-home/notes", command: "rm -rf ./everything" });
  assert.equal(result.decision, "allow");
});

test("bash_guard hook: default-deny outside the self-management root", async () => {
  const profile = await loadFixtureProfile("guarded-agent");
  const content = renderForAgent(profile, "claude-code", { source: fixture });
  const { attributes } = parseFrontmatter(content);
  const command = attributes.hooks.PreToolUse[0].hooks[0].command;

  const cases = [
    { command: "gh pr view 12", expect: "allow" },
    { command: "gh pr list", expect: "allow" },
    { command: "gh pr diff 12", expect: "allow" },
    { command: "gh pr checks 12", expect: "allow" },
    { command: "gh repo view", expect: "allow" },
    { command: "ps aux", expect: "allow" },
    { command: "lsof -i :3000", expect: "allow" },
    { command: "ls -la", expect: "allow" },
    { command: "ls && gh pr view 1", expect: "allow" },
    { command: "gh pr merge 12", expect: "deny" },
    { command: "gh issue close 1", expect: "deny" },
    { command: "curl https://example.com", expect: "deny" },
    { command: "kill -9 123", expect: "deny" },
    { command: "launchctl unload foo", expect: "deny" },
    { command: "rm -rf /", expect: "deny" },
    { command: "gh pr view 1 && rm -rf /", expect: "deny" },
    { command: "ls $(rm -rf /)", expect: "deny" },
    { command: "ls `rm -rf /`", expect: "deny" },
    { command: "git status", expect: "defer" },
    { command: "git push origin main", expect: "defer" },
    { command: "git commit -am wip", expect: "defer" }
  ];

  for (const { command: bashCommand, expect } of cases) {
    const result = runGuard(command, { cwd: "/tmp/work", command: bashCommand });
    assert.equal(result.decision, expect, `command "${bashCommand}" expected ${expect}, got ${result.decision} (${result.reason ?? ""})`);
  }
});

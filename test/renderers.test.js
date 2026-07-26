import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
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

const FIXTURE_GUARD_ROOT = "~/.agents/homes/guarded-agent";

// Renders the guarded fixture and hands back the hook command, optionally with
// the fixture's declared self-management root rewritten to a real test path.
async function guardCommand({ root, profileOverrides } = {}) {
  const profile = await loadFixtureProfile("guarded-agent");
  const content = renderForAgent({ ...profile, ...profileOverrides }, "claude-code", { source: fixture });
  const { attributes } = parseFrontmatter(content);
  const command = attributes.hooks.PreToolUse[0].hooks[0].command;
  return root ? command.replaceAll(FIXTURE_GUARD_ROOT, root) : command;
}

function runGuard(command, { cwd = "/tmp/work", tool_input, env, ...rest } = {}) {
  const input = JSON.stringify({ cwd, tool_input: tool_input ?? { command: rest.command }, ...rest });
  const result = spawnSync("/bin/sh", ["-c", command], { input, encoding: "utf8", env: env ? { ...process.env, ...env } : process.env });
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

test("bash_guard hook: profile-owned scripts are allowed from a project cwd", async () => {
  const command = await guardCommand({ root: "/tmp/guarded-home" });

  const cases = [
    // The profile's own entrypoint, invoked from a project directory.
    { command: "python3 /tmp/guarded-home/scripts/session_start.py", expect: "allow" },
    // A script belonging to one of the profile's own installed skills.
    { command: "python3 /tmp/guarded-home/skills/runbook/scripts/runbooks.py --runbooks-dir /tmp/guarded-home/runbooks list", expect: "allow" },
    // Other interpreters, versioned interpreter names, and direct execution.
    { command: "python3.12 /tmp/guarded-home/scripts/session_start.py", expect: "allow" },
    { command: "node /tmp/guarded-home/scripts/report.js", expect: "allow" },
    { command: "bash /tmp/guarded-home/scripts/sync.sh --force", expect: "allow" },
    { command: "/tmp/guarded-home/scripts/session_start.py", expect: "allow" },
    // Argument-free interpreter flags still leave the script identifiable.
    { command: "python3 -u /tmp/guarded-home/scripts/session_start.py", expect: "allow" },
    { command: "PYTHONPATH=/tmp/x python3 /tmp/guarded-home/scripts/session_start.py", expect: "allow" },
    { command: "python3 /tmp/guarded-home/scripts/session_start.py && gh pr list", expect: "allow" },
    // Same script, but relative to a project cwd: that resolves to a different
    // file the profile does not own.
    { command: "python3 scripts/runbooks.py list", expect: "deny" },
    { command: "python3 /tmp/elsewhere/scripts/session_start.py", expect: "deny" },
    // Inline code smuggled in as a flag argument forfeits the carve-out.
    { command: 'python3 -c "import os" /tmp/guarded-home/scripts/session_start.py', expect: "deny" },
    { command: "node --eval cleanup /tmp/guarded-home/scripts/report.js", expect: "deny" },
    // A root-anchored path as a plain argument does not launder the command.
    { command: "rm -rf / /tmp/guarded-home", expect: "deny" },
    { command: "curl https://example.com -o /tmp/guarded-home/scripts/evil.py", expect: "deny" },
    // Every part still has to pass on its own.
    { command: "python3 /tmp/guarded-home/scripts/session_start.py && rm -rf /", expect: "deny" }
  ];

  for (const { command: bashCommand, expect } of cases) {
    const result = runGuard(command, { cwd: "/tmp/work", command: bashCommand });
    assert.equal(result.decision, expect, `command "${bashCommand}" expected ${expect}, got ${result.decision} (${result.reason ?? ""})`);
  }
});

test("bash_guard hook: script roots expand ~ against the running HOME", async () => {
  const command = await guardCommand();

  const result = runGuard(command, {
    cwd: "/tmp/work",
    command: "python3 /tmp/fake-home/.agents/homes/guarded-agent/scripts/session_start.py",
    env: { HOME: "/tmp/fake-home" }
  });

  assert.equal(result.decision, "allow", result.reason);
});

test("bash_guard hook: the installed agent home is an implicit script root", async () => {
  const command = await guardCommand({ profileOverrides: { agentHome: "/tmp/installed-home/guarded-agent" } });

  const allowed = runGuard(command, {
    cwd: "/tmp/work",
    command: "python3 /tmp/installed-home/guarded-agent/scripts/session_start.py"
  });
  assert.equal(allowed.decision, "allow", allowed.reason);

  // The implicit root only covers invoked scripts, not the cwd carve-out.
  const denied = runGuard(command, {
    cwd: "/tmp/installed-home/guarded-agent",
    command: "python3 /tmp/elsewhere/other.py"
  });
  assert.equal(denied.decision, "deny", denied.reason);
});

test("bash_guard hook: script roots match through a symlinked agent home", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "bash-guard-"));
  try {
    const tracked = path.join(base, "tracking-repo", ".agents", "homes", "guarded-agent");
    await fs.mkdir(path.join(tracked, "scripts"), { recursive: true });
    await fs.writeFile(path.join(tracked, "scripts", "session_start.py"), "");
    const linkedHome = path.join(base, "linked-home");
    await fs.symlink(tracked, linkedHome);

    // Root declared as the symlink, script invoked through the real path.
    const command = await guardCommand({ root: linkedHome });
    const result = runGuard(command, {
      cwd: "/tmp/work",
      command: `python3 ${path.join(tracked, "scripts", "session_start.py")}`
    });
    assert.equal(result.decision, "allow", result.reason);

    // Root declared as the real path, script invoked through the symlink.
    const reverse = await guardCommand({ root: tracked });
    const reverseResult = runGuard(reverse, {
      cwd: "/tmp/work",
      command: `python3 ${path.join(linkedHome, "scripts", "session_start.py")}`
    });
    assert.equal(reverseResult.decision, "allow", reverseResult.reason);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});

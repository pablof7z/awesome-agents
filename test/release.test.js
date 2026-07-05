import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const releaseScript = path.join(repoRoot, "scripts", "release.js");
const changelogScript = path.join(repoRoot, "scripts", "changelog.js");
const packagePath = path.join(repoRoot, "package.json");
const changelogPath = path.join(repoRoot, "CHANGELOG.md");

test("release dry-run previews the next patch without writing release files", async () => {
  const beforePackage = await fs.readFile(packagePath, "utf8");
  const beforeChangelog = await fs.readFile(changelogPath, "utf8");
  const currentVersion = JSON.parse(beforePackage).version;
  const expectedVersion = nextPatch(currentVersion);

  const result = spawnSync(process.execPath, [releaseScript, "--dry-run", "patch"], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`Release plan: ${escapeRegExp(currentVersion)} -> ${escapeRegExp(expectedVersion)}`));
  assert.match(result.stdout, /Files that would be updated:/);
  assert.equal(await fs.readFile(packagePath, "utf8"), beforePackage);
  assert.equal(await fs.readFile(changelogPath, "utf8"), beforeChangelog);
});

test("changelog script can render an explicit version preview", () => {
  const result = spawnSync(process.execPath, [changelogScript, "--version", "9.9.9"], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^## 9\.9\.9 - \d{4}-\d{2}-\d{2}/);
});

function nextPatch(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

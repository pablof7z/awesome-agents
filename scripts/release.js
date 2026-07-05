#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { updateChangelog } from "./changelog.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const packagePath = path.join(root, "package.json");
const lockPath = path.join(root, "package-lock.json");
const constantsPath = path.join(root, "src", "constants.js");
const trackedReleaseFiles = [
  "package.json",
  "package-lock.json",
  "src/constants.js",
  "CHANGELOG.md"
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const currentVersion = await readPackageVersion();
  const nextVersion = resolveNextVersion(currentVersion, options.bump);
  const tag = `v${nextVersion}`;

  if (!options.dryRun) {
    assertCleanWorktree();
  }

  console.log(`Release plan: ${currentVersion} -> ${nextVersion}`);

  if (options.dryRun) {
    const changelog = await updateChangelog({ version: nextVersion, write: false });
    console.log("\nFiles that would be updated:");
    for (const file of trackedReleaseFiles) {
      console.log(`- ${file}`);
    }
    console.log("\nChangelog entry preview:\n");
    process.stdout.write(changelog.entry);
    return;
  }

  await updatePackageJson(nextVersion);
  await updatePackageLock(nextVersion);
  await updateConstants(nextVersion);
  await updateChangelog({ version: nextVersion, write: true });

  if (!options.skipChecks) {
    run("npm", ["run", "lint"]);
    run("npm", ["test"]);
  }

  git(["add", ...trackedReleaseFiles]);
  git(["commit", "-m", `Release ${tag}`]);
  git(["tag", "-a", tag, "-m", `Release ${tag}`]);

  if (options.push) {
    const branch = git(["branch", "--show-current"], { capture: true });
    if (!branch) {
      throw new Error("Cannot push from a detached HEAD.");
    }
    git(["push", "origin", branch]);
    git(["push", "origin", tag]);
  }

  console.log(`Cut ${tag}.`);
  if (!options.push) {
    console.log(`Push with: git push origin HEAD && git push origin ${tag}`);
  }
}

function parseArgs(argv) {
  const options = {
    bump: "patch",
    dryRun: false,
    push: false,
    skipChecks: false
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--push") {
      options.push = true;
    } else if (arg === "--skip-checks") {
      options.skipChecks = true;
    } else if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 1) {
    throw new Error(`Expected one bump argument, received: ${positional.join(", ")}`);
  }
  if (positional[0]) {
    options.bump = positional[0];
  }

  return options;
}

function resolveNextVersion(currentVersion, bump) {
  const explicit = bump.replace(/^v/, "");
  if (/^\d+\.\d+\.\d+$/.test(explicit)) {
    return explicit;
  }

  const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Cannot bump non-standard version ${currentVersion}. Pass an explicit x.y.z version.`);
  }

  const parts = match.slice(1).map(Number);
  if (bump === "major") {
    return `${parts[0] + 1}.0.0`;
  }
  if (bump === "minor") {
    return `${parts[0]}.${parts[1] + 1}.0`;
  }
  if (bump === "patch") {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }

  throw new Error(`Unsupported release bump "${bump}". Use patch, minor, major, or x.y.z.`);
}

async function readPackageVersion() {
  const pkg = JSON.parse(await fs.readFile(packagePath, "utf8"));
  return pkg.version;
}

async function updatePackageJson(version) {
  const pkg = JSON.parse(await fs.readFile(packagePath, "utf8"));
  pkg.version = version;
  await writeJson(packagePath, pkg);
}

async function updatePackageLock(version) {
  const lock = JSON.parse(await fs.readFile(lockPath, "utf8"));
  lock.version = version;
  if (lock.packages?.[""]) {
    lock.packages[""].version = version;
  }
  await writeJson(lockPath, lock);
}

async function updateConstants(version) {
  const content = await fs.readFile(constantsPath, "utf8");
  const next = content.replace(
    /export const PACKAGE_VERSION = "[^"]+";/,
    `export const PACKAGE_VERSION = "${version}";`
  );
  if (next === content) {
    throw new Error("Could not find PACKAGE_VERSION in src/constants.js.");
  }
  await fs.writeFile(constantsPath, next);
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function assertCleanWorktree() {
  const status = git(["status", "--short"], { capture: true });
  if (status) {
    throw new Error(`Release requires a clean worktree:\n${status}`);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}`);
  }
}

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `git exited with ${result.status}`;
    throw new Error(detail);
  }
  return options.capture ? result.stdout.trim() : "";
}

function printHelp() {
  console.log(`Usage: npm run release -- [patch|minor|major|x.y.z] [options]

Cuts a release commit and annotated git tag. It does not publish to npm.

Options:
  --dry-run       Preview version and changelog changes
  --push          Push the current branch and release tag after tagging
  --skip-checks   Skip npm run lint and npm test
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

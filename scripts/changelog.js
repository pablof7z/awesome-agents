#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const changelogPath = path.join(root, "CHANGELOG.md");
const packagePath = path.join(root, "package.json");
const changelogHeader = "# Changelog\n\nThis file is maintained by `npm run changelog` and `npm run release`. Release entries are generated from git commit history.\n\n";
const categoryOrder = ["Breaking", "Added", "Fixed", "Changed", "Documentation", "Tests", "Maintenance"];

export async function updateChangelog(options = {}) {
  const version = options.version ?? await readPackageVersion();
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const from = options.from ?? latestVersionTag();
  const to = options.to ?? "HEAD";
  const commits = readCommits(from, to);
  const entry = formatEntry({ version, date, from, commits });

  if (!options.write) {
    return { changelogPath, entry, commits, from, to, version };
  }

  const existing = await readExistingChangelog();
  await fs.writeFile(changelogPath, upsertEntry(existing, entry, version));
  return { changelogPath, entry, commits, from, to, version };
}

function readCommits(from, to) {
  const range = from ? `${from}..${to}` : to;
  const output = git(["log", "--no-merges", "--pretty=format:%H%x1f%s", range], { allowEmpty: true });
  if (!output) {
    return [];
  }

  return output.split("\n").map((line) => {
    const [hash, subject] = line.split("\x1f");
    return {
      hash,
      shortHash: hash.slice(0, 7),
      subject: subject.trim()
    };
  }).filter((commit) => commit.subject);
}

function formatEntry({ version, date, from, commits }) {
  const lines = [`## ${version} - ${date}`, ""];
  lines.push(from ? `Changes since \`${from}\`.` : "Initial tracked release.");
  lines.push("");

  if (commits.length === 0) {
    lines.push("- No commits found for this release.");
    return `${lines.join("\n")}\n`;
  }

  const groups = new Map(categoryOrder.map((category) => [category, []]));
  for (const commit of commits) {
    groups.get(categoryFor(commit.subject)).push(commit);
  }

  for (const category of categoryOrder) {
    const entries = groups.get(category);
    if (entries.length === 0) {
      continue;
    }

    lines.push(`### ${category}`, "");
    for (const commit of entries) {
      lines.push(`- ${cleanSubject(commit.subject)} (${commit.shortHash})`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function upsertEntry(existing, entry, version) {
  const body = normalizeBody(existing);
  const escapedVersion = escapeRegExp(version);
  const existingEntry = new RegExp(`^## ${escapedVersion} - [^\\n]*\\n[\\s\\S]*?(?=^## \\d+\\.\\d+\\.\\d+ - |(?![\\s\\S]))`, "m");

  if (existingEntry.test(body)) {
    return `${changelogHeader}${body.replace(existingEntry, entry.trimEnd()).trimStart()}`;
  }

  return `${changelogHeader}${entry.trimEnd()}\n\n${body.trimStart()}`.trimEnd() + "\n";
}

function normalizeBody(existing) {
  if (!existing) {
    return "";
  }

  if (existing.startsWith(changelogHeader)) {
    return existing.slice(changelogHeader.length);
  }

  return existing.replace(/^# Changelog\s*/i, "").trimStart();
}

function categoryFor(subject) {
  const normalized = subject.toLowerCase();
  if (/^[a-z]+(?:\([^)]+\))?!:/.test(normalized) || normalized.includes("breaking")) {
    return "Breaking";
  }
  if (/^(feat|add)(?:\([^)]+\))?:?\s/.test(normalized)) {
    return "Added";
  }
  if (/^(fix|repair)(?:\([^)]+\))?:?\s/.test(normalized)) {
    return "Fixed";
  }
  if (/^(docs?|readme)(?:\([^)]+\))?:?\s/.test(normalized)) {
    return "Documentation";
  }
  if (/^(test|tests)(?:\([^)]+\))?:?\s/.test(normalized)) {
    return "Tests";
  }
  if (/^(build|chore|ci|release|bump)(?:\([^)]+\))?:?\s/.test(normalized)) {
    return "Maintenance";
  }
  return "Changed";
}

function cleanSubject(subject) {
  return subject
    .replace(/^[a-z]+(?:\([^)]+\))?!?:\s*/i, "")
    .trim();
}

function latestVersionTag() {
  return git(["tag", "--list", "v[0-9]*", "--sort=-version:refname"], { allowEmpty: true })
    .split("\n")
    .find(Boolean);
}

async function readPackageVersion() {
  const pkg = JSON.parse(await fs.readFile(packagePath, "utf8"));
  return pkg.version;
}

async function readExistingChangelog() {
  try {
    return await fs.readFile(changelogPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8"
  });

  if (result.status !== 0 && !(options.allowEmpty && result.status === 128)) {
    const detail = result.stderr.trim() || result.stdout.trim() || `git exited with ${result.status}`;
    throw new Error(detail);
  }

  return result.stdout.trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseArgs(argv) {
  const options = { write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") {
      options.write = true;
    } else if (arg === "--version") {
      options.version = argv[++index];
    } else if (arg === "--from") {
      options.from = argv[++index];
    } else if (arg === "--to") {
      options.to = argv[++index];
    } else if (arg === "--date") {
      options.date = argv[++index];
    } else if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/changelog.js [options]

Options:
  --write              Update CHANGELOG.md instead of printing the next entry
  --version <version>  Release version to write; defaults to package.json
  --from <ref>         Starting git ref; defaults to latest v* tag
  --to <ref>           Ending git ref; defaults to HEAD
  --date <date>        Release date; defaults to today
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const result = await updateChangelog(options);
  if (options.write) {
    console.log(`Updated ${path.relative(root, result.changelogPath)} for ${result.version} with ${result.commits.length} commit(s).`);
  } else {
    process.stdout.write(result.entry);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

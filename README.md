# awesome-agents

`awesome-agents` is an `npx`-compatible installer for reusable agent profiles.
It mirrors the useful parts of `npx skills`, but the unit is an operational
agent profile instead of a skill.

Supported sources are GitHub repos, Git URLs, or local checkouts that use the
agent-profile source layout. Profiles are read from `agents/profiles/*.md`,
adapted for the selected harness, and installed into the right place for Codex,
Claude Code, or OpenCode.

## Install And Run

Use the CLI with `npx`:

```bash
npx awesome-agents add owner/repo --agent triage-agent
npx awesome-agents add owner/repo --agent triage-agent --harness opencode
```

From this repo during development:

```bash
npm install
npm test
node ./bin/awesome-agents.js add ./test/fixtures/touch-grass --agent ios-tester --dry-run
```

## Commands

```bash
awesome-agents add <source> [options]
awesome-agents install <source> [options]   # alias for add
awesome-agents use <source[@profile]> [options]
awesome-agents list [options]
awesome-agents remove <profile...> [options]
awesome-agents update [profile...] [options]
awesome-agents init [name]
```

Useful install options:

- `--agent <slug>` to select an agent profile, for example `--agent ios-tester`
- `--profile <slug>` or `--skill <slug>` as explicit profile aliases; `--skill`
  is command-shape compatibility and does not mean the artifact is a skill
- `--harness codex|claude-code|opencode|*` to select target harnesses
- `--all` to install all profiles to all supported harnesses
- `--dry-run` to preview writes
- `--project` for project-level install where supported; Codex profiles install globally
- `--global` for user-level install
- `--list` to inspect available source profiles without installing

Human-readable output uses subtle ANSI color. Set `NO_COLOR=1` to disable color,
or pass `--json` for machine-readable output. After an install, the CLI also
prints run commands for target harness CLIs it finds on `PATH`, such as
`codex --profile <profile>` or `claude --agent <profile>`.

## Harness Targets

Project installs write to:

- Codex: not supported; Codex profiles load from user config
- Claude Code: `.claude/agents/<profile>.md`
- OpenCode: `.opencode/agents/<profile>.md`

Global installs write to:

- Codex: `$CODEX_HOME/<profile>.config.toml`, or `~/.codex/<profile>.config.toml`
- Claude Code: `$CLAUDE_HOME/agents/<profile>.md`, or `~/.claude/agents/<profile>.md`
- OpenCode: `$OPENCODE_CONFIG_DIR/agents/<profile>.md`, or `~/.config/opencode/agents/<profile>.md`

The CLI keeps its own registry at `.awesome-agents/installed.json` for project
installs or `~/.awesome-agents/installed.json` for global installs. `list`,
`remove`, and `update` use this registry and refuse to overwrite or delete files
that do not contain the generated marker unless `--force` is passed.

Run Codex profiles with:

```bash
codex --profile <profile>
```

Codex expects a plain profile name. It does not accept a path passed to
`--profile`.

## Source Format

An agent-profile source should look like:

```text
agents/
  profiles/
    ios-tester.md
  adapters/
    codex/
      ios-tester.md
```

Profile files are Markdown with YAML frontmatter. Adapters are optional and can
provide harness-specific metadata such as model and reasoning effort.

## Examples

```bash
npx awesome-agents add owner/repo --list
npx awesome-agents add owner/repo --agent triage-agent
npx awesome-agents add owner/repo --agent triage-agent --harness codex --global
npx awesome-agents add owner/repo --all --dry-run
npx awesome-agents use owner/repo --agent triage-agent --harness claude-code
npx awesome-agents list --json
npx awesome-agents remove ios-tester --agent codex
npx awesome-agents update ios-tester --agent codex --dry-run
```

## Release Workflow

Changes are tracked in `CHANGELOG.md` from git commit history.

```bash
npm run changelog
npm run release:dry-run -- patch
npm run release -- patch
npm run release -- minor --push
```

`npm run release` bumps `package.json`, `package-lock.json`, and
`src/constants.js`, refreshes `CHANGELOG.md`, runs lint/tests, commits
`Release vX.Y.Z`, and creates an annotated tag. Passing `--push` pushes the
branch and tag. It does not publish to npm.

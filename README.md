# awesome-agents

`awesome-agents` is an `npx`-compatible installer for reusable agent profiles.
It mirrors the useful parts of `npx skills`, but the unit is an operational
agent profile instead of a skill.

Supported sources are GitHub repos, Git URLs, or local checkouts that use the
`touch-grass` layout. Profiles are read from `agents/profiles/*.md`, adapted for
the selected harness, and installed into the right place for Codex, Claude Code,
or OpenCode.

## Install And Run

Use the CLI with `npx`:

```bash
npx awesome-agents add pablof7z/touch-grass --agent ios-tester
npx awesome-agents add pablof7z/touch-grass --agent chief-of-staff
npx awesome-agents add pablof7z/touch-grass --agent ios-tester --harness opencode
```

From this repo during development:

```bash
npm install
npm test
node ./bin/awesome-agents.js add pablof7z/touch-grass --agent ios-tester --dry-run
```

## Commands

```bash
awesome-agents add [source] [options]
awesome-agents install [source] [options]   # alias for add
awesome-agents use <source@profile> [options]
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
- `--project` for project-level install, the default
- `--global` for user-level install
- `--list` to inspect available source profiles without installing

## Harness Targets

Project installs write to:

- Codex: `.codex/agents/<profile>.toml`
- Claude Code: `.claude/agents/<profile>.md`
- OpenCode: `.opencode/agents/<profile>.md`

Global installs write to:

- Codex: `$CODEX_HOME/agents/<profile>.toml`, or `~/.codex/agents/<profile>.toml`
- Claude Code: `$CLAUDE_HOME/agents/<profile>.md`, or `~/.claude/agents/<profile>.md`
- OpenCode: `$OPENCODE_CONFIG_DIR/agents/<profile>.md`, or `~/.config/opencode/agents/<profile>.md`

The CLI keeps its own registry at `.awesome-agents/installed.json` for project
installs or `~/.awesome-agents/installed.json` for global installs. `list`,
`remove`, and `update` use this registry and refuse to overwrite or delete files
that do not contain the generated marker unless `--force` is passed.

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
npx awesome-agents add pablof7z/touch-grass --list
npx awesome-agents add pablof7z/touch-grass --agent ios-tester
npx awesome-agents add pablof7z/touch-grass --agent chief-of-staff
npx awesome-agents add pablof7z/touch-grass --agent ios-tester --harness codex --global
npx awesome-agents add pablof7z/touch-grass --all --dry-run
npx awesome-agents use pablof7z/touch-grass --agent ios-ux-ui-critic --harness claude-code
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

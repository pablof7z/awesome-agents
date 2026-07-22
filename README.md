# awesome-agents

`awesome-agents` is an `npx`-compatible installer for reusable agent profiles.
It mirrors the useful parts of `npx skills`, but the unit is an operational
agent profile instead of a skill.

Supported sources are GitHub repos, Git URLs, or local checkouts that use the
agent-profile source layout. Profiles are read from YAML or Markdown files under
`agents/<slug>/`, adapted for the selected harness, and installed into the
right place for Codex, Claude Code, OpenCode, Goose, or Hermes.

## Install And Run

Use the CLI with `npx`:

```bash
npx awesome-agents add owner/repo --agent triage-agent
npx awesome-agents add owner/repo --agent triage-agent --harness hermes
```

From this repo during development:

```bash
npm install
npm test
node ./bin/awesome-agents.js add ./test/fixtures/profile-source --agent triage-agent --dry-run
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

- `--agent <slug>` to select an agent profile, for example `--agent triage-agent`
- `--profile <slug>` or `--skill <slug>` as explicit profile aliases; `--skill`
  is command-shape compatibility and does not mean the artifact is a skill
- omit a profile selector in an interactive terminal to choose source profiles
  from a checkbox list; every profile is selected by default
- `--yes` to accept detected profile and harness selections without opening selectors
- `--harness codex|claude-code|opencode|goose|hermes|*` to select target harnesses;
  without it, the CLI detects harness CLIs on `PATH`; interactive multi-detect
  opens a checkbox selector with every detected harness selected, and
  noninteractive installs use every detected harness. If none are detected, pass
  `--harness`.
- `--all` to install all profiles to all supported harnesses
- `--dry-run` to preview writes
- `--project` for project-level install where supported; Codex and Hermes install globally
- `--global` for user-level install
- `--list` to inspect available source profiles without installing

Human-readable output uses subtle ANSI color. Set `NO_COLOR=1` to disable color,
or pass `--json` for machine-readable output. After an install, the CLI groups
run commands by profile for target harness CLIs it finds on `PATH`, such as
`codex --profile <profile>`, `claude --agent <profile>`, `goose session` then
`@<profile>`, or `hermes -p <profile> chat`.

## Harness Targets

Project installs write to:

- Codex: not supported; Codex profiles load from user config
- Claude Code: `.claude/agents/<profile>.md`
- OpenCode: `.opencode/agents/<profile>.md`
- Goose: `.agents/agents/<profile>.md`
- Hermes: not supported; Hermes named profiles are machine-local

Global installs write to:

- Codex: `$CODEX_HOME/<profile>.config.toml`, or `~/.codex/<profile>.config.toml`
- Claude Code: `$CLAUDE_HOME/agents/<profile>.md`, or `~/.claude/agents/<profile>.md`
- OpenCode: `$OPENCODE_CONFIG_DIR/agents/<profile>.md`, or `~/.config/opencode/agents/<profile>.md`
- Goose: `$GOOSE_HOME/agents/<profile>.md`, or `~/.agents/agents/<profile>.md`
- Hermes: `$HERMES_HOME/profiles/<profile>/SOUL.md`, or `~/.hermes/profiles/<profile>/SOUL.md`

The CLI keeps its own registry at `.awesome-agents/installed.json` for project
installs or `~/.awesome-agents/installed.json` for global installs. `list`,
`remove`, and `update` use this registry and refuse to overwrite or delete files
that do not contain the generated marker unless `--force` is passed.

Agent-owned references and scripts are installed under
`~/.agents/homes/<profile>/`. Every installed harness profile receives the exact
agent-home and support-root paths in its operating context, so profile instructions
can refer to bundled resources by relative path without becoming harness-specific.

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
  triage-agent/
    agent.yaml
  ops-agent/
    agent.agf.yaml
    skills/
      gh-pages-publisher/
        SKILL.md
    scripts/
      heartbeat.sh
    references/
      runbook.md
```

YAML profile files are preferred. The loader also accepts Markdown files with
YAML frontmatter for compatibility with tools that use `.agent.md`-style
profiles. Agent-owned `scripts/` and `references/` are installed into
`~/.agents/homes/<slug>/scripts` and `~/.agents/homes/<slug>/references`.
Profiles may also declare immediately relevant skills:

```yaml
skills:
  - gh-pages-publisher
  - owner/agent-skills release-checklist
```

Bare skill names are resolved from the profile directory, then the source
checkout, then `~/.agents/skills`. Source-qualified entries use the same source
plus skill selector shape as `npx skills add <source> --skill <skill>`.
Declared skills are copied into `~/.agents/homes/<slug>/skills/<skill>` and
listed with complete paths in the installed agent prompt.

## Examples

```bash
npx awesome-agents add owner/repo --list
npx awesome-agents add owner/repo --agent triage-agent
npx awesome-agents add owner/repo --agent triage-agent --harness codex --global
npx awesome-agents add owner/repo --agent triage-agent --harness hermes
npx awesome-agents add owner/repo --all --dry-run
npx awesome-agents use owner/repo --agent triage-agent --harness claude-code
npx awesome-agents list --json
npx awesome-agents remove triage-agent --agent codex
npx awesome-agents update triage-agent --agent codex --dry-run
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

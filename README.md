# awesome-agents

`awesome-agents` is an `npx`-compatible installer for reusable agent profiles.
It mirrors the useful parts of `npx skills`, but the unit is an operational
agent profile instead of a skill.

The first supported source is `touch-grass`: local at `/Users/customer/touch-grass`
or remote as `pablof7z/touch-grass`. Profiles are read from
`agents/profiles/*.md`, adapted for the selected harness, and installed into the
right place for Codex, Claude Code, or OpenCode.

## Install And Run

From this repo:

```bash
npm install
npm test
node ./bin/awesome-agents.js add /Users/customer/touch-grass --agent codex --profile ios-tester --dry-run
```

Once published, the intended entrypoint is:

```bash
npx awesome-agents add pablof7z/touch-grass --agent codex --profile ios-tester
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

- `--agent codex|claude-code|opencode|*`
- `--profile <slug>` or `--profile '*'`
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
awesome-agents add /Users/customer/touch-grass --list
awesome-agents add /Users/customer/touch-grass --agent codex --profile ios-tester
awesome-agents add /Users/customer/touch-grass --agent codex --profile ios-tester --global
awesome-agents add pablof7z/touch-grass --all --dry-run
awesome-agents use pablof7z/touch-grass@ios-ux-ui-critic --agent claude-code
awesome-agents list --json
awesome-agents remove ios-tester --agent codex
awesome-agents update ios-tester --agent codex --dry-run
```

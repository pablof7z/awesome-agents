# Harness Targets

These notes capture how `awesome-agents` targets agent harnesses.

## Initial Harnesses

Initial harness targets:

- Codex
- Claude Code
- OpenCode

## Codex

Generated Codex custom agents install to:

- Project: `.codex/agents/<profile>.toml`
- Global: `$CODEX_HOME/agents/<profile>.toml`, or `~/.codex/agents/<profile>.toml`

The generated TOML includes:

- `name`
- `description`
- optional model settings
- `developer_instructions`

Open question:

- Whether future versions should also generate Codex `--profile` config layers in addition to Codex custom agents.

## Claude Code

Generated Claude Code subagents install to:

- Project: `.claude/agents/<profile>.md`
- Global: `$CLAUDE_HOME/agents/<profile>.md`, or `~/.claude/agents/<profile>.md`

Claude Code output is Markdown with frontmatter and a generated marker.

## OpenCode

Generated OpenCode agents install to:

- Project: `.opencode/agents/<profile>.md`
- Global: `$OPENCODE_CONFIG_DIR/agents/<profile>.md`, or `~/.config/opencode/agents/<profile>.md`

OpenCode output is Markdown with frontmatter and a generated marker.

## Adapter Gaps

Current `touch-grass` profiles have Codex adapters. Claude Code and OpenCode currently use generated defaults unless source repositories add native adapters for those harnesses.

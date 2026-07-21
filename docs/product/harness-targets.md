# Harness Targets

These notes capture how `awesome-agents` targets agent harnesses.

## Initial Harnesses

Initial harness targets:

- Codex
- Claude Code
- OpenCode
- Goose

## Codex

Generated Codex profiles install to:

- Project: not supported; Codex profiles load from user config
- Global: `$CODEX_HOME/<profile>.config.toml`, or `~/.codex/<profile>.config.toml`

Run with:

```bash
codex --profile <profile>
```

Codex profiles are not project-local in the same way Claude Code and OpenCode
agents are. `--profile` expects a plain name and layers the corresponding config
file from `CODEX_HOME`.

The generated TOML includes:

- optional model settings
- `developer_instructions`

Profile name and summary are emitted as comments, not TOML keys, because Codex
rejects unknown configuration fields under strict config parsing.

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

## Goose

Generated Goose custom agents install to:

- Project: `.agents/agents/<profile>.md`
- Global: `$GOOSE_HOME/agents/<profile>.md`, or `~/.agents/agents/<profile>.md`

Run with:

```bash
goose session
```

Then invoke the agent by name in the chat session:

```
@<profile>
```

Goose output is Markdown with YAML frontmatter (`name`, `description`, optional
`model`) and a generated marker. The agent body reuses the Claude Code adapter
when a Goose-specific adapter is not present.

## Adapter Gaps

Some source repositories may provide Codex adapters first. Claude Code and
OpenCode use generated defaults unless a source repository adds native adapters
for those harnesses. Goose reuses the Claude Code adapter when no Goose-specific
adapter is present.

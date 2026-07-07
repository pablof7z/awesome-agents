# Harness Targets

These notes capture how `awesome-agents` targets agent harnesses.

## Initial Harnesses

Initial harness targets:

- Codex
- Claude Code
- OpenCode
- tenex-edge

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

## tenex-edge

Generated tenex-edge agents install to:

- Project: not supported; tenex-edge agents are machine-local
- Global: `$TENEX_EDGE_HOME/agents/<profile>.json`, or `~/.tenex-edge/agents/<profile>.json`

Run with:

```bash
tenex-edge launch <profile>
```

The generated JSON is a tenex-edge local agent keystore entry with:

- a generated Nostr keypair, preserved across reinstalls
- `commands` entries with launch argv that load the installed profile, such as
  `codex --profile <profile>` or `claude --agent <profile>`
- an inline Claude `agent` definition passed by tenex-edge as `--agents` for
  the generated fallback command when no Claude Code profile command is present
- a byline derived from the profile summary

## Adapter Gaps

Some source repositories may provide Codex adapters first. Claude Code and
OpenCode use generated defaults unless a source repository adds native adapters
for those harnesses. tenex-edge uses a native adapter when present, otherwise it
reuses the Claude Code adapter before falling back to the base profile.

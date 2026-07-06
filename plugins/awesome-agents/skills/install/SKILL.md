---
description: Install an agent profile into Claude Code from an awesome-agents source. Use when the user wants to add, install, or set up a specific agent profile (a subagent) by slug.
---

# Install an agent profile

Install a profile as a Claude Code subagent under `.claude/agents/`.

## Gather inputs

From `$ARGUMENTS` and the conversation, determine:

- **source** — local path, GitHub `owner/repo`, or git URL. Default to
  `pablof7z/awesome-agents` if the user didn't name one.
- **slug** — the agent profile to install (e.g. `code-reviewer`). If the user
  isn't sure which one, run `/awesome-agents:browse` first.

## Run

Default to a **project** install so the profile lands in this repo's
`.claude/agents/` and is committed alongside the code:

```bash
npx -y awesome-agents add "<source>" --agent "<slug>" --harness claude-code --project --json
```

Use `--global` instead of `--project` only if the user wants the agent available
across all their projects (writes to `~/.claude/agents/`).

Preview first with `--dry-run` if the user asks to see what would happen.

## After installing

The command prints an `operations` array with the written `target` path. Confirm:

- The subagent is now available — Claude Code loads `.claude/agents/*.md` files,
  so it can be invoked by its slug (a new session picks it up reliably).
- Point them at `/awesome-agents:installed` to review everything installed, and
  `/awesome-agents:remove` to undo.

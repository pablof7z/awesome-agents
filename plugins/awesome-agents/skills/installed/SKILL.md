---
description: List the agent profiles installed by awesome-agents in this project or globally. Use when the user asks what agent profiles are installed, added, or currently available.
---

# List installed agent profiles

Show what awesome-agents has installed, read from its registry.

## Run

```bash
npx -y awesome-agents list --json
```

Add `--global` to list user-level installs (`~/.claude/agents/`), or `--project`
for this repo's installs. Default to project scope; if it reports nothing, also
check `--global` before telling the user nothing is installed.

## Present the results

The command prints `{ "scope", "installs": [ { "profile", "harness", "target",
"exists" } ], "registryPath" }`.

List each install as **profile** → **harness** at **target**. Flag any entry
where `exists` is `false` as "missing target" (the file was removed outside the
registry). Mention `/awesome-agents:update` to refresh and `/awesome-agents:remove`
to uninstall.

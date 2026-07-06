---
description: Browse the agent profiles available in an awesome-agents source (a GitHub owner/repo, git URL, or local path). Use when the user wants to discover, list, or explore installable agent profiles before installing one.
---

# Browse available agent profiles

The user wants to see which agent profiles a source offers.

## Resolve the source

`$ARGUMENTS` is the source: a local path, a GitHub `owner/repo` shorthand, or a git URL.

If the user did **not** name a source, the flagship directory is
`pablof7z/awesome-agents` — offer it as the default and proceed with it unless
they name another.

## Run

```bash
npx -y awesome-agents add "<source>" --list --json
```

## Present the results

The command prints `{ "profiles": [ { "slug", "name", "summary" }, ... ] }`.

Show them as a compact table — **slug**, **name**, **summary** — sorted as
returned. Then offer to install one with the `/awesome-agents:install` skill,
e.g. "Want me to install `code-reviewer` into this project?"

If `profiles` is empty, say so and double-check the source spelling with the user.

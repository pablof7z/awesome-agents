---
description: Remove installed agent profiles. Use when the user wants to remove, uninstall, or delete an agent profile added by awesome-agents.
---

# Remove installed agent profiles

Uninstall profiles and drop them from the awesome-agents registry.

## Run

`$ARGUMENTS` names the profile slugs to remove. Confirm the slug(s) with the
user first if there's any ambiguity — this deletes files.

```bash
npx -y awesome-agents remove $ARGUMENTS --json
```

Use `--all` to remove every matching install, `--global` / `--project` to pick
scope (default project), and `--dry-run` to preview deletions. awesome-agents
refuses to delete files that lack its generated marker unless `--force` is
passed — do not add `--force` without explicit user confirmation, since it can
delete hand-edited files.

## Present the results

The command prints an `operations` array of what was removed. Confirm the
deletions and their former target paths.

---
description: Update installed agent profiles from their original sources. Use when the user wants to update, upgrade, or refresh agent profiles to the latest version.
---

# Update installed agent profiles

Reinstall profiles from the sources recorded in the awesome-agents registry.

## Run

`$ARGUMENTS` may name specific profile slugs to update. With no slugs, all
installed profiles are updated.

```bash
npx -y awesome-agents update $ARGUMENTS --json
```

Add `--global` or `--project` to pick the scope (default project). Suggest
`--dry-run` first if the user wants to preview what would change.

## Present the results

The command prints an `operations` array. Report which profiles were updated (or
would be, under `--dry-run`) and their target paths. Note that updates only
touch files that still carry the generated marker; anything hand-edited is left
alone unless `--force` is passed.

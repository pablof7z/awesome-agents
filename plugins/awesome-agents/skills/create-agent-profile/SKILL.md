---
name: create-agent-profile
description: Create, scaffold, or revise portable agent profiles in source repositories for installation with npx awesome-agents. Use when Codex needs to add an agents/SLUG/agent.yaml definition, attach agent-owned skills/scripts/references, convert an existing agent prompt into the canonical repository layout, or validate that a profile can be discovered and rendered for supported harnesses.
---

# Create an awesome-agents profile

Create a repo-neutral operational agent profile that `npx awesome-agents` can
discover, render, and install. Treat the profile as reusable product content,
not as local harness configuration.

## Ground the work

1. Find the repository root and read its local instructions.
2. Inspect existing `agents/` profiles and repository conventions before adding
   a new one.
3. Derive a lowercase hyphen-case slug from the requested role. Ask only when
   the mission, boundaries, or intended consumers remain materially ambiguous.
4. Read [references/profile-format.md](references/profile-format.md) before
   editing a profile or adding support material.

## Scaffold the canonical layout

Run the official initializer from the repository root:

```bash
npx -y awesome-agents init "<slug>" --json
```

Do not pass `--force` over an existing profile unless the user explicitly wants
it replaced. If the initializer is unavailable, create the same canonical
layout manually from the reference and report why the initializer could not be
used.

Keep the primary definition at `agents/<slug>/agent.yaml`. Prefer this format
over accepted compatibility formats for new profiles.

## Author the profile

- Keep `id` identical to the directory slug.
- Write a specific `description` that says what work the profile owns and when
  someone should choose it.
- Default `model` to `inherit`; set a concrete model only for a demonstrated
  capability requirement.
- Choose `reasoning_effort` deliberately; keep `medium` when no stronger reason
  exists.
- Write `instructions` as an operational contract: mission, boundaries,
  workflow, resource/tool use, escalation conditions, and reporting style.
- Keep machine-local paths, repository checkout paths, credentials, and harness
  install locations out of the source definition.
- Add `scripts/`, `references/`, or declared `skills` only when the agent needs
  them at runtime. Verify every declared skill resolves from the profile, the
  source repository, or an explicit source declaration. Do not make a portable
  profile depend on a skill that exists only in the author's user skill store.
- Add `agents/<slug>/README.md` only when the user wants a public model card.
  Never use it as a substitute for runtime instructions in `agent.yaml`.

Preserve unrelated files and existing profiles. Never write generated harness
artifacts such as `.claude/agents/*.md` or Codex profile TOML into the source
profile directory.

## Validate the install path

From the repository root, prove discovery first:

```bash
npx -y awesome-agents add . --list --json
```

Confirm that the returned profile has the expected slug, name, and summary.
Then exercise dependency resolution and every renderer without installing:

```bash
validation_home="$(mktemp -d)"
trap 'rm -rf "$validation_home"' EXIT
npx -y awesome-agents add . \
  --agent "<slug>" \
  --harness '*' \
  --global \
  --dry-run \
  --home "$validation_home" \
  --json
```

Treat warnings about missing declared skills as validation failures. Inspect
the JSON operations and confirm that all requested harnesses render the same
profile identity. Use an empty temporary home so a machine-local skill cannot
mask a missing repository dependency. Remove it after validation. Do not
perform a real global or project install unless the user asks for it.

Run the repository's own lint and test commands when the profile lives in a
repository that defines them and the change is intended for that repository.

## Report the result

Name the created or changed files, summarize the profile's operating contract,
and report the exact discovery and dry-run checks performed. End with a
portable install example when the repository has a remote source:

```bash
npx awesome-agents add <owner>/<repo> --agent <slug>
```

Never invent a source name or claim installation success from a dry run.

# awesome-agents profile format

Use this reference when creating or revising a source profile for
`npx awesome-agents`.

## Canonical repository layout

```text
agents/
  <slug>/
    agent.yaml
    README.md        # optional public model card
    skills/          # optional profile-local skills
      <skill>/
        SKILL.md
    scripts/         # optional runtime support files
    references/      # optional runtime reference files
```

Keep source definitions under `agents/`, not harness configuration directories.
At install time, agent-owned scripts, references, and resolved skills are copied
under `~/.agents/homes/<slug>/`; generated harness files are written elsewhere.

## Preferred YAML definition

```yaml
schema: awesome-agents/v1
id: incident-coordinator
name: Incident Coordinator
description: Coordinates active incidents, maintains the operating picture, and drives concise handoffs.
model: inherit
reasoning_effort: medium
home_notes_template: "~/.agents/homes/incident-coordinator/<project>/notes"
instructions: |
  You are the incident-coordinator profile.

  Own the incident timeline, current hypotheses, assigned actions, and unresolved
  risks. Preserve operator decisions, distinguish evidence from inference, and
  escalate only when a human decision or new authority is required.
```

Use these fields for new canonical definitions:

| Field | Requirement | Meaning |
| --- | --- | --- |
| `schema` | Required by convention | Set to `awesome-agents/v1`. |
| `id` | Required | Use the same lowercase hyphen-case value as `<slug>`. |
| `name` | Required | Provide the human-facing role name. |
| `description` | Required | Explain ownership and selection criteria in one concise sentence. |
| `model` | Recommended | Use `inherit` unless the role requires a specific model. |
| `reasoning_effort` | Recommended | Use a supported harness value such as `low`, `medium`, `high`, or `xhigh`. |
| `home_notes_template` | Optional | Describe durable runtime notes without embedding a checkout-specific path. |
| `skills` | Optional | Declare immediately relevant skills that must accompany the installed profile. |
| `instructions` | Required | Define the reusable operating contract as a YAML block scalar. |

The loader preserves extra metadata, but do not add speculative fields that no
consumer uses.

## Instruction contract

Cover only role-defining behavior:

- mission and definition of done;
- owned decisions and explicit boundaries;
- normal workflow and evidence expectations;
- how to use bundled scripts, references, and declared skills;
- when to ask, escalate, pause, or hand off;
- output and reporting style.

Do not repeat generic model capabilities. Do not encode a particular source
repository, absolute checkout path, secret, user identity, or generated harness
path. Keep project-specific policy in the consuming repository unless it is
intrinsic to this reusable role.

## Support material

Put executable runtime helpers in `agents/<slug>/scripts/` and durable domain
guidance in `agents/<slug>/references/`. Keep only files the profile actually
uses, and mention them by purpose in the instructions.

Declare skills with a YAML list:

```yaml
skills:
  - local-skill
  - owner/repository remote-skill
```

A bare skill name resolves in this order:

1. the profile directory;
2. the source repository;
3. `~/.agents/skills`.

The user skill store is a local fallback, not a portable repository dependency.
Bundle a required skill with the profile/source or declare its source explicitly
when other users must be able to install the profile on a clean machine.

A source-qualified entry uses the same source plus selector shape as
`npx skills add <source> --skill <skill>`. Keep profile-local skills at
`agents/<slug>/skills/<skill>/SKILL.md`; repository-wide skills may live in a
supported skill container such as `skills/<skill>/SKILL.md`.

## Accepted compatibility formats

The CLI also accepts:

- `agent.yml`;
- `agent.agf.yaml` or `agent.agf.yml` using Agent Format-style `metadata` and
  `execution_policy.config` fields;
- `agent.md` with YAML frontmatter and Markdown instructions.

Use these only when preserving or importing an existing ecosystem format.
Prefer `agent.yaml` for a new profile.

## Optional model card

Use `agents/<slug>/README.md` for public, human-facing material such as examples,
limitations, operating notes, or changelog context. The README is optional and
is not installed as the agent's prompt. Keep the runtime contract in
`agent.yaml`.

## Validation checklist

- Confirm the repository contains `agents/<slug>/agent.yaml`.
- Confirm directory slug, `id`, and install selector match exactly.
- Parse and list the source with `npx awesome-agents add . --list --json`.
- Confirm the intended slug, name, and description appear in the catalog.
- Dry-run all harness renderers with an explicit profile selector.
- Treat missing-skill warnings, duplicate slugs, parse errors, or an absent
  profile in catalog JSON as failures.
- Never use a real user agent directory for validation; use `--dry-run` unless
  the user explicitly requests installation.

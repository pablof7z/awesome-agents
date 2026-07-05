# Profile Source Format

These notes capture how profile source repositories are organized.

## Canonical Layout

The source format is intentionally repo-neutral:

```text
agents/
  profiles/
    <profile>.agent.yaml
    <profile>.agf.yaml
    <profile>.md
  adapters/
    <harness>/
      <profile>.md
```

Canonical profiles live at:

```text
agents/profiles/*.{agent.yaml,agent.yml,agf.yaml,agf.yml,yaml,yml,agent.md,md}
```

Optional harness adapters live at:

```text
agents/adapters/<harness>/*
```

## Profile Files

YAML profile files are preferred. The loader should support a pragmatic subset
of emerging YAML agent-definition shapes:

- simple profile YAML with `id`, `name`, `description`, `model`, and
  `instructions`;
- Agent Format-style YAML with `metadata` and `execution_policy.config`;
- Markdown files with YAML frontmatter for compatibility with `.agent.md`
  ecosystems.

The CLI should preserve canonical profile content and generate harness-specific install files. A profile is reusable product content, not local machine setup.

Adapters are optional. A profile should be useful without a harness adapter; an
adapter is only an override for harness-specific metadata or instructions.

Profile source files are intentionally under `agents/`, not `skills/`, because
the source format models agent profiles separately from loadable skills.

## Source Resolution

The CLI should support:

- Local paths such as `/path/to/agent-profiles`.
- GitHub shorthand such as `owner/repo`.
- GitHub URLs.

The package must not hard-code any source repository. `add`, `install`, and
`use` require an explicit source from the caller.

## Registry Or Search

No registry or search command exists yet. This is an open product area, not part of the initial scaffold.

# Profile Source Format

These notes capture how profile source repositories are organized.

## Canonical Layout

The source format is intentionally repo-neutral:

```text
agents/
  <profile>/
    agent.yaml
    scripts/
    references/
```

Canonical profiles live at:

```text
agents/<profile>/{agent.yaml,agent.yml,agent.agf.yaml,agent.agf.yml,agent.md}
```

Optional agent-owned support material lives at:

```text
agents/<profile>/scripts/*
agents/<profile>/references/*
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

Agent-owned scripts and references should be installed into
`~/.agents/homes/<profile>/scripts` and
`~/.agents/homes/<profile>/references`.

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

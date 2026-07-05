# Profile Source Format

These notes capture how profile source repositories are organized.

## Canonical Layout

The source format is intentionally repo-neutral:

```text
agents/
  profiles/
    <profile>.md
  adapters/
    <harness>/
      <profile>.md
```

Canonical profiles live at:

```text
agents/profiles/*.md
```

Harness adapters live at:

```text
agents/adapters/<harness>/*.md
```

## Profile Files

Profile files are Markdown with YAML frontmatter.

The CLI should preserve canonical profile content and generate harness-specific install files. A profile is reusable product content, not local machine setup.

Fixture profiles used by tests include:

- `chief-of-staff`
- `ios-tester`
- `ios-ux-ui-critic`

The `chief-of-staff` source files are intentionally under `agents/`, not
`skills/`, because the source format models agent profiles separately from
loadable skills.

## Source Resolution

The CLI should support:

- Local paths such as `/path/to/agent-profiles`.
- GitHub shorthand such as `owner/repo`.
- GitHub URLs.

The package must not hard-code any source repository. `add`, `install`, and
`use` require an explicit source from the caller.

## Registry Or Search

No registry or search command exists yet. This is an open product area, not part of the initial scaffold.

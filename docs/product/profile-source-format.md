# Profile Source Format

These notes capture how profile source repositories are organized.

## Canonical Layout

The initial source format follows the `touch-grass` layout:

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

Current `touch-grass` profiles include:

- `ios-tester`
- `ios-ux-ui-critic`

## Source Resolution

The CLI should support:

- Local paths such as `/Users/customer/touch-grass`.
- GitHub shorthand such as `pablof7z/touch-grass`.
- GitHub URLs.

The first source repository is `touch-grass`, but the format should not be hard-coded only to that repository.

## Registry Or Search

No registry or search command exists yet. This is an open product area, not part of the initial scaffold.

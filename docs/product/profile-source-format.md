# Profile Source Format

These notes capture how profile source repositories are organized.

## Canonical Layout

The source format is intentionally repo-neutral:

```text
agents/
  <profile>/
    agent.yaml
    README.md  # optional site model-card body
    skills/
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

Optional site-facing documentation lives at:

```text
agents/<profile>/README.md
```

This README is intended for the public model-card page on
`awesome-agents.com/<handle>/<repo>/<profile>`. It complements the runtime
profile definition; it should not be treated as the installable prompt. It is
not required for a valid source profile.

Immediately relevant skills can be declared in the profile definition:

```yaml
skills:
  - gh-pages-publisher
  - owner/agent-skills release-checklist
```

Bare skill names resolve from the profile directory, then the source checkout,
then from `~/.agents/skills`. Source-qualified entries use the same source plus
skill selector shape as `npx skills add <source> --skill <skill>`. Installed
skills are copied into `~/.agents/homes/<profile>/skills/<skill>` and appended
to the rendered agent prompt with complete paths.

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
Declared skills should be installed into
`~/.agents/homes/<profile>/skills/<skill>`.
Installed harness profiles receive the exact agent-home, references, and scripts
paths in their operating context. Source instructions should refer to these resources
by relative path instead of embedding a harness-specific or checkout-specific path.

Profile source files are intentionally under `agents/`, not `skills/`, because
the source format models agent profiles separately from loadable skills.

## Bash Guard

An orchestrate-only profile can opt into a default-deny Bash policy. For Claude
Code this renders as a `PreToolUse` hook in the installed profile:

```yaml
bash_guard:
  self_management_roots:
    - "~/.agents/homes/chief-of-staff"
  allow:
    - "gh pr view"
    - "gh pr list"
```

Outside the carve-outs, a command is allowed only when every part's leading
token is in `allow` or is one of the harness's already-free read-only utilities;
`git` is left to the harness's own read/write classification. Two things carve
out of the default-deny:

- **cwd** under a `self_management_roots` entry — the profile working on its own
  tracking repo or workflow memory is unrestricted.
- **The invoked script** resolving under a script root: the entries in
  `self_management_roots` plus the profile's installed agent home, which is
  where `resources:` scripts and declared skills land. A profile therefore never
  has to pin its own scripts into `allow`, and a session started in a project
  directory can still run them.

The script root is matched against the resolved path of the script actually
being run — the leading token, or a known interpreter's script argument. A path
that merely appears as some other argument does not make a command safe, and a
relative path resolves against the session's cwd, so instructions should point
at agent-owned scripts through the agent-home paths the rendered profile
provides.

## Source Resolution

The CLI should support:

- Local paths such as `/path/to/agent-profiles`.
- GitHub shorthand such as `owner/repo`.
- GitHub URLs.

The package must not hard-code any source repository. `add`, `install`, and
`use` require an explicit source from the caller.

## Registry Or Search

No registry or search command exists yet. This is an open product area, not part of the initial scaffold.

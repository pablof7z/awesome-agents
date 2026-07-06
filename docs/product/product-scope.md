# Product Scope

These notes capture what `awesome-agents` is and why it exists.

## Core Direction

- The package is named `awesome-agents`.
- It should be installable with `npx`.
- Its command structure should mirror `npx skills`, but for agent profiles.
- It should install profiles from any explicit source repository that follows
  the `agents/<slug>/agent.yaml` source layout.
- Harness targets are Codex, Claude Code, OpenCode, and tenex-edge.
- The package should be published after the scaffold works.

## Product Boundary

The user asked whether there is something like `npx skills` for agent profiles. The answer was effectively no: skills and profiles are adjacent but different layers.

Product distinction:

- `npx skills` installs reusable task workflows and instructions.
- `awesome-agents` installs reusable operational agent identities.
- A profile can define prompt, model preference, tool boundaries, notes, coordination style, and harness-specific configuration.
- Installed profiles should preserve explicit self-identity. A running
  profile should know its installed slug and role.

The CLI should not pretend profiles are skills. It can mirror `npx skills` command shape where that helps user memory, but the artifact remains an agent profile.

## Source Independence

`awesome-agents` is independent of any particular profile repository. It should
not know about or default to one source. Users must name the local path, GitHub
shorthand, or Git URL they want to install from.

Product correction:

- Do not intertwine source-repository concepts into the `awesome-agents`
  codebase.
- Source repositories provide profile artifacts; `awesome-agents` understands
  the artifact shape and target harnesses.
- Examples and tests should use neutral source names unless they are testing
  source resolution itself.
- Source repositories should use one agent definition format per agent directory:
  `agents/<slug>/agent.yaml` plus colocated support material.
- `awesome-agents` installs local support material and declared immediately
  relevant skills into `~/.agents/homes/<slug>/` and transcribes the agent
  definition to the target harness.

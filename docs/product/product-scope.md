# Product Scope

These notes capture what `awesome-agents` is and why it exists.

## Core Direction

- The package is named `awesome-agents`.
- It should be installable with `npx`.
- Its command structure should mirror `npx skills`, but for agent profiles.
- It should install profiles from `touch-grass`, both local `/Users/customer/touch-grass` and GitHub `pablof7z/touch-grass`.
- Initial harness targets are Codex, Claude Code, and OpenCode.
- The package should be published after the scaffold works.

## Product Boundary

The user asked whether there is something like `npx skills` for agent profiles. The answer was effectively no: skills and profiles are adjacent but different layers.

Product distinction:

- `npx skills` installs reusable task workflows and instructions.
- `awesome-agents` installs reusable operational agent identities.
- A profile can define prompt, model preference, tool boundaries, notes, coordination style, and harness-specific configuration.

The CLI should not pretend profiles are skills. It can mirror `npx skills` command shape where that helps user memory, but the artifact remains an agent profile.

## First Source

The first real source repository is `touch-grass`, which currently carries reusable operational agent profiles such as:

- `ios-tester`
- `ios-ux-ui-critic`
- `chief-of-staff`

`awesome-agents` should install those profiles without requiring the user to copy profile files manually.

The `chief-of-staff` profile is an explicit category-boundary example: it is an
operational agent identity, not a skill.

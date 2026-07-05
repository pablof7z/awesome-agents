# Awesome Agents Flow Notes

These are factual notes from the implementation request and current scaffold.

## Core Direction

- The package is named `awesome-agents`.
- It should be installable with `npx`.
- Its command structure should mirror `npx skills`, but for agent profiles.
- It should install profiles from `touch-grass`, both local
  `/Users/customer/touch-grass` and GitHub `pablof7z/touch-grass`.
- Initial harness targets are Codex, Claude Code, and OpenCode.
- The package should be published after the scaffold works.

## Source Model

- Canonical profiles live at `agents/profiles/*.md`.
- Harness adapters live at `agents/adapters/<harness>/*.md`.
- Current touch-grass profiles include `ios-tester` and `ios-ux-ui-critic`.
- The CLI should preserve canonical profile content and generate harness-specific
  install files.

## Command Model

- `add` is the primary install command because `npx skills` uses `add`.
- `install` is an alias because the user explicitly requested an install command.
- `use` renders one profile without installing it.
- `list`, `remove`, and `update` operate from an `awesome-agents` registry so
  the CLI manages only its own generated files.
- `init` creates a starter profile source layout.
- Install scope defaults to project to match the `npx skills` mental model.

## Safety Constraints

- Default behavior should not overwrite or delete unmanaged harness files.
- `--dry-run` should be available for install, remove, update, and init flows.
- Tests should exercise fake homes and fixture sources instead of writing to real
  user harness directories.

## Open Questions

- Whether future versions should also generate Codex `--profile` config layers in addition to Codex custom agents.
- Whether touch-grass should add native Claude Code and OpenCode adapters instead
  of relying on generated defaults.
- Whether future versions should include interactive prompts like `npx skills`.

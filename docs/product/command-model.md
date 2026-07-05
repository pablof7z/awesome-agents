# Command Model

These notes capture the intended command shape.

## `npx skills` Parity

The user requested "the exact same command structure as `npx skills`" for installing agent profiles.

Accepted direction:

- `add` is the primary install command because `npx skills` uses `add`.
- `install` is also supported because the user explicitly requested an install command.
- `use` renders one profile without installing it.
- `list` and `ls` show installed profiles.
- `remove` and `rm` remove installed generated profiles.
- `update` and `upgrade` reinstall from the recorded source.
- `init` creates a starter profile source layout.

## Selectors And Compatibility

The CLI supports:

- `--profile <slug>` to select profiles.
- `--skill <slug>` as a compatibility alias, even though the artifact is a profile.
- `--agent <codex|claude-code|opencode|*>` to select target harnesses.
- `--all` to install every profile.
- `--list` to inspect source profiles before installing.

## Defaults

Accepted implementation decision:

- Install scope defaults to project to match the `npx skills` mental model and avoid surprising user-global mutation.
- Codex is the default harness when no `--agent` is provided.
- The CLI is noninteractive in the initial scaffold.
- `--yes` is accepted for command-shape parity, but prompts are not currently required.

## Scriptability

The CLI should be useful from automation:

- Human-readable output should include clear target paths.
- `--json` should be available for scripts.
- `--dry-run` should preview writes without touching target files or registries.

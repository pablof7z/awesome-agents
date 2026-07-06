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

- `--agent <slug>` as the preferred profile selector, matching user-facing
  language such as `npx awesome-agents add owner/repo --agent triage-agent`.
- `--profile <slug>` to select profiles explicitly.
- `--skill <slug>` as a compatibility alias, even though the artifact is a profile.
- `--harness <codex|claude-code|opencode|*>` to select target harnesses.
- `--agent <codex|claude-code|opencode|*>` remains accepted as a legacy harness
  selector when the value is a known harness or harness alias.
- `--all` to install every profile.
- `--list` to inspect source profiles before installing.

## Defaults

Accepted implementation decision:

- Install scope defaults to project where the target harness supports project-local profiles.
- Codex is an exception because `codex --profile <name>` loads
  `$CODEX_HOME/<name>.config.toml`. Codex profile installs should use that
  user-level config-layer target.
- When no `--harness` or legacy harness-valued `--agent` is provided, the CLI
  installs to every supported harness whose CLI is detected on `PATH` (checks
  for `codex`, `claude`, `opencode`). If none are detected, it falls back to
  Codex only.
- `--harness <harness>` (or a harness-valued `--agent`) narrows the install to
  that single harness, overriding detection.
- The CLI is noninteractive in the initial scaffold.
- `--yes` is accepted for command-shape parity, but prompts are not currently required.

## Scriptability

The CLI should be useful from automation:

- Human-readable output should include clear target paths.
- Human-readable install output should show how to run the installed profile
  through harness CLIs detected on the user's machine.
- `--json` should be available for scripts.
- `--dry-run` should preview writes without touching target files or registries.

## Profile Identity

User correction:

- Each installed profile should instruct the harness to identify itself by its
  installed name and role. If the user asks the running agent "who are you?" or
  asks for `triage-agent`, it should know it is the `triage-agent` profile or at
  least that its role is Triage Agent.

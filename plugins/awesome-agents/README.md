# Awesome Agents — Claude Code plugin

Browse and install reusable agent profiles from any source without leaving
Claude Code. This plugin is a thin, native wrapper over the published
[`awesome-agents`](https://www.npmjs.com/package/awesome-agents) CLI — the skills
shell out to `npx -y awesome-agents … --json` and present the results.

## Install

```
/plugin marketplace add pablof7z/awesome-agents
/plugin install awesome-agents@awesome-agents
```

Requires Node.js on your `PATH` (the skills invoke `npx`).

## Skills

| Command | What it does |
| --- | --- |
| `/awesome-agents:browse [source]` | List the profiles a source offers |
| `/awesome-agents:create-agent-profile [role]` | Create and validate a portable profile in the current source repo |
| `/awesome-agents:install [source] [slug]` | Install a profile into `.claude/agents/` |
| `/awesome-agents:installed` | Show what's installed (project or global) |
| `/awesome-agents:update [slug…]` | Update profiles from their sources |
| `/awesome-agents:remove <slug…>` | Uninstall profiles |

`source` is a local path, a GitHub `owner/repo`, or a git URL. When omitted, the
skills default to the flagship directory `pablof7z/awesome-agents`.

## Subagent

`profile-curator` — describe a job ("I need something that triages incoming
tickets") and it recommends the closest profile, inspects it, and installs it on
confirmation, or scaffolds a new profile source when nothing fits.

## How it works

The plugin ships no runtime logic of its own. Its skills run the
`awesome-agents` CLI with `--json`: the creator writes the canonical
`agents/<slug>/agent.yaml` source layout, while install commands render profiles
into Claude Code's `.claude/agents/` (project) or `~/.claude/agents/` (global).
Because the CLI already understands harness targets and keeps its own registry,
`update` and `remove` stay consistent whether you invoke them from the plugin or
from a terminal.

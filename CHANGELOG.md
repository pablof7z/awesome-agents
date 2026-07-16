# Changelog

This file is maintained by `npm run changelog` and `npm run release`. Release entries are generated from git commit history.

## 0.1.9 - 2026-07-16

Changes since `v0.1.8`.

### Added

- Add create-agent-profile skill (f5dcfe0)

### Changed

- Expose agent-owned support to installed profiles (#12) (832094e)
- Name awesome-agents profiles directly (9640910)
- Remove agents nav link (3ad6bb3)
- Restore coral site accent (ba2ec5c)
- Refresh site agent directory (2268134)
- Make skill dependency resolution fault-tolerant instead of fatal (78aea64)

## 0.1.8 - 2026-07-08

Changes since `v0.1.6`.

### Added

- Add "What is an agent?" marketing page and link it site-wide (fa8255e)
- Add Goose to site harness surfaces (7a444cf)
- Add Goose harness support (#9) (c4049f2)
- Add public builder profile prototype (e78202e)
- Add plan for public-builder-profiles-agent-model-cards (64e254a)
- Add generated docs site (8eb21ba)

### Changed

- Prepare 0.1.7 release (342e93d)
- Link hosted artifacts for public-builder-profiles-agent-model-cards (0f76238)
- Update tenex-edge launch commands (cc304e2)

### Documentation

- rebuild /docs in the shadcn-docs layout (878803c)

## 0.1.7 - 2026-07-07

Changes since `v0.1.6`.

### Added

- Add generated docs site (8eb21ba)

### Changed

- Update tenex-edge launch commands (cc304e2)

## 0.1.6 - 2026-07-06

Changes since `v0.1.5`.

### Changed

- Align harness detection docs (70a1f8e)
- Improve agent install workflow (61470fc)

## 0.1.5 - 2026-07-06

Changes since `v0.1.4`.

- No commits found for this release.

## 0.1.4 - 2026-07-06

Changes since `v0.1.3`.

### Added

- Add justfile for lint/test/release/publish workflows (7fe04ba)
- Add agent detail page and visual treatment explorations (7d29557)
- Add Claude Code plugin for browsing and installing agent profiles (5a11e6f)
- Add awesome-agents.com marketing/directory site (9ce50cd)

### Changed

- Link leaderboard rows to per-agent pages (6f2c471)
- Default install to every detected harness on PATH (b5af687)
- Render Codex profile metadata as comments (59395cc)
- Install agent-owned support files (3ede3ce)

## 0.1.3 - 2026-07-05

Initial tracked release.

### Added

- Add release automation (3ee72ed)
- Add chief of staff profile install support (e683a72)

### Fixed

- Fix flaky color-sensitive assertions in CLI tests (5262811)
- Fix agent profile install UX (961497c)
- Fix npm bin metadata (085e6ee)

### Changed

- Polish CLI help and profile source support (d931ae9)
- Split product notes by area (1d24611)
- Scaffold awesome-agents CLI (e1ec6a4)

## 0.1.2 - 2026-07-05

### Fixed

- Require an explicit source for `add`, `install`, and `use`; remove the hardcoded default source fallback.
- Replace source-specific help and documentation examples with neutral `owner/repo` examples.
- Parse repo-neutral YAML profile files in addition to Markdown frontmatter files.
- Replace source-specific test fixtures with neutral profile-source fixtures.
- Prefer `agents/<slug>/agent.yaml` source directories and install colocated
  `scripts/` and `references/` into the agent home.

## 0.1.1 - 2026-07-05

Initial tracked release.

### Added

- Add release and changelog automation.
- Add chief of staff profile install support (e683a72)

### Fixed

- Fix npm bin metadata (085e6ee)

### Changed

- Split product notes by area (1d24611)
- Scaffold awesome-agents CLI (e1ec6a4)

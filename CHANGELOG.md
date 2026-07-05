# Changelog

This file is maintained by `npm run changelog` and `npm run release`. Release entries are generated from git commit history.

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

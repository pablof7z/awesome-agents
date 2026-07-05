---
slug: chief-of-staff
profile: ../../profiles/chief-of-staff.md
harness: codex
model: gpt-5.5
reasoning_effort: high
required_skills:
  - tenex-edge
---

# Codex Adapter: Chief Of Staff

Load the canonical profile at `agents/profiles/chief-of-staff.md`.

This adapter installs the chief-of-staff as a Codex agent profile. It must not
be treated as a skill.

At the start of a session, run:

```bash
python3 agents/scripts/chief-of-staff/workflows.py list
```

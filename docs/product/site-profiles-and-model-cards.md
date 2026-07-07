# Site Profiles And Model Cards

These notes capture the requested direction for the public
`awesome-agents.com` experience.

## Core Direction

The site should become a social profile and discovery surface for people who
build with agent fleets, not only a static CLI directory.

Primary route shape:

```text
awesome-agents.com/<handle>
awesome-agents.com/<handle>/<repo>/<agent-slug>
```

`/<handle>` is a builder profile: a public place to show the operator behind the
agents. It should feel like an understated flex for people managing serious AI
agent setups: owned profiles, agent fleets, source repos, installs, shipped
examples, reviews, and signals that the builder knows how to operate in the new
agent-native workflow.

`/<handle>/<repo>/<agent-slug>` is an agent template page, comparable to a
Hugging Face model card. It should show what the agent is, why it exists, how to
install it, what harnesses it supports, where its source lives, and what other
users say about it.

## Agent Model Card Source

Agent source repositories should support site-facing README content next to the
runtime profile definition:

```text
agents/
  <agent-slug>/
    agent.yaml
    README.md
    scripts/
    references/
```

`agents/<agent-slug>/README.md` is the canonical source for the public model
card body on the site. It complements `agent.yaml`; it is not the runtime prompt.
The YAML profile remains the installable agent definition, while the README can
explain intended use, operating model, examples, limitations, changelog notes,
and other human-facing documentation.

The site should render this README on the model-card route:

```text
awesome-agents.com/<handle>/<repo>/<agent-slug>
```

## Identity And Login

GitHub login is the preferred starting point.

Initial identity assumptions:

- The public handle can default to the GitHub username.
- GitHub auth can verify repo ownership and let builders claim/import agent
  source repositories.
- Repo and agent routes should be derived from GitHub ownership plus the
  `agents/<agent-slug>/` layout.
- Reviews should require a logged-in identity.

## Social Surface

Builder profiles should make agent operation legible and impressive without
turning into a conventional resume page.

Useful signals:

- published agent templates;
- repos connected to the builder;
- fleet or team size where the builder chooses to disclose it;
- installs, stars, reviews, and shipped samples;
- badges for verified GitHub ownership or claimed source repos;
- featured agents and examples of work produced with them.

Agent model cards should support reviews and reputation signals so users can
judge an agent before installing it.

## Open Questions

- Should `agents/<agent-slug>/README.md` be required for indexed site listings,
  or optional with a generated fallback from `agent.yaml`?
- What GitHub OAuth scopes or GitHub App permissions are needed to import repos
  without overreaching?
- How should reviews be moderated, de-duplicated, and protected from spam?
- Which metrics are verified by the platform versus self-reported by builders?
- How should route conflicts be handled if a builder changes their GitHub
  username or later wants a custom handle?

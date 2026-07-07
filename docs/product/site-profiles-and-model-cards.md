# Site Profiles And Model Cards

These notes capture the requested direction for the public
`awesome-agents.com` experience.

## Core Direction

The site should become a social profile and discovery index for people who
build with agent fleets, not only a static CLI directory.

Primary route shape:

```text
awesome-agents.com/<handle>
awesome-agents.com/<handle>/<repo>/<agent-slug>
```

`/<handle>` is a builder profile: a public place to show the operator behind the
agents. It should include owned profiles, agent fleets, source repos, installs,
shipped examples, reviews, and activity.

This page should feel closer to a GitHub profile than a landing page. The core
content is profile information: about details, connected repos, agent templates,
recent activity, artifacts created with specific fleets, reviews,
discussion/forum participation, and cross-references between builders, agents,
and artifacts.

`/<handle>/<repo>/<agent-slug>` is an agent template page, comparable to a
Hugging Face model card. It should show what the agent is, why it exists, how to
install it, where its source lives, and what other users say about it.

This page should feel closer to a repository page than a marketing page. Users
should be able to inspect the template, install or download it, eventually fork
it, comment on it, review it, and see artifacts shared by other builders who
used or adapted the agent.

Profile and model-card navigation should be route-backed subpages, not in-page
anchor tabs. For example:

```text
awesome-agents.com/<handle>/agents
awesome-agents.com/<handle>/artifacts
awesome-agents.com/<handle>/activity
awesome-agents.com/<handle>/<repo>/<agent-slug>/reviews
awesome-agents.com/<handle>/<repo>/<agent-slug>/forks
```

## Agent Model Card Source

Agent source repositories should support optional site-facing README content
next to the runtime profile definition:

```text
agents/
  <agent-slug>/
    agent.yaml
    README.md  # optional site model-card body
    scripts/
    references/
```

`agents/<agent-slug>/README.md` is not required. When present, it is the
canonical source for the public model-card body on the site. It complements
`agent.yaml`; it is not the runtime prompt. The YAML profile remains the
installable agent definition, while the README can explain intended use,
operating model, examples, limitations, changelog notes, and other human-facing
documentation.

The site should render this README on the model-card route when it exists:

```text
awesome-agents.com/<handle>/<repo>/<agent-slug>
```

When no README exists, the site should still allow the agent page and generate a
fallback model card from `agent.yaml` metadata and profile content.

## Identity And Login

GitHub login is the preferred starting point.

Initial identity assumptions:

- The public handle can default to the GitHub username.
- Requested GitHub OAuth access should be limited to basic user profile and
  email address information, such as `read:user` plus `user:email`.
- GitHub auth can verify repo ownership and let builders claim/import agent
  source repositories.
- Repo and agent routes should be derived from GitHub ownership plus the
  `agents/<agent-slug>/` layout.
- Reviews should require a logged-in identity.
- Public handle claims are first-come-first-served.

## Social Surface

Builder profiles should make agent operation legible and impressive without
turning into a conventional resume page.

Useful signals:

- published agent templates;
- repos connected to the builder;
- recent activity related to agent work;
- artifacts the builder publishes, including which fleet produced them;
- fleet or team size where the builder chooses to disclose it;
- installs, stars, reviews, and shipped samples;
- badges for verified GitHub ownership or claimed source repos;
- featured agents and examples of work produced with them;
- discussion/forum participation that can reference builders, repos, agents,
  and artifacts.

Useful profile metrics:

- agent templates published or maintained;
- installs across templates and source repos;
- forks, remixes, and adaptations by other builders;
- artifacts shipped with explicit fleet tags;
- average review score from logged-in users;
- discussion karma or useful answers;
- verified source ownership and verified artifact links.

Agent model cards should support reviews and reputation signals so users can
judge an agent before installing it.

The first release should not include spam filtering for reviews. Reviews can
ship with logged-in identity as the baseline constraint, then add moderation
controls only after there is real usage pressure.

## Open Questions

- Which metrics are verified by the platform versus self-reported by builders?
- Should custom handles be supported at launch, or should the first version use
  GitHub usernames only?
- What later moderation or spam controls are needed once real review volume
  exists?

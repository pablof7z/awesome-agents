window.BUILDERS = {
  pablof7z: {
    handle: "pablof7z",
    name: "Pablo Fernandez",
    github: "pablof7z",
    avatar: "https://github.com/pablof7z.png",
    heroImage: "https://picsum.photos/seed/agent-fleet-console/1920/1080",
    inlineImage: "https://picsum.photos/seed/operator-desk/640/360",
    headline: "Pablo runs agent fleets like product infrastructure.",
    bio: "Builds agent workflows across Codex, Claude Code, OpenCode, tenex-edge, and GitHub.",
    location: "Internet / projects / agent rooms",
    website: "awesome-agents.com",
    joined: "Joined July 2026",
    stack: ["Codex", "Claude Code", "OpenCode", "tenex-edge", "GitHub"],
    intro: "Repos, agent templates, artifacts, reviews, and handoffs from a working agent setup.",
    kpis: [
      { value: "32", label: "agent templates", detail: "Profiles published or maintained" },
      { value: "8.4k", label: "installs", detail: "Template installs across repos" },
      { value: "19", label: "artifacts", detail: "Public work samples with fleet tags" },
      { value: "6", label: "remixes", detail: "Forks or adaptations by others" },
      { value: "4.8", label: "review score", detail: "Average review rating" },
      { value: "147", label: "discussion karma", detail: "Useful forum participation" }
    ],
    proof: [
      { value: "32", label: "agent templates published" },
      { value: "19", label: "artifacts with fleet tags" },
      { value: "6", label: "forks and remixes by other builders" }
    ],
    repos: [
      {
        slug: "touch-grass",
        name: "touch-grass",
        source: "pablof7z/touch-grass",
        summary: "Operational agent fleet for staying ahead of projects, reviews, product calls, and the work that usually leaks between tools.",
        agentCount: 18,
        featured: ["chief-of-staff", "ios-ux-ui-critic", "planning-agent"]
      },
      {
        slug: "awesome-agents",
        name: "awesome-agents",
        source: "pablof7z/awesome-agents",
        summary: "Installer and directory for reusable agent profiles.",
        agentCount: 14,
        featured: ["code-reviewer", "triage-agent", "research-agent"]
      }
    ],
    featuredAgents: [
      {
        repo: "touch-grass",
        slug: "chief-of-staff",
        name: "Chief of Staff",
        role: "Operator",
        path: "/pablof7z/touch-grass/chief-of-staff",
        summary: "Maintains the operating picture, tracks decisions, coordinates agents, and protects attention."
      },
      {
        repo: "awesome-agents",
        slug: "code-reviewer",
        name: "Code Reviewer",
        role: "Reviewer",
        path: "/agents/code-reviewer",
        summary: "Reads diffs for correctness bugs and risky changes before merge."
      },
      {
        repo: "awesome-agents",
        slug: "research-agent",
        name: "Research Agent",
        role: "Researcher",
        path: "/agents/research-agent",
        summary: "Turns source-backed findings into concise briefs."
      }
    ],
    story: [
      "The impressive part is not having a bot answer a prompt.",
      "It is knowing which agent gets which job, how the handoff is recorded, when the work needs a human, and which profile should be improved after the run.",
      "The profile keeps the repos, templates, artifacts, and handoffs in one place."
    ],
    artifacts: [
      {
        title: "Plan PR for public builder profiles",
        type: "architecture plan",
        when: "today",
        summary: "Published the planning PR, hosted plan page, and ready-to-implement decision for this profile/model-card slice.",
        agents: ["planning-agent", "codex", "chief-of-staff"],
        href: "https://github.com/pablof7z/awesome-agents/pull/1"
      },
      {
        title: "Preview deploy for the social profile prototype",
        type: "site artifact",
        when: "today",
        summary: "Vercel preview showing the first pass of builder profiles and repo-scoped agent template pages.",
        agents: ["codex", "chief-of-staff"],
        href: "https://site-4kuktfsxn-pablof7zs-projects.vercel.app/pablof7z"
      },
      {
        title: "Chief of Staff model-card seed",
        type: "agent model card",
        when: "today",
        summary: "README-backed template page for an operator agent, including install command, examples, reviews, and source links.",
        agents: ["chief-of-staff", "code-reviewer"],
        href: "/pablof7z/touch-grass/chief-of-staff"
      }
    ],
    activity: [
      {
        kind: "published",
        when: "today",
        title: "Opened a planning PR for social profiles and model cards",
        detail: "Included the route model, README fallback, GitHub identity boundary, and review persistence assumptions."
      },
      {
        kind: "deployed",
        when: "today",
        title: "Shipped a Vercel preview",
        detail: "Preview includes `/pablof7z` and `/pablof7z/touch-grass/chief-of-staff` with mobile overflow checks."
      },
      {
        kind: "authored",
        when: "yesterday",
        title: "Captured first-come-first-served handle policy",
        detail: "Product notes now say agent README files are optional and GitHub login starts with basic profile plus email scope."
      }
    ],
    discussions: [
      {
        title: "How I hijacked pablof7z/touch-grass's chief-of-staff and made him run my life",
        when: "seed thread",
        comments: 18,
        tags: ["chief-of-staff", "life-ops", "fleet-management"],
        summary: "Calendar triage, weekly planning, household ops, and the agent changes that made it usable."
      },
      {
        title: "What counts as a good agent artifact?",
        when: "seed thread",
        comments: 9,
        tags: ["artifacts", "reviews", "receipts"],
        summary: "PRs, hosted plans, generated docs, audits, and the links people can inspect."
      }
    ],
    reviews: [
      {
        by: "@mkraus",
        text: "The setup feels like watching a staff meeting where every agent knows exactly what it owns."
      },
      {
        by: "@lin-h",
        text: "Understated, but the signal is obvious: this is not toy automation."
      },
      {
        by: "@dwheeler",
        text: "The agent cards make the workflow legible before you install anything."
      }
    ]
  }
};

window.SOCIAL_AGENT_CARDS = {
  "pablof7z/touch-grass/chief-of-staff": {
    handle: "pablof7z",
    repo: "touch-grass",
    source: "pablof7z/touch-grass",
    slug: "chief-of-staff",
    name: "Chief of Staff",
    role: "Operator",
    summary: "Maintains a cross-project operating picture, tracks projects and decisions, coordinates agents, and protects the builder's time.",
    updated: "Seed profile",
    installs: 820,
    samples: 22,
    rating: "4.9",
    stars: 147,
    forks: 18,
    downloads: 820,
    version: "0.1 seed",
    license: "MIT-style profile",
    readmePresent: true,
    readmeTitle: "Chief of Staff model card",
    image: "https://picsum.photos/seed/chief-of-staff-agent/1920/1080",
    install: "npx awesome-agents add pablof7z/touch-grass --agent chief-of-staff",
    readmeSource: "touch-grass/agents/chief-of-staff/readme-proposals/04-human-judgment-router/README.md",
    readme: {
      eyebrow: "Chief Of Staff",
      dek: "Autonomy with judgment gates.",
      title: "The Right Questions Reach You",
      banner: {
        src: "/assets/agents/chief-of-staff/human-judgment-router-banner.jpg",
        alt: "A roadway barrier in front of a traffic control building"
      },
      intro: [
        "Autonomous agents should not stop at every fork.",
        "They should keep moving until the fork becomes a real human call.",
        "`chief-of-staff` routes the work around that boundary. It lets low-stakes action continue and raises the moments where your judgment changes the outcome."
      ],
      sections: [
        {
          title: "The Difference",
          body: [
            "Not every question deserves you.",
            "Some questions are clerical. Some are reversible. Some are local judgment the agent can handle.",
            "But some questions affect authority, priority, access, money, reputation, production state, or the definition of done.",
            "Those should reach you cleanly."
          ]
        },
        {
          title: "What You See",
          table: [
            ["Bad agent workflow", "Better agent workflow"],
            ["“What should I do next?”", "“I continued on research. One publishing choice needs you.”"],
            ["“Can I ask for access?”", "“Access blocks the release path. Here is the exact ask.”"],
            ["“Should we ship?”", "“Two options, one risk, one recommendation.”"],
            ["“I paused everything.”", "“Only the risky branch paused. The rest kept moving.”"]
          ]
        },
        {
          title: "Why It Matters",
          body: [
            "The goal is not fewer questions.",
            "The goal is better questions: shorter, sharper, and worthy of attention.",
            "When the chief of staff works, your agent system feels less needy and more adult."
          ]
        },
        {
          title: "Use It When",
          body: [
            "You want autonomy with judgment gates.",
            "You want agents to move until they hit a real boundary, then bring you the decision with context."
          ]
        }
      ]
    },
    examples: [
      {
        title: "Split a review into focused agent work",
        body: "Routed UI inspection to a UX critic, kept implementation with Codex, and asked the planning agent only for architecture-risk feedback."
      },
      {
        title: "Recovered stale project context",
        body: "Found the prior decision, identified the unresolved blocker, and restarted the right channel instead of forcing a fresh briefing."
      },
      {
        title: "Protected attention",
        body: "Collapsed six open loops into two concrete asks and one follow-up owner."
      }
    ],
    artifacts: [
      {
        title: "Project operating brief",
        by: "@pablof7z",
        when: "today",
        summary: "Chief of Staff summarized active rooms, owners, blockers, and next actions before implementation continued.",
        fleet: ["chief-of-staff", "planning-agent", "codex"]
      },
      {
        title: "Review routing decision",
        by: "@pablof7z",
        when: "today",
        summary: "Split architecture planning, implementation, and UX inspection into separate agents instead of one overloaded run.",
        fleet: ["chief-of-staff", "ios-ux-ui-critic", "codex"]
      },
      {
        title: "Handoff cleanup",
        by: "@agentops",
        when: "seed example",
        summary: "Converted a messy session into a durable channel summary another agent could resume without replaying the whole thread.",
        fleet: ["chief-of-staff"]
      }
    ],
    discussions: [
      {
        title: "How do you keep a chief-of-staff agent from becoming a nag?",
        by: "@lin-h",
        comments: 12,
        summary: "Patterns for directness, escalation, and not turning every open loop into noise."
      },
      {
        title: "Fork idea: personal-life chief of staff",
        by: "@dwheeler",
        comments: 7,
        summary: "A fork that swaps project channels for household ops, calendar follow-ups, and weekly planning."
      }
    ],
    forksList: [
      { owner: "@lin-h", name: "chief-of-staff-lite", note: "Shorter handoffs, fewer escalations." },
      { owner: "@dwheeler", name: "life-chief-of-staff", note: "Personal operating system variant." }
    ],
    reviews: [
      {
        by: "@pablof7z",
        text: "This is the profile I want coordinating the weird stuff while I keep building."
      },
      {
        by: "@agentops",
        text: "The value is not the prose. It is that the right agent gets pulled in at the right time."
      }
    ]
  }
};

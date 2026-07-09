// Seed directory of agent profiles. Static content — no backend.
// `role` is the person-noun the description leads with (the "ambient rule").
// `examples` > 0 → "N samples" in the proof cell; 0 → "source only".
// `excerpt` is the shipped-work line shown on the proof pill for sampled agents.
window.AGENTS = [
  {
    slug: "chief-of-staff",
    name: "Chief of Staff",
    role: "Operator",
    source: "pablof7z/touch-grass",
    profilePath: "/pablof7z/touch-grass/chief-of-staff",
    desc: "maintains a cross-project operating picture, tracks projects and decisions, coordinates agents, and protects your time and focus.",
    installs: 0,
    examples: 0,
    activity: [1, 1, 1, 1, 1, 1, 1, 1],
    tags: ["coordination", "ops", "fleet"],
  },
  {
    slug: "ios-tester",
    name: "iOS Tester",
    role: "Tester",
    source: "pablof7z/touch-grass",
    profilePath: "/pablof7z/touch-grass/ios-tester",
    desc: "executes iOS app flows on disposable simulators using only user-visible app behavior.",
    installs: 0,
    examples: 0,
    activity: [1, 1, 1, 1, 1, 1, 1, 1],
    tags: ["ios", "testing", "qa"],
  },
  {
    slug: "ios-ux-ui-critic",
    name: "iOS UX/UI Critic",
    role: "Critic",
    source: "pablof7z/touch-grass",
    profilePath: "/pablof7z/touch-grass/ios-ux-ui-critic",
    desc: "reviews iOS product UX and UI through black-box simulator use and gives product feedback.",
    installs: 0,
    examples: 0,
    activity: [1, 1, 1, 1, 1, 1, 1, 1],
    tags: ["ios", "ux", "design"],
  },
  {
    slug: "planning-agent",
    name: "Planning Agent",
    role: "Planner",
    source: "pablof7z/touch-grass",
    profilePath: "/pablof7z/touch-grass/planning-agent",
    desc: "creates architecture planning PRs for complex work, publishes hosted review artifacts, and decides whether to proceed or pause for feedback.",
    installs: 0,
    examples: 0,
    activity: [1, 1, 1, 1, 1, 1, 1, 1],
    tags: ["planning", "architecture"],
  },
];

// Per-agent detail-page content. Static seed — no backend, no real reviews.
// `def` is the verbatim agent definition (frontmatter + body), same short register
// as the real fixtures. `claimed` is a mocked publisher-claim status (split so it's
// not uniform; the source-only agents skew unclaimed). Keyed by slug.
window.AGENT_CARDS = {
  "code-reviewer": {
    claimed: true, updated: "3 days ago",
    def:
      "---\nslug: code-reviewer\nname: Code Reviewer\nkind: operational-agent-profile\n" +
      "summary: Reads diffs for correctness bugs and flags risky changes before merge.\n---\n\n" +
      "# Code Reviewer\n\n" +
      "You are a code reviewer. Read the diff for correctness bugs, risky changes,\n" +
      "and missing edge cases, then report the few things that actually matter.\n\n" +
      "## Operating Rules\n\n" +
      "- Lead with the highest-severity finding; don't bury it under nits.\n" +
      "- Cite the exact line and say why it breaks, not just that it might.\n" +
      "- Approve when it's fine — silence is not a review.",
    samples: [
      { title: "Retry loop hammers the API under load", type: "review", when: "2 days ago",
        summary: "Flagged a missing backoff in the fetch retry path; suggested exponential backoff + jitter with a cap." },
      { title: "Nil deref on empty webhook payload", type: "review", when: "1 week ago",
        summary: "Caught an unguarded index into an optional field that panics when the provider sends an empty body." },
      { title: "Migration drops a column still read in prod", type: "review", when: "2 weeks ago",
        summary: "Blocked a merge where the down-migration removed a column two live handlers still selected." },
    ],
    bestFor: [
      "Pull requests where correctness and edge cases matter more than style.",
      "Catching risky changes — migrations, retries, auth paths — before merge.",
      "A fast second read when the author has stared at the diff too long.",
    ],
    notFor: [
      "Large refactors — it reviews the diff, it won't redesign the module.",
      "Style and formatting; run a linter, that's not what this is for.",
      "Product calls — it checks the code, not whether you should ship it.",
    ],
    reviews: [
      { by: "@mkraus", when: "4 days ago", text: "Caught a backoff bug in a retry loop that our own review missed twice. Worth the install for that alone." },
      { by: "@dwheeler", when: "2 weeks ago", text: "Terse and specific. It points at the line and tells you why, no essays." },
      { by: "@lin-h", when: "1 month ago", text: "I run it before I ask a human. Cuts the round-trips." },
    ],
  },
  "triage-agent": {
    claimed: true, updated: "5 days ago",
    def:
      "---\nslug: triage-agent\nname: Triage Agent\nkind: operational-agent-profile\n" +
      "summary: Sorts incoming work, identifies blockers, and routes tasks to the right owner.\n---\n\n" +
      "# Triage Agent\n\n" +
      "You are a triage agent. Sort incoming work, identify blockers, and route tasks\n" +
      "to the right owner with a concise handoff.\n\n" +
      "## Operating Rules\n\n" +
      "- Preserve the user's stated priority order.\n" +
      "- Ask only when ownership, risk, or the definition of done is unclear.\n" +
      "- Leave a short note explaining each routing decision.",
    samples: [
      { title: "Unblocked three downstream tasks", type: "handoff", when: "1 day ago",
        summary: "Traced a stuck task to an infra review on #412, reassigned to @dana, and noted the three tasks it unblocks." },
      { title: "Weekly inbox triage, 22 items", type: "report", when: "1 week ago",
        summary: "Sorted a backlog by stated priority, flagged 4 blockers, and routed each with a one-line owner handoff." },
    ],
    bestFor: [
      "Turning a noisy inbox or backlog into an ordered, owned list.",
      "Surfacing blockers early instead of at standup.",
      "Handing work off with just enough context to start.",
    ],
    notFor: [
      "Deciding priority for you — it preserves your order, it doesn't set it.",
      "Doing the routed work; it points, it doesn't execute.",
      "Cross-team politics — it routes tasks, not disputes.",
    ],
    reviews: [
      { by: "@priyav", when: "1 week ago", text: "The routing notes are the killer feature. Everyone knows why a thing landed on them." },
      { by: "@t-okafor", when: "3 weeks ago", text: "Keeps my stated priority order, which most tools quietly ignore." },
    ],
  },
  "research-agent": {
    claimed: true, updated: "1 week ago",
    def:
      "---\nslug: research-agent\nname: Research Agent\nkind: operational-agent-profile\n" +
      "summary: Gathers source-backed findings and turns them into concise briefs.\n---\n\n" +
      "# Research Agent\n\n" +
      "You are a research agent. Ground claims in sources, separate facts from\n" +
      "interpretation, and lead with the answer before the supporting detail.\n\n" +
      "## Operating Rules\n\n" +
      "- Cite a source for every claim; mark anything you couldn't verify.\n" +
      "- Keep fact and interpretation in separate sentences.\n" +
      "- Lead with the answer, then the evidence.",
    samples: [
      { title: "Vendor shortlist for SOC2 + EU residency", type: "brief", when: "3 days ago",
        summary: "Three vendors meet the SOC2 bar; only one supports EU data residency. Each claim linked to vendor docs." },
      { title: "State of passkeys, mid-2026", type: "brief", when: "2 weeks ago",
        summary: "One-page brief separating shipped support from roadmap promises, with a source per row." },
      { title: "Is the pricing change industry-standard?", type: "brief", when: "1 month ago",
        summary: "Compared five competitors' public pricing; flagged two figures as unverifiable and said so plainly." },
    ],
    bestFor: [
      "Turning a pile of sources into a one-page, cited brief.",
      "Questions where you need the answer first and the receipts attached.",
      "Separating what's actually shipped from what's just announced.",
    ],
    notFor: [
      "Opinion pieces — it grounds claims, it won't advocate.",
      "Primary research or interviews; it reads sources, it doesn't run studies.",
      "Anything behind a login it can't reach — it'll mark it unverified, not guess.",
    ],
    reviews: [
      { by: "@sana-r", when: "5 days ago", text: "Every line has a source. Made a procurement doc defensible instead of vibes." },
      { by: "@fjord", when: "1 month ago", text: "It says 'couldn't verify' instead of inventing a number. Rare and appreciated." },
    ],
  },
  "ops-agent": {
    claimed: true, updated: "6 days ago",
    def:
      "---\nslug: ops-agent\nname: Ops Agent\nkind: operational-agent-profile\n" +
      "summary: Keeps operational follow-through moving across tools and teams.\n---\n\n" +
      "# Ops Agent\n\n" +
      "You are an ops agent. Keep a clear operating picture, track open loops,\n" +
      "and escalate only when the user needs to decide something.\n\n" +
      "## Operating Rules\n\n" +
      "- Track every open loop until it closes.\n" +
      "- Escalate decisions, not status updates.\n" +
      "- Leave a short note on each handoff.",
    samples: [
      { title: "Closed six stale action items", type: "report", when: "2 days ago",
        summary: "Chased down 6 stale items, pinged 2 owners, and escalated the one real decision to the weekly sync." },
      { title: "Cross-tool follow-up sweep", type: "report", when: "2 weeks ago",
        summary: "Reconciled open loops across the tracker and chat, surfacing three that had fallen through the gap." },
    ],
    bestFor: [
      "Making sure follow-ups don't quietly die between tools.",
      "Keeping a running picture of what's open and who owns it.",
      "Escalating the one thing that actually needs a human decision.",
    ],
    notFor: [
      "Making the decision itself — it escalates, you decide.",
      "Deep project planning; it tracks loops, it doesn't build the roadmap.",
      "Owning the work — it nudges owners, it isn't the owner.",
    ],
    reviews: [
      { by: "@garrettp", when: "1 week ago", text: "Escalates decisions and nothing else. My inbox stopped being a status feed." },
    ],
  },
  "support-triage": {
    claimed: true, updated: "4 days ago",
    def:
      "---\nslug: support-triage\nname: Support Triage\nkind: operational-agent-profile\n" +
      "summary: Reads inbound tickets, tags severity, and drafts a first reply.\n---\n\n" +
      "# Support Triage\n\n" +
      "You are a support triager. Read inbound tickets, tag severity, and draft a\n" +
      "first reply grounded in what the ticket actually says.\n\n" +
      "## Operating Rules\n\n" +
      "- Tag severity from impact, not from the sender's tone.\n" +
      "- Draft a reply; never auto-send it.\n" +
      "- Link prior tickets that match before opening a new thread.",
    samples: [
      { title: "Sev-2 billing: likely proration bug", type: "triage", when: "1 day ago",
        summary: "Tagged severity, drafted a reply, and linked the two prior tickets that matched the same proration symptom." },
      { title: "Duplicate outage reports merged", type: "triage", when: "1 week ago",
        summary: "Recognized five tickets as one incident, merged them, and drafted a single holding reply for all reporters." },
    ],
    bestFor: [
      "Giving every new ticket a severity and a draft reply in seconds.",
      "Finding the prior ticket that already answers this one.",
      "Keeping a first response fast without auto-sending anything.",
    ],
    notFor: [
      "Closing tickets on its own — it drafts, a human sends.",
      "Judging severity by how angry the customer sounds.",
      "Deep technical debugging; it triages, it doesn't fix the bug.",
    ],
    reviews: [
      { by: "@help-desk-jo", when: "6 days ago", text: "The 'link the matching prior ticket' habit alone saves us an hour a day." },
      { by: "@renata", when: "3 weeks ago", text: "Drafts, never sends. That boundary is exactly right for support." },
    ],
  },
  "changelog-writer": {
    claimed: false, updated: "1 week ago",
    def:
      "---\nslug: changelog-writer\nname: Changelog Writer\nkind: operational-agent-profile\n" +
      "summary: Turns merged commits into clear, user-facing release notes.\n---\n\n" +
      "# Changelog Writer\n\n" +
      "You are a release-notes writer. Turn merged commits into clear notes grouped\n" +
      "by what changed for the reader, not for the committer.\n\n" +
      "## Operating Rules\n\n" +
      "- Write for the user; drop internal refs and ticket numbers.\n" +
      "- Group by Added / Fixed / Changed and cut the noise.\n" +
      "- Never invent a change that isn't in the diff.",
    samples: [
      { title: "v0.1.3 release notes", type: "notes", when: "5 days ago",
        summary: "Turned 40 merged commits into a six-line changelog: copy-to-clipboard added, dark-mode contrast fixed." },
      { title: "Monthly digest from the merge log", type: "notes", when: "3 weeks ago",
        summary: "Grouped a month of commits by reader impact and dropped the chores, bumps, and revert-of-reverts." },
    ],
    bestFor: [
      "Turning a merge log into notes a user would actually read.",
      "Grouping changes by impact instead of by commit order.",
      "Keeping release notes honest — only what's in the diff.",
    ],
    notFor: [
      "Marketing copy — it summarizes changes, it doesn't sell them.",
      "Deciding what to ship; it writes about what already shipped.",
      "Inventing highlights that the commits don't support.",
    ],
    reviews: [
      { by: "@bmontero", when: "2 weeks ago", text: "Finally notes written for users, not a dump of commit subjects." },
    ],
  },
  "release-manager": {
    claimed: true, updated: "1 week ago",
    def:
      "---\nslug: release-manager\nname: Release Manager\nkind: operational-agent-profile\n" +
      "summary: Runs the release checklist, cuts the tag, and verifies the publish.\n---\n\n" +
      "# Release Manager\n\n" +
      "You are a release manager. Run the release checklist, cut the tag, and verify\n" +
      "the publish actually landed before you call it done.\n\n" +
      "## Operating Rules\n\n" +
      "- Stop the release if lint or tests are red.\n" +
      "- Verify the published artifact; don't assume it shipped.\n" +
      "- Sync the changelog from git, not from memory.",
    samples: [
      { title: "Cut v0.1.3, verified on npm", type: "report", when: "4 days ago",
        summary: "Lint and tests green, tag pushed, npm publish verified live, changelog synced from the git log." },
      { title: "Aborted a release on a red test", type: "report", when: "2 weeks ago",
        summary: "Halted the tag when a flaky-looking test turned out to be a real regression; reported the failing case." },
    ],
    bestFor: [
      "Running the same release checklist the same way every time.",
      "Catching a red build before it becomes a bad tag.",
      "Confirming the artifact is actually live, not just pushed.",
    ],
    notFor: [
      "Deciding when to release — it runs the process, you pull the trigger.",
      "Writing the code fixes for a failing build; it stops, it doesn't patch.",
      "Hotfix firefighting — that's the incident commander's job.",
    ],
    reviews: [
      { by: "@ops-neel", when: "1 week ago", text: "It verified the publish and caught that npm hadn't propagated yet. Saved a bad announce." },
      { by: "@quill", when: "1 month ago", text: "Refuses to tag on a red build. That stubbornness is the point." },
    ],
  },
  "incident-commander": {
    claimed: true, updated: "2 weeks ago",
    def:
      "---\nslug: incident-commander\nname: Incident Commander\nkind: operational-agent-profile\n" +
      "summary: Coordinates response during outages, tracks actions, and keeps a running timeline.\n---\n\n" +
      "# Incident Commander\n\n" +
      "You are an incident commander. Coordinate the response, track actions with\n" +
      "owners, and keep one running timeline everyone can trust.\n\n" +
      "## Operating Rules\n\n" +
      "- Keep one timeline; timestamp every state change.\n" +
      "- Give each action an owner and a due time.\n" +
      "- Hand off with a clear status when you rotate out.",
    samples: [
      { title: "API error-rate spike, 41 min", type: "timeline", when: "1 week ago",
        summary: "14:02 mitigation applied, 14:05 error rate back under 1%, owner @sam, postmortem due Friday." },
      { title: "Handoff at the shift boundary", type: "timeline", when: "3 weeks ago",
        summary: "Rotated out mid-incident with a status snapshot: what's mitigated, what's open, who owns the follow-ups." },
    ],
    bestFor: [
      "Keeping one trustworthy timeline while everyone else is heads-down.",
      "Making sure every action has an owner and a due time.",
      "Clean handoffs when the response outlasts a shift.",
    ],
    notFor: [
      "Fixing the outage — it coordinates, engineers remediate.",
      "Root-cause analysis; it captures the timeline the postmortem uses.",
      "Low-stakes task tracking — it's built for the messy live hour.",
    ],
    reviews: [
      { by: "@sam-otoole", when: "2 weeks ago", text: "One timeline, timestamps on everything. The postmortem wrote itself." },
    ],
  },
  "docs-writer": {
    claimed: false, updated: "1 week ago",
    def:
      "---\nslug: docs-writer\nname: Docs Writer\nkind: operational-agent-profile\n" +
      "summary: Keeps reference docs in sync with the code they describe.\n---\n\n" +
      "# Docs Writer\n\n" +
      "You are a docs writer. Keep reference docs in sync with the code they describe\n" +
      "and fix what's now wrong.\n\n" +
      "## Operating Rules\n\n" +
      "- Match the docs to the current code, not the intended design.\n" +
      "- Show a runnable example for each documented flag.\n" +
      "- Cut stale sections rather than caveating them.",
    samples: [
      { title: "Corrected the --skill flag docs", type: "report", when: "6 days ago",
        summary: "Clarified that --skill is a compatibility alias, not a skill installer, and added a runnable example." },
      { title: "Pruned three stale config pages", type: "report", when: "2 weeks ago",
        summary: "Removed docs for options that no longer exist rather than leaving them behind a 'deprecated' note." },
    ],
    bestFor: [
      "Reconciling reference docs with what the code actually does now.",
      "Adding a runnable example to every flag and option.",
      "Deleting stale docs instead of burying them in caveats.",
    ],
    notFor: [
      "Tutorials and narrative guides — it keeps reference accurate.",
      "Deciding the design; it documents the code as built.",
      "Marketing pages or launch posts.",
    ],
    reviews: [
      { by: "@harlowe", when: "3 weeks ago", text: "It deletes wrong docs instead of caveating them. My reference finally matches reality." },
    ],
  },
  "design-critic": {
    claimed: true, updated: "1 week ago",
    def:
      "---\nslug: design-critic\nname: Design Critic\nkind: operational-agent-profile\n" +
      "summary: Reviews UI work for hierarchy, spacing, and accessibility gaps.\n---\n\n" +
      "# Design Critic\n\n" +
      "You are a design critic. Review UI work for hierarchy, spacing, and\n" +
      "accessibility gaps, and say exactly what to change.\n\n" +
      "## Operating Rules\n\n" +
      "- Name the element and the fix, not a vibe.\n" +
      "- Check contrast against WCAG AA before approving.\n" +
      "- Put hierarchy problems ahead of cosmetic ones.",
    samples: [
      { title: "Secondary text fails WCAG AA", type: "review", when: "5 days ago",
        summary: "13px text on #f6f7f8 measured 3.1:1; recommended #4b5058 or a size bump to clear 4.5:1." },
      { title: "Flattened a broken card hierarchy", type: "review", when: "2 weeks ago",
        summary: "Called out three competing headings on one card and gave a concrete weight-and-spacing fix." },
    ],
    bestFor: [
      "A concrete critique of hierarchy, spacing, and contrast.",
      "Catching accessibility gaps before they reach users.",
      "Turning a vague 'feels off' into a specific change.",
    ],
    notFor: [
      "Producing the design — it critiques, it doesn't mock up.",
      "Brand or visual identity direction.",
      "Backend or logic review; it reviews rendered UI.",
    ],
    reviews: [
      { by: "@ui-vera", when: "1 week ago", text: "Gives the hex code and the ratio, not 'maybe darker?'. Actionable every time." },
      { by: "@donovan", when: "1 month ago", text: "Ranks hierarchy issues above cosmetics, which is how I wish humans reviewed." },
    ],
  },
  "product-analyst": {
    claimed: false, updated: "2 weeks ago",
    def:
      "---\nslug: product-analyst\nname: Product Analyst\nkind: operational-agent-profile\n" +
      "summary: Reads usage data and returns the one number that changed and why.\n---\n\n" +
      "# Product Analyst\n\n" +
      "You are a product analyst. Read usage data and return the one number that\n" +
      "changed and the most likely reason.\n\n" +
      "## Operating Rules\n\n" +
      "- Lead with the single metric that moved.\n" +
      "- Offer the likeliest cause, flagged as a hypothesis.\n" +
      "- Say when the data can't answer the question.",
    samples: [
      { title: "Activation dipped 4 points", type: "report", when: "1 week ago",
        summary: "Traced a week-over-week activation drop to the new signup step; drop-off concentrates at email verify." },
      { title: "Weekly metric readout", type: "report", when: "3 weeks ago",
        summary: "Surfaced the one metric that moved and named what the current data cannot yet explain." },
    ],
    bestFor: [
      "Cutting a dashboard down to the one number that moved.",
      "A first, clearly-labeled hypothesis for why it moved.",
      "Honest 'the data can't tell us' when that's the truth.",
    ],
    notFor: [
      "Proving causation — it hypothesizes, an experiment confirms.",
      "Building the data pipeline; it reads what you have.",
      "Setting the roadmap off one week of numbers.",
    ],
    reviews: [
      { by: "@quantkate", when: "2 weeks ago", text: "One number, one hypothesis, labeled as a hypothesis. That honesty is why I trust it." },
    ],
  },
  "ios-ux-critic": {
    claimed: false, updated: "1 month ago",
    def:
      "---\nslug: ios-ux-critic\nname: iOS UX Critic\nkind: operational-agent-profile\n" +
      "summary: Reviews iOS flows from screenshots for friction and inconsistency.\n---\n\n" +
      "# iOS UX Critic\n\n" +
      "You are an iOS UX critic. Review flows from screenshots for friction,\n" +
      "inconsistency, and platform-convention breaks.\n\n" +
      "## Operating Rules\n\n" +
      "- Judge against the iOS Human Interface Guidelines, not web habits.\n" +
      "- Point to the screen and the specific friction.\n" +
      "- Separate a real bug from a taste call.",
    samples: [],
    bestFor: [
      "Screenshot-based review of an iOS flow against platform conventions.",
      "Spotting friction and inconsistency a spec review misses.",
      "A second opinion before you hand a flow to engineering.",
    ],
    notFor: [
      "Android or web — it reasons from iOS conventions.",
      "Live device testing; it works from screenshots.",
      "Visual design production or asset creation.",
    ],
    reviews: [],
  },
  "cashu-protocol-reviewer": {
    claimed: false, updated: "1 month ago",
    def:
      "---\nslug: cashu-protocol-reviewer\nname: Cashu Protocol Reviewer\nkind: operational-agent-profile\n" +
      "summary: Audits Cashu wallet and mint designs for correctness and recovery bugs.\n---\n\n" +
      "# Cashu Protocol Reviewer\n\n" +
      "You are a Cashu protocol reviewer. Audit wallet and mint designs for\n" +
      "correctness, double-spend, and recovery bugs.\n\n" +
      "## Operating Rules\n\n" +
      "- Trace the token lifecycle: mint, swap, melt, recover.\n" +
      "- Assume the network and the mint can misbehave.\n" +
      "- Flag any path that can lose funds, even if unlikely.",
    samples: [],
    bestFor: [
      "Auditing a wallet or mint design for fund-loss paths.",
      "Reasoning through mint, swap, melt, and recovery flows.",
      "A protocol-level second read before an implementation lands.",
    ],
    notFor: [
      "General crypto or non-Cashu ecash schemes.",
      "Line-by-line code audit; it reviews the protocol design.",
      "Legal or regulatory judgment about running a mint.",
    ],
    reviews: [
      { by: "@nutsack-dev", when: "1 month ago", text: "Read the definition before installing — it actually traces the melt-and-recover path most reviews skip." },
    ],
  },
  "pdf-accountant": {
    claimed: false, updated: "2 months ago",
    def:
      "---\nslug: pdf-accountant\nname: PDF Accountant\nkind: operational-agent-profile\n" +
      "summary: Reviews financial PDFs and reconciles the figures against the ledger.\n---\n\n" +
      "# PDF Accountant\n\n" +
      "You are an accountant. Read financial PDFs and reconcile the figures against\n" +
      "the ledger, line by line.\n\n" +
      "## Operating Rules\n\n" +
      "- Reconcile every line; report the ones that don't tie out.\n" +
      "- Never overwrite the source figures — annotate them.\n" +
      "- Show your arithmetic so a human can check it.",
    samples: [],
    bestFor: [
      "Reconciling a PDF statement against a ledger, line by line.",
      "Surfacing exactly which figures don't tie out.",
      "Keeping a checkable audit trail of the arithmetic.",
    ],
    notFor: [
      "Filing or signing off — it reconciles, an accountant approves.",
      "Tax advice or interpretation of the numbers.",
      "Editing the source documents; it annotates, never overwrites.",
    ],
    reviews: [],
  },
};

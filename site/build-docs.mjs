import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(root, "docs");

const navItems = [
  ["Overview", "/docs"],
  ["Quickstart", "/docs/quickstart"],
  ["Core concepts", "/docs/concepts"],
  ["CLI guide", "/docs/cli"],
  ["Installing", "/docs/installing"],
  ["Authoring", "/docs/authoring"],
  ["Harnesses", "/docs/harnesses"],
  ["Safety", "/docs/safety"],
  ["Examples", "/docs/examples"],
  ["Reference", "/docs/reference"],
  ["Troubleshooting", "/docs/troubleshooting"]
];

const pages = [
  {
    slug: "index",
    path: "/docs",
    title: "Docs",
    eyebrow: "Docs",
    h1: "Use awesome-agents without leaving the site.",
    description: "Install reusable operational agent profiles, author your own source repositories, and target Codex, Claude Code, OpenCode, or tenex-edge.",
    body: `
      <section class="docs-section docs-section-first">
        <p class="eyebrow">Start here</p>
        <h2>Pick the workflow you need.</h2>
        <div class="docs-card-grid">
          ${card("Quickstart", "/docs/quickstart", "Install, preview, and run one profile.")}
          ${card("Installing", "/docs/installing", "Choose sources, profile selectors, harness targets, and scope.")}
          ${card("Authoring", "/docs/authoring", "Create agent.yaml sources with scripts, references, and declared skills.")}
          ${card("Harnesses", "/docs/harnesses", "See where each generated profile file is written.")}
          ${card("CLI guide", "/docs/cli", "Review every command and the common flags.")}
          ${card("Troubleshooting", "/docs/troubleshooting", "Fix missing harnesses, profile lookup, and safety errors.")}
        </div>
      </section>
      <section class="docs-section">
        <p class="eyebrow">Mental model</p>
        <h2>Profiles are operational agents, not skills.</h2>
        <p>
          The command shape mirrors <code>npx skills</code>, but the installed
          artifact is an agent profile: identity, role instructions, optional
          model preference, support material, and harness-specific configuration.
        </p>
        <div class="docs-callout">
          <strong>No default source.</strong>
          <span>Every install names a local path, GitHub shorthand, or GitHub URL.</span>
        </div>
      </section>
    `
  },
  {
    slug: "quickstart",
    path: "/docs/quickstart",
    title: "Quickstart",
    eyebrow: "Quickstart",
    h1: "Install, preview, and run a profile.",
    description: "The shortest path from a source repository to a working agent profile in your harness.",
    body: `
      <section class="docs-section docs-section-first">
        <p class="eyebrow">Four steps</p>
        <h2>Start with a dry run.</h2>
        <div class="docs-steps">
          ${step("1", "Inspect source profiles", "npx awesome-agents add owner/repo --list")}
          ${step("2", "Preview writes", "npx awesome-agents add owner/repo --agent triage-agent --dry-run")}
          ${step("3", "Install the profile", "npx awesome-agents add owner/repo --agent triage-agent")}
          ${step("4", "Run it", "codex --profile triage-agent\nclaude --agent triage-agent\nopencode")}
        </div>
      </section>
      <section class="docs-section">
        <p class="eyebrow">Local development</p>
        <h2>Use a checkout while authoring profiles.</h2>
        ${code("npm install\nnpm test\nnode ./bin/awesome-agents.js add ./test/fixtures/profile-source --agent triage-agent --dry-run")}
      </section>
    `
  },
  {
    slug: "concepts",
    path: "/docs/concepts",
    title: "Core Concepts",
    eyebrow: "Core concepts",
    h1: "Sources, profiles, harnesses, and scope.",
    description: "The CLI keeps reusable profile content separate from local harness installation details.",
    body: `
      <section class="docs-section docs-section-first">
        <p class="eyebrow">Model</p>
        <h2>The source is neutral. The output is harness-specific.</h2>
        <dl class="docs-dl">
          <div>
            <dt>Profile source</dt>
            <dd>A repository or local checkout containing <code>agents/&lt;slug&gt;/agent.yaml</code> style definitions.</dd>
          </div>
          <div>
            <dt>Agent profile</dt>
            <dd>The reusable operational identity: instructions, summary, optional model, scripts, references, and declared skills.</dd>
          </div>
          <div>
            <dt>Harness target</dt>
            <dd>The destination renderer for Codex, Claude Code, OpenCode, or tenex-edge.</dd>
          </div>
          <div>
            <dt>Install scope</dt>
            <dd>Project-local where supported. Codex and tenex-edge install globally because those harnesses load user-level profiles.</dd>
          </div>
        </dl>
      </section>
    `
  },
  {
    slug: "cli",
    path: "/docs/cli",
    title: "CLI Guide",
    eyebrow: "CLI guide",
    h1: "The command shape mirrors npx skills.",
    description: "Use add, use, list, remove, update, and init to manage generated profile installs.",
    body: `
      <section class="docs-section docs-section-first">
        <p class="eyebrow">Commands</p>
        <h2>Profile lifecycle commands.</h2>
        <div class="docs-command-list">
          <div><code>add</code> / <code>install</code><span>Install profiles from a source.</span></div>
          <div><code>use</code><span>Render one profile without installing it.</span></div>
          <div><code>list</code> / <code>ls</code><span>Show installed profiles from the registry.</span></div>
          <div><code>remove</code> / <code>rm</code><span>Remove generated installed profiles.</span></div>
          <div><code>update</code> / <code>upgrade</code><span>Reinstall from each profile's recorded source.</span></div>
          <div><code>init</code><span>Create a starter profile source layout.</span></div>
        </div>
      </section>
      <section class="docs-section">
        <p class="eyebrow">Flags</p>
        <h2>Common options.</h2>
        <p>
          Use <code>--agent</code> or <code>--profile</code> to select profile slugs,
          <code>--harness</code> to select targets, <code>--dry-run</code> to preview
          writes, <code>--json</code> for scripts, and <code>--force</code> only when
          intentionally replacing unmanaged files.
        </p>
      </section>
    `
  },
  {
    slug: "installing",
    path: "/docs/installing",
    title: "Installing Profiles",
    eyebrow: "Installing",
    h1: "Choose a source, profile, harness, and scope.",
    description: "Install one profile, many profiles, one harness, or every detected harness.",
    body: `
      <section class="docs-section docs-section-first">
        <p class="eyebrow">Sources</p>
        <h2>Name the source explicitly.</h2>
        ${code("npx awesome-agents add ./local-profile-source --agent triage-agent\nnpx awesome-agents add owner/repo --agent triage-agent\nnpx awesome-agents add https://github.com/owner/repo --agent triage-agent")}
      </section>
      <section class="docs-section">
        <p class="eyebrow">Selectors</p>
        <h2>Select profiles with agent language.</h2>
        <p>
          <code>--agent &lt;slug&gt;</code> is the preferred selector.
          <code>--profile &lt;slug&gt;</code> is explicit. <code>--skill &lt;slug&gt;</code>
          is accepted for command-shape compatibility, but the artifact remains an
          agent profile.
        </p>
      </section>
      <section class="docs-section">
        <p class="eyebrow">Harnesses</p>
        <h2>Override detection when needed.</h2>
        ${code("npx awesome-agents add owner/repo --agent triage-agent --harness codex\nnpx awesome-agents add owner/repo --agent triage-agent --harness claude-code opencode\nnpx awesome-agents add owner/repo --all --harness '*'")}
        <p>
          Without <code>--harness</code>, the CLI detects supported harness CLIs on
          <code>PATH</code>. Noninteractive, <code>--json</code>, and
          <code>--yes</code> installs use detected defaults.
        </p>
      </section>
    `
  },
  {
    slug: "authoring",
    path: "/docs/authoring",
    title: "Authoring Profiles",
    eyebrow: "Authoring",
    h1: "Create neutral agent-profile sources.",
    description: "A source repository contains reusable agent definitions and support material under agents/<slug>/.",
    body: `
      <section class="docs-section docs-section-first">
        <p class="eyebrow">Layout</p>
        <h2>Put each profile under agents/&lt;slug&gt;/.</h2>
        ${code("agents/\n  triage-agent/\n    agent.yaml\n  ops-agent/\n    agent.agf.yaml\n    scripts/\n      heartbeat.sh\n    references/\n      runbook.md")}
      </section>
      <section class="docs-section">
        <p class="eyebrow">YAML</p>
        <h2>Minimal profile definition.</h2>
        ${code("id: triage-agent\nname: Triage Agent\ndescription: Sorts work, identifies blockers, and routes tasks.\nmodel: inherit\ninstructions: |\n  You are the triage-agent profile.\n  Preserve stated priority order, call out blockers, and leave concise handoffs.")}
      </section>
      <section class="docs-section">
        <p class="eyebrow">Support material</p>
        <h2>Scripts, references, and declared skills are installed into the profile home.</h2>
        <p>
          Agent-owned <code>scripts/</code>, <code>references/</code>, and declared
          <code>skills</code> install into <code>~/.agents/homes/&lt;slug&gt;/</code>.
          The rendered prompt includes complete paths so the harness can find them.
        </p>
      </section>
    `
  },
  {
    slug: "harnesses",
    path: "/docs/harnesses",
    title: "Harness Targets",
    eyebrow: "Harnesses",
    h1: "Each harness gets its native generated artifact.",
    description: "Codex, Claude Code, OpenCode, and tenex-edge expect different profile file locations and run flows.",
    body: `
      <section class="docs-section docs-section-first">
        <p class="eyebrow">Matrix</p>
        <h2>Install paths and run commands.</h2>
        <div class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr><th>Harness</th><th>Project install</th><th>Global install</th><th>Run command</th></tr>
            </thead>
            <tbody>
              <tr><td>Codex</td><td>Not supported</td><td><code>$CODEX_HOME/&lt;profile&gt;.config.toml</code></td><td><code>codex --profile &lt;profile&gt;</code></td></tr>
              <tr><td>Claude Code</td><td><code>.claude/agents/&lt;profile&gt;.md</code></td><td><code>$CLAUDE_HOME/agents/&lt;profile&gt;.md</code></td><td><code>claude --agent &lt;profile&gt;</code></td></tr>
              <tr><td>OpenCode</td><td><code>.opencode/agents/&lt;profile&gt;.md</code></td><td><code>$OPENCODE_CONFIG_DIR/agents/&lt;profile&gt;.md</code></td><td><code>opencode</code>, then invoke <code>@&lt;profile&gt;</code></td></tr>
              <tr><td>tenex-edge</td><td>Not supported</td><td><code>$TENEX_EDGE_HOME/agents/&lt;profile&gt;.json</code></td><td><code>tenex-edge launch &lt;profile&gt;</code></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    `
  },
  {
    slug: "safety",
    path: "/docs/safety",
    title: "Safety Model",
    eyebrow: "Safety",
    h1: "Generated files are managed conservatively.",
    description: "awesome-agents refuses to overwrite or delete unmanaged harness files by default.",
    body: `
      <section class="docs-section docs-section-first">
        <p class="eyebrow">Rules</p>
        <h2>The generated marker controls ownership.</h2>
        <ul class="docs-list">
          <li>Generated files contain the marker <code>Generated by awesome-agents</code>.</li>
          <li>The CLI refuses to overwrite or delete unmarked harness files unless <code>--force</code> is passed.</li>
          <li><code>--dry-run</code> previews install, update, remove, and init writes.</li>
          <li>The registry tracks only files this CLI generated.</li>
        </ul>
      </section>
      <section class="docs-section">
        <p class="eyebrow">Registry</p>
        <h2>Install records are local.</h2>
        <p>
          Project installs use <code>.awesome-agents/installed.json</code>.
          Global installs use <code>~/.awesome-agents/installed.json</code>.
        </p>
      </section>
    `
  },
  {
    slug: "examples",
    path: "/docs/examples",
    title: "Examples",
    eyebrow: "Examples",
    h1: "Common workflows.",
    description: "Copy the command shape you need and replace the source or profile slug.",
    body: `
      <section class="docs-section docs-section-first">
        <p class="eyebrow">Commands</p>
        <h2>Install, render, list, remove, and update.</h2>
        ${code("npx awesome-agents add owner/repo --list\nnpx awesome-agents add owner/repo --agent triage-agent\nnpx awesome-agents add owner/repo --agent triage-agent --harness codex --global\nnpx awesome-agents add owner/repo --all --dry-run\nnpx awesome-agents use owner/repo@triage-agent --harness claude-code\nnpx awesome-agents list --json\nnpx awesome-agents remove triage-agent --agent codex --dry-run\nnpx awesome-agents update triage-agent --agent codex")}
      </section>
    `
  },
  {
    slug: "reference",
    path: "/docs/reference",
    title: "Reference",
    eyebrow: "Reference",
    h1: "Environment variables and output modes.",
    description: "Use environment variables to override harness homes and output flags for automation.",
    body: `
      <section class="docs-section docs-section-first">
        <p class="eyebrow">Environment</p>
        <h2>Harness home variables.</h2>
        <div class="docs-command-list compact">
          <div><code>CODEX_HOME</code><span>Codex profile config directory. Defaults to <code>~/.codex</code>.</span></div>
          <div><code>CLAUDE_HOME</code><span>Claude Code user agent directory root. Defaults to <code>~/.claude</code>.</span></div>
          <div><code>OPENCODE_CONFIG_DIR</code><span>OpenCode config directory. Defaults to <code>~/.config/opencode</code>.</span></div>
          <div><code>TENEX_EDGE_HOME</code><span>tenex-edge local agent directory root. Defaults to <code>~/.tenex-edge</code>.</span></div>
          <div><code>NO_COLOR=1</code><span>Disable ANSI color in human-readable output.</span></div>
        </div>
      </section>
      <section class="docs-section">
        <p class="eyebrow">Automation</p>
        <h2>Use JSON when output is consumed by scripts.</h2>
        <p>Human-readable output is for people. Use <code>--json</code> for stable machine-readable output.</p>
      </section>
    `
  },
  {
    slug: "troubleshooting",
    path: "/docs/troubleshooting",
    title: "Troubleshooting",
    eyebrow: "Troubleshooting",
    h1: "Fast checks for common failures.",
    description: "Most install issues are source selection, harness detection, or safety-marker problems.",
    body: `
      <section class="docs-section docs-section-first">
        <p class="eyebrow">Checks</p>
        <h2>Work from the error surface.</h2>
        <dl class="docs-dl">
          <div>
            <dt>No harness detected</dt>
            <dd>Pass <code>--harness codex</code>, <code>--harness claude-code</code>, <code>--harness opencode</code>, or <code>--harness tenex-edge</code>.</dd>
          </div>
          <div>
            <dt>Profile not found</dt>
            <dd>Run <code>npx awesome-agents add &lt;source&gt; --list</code> and confirm the slug under <code>agents/&lt;slug&gt;/</code>.</dd>
          </div>
          <div>
            <dt>Existing unmanaged file</dt>
            <dd>The CLI found a target file without the generated marker. Inspect it, move it, or intentionally pass <code>--force</code>.</dd>
          </div>
          <div>
            <dt>Codex cannot find the profile</dt>
            <dd>Run <code>codex --profile &lt;profile&gt;</code> with the plain profile name. Do not pass a file path.</dd>
          </div>
        </dl>
      </section>
    `
  }
];

function card(title, href, text) {
  return `<a class="docs-card" href="${href}"><strong>${title}</strong><span>${text}</span></a>`;
}

function step(number, title, command) {
  return `<div><span class="docs-step-n">${number}</span><h3>${title}</h3>${code(command)}</div>`;
}

function code(value) {
  return `<pre class="docs-code"><code>${escapeHtml(value)}</code></pre>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render(page) {
  return `<!doctype html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<title>${page.title} - awesome-agents docs</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta property="og:title" content="${page.title} - awesome-agents docs">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&family=Fira+Mono:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<a class="skip" href="#docs-main">Skip to docs</a>

${header()}

<main class="wrap docs-page" id="docs-main">
  <section class="docs-hero docs-hero-compact">
    <p class="eyebrow">${page.eyebrow}</p>
    <h1 class="docs-title">${page.h1}</h1>
    <p class="docs-desc">${page.description}</p>
    ${page.slug === "index" ? quickCommand() : ""}
  </section>

  <div class="docs-shell">
    <aside class="docs-toc" aria-label="Docs table of contents">
      <nav>
        ${navItems.map(([label, href]) => `<a href="${href}"${href === page.path ? ' aria-current="page"' : ""}>${label}</a>`).join("\n        ")}
      </nav>
    </aside>
    <article class="docs-content">
      ${page.body}
    </article>
  </div>
</main>

${footer()}

<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script src="/docs.js"></script>
</body>
</html>
`;
}

function header() {
  return `<header class="nav">
  <div class="nav-inner">
    <a class="brand" href="/" aria-label="awesome-agents home">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="2" r="1.3" fill="currentColor"/>
          <path d="M10 3.3v1.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <rect x="3" y="6" width="14" height="12" rx="4" stroke="currentColor" stroke-width="1.7"/>
          <circle cx="7.6" cy="12.3" r="1.4" fill="currentColor"/>
          <circle cx="12.4" cy="12.3" r="1.4" fill="currentColor"/>
        </svg>
      </span>
      <span class="brand-sep" aria-hidden="true">/</span>
      <span class="brand-name">awesome-agents</span>
    </a>
    <nav class="nav-links" aria-label="Primary">
      <a href="/#leaderboard">Agents</a>
      <a href="/docs" aria-current="page">Docs</a>
      <a href="https://www.npmjs.com/package/awesome-agents" rel="noopener">npm</a>
      <a href="https://github.com/pablof7z/awesome-agents" rel="noopener">GitHub</a>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Toggle color theme">
        <svg class="ico-sun" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 .8v2M8 13.2v2M.8 8h2M13.2 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        <svg class="ico-moon" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.3A5.6 5.6 0 0 1 6.7 2.5a5.6 5.6 0 1 0 6.8 6.8Z" fill="currentColor"/></svg>
      </button>
    </nav>
  </div>
</header>`;
}

function quickCommand() {
  return `<div class="terminal docs-terminal" role="group" aria-label="Quick install command">
      <code class="cmd"><span class="tok-prompt">$</span> npx awesome-agents add <span class="tok-arg">owner/repo</span> <span class="tok-flag">--agent</span> <span class="tok-val">triage-agent</span></code>
      <button class="copy" type="button" data-copy="npx awesome-agents add owner/repo --agent triage-agent" aria-label="Copy quick install command">
        <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M3.2 10.5H2.6A1.1 1.1 0 0 1 1.5 9.4V2.6A1.1 1.1 0 0 1 2.6 1.5h6.8a1.1 1.1 0 0 1 1.1 1.1v.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>
      </button>
    </div>`;
}

function footer() {
  return `<footer class="foot">
  <div class="wrap foot-inner">
    <span class="brand small">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="2" r="1.3" fill="currentColor"/>
          <path d="M10 3.3v1.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <rect x="3" y="6" width="14" height="12" rx="4" stroke="currentColor" stroke-width="1.7"/>
          <circle cx="7.6" cy="12.3" r="1.4" fill="currentColor"/>
          <circle cx="12.4" cy="12.3" r="1.4" fill="currentColor"/>
        </svg>
      </span>
      <span class="brand-name">awesome-agents</span>
    </span>
    <nav aria-label="Footer">
      <a href="/docs">Docs</a>
      <a href="https://github.com/pablof7z/awesome-agents" rel="noopener">GitHub</a>
      <a href="https://www.npmjs.com/package/awesome-agents" rel="noopener">npm</a>
      <a href="/#leaderboard">Directory</a>
    </nav>
    <span class="foot-note">Command shape mirrors <code>npx&nbsp;skills</code>. The unit is an agent, not a skill.</span>
  </div>
</footer>`;
}

await fs.rm(docsDir, { recursive: true, force: true });
await fs.mkdir(docsDir, { recursive: true });

for (const page of pages) {
  const target = path.join(docsDir, page.slug === "index" ? "index.html" : `${page.slug}.html`);
  await fs.writeFile(target, render(page));
}

console.log(`Generated ${pages.length} docs pages.`);

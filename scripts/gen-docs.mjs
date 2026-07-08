#!/usr/bin/env node
// Generates the static multi-page docs under site/docs/ from a single content
// model, so the shell/sidebar stay consistent without a build step at deploy
// time. Run: node scripts/gen-docs.mjs  (output HTML is committed; Vercel serves
// it statically).
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "site", "docs");

/* ---------- content model ---------- */
const GROUPS = ["Getting started", "Usage", "Authoring", "Reference"];

const PAGES = [
  {
    slug: "index", url: "/docs", group: "Getting started",
    nav: "Introduction", title: "Introduction",
    desc: "What awesome-agents installs, and why it lets you audit before you run.",
    blocks: [
      ["callout", 'New here? Jump to <a href="/docs/installation">Installation</a> to run your first install, or browse the <a href="/#leaderboard">directory</a> of published profiles.'],
      ["h2", "What you install"],
      ["p", "<code>awesome-agents</code> is an <code>npx</code>-compatible installer for reusable agent profiles. It mirrors the useful parts of <code>npx skills</code>, but the unit is a whole operational agent profile, not a skill: its prompt, model, and tool boundaries."],
      ["p", "A profile is read from a YAML or Markdown file under <code>agents/&lt;slug&gt;/</code>, adapted for the harness you target, and written into the right place for Claude&nbsp;Code, Codex, OpenCode, Goose, or tenex-edge. Sources are GitHub repos, Git URLs, or local checkouts."],
      ["h2", "Read before you run"],
      ["p", "Every profile ships with an open definition and a record of what it has actually done. You read the exact prompt and tool boundaries, check the published samples, and only then install. Nothing is a black box."],
      ["h2", "Command shape"],
      ["p", "The commands follow <code>npx skills</code>: <code>add</code> to install, <code>use</code> to render without installing, plus <code>list</code>, <code>remove</code>, <code>update</code>, and <code>init</code>. Everything is scriptable; pass <code>--json</code> for machine-readable output."],
      ["h2", "Next steps"],
      ["cards", [
        ["Installation", "Install from npm and run it in your harness.", "/docs/installation"],
        ["Commands", "The full command and alias reference.", "/docs/commands"],
        ["Source format", "Author your own agent-profile source.", "/docs/source-format"],
      ]],
    ],
  },
  {
    slug: "installation", url: "/docs/installation", group: "Getting started",
    nav: "Installation", title: "Installation",
    desc: "Install a profile from npm, or from a local checkout during development.",
    blocks: [
      ["h2", "From npm"],
      ["p", "Run it straight from npm with <code>npx</code>. Point it at a source and pick an agent:"],
      ["code", "$ npx awesome-agents add owner/repo --agent triage-agent\n$ npx awesome-agents add owner/repo --agent triage-agent --harness tenex-edge"],
      ["p", "Without <code>--harness</code>, the CLI detects the harness CLIs on your <code>PATH</code> and installs for each. If none are detected, pass <code>--harness</code> explicitly."],
      ["h2", "From a local checkout"],
      ["p", "Working on a source repo? Run the CLI from the checkout and preview writes with <code>--dry-run</code>:"],
      ["code", "$ npm install\n$ npm test\n$ node ./bin/awesome-agents.js add ./test/fixtures/profile-source --agent triage-agent --dry-run"],
    ],
  },
  {
    slug: "commands", url: "/docs/commands", group: "Usage",
    nav: "Commands", title: "Commands",
    desc: "The command surface, mirroring npx skills.",
    blocks: [
      ["h2", "Primary commands"],
      ["table", ["Command", "What it does"], [
        ["<code>add &lt;source&gt;</code>", "Install a profile from a source package."],
        ["<code>install &lt;source&gt;</code>", "Alias for <code>add</code>."],
        ["<code>use &lt;source[@profile]&gt;</code>", "Render a single profile without installing it."],
        ["<code>list</code> / <code>ls</code>", "Show installed profiles."],
        ["<code>remove &lt;profile…&gt;</code> / <code>rm</code>", "Remove installed profiles."],
        ["<code>update [profile…]</code> / <code>upgrade</code>", "Reinstall from the recorded source."],
        ["<code>init [name]</code>", "Create a profile-source skeleton."],
      ]],
      ["h2", "Scripting"],
      ["p", "Human output uses subtle ANSI color; set <code>NO_COLOR=1</code> to disable it. Pass <code>--json</code> to any command for machine-readable output that is safe to parse."],
    ],
  },
  {
    slug: "options", url: "/docs/options", group: "Usage",
    nav: "Install options", title: "Install options",
    desc: "Flags that control what gets installed, where, and how.",
    blocks: [
      ["h2", "Selecting a profile"],
      ["ul", [
        "<code>--agent &lt;slug&gt;</code> selects an agent profile, e.g. <code>--agent triage-agent</code>.",
        "<code>--profile &lt;slug&gt;</code> or <code>--skill &lt;slug&gt;</code> are explicit aliases. <code>--skill</code> is command-shape compatibility only; it does not mean the artifact is a skill.",
        "Omit a selector in an interactive terminal to choose from a checkbox list; every profile is selected by default.",
      ]],
      ["h2", "Selecting harnesses"],
      ["ul", [
        "<code>--harness codex|claude-code|opencode|goose|tenex-edge|*</code> targets specific harnesses. Without it, the CLI detects harness CLIs on <code>PATH</code>.",
        "<code>--all</code> installs every profile to every supported harness.",
        "<code>--yes</code> accepts the detected profile and harness selections without opening selectors.",
      ]],
      ["h2", "Scope"],
      ["ul", [
        "<code>--project</code> installs at project level where supported; <code>--global</code> installs at user level.",
        "Codex and tenex-edge always install globally.",
      ]],
      ["h2", "Preview and output"],
      ["ul", [
        "<code>--dry-run</code> previews writes without touching disk.",
        "<code>--list</code> inspects available source profiles without installing.",
        "<code>--json</code> for machine-readable output; <code>NO_COLOR=1</code> disables color.",
      ]],
    ],
  },
  {
    slug: "harness-targets", url: "/docs/harness-targets", group: "Usage",
    nav: "Harness targets", title: "Harness targets",
    desc: "Where profiles land for each harness, and how to run them.",
    blocks: [
      ["h2", "Project installs"],
      ["p", "Project-level installs write into the current repo:"],
      ["table", ["Harness", "Path"], [
        ["<code>claude-code</code>", "<code>.claude/agents/&lt;profile&gt;.md</code>"],
        ["<code>opencode</code>", "<code>.opencode/agents/&lt;profile&gt;.md</code>"],
        ["<code>goose</code>", "<code>.agents/agents/&lt;profile&gt;.md</code>"],
        ["<code>codex</code>", "Not supported; loads from user config."],
        ["<code>tenex-edge</code>", "Not supported; agents are machine-local."],
      ]],
      ["h2", "Global installs"],
      ["table", ["Harness", "Path"], [
        ["<code>codex</code>", "<code>$CODEX_HOME/&lt;profile&gt;.config.toml</code>"],
        ["<code>claude-code</code>", "<code>$CLAUDE_HOME/agents/&lt;profile&gt;.md</code>"],
        ["<code>opencode</code>", "<code>$OPENCODE_CONFIG_DIR/agents/&lt;profile&gt;.md</code>"],
        ["<code>goose</code>", "<code>$GOOSE_HOME/agents/&lt;profile&gt;.md</code>"],
        ["<code>tenex-edge</code>", "<code>$TENEX_EDGE_HOME/agents/&lt;profile&gt;.json</code>"],
      ]],
      ["p", "Each falls back to a sensible home (<code>~/.codex</code>, <code>~/.claude</code>, <code>~/.config/opencode</code>, <code>~/.agents</code>, <code>~/.tenex-edge</code>) when the env var is unset."],
      ["h2", "Running installed profiles"],
      ["p", "After an install, the CLI prints the run command for each harness CLI it finds on <code>PATH</code>:"],
      ["code", "$ codex --profile <profile>\n$ claude --agent <profile>\n$ goose session  # then @<profile>\n$ tenex-edge launch <profile>"],
      ["p", "Codex expects a plain profile name, not a path passed to <code>--profile</code>. For Goose, start <code>goose session</code> and invoke the agent by name with <code>@&lt;profile&gt;</code>."],
    ],
  },
  {
    slug: "source-format", url: "/docs/source-format", group: "Authoring",
    nav: "Source format", title: "Source format",
    desc: "The repo-neutral layout an agent-profile source uses.",
    blocks: [
      ["h2", "Directory layout"],
      ["p", "An agent-profile source is a folder of <code>agents/&lt;slug&gt;/</code> definitions:"],
      ["code", "agents/\n  triage-agent/\n    agent.yaml\n  ops-agent/\n    agent.agf.yaml\n    skills/\n      gh-pages-publisher/\n        SKILL.md\n    scripts/\n      heartbeat.sh\n    references/\n      runbook.md"],
      ["p", "YAML profile files are preferred. The loader also accepts Markdown files with YAML frontmatter for compatibility with <code>.agent.md</code>-style profiles."],
      ["h2", "Owned scripts and references"],
      ["p", "Agent-owned <code>scripts/</code> and <code>references/</code> are installed into <code>~/.agents/homes/&lt;slug&gt;/scripts</code> and <code>~/.agents/homes/&lt;slug&gt;/references</code>, never into a harness configuration directory."],
    ],
  },
  {
    slug: "skills", url: "/docs/skills", group: "Authoring",
    nav: "Declaring skills", title: "Declaring skills",
    desc: "Attach immediately relevant skills to a profile.",
    blocks: [
      ["h2", "Declaring skills"],
      ["p", "A profile can declare the skills it needs:"],
      ["code", "skills:\n  - gh-pages-publisher\n  - pablof7z/tenex-edge basic-skill"],
      ["h2", "Resolution"],
      ["p", "Bare skill names are resolved from the profile directory, then the source checkout, then <code>~/.agents/skills</code>. Source-qualified entries use the same source-plus-skill selector shape as <code>npx skills add &lt;source&gt; --skill &lt;skill&gt;</code>."],
      ["p", "Declared skills are copied into <code>~/.agents/homes/&lt;slug&gt;/skills/&lt;skill&gt;</code> and listed with complete paths in the installed agent prompt."],
    ],
  },
  {
    slug: "examples", url: "/docs/examples", group: "Reference",
    nav: "Examples", title: "Examples",
    desc: "Copy-paste commands for common tasks.",
    blocks: [
      ["h2", "Common commands"],
      ["code", "$ npx awesome-agents add owner/repo --list\n$ npx awesome-agents add owner/repo --agent triage-agent\n$ npx awesome-agents add owner/repo --agent triage-agent --harness codex --global\n$ npx awesome-agents add owner/repo --agent triage-agent --harness tenex-edge\n$ npx awesome-agents add owner/repo --all --dry-run\n$ npx awesome-agents use owner/repo --agent triage-agent --harness claude-code\n$ npx awesome-agents list --json\n$ npx awesome-agents remove triage-agent --agent codex\n$ npx awesome-agents update triage-agent --agent codex --dry-run"],
    ],
  },
  {
    slug: "registry", url: "/docs/registry", group: "Reference",
    nav: "Registry & safety", title: "Registry & safety",
    desc: "How the CLI tracks installs and protects your files.",
    blocks: [
      ["h2", "The registry"],
      ["p", "The CLI keeps its own registry at <code>.awesome-agents/installed.json</code> for project installs, or <code>~/.awesome-agents/installed.json</code> for global installs. <code>list</code>, <code>remove</code>, and <code>update</code> read from it."],
      ["h2", "Overwrite safety"],
      ["p", "Generated files are marked <code>Generated by awesome-agents</code>. The CLI refuses to overwrite or delete any file that does not contain that marker unless you pass <code>--force</code>, so it never clobbers something it did not write."],
      ["p", 'Full reference and source live on <a href="https://github.com/pablof7z/awesome-agents" rel="noopener">GitHub</a>.'],
    ],
  },
];

/* ---------- helpers ---------- */
const escapeCode = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slugify = (s) => s.toLowerCase().replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const stripTags = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");

function codeBlock(text) {
  const body = text.split("\n").map((line) => {
    if (line.startsWith("$ ")) return '<span class="c-pmt">$ </span>' + escapeCode(line.slice(2));
    return escapeCode(line);
  }).join("\n");
  return `<div class="doc-code"><pre><code>${body}</code></pre></div>`;
}

const ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8h8M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const INFO = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 7.2v3.4M8 5.1v.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

function renderBlocks(blocks) {
  const toc = [];
  const html = blocks.map((b) => {
    const [type, a, c] = b;
    if (type === "h2") { const id = slugify(a); toc.push({ level: 2, id, text: stripTags(a) }); return `<h2 id="${id}">${a}</h2>`; }
    if (type === "h3") { const id = slugify(a); toc.push({ level: 3, id, text: stripTags(a) }); return `<h3 id="${id}">${a}</h3>`; }
    if (type === "p") return `<p>${a}</p>`;
    if (type === "ul") return `<ul>${a.map((li) => `<li>${li}</li>`).join("")}</ul>`;
    if (type === "code") return codeBlock(a);
    if (type === "callout") return `<div class="doc-callout">${INFO}<div>${a}</div></div>`;
    if (type === "table") {
      const head = `<thead><tr>${a.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
      const body = `<tbody>${c.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>`;
      return `<div class="doc-table-wrap"><table class="doc-table">${head}${body}</table></div>`;
    }
    if (type === "cards") {
      return `<div class="doc-cards">${a.map(([t, body, href]) =>
        `<a class="doc-card" href="${href}"><span class="doc-card-t">${t}${ARROW}</span><p>${body}</p></a>`).join("")}</div>`;
    }
    return "";
  }).join("\n");
  return { html, toc };
}

/* ---------- shell pieces ---------- */
const NAV_SVG = `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="2" r="1.3" fill="currentColor"/>
          <path d="M10 3.3v1.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <rect x="3" y="6" width="14" height="12" rx="4" stroke="currentColor" stroke-width="1.7"/>
          <circle cx="7.6" cy="12.3" r="1.4" fill="currentColor"/>
          <circle cx="12.4" cy="12.3" r="1.4" fill="currentColor"/>
        </svg>`;

function nav() {
  return `<header class="nav" id="nav">
  <div class="nav-inner">
    <a class="brand" href="/" aria-label="awesome-agents home">
      <span class="brand-mark" aria-hidden="true">${NAV_SVG}</span>
      <span class="brand-name"><b>awesome</b><span class="slash">/</span>agents</span>
    </a>
    <nav class="nav-links" aria-label="Primary">
      <a href="/#leaderboard">Directory</a>
      <a class="hide-sm" href="/docs" aria-current="page">Docs</a>
      <a class="hide-sm" href="https://www.npmjs.com/package/awesome-agents" rel="noopener">npm</a>
      <span class="nav-sep" aria-hidden="true"></span>
      <a class="nav-cta" href="https://github.com/pablof7z/awesome-agents" rel="noopener">GitHub</a>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Toggle color theme">
        <svg class="ico-sun" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 .8v2M8 13.2v2M.8 8h2M13.2 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        <svg class="ico-moon" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.3A5.6 5.6 0 0 1 6.7 2.5a5.6 5.6 0 1 0 6.8 6.8Z" fill="currentColor"/></svg>
      </button>
    </nav>
  </div>
</header>`;
}

function sidebarInner(currentSlug) {
  return GROUPS.map((g) => {
    const items = PAGES.filter((p) => p.group === g);
    if (!items.length) return "";
    const links = items.map((p) =>
      `<a href="${p.url}"${p.slug === currentSlug ? ' aria-current="page"' : ""}>${p.nav}</a>`).join("\n        ");
    return `<div class="doc-nav-group">
        <p class="doc-nav-title">${g}</p>
        ${links}
      </div>`;
  }).join("\n      ");
}

function toc(entries) {
  if (!entries.length) return "";
  const links = entries.map((e) =>
    `<a href="#${e.id}" class="lvl-${e.level}">${e.text}</a>`).join("\n      ");
  return `<aside class="doc-toc" aria-label="On this page">
      <p class="doc-toc-title">On this page</p>
      ${links}
    </aside>`;
}

function pager(idx) {
  const prev = PAGES[idx - 1], next = PAGES[idx + 1];
  const p = prev ? `<a class="prev" href="${prev.url}"><span class="pg-label">← Previous</span><span class="pg-title">${prev.nav}</span></a>` : "";
  const n = next ? `<a class="next" href="${next.url}"><span class="pg-label">Next →</span><span class="pg-title">${next.nav}</span></a>` : "";
  if (!p && !n) return "";
  return `<nav class="doc-pager" aria-label="Pagination">${p}${n}</nav>`;
}

function footer() {
  return `<footer class="foot">
  <div class="wrap foot-inner">
    <span class="brand small">
      <span class="brand-mark" aria-hidden="true">${NAV_SVG}</span>
      <span class="brand-name"><b>awesome</b><span class="slash">/</span>agents</span>
    </span>
    <nav aria-label="Footer">
      <a href="https://github.com/pablof7z/awesome-agents" rel="noopener">GitHub</a>
      <a href="https://www.npmjs.com/package/awesome-agents" rel="noopener">npm</a>
      <a href="/#leaderboard">Directory</a>
    </nav>
    <span class="foot-note">Command shape mirrors <code>npx&nbsp;skills</code>. The unit is an agent, not a skill.</span>
  </div>
</footer>`;
}

function page(p, idx) {
  const { html, toc: tocEntries } = renderBlocks(p.blocks);
  return `<!doctype html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#08090a" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#fbfbfa" media="(prefers-color-scheme: light)">
<title>${p.title} — awesome-agents docs</title>
<meta name="description" content="${p.desc}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/styles.css">
</head>
<body class="doc">
<a class="skip" href="#doc-main">Skip to content</a>

${nav()}

<div class="doc-shell">
  <div class="doc-layout">
    <nav class="doc-nav" aria-label="Documentation">
      ${sidebarInner(p.slug)}
    </nav>

    <main class="doc-content" id="doc-main">
      <details class="doc-menu">
        <summary>Docs menu · ${p.nav}</summary>
        <div class="doc-menu-body">
          ${sidebarInner(p.slug)}
        </div>
      </details>

      <header class="doc-head">
        <p class="doc-eyebrow">${p.group}</p>
        <h1>${p.title}</h1>
        <p class="doc-lead">${p.desc}</p>
      </header>

      ${html}

      ${pager(idx)}
    </main>

    ${toc(tocEntries)}
  </div>
</div>

${footer()}

<div id="toast" class="toast" role="status" aria-live="polite"></div>

<script src="/docs.js"></script>
</body>
</html>
`;
}

/* ---------- write ---------- */
mkdirSync(OUT, { recursive: true });
for (let i = 0; i < PAGES.length; i++) {
  const p = PAGES[i];
  const file = p.slug === "index" ? "index.html" : `${p.slug}.html`;
  writeFileSync(join(OUT, file), page(p, i));
  console.log("wrote site/docs/" + file);
}
console.log(`\n${PAGES.length} docs pages generated.`);

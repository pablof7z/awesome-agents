(function () {
  "use strict";

  var builders = window.BUILDERS || {};
  var cards = window.SOCIAL_AGENT_CARDS || {};
  var rootEl = document.getElementById("profile-root");
  var toast = document.getElementById("toast");
  var PROFILE_SECTIONS = { overview: 1, agents: 1, artifacts: 1, activity: 1, discussions: 1 };
  var TEMPLATE_SECTIONS = { readme: 1, artifacts: 1, reviews: 1, forks: 1, discussions: 1 };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmt(n) {
    return n >= 1000 ? (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + "k" : String(n);
  }

  function themeInit() {
    var doc = document.documentElement;
    var stored = null;
    try { stored = localStorage.getItem("aa-theme"); } catch (e) {}
    if (stored === "light" || stored === "dark") {
      doc.setAttribute("data-theme", stored);
      doc.classList.remove("dark", "light");
      doc.classList.add(stored);
    }
    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      var prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
      var attr = doc.getAttribute("data-theme");
      var current = attr || (doc.classList.contains("light") ? "light" : doc.classList.contains("dark") ? "dark" : (prefersDark ? "dark" : "light"));
      var next = current === "dark" ? "light" : "dark";
      doc.setAttribute("data-theme", next);
      doc.classList.remove("dark", "light");
      doc.classList.add(next);
      try { localStorage.setItem("aa-theme", next); } catch (e) {}
    });
  }

  function route() {
    var parts = location.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    if (parts[0] === "profile") return { handle: "pablof7z", section: "overview" };
    if (parts.length >= 3) {
      return {
        handle: parts[0],
        repo: parts[1],
        agent: parts[2],
        section: TEMPLATE_SECTIONS[parts[3]] ? parts[3] : "readme"
      };
    }
    return {
      handle: parts[0] || "pablof7z",
      section: PROFILE_SECTIONS[parts[1]] ? parts[1] : "overview"
    };
  }

  function cardKey(handle, repo, agent) {
    return [handle, repo, agent].join("/");
  }

  function commandFor(card) {
    return card.install || ("npx awesome-agents add " + card.source + " --agent " + card.slug);
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 1800);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve) {
      var node = document.createElement("textarea");
      node.value = text;
      node.style.position = "fixed";
      node.style.opacity = "0";
      document.body.appendChild(node);
      node.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(node);
      resolve();
    });
  }

  function iconCopy() {
    return '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M3.2 10.5H2.6A1.1 1.1 0 0 1 1.5 9.4V2.6A1.1 1.1 0 0 1 2.6 1.5h6.8a1.1 1.1 0 0 1 1.1 1.1v.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
  }

  function terminal(command, label) {
    var parts = command.match(/^npx awesome-agents add ([^\s]+) --agent ([^\s]+)$/);
    var html = parts
      ? '<span class="tok-prompt">$</span> npx awesome-agents add <span class="tok-arg">' + esc(parts[1]) + '</span> <span class="tok-flag">--agent</span> <span class="tok-val">' + esc(parts[2]) + "</span>"
      : esc(command);
    return '<div class="terminal social-terminal" role="group" aria-label="' + esc(label || "Install command") + '">' +
      '<code class="cmd">' + html + "</code>" +
      '<button class="copy" type="button" data-copy="' + esc(command) + '" aria-label="Copy install command">' + iconCopy() + "</button>" +
    "</div>";
  }

  function words(text) {
    return text.split(/\s+/).map(function (word) {
      return '<span class="reveal-word">' + esc(word) + "</span>";
    }).join(" ");
  }

  function missing(title, body) {
    rootEl.innerHTML = '<section class="social-missing">' +
      '<a class="social-back" href="/">&larr; Directory</a>' +
      '<h1>' + esc(title) + '</h1>' +
      '<p>' + esc(body) + '</p>' +
      '<a class="social-button primary" href="/">Browse agents</a>' +
    '</section>';
    document.title = title + " - awesome-agents";
  }

  function proofCards(builder) {
    return builder.proof.map(function (item) {
      return '<div class="proof-tile"><strong>' + esc(item.value) + '</strong><span>' + esc(item.label) + '</span></div>';
    }).join("");
  }

  function repoCard(repo) {
    return '<article class="repo-line">' +
      '<div><h3>' + esc(repo.name) + '</h3><p>' + esc(repo.summary) + '</p></div>' +
      '<span>' + esc(repo.agentCount) + ' agents</span>' +
    '</article>';
  }

  function featuredAgent(agent) {
    return '<a class="agent-slice hover-asset" href="' + esc(agent.path) + '">' +
      '<span>' + esc(agent.role) + '</span>' +
      '<strong>' + esc(agent.name) + '</strong>' +
      '<p>' + esc(agent.summary) + '</p>' +
    '</a>';
  }

  function tags(items) {
    return '<div class="profile-tags">' + (items || []).map(function (item) {
      return '<span>' + esc(item) + '</span>';
    }).join("") + '</div>';
  }

  function profileStat(item) {
    return '<div class="profile-stat"><strong>' + esc(item.value) + '</strong><span>' + esc(item.label) + '</span><em>' + esc(item.detail || "") + '</em></div>';
  }

  function repoPanel(repo) {
    return '<article class="repo-panel">' +
      '<div><a href="https://github.com/' + esc(repo.source) + '" rel="noopener">' + esc(repo.name) + '</a><p>' + esc(repo.summary) + '</p></div>' +
      '<span>' + esc(repo.agentCount) + ' agents</span>' +
      '<div class="repo-agents">' + repo.featured.map(function (agent) { return '<code>' + esc(agent) + '</code>'; }).join("") + '</div>' +
    '</article>';
  }

  function agentRow(agent) {
    return '<a class="agent-row" href="' + esc(agent.path) + '">' +
      '<span class="agent-row-name">' + esc(agent.name) + '<em>' + esc(agent.repo) + '/' + esc(agent.slug) + '</em></span>' +
      '<span>' + esc(agent.role) + '</span>' +
      '<p>' + esc(agent.summary) + '</p>' +
    '</a>';
  }

  function artifactCard(item) {
    return '<article class="artifact-card">' +
      '<div class="artifact-top"><span>' + esc(item.type) + '</span><time>' + esc(item.when) + '</time></div>' +
      '<h3><a href="' + esc(item.href) + '" rel="noopener">' + esc(item.title) + '</a></h3>' +
      '<p>' + esc(item.summary) + '</p>' +
      '<div class="artifact-fleet">' + (item.agents || []).map(function (agent) { return '<code>' + esc(agent) + '</code>'; }).join("") + '</div>' +
    '</article>';
  }

  function activityItem(item) {
    return '<li class="activity-item">' +
      '<span class="activity-dot" aria-hidden="true"></span>' +
      '<div><p><strong>' + esc(item.kind) + '</strong> ' + esc(item.title) + '</p><small>' + esc(item.when) + ' · ' + esc(item.detail) + '</small></div>' +
    '</li>';
  }

  function discussionCard(item) {
    return '<article class="discussion-card">' +
      '<div><h3>' + esc(item.title) + '</h3><p>' + esc(item.summary) + '</p></div>' +
      '<span>' + esc(item.comments) + ' comments</span>' +
      tags(item.tags) +
    '</article>';
  }

  function profileNav(builder, active) {
    var items = [
      ["overview", "Overview"],
      ["agents", "Agents"],
      ["artifacts", "Artifacts"],
      ["activity", "Activity"],
      ["discussions", "Discussions"]
    ];
    return '<nav class="profile-tabs" aria-label="Profile sections">' + items.map(function (item) {
      var href = item[0] === "overview" ? "/" + builder.handle : "/" + builder.handle + "/" + item[0];
      return '<a href="' + esc(href) + '"' + (active === item[0] ? ' aria-current="page"' : "") + '>' + esc(item[1]) + '</a>';
    }).join("") + '</nav>';
  }

  function builderSection(builder, active) {
    if (active === "agents") {
      return '<section class="profile-module">' +
        '<div class="module-heading"><h2>Agent templates</h2></div>' +
        '<div class="agent-table">' + builder.featuredAgents.map(agentRow).join("") + '</div>' +
      '</section>';
    }
    if (active === "artifacts") {
      return '<section class="profile-module">' +
        '<div class="module-heading"><h2>Artifacts</h2></div>' +
        '<div class="artifact-grid">' + (builder.artifacts || []).map(artifactCard).join("") + '</div>' +
      '</section>';
    }
    if (active === "activity") {
      return '<section class="profile-module">' +
        '<div class="module-heading"><h2>Activity</h2></div><ol class="activity-list">' + (builder.activity || []).map(activityItem).join("") + '</ol>' +
      '</section>';
    }
    if (active === "discussions") {
      return '<section class="profile-module">' +
        '<div class="module-heading"><h2>Threads</h2></div>' +
        '<div class="discussion-grid">' + (builder.discussions || []).map(discussionCard).join("") + '</div>' +
      '</section>';
    }
    return '<section class="profile-module profile-overview">' +
      '<div class="module-heading"><h2>Stats</h2></div>' +
      '<div class="kpi-board">' + (builder.kpis || builder.proof || []).map(profileStat).join("") + '</div>' +
      '<div class="module-heading compact"><h2>Repos</h2></div>' +
      '<div class="repo-grid">' + builder.repos.map(repoPanel).join("") + '</div>' +
    '</section>';
  }

  function renderBuilder(builder, activeSection) {
    var active = PROFILE_SECTIONS[activeSection] ? activeSection : "overview";
    rootEl.innerHTML =
      '<section class="profile-shell">' +
        '<aside class="profile-sidebar">' +
          '<img class="profile-avatar" src="' + esc(builder.avatar) + '" alt="' + esc(builder.name) + '" width="116" height="116" fetchpriority="high">' +
          '<h1>' + esc(builder.name) + '</h1>' +
          '<p class="profile-handle">@' + esc(builder.handle) + '</p>' +
          '<p class="profile-bio">' + esc(builder.bio || builder.intro) + '</p>' +
          '<div class="profile-actions-compact">' +
            '<button class="social-button primary" type="button" disabled>Claim handle</button>' +
            '<a class="social-button secondary" href="https://github.com/' + esc(builder.github) + '" rel="noopener">GitHub</a>' +
          '</div>' +
          '<dl class="profile-details">' +
            '<div><dt>Location</dt><dd>' + esc(builder.location) + '</dd></div>' +
            '<div><dt>Site</dt><dd>' + esc(builder.website) + '</dd></div>' +
            '<div><dt>Joined</dt><dd>' + esc(builder.joined) + '</dd></div>' +
          '</dl>' +
          tags(builder.stack) +
          '<div class="profile-stat-grid">' + (builder.proof || []).map(profileStat).join("") + '</div>' +
        '</aside>' +
        '<section class="profile-main">' +
          profileNav(builder, active) +
          builderSection(builder, active) +
        '</section>' +
      '</section>';

    document.title = builder.name + " - awesome-agents";
    setMeta(builder.bio || builder.intro);
  }

  function list(items) {
    return '<ul class="model-list">' + items.map(function (item) {
      return '<li>' + esc(item) + '</li>';
    }).join("") + '</ul>';
  }

  function readmeBody(card) {
    if (!card.readme) {
      return '<article class="readme-doc"><h1>Generated fallback</h1><p>This agent has no README yet, so the public model card falls back to profile metadata and source links.</p></article>';
    }
    var readme = card.readme;
    var banner = readme.banner || {};
    return '<article class="readme-doc">' +
      '<img class="readme-banner" src="' + esc(banner.src || card.image) + '" alt="' + esc(banner.alt || card.name) + '" width="1600" height="640" loading="lazy">' +
      '<p class="readme-kicker"><strong>' + esc(readme.eyebrow) + '</strong><em>' + esc(readme.dek) + '</em></p>' +
      '<h1>' + esc(readme.title) + '</h1>' +
      readme.intro.map(function (text) { return '<p>' + inlineCode(text) + '</p>'; }).join("") +
      readme.sections.map(function (section) {
        if (section.table) {
          return '<section><h2>' + esc(section.title) + '</h2>' + readmeTable(section.table) + '</section>';
        }
        return '<section><h2>' + esc(section.title) + '</h2>' + section.body.map(function (text) { return '<p>' + inlineCode(text) + '</p>'; }).join("") + '</section>';
      }).join("") +
    '</article>';
  }

  function inlineCode(text) {
    return esc(text).replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function readmeTable(rows) {
    return '<table class="readme-table">' + rows.map(function (row, index) {
      var cells = row.map(function (cell) {
        var tag = index === 0 ? "th" : "td";
        return '<' + tag + '>' + esc(cell) + '</' + tag + '>';
      }).join("");
      return '<tr>' + cells + '</tr>';
    }).join("") + '</table>';
  }

  function exampleCard(example) {
    return '<article class="example-card hover-asset">' +
      '<h3>' + esc(example.title) + '</h3>' +
      '<p>' + esc(example.body) + '</p>' +
    '</article>';
  }

  function reviewCard(review) {
    return '<figure class="model-review">' +
      '<blockquote>' + esc(review.text) + '</blockquote>' +
      '<figcaption>' + esc(review.by) + '</figcaption>' +
    '</figure>';
  }

  function modelArtifact(item) {
    return '<article class="template-artifact">' +
      '<div class="artifact-top"><span>' + esc(item.by) + '</span><time>' + esc(item.when) + '</time></div>' +
      '<h3>' + esc(item.title) + '</h3>' +
      '<p>' + esc(item.summary) + '</p>' +
      '<div class="artifact-fleet">' + (item.fleet || []).map(function (agent) { return '<code>' + esc(agent) + '</code>'; }).join("") + '</div>' +
    '</article>';
  }

  function templateDiscussion(item) {
    return '<article class="template-thread">' +
      '<div><h3>' + esc(item.title) + '</h3><p>' + esc(item.summary) + '</p></div>' +
      '<span>' + esc(item.by) + ' · ' + esc(item.comments) + ' comments</span>' +
    '</article>';
  }

  function forkCard(item) {
    return '<article class="fork-card">' +
      '<strong>' + esc(item.owner) + '/' + esc(item.name) + '</strong>' +
      '<p>' + esc(item.note) + '</p>' +
    '</article>';
  }

  function templateNav(card, active) {
    var items = [
      ["readme", "README"],
      ["artifacts", "Artifacts"],
      ["reviews", "Reviews"],
      ["forks", "Forks"],
      ["discussions", "Discussions"]
    ];
    var base = "/" + card.handle + "/" + card.repo + "/" + card.slug;
    return '<nav class="template-tabs" aria-label="Agent template sections">' + items.map(function (item) {
      var href = item[0] === "readme" ? base : base + "/" + item[0];
      return '<a href="' + esc(href) + '"' + (active === item[0] ? ' aria-current="page"' : "") + '>' + esc(item[1]) + '</a>';
    }).join("") + '</nav>';
  }

  function templateSection(card, active) {
    if (active === "artifacts") {
      return '<section class="template-module">' +
        '<div class="module-heading"><h2>Artifacts</h2></div>' +
        '<div class="artifact-grid">' + (card.artifacts || []).map(modelArtifact).join("") + '</div>' +
      '</section>';
    }
    if (active === "reviews") {
      return '<section class="template-module">' +
        '<div class="module-heading"><h2>Reviews</h2></div>' +
        '<div class="reviews-grid">' + card.reviews.map(reviewCard).join("") + '</div>' +
      '</section>';
    }
    if (active === "forks") {
      return '<section class="template-module">' +
        '<div class="module-heading"><h2>Forks</h2></div>' +
        '<div class="fork-grid">' + (card.forksList || []).map(forkCard).join("") + '</div>' +
      '</section>';
    }
    if (active === "discussions") {
      return '<section class="template-module">' +
        '<div class="module-heading"><h2>Threads</h2></div>' +
        '<div class="template-thread-list">' + (card.discussions || []).map(templateDiscussion).join("") + '</div>' +
      '</section>';
    }
    return '<section class="template-module readme-module">' +
      '<div class="module-heading"><h2>README</h2><p>Source: <code>' + esc(card.readmeSource || "agents/" + card.slug + "/README.md") + '</code></p></div>' +
      readmeBody(card) +
    '</section>';
  }

  function renderModelCard(card, builder, activeSection) {
    var command = commandFor(card);
    var active = TEMPLATE_SECTIONS[activeSection] ? activeSection : "readme";
    rootEl.innerHTML =
      '<section class="template-shell">' +
        '<header class="template-header">' +
          '<a class="social-back" href="/' + esc(card.handle) + '">&larr; ' + esc(builder.name) + '</a>' +
          '<p class="model-path">' + esc(card.handle) + ' / ' + esc(card.repo) + ' / agents / ' + esc(card.slug) + '</p>' +
          '<div class="template-title-row">' +
            '<div><h1>' + esc(card.name) + '</h1><p>' + esc(card.summary) + '</p></div>' +
            '<div class="template-actions">' +
              '<button class="social-button primary" type="button" data-copy="' + esc(command) + '">Install</button>' +
              '<button class="social-button secondary" type="button" disabled>Fork</button>' +
              '<button class="social-button secondary" type="button" disabled>Download</button>' +
            '</div>' +
          '</div>' +
          '<div class="template-stats">' +
            '<span><strong>' + fmt(card.downloads) + '</strong> installs</span>' +
            '<span><strong>' + esc(card.stars) + '</strong> stars</span>' +
            '<span><strong>' + esc(card.forks) + '</strong> forks</span>' +
            '<span><strong>' + esc((card.artifacts || []).length) + '</strong> artifacts</span>' +
            '<span><strong>' + esc(card.rating) + '</strong> review score</span>' +
          '</div>' +
        '</header>' +
        templateNav(card, active) +
        '<div class="template-layout">' +
          '<main class="template-main">' +
            templateSection(card, active) +
          '</main>' +
          '<aside class="template-sidebar">' +
            terminal(command, "Install " + card.name) +
            '<section class="sidebar-card"><h2>About this template</h2><dl class="template-meta">' +
              '<div><dt>Source</dt><dd><a href="https://github.com/' + esc(card.source) + '" rel="noopener">' + esc(card.source) + '</a></dd></div>' +
              '<div><dt>Version</dt><dd>' + esc(card.version) + '</dd></div>' +
              '<div><dt>License</dt><dd>' + esc(card.license) + '</dd></div>' +
              '<div><dt>README</dt><dd>' + (card.readmePresent ? "present" : "generated fallback") + '</dd></div>' +
            '</dl></section>' +
            '<section class="sidebar-card"><h2>Template KPIs</h2><dl class="template-meta">' +
              '<div><dt>Installs</dt><dd>' + fmt(card.downloads) + '</dd></div>' +
              '<div><dt>Forks</dt><dd>' + esc(card.forks) + '</dd></div>' +
              '<div><dt>Artifacts</dt><dd>' + esc((card.artifacts || []).length) + '</dd></div>' +
              '<div><dt>Discussions</dt><dd>' + esc((card.discussions || []).length) + '</dd></div>' +
            '</dl></section>' +
          '</aside>' +
        '</div>' +
      '</section>';

    document.title = card.name + " - " + builder.name + " - awesome-agents";
    setMeta(card.summary);
  }

  function setMeta(text) {
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", text);
  }

  function bindQuotes() {
    var index = 0;
    var quotes = Array.prototype.slice.call(document.querySelectorAll("[data-quote-index]"));
    function show(next) {
      if (!quotes.length) return;
      index = (next + quotes.length) % quotes.length;
      quotes.forEach(function (node, i) { node.hidden = i !== index; });
    }
    var prev = document.querySelector("[data-quote-prev]");
    var next = document.querySelector("[data-quote-next]");
    if (prev) prev.addEventListener("click", function () { show(index - 1); });
    if (next) next.addEventListener("click", function () { show(index + 1); });
  }

  document.addEventListener("click", function (event) {
    var copy = event.target.closest("[data-copy]");
    if (!copy) return;
    copyText(copy.getAttribute("data-copy")).then(function () {
      copy.classList.add("copied");
      showToast("Copied install command");
      setTimeout(function () { copy.classList.remove("copied"); }, 1300);
    });
  });

  themeInit();
  var current = route();
  var builder = builders[current.handle];
  if (!builder) {
    missing("Profile not found", "No builder has claimed this handle yet.");
  } else if (current.repo && current.agent) {
    var card = cards[cardKey(current.handle, current.repo, current.agent)];
    if (card) renderModelCard(card, builder, current.section);
    else missing("Agent card not found", "This repo-scoped agent model card does not exist yet.");
  } else {
    renderBuilder(builder, current.section);
  }
})();

(function () {
  "use strict";
  var agents = window.AGENTS || [];
  var cards = window.AGENT_CARDS || {};
  var mount = document.getElementById("card");
  var toast = document.getElementById("toast");

  // ---- theme (same behavior as the directory) ----
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem("aa-theme"); } catch (e) {}
  if (stored === "light" || stored === "dark") {
    root.setAttribute("data-theme", stored);
    root.classList.remove("dark", "light");
    root.classList.add(stored);
  }
  document.getElementById("theme-toggle").addEventListener("click", function () {
    var isDark = matchMedia("(prefers-color-scheme: dark)").matches;
    var attr = root.getAttribute("data-theme");
    var current = attr || (root.classList.contains("light") ? "light" : root.classList.contains("dark") ? "dark" : (isDark ? "dark" : "light"));
    var next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    root.classList.remove("dark", "light");
    root.classList.add(next);
    try { localStorage.setItem("aa-theme", next); } catch (e) {}
  });

  // ---- helpers ----
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + "k" : String(n); }
  function cmdFor(a) { return "npx awesome-agents add " + a.source + " --agent " + a.slug; }

  var COPY_SVG =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
    '<path d="M3.2 10.5H2.6A1.1 1.1 0 0 1 1.5 9.4V2.6A1.1 1.1 0 0 1 2.6 1.5h6.8a1.1 1.1 0 0 1 1.1 1.1v.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';

  var VERIFIED =
    '<svg class="verified" viewBox="0 0 16 16" aria-hidden="true">' +
    '<path d="M8 1 9.9 2.6l2.5-.2.6 2.4 2 1.5-1 2.3 1 2.3-2 1.5-.6 2.4-2.5-.2L8 15l-1.9-1.6-2.5.2-.6-2.4-2-1.5 1-2.3-1-2.3 2-1.5.6-2.4 2.5.2L8 1Z" fill="currentColor" opacity=".22"/>' +
    '<path d="m5.6 8.1 1.7 1.7 3.1-3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var HARNESSES =
    '<span class="harness" title="Claude Code">' +
      '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 4 25h4.4L16 10.5 23.6 25H28L16 3Z" fill="currentColor"/><path d="M16 15.5 11.5 24h9L16 15.5Z" fill="currentColor" opacity=".55"/></svg>' +
      '<span class="harness-name">Claude&nbsp;Code</span></span>' +
    '<span class="harness" title="Codex">' +
      '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M11 12.5 15 16l-4 3.5M16.5 20h5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span class="harness-name">Codex</span></span>' +
    '<span class="harness" title="OpenCode">' +
      '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3.5" y="6.5" width="25" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 13l3.5 3L9 19M15.5 20h7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span class="harness-name">OpenCode</span></span>' +
    '<span class="harness" title="Goose">' +
      '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9.2 21.8c3.4 1.9 7.7 1.7 10.9-.4 2.3-1.5 3.8-3.9 4.1-6.7.2-1.8-.2-3.5-1.2-5l3.2-3.9c.6-.7.1-1.8-.8-1.8h-6.5c-3.5 0-6.4 2.8-6.4 6.4v1.9c0 2.9-2.2 5.3-5 5.6l-2 .2 1.3 1.5c.7.9 1.5 1.6 2.4 2.2Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/><path d="M20.5 8.7h.1M9.8 22.2 7.4 27M16.4 23.2 17.2 27" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>' +
      '<span class="harness-name">Goose</span></span>';

  var BACK =
    '<a class="card-back" href="/#leaderboard">' +
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 3.5 5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    'Directory</a>';

  // ---- definition renderer: frontmatter + markdown-ish body ----
  function renderDef(text) {
    var lines = text.split("\n");
    var out = [];
    var inFront = false, seenFence = false;
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (ln === "---") {
        out.push('<span class="def-fence">---</span>');
        if (!seenFence) { inFront = true; seenFence = true; } else { inFront = false; }
        continue;
      }
      if (inFront) {
        var m = ln.match(/^([\w-]+):(.*)$/);
        if (m) {
          out.push('<span class="def-key">' + esc(m[1]) + ':</span>' +
            (m[2] ? '<span class="def-val">' + esc(m[2]) + "</span>" : ""));
        } else {
          out.push(esc(ln));
        }
        continue;
      }
      if (/^#{1,6}\s/.test(ln)) {
        out.push('<span class="def-head">' + esc(ln) + "</span>");
      } else if (/^\s*-\s/.test(ln)) {
        out.push('<span class="def-bullet">' + esc(ln) + "</span>");
      } else {
        out.push(esc(ln));
      }
    }
    return out.join("\n");
  }

  function samplesBlock(a, c) {
    if (c.samples && c.samples.length) {
      var items = c.samples.map(function (s) {
        return '<article class="sample">' +
          '<div class="sample-top">' +
            '<span class="sample-type">' + esc(s.type) + "</span>" +
            '<span class="sample-when">' + esc(s.when) + "</span>" +
          "</div>" +
          '<h3 class="sample-title">' + esc(s.title) + "</h3>" +
          '<p class="sample-summary">' + esc(s.summary) + "</p>" +
          '<p class="sample-note">' + VERIFIED + "Real output, user-approved.</p>" +
        "</article>";
      }).join("");
      return '<div class="samples-grid">' + items + "</div>";
    }
    return '<p class="card-empty">No public samples yet. The definition below is open — ' +
      "read it before you install.</p>";
  }

  function reviewsBlock(c) {
    if (c.reviews && c.reviews.length) {
      return c.reviews.map(function (r) {
        return '<figure class="review">' +
          '<blockquote class="review-text">' + esc(r.text) + "</blockquote>" +
          '<figcaption class="review-by">' + esc(r.by) +
            (r.when ? '<span class="review-when">' + esc(r.when) + "</span>" : "") +
          "</figcaption>" +
        "</figure>";
      }).join("");
    }
    return '<p class="card-empty">No reviews yet. Read the definition and the samples, ' +
      "then judge it on the work.</p>";
  }

  function listBlock(items) {
    return "<ul class=\"card-list\">" + items.map(function (t) {
      return "<li>" + esc(t) + "</li>";
    }).join("") + "</ul>";
  }

  function notFound(slug) {
    mount.innerHTML =
      '<section class="card-missing">' +
        '<p class="eyebrow">Agent not found</p>' +
        "<h1 class=\"missing-title\">No agent named &ldquo;" + esc(slug) + "&rdquo;</h1>" +
        '<p class="missing-desc">It may have been renamed or never existed. Browse the directory for the full roster.</p>' +
        '<a class="missing-link" href="/#leaderboard">' +
          '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 3.5 5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          "Back to the directory</a>" +
      "</section>";
    document.title = "Agent not found — awesome-agents";
  }

  var TABS = [
    { id: "", label: "Overview" },
    { id: "portfolio", label: "Portfolio" },
    { id: "definition", label: "Definition" },
    { id: "reviews", label: "Reviews" },
  ];

  function tabBar(a, c, active) {
    var base = "/agents/" + encodeURIComponent(a.slug);
    var counts = {
      portfolio: c.samples ? c.samples.length : 0,
      reviews: c.reviews ? c.reviews.length : 0,
    };
    return '<nav class="card-tabs" aria-label="Agent sections">' + TABS.map(function (t) {
      var href = t.id ? base + "/" + t.id : base;
      var on = t.id === active;
      var count = counts[t.id];
      return '<a class="card-tab" href="' + href + '"' + (on ? ' aria-selected="true" aria-current="page"' : "") + ">" +
        esc(t.label) +
        (count ? '<span class="card-tab-count">' + count + "</span>" : "") +
        "</a>";
    }).join("") + "</nav>";
  }

  function overviewPanel(a, c) {
    var claimed = !!c.claimed;
    return '<div class="tab-panel">' +
      '<section class="card-fit">' +
        '<div class="fit-col">' +
          '<p class="eyebrow eyebrow-good">Best for</p>' + listBlock(c.bestFor || []) +
        "</div>" +
        '<div class="fit-col">' +
          '<p class="eyebrow eyebrow-not">Not for</p>' + listBlock(c.notFor || []) +
        "</div>" +
      "</section>" +
      '<section class="card-sec card-trust">' +
        '<div class="trust-item">' +
          '<span class="trust-label">Publisher</span>' +
          '<span class="trust-value">' +
            (claimed ? VERIFIED + "Claimed" : '<span class="trust-unclaimed">Unclaimed</span>') +
          "</span>" +
        "</div>" +
        '<div class="trust-item">' +
          '<span class="trust-label">Installs</span>' +
          '<span class="trust-value">' + fmt(a.installs) + "</span>" +
        "</div>" +
        '<div class="trust-item">' +
          '<span class="trust-label">Samples</span>' +
          '<span class="trust-value">' + (a.examples > 0 ? a.examples : "source only") + "</span>" +
        "</div>" +
        '<div class="trust-item">' +
          '<span class="trust-label">Updated</span>' +
          '<span class="trust-value">' + esc(c.updated || "—") + "</span>" +
        "</div>" +
        '<div class="trust-item">' +
          '<span class="trust-label">Maintained by</span>' +
          '<span class="trust-value"><a href="https://github.com/' + esc(a.source.split("/")[0]) +
            '" target="_blank" rel="noopener">' + esc(a.source.split("/")[0]) + "</a></span>" +
        "</div>" +
      "</section>" +
    "</div>";
  }

  function panelFor(tab, a, c) {
    if (tab === "portfolio") {
      return '<div class="tab-panel">' + samplesBlock(a, c) + "</div>";
    }
    if (tab === "definition") {
      return '<div class="tab-panel">' +
        '<div class="def-block">' +
          '<div class="term-bar"><span class="term-dot"></span><span class="term-dot"></span><span class="term-dot"></span>' +
            '<span class="term-title">' + esc(a.slug) + '.agent.yaml</span></div>' +
          '<pre class="def-pre">' + renderDef(c.def || "") + "</pre>" +
        "</div>" +
      "</div>";
    }
    if (tab === "reviews") {
      return '<div class="tab-panel"><div class="reviews-wrap">' + reviewsBlock(c) + "</div></div>";
    }
    return overviewPanel(a, c);
  }

  function render(a, tab) {
    var c = cards[a.slug] || {};
    var cmd = cmdFor(a);

    var html =
      '<section class="card-identity">' +
        BACK +
        '<div class="ident-head">' +
          '<span class="ident-role">' + esc(a.role) + "</span>" +
          "<h1 class=\"ident-name\">" + esc(a.name) + "</h1>" +
        "</div>" +
        '<p class="ident-desc">' + esc(a.desc.charAt(0).toUpperCase() + a.desc.slice(1)) + "</p>" +
        '<div class="ident-meta">' +
          '<a class="ident-src" href="https://github.com/' + esc(a.source) + '" target="_blank" rel="noopener">' +
            '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .8a7.2 7.2 0 0 0-2.28 14c.36.07.49-.16.49-.35v-1.2c-2 .44-2.42-.96-2.42-.96-.33-.83-.8-1.05-.8-1.05-.65-.45.05-.44.05-.44.72.05 1.1.74 1.1.74.64 1.1 1.68.78 2.1.6.06-.47.25-.79.45-.97-1.6-.18-3.28-.8-3.28-3.56 0-.79.28-1.43.74-1.93-.07-.18-.32-.92.07-1.9 0 0 .6-.2 1.98.73a6.9 6.9 0 0 1 3.6 0c1.37-.93 1.97-.73 1.97-.73.4.98.15 1.72.08 1.9.46.5.73 1.14.73 1.93 0 2.77-1.69 3.38-3.29 3.56.26.22.49.66.49 1.33v1.97c0 .19.13.42.5.35A7.2 7.2 0 0 0 8 .8Z" fill="currentColor"/></svg>' +
            esc(a.source) + "</a>" +
          '<span class="ident-dot" aria-hidden="true">·</span>' +
          '<span class="ident-harnesses">' + HARNESSES + "</span>" +
        "</div>" +
      "</section>" +

      '<section class="card-install">' +
        '<div class="install" role="group" aria-label="Install command">' +
          '<code class="cmd"><span class="tok-prompt">$</span>npx awesome-agents add ' +
            '<span class="tok-dim">' + esc(a.source) + '</span> <span class="tok-flag">--agent</span> ' +
            '<span class="tok-val">' + esc(a.slug) + "</span></code>" +
          '<button class="copy" type="button" data-copy="' + esc(cmd) + '" aria-label="Copy install command">' + COPY_SVG + "</button>" +
        "</div>" +
      "</section>" +

      tabBar(a, c, tab) +
      panelFor(tab, a, c);

    mount.innerHTML = html;
    var tabLabel = { portfolio: "Portfolio", definition: "Definition", reviews: "Reviews" }[tab];
    document.title = a.name + (tabLabel ? " · " + tabLabel : "") + " — awesome-agents";
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", a.role + " — " + a.desc);
  }

  // ---- copy ----
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 1800);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (res) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); res();
    });
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    copyText(btn.getAttribute("data-copy")).then(function () {
      btn.classList.add("copied");
      showToast("Copied install command");
      setTimeout(function () { btn.classList.remove("copied"); }, 1400);
    });
  });

  // ---- route ----
  function routeFromPath() {
    var m = location.pathname.match(/\/agents\/([^\/?#]+)(?:\/([^\/?#]+))?/);
    if (m) return { slug: decodeURIComponent(m[1]), tab: m[2] ? decodeURIComponent(m[2]) : "" };
    var q = new URLSearchParams(location.search).get("agent");
    return { slug: q || "", tab: "" };
  }
  var route = routeFromPath();
  var validTabs = { portfolio: 1, definition: 1, reviews: 1 };
  var tab = validTabs[route.tab] ? route.tab : "";
  var agent = agents.filter(function (a) { return a.slug === route.slug; })[0];
  if (agent) render(agent, tab); else notFound(route.slug || "(none)");

  // ---- nav shadow on scroll ----
  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();

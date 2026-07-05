(function () {
  "use strict";
  var agents = window.AGENTS || [];
  var rowsEl = document.getElementById("rows");
  var searchEl = document.getElementById("search");
  var emptyEl = document.getElementById("empty");
  var emptyQEl = document.getElementById("empty-q");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var toast = document.getElementById("toast");

  var state = { sort: "installs", q: "" };

  // ---- theme ----
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
  function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + "k" : String(n); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function cmdFor(a) {
    return "npx awesome-agents add " + a.source + " --agent " + a.slug;
  }
  function trendScore(a) {
    var v = a.activity, early = (v[0] + v[1] + v[2]) || 1;
    var late = v[v.length - 1] + v[v.length - 2] + v[v.length - 3];
    return (late / early) * (late * 40 + a.installs * 0.05);
  }

  function sparkline(data) {
    var w = 132, h = 30, pad = 3;
    var max = Math.max.apply(null, data), min = Math.min.apply(null, data);
    var span = max - min || 1;
    var step = (w - pad * 2) / (data.length - 1);
    var pts = data.map(function (d, i) {
      var x = pad + i * step;
      var y = h - pad - ((d - min) / span) * (h - pad * 2);
      return [x, Math.round(y * 100) / 100];
    });
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0] + " " + p[1]; }).join(" ");
    var fill = line + " L" + pts[pts.length - 1][0] + " " + (h - pad) + " L" + pts[0][0] + " " + (h - pad) + " Z";
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="fill" d="' + fill + '"/><path class="line" d="' + line + '"/></svg>';
  }

  function matches(a, q) {
    if (!q) return true;
    var hay = (a.name + " " + a.slug + " " + a.desc + " " + a.tags.join(" ")).toLowerCase();
    return q.split(/\s+/).every(function (t) { return hay.indexOf(t) !== -1; });
  }

  function sorted(list) {
    var l = list.slice();
    if (state.sort === "installs") l.sort(function (a, b) { return b.installs - a.installs; });
    else if (state.sort === "trending") l.sort(function (a, b) { return trendScore(b) - trendScore(a); });
    else if (state.sort === "examples") l.sort(function (a, b) { return b.examples - a.examples; });
    else if (state.sort === "name") l.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return l;
  }

  var VERIFIED = '<svg class="verified" viewBox="0 0 16 16" aria-hidden="true">' +
    '<path d="M8 1 9.9 2.6l2.5-.2.6 2.4 2 1.5-1 2.3 1 2.3-2 1.5-.6 2.4-2.5-.2L8 15l-1.9-1.6-2.5.2-.6-2.4-2-1.5 1-2.3-1-2.3 2-1.5.6-2.4 2.5.2L8 1Z" fill="currentColor" opacity=".35"/>' +
    '<path d="m5.6 8.1 1.7 1.7 3.1-3.4" fill="none" stroke="var(--bg)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function rowHTML(a, i) {
    var proof = a.examples > 0
      ? '<span class="proof" title="Shipped: ' + esc(a.excerpt) + '">' + VERIFIED + "<b>" + a.examples + "</b> samples</span>"
      : '<span class="proof proof-source">source only</span>';
    var empty = a.examples > 0 ? "" :
      '<p class="agent-empty">No public samples yet. The definition is open &mdash; read it before you install. ' +
        '<a href="https://github.com/' + esc(a.source) + '" target="_blank" rel="noopener">View definition &rarr;</a></p>';
    return '<div class="trow" role="row" data-copy="' + esc(cmdFor(a)) + '" title="Click to copy install command">' +
      '<span class="rank" role="cell">' + (i + 1) + "</span>" +
      '<div class="cell-main" role="cell">' +
        '<span class="main-line"><span class="agent-slug">' + esc(a.slug) + "</span>" +
          '<span class="agent-src">' + esc(a.source) + "</span></span>" +
        '<p class="agent-desc"><b class="role-noun">' + esc(a.role) + "</b> &mdash; " + esc(a.desc) + "</p>" +
        '<span class="agent-meta">' +
          proof +
        "</span>" +
        empty +
      "</div>" +
      '<div class="cell-activity" role="cell">' + sparkline(a.activity) + "</div>" +
      '<div class="cell-installs" role="cell">' + VERIFIED +
        '<span class="installs-n">' + fmt(a.installs) + "</span></div>" +
    "</div>";
  }

  function render() {
    var list = sorted(agents.filter(function (a) { return matches(a, state.q); }));
    if (!list.length) {
      rowsEl.innerHTML = "";
      emptyQEl.textContent = state.q;
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    rowsEl.innerHTML = list.map(rowHTML).join("");
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
    if (e.target.closest("a")) return;
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    copyText(btn.getAttribute("data-copy")).then(function () {
      btn.classList.add("copied");
      showToast("Copied install command");
      setTimeout(function () { btn.classList.remove("copied"); }, 1400);
    });
  });

  // ---- events ----
  searchEl.addEventListener("input", function () { state.q = searchEl.value.trim().toLowerCase(); render(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== searchEl) { e.preventDefault(); searchEl.focus(); }
  });
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.setAttribute("aria-selected", t === tab ? "true" : "false"); });
      state.sort = tab.getAttribute("data-sort");
      render();
    });
  });

  render();

  // ---- roster: cycle real installable roles under the wordmark ----
  (function roster() {
    var el = document.getElementById("roster-role");
    if (!el) return;
    var phrases = [
      "a reviewer that catches bugs before merge",
      "a protocol reviewer for Cashu mints",
      "an accountant that reads financial PDFs",
      "a UX critic for iOS flows",
      "an incident commander for outages",
      "a researcher that turns sources into briefs",
      "a support triager that drafts the first reply",
      "a release manager that cuts the tag",
    ];
    el.textContent = phrases[0];
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || phrases.length < 2) return;
    var idx = 0;
    setInterval(function () {
      idx = (idx + 1) % phrases.length;
      el.style.opacity = "0";
      setTimeout(function () {
        el.textContent = phrases[idx];
        el.style.opacity = "1";
      }, 260);
    }, 3000);
  })();
})();

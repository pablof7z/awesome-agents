(function () {
  "use strict";
  var toast = document.getElementById("toast");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- theme (shared behavior) ----
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem("aa-theme"); } catch (e) {}
  if (stored === "light" || stored === "dark") {
    root.setAttribute("data-theme", stored);
    root.classList.remove("dark", "light");
    root.classList.add(stored);
  }
  var toggle = document.getElementById("theme-toggle");
  if (toggle) toggle.addEventListener("click", function () {
    var isDark = matchMedia("(prefers-color-scheme: dark)").matches;
    var attr = root.getAttribute("data-theme");
    var current = attr || (root.classList.contains("light") ? "light" : root.classList.contains("dark") ? "dark" : (isDark ? "dark" : "light"));
    var next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    root.classList.remove("dark", "light");
    root.classList.add(next);
    try { localStorage.setItem("aa-theme", next); } catch (e) {}
  });

  // ---- nav shadow on scroll ----
  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ---- copy buttons on code blocks ----
  var COPY_SVG =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
    '<path d="M3.2 10.5H2.6A1.1 1.1 0 0 1 1.5 9.4V2.6A1.1 1.1 0 0 1 2.6 1.5h6.8a1.1 1.1 0 0 1 1.1 1.1v.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';

  function showToast(msg) {
    if (!toast) return;
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

  Array.prototype.forEach.call(document.querySelectorAll(".doc-code"), function (block) {
    var code = block.querySelector("code");
    if (!code) return;
    var btn = document.createElement("button");
    btn.className = "doc-copy";
    btn.type = "button";
    btn.setAttribute("aria-label", "Copy code");
    btn.innerHTML = COPY_SVG;
    btn.addEventListener("click", function () {
      var text = code.innerText.replace(/^\$\s?/gm, ""); // strip prompt → paste-ready
      copyText(text).then(function () {
        btn.classList.add("copied");
        showToast("Copied to clipboard");
        setTimeout(function () { btn.classList.remove("copied"); }, 1400);
      });
    });
    block.appendChild(btn);
  });

  // ---- "On this page" scrollspy ----
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".doc-toc a"));
  if (tocLinks.length && !reduce && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var headings = Object.keys(byId)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    var visible = {};
    function setActive(id) { tocLinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + id); }); }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, bestRatio = 0;
      headings.forEach(function (h) { var r = visible[h.id] || 0; if (r > bestRatio) { bestRatio = r; best = h.id; } });
      if (best && bestRatio > 0) setActive(best);
    }, { rootMargin: "-72px 0px -60% 0px", threshold: [0, 0.5, 1] });
    headings.forEach(function (h) { io.observe(h); });
    if (headings.length) setActive(headings[0].id);
    tocLinks.forEach(function (a) { a.addEventListener("click", function () { setActive(a.getAttribute("href").slice(1)); }); });
  }
})();

(function () {
  "use strict";

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

  function showToast(msg) {
    var toast = document.getElementById("toast");
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
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      res();
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    copyText(btn.getAttribute("data-copy")).then(function () {
      btn.classList.add("copied");
      showToast(btn.classList.contains("docs-copy") ? "Copied page link" : "Copied command");
      setTimeout(function () { btn.classList.remove("copied"); }, 1400);
    });
  });

  // Sidebar filter
  var filter = document.getElementById("docs-filter");
  if (filter) {
    filter.addEventListener("input", function () {
      var q = filter.value.trim().toLowerCase();
      document.querySelectorAll(".docs-side-group").forEach(function (group) {
        var any = false;
        group.querySelectorAll("a").forEach(function (a) {
          var match = a.textContent.toLowerCase().indexOf(q) !== -1;
          a.style.display = match ? "" : "none";
          if (match) any = true;
        });
        group.style.display = any ? "" : "none";
      });
    });
  }

  // Scroll-spy for the "On this page" list
  var tocLinks = [].slice.call(document.querySelectorAll(".docs-onthis a[href^='#']"));
  if (tocLinks.length) {
    var targets = tocLinks
      .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
      .filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        tocLinks.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "0px 0px -75% 0px", threshold: 0 });
    targets.forEach(function (t) { spy.observe(t); });
  }
})();

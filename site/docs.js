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
      showToast("Copied command");
      setTimeout(function () { btn.classList.remove("copied"); }, 1400);
    });
  });
})();

"use strict";
(() => {
  const id = "G-X21CNC0YM0";
  const storageKey = "dome_ga_optout";

  const isOptedOut = () => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  };

  if (isOptedOut()) {
    window[`ga-disable-${id}`] = true;
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", id, { anonymize_ip: true });

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("toggle-analytics");
    const status = document.getElementById("analytics-status");
    if (!btn || !status) return;

    const render = () => {
      const disabled = isOptedOut();
      btn.textContent = disabled
        ? "Re-enable Google Analytics on this browser"
        : "Opt out of Google Analytics on this browser";
      status.textContent = disabled
        ? "Google Analytics is turned off for this browser."
        : "Google Analytics is currently active on this browser.";
    };

    btn.addEventListener("click", () => {
      try {
        if (isOptedOut()) {
          localStorage.removeItem(storageKey);
          window[`ga-disable-${id}`] = false;
        } else {
          localStorage.setItem(storageKey, "1");
          window[`ga-disable-${id}`] = true;
        }
      } catch {}
      render();
    });

    render();
  });
})();

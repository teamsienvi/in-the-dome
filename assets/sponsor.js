"use strict";
(() => {
  const form = document.getElementById("sponsor-form");
  const submitBtn = document.getElementById("sponsor-submit");
  const statusEl = document.getElementById("sponsor-status");
  if (!form || !submitBtn || !statusEl) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.className = "form-status";
    statusEl.textContent = "Sending your inquiry...";
    submitBtn.disabled = true;

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        form.reset();
        statusEl.className = "form-status success";
        statusEl.textContent = "Thanks! Your inquiry has been sent to Jordan and Michael — we’ll get back to you soon.";
        if (typeof window.gtag === "function") {
          window.gtag("event", "generate_lead", { event_category: "sponsorship" });
        }
      } else {
        statusEl.className = "form-status error";
        statusEl.textContent = json.error || "Could not send right now. Please email inthedomepod@gmail.com directly.";
      }
    } catch {
      statusEl.className = "form-status error";
      statusEl.textContent = "Network error while sending. Please email inthedomepod@gmail.com directly.";
    } finally {
      submitBtn.disabled = false;
    }
  });
})();

"use strict";
(() => {
  const config = window.DOME_EPISODES || {};
  const list = document.getElementById("episode-list");
  const fallback = document.getElementById("episode-fallback");
  const removeButton = document.getElementById("disable-embeds");
  const status = document.getElementById("video-status");
  if (!list || !fallback || !removeButton || !status) return;

  const playlist = typeof config.playlistId === "string" ? config.playlistId.trim() : "";
  const validPlaylist = /^(PL|UU|UULF|UULP|OLAK5uy_)[A-Za-z0-9_-]{10,100}$/.test(playlist);
  const videos = Array.isArray(config.videos) ? config.videos.filter(video =>
    video && typeof video.id === "string" && /^[A-Za-z0-9_-]{11}$/.test(video.id)
  ).slice(0, 10) : [];
  const entries = validPlaylist ? [{ title: "In the Dome episode playlist", playlist }] : videos;

  function showChoice(entry, slot) {
    const choice = document.createElement("div");
    choice.className = "embed-choice";
    const notice = document.createElement("p");
    notice.textContent = "Loading this player connects your browser to YouTube/Google, which may receive device and viewing information and use cookies or similar storage. Or use the direct YouTube link below.";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button";
    button.textContent = "Load YouTube player";
    button.addEventListener("click", () => {
      const frame = document.createElement("div");
      frame.className = "episode-frame";
      const iframe = document.createElement("iframe");
      iframe.title = typeof entry.title === "string" ? entry.title : "In the Dome episode";
      iframe.src = entry.playlist
        ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(entry.playlist)}&rel=0`
        : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(entry.id)}?rel=0`;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allow = "encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      frame.append(iframe);
      slot.replaceChildren(frame);
      removeButton.hidden = false;
      status.textContent = "YouTube player loaded. You can remove loaded players below.";
    });
    const direct = document.createElement("a");
    direct.href = entry.playlist
      ? `https://www.youtube.com/playlist?list=${encodeURIComponent(entry.playlist)}`
      : `https://www.youtube.com/watch?v=${encodeURIComponent(entry.id)}`;
    direct.textContent = "Watch directly on YouTube ↗";
    direct.target = "_blank";
    direct.rel = "noopener noreferrer";
    choice.append(notice, button, direct);
    slot.replaceChildren(choice);
  }

  const slots = [];
  entries.forEach(entry => {
    const card = document.createElement("article");
    card.className = "episode-card";
    const heading = document.createElement("h3");
    heading.className = "episode-card-title";
    heading.textContent = typeof entry.title === "string" && entry.title.trim()
      ? entry.title : "In the Dome episode";
    const slot = document.createElement("div");
    showChoice(entry, slot);
    slots.push({ entry, slot });
    card.append(heading, slot);
    list.append(card);
  });
  if (slots.length) {
    list.hidden = false;
    // Keep the direct channel link available if embeds are blocked or JavaScript fails later.
    fallback.hidden = false;
  }
  removeButton.addEventListener("click", () => {
    slots.forEach(({ entry, slot }) => showChoice(entry, slot));
    removeButton.hidden = true;
    status.textContent = "Embedded players removed. No further player requests are made until you load one again. Data already sent and YouTube’s cookies are not erased; manage those in your browser or Google settings.";
  });
})();

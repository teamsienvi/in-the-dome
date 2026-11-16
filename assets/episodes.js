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
  const validThumb = thumb => typeof thumb === "string" && /^assets\/ep-[1-9]\.jpg(\?v=[A-Za-z0-9_-]{11})?$/.test(thumb);
  const videos = Array.isArray(config.videos) ? config.videos.filter(video =>
    video && typeof video.id === "string" && /^[A-Za-z0-9_-]{11}$/.test(video.id)
  ).slice(0, 10) : [];
  const entries = validPlaylist ? [{ title: "In the Dome episode playlist", playlist }] : videos;

  function showChoice(entry, slot) {
    const choice = document.createElement("div");
    choice.className = "embed-choice";

    const media = document.createElement("div");
    media.className = "episode-media";
    if (validThumb(entry.thumb)) {
      const img = document.createElement("img");
      img.className = "episode-thumb";
      img.src = entry.thumb;
      img.alt = typeof entry.title === "string" && entry.title.trim() ? entry.title : "In the Dome episode thumbnail";
      img.loading = "lazy";
      img.decoding = "async";
      media.append(img);
    }

    const overlay = document.createElement("div");
    overlay.className = "episode-overlay";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button episode-play-btn";
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
    overlay.append(button);
    media.append(overlay);

    choice.append(media);
    slot.replaceChildren(choice);
  }

  const slots = [];
  entries.forEach(entry => {
    const card = document.createElement("article");
    card.className = "episode-card";
    const slot = document.createElement("div");
    showChoice(entry, slot);

    const body = document.createElement("div");
    body.className = "episode-card-body";
    const heading = document.createElement("h3");
    heading.className = "episode-card-title";
    heading.textContent = typeof entry.title === "string" && entry.title.trim()
      ? entry.title : "In the Dome episode";

    const meta = document.createElement("div");
    meta.className = "episode-card-meta";
    const direct = document.createElement("a");
    direct.className = "episode-direct-link";
    direct.href = entry.playlist
      ? `https://www.youtube.com/playlist?list=${encodeURIComponent(entry.playlist)}`
      : `https://www.youtube.com/watch?v=${encodeURIComponent(entry.id)}`;
    direct.textContent = "Watch on YouTube ↗";
    direct.target = "_blank";
    direct.rel = "noopener noreferrer";
    const notice = document.createElement("span");
    notice.className = "episode-privacy-tag";
    notice.textContent = "Connects on click";
    meta.append(direct, notice);

    body.append(heading, meta);
    slots.push({ entry, slot });
    card.append(slot, body);
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

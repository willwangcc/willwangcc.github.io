(() => {
  const DATA_URL = "/data/works.v1.json";
  const grid = document.getElementById("works-grid");
  const count = document.getElementById("works-count");
  const drawer = document.getElementById("work-drawer");
  const drawerContent = document.getElementById("drawer-content");
  const closeButton = document.getElementById("drawer-close");
  const backdrop = document.getElementById("drawer-backdrop");

  let works = [];
  let lastFocused = null;

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const labelForLink = (key) => ({
    live: "Live",
    github: "GitHub",
    case_study: "Case study",
    source: "Source"
  }[key] || key.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase()));

  function renderGrid(items) {
    grid.innerHTML = "";
    count.textContent = String(items.length);

    if (!items.length) {
      grid.innerHTML = '<p class="works-state">No works yet.</p>';
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "work-card";
      card.dataset.workId = item.id;
      card.setAttribute("aria-label", `Open ${item.title}`);
      card.style.aspectRatio = item.aspect_ratio || "4 / 3";

      const img = document.createElement("img");
      img.src = item.cover || "";
      img.alt = item.cover_alt || item.title || "Work cover";
      img.loading = "lazy";
      img.decoding = "async";
      if (item.cover_position) img.style.objectPosition = item.cover_position;

      const fallback = document.createElement("span");
      fallback.className = "work-card-fallback";
      fallback.textContent = item.title;

      img.addEventListener("error", () => card.classList.add("is-fallback"), { once: true });
      if (!item.cover) card.classList.add("is-fallback");

      card.append(img, fallback);
      card.addEventListener("click", () => openDrawer(item, true));
      grid.appendChild(card);
    });
  }

  function drawerMarkup(item) {
    const tags = Array.isArray(item.tags) && item.tags.length
      ? `<div class="drawer-tags">${item.tags.map(tag => `<span class="drawer-tag">${escapeHtml(tag)}</span>`).join("")}</div>`
      : "";

    const links = item.links && typeof item.links === "object"
      ? Object.entries(item.links)
          .filter(([, url]) => Boolean(url))
          .map(([key, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(labelForLink(key))} ↗</a>`)
          .join("")
      : "";

    const eyebrow = [item.year, item.type].filter(Boolean).map(escapeHtml).join(" · ");

    return `
      ${eyebrow ? `<div class="drawer-eyebrow">${eyebrow}</div>` : ""}
      <h2 id="drawer-title" class="drawer-title">${escapeHtml(item.title)}</h2>
      ${item.one_liner ? `<p class="drawer-one-liner">${escapeHtml(item.one_liner)}</p>` : ""}
      ${item.description ? `<p class="drawer-description">${escapeHtml(item.description)}</p>` : ""}
      ${tags}
      ${links ? `<div class="drawer-links">${links}</div>` : ""}
    `;
  }

  function openDrawer(item, updateUrl = false) {
    if (!item) return;

    lastFocused = document.activeElement;
    drawerContent.innerHTML = drawerMarkup(item);
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("is-open"));
    document.body.classList.add("drawer-open");

    if (updateUrl) {
      const hash = `#work=${encodeURIComponent(item.id)}`;
      if (location.hash !== hash) history.pushState({ work: item.id }, "", hash);
    }

    closeButton.focus({ preventScroll: true });
  }

  function closeDrawer(updateUrl = false) {
    if (!drawer.classList.contains("is-open")) return;

    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("is-open");
    document.body.classList.remove("drawer-open");

    window.setTimeout(() => {
      if (!drawer.classList.contains("is-open")) backdrop.hidden = true;
    }, 220);

    if (updateUrl && location.hash.startsWith("#work=")) {
      history.replaceState(null, "", location.pathname + location.search);
    }

    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function syncFromUrl() {
    if (!location.hash.startsWith("#work=")) {
      closeDrawer(false);
      return;
    }

    const id = decodeURIComponent(location.hash.slice("#work=".length));
    const item = works.find(work => work.id === id);
    if (item) openDrawer(item, false);
  }

  closeButton.addEventListener("click", () => closeDrawer(true));
  backdrop.addEventListener("click", () => closeDrawer(true));
  window.addEventListener("popstate", syncFromUrl);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer(true);
  });

  fetch(DATA_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${DATA_URL}: ${response.status}`);
      return response.json();
    })
    .then((manifest) => {
      if (manifest.schema !== "works.v1" || !Array.isArray(manifest.items)) {
        throw new Error("Unexpected works manifest schema");
      }

      works = manifest.items
        .filter(item => item && item.id && item.title && item.featured !== false && item.status !== "hidden")
        .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

      renderGrid(works);
      syncFromUrl();
    })
    .catch((error) => {
      console.error(error);
      count.textContent = "0";
      grid.innerHTML = '<p class="works-state">Could not load works.</p>';
    });
})();

(() => {
  const DATA_URL = "/data/works.v1.json";
  const grid = document.getElementById("works-grid");
  const count = document.getElementById("works-count");
  const filters = document.getElementById("works-filters");
  const profileTrigger = document.getElementById("profile-trigger");
  const drawer = document.getElementById("work-drawer");
  const drawerContent = document.getElementById("drawer-content");
  const closeButton = document.getElementById("drawer-close");
  const backdrop = document.getElementById("drawer-backdrop");

  let works = [];
  let activeCategory = "all";
  let lastFocused = null;

  const categoryOrder = ["Film", "Book", "App", "Knowledge System", "Video", "Game"];
  const profile = {
    name: "Will Wang",
    avatar: "https://i.imgur.com/OJjTJOt.jpg",
    description: "A builder exploring the interface between human thought and AI.",
    links: {
      LinkedIn: "https://www.linkedin.com/in/zhixiangwang/",
      Bilibili: "https://space.bilibili.com/8464298",
      YouTube: "https://www.youtube.com/@GrittyGuide"
    }
  };

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

  function visibleWorks() {
    return activeCategory === "all"
      ? works
      : works.filter(item => item.category === activeCategory);
  }

  function renderFilters() {
    filters.innerHTML = "";
    const categories = categoryOrder.filter(category => works.some(item => item.category === category));
    const options = [
      { id: "all", label: `All (${works.length})` },
      ...categories.map(category => ({ id: category, label: category }))
    ];

    options.forEach(({ id, label }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "works-filter";
      button.textContent = label;
      button.setAttribute("aria-pressed", String(activeCategory === id));
      if (activeCategory === id) button.classList.add("is-active");
      button.addEventListener("click", () => {
        if (activeCategory === id) return;
        activeCategory = id;
        renderFilters();
        renderGrid(visibleWorks());
      });
      filters.appendChild(button);
    });
  }

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
      if (["cover", "contain"].includes(item.cover_fit)) img.style.objectFit = item.cover_fit;
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

  function profileMarkup() {
    const links = Object.entries(profile.links)
      .map(([label, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`)
      .join("");

    return `
      <div class="profile-heading">
        <img class="profile-avatar" src="${escapeHtml(profile.avatar)}" alt="${escapeHtml(profile.name)}">
        <div>
          <div class="drawer-eyebrow">Profile</div>
          <h2 id="drawer-title" class="drawer-title">${escapeHtml(profile.name)}</h2>
        </div>
      </div>
      <p class="drawer-one-liner">${escapeHtml(profile.description)}</p>
      <div class="drawer-links profile-links">${links}</div>
    `;
  }

  function openDrawerMarkup(markup, updateUrl, hash) {
    lastFocused = document.activeElement;
    drawerContent.innerHTML = markup;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    profileTrigger.setAttribute("aria-expanded", String(hash === "#about"));
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("is-open"));
    document.body.classList.add("drawer-open");

    if (updateUrl && location.hash !== hash) history.pushState({ drawer: hash }, "", hash);
    closeButton.focus({ preventScroll: true });
  }

  function openDrawer(item, updateUrl = false) {
    if (!item) return;
    openDrawerMarkup(drawerMarkup(item), updateUrl, `#work=${encodeURIComponent(item.id)}`);
  }

  function openProfile(updateUrl = false) {
    openDrawerMarkup(profileMarkup(), updateUrl, "#about");
  }

  function closeDrawer(updateUrl = false) {
    if (!drawer.classList.contains("is-open")) return;

    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    profileTrigger.setAttribute("aria-expanded", "false");
    backdrop.classList.remove("is-open");
    document.body.classList.remove("drawer-open");

    window.setTimeout(() => {
      if (!drawer.classList.contains("is-open")) backdrop.hidden = true;
    }, 220);

    if (updateUrl && (location.hash.startsWith("#work=") || location.hash === "#about")) {
      history.replaceState(null, "", location.pathname + location.search);
    }

    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function syncFromUrl() {
    if (location.hash === "#about") {
      openProfile(false);
      return;
    }

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
  profileTrigger.addEventListener("click", () => openProfile(true));
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

      renderFilters();
      renderGrid(visibleWorks());
      syncFromUrl();
    })
    .catch((error) => {
      console.error(error);
      count.textContent = "0";
      grid.innerHTML = '<p class="works-state">Could not load works.</p>';
    });
})();

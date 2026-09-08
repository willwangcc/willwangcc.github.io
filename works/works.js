(() => {
  const DATA_URL = "/data/works.v1.json";
  const grid = document.getElementById("works-grid");
  const count = document.getElementById("works-count");
  const filters = document.getElementById("works-filters");
  const profileTrigger = document.getElementById("profile-trigger");
  const worksIntro = document.getElementById("works-intro");
  const pageTitle = document.getElementById("page-title");
  const languageToggle = document.getElementById("language-toggle");
  const languageOptions = [...document.querySelectorAll(".language-option")];
  const drawer = document.getElementById("work-drawer");
  const drawerContent = document.getElementById("drawer-content");
  const closeButton = document.getElementById("drawer-close");
  const backdrop = document.getElementById("drawer-backdrop");
  const metaDescription = document.querySelector('meta[name="description"]');

  let works = [];
  let activeCategory = "all";
  let lastFocused = null;

  const categoryOrder = ["Film", "Book", "App", "Knowledge System", "Video", "Game"];
  const profile = {
    name: "Will Wang",
    avatar: "https://i.imgur.com/OJjTJOt.jpg",
    links: {
      LinkedIn: "https://www.linkedin.com/in/zhixiangwang/",
      Bilibili: "https://space.bilibili.com/8464298",
      YouTube: "https://www.youtube.com/@GrittyGuide"
    }
  };

  const copy = {
    en: {
      documentTitle: "Works — Will Wang",
      metaDescription: "Selected works by Will Wang.",
      pageTitle: "Works",
      intro: " — a builder exploring the interface between human thought and AI, asking: what remains constant as everything changes?",
      languageLabel: "Language",
      profileAria: "Open Will's profile",
      filtersAria: "Filter works by type",
      gridAria: "Selected works",
      closeAria: "Close details",
      profileLabel: "Profile",
      profileDescription: "A builder exploring the interface between human thought and AI.",
      loading: "Loading…",
      empty: "No works yet.",
      error: "Could not load works.",
      open: "Open",
      all: "All",
      categories: {
        Film: "Film",
        Book: "Book",
        App: "App",
        "Knowledge System": "Knowledge System",
        Video: "Video",
        Game: "Game"
      },
      links: {
        live: "Live",
        github: "GitHub",
        case_study: "Case study",
        source: "Source",
        email: "Email",
        lifetime: "Lifetime",
        about: "About",
        inspiration: "Inspiration"
      }
    },
    zh: {
      documentTitle: "作品 — Will Wang",
      metaDescription: "Will Wang 的作品。",
      pageTitle: "作品",
      intro: " —— 一个造东西的人，探索人类思维与 AI 的界面，并追问：万物皆变，什么不变？",
      languageLabel: "语言",
      profileAria: "查看 Will 的简介",
      filtersAria: "按类型筛选作品",
      gridAria: "作品列表",
      closeAria: "关闭详情",
      profileLabel: "简介",
      profileDescription: "一个造东西的人，探索人类思维与 AI 的界面。",
      loading: "加载中…",
      empty: "这里还没有作品。",
      error: "作品加载失败。",
      open: "打开",
      all: "全部",
      categories: {
        Film: "影像",
        Book: "书",
        App: "应用",
        "Knowledge System": "知识系统",
        Video: "视频",
        Game: "游戏"
      },
      links: {
        live: "在线",
        github: "GitHub",
        case_study: "案例",
        source: "来源",
        email: "邮件",
        lifetime: "Lifetime",
        about: "关于",
        inspiration: "灵感"
      }
    }
  };

  const supportedLocales = new Set(Object.keys(copy));
  const queryLocale = new URLSearchParams(location.search).get("lang");
  const storedLocale = (() => {
    try { return localStorage.getItem("works-locale"); } catch (_) { return null; }
  })();
  const browserLocale = navigator.language && navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  let locale = supportedLocales.has(queryLocale)
    ? queryLocale
    : supportedLocales.has(storedLocale)
      ? storedLocale
      : browserLocale;

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function localizedWork(item) {
    const localized = item.i18n && item.i18n[locale] ? item.i18n[locale] : {};
    return { ...item, ...localized, links: item.links };
  }

  function labelForLink(key) {
    const localized = copy[locale].links[key];
    if (localized) return localized;
    return key.replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());
  }

  function setIntroText(text) {
    const textNode = [...worksIntro.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = text;
  }

  function applyStaticCopy() {
    const t = copy[locale];
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = t.documentTitle;
    if (metaDescription) metaDescription.setAttribute("content", t.metaDescription);
    pageTitle.textContent = t.pageTitle;
    setIntroText(t.intro);
    languageToggle.setAttribute("aria-label", t.languageLabel);
    profileTrigger.setAttribute("aria-label", t.profileAria);
    filters.setAttribute("aria-label", t.filtersAria);
    grid.setAttribute("aria-label", t.gridAria);
    closeButton.setAttribute("aria-label", t.closeAria);

    languageOptions.forEach((button) => {
      const isActive = button.dataset.locale === locale;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function persistLocale(nextLocale) {
    try { localStorage.setItem("works-locale", nextLocale); } catch (_) {}
    const url = new URL(location.href);
    url.searchParams.set("lang", nextLocale);
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function setLocale(nextLocale, persist = true) {
    if (!supportedLocales.has(nextLocale) || nextLocale === locale) return;
    locale = nextLocale;
    if (persist) persistLocale(nextLocale);
    applyStaticCopy();
    renderFilters();
    renderGrid(visibleWorks());
    syncFromUrl();
  }

  function visibleWorks() {
    return activeCategory === "all"
      ? works
      : works.filter(item => item.category === activeCategory);
  }

  function renderFilters() {
    filters.innerHTML = "";
    const categories = categoryOrder.filter(category => works.some(item => item.category === category));
    const options = [
      { id: "all", label: `${copy[locale].all} (${works.length})` },
      ...categories.map(category => ({ id: category, label: copy[locale].categories[category] || category }))
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
      grid.innerHTML = `<p class="works-state">${escapeHtml(copy[locale].empty)}</p>`;
      return;
    }

    items.forEach((item) => {
      const view = localizedWork(item);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "work-card";
      card.dataset.workId = item.id;
      card.setAttribute("aria-label", `${copy[locale].open} ${view.title}`);
      card.style.aspectRatio = item.aspect_ratio || "4 / 3";

      const img = document.createElement("img");
      img.src = item.cover || "";
      img.alt = view.cover_alt || view.title || "Work cover";
      img.loading = "lazy";
      img.decoding = "async";
      if (["cover", "contain"].includes(item.cover_fit)) img.style.objectFit = item.cover_fit;
      if (item.cover_position) img.style.objectPosition = item.cover_position;

      const fallback = document.createElement("span");
      fallback.className = "work-card-fallback";
      fallback.textContent = view.title;

      img.addEventListener("error", () => card.classList.add("is-fallback"), { once: true });
      if (!item.cover) card.classList.add("is-fallback");

      card.append(img, fallback);
      card.addEventListener("click", () => openDrawer(item, true));
      grid.appendChild(card);
    });
  }

  function drawerMarkup(item) {
    const view = localizedWork(item);
    const tags = Array.isArray(view.tags) && view.tags.length
      ? `<div class="drawer-tags">${view.tags.map(tag => `<span class="drawer-tag">${escapeHtml(tag)}</span>`).join("")}</div>`
      : "";

    const links = item.links && typeof item.links === "object"
      ? Object.entries(item.links)
          .filter(([, url]) => Boolean(url))
          .map(([key, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(labelForLink(key))} ↗</a>`)
          .join("")
      : "";

    const eyebrow = [view.year, view.type].filter(Boolean).map(escapeHtml).join(" · ");

    return `
      ${eyebrow ? `<div class="drawer-eyebrow">${eyebrow}</div>` : ""}
      <h2 id="drawer-title" class="drawer-title">${escapeHtml(view.title)}</h2>
      ${view.one_liner ? `<p class="drawer-one-liner">${escapeHtml(view.one_liner)}</p>` : ""}
      ${view.description ? `<p class="drawer-description">${escapeHtml(view.description)}</p>` : ""}
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
          <div class="drawer-eyebrow">${escapeHtml(copy[locale].profileLabel)}</div>
          <h2 id="drawer-title" class="drawer-title">${escapeHtml(profile.name)}</h2>
        </div>
      </div>
      <p class="drawer-one-liner">${escapeHtml(copy[locale].profileDescription)}</p>
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
  languageOptions.forEach((button) => button.addEventListener("click", () => setLocale(button.dataset.locale)));
  window.addEventListener("popstate", syncFromUrl);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer(true);
  });

  applyStaticCopy();
  grid.innerHTML = `<p class="works-state">${escapeHtml(copy[locale].loading)}</p>`;

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
      grid.innerHTML = `<p class="works-state">${escapeHtml(copy[locale].error)}</p>`;
    });
})();

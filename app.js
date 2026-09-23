/**
 * app.js — VERSIÓN 2 (vista por año)
 * ---------------------------------------------------------------------------
 * Propuesta alternativa de visualización, usando exactamente el mismo
 * Google Sheet y el mismo modelo de datos que la Versión 1 (timeline
 * horizontal con zoom/pan), pero organizada de otra forma:
 *
 *   - En vez de un eje X continuo con puntos que hay que separar a mano
 *     para que no se superpongan, los hitos se listan en un feed vertical
 *     agrupado por AÑO (orden cronológico, año más antiguo arriba) y,
 *     dentro de cada año, por CATEGORÍA. La superposición es imposible
 *     por construcción: es una lista normal, no posiciones en píxeles
 *     calculadas a mano, así que el navegador la distribuye sola sin
 *     importar cuántos hitos haya.
 *   - Cada año es una sección plegable (colapsable). Con muchos hitos
 *     repartidos en muchos años, solo los años más recientes arrancan
 *     expandidos (ver CONFIG.FEED) — así la carga inicial es liviana
 *     incluso con miles de hitos, y el usuario abre a demanda los años
 *     que le interesan.
 *   - Un índice de años a la derecha (con una mini barra proporcional a
 *     la cantidad de hitos de cada año) permite saltar directo a
 *     cualquier año y ver de un vistazo cómo se distribuyen los hitos en
 *     el tiempo, sin tener que hacer zoom/pan.
 *
 * No depende de D3 (no hace falta para este layout): solo PapaParse para
 * leer el CSV del Sheet. No depende de TimelineJS ni de Knight Lab.
 *
 * Organización del archivo:
 *   0. Utilidades
 *   1. Carga de datos desde Google Sheets (idéntica a la Versión 1)
 *   2. Estado global de la app
 *   3. Construcción de listas de filtros (idéntica a la Versión 1)
 *   4. Filtrado + búsqueda (idéntica a la Versión 1)
 *   5. Agrupación por año → categoría
 *   6. Render del feed (secciones por año, plegables)
 *   7. Índice de años (mini-mapa navegable) + scrollspy
 *   8. Tooltip
 *   9. Panel de detalle
 *  10. Sidebar: filtros
 *  11. Leyenda de Estado
 *  12. Resultados / estado de carga
 *  13. Inicialización general
 * ---------------------------------------------------------------------------
 */

(function () {
  "use strict";

  // =========================================================================
  // 0. UTILIDADES
  // =========================================================================

  function debounce(fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function normalizeForSearch(str) {
    if (!str) return "";
    return str
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  }

  function trimHeader(h) {
    return (h || "").toString().trim();
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return str
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function estadoColor(estado) {
    return CONFIG.COLORS_BY_ESTADO[estado] || CONFIG.COLORS_BY_ESTADO.default;
  }

  // Busca en CONFIG.IMAGE_OVERRIDES si el hito (Año + Título exacto) tiene
  // una imagen asignada manualmente. Devuelve { src, alt } o null.
  function findImageOverride(anio, headline) {
    const list = CONFIG.IMAGE_OVERRIDES || [];
    const match = list.find(
      (o) => o.anio === anio && o.titulo.trim() === headline.trim()
    );
    return match ? { src: match.src, alt: match.alt || "" } : null;
  }

  function estadoLabel(estado) {
    return estado === "default" ? "Sin estado" : estado;
  }

  // =========================================================================
  // 1. CARGA DE DATOS DESDE GOOGLE SHEETS
  // =========================================================================

  function fetchCsvText(url) {
    return fetch(url, { cache: "no-store" }).then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status + " al pedir el Sheet");
      return res.text();
    });
  }

  /**
   * Intenta primero la fuente preferida (config.PREFERRED_SOURCE); si falla
   * (red, CORS, o el Sheet publicado no está configurado), intenta con la
   * otra fuente disponible automáticamente.
   */
  function fetchSheetCsv() {
    const gvizUrl = CONFIG.GVIZ_CSV_URL;
    const publishedUrl = (CONFIG.PUBLISHED_CSV_URL || "").trim();

    const sources =
      CONFIG.PREFERRED_SOURCE === "published"
        ? [publishedUrl, gvizUrl]
        : [gvizUrl, publishedUrl];

    const usable = sources.filter((u) => !!u);

    function tryNext(i) {
      if (i >= usable.length) {
        return Promise.reject(
          new Error(
            "No se pudo leer el Google Sheet desde ninguna de las fuentes configuradas."
          )
        );
      }
      return fetchCsvText(usable[i]).catch((err) => {
        console.warn("Falló la fuente de datos:", usable[i], err);
        return tryNext(i + 1);
      });
    }

    return tryNext(0);
  }

  function parseCsv(csvText) {
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: trimHeader,
    });
    if (parsed.errors && parsed.errors.length) {
      console.warn("Advertencias al parsear el CSV:", parsed.errors);
    }
    return parsed.data;
  }

  function normalizeRows(rawRows) {
    const c = CONFIG.COLUMNS;
    const events = [];
    let skipped = 0;

    rawRows.forEach((row, i) => {
      const anioRaw = (row[c.anio] || "").toString().trim();
      const anio = parseInt(anioRaw, 10);
      const headline = (row[c.headline] || "").toString().trim();
      const categoria = (row[c.categoria] || "").toString().trim() || "Sin categoría";

      if (!anioRaw || Number.isNaN(anio) || !headline) {
        skipped += 1;
        return;
      }

      events.push({
        id: "evt-" + i,
        anio: anio,
        categoria: categoria,
        subcategoria: (row[c.subcategoria] || "").toString().trim(),
        headline: headline,
        text: (row[c.text] || "").toString().trim(),
        fuente: (row[c.fuente] || "").toString().trim(),
        estado: (row[c.estado] || "").toString().trim() || "default",
        imagen: findImageOverride(anio, headline),
        rowOrder: i,
        searchBlob: normalizeForSearch(
          [headline, row[c.text], categoria, row[c.subcategoria], row[c.fuente]]
            .filter(Boolean)
            .join(" | ")
        ),
      });
    });

    return { events, skipped };
  }

  // =========================================================================
  // 2. ESTADO GLOBAL DE LA APP
  // =========================================================================

  const state = {
    allEvents: [],
    categorias: [],
    subcategorias: [],
    estados: [],
    fuentes: [],
    anioMin: 0,
    anioMax: 0,

    filters: {
      categoria: new Set(),
      subcategoria: new Set(),
      estado: new Set(),
      fuente: new Set(),
      anioMin: null,
      anioMax: null,
    },
    searchQuery: "",

    yearGroups: [], // [{anio, count, categorias:[{categoria, events}]}]
    expandedYears: new Set(),
    expandedInitialized: false,
    eventsById: new Map(),
    yearObserver: null,
  };

  // =========================================================================
  // 3. CONSTRUCCIÓN DE LISTAS DE FILTROS
  // =========================================================================

  function buildFacet(events, key) {
    const counts = new Map();
    events.forEach((e) => {
      const v = e[key];
      if (!v) return;
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "es"));
  }

  function computeFacets() {
    state.categorias = buildFacet(state.allEvents, "categoria");
    state.subcategorias = buildFacet(
      state.allEvents.filter((e) => e.subcategoria),
      "subcategoria"
    );
    state.estados = buildFacet(state.allEvents, "estado");
    state.fuentes = buildFacet(state.allEvents, "fuente");

    const anios = state.allEvents.map((e) => e.anio);
    state.anioMin = Math.min(...anios);
    state.anioMax = Math.max(...anios);
    state.filters.anioMin = state.anioMin;
    state.filters.anioMax = state.anioMax;
  }

  // =========================================================================
  // 4. FILTRADO + BÚSQUEDA
  // =========================================================================

  function getFilteredEvents() {
    const f = state.filters;
    const q = state.searchQuery;

    return state.allEvents.filter((e) => {
      if (f.categoria.size && !f.categoria.has(e.categoria)) return false;
      if (f.subcategoria.size && !f.subcategoria.has(e.subcategoria)) return false;
      if (f.estado.size && !f.estado.has(e.estado)) return false;
      if (f.fuente.size && !f.fuente.has(e.fuente)) return false;
      if (f.anioMin !== null && e.anio < f.anioMin) return false;
      if (f.anioMax !== null && e.anio > f.anioMax) return false;
      if (q && !e.searchBlob.includes(q)) return false;
      return true;
    });
  }

  // =========================================================================
  // 5. AGRUPACIÓN POR AÑO → CATEGORÍA
  // =========================================================================

  function buildYearGroups(events) {
    const byYear = new Map();
    events.forEach((e) => {
      if (!byYear.has(e.anio)) byYear.set(e.anio, []);
      byYear.get(e.anio).push(e);
    });

    const years = Array.from(byYear.keys()).sort((a, b) => a - b);

    return years.map((anio) => {
      const evs = byYear.get(anio);
      const byCat = new Map();
      evs.forEach((e) => {
        if (!byCat.has(e.categoria)) byCat.set(e.categoria, []);
        byCat.get(e.categoria).push(e);
      });
      const categorias = Array.from(byCat.keys())
        .sort((a, b) => a.localeCompare(b, "es"))
        .map((cat) => ({
          categoria: cat,
          events: byCat.get(cat).slice().sort((x, y) => x.rowOrder - y.rowOrder),
        }));
      return { anio, count: evs.length, categorias };
    });
  }

  /**
   * Decide qué años arrancan expandidos la primera vez que se cargan los
   * datos. Si el total de hitos visibles es chico, se abren todos
   * directamente; si es grande, solo los años más recientes (el resto
   * queda colapsado y se abre a demanda con un click).
   */
  function computeInitialExpandedYears(yearGroups) {
    const total = yearGroups.reduce((s, g) => s + g.count, 0);
    const set = new Set();
    if (total <= CONFIG.FEED.autoExpandAllBelow) {
      yearGroups.forEach((g) => set.add(g.anio));
    } else {
      yearGroups.slice(-CONFIG.FEED.autoExpandRecentYears).forEach((g) => set.add(g.anio));
    }
    return set;
  }

  // =========================================================================
  // 6. RENDER DEL FEED (secciones por año, plegables)
  // =========================================================================

  function renderHitoRowHtml(e) {
    const color = estadoColor(e.estado);
    const metaParts = [];
    if (e.subcategoria) metaParts.push(escapeHtml(e.subcategoria));
    metaParts.push(escapeHtml(estadoLabel(e.estado)));
    if (e.fuente) metaParts.push(escapeHtml(e.fuente));

    return (
      `<div class="hito-row${e.imagen ? " hito-row--has-image" : ""}" data-id="${e.id}">` +
      `<span class="hito-row__dot" style="background:${color.fill}" aria-hidden="true"></span>` +
      `<div class="hito-row__main">` +
      `<div class="hito-row__headline">${escapeHtml(e.headline)}${
        e.imagen ? ' <span class="hito-row__image-badge" title="Tiene imagen">🖼</span>' : ""
      }</div>` +
      `<div class="hito-row__meta">${metaParts.join(" · ")}</div>` +
      `</div>` +
      `</div>`
    );
  }

  function renderYearBodyHtml(g) {
    return g.categorias
      .map(
        (catGroup) =>
          `<div class="year-cat-group">` +
          `<div class="year-cat-group__title">${escapeHtml(catGroup.categoria)}</div>` +
          `<div class="year-cat-group__rows">${catGroup.events
            .map(renderHitoRowHtml)
            .join("")}</div>` +
          `</div>`
      )
      .join("");
  }

  function renderYearSectionHtml(g) {
    const isOpen = state.expandedYears.has(g.anio);
    const bodyHtml = isOpen ? renderYearBodyHtml(g) : "";
    const countLabel = g.count + (g.count === 1 ? " hito" : " hitos");
    return (
      `<section class="year-section${isOpen ? " open" : ""}" data-year="${g.anio}" id="year-${g.anio}">` +
      `<button type="button" class="year-section__header" data-action="toggle-year" data-year="${g.anio}" aria-expanded="${isOpen}">` +
      `<svg class="year-section__chevron" viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>` +
      `<span class="year-section__year">${g.anio}</span>` +
      `<span class="year-section__count">${countLabel}</span>` +
      `</button>` +
      `<div class="year-section__body">${bodyHtml}</div>` +
      `</section>`
    );
  }

  function renderFeed() {
    const events = getFilteredEvents();
    const yearGroups = buildYearGroups(events);
    state.yearGroups = yearGroups;
    state.eventsById = new Map(events.map((e) => [e.id, e]));

    if (!state.expandedInitialized) {
      state.expandedYears = computeInitialExpandedYears(yearGroups);
      state.expandedInitialized = true;
    } else {
      // Si tras filtrar aparecen años nuevos que antes no existían en el
      // conjunto visible, se respetan las preferencias de apertura ya
      // elegidas por el usuario para los años que ya conocía; los años
      // "nuevos" heredan el mismo criterio inicial (chico → abierto).
    }

    const feed = document.getElementById("feed");
    const empty = document.getElementById("feed-empty");

    updateResultsCount(events.length);

    if (!yearGroups.length) {
      feed.innerHTML = "";
      empty.hidden = false;
      empty.textContent = CONFIG.UI_TEXT.emptyMessage;
      renderYearIndex([]);
      return;
    }

    empty.hidden = true;
    feed.innerHTML = yearGroups.map(renderYearSectionHtml).join("");

    renderYearIndex(yearGroups);
    setupScrollSpy();
  }

  function toggleYear(yearStr) {
    const year = Number(yearStr);
    if (state.expandedYears.has(year)) state.expandedYears.delete(year);
    else state.expandedYears.add(year);
    renderFeed();
  }

  function expandAllYears() {
    state.yearGroups.forEach((g) => state.expandedYears.add(g.anio));
    renderFeed();
  }

  function collapseAllYears() {
    state.expandedYears.clear();
    renderFeed();
  }

  // Delegación de eventos: un solo listener por tipo de evento en el
  // contenedor del feed, en vez de uno por fila. Así el rendimiento no se
  // degrada sin importar cuántos hitos haya en pantalla.
  function wireFeedDelegation() {
    const feed = document.getElementById("feed");

    feed.addEventListener("click", (ev) => {
      const toggleBtn = ev.target.closest('[data-action="toggle-year"]');
      if (toggleBtn) {
        toggleYear(toggleBtn.dataset.year);
        return;
      }
      const row = ev.target.closest(".hito-row");
      if (row) {
        const e = state.eventsById.get(row.dataset.id);
        if (e) openDetailPanel(e);
      }
    });

    feed.addEventListener("mouseover", (ev) => {
      const row = ev.target.closest(".hito-row");
      if (!row) return;
      const e = state.eventsById.get(row.dataset.id);
      if (e) showTooltip(ev, e);
    });
    feed.addEventListener("mousemove", (ev) => {
      if (ev.target.closest(".hito-row")) moveTooltip(ev);
    });
    feed.addEventListener("mouseout", (ev) => {
      if (ev.target.closest(".hito-row")) hideTooltip();
    });
  }

  // =========================================================================
  // 7. ÍNDICE DE AÑOS (mini-mapa navegable) + scrollspy
  // =========================================================================

  function renderYearIndex(yearGroups) {
    const list = document.getElementById("year-index-list");
    if (!yearGroups.length) {
      list.innerHTML = "";
      return;
    }
    const maxCount = Math.max(...yearGroups.map((g) => g.count));
    list.innerHTML = yearGroups
      .map((g) => {
        const pct = maxCount > 0 ? Math.max(8, Math.round((g.count / maxCount) * 100)) : 8;
        return (
          `<button type="button" class="year-index__item" data-year="${g.anio}" title="${g.anio} · ${g.count} hitos">` +
          `<span class="year-index__bar" style="height:${pct}%"></span>` +
          `<span class="year-index__label">${g.anio}</span>` +
          `</button>`
        );
      })
      .join("");
  }

  function wireYearIndexDelegation() {
    document.getElementById("year-index-list").addEventListener("click", (ev) => {
      const btn = ev.target.closest(".year-index__item");
      if (!btn) return;
      const year = Number(btn.dataset.year);
      if (!state.expandedYears.has(year)) {
        state.expandedYears.add(year);
        renderFeed();
      }
      requestAnimationFrame(() => {
        const el = document.getElementById("year-" + year);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function setupScrollSpy() {
    if (state.yearObserver) state.yearObserver.disconnect();
    const sections = document.querySelectorAll(".year-section");
    if (!sections.length) return;

    const wrapper = document.getElementById("feed-wrapper");
    state.yearObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const year = entry.target.dataset.year;
            document.querySelectorAll(".year-index__item").forEach((el) => {
              el.classList.toggle("current", el.dataset.year === year);
            });
          }
        });
      },
      { root: wrapper, rootMargin: "-10% 0px -75% 0px", threshold: 0 }
    );
    sections.forEach((s) => state.yearObserver.observe(s));
  }

  // =========================================================================
  // 8. TOOLTIP
  // =========================================================================

  function showTooltip(event, e) {
    const tip = document.getElementById("tooltip");
    const maxChars = CONFIG.FEED.tooltipTextPreviewChars;
    const full = e.text || "";
    const preview = full.slice(0, maxChars);
    const ellipsis = full.length > maxChars ? "…" : "";

    tip.innerHTML =
      `<div class="tooltip__headline">${escapeHtml(e.headline)}</div>` +
      `<div class="tooltip__meta">${escapeHtml(estadoLabel(e.estado))} · ${escapeHtml(e.categoria)} · ${e.anio}</div>` +
      (preview
        ? `<div class="tooltip__preview">${escapeHtml(preview)}${ellipsis}</div>`
        : "") +
      (e.imagen ? `<div class="tooltip__hint">🖼 Tiene imagen — click para verla</div>` : "");
    tip.hidden = false;
    moveTooltip(event);
  }

  function moveTooltip(event) {
    const tip = document.getElementById("tooltip");
    const pad = 14;
    let x = event.clientX + pad;
    let y = event.clientY + pad;
    const maxX = window.innerWidth - 320;
    const maxY = window.innerHeight - 100;
    if (x > maxX) x = event.clientX - pad - 280;
    if (y > maxY) y = event.clientY - pad - 60;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  function hideTooltip() {
    document.getElementById("tooltip").hidden = true;
  }

  // =========================================================================
  // 9. PANEL DE DETALLE
  // =========================================================================

  function openDetailPanel(e) {
    const panel = document.getElementById("detail-panel");
    const backdrop = document.getElementById("detail-backdrop");
    const content = document.getElementById("detail-content");
    const color = estadoColor(e.estado);

    content.innerHTML = `
      <div class="detail-badge" style="background:${color.fill}22; color:${color.fill};">
        <span class="detail-badge__dot" style="background:${color.fill};"></span>
        ${escapeHtml(estadoLabel(e.estado))}
      </div>
      <h2 class="detail-panel__headline">${escapeHtml(e.headline)}</h2>

      ${
        e.imagen
          ? `<div class="detail-field detail-field__image">
               <img src="${escapeHtml(e.imagen.src)}" alt="${escapeHtml(e.imagen.alt)}" loading="lazy">
             </div>`
          : ""
      }

      <div class="detail-field">
        <div class="detail-field__label">Año</div>
        <div class="detail-field__value">${e.anio}</div>
      </div>

      <div class="detail-field">
        <div class="detail-field__label">Categoría</div>
        <div class="detail-field__value">${escapeHtml(e.categoria)}</div>
      </div>

      ${
        e.subcategoria
          ? `<div class="detail-field">
               <div class="detail-field__label">Subcategoría</div>
               <div class="detail-field__value">${escapeHtml(e.subcategoria)}</div>
             </div>`
          : ""
      }

      <div class="detail-field">
        <div class="detail-field__label">Texto completo</div>
        <div class="detail-field__value">${
          e.text ? escapeHtml(e.text) : '<span class="detail-field__value--muted">Sin texto</span>'
        }</div>
      </div>

      <div class="detail-field">
        <div class="detail-field__label">Fuente</div>
        <div class="detail-field__value">${
          e.fuente ? escapeHtml(e.fuente) : '<span class="detail-field__value--muted">Sin fuente</span>'
        }</div>
      </div>
    `;

    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      panel.classList.add("open");
    });
  }

  function closeDetailPanel() {
    const panel = document.getElementById("detail-panel");
    const backdrop = document.getElementById("detail-backdrop");
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;
  }

  // =========================================================================
  // 10. SIDEBAR: FILTROS
  // =========================================================================

  function renderChecklistFilter(containerId, facetList, filterKey, withSwatch) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    facetList.forEach((item) => {
      const id = containerId + "-" + item.value.replace(/[^a-zA-Z0-9]/g, "_");
      const label = document.createElement("label");
      label.className = "filter-option";
      label.setAttribute("for", id);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = id;
      checkbox.checked = state.filters[filterKey].has(item.value);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.filters[filterKey].add(item.value);
        else state.filters[filterKey].delete(item.value);
        renderFeed();
      });

      label.appendChild(checkbox);

      if (withSwatch) {
        const swatch = document.createElement("span");
        swatch.className = "filter-option__swatch";
        swatch.style.background = estadoColor(item.value).fill;
        label.appendChild(swatch);
      }

      const text = document.createElement("span");
      text.className = "filter-option__label";
      text.textContent = item.value;
      label.appendChild(text);

      const count = document.createElement("span");
      count.className = "filter-option__count";
      count.textContent = item.count;
      label.appendChild(count);

      container.appendChild(label);
    });
  }

  function renderAllFilters() {
    renderChecklistFilter("filter-categoria", state.categorias, "categoria", false);
    renderChecklistFilter("filter-subcategoria", state.subcategorias, "subcategoria", false);
    renderChecklistFilter("filter-estado", state.estados, "estado", true);
    renderChecklistFilter("filter-fuente", state.fuentes, "fuente", false);
    setupAnioRange();
  }

  function setupAnioRange() {
    const min = state.anioMin;
    const max = state.anioMax;
    const minInput = document.getElementById("anio-min");
    const maxInput = document.getElementById("anio-max");
    const minLabel = document.getElementById("anio-min-label");
    const maxLabel = document.getElementById("anio-max-label");
    const fill = document.getElementById("anio-range-fill");

    [minInput, maxInput].forEach((inp) => {
      inp.min = min;
      inp.max = max;
      inp.step = 1;
    });
    minInput.value = state.filters.anioMin;
    maxInput.value = state.filters.anioMax;

    function updateFillAndLabels() {
      const lo = Math.min(Number(minInput.value), Number(maxInput.value));
      const hi = Math.max(Number(minInput.value), Number(maxInput.value));
      minLabel.textContent = lo;
      maxLabel.textContent = hi;
      const pctLo = max > min ? ((lo - min) / (max - min)) * 100 : 0;
      const pctHi = max > min ? ((hi - min) / (max - min)) * 100 : 100;
      fill.style.left = pctLo + "%";
      fill.style.width = Math.max(pctHi - pctLo, 0) + "%";
    }
    updateFillAndLabels();

    function onInput() {
      const lo = Math.min(Number(minInput.value), Number(maxInput.value));
      const hi = Math.max(Number(minInput.value), Number(maxInput.value));
      state.filters.anioMin = lo;
      state.filters.anioMax = hi;
      updateFillAndLabels();
      renderFeed();
    }

    minInput.oninput = onInput;
    maxInput.oninput = onInput;
  }

  function clearAllFilters() {
    state.filters.categoria.clear();
    state.filters.subcategoria.clear();
    state.filters.estado.clear();
    state.filters.fuente.clear();
    state.filters.anioMin = state.anioMin;
    state.filters.anioMax = state.anioMax;
    document.getElementById("search-input").value = "";
    state.searchQuery = "";
    document.getElementById("search-clear").hidden = true;
    renderAllFilters();
    renderFeed();
  }

  // =========================================================================
  // 11. LEYENDA DE ESTADO
  // =========================================================================

  function renderLegend() {
    const container = document.getElementById("estado-legend");
    container.innerHTML = "";
    state.estados.forEach((item) => {
      const color = estadoColor(item.value);
      const el = document.createElement("div");
      el.className = "legend-item";
      el.innerHTML = `<span class="legend-item__swatch" style="background:${color.fill}"></span>${escapeHtml(
        item.value
      )}`;
      container.appendChild(el);
    });
  }

  // =========================================================================
  // 12. RESULTADOS / ESTADO DE CARGA
  // =========================================================================

  function updateResultsCount(n) {
    document.getElementById("results-count").textContent =
      n + " " + CONFIG.UI_TEXT.resultsCountSuffix;
  }

  function showBanner(message, isError) {
    const banner = document.getElementById("status-banner");
    banner.textContent = message;
    banner.hidden = false;
    banner.classList.toggle("status-banner--error", !!isError);
  }

  function hideBanner() {
    document.getElementById("status-banner").hidden = true;
  }

  // =========================================================================
  // 13. INICIALIZACIÓN GENERAL
  // =========================================================================

  function wireStaticUi() {
    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear");
    const applySearch = debounce((value) => {
      state.searchQuery = normalizeForSearch(value);
      renderFeed();
    }, CONFIG.SEARCH_DEBOUNCE_MS);

    searchInput.addEventListener("input", (ev) => {
      const v = ev.target.value;
      searchClear.hidden = v.length === 0;
      applySearch(v);
    });
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchClear.hidden = true;
      state.searchQuery = "";
      renderFeed();
      searchInput.focus();
    });

    document.querySelectorAll(".filter-group__header").forEach((btn) => {
      btn.addEventListener("click", () => {
        const expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
      });
    });

    document.getElementById("clear-filters").addEventListener("click", clearAllFilters);

    document.getElementById("expand-all").addEventListener("click", expandAllYears);
    document.getElementById("collapse-all").addEventListener("click", collapseAllYears);

    document.getElementById("detail-close").addEventListener("click", closeDetailPanel);
    document.getElementById("detail-backdrop").addEventListener("click", closeDetailPanel);
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        closeDetailPanel();
        closeSidebarMobile();
      }
    });

    const sidebar = document.getElementById("sidebar");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const filtersToggle = document.getElementById("filters-toggle");

    function openSidebarMobile() {
      sidebar.classList.add("open");
      sidebarBackdrop.classList.add("open");
      filtersToggle.setAttribute("aria-expanded", "true");
    }
    function closeSidebarMobile() {
      sidebar.classList.remove("open");
      sidebarBackdrop.classList.remove("open");
      filtersToggle.setAttribute("aria-expanded", "false");
    }
    filtersToggle.addEventListener("click", () => {
      const isOpen = sidebar.classList.contains("open");
      if (isOpen) closeSidebarMobile();
      else openSidebarMobile();
    });
    sidebarBackdrop.addEventListener("click", closeSidebarMobile);

    wireFeedDelegation();
    wireYearIndexDelegation();

    document.getElementById("app-title").textContent = CONFIG.UI_TEXT.appTitle;
    document.title = CONFIG.UI_TEXT.appTitle;
    searchInput.placeholder = CONFIG.UI_TEXT.searchPlaceholder;
    document.getElementById("expand-all").textContent = CONFIG.UI_TEXT.expandAllLabel;
    document.getElementById("collapse-all").textContent = CONFIG.UI_TEXT.collapseAllLabel;
    document.getElementById("year-index-title").textContent = CONFIG.UI_TEXT.yearIndexTitle;
  }

  function loadAndStart() {
    showBanner(CONFIG.UI_TEXT.loadingMessage, false);

    fetchSheetCsv()
      .then((csvText) => {
        const rawRows = parseCsv(csvText);
        const { events, skipped } = normalizeRows(rawRows);

        if (!events.length) {
          throw new Error("El Sheet se leyó correctamente pero no contiene filas utilizables.");
        }

        state.allEvents = events;
        computeFacets();
        renderAllFilters();
        renderLegend();
        renderFeed();

        if (skipped > 0) {
          showBanner(
            `Se cargaron ${events.length} hitos. ${skipped} fila(s) se omitieron por no tener Año o Título.`,
            false
          );
        } else {
          hideBanner();
        }

        if (CONFIG.AUTO_REFRESH_MS && CONFIG.AUTO_REFRESH_MS > 0) {
          setInterval(refreshData, CONFIG.AUTO_REFRESH_MS);
        }
      })
      .catch((err) => {
        console.error(err);
        showBanner(CONFIG.UI_TEXT.errorMessage + " (" + err.message + ")", true);
      });
  }

  function refreshData() {
    fetchSheetCsv()
      .then((csvText) => {
        const rawRows = parseCsv(csvText);
        const { events } = normalizeRows(rawRows);
        if (!events.length) return;
        state.allEvents = events;
        computeFacets();
        renderAllFilters();
        renderLegend();
        renderFeed();
      })
      .catch((err) => {
        console.warn("Falló la actualización automática del Sheet:", err);
      });
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireStaticUi();
    loadAndStart();
  });
})();

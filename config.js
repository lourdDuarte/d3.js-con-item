/**
 * config.js — VERSIÓN 2 (vista por año)
 * ---------------------------------------------------------------------------
 * Configuración centralizada de todo el proyecto. Cualquier ajuste de
 * fuente de datos, columnas, colores o comportamiento se hace ÚNICAMENTE
 * en este archivo. El resto del código (app.js) lee siempre de aquí y no
 * tiene valores "hardcodeados".
 *
 * Esta es una propuesta alternativa de visualización (misma fuente de
 * datos que la Versión 1, otra forma de organizarla): en vez de un
 * timeline horizontal con zoom/pan, es un listado cronológico vertical
 * agrupado por Año, con un índice/mini-mapa de años a la derecha. Ver el
 * README para la explicación completa de por qué esta organización
 * escala mejor a cientos o miles de hitos.
 * ---------------------------------------------------------------------------
 */

const CONFIG = {

  // ---------------------------------------------------------------------
  // FUENTE DE DATOS (Google Sheets) — idéntica a la Versión 1
  // ---------------------------------------------------------------------
  SHEET_ID: "1G8HB9Bf7P5CUlTqjkS4oaDg-2eU20D2nT_lhClXjsE0",
  GID: "0",

  get GVIZ_CSV_URL() {
    return `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/gviz/tq?tqx=out:csv&gid=${this.GID}`;
  },

  PUBLISHED_CSV_URL: "",
  PREFERRED_SOURCE: "gviz",
  AUTO_REFRESH_MS: 0,

  // ---------------------------------------------------------------------
  // MAPEO DE COLUMNAS — idéntico a la Versión 1
  // ---------------------------------------------------------------------
  COLUMNS: {
    anio: "Año",
    categoria: "Categoria",
    subcategoria: "Subcategoría",
    headline: "Título",
    text: "Extracción del discurso",
    fuente: "Fuente",
    estado: "Observacion"
  },

  IGNORED_COLUMNS: ["Recategorización", "Aporte"],

  // ---------------------------------------------------------------------
  // COLORES POR ESTADO — idéntico a la Versión 1 (misma paleta, mismo
  // significado: el color siempre representa el Estado del hito)
  // ---------------------------------------------------------------------
  COLORS_BY_ESTADO: {
    "Anuncio":       { fill: "#5C8DF6", label: "Anuncio" },
    "En ejecución":  { fill: "#F0A94E", label: "En ejecución" },
    "Realizado":     { fill: "#3FAE7A", label: "Realizado" },
    "Finalizado":    { fill: "#8B7BD8", label: "Finalizado" },
    "default":       { fill: "#98A2B3", label: "Sin estado" }
  },

  // ---------------------------------------------------------------------
  // COMPORTAMIENTO DEL LISTADO POR AÑO
  // ---------------------------------------------------------------------
  FEED: {
    // Cuántos de los años más recientes se muestran expandidos al cargar
    // la página (el resto arranca colapsado, mostrando solo el
    // encabezado con el conteo, para que la carga inicial sea liviana
    // incluso con miles de hitos repartidos en muchos años).
    autoExpandRecentYears: 3,

    // Si el total de hitos visibles (tras filtros/búsqueda) es menor o
    // igual a este número, se ignora "autoExpandRecentYears" y se
    // expanden TODOS los años directamente — con pocos resultados no
    // hace falta pedirle al usuario que abra cada año a mano.
    autoExpandAllBelow: 120,

    // Distancia (en px) antes de que una sección entre en pantalla para
    // empezar a "premontar" su contenido (mejora la sensación de
    // scroll). Solo aplica a secciones expandidas.
    lazyMountRootMargin: "800px 0px 800px 0px",

    // Longitud máxima del fragmento de texto mostrado en el tooltip al
    // pasar el mouse sobre un hito.
    tooltipTextPreviewChars: 170
  },

  // ---------------------------------------------------------------------
  // TAMAÑOS / ESPACIADO
  // ---------------------------------------------------------------------
  LAYOUT: {
    yearBarMaxWidth: 46, // ancho máximo de cada barra en el índice de años
    markerDotSize: 10    // tamaño del punto de color (Estado) en cada fila
  },

  // ---------------------------------------------------------------------
  // COMPORTAMIENTO GENERAL
  // ---------------------------------------------------------------------
  SEARCH_DEBOUNCE_MS: 180,
  RESIZE_DEBOUNCE_MS: 150,

  // ---------------------------------------------------------------------
  // TEXTOS DE LA INTERFAZ
  // ---------------------------------------------------------------------
  UI_TEXT: {
    appTitle: "Línea de tiempo — Vista por año",
    searchPlaceholder: "Buscar por título, texto, categoría, subcategoría o fuente…",
    filtersTitle: "Filtros",
    categoriaLabel: "Categoría",
    subcategoriaLabel: "Subcategoría",
    estadoLabel: "Estado",
    anioLabel: "Año",
    fuenteLabel: "Fuente",
    clearFiltersLabel: "Limpiar filtros",
    resultsCountSuffix: "hitos",
    loadingMessage: "Cargando datos del Google Sheet…",
    errorMessage: "No se pudo leer el Google Sheet. Revisá config.js y el README.",
    emptyMessage: "Ningún hito coincide con los filtros/búsqueda actuales.",
    detailPanelClose: "Cerrar",
    expandAllLabel: "Expandir todo",
    collapseAllLabel: "Colapsar todo",
    yearIndexTitle: "Años"
  }
};

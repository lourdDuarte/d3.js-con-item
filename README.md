# Línea de tiempo — Versión 2: Vista por año

Segunda propuesta de visualización, independiente de la Versión 1
(timeline horizontal con zoom/pan). Usa **exactamente el mismo Google
Sheet y el mismo modelo de datos** que la Versión 1 — no se modifica ni
un dato — pero organiza la información de otra forma, pensada
específicamente para que sea fácil de leer aunque haya cientos o miles
de hitos.

**No usa TimelineJS ni depende de Knight Lab.** Es HTML + CSS +
JavaScript propio. A diferencia de la Versión 1, ni siquiera necesita
D3.js: esta vista es un listado con estructura normal de página web
(no dibujo en un `<canvas>`/SVG con posiciones en píxeles calculadas a
mano), así que la única librería externa que usa es:

- **PapaParse v5** — parsea el CSV que se descarga del Google Sheet.

Los datos se leen **en vivo** desde el Sheet cada vez que se abre la
página, igual que en la Versión 1: nada se copia dentro del proyecto.

---

## Índice

1. [Por qué esta organización (y en qué se diferencia de la Versión 1)](#1-por-qué-esta-organización-y-en-qué-se-diferencia-de-la-versión-1)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Cómo ejecutarlo localmente](#3-cómo-ejecutarlo-localmente)
4. [Cómo publicarlo en GitHub Pages](#4-cómo-publicarlo-en-github-pages)
5. [Cómo cambiar el Google Sheet de origen](#5-cómo-cambiar-el-google-sheet-de-origen)
6. [Cómo actualizar la información](#6-cómo-actualizar-la-información)
7. [Cómo modificar los colores](#7-cómo-modificar-los-colores)
8. [Cómo modificar los estilos / el diseño](#8-cómo-modificar-los-estilos--el-diseño)
9. [Cómo agregar nuevas columnas](#9-cómo-agregar-nuevas-columnas)
10. [Cómo funciona por dentro (resumen técnico)](#10-cómo-funciona-por-dentro-resumen-técnico)
11. [Rendimiento con cientos o miles de hitos](#11-rendimiento-con-cientos-o-miles-de-hitos)
12. [Solución de problemas](#12-solución-de-problemas)

---

## 1. Por qué esta organización (y en qué se diferencia de la Versión 1)

La Versión 1 dibuja los hitos como puntos sobre un eje horizontal
continuo (los años en X, las categorías en filas) y depende de que el
usuario haga zoom/pan para separar visualmente los puntos que caen muy
cerca. Funciona bien, pero tiene un límite estructural: cuantos más
hitos comparten un mismo período, más apretados quedan los puntos hasta
que hay que acercar el zoom para distinguirlos uno por uno.

Esta Versión 2 cambia el principio de organización:

- **Es un listado, no un dibujo con coordenadas.** Los hitos se
  presentan como filas de texto agrupadas por **Año** (sección
  plegable, año más antiguo arriba) y, dentro de cada año, por
  **Categoría**. Al ser una lista normal de la página (no posiciones en
  píxeles calculadas a mano), **la superposición es imposible por
  construcción**: el navegador reserva el espacio vertical que cada
  fila necesita, sin importar cuántos hitos haya.
- **Las secciones de año son plegables**, y con muchos hitos repartidos
  en muchos años, solo los años más recientes arrancan expandidos (el
  resto arranca colapsado, mostrando nada más que el encabezado con el
  conteo). Esto mantiene la carga inicial liviana con miles de hitos,
  y el usuario abre a demanda los años que le interesan — o usa
  "Expandir todo" si prefiere ver todo de una vez.
- **Un índice de años a la derecha** (una mini barra por año,
  proporcional a la cantidad de hitos de ese año) permite saltar
  directo a cualquier año con un click y, de paso, funciona como un
  mini-histograma: de un vistazo se ve en qué años hay más o menos
  actividad, sin necesidad de hacer zoom/pan para descubrirlo.
- El scroll es **vertical**, el gesto más natural en cualquier
  dispositivo (especialmente en celular, donde el pan horizontal de la
  Versión 1 es más incómodo de operar con el dedo).

El color por Estado, los filtros combinables (Categoría, Subcategoría,
Estado, Año, Fuente), la búsqueda en tiempo real, el tooltip al pasar
el mouse y el panel de detalle al hacer click son los mismos conceptos
que en la Versión 1 — cambia la organización espacial, no el modelo de
interacción ni el significado de los colores.

---

## 2. Estructura del proyecto

```
timeline-d3-v2/
├── index.html          # Estructura de la página (topbar, sidebar, feed, índice de años, panel de detalle)
├── style.css            # Todos los estilos visuales
├── app.js               # Toda la lógica de la aplicación
├── config.js             # ÚNICO archivo que normalmente necesitás tocar: Sheet, columnas, colores, comportamiento
├── assets/
│   └── favicon.svg      # Ícono de la pestaña del navegador
└── README.md             # Este archivo
```

No hay proceso de build, ni `npm install`, ni compilación de ningún
tipo. Es un sitio 100% estático: abrís `index.html` (con un servidor
local, ver sección 3) y funciona.

---

## 3. Cómo ejecutarlo localmente

Igual que en la Versión 1: los navegadores bloquean que una página HTML
abierta directamente desde el disco (`file:///...`) pida datos a otro
dominio (Google Sheets), así que hace falta un servidor local mínimo.

**Opción A — Python:**

```bash
cd timeline-d3-v2
python3 -m http.server 8000
```

Abrí en el navegador: `http://localhost:8000`

**Opción B — Node.js:**

```bash
cd timeline-d3-v2
npx serve .
```

**Opción C — Extensión "Live Server" de VS Code:** click derecho sobre
`index.html` → "Open with Live Server".

---

## 4. Cómo publicarlo en GitHub Pages

1. Creá un repositorio en GitHub y subí el contenido completo de esta
   carpeta (`index.html`, `style.css`, `app.js`, `config.js`,
   `assets/`, `README.md`) a su raíz.
2. **Settings → Pages** → en "Source" elegí **"Deploy from a branch"**,
   rama `main`, carpeta `/ (root)`. Guardá.
3. Esperá uno o dos minutos: GitHub te da la URL pública
   (`https://<usuario>.github.io/<repositorio>/`).
4. El Google Sheet configurado en `config.js` tiene que estar
   compartido como "Cualquiera con el enlace puede ver" (igual que en
   la Versión 1 — ver sección 5.1) para que la app funcione para
   cualquier visitante.

Cada actualización posterior (`git push`) se refleja sola en la URL
pública, normalmente en menos de un minuto.

> Nota: si ya publicaste la Versión 1 en un repositorio de GitHub
> Pages, esta Versión 2 puede vivir en un repositorio aparte (o en una
> subcarpeta del mismo sitio, p. ej. `/v2/`), para tener las dos
> visualizaciones disponibles en paralelo y comparar.

---

## 5. Cómo cambiar el Google Sheet de origen

Idéntico al procedimiento de la Versión 1, porque ambas leen el Sheet
de la misma forma.

### 5.1. El Sheet tiene que ser visible sin iniciar sesión

**Compartir → Acceso general → "Cualquiera que tenga el enlace"**, rol
**"Lector"**. La app solo lee, nunca escribe en el Sheet.

### 5.2. Método recomendado: URL de GVIZ

De la URL del Sheet:

```
https://docs.google.com/spreadsheets/d/  SHEET_ID  /edit#gid=  GID
```

En `config.js`:

```js
SHEET_ID: "TU_SHEET_ID_ACA",
GID: "TU_GID_ACA",
```

### 5.3. Alternativa: "Publicar en la web"

Si el método GVIZ da error de CORS: **Archivo → Compartir → Publicar en
la web**, elegí la hoja específica, formato **CSV**, copiá el enlace
(`output=csv`) y en `config.js`:

```js
PUBLISHED_CSV_URL: "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv",
PREFERRED_SOURCE: "published",
```

### 5.4. Actualización automática (opcional)

```js
AUTO_REFRESH_MS: 300000,   // 5 minutos; 0 para desactivar (por defecto)
```

---

## 6. Cómo actualizar la información

Igual que en la Versión 1: se administra enteramente desde el Google
Sheet. Agregá, editá o borrá filas ahí — los cambios aparecen al
recargar la página (o solos, si activaste `AUTO_REFRESH_MS`). Mismas
recomendaciones de consistencia de datos que en la Versión 1 (Año
numérico, redacción exacta y consistente en Categoría/Subcategoría/
Estado, etc.) — si ya usaste el script de normalización de categorías
de este mismo proyecto, no hace falta hacer nada más.

---

## 7. Cómo modificar los colores

### 7.1. Colores por Estado

En `config.js`, bloque `COLORS_BY_ESTADO` — mismo formato y mismo
significado que en la Versión 1 (el color siempre representa el
Estado, nunca la Categoría):

```js
COLORS_BY_ESTADO: {
  "Anuncio":       { fill: "#5C8DF6", label: "Anuncio" },
  "En ejecución":  { fill: "#F0A94E", label: "En ejecución" },
  "Realizado":     { fill: "#3FAE7A", label: "Realizado" },
  "Finalizado":    { fill: "#8B7BD8", label: "Finalizado" },
  "default":       { fill: "#98A2B3", label: "Sin estado" }
},
```

La clave tiene que coincidir exactamente con el valor de la columna de
Estado en el Sheet. Un valor no listado usa `"default"` automáticamente.
Se refleja solo en la leyenda, el punto de color de cada fila y el
panel de detalle.

### 7.2. Paleta general de la interfaz

En `style.css`, bloque `:root` (variables CSS `--color-bg`,
`--color-text`, `--color-accent`, etc.) — igual que en la Versión 1:
cambiá el valor y se aplica en toda la aplicación.

---

## 8. Cómo modificar los estilos / el diseño

Todo vive en `style.css`, organizado en secciones comentadas. Ajustes
frecuentes específicos de esta versión:

- **Ancho máximo del listado central**: `.feed { max-width: 880px; }`
  — angostalo o agrandalo según prefieras.
- **Ancho del índice de años**: variable `--year-index-width` en
  `:root` (76px por defecto).
- **Cuándo se oculta el índice de años en pantallas chicas**: bloque
  `@media (max-width: 768px) { .year-index { display: none; } }`.
- **Tamaño/espaciado de cada fila de hito**: reglas `.hito-row`,
  `.hito-row__headline`, `.hito-row__meta`.
- **Apariencia de las secciones de año** (tarjeta, borde, radio):
  reglas `.year-section`, `.year-section__header`.
- **Tipografía**: `font-family` en `body`, al principio del archivo.

Los puntos de quiebre responsive están al final del archivo, en
bloques `@media (max-width: ...)` (1024px, 768px y 640px).

---

## 9. Cómo agregar nuevas columnas

Mismo mecanismo de tres pasos que en la Versión 1 (el mapeo de columnas
en `config.js` es idéntico entre ambas versiones). Siguiendo el
ejemplo de agregar "Responsable":

### 9.1. Mapear la columna en `config.js`

```js
COLUMNS: {
  anio: "Año",
  categoria: "Categoria",
  subcategoria: "Subcategoría",
  headline: "Título",
  text: "Extracción del discurso",
  fuente: "Fuente",
  estado: "Observacion",
  responsable: "Responsable"   // ← nueva columna
},
```

### 9.2. Leer el campo al cargar los datos

En `app.js`, sección **"1. CARGA DE DATOS DESDE GOOGLE SHEETS"**,
dentro de `normalizeRows`, en el `events.push({ ... })`:

```js
events.push({
  id: "evt-" + i,
  anio: anio,
  categoria: categoria,
  // ...campos existentes...
  responsable: (row[c.responsable] || "").toString().trim(),   // ← nuevo
  ...
});
```

### 9.3. Mostrarlo en la fila del listado (opcional)

Sección **"6. RENDER DEL FEED"**, función `renderHitoRowHtml(e)`: el
array `metaParts` arma la línea gris debajo del título (por ahora
Subcategoría · Estado · Fuente). Agregá el campo nuevo donde prefieras
que aparezca:

```js
if (e.responsable) metaParts.push(escapeHtml(e.responsable));
```

### 9.4. Mostrarlo en el panel de detalle

Sección **"9. PANEL DE DETALLE"**, función `openDetailPanel(e)`: copiá
uno de los bloques `<div class="detail-field">...</div>` existentes
(por ejemplo el de "Fuente") y adaptalo:

```js
<div class="detail-field">
  <div class="detail-field__label">Responsable</div>
  <div class="detail-field__value">${escapeHtml(e.responsable)}</div>
</div>
```

### 9.5. Incluirlo en la búsqueda (opcional)

En el mismo `events.push({...})` del paso 9.2, sumá el campo al
`searchBlob`:

```js
searchBlob: normalizeForSearch(
  [headline, row[c.text], categoria, row[c.subcategoria], row[c.fuente], row[c.responsable]]
    .filter(Boolean)
    .join(" | ")
),
```

### 9.6. Convertirlo en un filtro de la barra lateral (opcional)

Mismo patrón reutilizable que en la Versión 1 (función
`renderChecklistFilter`, ya existente en `app.js`, sección **"10.
SIDEBAR: FILTROS"**). Necesitás, en total:

1. Agregar `responsables: []` a `state` y `responsable: new Set()` a
   `state.filters` (sección "2. ESTADO GLOBAL DE LA APP").
2. `state.responsables = buildFacet(state.allEvents, "responsable");`
   dentro de `computeFacets()` (sección "3. CONSTRUCCIÓN DE LISTAS DE
   FILTROS").
3. `if (f.responsable.size && !f.responsable.has(e.responsable)) return false;`
   dentro de `getFilteredEvents()` (sección "4. FILTRADO + BÚSQUEDA").
4. `renderChecklistFilter("filter-responsable", state.responsables, "responsable", false);`
   dentro de `renderAllFilters()` (sección "10. SIDEBAR: FILTROS").
5. En `index.html`, copiar el bloque
   `<div class="filter-group" data-filter="fuente">...</div>` completo
   y reemplazar `fuente`/`Fuente` por `responsable`/`Responsable`
   (incluido `id="filter-responsable"`).

---

## 10. Cómo funciona por dentro (resumen técnico)

`app.js` está organizado en 13 secciones numeradas, cada una con un
comentario de bloque:

0. **Utilidades**: normalización de texto para buscar, debounce, escape
   de HTML, color/etiqueta de Estado.
1. **Carga de datos**: idéntica a la Versión 1 — descarga el CSV del
   Sheet, lo parsea con PapaParse, normaliza cada fila a un evento y
   arma `searchBlob` para la búsqueda.
2. **Estado global**: datos crudos, filtros activos, texto de
   búsqueda, agrupación por año ya calculada, qué años están
   expandidos, y un `Map` de id→evento para resolver clicks rápido.
3. **Construcción de listas de filtros**: igual que la Versión 1
   (valores únicos de Categoría/Subcategoría/Estado/Fuente/Año).
4. **Filtrado + búsqueda**: igual que la Versión 1.
5. **Agrupación por año → categoría**: a partir de los eventos
   filtrados, arma la estructura `[{ anio, count, categorias: [{
   categoria, events }] }]` ordenada cronológicamente, y decide qué
   años arrancan expandidos (`computeInitialExpandedYears`): si el
   total visible es chico, todos; si es grande, solo los N años más
   recientes (configurable en `CONFIG.FEED`).
6. **Render del feed**: arma el HTML de cada sección de año (con sus
   subgrupos por categoría y filas de hito) como texto y lo asigna de
   una sola vez a `#feed.innerHTML` — mucho más rápido que crear miles
   de nodos DOM uno por uno. Un solo listener de click/hover en el
   contenedor del feed (delegación de eventos) resuelve qué fila se
   tocó, en vez de un listener por fila.
7. **Índice de años**: dibuja la mini barra por año a la derecha y
   usa un `IntersectionObserver` para detectar qué sección de año está
   actualmente en pantalla y resaltar el ítem correspondiente
   (scrollspy). Click en un ítem expande ese año si estaba colapsado y
   hace scroll suave hasta ahí.
8. **Tooltip**: resumen (Estado, Categoría, Año + primeras ~170
   caracteres del texto) al pasar el mouse por una fila.
9. **Panel de detalle**: contenido completo al hacer click en una fila.
10. **Sidebar: filtros**: checkboxes + rango de años, igual que la
    Versión 1.
11. **Leyenda de Estado**.
12. **Resultados / estado de carga**.
13. **Inicialización general**: conecta los eventos de la UI estática
    (buscador, filtros, botones expandir/colapsar todo, sidebar
    responsive) y dispara la primera carga de datos.

No hay ningún framework ni paso de build: JavaScript "vanilla", pensado
para que cualquier persona con conocimientos básicos de JS pueda leer y
modificar el código sin herramientas adicionales.

---

## 11. Rendimiento con cientos o miles de hitos

Esta versión está pensada, desde el diseño, para escalar mejor que un
timeline de posiciones en píxeles a medida que crece la cantidad de
hitos:

- **La superposición no existe como problema**: al ser una lista con
  flujo de documento normal (no coordenadas x/y calculadas a mano), el
  navegador reserva el alto que cada fila necesita. No hay ningún
  cálculo de colisión que pueda fallar o degradarse con más datos.
- **Carga inicial liviana**: solo los años más recientes arrancan
  expandidos (`CONFIG.FEED.autoExpandRecentYears`); el resto no
  renderiza sus filas en el DOM hasta que el usuario abre esa sección
  (o usa "Expandir todo"). Con miles de hitos repartidos en muchos
  años, esto mantiene el árbol DOM inicial chico.
- **Un solo listener por tipo de evento** (click, hover) en el
  contenedor del feed, no uno por fila — el costo de memoria/CPU de los
  event listeners no crece con la cantidad de hitos.
- **Reconstrucción por texto, no por nodos**: cada actualización del
  feed arma un string HTML y lo asigna una vez (`innerHTML = ...`), que
  el navegador procesa de forma mucho más eficiente que ir agregando
  miles de elementos uno por uno con `appendChild`.
- **Debounce** en la búsqueda (`CONFIG.SEARCH_DEBOUNCE_MS`) para no
  recalcular en cada tecla.

Si en algún momento el dataset crece a decenas de miles de filas, el
ajuste más directo es bajar `CONFIG.FEED.autoExpandRecentYears` y
`autoExpandAllBelow` para que arranque con menos secciones abiertas por
defecto.

---

## 12. Solución de problemas

Los mismos casos que la Versión 1 aplican acá (mensaje de error de
lectura del Sheet, nombres de columnas que no coinciden, cambios que no
se reflejan sin recargar) — ver la sección "Solución de problemas" del
README de la Versión 1 para el detalle completo, es idéntico porque
ambas versiones leen el Sheet de la misma forma.

Específico de esta versión:

**"No veo ningún hito de tal año."**
Ese año puede estar colapsado — hacé click en su encabezado (o en su
ítem en el índice de la derecha) para expandirlo, o usá "Expandir
todo" en la barra de herramientas.

**"El índice de años no aparece."**
Es esperado en pantallas angostas (menores a 768px): se oculta a
propósito para dejarle todo el ancho al listado, que ya es
perfectamente navegable con scroll normal en esos tamaños.

**"Al buscar/filtrar, un año que yo había abierto a mano se volvió a
cerrar."**
No debería pasar: el estado de apertura de cada año se conserva entre
búsquedas y filtros. Si notás lo contrario, revisá que no se haya
modificado `state.expandedYears` en algún lugar del código.

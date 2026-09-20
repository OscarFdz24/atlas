# Atlas — guía técnica

Mapa mundial interactivo para explorar y comparar indicadores de países usando datos abiertos.

Ver [`README.md`](README.md) para la descripción del producto. Este documento recoge las
**decisiones técnicas y las restricciones** que las motivan.

## Principio rector

Los datos son **idénticos para todos los visitantes**. No hay usuarios, ni sesiones, ni datos
privados, ni contenido generado por el visitante.

De ahí se deriva todo lo demás: la aplicación puede ser **100 % estática**. Los datos se descargan
y se procesan **antes del despliegue**, no durante la visita. El navegador solo lee ficheros JSON
ya preparados. Sin backend, sin base de datos, sin claves de API en producción, sin coste.

Cualquier propuesta que rompa esto (un servidor, una llamada a API desde el navegador, una base
de datos) debe justificarse muy bien, porque rompe la restricción de coste cero del workspace.

## Stack

| Capa | Elección | Por qué |
|---|---|---|
| Web | **Astro** + islas de React + TypeScript | Genera HTML real por página en tiempo de build — requisito para el SEO (ver más abajo) |
| Mapa | `d3-geo` + TopoJSON (Natural Earth) | Un coropletas no necesita tiles ni servidor de mapas |
| Gráficas | **Observable Plot** → SVG en tiempo de build | Renderiza de forma síncrona, así que la gráfica va dentro del HTML. **Recharts está descartado: no renderiza en servidor** |
| Pipeline de datos | Python: **uv**, **Polars**, **DuckDB**, **Pandera** | Ver [`METODOLOGIA.md`](METODOLOGIA.md) para el porqué de cada uno |
| Orquestación | `Makefile` + GitHub Actions | Sin orquestador: Airflow/Dagster/Prefect asumen infraestructura desplegada |
| Hosting | Cloudflare Pages | Capa gratuita sin límite de tráfico práctico |
| Actualización | GitHub Actions (cron mensual) | Re-ejecuta el pipeline y despliega |

**Nada de MapLibre ni Mapbox**: sirven tiles y ahí aparecen cuotas y claves. Un mapa de
coropletas se dibuja con geometrías vectoriales servidas como fichero estático.

## Estructura prevista

```
atlas/
├── pipeline/          # Python: descarga y normaliza datos → JSON
│   ├── sources/       # Un módulo por fuente (worldbank.py, owid.py, ...)
│   └── build.py       # Orquesta todo y escribe en web/public/data/
├── web/               # Aplicación Astro
│   ├── public/data/   # JSON generados — se versionan en git, no se editan a mano
│   └── src/
│       ├── pages/     # Rutas pregeneradas (país, indicador, comparación)
│       └── components/  # Islas de React: mapa y gráficas
└── data/indicators.yaml  # Catálogo de indicadores: qué se descarga y cómo se presenta
```

Los JSON de `web/public/data/` son **artefactos generados**. Nunca se editan a mano: se cambia el
pipeline y se regeneran.

## Fuentes de datos

Solo fuentes **abiertas, sin clave de API y con licencia que permita redistribución**:

- **Banco Mundial** — `api.worldbank.org/v2` — sin clave, cientos de indicadores, CC-BY 4.0. Fuente principal.
- **Our World in Data** — CSV descargables, CC-BY 4.0. Salud, energía, clima, democracia.
- **REST Countries** — metadatos base (ISO, capital, región, banderas).
- **Natural Earth** — geometrías del mapa, dominio público.
- **Eurostat / OECD** (SDMX) — más detalle para Europa y OCDE. Fase posterior.

**Descartado: Numbeo.** Es la fuente obvia para coste de vida y alquiler por ciudad, pero su API
es de pago. No se scrapea. Por eso la v1 no promete "coste de vida" sino los indicadores que sí se
pueden obtener y redistribuir legalmente.

### Comprobaciones antes de añadir una fuente

Toda fuente nueva pasa por esta lista **antes** de escribir una línea de código que la descargue.
El resultado se anota en `contexto/decisiones.md`. Si alguna respuesta es "no" o "no lo sé", la
fuente no entra:

1. ¿Los datos son **públicos**, sin registro ni muro de pago?
2. ¿Tiene una **licencia explícita** que permita uso y redistribución? ¿Cuál, y dónde está escrita?
3. ¿Sus **términos de uso** permiten la descarga automatizada?
4. ¿Ofrece **API o descarga directa**? Si la única vía es scrapear, revisar `robots.txt` y los
   términos; ante la duda, descartar.
5. ¿Está libre de **datos personales**? Solo agregados por país o región.
6. ¿Se puede **atribuir** correctamente en la interfaz?

Además, en toda descarga: `User-Agent` identificativo con un contacto, frecuencia limitada, y
caché de respuestas para no repetir peticiones. Las fuentes ya aprobadas están listadas arriba;
**Numbeo está descartada** por tener API de pago, y no se scrapea como alternativa.

Cada fuente debe citarse en la interfaz, con su licencia y el año del dato.

## Honestidad con los datos

Esto es lo que distingue un proyecto de datos serio de un panel bonito:

- **No decir "tiempo real".** Casi todo son series **anuales** publicadas con 1–2 años de retraso.
  Mostrar siempre el año del dato junto al valor.
- **Los huecos se muestran, no se rellenan.** Si un país no reporta un indicador, se pinta como
  "sin datos", no se interpola ni se deja en blanco confundiéndolo con un cero.
- **Nunca comparar valores en unidades distintas** sin normalizar (per cápita, PPA, % del PIB).
  El catálogo de indicadores debe registrar la unidad de forma explícita.

## SEO

Atlas se publica para ser encontrado desde Google. Esto no es un retoque final: **condiciona la
arquitectura**, y por eso el stack usa Astro y no una SPA.

### El problema con una SPA

Una aplicación de página única entrega un `<div id="root">` vacío y lo rellena JavaScript. Google
sí ejecuta JavaScript, pero lo hace en una segunda pasada, con retraso y de forma poco fiable, y
el resto de buscadores y las previsualizaciones de redes sociales ni lo intentan. Una web de datos
que vive de la búsqueda orgánica no puede permitírselo.

### La oportunidad: una página por combinación

El contenido de Atlas es masivamente multiplicable y encaja con búsquedas reales que la gente
escribe. Con ~200 países × ~20 indicadores salen **miles de páginas de long tail**, cada una
respondiendo a una consulta concreta:

- `/es/pais/espana` → "datos de España"
- `/es/indicador/esperanza-de-vida` → "esperanza de vida por país"
- `/es/pais/espana/esperanza-de-vida` → "esperanza de vida en España"
- `/es/comparar/espana-vs-portugal` → "comparar España y Portugal"

Cada una se **pregenera como HTML estático en tiempo de build**, con su texto, su tabla de datos y
su cifra principal ya en el código fuente. El mapa y las gráficas se hidratan después como islas de
React: son mejora, no requisito para leer la página.

### Reglas

- **Una URL por vista con contenido propio.** Nada de estado significativo guardado solo en el
  fragmento (`#`) o en parámetros de consulta: si merece indexarse, es una ruta.
- **Contenido real en el HTML servido.** La cifra principal, el año y una descripción en texto van
  en el HTML, no solo dentro de una gráfica. Un gráfico SVG no es contenido indexable.
- **URLs estables y legibles**, sin acentos ni mayúsculas. Una vez publicadas no se cambian; si
  hay que cambiarlas, redirección 301.
- **Datos estructurados** JSON-LD (`Dataset` y `BreadcrumbList`) en cada página.
- **`sitemap.xml` generado por el pipeline**, no a mano, y `robots.txt` permisivo.
- **Metadatos únicos por página**: `title`, `description` y Open Graph generados desde los datos.
  Nada de plantillas repetidas — el contenido duplicado hunde el posicionamiento.
- **Etiquetas `hreflang`** entre español e inglés, con `canonical` correcto.
- **Rendimiento como factor de posicionamiento:** objetivo Lighthouse > 90. El JSON de datos se
  carga por página, no el conjunto completo; el TopoJSON va simplificado; nada bloquea el render.
- **Accesibilidad:** jerarquía de encabezados correcta, `alt` en imágenes, contraste suficiente.
  Ayuda al posicionamiento y es lo correcto.

### Lo que no se hace

Nada de contenido generado en masa para captar tráfico, ni texto escrito para el buscador en lugar
de para la persona. Las páginas se posicionan porque el dato que contienen es el que se buscaba.

## Alcance de la v1

Cerrado y deliberadamente pequeño. Objetivo: estar desplegado y funcionando.

1. Mapa mundial de coropletas con un selector de indicador (~15–20 indicadores del Banco Mundial).
2. Clic en un país → panel lateral con su ficha y la serie histórica de ese indicador.
3. Vista "comparar dos países" en varios indicadores a la vez.
4. Rutas pregeneradas por país, por indicador y por pareja de países, con sus metadatos,
   JSON-LD y `sitemap.xml`. Es parte de la v1, no una mejora posterior: rehacer el enrutado
   después cuesta mucho más que hacerlo bien desde el principio.

**Fuera de la v1:** cuentas de usuario, mapas por ciudad, coste de vida, predicciones, IA,
descarga de datos, traducciones más allá de español e inglés.

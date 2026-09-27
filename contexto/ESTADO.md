# Estado actual

## ► SIGUIENTE PASO

**Fase 4: desplegar en Cloudflare Pages.** Conectar el repositorio, configurar el build (raíz
`web/`, salida `dist/`), fijar la URL real en `astro.config.mjs` y comprobar que carga.
Requiere permiso para operar contra un servicio externo.

**Dos fallos detectados en la captura, a corregir de paso:**
- La **Antártida** ocupa media pantalla en gris. En un mapa de países se quita.
- El texto del titular cita a **Mónaco** como valor más alto, y Mónaco es uno de los 48 países que
  no se dibujan. No se puede destacar un país que no se ve.

**Fase 3 completa.** Sub-fases 3.1 Astro · 3.2 geometrías · 3.3 mapa en SVG · 3.4 coropletas.

**3.4 verificada:** mapa coloreado con escala secuencial de un solo tono (azul, 7 tramos por
cuantiles), leyenda, modo oscuro con la rampa invertida, y etiquetas por país. Reparto medido:
30/25/24/26/22/23/19 países por tramo y 8 sin datos. Valores comprobados contra el pipeline
(España 83,9 · Japón 84,0 · Nigeria 54,6). 185 KiB, sin JavaScript.

**Pendiente de mirar con ojos:** el HTML está verificado, pero **nadie ha visto el mapa
renderizado todavía**. Arrancar `just dev` y comprobar que la proyección y la leyenda se ven bien.

**3.3 verificada:** `dist/index.html` contiene **177 `<path>`** dentro de un `<svg>`, 174 con
`data-code` alfa-3 (los 3 sin código son los territorios disputados). Proyección Natural Earth vía
`d3-geo`, renderizada en tiempo de build. **Cero JavaScript enviado.** `astro check` sin errores.
El HTML pesa 175 KB, que conviene vigilar cuando se multipliquen las páginas.

**3.1 verificada:** `web/` con Astro 7.3.5, `npm run build` genera `dist/index.html` con los datos
reales dentro del HTML (217 países, 1960–2024) y cero JavaScript enviado al navegador.

**3.2 verificada:** `data/geo/countries-110m.json` (Natural Earth, dominio público, 106 KB, 177
países) y `i18n-iso-countries` para cruzar ISO numérico con alfa-3. **169 de 177 geometrías cruzan
con datos**; 48 microestados tienen datos pero no geometría a esta escala. Detalle y motivos en
`decisiones.md`.

---

**Fase 3 (contexto original): la web.** Crear `web/` con Astro, cargar el TopoJSON de Natural Earth y pintar el mapa
mundial de coropletas con `d3-geo`, **como SVG en tiempo de build** (no en el navegador: tiene que
estar dentro del HTML). Consume `data/processed/indicators/life-expectancy.json`, que ya existe.

Requiere instalar dependencias de Node, así que hay que **pedir permiso** antes.

Repositorio: **https://github.com/OscarFdz24/atlas** (público, rama `main`).

## Plan por fases (reescrito el 2026-09-27 tras el cambio de producto)

Atlas pasa de documento a **herramienta de exploración**: globo 3D, panel lateral y constructor de
paneles. Ver `decisiones.md`. El orden se elige para **publicar cuanto antes** y construir lo
grande sobre algo que ya esté vivo.

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Pipeline de datos | **Hecha** |
| 2 | CI: `ci.yml` y `data-refresh.yml` | **Hecha** |
| 3 | Astro, geometrías y mapa de coropletas | **Hecha** |
| 4 | **Despliegue en Cloudflare Pages** | Siguiente |
| 5 | Ampliar el catálogo a 15–20 indicadores | Pendiente |
| 6 | Globo 3D: rotar, acercar, seleccionar país | Pendiente |
| 7 | Panel lateral: ficha de país y series históricas | Pendiente |
| 8 | Constructor de paneles | Pendiente |
| 9 | Rutas estáticas por país e indicador, y SEO | Pendiente |

**Por qué la 4 va primero:** cierra la rebanada vertical y deja el proyecto publicado. A partir de
ahí, cada mejora se ve en internet el mismo día. Es una fase corta.

**Por qué la 9 va al final y no se abandona:** el explorador es la herramienta, pero las páginas
estáticas son lo que encuentra Google. Se mantienen; solo cambian de orden.

**La fase 8 es la de riesgo.** Es la más larga con diferencia y no tiene un final evidente. Antes
de empezarla conviene escribir en una frase qué significa "terminada".

---

> **Última actualización:** 2026-09-20

## En una frase

El workspace está creado y documentado; **Atlas** es el proyecto activo, en fase de diseño, y
todavía **no existe una sola línea de código**.

## Situación

- Workspace `Proyectos_Claude` definido: propósito, restricción de coste cero, metodología, líneas
  rojas y estilo, todo en `CLAUDE.md`.
- **Atlas** elegido como primer proyecto: mapa mundial interactivo para comparar países con datos
  abiertos. Alcance de la v1 cerrado en `atlas/CLAUDE.md`.
- Hoja de ruta de ML/IA redactada en `atlas/ROADMAP.md`, en cuatro fases. La v1 va **sin IA** a
  propósito.
- Sistema de contexto persistente (este directorio) creado, con su regla en el `CLAUDE.md` del
  workspace. Va **por proyecto**, no en la raíz.
- **Requisito de SEO** incorporado: el stack pasa de Vite (SPA) a **Astro**, y el enrutado por
  rutas reales entra en el alcance de la v1.
- **Metodología y stack investigados y cerrados** en `atlas/METODOLOGIA.md`: método de rebanadas
  verticales, tres capas de datos con caché de respuestas, y stack Python (uv, Polars, DuckDB,
  Pandera) + Astro. Recharts descartado por no renderizar en servidor.
- **Organización interna cerrada** en `atlas/ORGANIZACION.md`: monorepo, trunk-based sobre `main`,
  Ruff/mypy/Biome, tres flujos de CI, issues de GitHub con límite de una tarea en curso.
- **Repositorio publicado:** https://github.com/OscarFdz24/atlas (público, `main`), con el primer
  commit de documentación y licencias MIT (código) + CC BY 4.0 (datos).

- **Fase 1 terminada: el pipeline funciona de extremo a extremo.** `just data` produce
  `data/processed/indicators/life-expectancy.json` (217 países, 1960–2024, 251 KiB) desde la API
  del Banco Mundial, con caché en `data/raw/`, validación con Pandera y 9 pruebas en verde.
  Herramientas instaladas: uv 0.12.17 y just 1.58.0 (se eligió `just` en lugar de `make`, que en
  Windows da problemas).

- **Fase 2 terminada: integración continua.** `ci.yml` pasa formato, linter, tipos y pruebas en
  cada push que toque el pipeline (con filtros por ruta). `data-refresh.yml` reejecuta el pipeline
  el día 1 de cada mes y hace commit de `data/` solo si algo cambió, con un commit de latido si el
  repositorio lleva 50 días quieto.

## Lo que NO existe todavía

- No hay web: ni Astro, ni mapa, ni páginas.
- No hay despliegue en Cloudflare Pages ni tablero de issues.
- El catálogo tiene **un solo indicador**. Ampliarlo es la fase 6.

## Pendientes de decidir (no bloquean, pero hay que resolverlos)

Anotados para verlos con calma más adelante:

1. **Los 48 países sin geometría** (Singapur, Malta, Mónaco, Hong Kong, Maldivas, Barbados…).
   Tienen datos pero no se dibujan a escala 1:110m. **Qué decidir:** si el mapa lo advierte con un
   aviso, si se listan aparte bajo el mapa, o si se sube a 1:50m (más peso). Ahora mismo
   simplemente no aparecen.
2. **Kosovo, Somalilandia y el norte de Chipre.** Sin código ISO numérico por ser territorios
   disputados. **Qué decidir:** si se les da tratamiento especial o se quedan como "sin datos".
   De momento no se les asigna código a mano, porque sería tomar posición política e inventar un
   dato.
3. **Taiwán, Sáhara Occidental, Malvinas, Territorios Antárticos Franceses y Antártida.** Tienen
   geometría pero el Banco Mundial no publica series. **Qué decidir:** si se explican en la
   interfaz o basta con pintarlos como "sin datos".
4. **La URL del sitio** está puesta como `https://atlas.pages.dev` de forma provisional en
   `web/astro.config.mjs`. Hay que fijarla en la fase 5, porque afecta a las URL canónicas y al
   sitemap.
5. **`data-refresh.yml` nunca se ha ejecutado.** Conviene lanzarlo a mano una vez antes de fiarse
   del cron del 1 de octubre.
6. **`CLAUDE.md` sigue listando REST Countries como fuente aprobada**, pero se descartó el
   2026-09-27 por no tener licencia explícita. Hay que corregir esa lista.

## Contexto abierto

- Existe una segunda idea **aparcada, no descartada**: un analizador de gastos personales que
  procesa el extracto bancario íntegramente en el navegador (coste cero y privacidad total como
  argumento). Es el candidato natural a segundo proyecto.

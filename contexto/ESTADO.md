# Estado actual

## ► SIGUIENTE PASO

**Fase 3: la web.** Crear `web/` con Astro, cargar el TopoJSON de Natural Earth y pintar el mapa
mundial de coropletas con `d3-geo`, **como SVG en tiempo de build** (no en el navegador: tiene que
estar dentro del HTML). Consume `data/processed/indicators/life-expectancy.json`, que ya existe.

Requiere instalar dependencias de Node, así que hay que **pedir permiso** antes.

Repositorio: **https://github.com/OscarFdz24/atlas** (público, rama `main`).

## Plan por fases

El trabajo se hace por fases cortas para controlar el consumo de tokens. Cada fase termina en un
estado que funciona y se puede revisar.

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Pipeline de datos: catálogo, descarga con caché, validación y JSON | **Hecha** |
| 2 | CI: `ci.yml` y `data-refresh.yml` | **Hecha** |
| 3 | Esqueleto de Astro y mapa de coropletas en SVG | Siguiente |
| 4 | Rutas por país e indicador, metadatos y SEO | Pendiente |
| 5 | Despliegue en Cloudflare Pages | Pendiente |
| 6 | Ampliar el catálogo a 15–20 indicadores | Pendiente |

Con las fases 1 a 5 terminadas, la rebanada vertical está completa y el sitio está publicado.
La fase 6 ya es repetición, no descubrimiento. La IA del `ROADMAP.md` viene después.

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

## Contexto abierto

- Existe una segunda idea **aparcada, no descartada**: un analizador de gastos personales que
  procesa el extracto bancario íntegramente en el navegador (coste cero y privacidad total como
  argumento). Es el candidato natural a segundo proyecto.

# Estado actual

## ► SIGUIENTE PASO

**Fase 2: integración continua.** Escribir `.github/workflows/ci.yml` (lint, tipos y pruebas, con
filtros por ruta) y `data-refresh.yml` (cron mensual que ejecuta el pipeline y hace commit de
`data/` si hay cambios). Recordar la trampa de los 60 días.

Repositorio: **https://github.com/OscarFdz24/atlas** (público, rama `main`).

## Plan por fases

El trabajo se hace por fases cortas para controlar el consumo de tokens. Cada fase termina en un
estado que funciona y se puede revisar.

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Pipeline de datos: catálogo, descarga con caché, validación y JSON | **Hecha** |
| 2 | CI: `ci.yml` y `data-refresh.yml` | Siguiente |
| 3 | Esqueleto de Astro y mapa de coropletas en SVG | Pendiente |
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

## Lo que NO existe todavía

- No hay web: ni Astro, ni mapa, ni páginas.
- No hay flujos de GitHub Actions, ni despliegue en Cloudflare Pages, ni tablero de issues.
- El catálogo tiene **un solo indicador**. Ampliarlo es la fase 6.

## Siguiente paso

La metodología acordada es de **rebanadas verticales**, así que el siguiente paso es la primera
rebanada completa: **un indicador (esperanza de vida), todos los países, desde la descarga del
Banco Mundial hasta una página desplegada en internet.**

Antes hace falta: inicializar git con su `.gitignore`, y montar el esqueleto del proyecto
(`pyproject.toml` con uv, estructura `src/atlas/`, `Makefile`).

## Contexto abierto

- Existe una segunda idea **aparcada, no descartada**: un analizador de gastos personales que
  procesa el extracto bancario íntegramente en el navegador (coste cero y privacidad total como
  argumento). Es el candidato natural a segundo proyecto.

# Estado actual

## ► SIGUIENTE PASO

**Montar el esqueleto del pipeline:** `uv init` con disposición `src/` en `pipeline/`, un `Makefile`
y el flujo `ci.yml` mínimo. Después, la primera rebanada vertical: esperanza de vida, todos los
países, desde la API del Banco Mundial hasta una página desplegada en Cloudflare Pages.

Antes de escribir el descargador, pasar la lista de comprobaciones de fuentes de `CLAUDE.md` para
el Banco Mundial y dejarlo anotado en `decisiones.md`.

Repositorio: **https://github.com/OscarFdz24/atlas** (público, rama `main`).

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

## Lo que NO existe todavía

- No hay código: ni pipeline de Python, ni aplicación web.
- El catálogo de indicadores (`data/indicators.yaml`) está previsto pero sin escribir.
- No hay flujos de GitHub Actions, ni despliegue en Cloudflare Pages, ni tablero de issues.

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

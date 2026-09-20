# Estado actual

## ► SIGUIENTE PASO

**El usuario tiene que ejecutar `gh auth login` a mano** (es interactivo, requiere navegador). Una
vez autenticado: primer commit de la documentación, crear el repositorio público
`OscarFdz24/atlas` y subirlo — pidiendo permiso para cada paso.

Después: esqueleto del pipeline con `uv init` (disposición `src/`) y primera rebanada vertical
—esperanza de vida, todos los países, del Banco Mundial hasta una página desplegada—.

**Decisión aplazada y bloqueante antes de publicar:** licencias. Ver `ORGANIZACION.md` §9.

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

## Lo que NO existe todavía

- El repositorio git no está inicializado.
- No hay código: ni pipeline de Python, ni aplicación web.
- El catálogo de indicadores (`atlas/data/indicators.yaml`) está previsto pero sin escribir.

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

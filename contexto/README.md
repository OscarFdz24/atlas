# contexto/

Memoria escrita del proyecto **Atlas**. Existe para que **ninguna información se pierda cuando la
conversación se comprime** (compactación) o cuando se empieza una sesión nueva desde cero.

Cada proyecto del workspace tiene su propio `contexto/`. No hay uno global: el contexto pertenece
al proyecto, y así se puede mover, archivar o abandonar un proyecto sin arrastrar la memoria de los
demás.

El principio es simple: **si algo solo existe en el chat, no existe.** La conversación es
volátil; estos ficheros no.

## Qué hay aquí

| Fichero | Qué guarda | Cuándo se escribe |
|---|---|---|
| [`ESTADO.md`](ESTADO.md) | Dónde estamos ahora mismo y cuál es el siguiente paso | Al terminar cualquier bloque de trabajo |
| [`decisiones.md`](decisiones.md) | Cada decisión tomada, con fecha y motivo | En el momento de tomarla |
| [`sesiones/`](sesiones/) | Bitácora cronológica, un fichero por día | Al final de cada sesión |

## Qué NO va aquí

- **Lo que ya está en un `CLAUDE.md` o un `README.md`.** Este directorio no duplica documentación,
  guarda lo que no cabe en ella: el estado y el porqué histórico.
- Lo que se deduce leyendo el código o el historial de git.
- Notas de usar y tirar dentro de una misma sesión.

## Cómo se usa

**Al empezar una sesión:** leer `ESTADO.md` primero. En treinta segundos debe quedar claro en qué
punto está el proyecto sin tener que reconstruirlo preguntando.

**Al tomar una decisión:** añadir una entrada a `decisiones.md` con el motivo, no solo la
conclusión. El motivo es lo que permite revisarla más adelante con criterio; la conclusión sola
envejece mal.

**Antes de compactar y al cerrar la sesión:** actualizar `ESTADO.md` y cerrar la entrada del día
en `sesiones/`.

## Por qué esto funciona

La regla que obliga a mantener estos ficheros vive en el `CLAUDE.md` del workspace, que se carga
**en cada sesión y sobrevive a la compactación**. Ese es el mecanismo: la instrucción persiste en
un sitio que nunca se pierde, y apunta a unos ficheros que tampoco.

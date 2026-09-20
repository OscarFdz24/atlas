# Atlas — organización interna del proyecto

Cómo se estructura el repositorio, cómo se trabaja dentro de él y cómo se gestiona el proyecto.
Investigado en septiembre de 2026.

Complementa a [`METODOLOGIA.md`](METODOLOGIA.md), que cubre el *qué* (tecnologías y método de
trabajo). Este documento cubre el *cómo estar organizado*.

El criterio vuelve a ser el mismo: la práctica estándar de la industria está pensada para equipos,
y buena parte de ella **para una sola persona es teatro**. Cada sección dice qué se adopta y qué se
descarta, con el motivo.

---

# 1. Estructura del repositorio

## Un solo repositorio

El proyecto tiene dos mitades con lenguajes distintos —pipeline en Python, web en Astro— y aun así
van **en un único repositorio**. Separarlos obligaría a inventar disparadores entre repositorios y
un versionado para un acoplamiento que en realidad es "unos ficheros JSON".

```
atlas/
├── pipeline/              # Python
│   ├── src/atlas_pipeline/
│   ├── tests/
│   ├── notebooks/         # Exploración. Nunca se importan desde el pipeline
│   └── pyproject.toml
├── web/                   # Astro
│   ├── src/pages/
│   ├── src/components/
│   └── package.json
├── data/
│   ├── raw/               # Caché de respuestas de las APIs
│   ├── interim/           # Desechable, en .gitignore
│   └── processed/         # El JSON que consume la web
├── docs/
├── contexto/              # Estado, decisiones y bitácora
├── .github/workflows/
├── Makefile
├── LICENSE                # Código
└── LICENSE-DATA           # Datos
```

**Nada de Nx, Turborepo ni espacios de trabajo de uv.** Resuelven grafos de dependencias entre
paquetes que aquí no existen. Dos cadenas de herramientas independientes compartiendo una raíz de
git: ese es todo el diseño.

## Los datos generados se versionan

El pipeline escribe en `data/processed/` y la web lee de ahí, **con los ficheros dentro del
repositorio**. Ventajas: el sitio se reconstruye entero desde un clon, Cloudflare Pages compila
directamente desde git sin fontanería de artefactos, y el historial de git se convierte en un
registro fechado de cómo cambian los datos oficiales.

Condiciones para que siga siendo buena idea: un fichero por indicador (no un JSON gigante), sin
formato legible con sangrías, y vigilar el tamaño total. **Por debajo de 100–200 MB no hay
problema**; si se supera, los datos pasan a un *release asset* o a una rama huérfana.

## Estructura de Python

**Disposición `src/`**, que desde uv 0.12 (julio de 2026) es además lo que genera `uv init` por
defecto. Las pruebas van fuera de `src/`. Los cuadernos son material de exploración: nunca se
importan desde el pipeline.

La interfaz de línea de comandos se expone con **Typer** declarada en `[project.scripts]`, de modo
que tras instalar el proyecto exista un comando `atlas`. Las dependencias de desarrollo van en
`[dependency-groups] dev`, no como extras.

---

# 2. Flujo de trabajo con git

## Trabajar directamente sobre `main`

Existen tres estrategias de ramas: **GitFlow** (ramas de desarrollo, release y hotfix — pensada
para software con versiones publicadas), **GitHub Flow** (una rama por funcionalidad y PR) y
**trunk-based** (commits directos a `main`, con la integración continua como guardián).

**Para una sola persona, la respuesta honesta es trunk-based.** Abrir un PR que vas a aprobar tú
mismo es una ceremonia sin revisor. GitFlow aquí sería directamente un estorbo.

**Las dos excepciones donde una rama sí gana algo:**

1. Una refactorización arriesgada que quieres poder abandonar.
2. **Cualquier cambio visual**, porque Cloudflare Pages genera una **URL de vista previa por
   rama**. Eso es una razón real y concreta para ramificar: ver el cambio publicado antes de que
   llegue al sitio de verdad.

## Commits y versionado

**Conventional Commits: sí.** Prefijos `feat:`, `fix:`, `docs:`, `chore:`. Es casi gratis y hace
que el historial se pueda leer y resumir después.

**Versionado semántico: no.** SemVer existe para avisar a quien depende de tu API pública. Un sitio
web no tiene dependientes. Si en algún momento quieres un número de versión, usa **CalVer**
(`2026.09`), que es lo estándar en productos de despliegue continuo.

**Sin `semantic-release` ni `release-please`:** publican versiones de librerías. Si quieres un
registro de cambios, **git-cliff** lo genera del historial cuando te apetezca, sin comprometerte a
nada.

**Un `CHANGELOG.md` sí merece la pena, pero escrito para personas y sobre los datos**: "añadido el
indicador de gasto sanitario, serie 1990–2024", no "refactor de utils".

**Y una disciplina que sí es innegociable:** el esquema de los datos publicados **no se cambia en
silencio**. Quien consuma tus JSON es tu API real.

---

# 3. Calidad de código

| Ámbito | Herramienta | Notas |
|---|---|---|
| Python, formato y linter | **Ruff** | Asunto cerrado en 2026. Sustituye a black, isort, flake8 y más |
| Python, tipos | **mypy** en modo no estricto | Ver aviso abajo |
| Web | **Biome** | Un solo binario y una sola configuración; sustituye a ESLint + Prettier |
| Astro | `astro check` | Aparte de Biome: cubre lo específico de Astro y la capa de `tsc` |

**Aviso sobre `ty`:** Astral (los autores de Ruff y uv) está construyendo `ty`, un comprobador de
tipos mucho más rápido que mypy. Es tentador, pero **sigue en beta, en versiones 0.0.x y con
cambios que rompen entre parches**. Para un proyecto cuyo objetivo es aprender, mypy es la opción
segura. `ty` se puede probar en paralelo, pero no se pone como guardián en la integración continua
todavía.

**Ganchos de git (pre-commit):** ejecutarlo todo en CI es innegociable. Ganchos locales, solo si te
cansas de ver la CI en rojo, y entonces uno solo con **prek** (compatible con la configuración de
pre-commit pero en un único binario, sin arrancar entornos de Python). Nunca poner comprobación de
tipos ni pruebas en un gancho: hace el commit insoportablemente lento.

---

# 4. Integración continua

En un repositorio público, GitHub Actions es **gratis y sin límite de minutos**, así que el límite
es tu paciencia, no la cuota.

**Tres flujos de trabajo:**

1. **`ci.yml`** — en cada push: linter, tipos y pruebas. Con **filtros por ruta**, para que tocar
   el pipeline no recompile el sitio entero.
2. **`data-refresh.yml`** — cron: ejecuta el pipeline y hace commit de `data/` si algo cambió. Ese
   commit dispara el despliegue por sí solo.
3. **Despliegue** — no se escribe: lo hace la integración de Cloudflare Pages con git.

Caché: `astral-sh/setup-uv` con `enable-cache: true` y versión fijada; `actions/setup-node` con
`cache: npm`.

## Una trampa que conviene conocer de antemano

**GitHub desactiva los flujos programados tras 60 días sin commits en el repositorio.** Y solo los
commits reinician el contador: los issues, los PRs y las etiquetas no cuentan.

Normalmente el propio `data-refresh` se cura solo, porque hace commit en cada ejecución. Pero **si
los datos no cambian durante 60 días, el cron muere en silencio** y no te enteras. La solución es
un commit de latido (`--allow-empty`) o vigilar las ejecuciones perdidas. Es exactamente el tipo de
fallo que descubres seis meses después con el sitio desactualizado.

## Dependencias

**Dependabot**, con actualizaciones de seguridad activadas y las de versión agrupadas
semanalmente. Renovate es mejor, pero sus ventajas son problemas de escala de equipo. Actualizar a
mano no es una alternativa: se olvida.

---

# 5. Gestión del trabajo

## Seguimiento: issues de GitHub y un tablero

**Un solo sitio, no dos.** La recomendación es **GitHub Issues más un único tablero de proyecto**,
porque el repositorio ya es público, los issues sobreviven a la pérdida del portátil y se enlazan
con los commits. El `ROADMAP.md` se queda como capa narrativa; los issues son el trabajo concreto.

Configuración mínima: **tres columnas** (Por hacer / Haciendo / Hecho), los hitos son las fases del
roadmap, y **cuatro etiquetas como mucho** (`bug`, `data`, `site`, `chore`).

**Se descarta:** puntos de historia, sprints, épicas, gráficos de avance. Y herramientas externas
tipo Jira, Linear o Notion: un segundo sitio que consultar es un segundo sitio que abandonar.

## Las dos reglas que de verdad importan

**Límite de trabajo en curso: la columna "Haciendo" admite UNA tarjeta.** Es el único artefacto
ágil que aporta valor real trabajando solo. No mide productividad: protege la atención.

**Una columna "Ideas" o etiqueta `icebox`.** Toda idea nueva necesita un destino legítimo que no
sea el trabajo actual. Sin ese destino, las ideas se cuelan en lo que estás haciendo y el proyecto
no termina nunca. Es el contrapeso concreto a la fase de recopilar ideas.

## Registro de decisiones

Ya existe en [`contexto/decisiones.md`](contexto/decisiones.md), y el formato correcto es el de
**Nygard**: título, estado, contexto, decisión, consecuencias. Las alternativas más elaboradas
(MADR) son burocracia con un solo desarrollador.

**Cuándo merece un registro y cuándo basta un comentario:** se registra cuando la decisión es
**difícil de revertir** —migra datos guardados, rompe una URL pública, cambia la licencia, o añade
una dependencia sobre la que va a crecer el código. Si puedes cambiar de idea mañana sin
consecuencias, es un comentario. Para un proyecto de este tamaño, entre 5 y 15 decisiones
registradas, no 50.

Las decisiones no se borran ni se renumeran: una decisión superada se marca como tal y se enlaza a
la nueva.

---

# 6. Documentación

**Diátaxis** es el marco de referencia: divide la documentación en cuatro tipos con propósitos
distintos —tutorial (enseñar), guía práctica (resolver una tarea), referencia (describir) y
explicación (dar contexto)—. El error típico es mezclar dos en la misma página.

**Aquí se usa como criterio de revisión, no como estructura de carpetas.** Crear cuatro directorios
vacíos el primer día es justo cómo no se aplica.

**Documentación mínima:**

- `README.md` — qué es, por qué, y cómo arrancarlo en cinco minutos.
- `docs/como-ejecutar-el-pipeline.md` — la guía práctica.
- **Un diccionario de datos** — qué significa cada indicador, sus unidades, su fuente y su
  cobertura. Es **el documento de más valor en un proyecto de datos abiertos y el que casi siempre
  falta**. Debe generarse desde el catálogo de indicadores, no escribirse a mano, para que no se
  quede obsoleto.
- Las decisiones registradas, que son la parte de explicación.

**Un sitio de documentación (MkDocs, Starlight) es sobreingeniería** mientras no haya usuarios
externos. Lo que sí merece la pena y es barato: **lychee** en la CI para detectar enlaces rotos.

---

# 7. Terminar el proyecto

La investigación es consistente en algo: **los proyectos personales mueren por ampliación de
alcance, no por dificultad técnica**. Cada añadido aleja la meta, y trabajando solo no hay nadie
que frene.

Las prácticas que lo contrarrestan, por orden de eficacia:

1. **El esqueleto andante primero.** Una rebanada vertical completa —una fuente, el pipeline, una
   página publicada en la URL real— antes de cualquier ampliación. Convierte "¿llegará a
   publicarse?" en una pregunta ya respondida. Es la metodología que ya acordamos.
2. **Poner fecha al proyecto, no a las funcionalidades.** "Público antes del día X" obliga a
   recortar. Los plazos por funcionalidad simplemente se incumplen.
3. **Una sección explícita de NO-objetivos**, tan vinculante como la de objetivos. Ya existe en
   `CLAUDE.md` ("Fuera de la v1") y en la tabla de descartados del `ROADMAP.md`: cada idea aplazada
   se añade ahí. Eso es lo que le da dientes a la columna de ideas.
4. **Una frase de "terminado" por fase.** Si no puedes decir en una frase cuándo está hecha, la
   fase es demasiado grande.
5. **Publicar antes de que esté bien.** La vergüenza pública es una fuerza más débil que el
   perfeccionismo privado.

---

# 8. Retomar el proyecto tras semanas sin tocarlo

Preocupación real en un proyecto personal, y el coste documentado es el "impuesto de arqueología":
veinte minutos o más reconstruyendo el modelo mental. No se pierde el código, se pierde el contexto.

La carpeta `contexto/` ya implementa el patrón correcto. Tres refinamientos que sí conviene hacer:

- **Una línea de SIGUIENTE PASO al principio de `ESTADO.md`**, redactada como una acción concreta
  —"ejecuta `make ingest`; falla con la codificación del fichero de 2024, mira `loader.py:88`"—
  y no como un resumen de situación.
- **Parar a propósito en mitad de una tarea, con la nota escrita.** Parar en un punto limpio y sin
  nota deja menos de donde agarrarse que parar a medias con una pista clara.
- **La bitácora, corta y solo para añadir.** Una bitácora larga no la relee nadie. Lo que se lee al
  volver es el fichero de estado; la bitácora es archivo.

Y algo que suele subestimarse: **la mitad de la fricción al retomar no es contexto perdido, es un
entorno roto**. Un fichero de bloqueo y un `make dev` que funcione a la primera resuelven eso.

---

# 9. Licencias — decisión pendiente

**Es el punto donde merece la pena pensar de verdad**, porque el código y los datos necesitan
licencias distintas y rectificar después es costoso.

**Propuesta:**

- **Código: MIT**, o **Apache-2.0** si la fase de machine learning pudiera producir algo con
  implicaciones de patentes.
- **Datos: CC-BY-4.0**, que es el estándar de facto en repositorios de datos abiertos y exige
  atribución sin las obligaciones víricas de ODbL.
- Ambas declaradas en el `README.md`, en `LICENSE` y en `LICENSE-DATA`.

**Y una comprobación que condiciona todo lo anterior:** hay que revisar **la licencia original de
cada fuente**. Si alguna es ODbL o no comercial, eso limita lo que Atlas puede republicar. Debe
quedar documentado fuente por fuente, y entra en la lista de comprobaciones que ya está en
[`CLAUDE.md`](CLAUDE.md).

**Requiere tu decisión antes de publicar el repositorio.**

---

# 10. Hygiene de repositorio público

**Merece la pena ahora:** `LICENSE` y `LICENSE-DATA`, un `README` que diga qué es el proyecto y qué
no es, Dependabot, la insignia de estado de la CI, y un `CONTRIBUTING.md` breve **usado como
filtro**: su valor real no es atraer colaboradores, es rechazar peticiones de funcionalidades antes
de que se conviertan en discusiones.

**Se pospone hasta que aparezca una persona de fuera:** plantillas de issues y de PR, código de
conducta, `SECURITY.md`, foros de discusión y cualquier insignia más allá del estado de la CI. Con
cero colaboradores son puro adorno; se añaden el día que llegue el primer issue ajeno.

---

# 11. Resumen de lo descartado

| Práctica | Por qué no |
|---|---|
| GitFlow, ramas por funcionalidad con PR | Sin revisor, es ceremonia |
| SemVer, semantic-release, release-please | Son para librerías con dependientes |
| Nx, Turborepo, espacios de trabajo | No hay grafo de paquetes que resolver |
| Sprints, puntos de historia, épicas | Artefactos de equipo |
| Jira, Linear, Notion | Un segundo sitio que consultar es uno que abandonar |
| MADR y formatos elaborados de ADR | Nygard basta y se adopta antes |
| Sitio de documentación (MkDocs, Starlight) | Sin usuarios externos, no aporta |
| Plantillas de issue/PR, código de conducta | Adorno con cero colaboradores |
| Linters de prosa (Vale) | Un solo autor |
| `ty` como guardián en CI | Todavía en beta, rompe entre parches |

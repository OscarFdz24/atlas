# Registro de decisiones

Más reciente arriba. Cada entrada anota **qué se decidió, por qué, y qué se descartó** — el motivo
importa más que la conclusión, porque es lo que permite revisar la decisión con criterio cuando
cambien las circunstancias.

---

## 2026-09-27 — El refresco de datos se mantiene vivo con un commit de latido

**Decisión:** `data-refresh.yml` hace commit de `data/` cuando los datos cambian y, cuando no
cambian, comprueba cuántos días lleva el repositorio sin commits: a partir de 50 hace un commit
vacío.

**Por qué:** GitHub desactiva los flujos programados tras **60 días sin commits**, y solo los
commits reinician el contador. Un refresco que no encuentre cambios durante dos meses dejaría el
cron desactivado **en silencio**, y el fallo se descubriría meses después con el sitio
desactualizado. El umbral de 50 deja margen antes del límite.

**Descartado:** hacer siempre un commit vacío en cada ejecución, que ensuciaría el historial sin
aportar nada.

**Otras decisiones del flujo:** cron mensual (el Banco Mundial cachea 24 h y revisa las series
anuales unas pocas veces al año, así que más frecuencia no aportaría), y filtros por ruta en
`ci.yml` para que tocar la documentación no lance la batería de pruebas.

---

## 2026-09-20 — Fuente aprobada: Banco Mundial (con dos cautelas)

**Decisión:** el Banco Mundial queda **aprobado** como fuente tras pasar la lista de
comprobaciones de `CLAUDE.md`.

**Licencia:** CC BY 4.0 **más un anexo** —los términos añaden una cláusula de resolución de
disputas por arbitraje—, así que no es CC BY 4.0 a secas. Documento válido:
`data.worldbank.org/summary-terms-of-use`.

**Atribución obligatoria, en este formato exacto:** `The World Bank: Dataset name: Data source`.
Y la obligación se propaga: al redistribuir hay que imponer el mismo requisito de atribución aguas
abajo, cosa que ya recoge `LICENSE-DATA`.

**Prohibido:** dar a entender que el Banco Mundial respalda el proyecto, y usar su nombre o logotipo
de forma que lo sugiera. Hay que indicar además que los datos han sido modificados.

**API:** el uso automatizado está permitido de forma explícita, sin clave y sin registro. No hay
límite de peticiones publicado y las respuestas se cachean 24 h, así que un refresco mensual queda
muy holgado. `robots.txt` no prohíbe nada.

### Cautela 1 — indicadores de terceros

Los términos advierten de que **algunos indicadores proceden de terceros y pueden no ser
redistribuibles**. Afecta directamente a la esperanza de vida, cuya ficha cita a Naciones Unidas,
oficinas estadísticas nacionales y Eurostat. La API **no expone la licencia por indicador de forma
legible por máquina**, así que no se puede comprobar automáticamente.

**Consecuencia de diseño:** el catálogo de indicadores es una **lista blanca explícita**. Nada se
descarga si no está en `data/indicators.yaml` con su licencia verificada a mano y la fecha de la
comprobación. No se descargará "todo el catálogo del Banco Mundial".

### Cautela 2 — URL legal obsoleta

`worldbank.org/en/about/legal/terms-of-use-for-datasets` **ya no sirve los términos de datos**:
ahora devuelve las condiciones generales del sitio, que son restrictivas y prohíben obras
derivadas. No citar esa URL.

**Otros apuntes:** la v2 de la API es la vigente, sin v3 anunciada ni política de obsolescencia
publicada — se fija `v2` y se vigila. Y el Banco Mundial **revisa datos históricos en silencio**,
sin registro de cambios, lo que confirma que guardar cada instantánea en `data/raw/` era la
decisión correcta.

---

## 2026-09-20 — El repositorio es `atlas/`, no el workspace

**Decisión:** git se inicializa **dentro de la carpeta del proyecto** (`atlas/`), con rama `main`.
El workspace `Proyectos_Claude` no es un repositorio.

**Por qué:** indicación del usuario, y coherente con el principio de que cada proyecto es
autocontenido e independiente. Cada proyecto futuro tendrá su propio repositorio.

**Cuenta:** GitHub `OscarFdz24`, commits firmados con `chinchillalopezfernandez@gmail.com` (la
identidad global de git ya era personal, así que no hizo falta configurarla por repositorio). Se
evita deliberadamente el correo corporativo `@valumre.com`: es un proyecto personal y mezclar
ambas identidades complica la propiedad del trabajo.

**Visibilidad: público.** GitHub Actions es gratis y sin límite de minutos en repositorios
públicos, que es lo que necesita el cron de refresco de datos. En privado habría cuota mensual.

**Herramienta:** se instaló la CLI de GitHub (`gh` 2.101.0) vía winget.

---

## 2026-09-20 — Licencias: MIT para el código, CC-BY-4.0 para los datos

**Decisión:** licencias separadas en dos ficheros. `LICENSE` (MIT) cubre el código; `LICENSE-DATA`
(CC BY 4.0) cubre el contenido de `data/`.

**Por qué:** el código y los datos son obras de naturaleza distinta y las licencias de software no
encajan bien con conjuntos de datos. CC-BY-4.0 es el estándar de facto en datos abiertos y exige
atribución sin las obligaciones víricas de ODbL. Se descartó Apache-2.0 porque no se prevé nada
con implicaciones de patentes.

**Se resolvió antes de publicar**, no después: un repositorio público sin licencia queda por
defecto con todos los derechos reservados.

**Matiz recogido en `LICENSE-DATA`:** la licencia cubre **la recopilación y las transformaciones**
de este proyecto, y no sustituye a la de las fuentes originales, que conservan la suya. Toda fuente
nueva debe tener su licencia verificada antes de escribir el código que la descargue.

**Pendiente menor:** el titular del copyright figura como `OscarFdz24`. Es válido, pero si se
prefiere el nombre legal completo, se cambia en ambos ficheros.

---

## 2026-09-20 — Organización interna: monorepo, trunk-based, issues de GitHub

**Decisión:** un único repositorio con `pipeline/` (Python, disposición `src/`) y `web/` (Astro),
datos generados versionados en `data/processed/`. Trabajo directamente sobre `main`, sin ramas por
funcionalidad. Seguimiento con issues de GitHub y un tablero de tres columnas. Calidad con Ruff,
mypy no estricto, Biome y `astro check`.

**Por qué:** separar en dos repositorios obligaría a inventar disparadores cruzados para un
acoplamiento que son unos ficheros JSON. Los PR sin revisor son ceremonia. Detalle completo y
alternativas evaluadas en [`ORGANIZACION.md`](../ORGANIZACION.md).

**Descartado:** GitFlow, SemVer, semantic-release, Nx/Turborepo, sprints y puntos de historia,
herramientas externas de gestión, MADR, sitio de documentación, plantillas de issue.

**Las dos reglas que sí se adoptan del mundo ágil:** la columna "Haciendo" admite **una sola**
tarjeta, y existe una columna de **Ideas** donde aterrizan las ideas nuevas. Es el contrapeso
concreto al riesgo de que el proyecto no termine nunca.

**Aviso técnico anotado:** GitHub desactiva los flujos programados tras 60 días sin commits en el
repositorio. El cron de datos se cura solo mientras los datos cambien; si no cambian, muere en
silencio. Hay que preverlo.

**Pendiente de decisión del usuario:** licencias. Propuesta: MIT para el código y CC-BY-4.0 para
los datos, más la comprobación de la licencia original de cada fuente, que puede limitar lo que se
puede republicar.

---

## 2026-09-20 — Recharts descartado: no renderiza en servidor

**Decisión:** las gráficas se generan con **Observable Plot** como SVG en tiempo de build, no con
Recharts.

**Por qué:** la investigación confirmó que los propios mantenedores de Recharts reconocen que sus
gráficas **no están en el HTML inicial** — se construyen en el navegador vía `useEffect`. Para un
sitio cuyo objetivo declarado es posicionarse en Google, eso invalida la elección. Observable Plot
renderiza SVG de forma síncrona y puede ejecutarse durante la compilación.

**También descartado:** Chart.js, que dibuja sobre *canvas* y por tanto es opaco para los
buscadores. **Alternativa viable si hace falta más control:** `visx`.

---

## 2026-09-20 — Astro confirmado; la capa web no será Python

**Decisión:** se mantiene Astro 7 tras evaluar las alternativas. La única opción en Python
(**Quarto**) queda descartada.

**Por qué:** el usuario pidió priorizar Python. Quarto genera el mejor HTML para SEO de todos los
candidatos, pero para páginas parametrizadas hay que invocar `quarto render` **una vez por
página**: inviable para ~4.000 páginas, sin compilación incremental. Observable Framework quedó
fuera por estar congelado desde marzo de 2025 y calcular las gráficas en cliente; Evidence.dev por
ser una herramienta de BI orientada a su producto de pago.

**Consecuencia asumida:** Python cubre todo el pipeline y los modelos —la mayor parte del
proyecto—, y la capa web es un generador que solo transforma JSON en páginas.

---

## 2026-09-20 — Sin orquestador, sin DVC, sin Great Expectations

**Decisión:** la tubería se ejecuta con un `Makefile` y GitHub Actions. Nada de Airflow, Dagster,
Prefect ni Kedro. El versionado de datos es git a secas, sin DVC. La validación es Pandera, no
Great Expectations.

**Por qué:** todas asumen una escala o una infraestructura que este proyecto no tiene. DVC en
concreto existe para sacar ficheros grandes de git empujándolos a almacenamiento en la nube de
pago, que es justo lo que no hay presupuesto para tener.

**Se adopta en su lugar** el patrón de *git scraping*: como el cron hace commit de los datos
generados, el historial de git se convierte gratis en un archivo histórico fechado de cómo cambia
la fuente original.

**Revisable:** dbt y dlt pueden entrar si el número de transformaciones o de fuentes crece. La
regla es incorporarlas cuando el dolor sea real.

---

## 2026-09-20 — La carpeta `contexto/` va por proyecto, no en la raíz

**Decisión:** cada proyecto tiene su propio `contexto/` dentro de su carpeta. No existe una
carpeta de contexto global en la raíz del workspace.

**Por qué:** corrección del usuario sobre la primera versión, que la había puesto en la raíz. El
contexto pertenece al proyecto: así se puede mover, archivar o abandonar un proyecto sin arrastrar
ni perder la memoria de los demás.

---

## 2026-09-20 — Astro en lugar de una SPA, por SEO

**Decisión:** cambiar el stack web de Vite + React (aplicación de página única) a **Astro con islas
de React**. Cada país, cada indicador y cada comparación tienen su propia ruta pregenerada como
HTML estático.

**Por qué:** el usuario añadió el requisito de posicionamiento en Google. Una SPA entrega un HTML
vacío que rellena JavaScript; Google lo indexa mal y con retraso, y el resto de buscadores y las
previsualizaciones sociales no lo intentan. Además, el contenido de Atlas se multiplica de forma
natural —~200 países × ~20 indicadores— en miles de páginas de *long tail* que corresponden a
búsquedas reales.

**Consecuencia:** el enrutado por rutas reales entra en el alcance de la v1 y no se pospone.
Rehacer el enrutado más adelante cuesta mucho más que hacerlo bien desde el principio.

---

## 2026-09-20 — Ninguna IA en la v1 de Atlas

**Decisión:** la primera versión de Atlas no lleva machine learning, ni predicciones, ni IA
generativa. Todo eso se pospone a las fases 2–4 del `ROADMAP.md`.

**Por qué:** cualquier modelo se apoya en el pipeline de datos. Construir el modelo antes que el
pipeline es construir sobre nada. Además, desplegar pronto una versión pequeña que funcione vale
más que una versión ambiciosa que no sale del portátil.

---

## 2026-09-20 — El deep learning se limita a dos casos concretos

**Decisión:** en Atlas solo se usará deep learning para (a) un modelo global de series temporales
entrenado sobre el panel completo de países, y (b) *embeddings* de países vía autoencoder. Para
predicción tabular se usará gradient boosting.

**Por qué:** el universo son ~200 países. Con esa cantidad de muestras, un modelo de árboles gana
a una red neuronal y además es interpretable, lo que en un proyecto de datos públicos vale más que
un punto de precisión. Los dos casos exceptuados sí tienen datos suficientes porque agregan miles
de series.

**Condición:** el modelo neuronal de series temporales solo entra en producción si supera a un
ARIMA en el mismo *backtest*. Si no gana, no entra, y se documenta que no ganó.

---

## 2026-09-20 — Sin Numbeo y sin "tiempo real"

**Decisión:** Atlas no incluirá coste de vida ni precios de alquiler por ciudad, y no se
describirá como una herramienta de tiempo real.

**Por qué:** la idea original del usuario incluía ambas cosas. Numbeo, la única fuente decente para
coste de vida, tiene API de pago, y scrapearla va contra las líneas rojas del workspace. Y los
indicadores socioeconómicos son series **anuales** publicadas con 1–2 años de retraso: prometer
tiempo real sería falso. Mejor no ofrecer una funcionalidad que ofrecerla mal.

**Alternativa adoptada:** enfocar la v1 en comparación entre países con los indicadores que sí se
pueden obtener y redistribuir legalmente.

---

## 2026-09-20 — Atlas será un sitio 100 % estático

**Decisión:** sin backend, sin base de datos. Los datos se descargan y procesan en un pipeline de
Python **antes** del despliegue, y el navegador solo lee JSON ya preparados.

**Por qué:** los datos son idénticos para todos los visitantes, así que no hay ninguna razón para
calcularlos en cada visita. Sin servidor no hay factura, que es la restricción principal del
workspace, y además el sitio no se cae cuando se cae una API de terceros.

**Descartado:** MapLibre y Mapbox para el mapa. Sirven *tiles*, y ahí aparecen las claves de API y
las cuotas. Un mapa de coropletas se dibuja con `d3-geo` sobre geometrías estáticas.

---

## 2026-09-20 — Atlas como primer proyecto

**Decisión:** empezar por el mapa mundial de indicadores en lugar del analizador de gastos
personales.

**Por qué:** elección del usuario. La recomendación inicial había sido el analizador de gastos por
ser de uso diario, pero Atlas es más sencillo de mantener gratis (datos públicos e iguales para
todos, sin datos personales ni obligaciones de RGPD) y enseña la parte de pipelines de datos.

**Estado del descartado:** el analizador de gastos queda **aparcado, no rechazado**, como candidato
a segundo proyecto.

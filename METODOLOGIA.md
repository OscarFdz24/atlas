# Atlas — metodología y tecnologías

Propuesta de cómo trabajar y con qué herramientas, con cada tecnología explicada. Investigado y
redactado en septiembre de 2026.

El criterio de selección ha sido siempre el mismo: **moderno pero justificado**. Hay mucha
herramienta excelente que aquí sería sobreingeniería, y al final del documento hay una lista
explícita de lo descartado y por qué. Añadir una herramienta que no entiendes no te hace más
profesional, te hace más lento.

---

# 1. Metodología de trabajo

## La metodología clásica y qué queda de ella

**CRISP-DM** (*Cross-Industry Standard Process for Data Mining*) es el marco de referencia desde
1999. Divide un proyecto de datos en seis fases cíclicas: comprensión del negocio, comprensión de
los datos, preparación de los datos, modelado, evaluación y despliegue.

En 2026 sigue siendo la referencia más equilibrada, pero conviene entender qué es: **una lista de
comprobación, no un método de gestión**. Su alternativa corporativa, el TDSP de Microsoft, está
prácticamente abandonada. Lo que ha sustituido a estos marcos no son otros marcos, sino
**prácticas** —MLOps, DataOps— que son hábitos de ingeniería, no fases.

**Propuesta:** usa las seis fases de CRISP-DM como recordatorio mental recurrente, sin ceremonia,
sin documentos de fase, sin actas. En un proyecto de una sola persona, el proceso formal consume
más de lo que aporta.

## El método que sí propongo: rebanadas verticales

En lugar de construir por capas horizontales (primero todo el pipeline, luego toda la web), se
construye **una rebanada completa de extremo a extremo y luego se ensancha**:

> **Primera rebanada:** *un* indicador (esperanza de vida), *todos* los países, desde la descarga
> del Banco Mundial hasta una página publicada en internet que se pueda abrir en el móvil.

Esto obliga a tocar todas las piezas del sistema en la primera semana: descarga, validación,
transformación, generación de JSON, mapa, ruta, metadatos, despliegue. Los problemas de integración
—que son los que hunden los proyectos personales— aparecen al principio, cuando cambiar de rumbo
todavía es barato. Añadir los otros 19 indicadores después es repetición, no descubrimiento.

Lo contrario, construir el pipeline perfecto durante dos meses sin haber desplegado nada, es la
forma más común de que un proyecto personal muera.

## Los dos hábitos que sustituyen al equipo

Trabajando solo no tienes a nadie que cuestione tus decisiones ni que te obligue a explicarte. Dos
prácticas cubren ese hueco:

**Registro de decisiones (ADR).** Cada decisión técnica se anota con su motivo y con lo que se
descartó. Ya lo tienes montado en [`contexto/decisiones.md`](contexto/decisiones.md) — esto es
exactamente un registro de ADR (*Architecture Decision Record*), que es el hábito de ingeniería con
mejor relación valor/esfuerzo para alguien que trabaja solo.

**Cuaderno de laboratorio.** Los callejones sin salida también se anotan: lo que probaste, por qué
no funcionó. Sin esto lo volverás a intentar dentro de seis meses. Va en `contexto/sesiones/`.

---

# 2. Arquitectura de datos

## Tres capas inmutables

Existe un patrón de moda llamado **arquitectura medallón** (capas bronce, plata y oro). A escala
empresarial tiene sentido; aquí, con unos cientos de megas, lo único que merece la pena llevarse es
la disciplina de carpetas:

```
data/
├── raw/          # Bytes exactamente como llegaron. NUNCA se editan.
├── interim/      # Normalizado y tipado. Desechable, se puede regenerar.
└── processed/    # El JSON que consume la web. Es el producto.
```

La regla que importa es que **`raw/` es sagrado**. Si tocas el dato original pierdes la capacidad de
rehacer el proceso cuando descubras un error de transformación tres meses después.

## Caché de respuestas: la práctica más valiosa de todas

Cada respuesta de una API se guarda en disco con su URL, su fecha y su hash. El pipeline lee de la
caché salvo que le pases `--refresh`.

Esto te da tres cosas: puedes desarrollar sin conexión y sin machacar las APIs; el proceso es
reproducible de verdad; y —lo más importante— te protege de que **el Banco Mundial y Eurostat
revisan datos históricos hacia atrás sin avisar**. Sin caché, un día tus gráficas cambian y no
sabes por qué.

## Versionado: git y ya está

Existe **DVC** (*Data Version Control*), la herramienta estándar para versionar datos. **Aquí no se
justifica**: existe para sacar ficheros enormes de git y empujarlos a un almacenamiento en la nube
que tú no vas a pagar. Con unos cientos de megas, git basta.

Y hay una práctica que encaja perfecto, llamada **git scraping** (popularizada por Simon Willison):
como el pipeline se ejecuta periódicamente y hace *commit* de los datos generados, **cada ejecución
programada deja un commit fechado**. El historial de git se convierte gratis en un archivo
histórico de cómo ha ido cambiando la fuente original. Es una funcionalidad que no has programado y
que sale sola.

Se versionan `raw/` (caché) y `processed/` (producto). `interim/` va al `.gitignore`.

---

# 3. Tecnologías de datos — Python

Aquí es donde va la mayor parte del trabajo del proyecto, y es Python de principio a fin.

### uv — gestor de paquetes y entornos

**Qué es:** el sustituto moderno de `pip` + `venv` + `virtualenv` + `pyenv`, escrito en Rust. Se ha
convertido en el estándar de facto para proyectos Python nuevos.

**Por qué:** instala dependencias entre 10 y 100 veces más rápido que pip, gestiona la versión de
Python por ti y produce un fichero de bloqueo que garantiza que tu portátil y GitHub Actions
instalan exactamente lo mismo. Configuración en `pyproject.toml`, sin `requirements.txt`.

### Polars — manipulación de datos

**Qué es:** una alternativa moderna a pandas, también en Rust. Trabaja con `DataFrames` igual que
pandas pero con una API más estricta y coherente.

**Por qué en vez de pandas:** no es por velocidad — con tus volúmenes, pandas 3.0 va sobrado. Es
porque Polars **te obliga a declarar los tipos y falla pronto y ruidosamente** cuando algo no
encaja, mientras que pandas convierte silenciosamente y te deja descubrir el error en la gráfica
final. Trabajando solo, que la herramienta te grite pronto vale mucho.

Se sigue usando pandas en la frontera con scikit-learn, donde es lo esperado. La conversión entre
ambos es instantánea porque comparten formato en memoria (Apache Arrow).

### DuckDB — base de datos analítica en proceso

**Qué es:** una base de datos SQL que **no es un servidor**. Es una librería: `import duckdb` y ya
tienes SQL. Se la describe como "el SQLite del análisis de datos".

**Por qué:** vas a cruzar datos del Banco Mundial con Our World in Data y con metadatos de países,
y a reorganizar tablas país × indicador × año. Eso en SQL son cinco líneas legibles y en código
imperativo son cincuenta frágiles. Además lee CSV, JSON y Parquet directamente del disco sin
importarlos antes.

Es la incorporación más claramente rentable de toda la lista, y no rompe la restricción de coste
cero porque no hay nada que desplegar.

### Pandera — validación de datos

**Qué es:** defines el esquema que deben cumplir tus datos (columnas, tipos, rangos, valores
permitidos) y la librería lo verifica.

**Por qué:** es tu red de seguridad. Si el Banco Mundial cambia un formato o empieza a devolver
nulos, quieres que el pipeline **falle en ese punto** y no que publique un mapa en blanco. Reglas
del tipo: el código de país es ISO-3166 válido, el año está entre 1960 y el actual, la población es
positiva, el número de filas no se desvía más de un 20 % respecto a la ejecución anterior.

**Descartado:** *Great Expectations*, la alternativa famosa. Es una plataforma de gobernanza de
datos con su propia documentación generada y su servidor de informes. Para cinco conjuntos de datos
es como usar un camión para la compra.

### Parquet — formato de almacenamiento

**Qué es:** un formato de fichero columnar y comprimido, el estándar en datos desde hace años.
Frente a un CSV ocupa una fracción, conserva los tipos (un CSV no sabe que una columna es fecha) y
se lee mucho más rápido.

Se usa para `interim/`. El producto final para la web sigue siendo JSON, porque es lo que el
navegador entiende sin librerías.

### Orquestación: un `Makefile` y GitHub Actions

**Lo que existe:** Airflow, Dagster, Prefect, Kedro — herramientas para coordinar tuberías de
datos, programarlas, reintentarlas y visualizarlas.

**La propuesta: ninguna.** Todas asumen una infraestructura que no vas a desplegar. Un `Makefile`
con objetivos (`make fetch`, `make build`, `make site`) más una tarea programada en **GitHub
Actions** —gratis en repositorios públicos— cubre exactamente tu caso. Un orquestador solo se
justifica cuando necesitas recargas parciales y control de frescura por activo, y eso queda muy
lejos.

### pytest — pruebas

Pandera valida los datos; pytest valida la **lógica**. Una docena de pruebas sobre las funciones de
transformación, ejecutadas en cada *commit*. No hace falta más.

---

# 4. Tecnologías web

## Por qué esta parte no puede ser Python

Pediste Python siempre que se pueda, y en datos se cumple al 100 %. En la web hay que ser honesto:
**la opción Python existe, se llama Quarto, y es la equivocada para este proyecto.**

**Quarto** convierte cuadernos y Markdown con código Python en sitios web estáticos, y genera el
mejor HTML de todos los candidatos desde el punto de vista del SEO. El problema es el volumen: para
generar páginas parametrizadas hay que invocar `quarto render` **una vez por página**. Para 50
informes es perfecto. Para las ~4.000 páginas de Atlas es lentísimo, sin compilación incremental y
sin control fino de las URLs.

Así que la división es: **Python hace todo el trabajo de datos y modelos, que es la mayor parte del
proyecto; el generador web solo coge un JSON y lo convierte en páginas.** Esa segunda parte es poco
código y bastante repetitivo, y es una ocasión razonable para aprender algo nuevo.

## Astro 7 — el generador del sitio

**Qué es:** un framework web orientado a sitios con mucho contenido. Su versión actual es Astro 7
(junio de 2026), con desarrollo muy activo.

**Su idea central — "islas":** por defecto Astro genera **HTML puro sin nada de JavaScript**. Solo
los componentes que marcas explícitamente como interactivos —el mapa, un selector— se envían al
navegador como código. El resto es texto estático. El resultado es un sitio rapidísimo y que los
buscadores leen entero, con interactividad solo donde hace falta.

**Por qué encaja:** generar miles de páginas a partir de un conjunto de datos es literalmente su
caso de uso principal (`getStaticPaths`). Y puedes escribir esas islas interactivas en React, que
es lo que más documentación y ejemplos tiene.

**Alternativas evaluadas y descartadas:**

- **Observable Framework** — hecho justo para sitios de datos, y sonaba ideal. Pero su última
  versión es de **marzo de 2025** y Observable ha movido su desarrollo a otros productos. Además
  calcula las gráficas en el navegador, así que el dato no está en el HTML. Falla por las dos
  razones a la vez.
- **Evidence.dev** — bien mantenido, pero es una herramienta de *BI*: produce cuadros de mando
  sobre SQL, y su desarrollo apunta a un producto de pago alojado. Se pelearía contigo en cuanto
  quisieras un diseño propio.
- **Next.js** — funciona, pero arrastra mucha más maquinaria de la que necesitas y su modo de
  exportación estática va perdiendo funciones.
- **SvelteKit** — una elección genuinamente buena. Astro gana porque "cero JavaScript por defecto"
  es exactamente la postura correcta para un sitio casi todo estático.

## d3-geo + TopoJSON — el mapa

**Qué son:** `d3-geo` es el módulo de D3 que proyecta coordenadas geográficas sobre un plano.
**TopoJSON** es un formato para geometrías que, en lugar de repetir la frontera entre España y
Portugal dos veces, la guarda una sola vez compartida — lo que reduce el fichero del orden de un
80 %.

**Por qué esta combinación:** permite dibujar el mapa **como SVG durante la compilación**. El mapa
acaba dentro del HTML: se ve al instante, sin JavaScript, y un buscador lo puede leer. Las
geometrías vienen de Natural Earth, que es de dominio público, y se guardan en el repositorio.

**Qué evitar:** *Mapbox GL* cobra por uso y necesita una clave. *MapLibre* es libre pero sigue
necesitando un servidor de teselas y dibuja sobre *canvas*, que para un buscador es una imagen
opaca. *Leaflet*, lo mismo. Un mapa de coropletas no necesita nada de eso.

## Observable Plot — las gráficas (corrección importante)

**Aquí hay que rectificar una decisión anterior.** El documento del proyecto proponía **Recharts**,
y la investigación ha confirmado que **Recharts no renderiza en servidor**: sus propios
mantenedores indican que las gráficas no están en el HTML inicial y se construyen en el navegador.
Para un sitio cuyo objetivo es posicionarse en Google, eso es exactamente lo que no queremos. Se
descarta.

**Observable Plot** es la sustitución: una librería de gráficas construida sobre D3 que genera un
SVG de forma **síncrona**, lo que permite ejecutarla en tiempo de compilación e incrustar el
resultado en el HTML. Su sintaxis es declarativa y muy cercana a la de ggplot2 o seaborn, así que
te resultará familiar viniendo de análisis de datos.

**Alternativa si necesitas más control:** `visx`, primitivas de gráficas en React que sí funcionan
en servidor. **Descartado del todo: Chart.js**, que dibuja sobre *canvas* y por tanto es invisible
para los buscadores.

**El patrón:** cada gráfica se genera como SVG durante la compilación. Solo la vista de comparación
interactiva se hidrata como isla.

## Cloudflare Pages — alojamiento

Gratuito, ancho de banda sin límite práctico, 500 compilaciones al mes.

**Un límite que sí importa:** el plan gratuito admite **20.000 ficheros por despliegue** y 25 MiB
por fichero. Con ~4.000 páginas más sus datos te quedas sobre los 8.000–10.000: hay margen, pero es
la razón por la que **no conviene emitir varios ficheros auxiliares por página**. Conviene tenerlo
presente al diseñar la salida del pipeline, no descubrirlo el día del despliegue.

---

# 5. Metodología para la fase de machine learning

Aplica al [`ROADMAP.md`](ROADMAP.md), no a la v1. Son los errores que hay que evitar desde el
primer día, porque corregirlos después invalida todas las conclusiones.

### Validación temporal: la trampa principal

Con series temporales **no se puede usar validación cruzada normal (k-fold)**. Repartir los años al
azar en cinco grupos significa entrenar con datos de 2020 para predecir 2010: el modelo conoce el
futuro y sus métricas salen fantásticas y falsas.

Lo correcto es **validación de ventana expansiva** (*walk-forward*): entrenar hasta 2010 y predecir
2011; entrenar hasta 2011 y predecir 2012; y así sucesivamente. En Python: `TimeSeriesSplit` de
scikit-learn, o `skforecast`, que implementa el patrón completo.

### Los otros cuatro errores clásicos

1. **Normalizar antes de partir.** Si calculas la media y la desviación sobre la serie completa y
   luego partes, has filtrado información del futuro. El escalado y la imputación se ajustan
   **dentro de cada partición**.
2. **Variables que miran hacia adelante.** Una media móvil centrada usa valores posteriores. En
   producción no los tendrás.
3. **Sin margen entre entrenamiento y prueba.** Si tus variables usan una ventana de cinco años,
   los cinco años anteriores al punto de prueba están contaminados y hay que descartarlos (*purga*
   y *embargo*).
4. **SHAP calculado sobre el conjunto de entrenamiento.** La importancia de variables debe medirse
   sobre datos no vistos.

### Compararse siempre contra lo trivial

Antes de presumir de modelo, compáralo con la **predicción ingenua**: "el año que viene será igual
que este". En indicadores socioeconómicos, que se mueven despacio, esa predicción es
sorprendentemente buena y **la mayoría de los modelos no la superan**. Si el tuyo no la supera, el
resultado correcto es publicarlo y no usar el modelo.

Esta regla es la que hace que la fase 3 del roadmap sea honesta: el modelo neuronal solo entra si
gana en el mismo *backtest*.

### Seguimiento de experimentos

**MLflow** en local con SQLite es gratis y registra parámetros, métricas y modelos de cada prueba.
Justificado a partir de la fase 2. **Weights & Biases** no hace falta.

Los primeros meses, un CSV con parámetros, métricas y el hash del commit cubre el 90 % del valor.

---

# 6. Resumen del stack

| Capa | Elección | Qué sustituye |
|---|---|---|
| Entorno y paquetes | **uv** | pip, venv, pyenv |
| Transformación | **Polars** + **DuckDB** | pandas puro |
| Validación | **Pandera** + pytest | Great Expectations |
| Almacenamiento intermedio | **Parquet** | CSV |
| Orquestación | **Makefile** + GitHub Actions | Airflow, Dagster, Prefect |
| Sitio web | **Astro 7** (islas de React) | Next.js, SvelteKit, Quarto |
| Mapa | **d3-geo** + TopoJSON → SVG estático | Mapbox, MapLibre, Leaflet |
| Gráficas | **Observable Plot** → SVG estático | ~~Recharts~~, Chart.js |
| Alojamiento | **Cloudflare Pages** | — |
| ML (fase 2+) | scikit-learn, skforecast, SHAP, MLflow local | — |

# 7. Descartado por sobreingeniería

Lista explícita para no reabrir el debate. Todas son buenas herramientas; ninguna encaja **a esta
escala y con un solo desarrollador**:

| Herramienta | Para qué sirve | Por qué no |
|---|---|---|
| Airflow, Dagster, Prefect, Kedro | Orquestar tuberías | Asumen infraestructura desplegada |
| DVC | Versionar datos grandes | Existe para evitar git; aquí git basta |
| Great Expectations | Gobernanza de calidad de datos | Desproporcionado para 5 conjuntos |
| dbt | Transformaciones SQL con linaje | Interesante solo por encima de ~15 transformaciones |
| dlt | Ingesta con esquema evolutivo | Se justifica con muchas fuentes; con 3 estables, mejor código propio que entiendes |
| Docker | Reproducir el entorno | uv + GitHub Actions ya lo garantizan |
| Weights & Biases | Seguimiento de experimentos | MLflow local es gratis y suficiente |
| Kubernetes, microservicios | Escalar servicios | No hay servicios. Es un sitio estático |

Varias de estas —dbt, dlt, MLflow— pueden entrar más adelante si el proyecto crece. La regla es
**incorporarlas cuando el dolor sea real**, no antes.

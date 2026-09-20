# Atlas — hoja de ruta de ciencia de datos e IA

Documento **vivo**. Recoge las mejoras de machine learning, deep learning e IA previstas para
Atlas, ordenadas por fases. Se actualiza a medida que avanza el proyecto: lo que se implementa se
marca, lo que se descarta se anota con el motivo.

## La restricción que lo condiciona todo

Atlas es un sitio estático sin servidor (ver [`CLAUDE.md`](CLAUDE.md)). Por tanto **todo modelo se
entrena y se ejecuta fuera de línea, en el pipeline de Python**, y lo que se despliega son sus
resultados ya calculados en JSON. No hay inferencia en servidor porque no hay servidor.

Hay una excepción prevista: modelos pequeños exportados a ONNX que se ejecutan **en el navegador**
cuando el usuario necesita interactuar con ellos (mover un parámetro y ver el efecto). Sigue siendo
coste cero, porque el cómputo lo pone el visitante.

## Advertencia sobre el tamaño de los datos

Conviene decirlo antes de elegir modelos: el universo son **unos 200 países × ~60 años**. Para
predicción tabular, eso son pocos datos. Un *gradient boosting* superará a una red neuronal en
casi todo, y además es interpretable, que en un proyecto de datos públicos importa más que un
punto de precisión.

Por eso el deep learning aquí se reserva a los dos casos donde **sí** aporta, ambos en la fase 3:
modelos globales de series temporales entrenados sobre el panel completo, y *embeddings* de países.
Usar una red para predecir esperanza de vida a partir de cinco variables sería hacer *deep learning*
de escaparate, y este proyecto no lo necesita.

---

## Fase 1 — v1 sin IA

El mapa, la ficha de país y la comparación, tal y como está cerrado en `CLAUDE.md`. **Sin nada de
modelos.** Primero hay que tener el pipeline de datos funcionando y desplegado; todo lo demás se
apoya en él.

---

## Fase 2 — Machine learning clásico

Las cuatro mejoras con mejor relación valor/esfuerzo. Aportan lo que el proyecto no tiene hoy: no
solo mostrar datos, sino **decir algo sobre ellos**.

### 2.1 Países similares

Agrupar países por su perfil completo de indicadores y responder a "¿a quién se parece España?"
—no geográficamente, sino estructuralmente.

- **Modelo:** normalización + PCA para reducir dimensión + k-means, y vecinos más cercanos por
  distancia coseno para el "top 5 parecidos".
- **En la interfaz:** en la ficha de país, una lista de "países con perfil similar" que lleva
  directamente a la comparación. Convierte el mapa en algo navegable por parecido, no por geografía.
- **Por qué merece la pena:** es la funcionalidad que ningún portal oficial ofrece y la que hace que
  alguien vuelva.

### 2.2 Proyección de tendencias

Extender cada serie hacia adelante entre 5 y 10 años.

- **Modelo:** suavizado exponencial o ARIMA por serie, con validación temporal honesta
  (*backtesting*: entrenar hasta 2015, comprobar contra lo que pasó de verdad).
- **Regla innegociable:** se muestra **siempre** con intervalo de confianza y con estilo visual
  distinto del dato observado (línea discontinua, zona sombreada). Y se llama **proyección**, no
  predicción: es la extrapolación de una tendencia, no sabe nada de crisis ni de políticas.
- **Métrica publicada:** el error del *backtest* se muestra en la propia interfaz. Si un indicador
  no se proyecta de forma fiable, no se proyecta.

### 2.3 Imputación de huecos

Muchos países no reportan ciertos indicadores en ciertos años. Hoy la regla del proyecto es
mostrarlos como "sin datos" —y sigue siendo la opción por defecto.

- **Modelo:** k-NN o *gradient boosting* usando indicadores correlacionados y países similares.
- **Cómo se presenta:** el valor estimado **nunca** se muestra como si fuera observado. Va con
  trama distinta en el mapa, etiqueta explícita y se puede desactivar con un interruptor. Por
  defecto, **desactivado**.
- **Choque con las líneas rojas:** el workspace prohíbe inventar datos. Esto no lo es *si y solo si*
  la estimación está marcada como tal en todo momento. Si en algún momento no se puede garantizar
  esa distinción visual, la funcionalidad se retira.

### 2.4 Qué explica qué

Entrenar un modelo interpretable para responder a "¿qué indicadores predicen mejor la esperanza de
vida?" y mostrar la importancia de cada variable.

- **Modelo:** gradient boosting + valores SHAP para la explicación.
- **En la interfaz:** un panel "factores asociados" por indicador.
- **Aviso permanente en pantalla:** esto mide **asociación, no causalidad**. Sin ese aviso, la
  funcionalidad no se publica. Es la más fácil de convertir en desinformación.

### 2.5 Anomalías

Detectar puntos donde una serie se rompe: guerras, crisis, o —muy habitual— un cambio de
metodología del organismo que publica.

- **Modelo:** detección de puntos de cambio (CUSUM, o `ruptures`) sobre cada serie.
- **Doble uso:** al usuario le señala momentos históricos interesantes; al proyecto le sirve de
  **control de calidad del pipeline**, porque un salto raro suele ser un error de datos, no un
  acontecimiento.

---

## Fase 3 — Deep learning, donde se justifica

### 3.1 Modelo global de series temporales

En vez de un modelo por serie, **un solo modelo entrenado sobre todas las series de todos los
países a la vez**. Esto sí es un caso legítimo de red neuronal: cada serie individual es corta,
pero el panel completo son decenas de miles de series y el modelo aprende patrones compartidos
—cómo se comporta la transición demográfica, cómo se recupera un país tras una caída del PIB.

- **Modelo:** N-BEATS o Temporal Fusion Transformer (`darts` o `neuralforecast`).
- **Cómo se valida:** contra los modelos simples de la fase 2.2, en el mismo *backtest*.
  **Si no gana con claridad, no entra.** Un ARIMA que acierta más que una red es el resultado
  correcto, no un fracaso, y así se documentará.

### 3.2 Embeddings de países

Un autoencoder que comprime el perfil completo de un país en un vector denso, entrenado también
sobre la evolución temporal y no solo sobre el último año.

- **Qué desbloquea:** mejora el "países similares" de 2.1; permite **similitud en el tiempo**
  ("España hoy se parece a Corea del Sur en 2005"), que es una forma muy potente de contar
  desarrollo; y da una proyección 2D donde se visualiza la **trayectoria** de cada país como una
  línea a lo largo de las décadas.
- Esta última visualización sería el elemento más distintivo de todo el proyecto: un segundo
  "atlas", no geográfico sino estructural.

---

## Fase 4 — IA generativa, con mucho cuidado

### 4.1 Resumen automático de país

Un párrafo en lenguaje natural describiendo el perfil de un país y lo más destacable de su
evolución.

- **Primera opción: generación por plantillas, sin LLM.** Reglas del tipo "si el indicador X está
  en el decil superior de su región, mencionarlo". Es gratis, determinista y **no puede equivocarse
  en una cifra**. Para describir datos numéricos esto no es la opción pobre, es la opción correcta.
- **Segunda opción: un LLM en el pipeline**, generando el texto una sola vez por país y
  guardándolo en el repositorio. El coste sería puntual, no recurrente, pero **existe** y choca con
  la restricción de coste cero: hay que plantearlo antes, no asumirlo.
- **Línea roja:** un LLM nunca calcula ni redondea una cifra. Los números se insertan desde los
  datos; el modelo solo redacta el texto alrededor. Un sitio de datos que alucina un número pierde
  toda su credibilidad de golpe.

### 4.2 Búsqueda en lenguaje natural

"Países con alta esperanza de vida y PIB per cápita bajo" → traducir a filtros sobre los datos.

- **Enfoque sin coste:** un modelo de *embeddings* pequeño ejecutándose en el navegador
  (Transformers.js) que empareja la frase con indicadores del catálogo, más reglas para los
  operadores de comparación.
- Evaluar solo si el catálogo crece lo bastante como para que encontrar un indicador a mano se
  vuelva incómodo. Con 20 indicadores, un desplegable es mejor producto.

---

## Descartado

Aquí se anota lo que se ha valorado y rechazado, para no volver a discutirlo:

| Idea | Motivo del descarte |
|---|---|
| Predicción causal / contrafactuales ("¿qué pasaría si subiera el gasto sanitario?") | Requiere inferencia causal seria, no correlación. Con estos datos se produciría desinformación con apariencia de rigor. |
| Chatbot sobre los datos | Coste recurrente por consulta y riesgo alto de alucinar cifras. La interfaz visual responde mejor. |
| Red neuronal para predicción tabular país a país | Peor que gradient boosting con ~200 muestras, y además no interpretable. |

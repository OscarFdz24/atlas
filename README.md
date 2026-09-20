# Atlas

Mapa mundial interactivo para explorar y comparar países con datos abiertos.

Elige un indicador —esperanza de vida, PIB per cápita, acceso a internet, emisiones, gasto
sanitario— y el mundo se colorea. Haz clic en un país y ves su ficha y su evolución histórica.
Elige dos y los compara lado a lado.

Sin registro, sin publicidad, sin coste. Todos los datos proceden de fuentes públicas y se citan.

> **Estado: en diseño.** Todavía no hay código.

## Por qué

Los datos existen y son públicos, pero están repartidos entre portales institucionales pensados
para analistas. Responder a "¿cómo está mi país en esto comparado con el vecino?" no debería
requerir descargar un CSV del Banco Mundial y abrirlo en Excel.

## Qué hará la primera versión

- Mapa mundial de coropletas con selector de indicador.
- Ficha de país con serie histórica al hacer clic.
- Comparación directa entre dos países en varios indicadores.
- Enlace compartible que conserva la vista seleccionada.

## Qué **no** hará

- **No es tiempo real.** Los indicadores socioeconómicos son series anuales que los organismos
  publican con uno o dos años de retraso. Cada cifra se muestra con su año.
- **No incluye coste de vida ni precios de alquiler.** La única fuente decente para eso (Numbeo)
  es de pago, y no se scrapean fuentes ajenas. Mejor no tenerlo que tenerlo mal.
- No hace predicciones ni interpreta los datos por ti.

## Fuentes de datos

| Fuente | Qué aporta | Licencia |
|---|---|---|
| [Banco Mundial](https://data.worldbank.org/) | Economía, población, salud, educación, energía | CC-BY 4.0 |
| [Our World in Data](https://ourworldindata.org/) | Clima, salud, democracia, energía | CC-BY 4.0 |
| [REST Countries](https://restcountries.com/) | Metadatos de países | Uso libre |
| [Natural Earth](https://www.naturalearthdata.com/) | Geometrías del mapa | Dominio público |

## Stack

Sitio **estático**: Astro con islas de React y TypeScript, mapa con `d3-geo` y TopoJSON, gráficas
con Recharts.

Astro en lugar de una SPA porque cada país y cada indicador tienen su propia URL con HTML real
generado en tiempo de build. Son miles de páginas, cada una respondiendo a una búsqueda concreta
("esperanza de vida en España"), y una página única rellenada por JavaScript no se indexaría bien.

Los datos se descargan y normalizan con un pipeline en Python que genera ficheros JSON en tiempo
de build. El navegador nunca llama a una API externa. Esto mantiene el proyecto rápido, robusto
frente a caídas de terceros y con coste de operación de cero euros.

Despliegue en Cloudflare Pages, con una acción programada que refresca los datos periódicamente.

## Licencias

El código y los datos se licencian por separado:

- **Código:** [MIT](LICENSE).
- **Datos** (contenido de `data/`): [CC BY 4.0](LICENSE-DATA) — libre uso, incluso comercial,
  citando la procedencia.

La licencia de los datos cubre la **recopilación y las transformaciones** de este proyecto, no
sustituye a la de las fuentes originales, que conservan la suya y deben citarse igualmente.

## Desarrollo

Pendiente de la primera implementación. Ver [`CLAUDE.md`](CLAUDE.md) para las decisiones técnicas
y el alcance cerrado de la v1.

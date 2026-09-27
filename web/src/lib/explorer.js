window.addEventListener("error", e => {
  const s = document.getElementById("stage");
  if (!s || s.querySelector(".boom")) return;
  const b = document.createElement("div");
  b.className = "boom";
  b.style.cssText = "position:absolute;left:16px;right:16px;bottom:16px;padding:12px 14px;border-radius:11px;background:#3a1d1d;border:1px solid #7a3b3b;color:#ffd9d9;font-size:13px;z-index:60";
  b.textContent = "Error: " + e.message;
  s.appendChild(b);
});

import { geoOrthographic, geoPath, geoGraticule10, geoContains, geoCentroid } from "d3-geo";
import { ascending, quantileSorted, range, extent, max, bin } from "d3-array";
import { scaleLinear, scaleBand, scaleQuantize } from "d3-scale";
import { line } from "d3-shape";
import { timer } from "d3-timer";
import { feature } from "topojson-client";
import isoCountries from "i18n-iso-countries";

/* El prototipo usaba los globales `d3` y `topojson` del CDN. Aquí se importa
   solo lo que se usa y se reagrupa igual, para no tocar el resto del código. */
const d3 = { geoOrthographic, geoPath, geoGraticule10, geoContains, geoCentroid,
  ascending, quantileSorted, range, extent, max, bin,
  scaleLinear, scaleBand, scaleQuantize, line, timer };
const topojson = { feature };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const getJSON = async path => {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`No se pudo cargar ${path} (${r.status})`);
  return r.json();
};

const CAT = await getJSON("/data/catalog.json");
const TOPO = await getJSON("/data/geo/countries-110m.json");

const DATA = {
  indicators: CAT.indicators,
  countries: CAT.countries,
  years: Object.fromEntries(CAT.indicators.map(i => [i.id, i.years])),
};

/* Las series se piden cuando hacen falta: 23 KiB de catálogo al abrir, en vez
   de los 2,3 MB que pesan los veinte indicadores juntos. */
const SERIES = {};
const pending = {};
async function ensureSeries(id) {
  if (SERIES[id]) return;
  pending[id] ??= getJSON(`/data/series/${id}.json`);
  SERIES[id] = await pending[id];
}
const ensureAll = () => Promise.all(DATA.indicators.map(i => ensureSeries(i.id)));

const NUM_TO_A3 = {};
for (let n = 1; n <= 999; n++) {
  const code = String(n).padStart(3, "0");
  const a3 = isoCountries.numericToAlpha3(code);
  if (a3) NUM_TO_A3[code] = a3;
}

await ensureSeries("life-expectancy");


const THEMES = { poblacion:"Población", salud:"Salud", economia:"Economía",
  educacion:"Educación", tecnologia:"Tecnología", medioambiente:"Medio ambiente" };
/* Cada paleta tiene dos versiones, no una invertida: sobre fondo oscuro los
   pasos suben hacia el brillo, y sobre fondo claro bajan hacia el fondo de
   color. Valor bajo primero, valor alto último, en ambos casos. */
const PALETTES = {
  cian:    { dark:["#0a3f3c","#0f5f59","#14847c","#1bab9f","#33cfc0","#6fe6db","#b6f5ee"],
             light:["#d7f5f1","#a8e9e2","#72d7cd","#38bdb2","#1a9c92","#0e7a72","#08544f"] },
  azul:    { dark:["#10294f","#16406f","#1d5a99","#2a7ccc","#4f9df0","#8cc2f8","#c8e2fd"],
             light:["#d8e7fb","#aecbf5","#7fa9ec","#4b84e0","#2f66bd","#1f4c93","#132f61"] },
  violeta: { dark:["#2a1d5c","#3b2a86","#4f3bb4","#6a54d9","#8f7bef","#b7a8f8","#ded6fd"],
             light:["#e6ddfb","#c9b6f7","#aa90f0","#8b69e9","#6f4bcc","#55389f","#372268"] },
  verde:   { dark:["#12380f","#1b5417","#28741f","#37992a","#4fbe3f","#86d97a","#c3efb9"],
             light:["#dcf3d2","#b6e6a6","#88d675","#5bc14b","#419e38","#2f7a29","#1d5219"] },
  ambar:   { dark:["#4a2d0b","#6f4410","#9a601a","#c68227","#eda845","#f7c87e","#fde5b8"],
             light:["#fdeccb","#f9d79b","#f2bb61","#e39a2f","#bd7a20","#915a17","#653c0d"] },
  rojo:    { dark:["#4d1611","#70231b","#99342a","#c24a3c","#e46a5b","#f29c92","#fbcdc7"],
             light:["#fde0dc","#f9bdb5","#f3948a","#e86a5f","#c74c43","#9c372f","#6d211c"] },
};
const SERIES_COLORS = ["#1fe0d0","#f0a03c","#8b69e9","#ef6f8e","#63b3ff"];

/* --------------------------------------------------------------- logos --- */
/* Atlas condenado a sostener la bóveda celeste: figura arrodillada, esfera
   armilar sobre los hombros. Trazo variable para sugerir volumen sin relleno. */
const LOGOS = [
  (a, s) => `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <g stroke="${a}" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="32" cy="17.5" r="13.5" stroke-width="1.7"/>
      <ellipse cx="32" cy="17.5" rx="5.6" ry="13.5" stroke-width="1" opacity=".55"/>
      <ellipse cx="32" cy="17.5" rx="11.2" ry="13.5" stroke-width="1" opacity=".35"/>
      <path d="M18.5 17.5h27M20.4 10.6h23.2M20.4 24.4h23.2" stroke-width="1" opacity=".5"/>
      <path d="M24.5 14.2c2.6-1.9 4.2.6 6.6-.4 2-.8 1.6-3.1 4-3.2" stroke-width="1.5" opacity=".9"/>
      <path d="M33 22.6c2.4-1.2 3.4 1 5.6.2" stroke-width="1.5" opacity=".9"/>
      <circle cx="32" cy="36.2" r="4.1" stroke-width="2"/>
      <path d="M28.4 33.4c-1.6-1.7-3.1-3.3-4.4-4.2M35.6 33.4c1.6-1.7 3.1-3.3 4.4-4.2" stroke-width="2.6"/>
      <path d="M24 29.2c-1.8-.5-3.3.3-4.3 1.6M40 29.2c1.8-.5 3.3.3 4.3 1.6" stroke-width="2.2"/>
      <path d="M28.6 39.6c-1.5 2.1-2 4.6-1.6 7.2M35.4 39.6c1.5 2.1 2 4.6 1.6 7.2" stroke-width="2.6"/>
      <path d="M27 46.8c-2.4 1.4-4.6 3.3-6.1 5.6M37 46.8c1.6 1 2.9 2.4 3.8 4" stroke-width="2.6"/>
      <path d="M20.9 52.4h-4.4M40.8 50.8c1.9 1.5 4.3 2.2 6.7 2.2" stroke-width="2.4"/>
      <path d="M29 42.4h6" stroke-width="1.4" opacity=".6"/>
    </g></svg>`,
  (a, s) => `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <g stroke="${a}" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="32" cy="20" r="14.5" stroke-width="1.8"/>
      <path d="M17.5 20h29" stroke-width="1.1" opacity=".55"/>
      <path d="M32 5.5c4.6 4.6 4.6 24.4 0 29M32 5.5c-4.6 4.6-4.6 24.4 0 29" stroke-width="1.1" opacity=".55"/>
      <path d="M20.2 12.2h23.6M20.2 27.8h23.6" stroke-width="1" opacity=".4"/>
      <path d="M22.8 17.4c3-2.6 5 .8 7.8-.6 2.4-1.2 1.6-4 4.6-4.2 2.4-.2 3 2 5.4 1.6" stroke-width="1.6" opacity=".85"/>
      <path d="M25.6 25.6c2.6-1.4 4 1.2 6.6.4 2.2-.7 2.6-2.6 5-2" stroke-width="1.6" opacity=".85"/>
      <path d="M32 34.5v3.2" stroke-width="2"/>
      <circle cx="32" cy="41.4" r="3.8" stroke-width="2"/>
      <path d="M32 45.2v8.4" stroke-width="2.8"/>
      <path d="M32 47.4c-3.4-1-6.5-3.1-8.6-6M32 47.4c3.4-1 6.5-3.1 8.6-6" stroke-width="2.6"/>
      <path d="M23.4 41.4c-2-.6-4.1-.3-5.9.9M40.6 41.4c2-.6 4.1-.3 5.9.9" stroke-width="2.3"/>
      <path d="M32 53.6c-2.6 1.6-4.4 3.6-5.4 5.9M32 53.6c2.6 1.6 4.4 3.6 5.4 5.9" stroke-width="2.8"/>
    </g></svg>`,
  (a, s) => `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <g stroke="${a}" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="32" cy="32" r="28.5" stroke-width="1.4" opacity=".45"/>
      <circle cx="32" cy="22.5" r="10.5" stroke-width="1.7"/>
      <ellipse cx="32" cy="22.5" rx="4.4" ry="10.5" stroke-width=".95" opacity=".5"/>
      <path d="M21.5 22.5h21M23.2 16.6h17.6M23.2 28.4h17.6" stroke-width=".95" opacity=".45"/>
      <path d="M26.4 20c2-1.5 3.3.5 5.2-.3 1.6-.7 1.2-2.5 3.1-2.6" stroke-width="1.35" opacity=".9"/>
      <circle cx="32" cy="38.4" r="3.5" stroke-width="1.9"/>
      <path d="M29 36.2c-1.5-1.6-2.9-3.2-4.2-4.3M35 36.2c1.5-1.6 2.9-3.2 4.2-4.3" stroke-width="2.4"/>
      <path d="M24.8 31.9c-1.7-.6-3.2.1-4.2 1.4M39.2 31.9c1.7-.6 3.2.1 4.2 1.4" stroke-width="2"/>
      <path d="M29.2 41.4c-1.3 2-1.7 4.3-1.3 6.6M34.8 41.4c1.3 2 1.7 4.3 1.3 6.6" stroke-width="2.4"/>
      <path d="M27.9 48c-2 1.2-3.8 2.9-5 4.9M36.1 48c1.4.9 2.5 2.1 3.3 3.5" stroke-width="2.4"/>
      <path d="M22.9 52.9h-3.4M39.4 51.5c1.6 1.2 3.6 1.9 5.6 1.9" stroke-width="2.2"/>
    </g></svg>`,
];
let logoIndex = 0;

/* ---------------------------------------------------------------- state --- */
let indicatorId = "life-expectancy";
let paletteName = "cian";
let year = 0, playing = false, playTimer = null;
let yearFrom = 0, yearTo = 0;
let selected = null, pinned = [], tab = "config";
let panelOpen = true, drawerOpen = false, hudFolded = false;
let regionFilter = new Set(), minPct = 0;
let chartType = "lineas", chartQuery = "", indQuery = "";
/* Ejes de las gráficas. Por defecto siguen al indicador del globo, pero el
   usuario puede fijar otros sin mover el mapa. */
let metricA = "life-expectancy", metricB = "gdp-per-capita";
let downloadFormat = "csv", downloadScope = "indicador";
let openSections = new Set(["indicador", "periodo"]);

const byId = id => DATA.indicators.find(i => i.id === id);
const fmt = (v, d) => v === undefined || v === null ? "—"
  : v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const isLight = () => document.documentElement.getAttribute("data-theme") === "light";
const REGIONS = [...new Set(Object.values(DATA.countries).map(c => c.region))].sort();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

const valueAt = (code, id, y) => {
  const s = SERIES[id] && SERIES[id][code];
  return s ? s[String(y)] : undefined;
};
const seriesOf = (code, id, a, b) => {
  const s = SERIES[id] && SERIES[id][code];
  if (!s) return [];
  return Object.entries(s).map(([y, v]) => [+y, v])
    .filter(p => p[0] >= a && p[0] <= b).sort((x, z) => x[0] - z[0]);
};

/* ------------------------------------------------------------- geometry --- */
const features = topojson.feature(TOPO, TOPO.objects.countries).features
  .filter(f => String(f.id) !== "010");
features.forEach(f => { f.a3 = NUM_TO_A3[String(f.id).padStart(3, "0")] || null; });

const canvas = document.getElementById("globe");
const ctx = canvas.getContext("2d");
const projection = d3.geoOrthographic().rotate([-12, -22]).clipAngle(90);
const path = d3.geoPath(projection, ctx);
const graticule = d3.geoGraticule10();
let scaleFactor = 0.44, spinning = true, W = 0, H = 0;
let occupied = 0, occupiedTarget = 0;
const targetOccupied = () => window.innerWidth <= 900 ? 0 : (panelOpen ? 380 : 0) + (drawerOpen ? 470 : 0);

/* ---------------------------------------------------------------- scale --- */
let bins = [], ramp = [], sorted = [];
const rampFor = name => PALETTES[name][isLight() ? "light" : "dark"];
const rampColors = () => rampFor(paletteName);

function rebuildScale() {
  const ind = byId(indicatorId);
  sorted = Object.keys(DATA.countries).map(c => valueAt(c, indicatorId, year))
    .filter(v => v !== undefined).sort(d3.ascending);
  bins = sorted.length ? d3.range(1, 7).map(i => d3.quantileSorted(sorted, i / 7)) : [];
  ramp = rampColors();
  document.getElementById("hudTitle").textContent = ind.name;
  document.getElementById("hudMeta").textContent = `${ind.unit} · ${sorted.length} países con dato en ${year}`;
  document.getElementById("ramp").innerHTML = ramp.map(c => `<i style="background:${c}"></i>`).join("");
  document.getElementById("rampMin").textContent = sorted.length ? fmt(sorted[0], ind.decimals) : "—";
  document.getElementById("rampMax").textContent = sorted.length ? fmt(sorted.at(-1), ind.decimals) : "—";
  document.getElementById("yrInline").textContent = year;
  document.getElementById("foot").innerHTML = `${esc(ind.name)} · Banco Mundial (WDI) · CC BY 4.0`;
}
const binOf = v => { let b = 0; while (b < bins.length && v >= bins[b]) b++; return b; };

function passes(a3) {
  const c = DATA.countries[a3];
  if (!c) return false;
  if (regionFilter.size && !regionFilter.has(c.region)) return false;
  const v = valueAt(a3, indicatorId, year);
  if (v === undefined) return false;
  if (minPct > 0 && sorted.length) {
    const ind = byId(indicatorId);
    const cut = d3.quantileSorted(sorted, ind.higherIsBetter === false ? 1 - minPct / 100 : minPct / 100);
    return ind.higherIsBetter === false ? v <= cut : v >= cut;
  }
  return true;
}
const filtering = () => regionFilter.size > 0 || minPct > 0;

/* ----------------------------------------------------------------- draw --- */
function resize() {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  occupiedTarget = targetOccupied();
  draw();
}
function draw() {
  const avail = Math.max(220, W - occupied);
  projection.translate([avail / 2, H / 2]).scale(Math.min(avail, H) * scaleFactor);
  const cx = avail / 2, cy = H / 2, R = projection.scale();
  ctx.clearRect(0, 0, W, H);

  const bg = ctx.createRadialGradient(cx, cy, R * .2, cx, cy, Math.max(W, H));
  bg.addColorStop(0, css("--stage-1")); bg.addColorStop(1, css("--stage-2"));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const halo = ctx.createRadialGradient(cx, cy, R * .94, cx, cy, R * 1.22);
  halo.addColorStop(0, css("--glow")); halo.addColorStop(1, "transparent");
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, 6.2832); ctx.fill();

  ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = css("--sphere"); ctx.fill();
  ctx.beginPath(); path(graticule); ctx.strokeStyle = css("--graticule"); ctx.lineWidth = .6; ctx.stroke();

  const stroke = css("--stage-2"), none = css("--no-data"), dim = filtering();
  for (const f of features) {
    const v = f.a3 ? valueAt(f.a3, indicatorId, year) : undefined;
    ctx.beginPath(); path(f);
    ctx.globalAlpha = dim && !(f.a3 && passes(f.a3)) ? .15 : 1;
    ctx.fillStyle = v === undefined ? none : ramp[binOf(v)];
    ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = .4; ctx.stroke();
  }
  ctx.globalAlpha = 1;

  pinned.forEach((code, i) => {
    const f = features.find(f => f.a3 === code); if (!f) return;
    ctx.beginPath(); path(f);
    ctx.strokeStyle = SERIES_COLORS[(i + 1) % SERIES_COLORS.length]; ctx.lineWidth = 1.8; ctx.stroke();
  });
  if (selected) {
    const f = features.find(f => f.a3 === selected);
    if (f) { ctx.beginPath(); path(f); ctx.strokeStyle = css("--accent"); ctx.lineWidth = 2; ctx.stroke(); }
  }
  ctx.beginPath(); path({ type: "Sphere" });
  ctx.strokeStyle = css("--rim"); ctx.lineWidth = 1.6; ctx.stroke();
}

d3.timer(() => {
  let dirty = false;
  if (Math.abs(occupied - occupiedTarget) > .5) { occupied += (occupiedTarget - occupied) * .18; dirty = true; }
  else if (occupied !== occupiedTarget) { occupied = occupiedTarget; dirty = true; }
  if (spinning) { const r = projection.rotate(); projection.rotate([r[0] + .13, r[1]]); dirty = true; }
  if (dirty) draw();
});

/* ---------------------------------------------------------- interaction --- */
function at(e) {
  const r = canvas.getBoundingClientRect();
  const p = projection.invert([e.clientX - r.left, e.clientY - r.top]);
  if (!p || isNaN(p[0])) return null;
  return features.find(f => d3.geoContains(f, p)) || null;
}
const stopSpin = () => { spinning = false; document.getElementById("spinBtn").textContent = "▶"; };

let drag = null;
canvas.addEventListener("pointerdown", e => {
  drag = { x: e.clientX, y: e.clientY, r: projection.rotate(), moved: 0 };
  stopSpin(); canvas.classList.add("dragging"); canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", e => {
  if (drag) {
    const k = 76 / projection.scale();
    drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
    projection.rotate([drag.r[0] + (e.clientX - drag.x) * k,
      Math.max(-90, Math.min(90, drag.r[1] - (e.clientY - drag.y) * k))]);
    draw(); return;
  }
  const f = at(e), tip = document.getElementById("tip");
  if (!f) { tip.hidden = true; return; }
  const ind = byId(indicatorId), c = f.a3 && DATA.countries[f.a3];
  const v = f.a3 ? valueAt(f.a3, indicatorId, year) : undefined;
  tip.innerHTML = `<b>${esc(c ? c.name : f.properties.name)}</b><span>${
    v === undefined ? "sin datos en " + year : fmt(v, ind.decimals) + " " + esc(ind.unit)}</span>`;
  tip.hidden = false;
  const r = canvas.getBoundingClientRect();
  tip.style.left = Math.min(e.clientX - r.left + 15, W - tip.offsetWidth - 10) + "px";
  tip.style.top = Math.max(e.clientY - r.top - 46, 8) + "px";
});
canvas.addEventListener("pointerup", e => {
  const click = drag && drag.moved < 5;
  canvas.classList.remove("dragging"); drag = null;
  if (!click) return;
  const f = at(e);
  if (f && f.a3 && DATA.countries[f.a3]) select(f.a3);
});
canvas.addEventListener("pointerleave", () => { document.getElementById("tip").hidden = true; });
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  scaleFactor = Math.max(.28, Math.min(2.6, scaleFactor * (e.deltaY < 0 ? 1.12 : .89)));
  draw();
}, { passive: false });

/* --------------------------------------------------------------- charts --- */
const CHARTS = [
  { id:"lineas", name:"Líneas", desc:"Evolución en el tiempo", icon:'<path d="M2 26 L14 14 L22 19 L38 5" fill="none" stroke="CC" stroke-width="2.4" stroke-linecap="round"/>' },
  { id:"barras", name:"Barras", desc:"Clasificación de países", icon:'<rect x="3" y="18" width="6" height="12" fill="CC"/><rect x="12" y="11" width="6" height="19" fill="CC"/><rect x="21" y="6" width="6" height="24" fill="CC"/><rect x="30" y="21" width="6" height="9" fill="CC"/>' },
  { id:"dispersion", name:"Dispersión", desc:"Cruza dos indicadores", icon:'<circle cx="8" cy="23" r="3" fill="CC"/><circle cx="17" cy="14" r="3" fill="CC"/><circle cx="26" cy="18" r="3" fill="CC"/><circle cx="34" cy="8" r="3" fill="CC"/>' },
  { id:"calor", name:"Mapa de calor", desc:"Países por año", icon:'<rect x="3" y="8" width="8" height="8" fill="CC" opacity=".4"/><rect x="12" y="8" width="8" height="8" fill="CC" opacity=".8"/><rect x="21" y="8" width="8" height="8" fill="CC"/><rect x="3" y="18" width="8" height="8" fill="CC"/><rect x="12" y="18" width="8" height="8" fill="CC" opacity=".55"/><rect x="21" y="18" width="8" height="8" fill="CC" opacity=".3"/>' },
  { id:"distribucion", name:"Distribución", desc:"Reparto entre países", icon:'<rect x="3" y="22" width="5" height="8" fill="CC"/><rect x="10" y="15" width="5" height="15" fill="CC"/><rect x="17" y="8" width="5" height="22" fill="CC"/><rect x="24" y="16" width="5" height="14" fill="CC"/><rect x="31" y="24" width="5" height="6" fill="CC"/>' },
];

function chartCountries() {
  const list = [];
  if (selected) list.push(selected);
  pinned.forEach(p => { if (!list.includes(p)) list.push(p); });
  return list;
}
function rankedNow(id = indicatorId) {
  const ind = byId(id);
  return Object.entries(DATA.countries)
    .map(([code, c]) => [c.name, valueAt(code, id, year), code])
    .filter(r => r[1] !== undefined)
    .filter(r => !filtering() || passes(r[2]))
    .sort((a, b) => ind.higherIsBetter === false ? a[1] - b[1] : b[1] - a[1]);
}
function svgWrap(inner, w, h, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" font-family="IBM Plex Sans, system-ui, sans-serif">
  <title>${esc(title)}</title><rect width="${w}" height="${h}" fill="${css("--raise")}"/>${inner}</svg>`;
}
const AX = () => ({ grid: css("--line-soft"), ink: css("--ink-3"), ink2: css("--ink-2") });

function chLineas(w, h) {
  const ind = byId(metricA), list = chartCountries();
  const m = { t: 14, r: 14, b: 26, l: 54 };
  const all = list.flatMap(c => seriesOf(c, metricA, yearFrom, yearTo));
  if (!all.length) return null;
  const x = d3.scaleLinear().domain([yearFrom, yearTo]).range([m.l, w - m.r]);
  const y = d3.scaleLinear().domain(d3.extent(all, p => p[1])).nice(5).range([h - m.b, m.t]);
  const line = d3.line().x(p => x(p[0])).y(p => y(p[1]));
  const a = AX(), dec = Math.min(ind.decimals, 1);
  let s = y.ticks(5).map(t => `<line x1="${m.l}" x2="${w - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="${a.grid}"/>
    <text x="${m.l - 7}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="${a.ink}">${fmt(t, dec)}</text>`).join("");
  s += x.ticks(6).map(t => `<text x="${x(t)}" y="${h - 8}" text-anchor="middle" font-size="11" fill="${a.ink}">${t}</text>`).join("");
  list.forEach((code, i) => {
    const pts = seriesOf(code, metricA, yearFrom, yearTo);
    if (!pts.length) return;
    const col = SERIES_COLORS[i % SERIES_COLORS.length];
    s += `<path d="${line(pts)}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="${x(pts.at(-1)[0])}" cy="${y(pts.at(-1)[1])}" r="3.6" fill="${col}"/>
      <text x="${x(pts.at(-1)[0]) - 6}" y="${y(pts.at(-1)[1]) - 9}" text-anchor="end" font-size="11" font-weight="600" fill="${col}">${esc(DATA.countries[code].name)}</text>`;
  });
  return svgWrap(s, w, h, `${ind.name} ${yearFrom}–${yearTo}`);
}
function chBarras(w, h) {
  const ind = byId(metricA), rows = rankedNow(metricA).slice(0, 14);
  if (!rows.length) return null;
  const m = { t: 14, r: 56, b: 22, l: 132 };
  const x = d3.scaleLinear().domain([0, d3.max(rows, r => r[1])]).nice().range([m.l, w - m.r]);
  const y = d3.scaleBand().domain(rows.map(r => r[0])).range([m.t, h - m.b]).padding(.28);
  const a = AX();
  let s = rows.map(([name, v], i) => {
    const col = ramp[Math.min(6, Math.floor((1 - i / rows.length) * 6))];
    return `<rect x="${m.l}" y="${y(name)}" width="${Math.max(1, x(v) - m.l)}" height="${y.bandwidth()}" rx="3" fill="${col}"/>
      <text x="${m.l - 8}" y="${y(name) + y.bandwidth() / 2 + 4}" text-anchor="end" font-size="11.5" fill="${a.ink2}">${esc(name)}</text>
      <text x="${x(v) + 7}" y="${y(name) + y.bandwidth() / 2 + 4}" font-size="11.5" fill="${a.ink}" font-family="IBM Plex Mono, monospace">${fmt(v, ind.decimals)}</text>`;
  }).join("");
  s += `<text x="${m.l}" y="${h - 6}" font-size="11" fill="${a.ink}">${esc(ind.unit)} · ${year}</text>`;
  return svgWrap(s, w, h, `${ind.name} ${year}`);
}
function chDispersion(w, h) {
  const xi = byId(metricA);
  const yiId = metricB !== metricA ? metricB : DATA.indicators.find(i => i.id !== metricA).id;
  const yi = byId(yiId);
  const pts = Object.entries(DATA.countries).map(([code, c]) => {
    const a = valueAt(code, metricA, year), b = valueAt(code, yiId, year);
    return a === undefined || b === undefined ? null : { code, name: c.name, region: c.region, a, b };
  }).filter(Boolean).filter(p => !filtering() || passes(p.code));
  if (!pts.length) return null;
  const m = { t: 14, r: 16, b: 40, l: 56 };
  const x = d3.scaleLinear().domain(d3.extent(pts, p => p.a)).nice().range([m.l, w - m.r]);
  const y = d3.scaleLinear().domain(d3.extent(pts, p => p.b)).nice().range([h - m.b, m.t]);
  const a = AX(), regions = [...new Set(pts.map(p => p.region))];
  let s = y.ticks(5).map(t => `<line x1="${m.l}" x2="${w - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="${a.grid}"/>
      <text x="${m.l - 7}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="${a.ink}">${fmt(t, Math.min(yi.decimals,1))}</text>`).join("");
  s += x.ticks(6).map(t => `<text x="${x(t)}" y="${h - 24}" text-anchor="middle" font-size="11" fill="${a.ink}">${fmt(t, Math.min(xi.decimals,1))}</text>`).join("");
  s += pts.map(p => {
    const col = ramp[1 + (regions.indexOf(p.region) % 6)];
    const on = p.code === selected || pinned.includes(p.code);
    return `<circle cx="${x(p.a)}" cy="${y(p.b)}" r="${on ? 6 : 3.4}" fill="${on ? css("--accent") : col}" opacity="${on ? 1 : .72}"/>` +
      (on ? `<text x="${x(p.a)}" y="${y(p.b) - 10}" text-anchor="middle" font-size="11" font-weight="600" fill="${css("--accent")}">${esc(p.name)}</text>` : "");
  }).join("");
  s += `<text x="${w / 2}" y="${h - 6}" text-anchor="middle" font-size="11" fill="${a.ink2}">${esc(xi.name)} (${esc(xi.unit)})</text>
    <text x="14" y="${m.t + 4}" font-size="11" fill="${a.ink2}">${esc(yi.name)}</text>`;
  return svgWrap(s, w, h, `${xi.name} vs ${yi.name} ${year}`);
}
function chCalor(w, h) {
  const ind = byId(metricA);
  let list = chartCountries();
  if (list.length < 2) list = rankedNow(metricA).slice(0, 12).map(r => r[2]);
  const yrs = d3.range(yearFrom, yearTo + 1);
  const step = Math.max(1, Math.ceil(yrs.length / 40));
  const cols = yrs.filter((_, i) => i % step === 0);
  const m = { t: 14, r: 14, b: 26, l: 132 };
  const cw = (w - m.l - m.r) / cols.length, ch = Math.min(22, (h - m.t - m.b) / Math.max(1, list.length));
  const a = AX();
  const all = list.flatMap(c => cols.map(y2 => valueAt(c, metricA, y2)).filter(v => v !== undefined));
  if (!all.length) return null;
  const col = d3.scaleQuantize().domain(d3.extent(all)).range(ramp);
  let s = "";
  list.forEach((code, r) => {
    s += `<text x="${m.l - 8}" y="${m.t + r * ch + ch / 2 + 4}" text-anchor="end" font-size="11" fill="${a.ink2}">${esc(DATA.countries[code].name)}</text>`;
    cols.forEach((y2, c2) => {
      const v = valueAt(code, metricA, y2);
      s += `<rect x="${m.l + c2 * cw}" y="${m.t + r * ch}" width="${Math.max(1, cw - 1)}" height="${Math.max(1, ch - 1)}" fill="${v === undefined ? css("--no-data") : col(v)}"/>`;
    });
  });
  [cols[0], cols.at(-1)].forEach((y2, i) =>
    s += `<text x="${i === 0 ? m.l : w - m.r}" y="${h - 8}" text-anchor="${i === 0 ? "start" : "end"}" font-size="11" fill="${a.ink}">${y2}</text>`);
  return svgWrap(s, w, h, `${ind.name} ${yearFrom}–${yearTo}`);
}
function chDistribucion(w, h) {
  const ind = byId(metricA);
  const vals = Object.keys(DATA.countries).filter(c => !filtering() || passes(c))
    .map(c => valueAt(c, metricA, year)).filter(v => v !== undefined);
  if (!vals.length) return null;
  const m = { t: 18, r: 14, b: 30, l: 42 };
  const x = d3.scaleLinear().domain(d3.extent(vals)).nice().range([m.l, w - m.r]);
  const buckets = d3.bin().domain(x.domain()).thresholds(18)(vals);
  const y = d3.scaleLinear().domain([0, d3.max(buckets, b => b.length)]).nice().range([h - m.b, m.t]);
  const a = AX();
  let s = y.ticks(4).map(t => `<line x1="${m.l}" x2="${w - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="${a.grid}"/>
    <text x="${m.l - 7}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="${a.ink}">${t}</text>`).join("");
  s += buckets.map(b => `<rect x="${x(b.x0) + 1}" y="${y(b.length)}" width="${Math.max(1, x(b.x1) - x(b.x0) - 2)}" height="${y(0) - y(b.length)}" rx="2" fill="${ramp[3]}"/>`).join("");
  s += x.ticks(6).map(t => `<text x="${x(t)}" y="${h - 14}" text-anchor="middle" font-size="11" fill="${a.ink}">${fmt(t, Math.min(ind.decimals,1))}</text>`).join("");
  chartCountries().forEach((code, i) => {
    const v = valueAt(code, metricA, year); if (v === undefined) return;
    const c2 = SERIES_COLORS[i % SERIES_COLORS.length];
    s += `<line x1="${x(v)}" x2="${x(v)}" y1="${m.t}" y2="${h - m.b}" stroke="${c2}" stroke-width="2" stroke-dasharray="4 3"/>
      <text x="${x(v)}" y="${m.t - 4}" text-anchor="middle" font-size="11" font-weight="600" fill="${c2}">${esc(DATA.countries[code].name)}</text>`;
  });
  s += `<text x="${w / 2}" y="${h - 2}" text-anchor="middle" font-size="11" fill="${a.ink2}">${esc(ind.unit)} · ${year} · ${vals.length} países</text>`;
  return svgWrap(s, w, h, `${ind.name} ${year}`);
}
const BUILDERS = { lineas: chLineas, barras: chBarras, dispersion: chDispersion, calor: chCalor, distribucion: chDistribucion };
const buildChart = (w = 640, h = 400) => { try { return BUILDERS[chartType](w, h); } catch (e) { return null; } };

/* ------------------------------------------------------------ descargas --- */
function download(name, mime, text) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function exportPNG() {
  const svg = buildChart(1280, 800);
  if (!svg) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 1280; c.height = 800;
    const g = c.getContext("2d");
    g.fillStyle = css("--raise"); g.fillRect(0, 0, 1280, 800);
    g.drawImage(img, 0, 0);
    c.toBlob(b => {
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url; a.download = `atlas-${chartType}-${metricA}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, "image/png");
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function exportHTML() {
  const svg = buildChart(1000, 620);
  if (!svg) return;
  const ind = byId(metricA);
  download(`atlas-${chartType}-${metricA}.html`, "text/html;charset=utf-8",
`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(ind.name)} — Atlas</title>
<style>body{margin:0;background:${css("--bg")};color:${css("--ink")};font-family:system-ui,sans-serif;padding:24px}
figure{margin:0 auto;max-width:1000px}figcaption{font-size:13px;color:${css("--ink-3")};margin-top:10px}svg{max-width:100%;height:auto}</style>
</head><body><figure>${svg}<figcaption>${esc(ind.name)} (${esc(ind.unit)}). Fuente: Banco Mundial, World Development Indicators, indicador ${esc(ind.code)}. Datos originales de ${esc(ind.upstream)}. Licencia CC BY 4.0. Generado con Atlas.</figcaption></figure></body></html>`);
}
function exportData() {
  const codes = downloadScope === "seleccion" && chartCountries().length ? chartCountries()
    : Object.keys(DATA.countries).filter(c => !filtering() || passes(c));
  const ids = downloadScope === "todos" ? DATA.indicators.map(i => i.id) : [indicatorId];
  const rows = [];
  for (const code of codes) for (const id of ids)
    for (const [y, v] of Object.entries((SERIES[id] && SERIES[id][code]) || {}))
      if (+y >= yearFrom && +y <= yearTo) rows.push({ pais: DATA.countries[code].name, iso3: code,
        region: DATA.countries[code].region, indicador: byId(id).name, codigo: byId(id).code,
        anio: +y, valor: v, unidad: byId(id).unit });
  rows.sort((a, b) => a.pais.localeCompare(b.pais) || a.indicador.localeCompare(b.indicador) || a.anio - b.anio);
  const base = `atlas-${downloadScope === "todos" ? "todos" : indicatorId}-${yearFrom}-${yearTo}`;
  const cols = ["pais","iso3","region","indicador","codigo","anio","valor","unidad"];
  if (downloadFormat === "csv")
    download(base + ".csv", "text/csv;charset=utf-8",
      "﻿" + [cols.join(","), ...rows.map(r => cols.map(c => /[",;\n]/.test(String(r[c])) ? `"${String(r[c]).replace(/"/g, '""')}"` : r[c]).join(","))].join("\n"));
  else if (downloadFormat === "json")
    download(base + ".json", "application/json;charset=utf-8", JSON.stringify({
      fuente: "The World Bank: World Development Indicators", licencia: "CC BY 4.0",
      generado: new Date().toISOString().slice(0, 10), filas: rows.length, datos: rows }, null, 1));
  else
    download(base + ".txt", "text/plain;charset=utf-8",
      [cols.join("\t"), ...rows.map(r => cols.map(c => r[c]).join("\t"))].join("\n"));
  return rows.length;
}

/* ---------------------------------------------------------------- panel --- */
function setPanel(open) {
  panelOpen = open;
  document.getElementById("stage").classList.toggle("p-open", open);
  document.getElementById("handle").textContent = open ? "›" : "‹";
  occupiedTarget = targetOccupied();
}
function setDrawer(open) {
  drawerOpen = open;
  document.getElementById("stage").classList.toggle("d-open", open);
  occupiedTarget = targetOccupied();
  if (open) renderDrawer();
}
function setTab(name) {
  tab = name;
  document.querySelectorAll(".panel .tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  renderPanel();
}
function select(code) {
  selected = code;
  if (!panelOpen) setPanel(true);
  if (tab === "config") setTab("pais"); else renderPanel();
  if (drawerOpen) renderDrawer();
  draw();
}
function goTo(code) {
  const f = features.find(f => f.a3 === code);
  if (f) { const c = d3.geoCentroid(f); projection.rotate([-c[0], -c[1]]); stopSpin(); }
  select(code);
}
function togglePin() {
  pinned = pinned.includes(selected) ? pinned.filter(p => p !== selected) : [...pinned, selected].slice(-4);
  renderPins(); renderPanel(); if (drawerOpen) renderDrawer(); draw();
}
function renderPins() {
  document.getElementById("pins").innerHTML = pinned.map((code, i) =>
    `<span class="pin"><i style="background:${SERIES_COLORS[(i + 1) % SERIES_COLORS.length]}"></i>${esc(DATA.countries[code].name)}<button data-un="${code}" aria-label="Quitar">×</button></span>`).join("");
  document.querySelectorAll("[data-un]").forEach(b => b.addEventListener("click", () => {
    pinned = pinned.filter(p => p !== b.dataset.un);
    renderPins(); renderPanel(); if (drawerOpen) renderDrawer(); draw();
  }));
}
async function setIndicator(id) {
  await ensureSeries(id);
  indicatorId = id;
  metricA = id;
  if (metricB === id) metricB = DATA.indicators.find(i => i.id !== id).id;
  const [a, b] = DATA.years[id];
  year = Math.min(Math.max(year, a), b);
  yearFrom = Math.max(yearFrom, a); yearTo = Math.min(yearTo, b);
  if (yearFrom >= yearTo) { yearFrom = a; yearTo = b; }
  syncYearUI(); rebuildScale(); renderPanel(); if (drawerOpen) renderDrawer(); draw();
}
function syncYearUI() {
  const [a, b] = DATA.years[indicatorId];
  const r = document.getElementById("yearRange");
  r.min = a; r.max = b; r.value = year;
  document.getElementById("yearOut").textContent = year;
  document.getElementById("yrInline").textContent = year;
}

function section(key, label, tag, inner) {
  return `<details class="acc" data-sec="${key}" ${openSections.has(key) ? "open" : ""}>
    <summary>${label}${tag ? `<span class="tagv">${tag}</span>` : ""}<span class="chev">›</span></summary>
    <div class="acc-body">${inner}</div></details>`;
}
function wireSections(root) {
  root.querySelectorAll("details.acc").forEach(d => d.addEventListener("toggle", () => {
    d.open ? openSections.add(d.dataset.sec) : openSections.delete(d.dataset.sec);
  }));
}

function renderPanel() {
  const body = document.getElementById("panelBody"), ind = byId(indicatorId);
  const onCountry = selected && tab === "pais";
  document.getElementById("pTitle").textContent = onCountry ? DATA.countries[selected].name : "Explorador";
  document.getElementById("pSub").textContent = onCountry ? DATA.countries[selected].region : `${ind.name} · ${year}`;
  document.getElementById("actionBar").innerHTML =
    `<button class="btn full" id="openCharts" type="button">Gráficas · ${CHARTS.find(c => c.id === chartType).name} ▸</button>`;
  document.getElementById("openCharts").addEventListener("click", () => setDrawer(!drawerOpen));
  if (tab === "config") renderConfig(body, ind);
  else if (tab === "pais") renderPais(body, ind);
  else renderDescargas(body, ind);
}

function renderConfig(body, ind) {
  const groups = [...new Set(DATA.indicators.map(i => i.theme))];
  const q = indQuery.toLowerCase();
  const [ya, yb] = DATA.years[indicatorId];
  const nFilters = regionFilter.size + (minPct > 0 ? 1 : 0);

  body.innerHTML =
    section("indicador", "Indicador", ind.name, `
      <input class="txt full" id="indSearch" type="text" placeholder="Filtrar indicadores…" value="${esc(indQuery)}">
      <div class="ind-list">${groups.map(t => {
        const items = DATA.indicators.filter(i => i.theme === t && i.name.toLowerCase().includes(q));
        return items.length ? `<h4>${THEMES[t] || t}</h4>` + items.map(i =>
          `<button type="button" data-ind="${i.id}" aria-current="${i.id === indicatorId}">${esc(i.name)}</button>`).join("") : "";
      }).join("")}</div>`) +
    section("periodo", "Periodo", `${yearFrom}–${yearTo}`, `
      <div class="duo">
        <label>Desde</label><input class="txt" id="yFrom" type="number" min="${ya}" max="${yb}" value="${yearFrom}" style="width:84px">
        <label>Hasta</label><input class="txt" id="yTo" type="number" min="${ya}" max="${yb}" value="${yearTo}" style="width:84px">
      </div>
      <p class="note">Disponible de ${ya} a ${yb}. Series anuales: no existe detalle mensual.</p>`) +
    section("filtros", "Filtros", nFilters ? `${nFilters} activo${nFilters > 1 ? "s" : ""}` : "ninguno", `
      <div class="chips">${REGIONS.map(r => `<button class="chip" type="button" data-region="${esc(r)}" aria-pressed="${regionFilter.has(r)}">${esc(r)}</button>`).join("")}</div>
      <div class="range" style="margin-top:10px">
        <input id="minRange" type="range" min="0" max="90" step="10" value="${minPct}" aria-label="Recorte">
        <output>${minPct === 0 ? "todos" : "mejor " + (100 - minPct) + "%"}</output>
      </div>`) +
    section("aspecto", "Aspecto del globo", paletteName, `
      <div class="pals">${Object.keys(PALETTES).map(n => {
        const cols = rampFor(n);
        return `<button class="pal" type="button" data-pal="${n}" aria-pressed="${n === paletteName}" title="${n}">${[1,3,5].map(i => `<i style="background:${cols[i]}"></i>`).join("")}</button>`;
      }).join("")}</div>
      <p class="note">Los tonos se adaptan al tema: claros sobre fondo oscuro, profundos sobre fondo claro.</p>`) +
    section("ranking", "Clasificación", String(year), `
      <div class="rows">${rankedNow().slice(0, 10).map(([name, v, code], i) =>
        `<button type="button" data-go="${code}"><span class="pos">${i + 1}</span>${esc(name)}<span class="val">${fmt(v, ind.decimals)}</span></button>`).join("")}</div>`);

  wireSections(body);
  const s = document.getElementById("indSearch");
  s.addEventListener("input", () => {
    indQuery = s.value; renderConfig(body, byId(indicatorId));
    const n = document.getElementById("indSearch"); n.focus(); n.setSelectionRange(n.value.length, n.value.length);
  });
  body.querySelectorAll("[data-ind]").forEach(b => b.addEventListener("click", () => setIndicator(b.dataset.ind)));
  body.querySelectorAll("[data-pal]").forEach(b => b.addEventListener("click", () => {
    paletteName = b.dataset.pal; rebuildScale(); renderPanel(); if (drawerOpen) renderDrawer(); draw(); }));
  body.querySelectorAll("[data-region]").forEach(b => b.addEventListener("click", () => {
    const r = b.dataset.region; regionFilter.has(r) ? regionFilter.delete(r) : regionFilter.add(r);
    renderPanel(); if (drawerOpen) renderDrawer(); draw(); }));
  document.getElementById("minRange").addEventListener("input", e => {
    minPct = +e.target.value; renderPanel(); if (drawerOpen) renderDrawer(); draw(); });
  body.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => goTo(b.dataset.go)));
  const f = document.getElementById("yFrom"), t = document.getElementById("yTo");
  const upd = () => { yearFrom = Math.min(+f.value, +t.value); yearTo = Math.max(+f.value, +t.value);
    renderPanel(); if (drawerOpen) renderDrawer(); };
  f.addEventListener("change", upd); t.addEventListener("change", upd);
}

let allLoaded = false;
function renderPais(body, ind) {
  if (!selected) { body.innerHTML = `<p class="empty">Haz clic en un país del globo, o búscalo arriba a la izquierda.</p>`; return; }
  if (!allLoaded) {
    ensureAll().then(() => { allLoaded = true; if (tab === "pais") renderPanel(); });
  }
  const c = DATA.countries[selected];
  const rows = rankedNow(), pos = rows.findIndex(r => r[2] === selected) + 1;
  const groups = [...new Set(DATA.indicators.map(i => i.theme))];
  const v = valueAt(selected, indicatorId, year);
  body.innerHTML = `
    <div class="hero"><b>${fmt(v, ind.decimals)}</b><span>${esc(ind.unit)}</span></div>
    <p class="hero-note">${esc(ind.name)} · ${year} ${pos ? `· <span class="badge">${pos} de ${rows.length}</span>` : ""}</p>
    <div id="miniChart"></div>
    <div class="btns" style="margin:9px 0 14px">
      <button class="btn" id="pinBtn" type="button">${pinned.includes(selected) ? "Quitar de gráficas" : "Añadir a gráficas"}</button>
    </div>
    ${groups.map(t => section("m-" + t, THEMES[t] || t, "",
      `<table class="metrics"><tbody>${DATA.indicators.filter(i => i.theme === t).map(i =>
        `<tr class="${i.id === indicatorId ? "on" : ""}" data-ind="${i.id}"><th>${esc(i.name)}</th><td>${fmt(valueAt(selected, i.id, Math.min(year, DATA.years[i.id][1])), i.decimals)}</td></tr>`).join("")}</tbody></table>`)).join("")}`;
  const pts = seriesOf(selected, indicatorId, yearFrom, yearTo);
  if (pts.length) {
    const w = 332, h = 118, m = { t: 8, r: 8, b: 18, l: 44 };
    const x = d3.scaleLinear().domain([yearFrom, yearTo]).range([m.l, w - m.r]);
    const y = d3.scaleLinear().domain(d3.extent(pts, p => p[1])).nice(4).range([h - m.b, m.t]);
    const a = AX(), dec = Math.min(ind.decimals, 1);
    document.getElementById("miniChart").innerHTML =
      `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block">
        ${y.ticks(4).map(t => `<line x1="${m.l}" x2="${w - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="${a.grid}"/><text x="${m.l - 6}" y="${y(t) + 3}" text-anchor="end" font-size="10" fill="${a.ink}" font-family="IBM Plex Mono,monospace">${fmt(t, dec)}</text>`).join("")}
        ${x.ticks(4).map(t => `<text x="${x(t)}" y="${h - 5}" text-anchor="middle" font-size="10" fill="${a.ink}" font-family="IBM Plex Mono,monospace">${t}</text>`).join("")}
        <path d="${d3.line().x(p => x(p[0])).y(p => y(p[1]))(pts)}" fill="none" stroke="${css("--accent")}" stroke-width="2"/>
        <circle cx="${x(pts.at(-1)[0])}" cy="${y(pts.at(-1)[1])}" r="3.4" fill="${css("--accent")}"/>
      </svg>`;
  }
  wireSections(body);
  document.getElementById("pinBtn").addEventListener("click", togglePin);
  body.querySelectorAll("tr[data-ind]").forEach(tr => tr.addEventListener("click", () => setIndicator(tr.dataset.ind)));
}

function renderDescargas(body, ind) {
  const sel = chartCountries();
  body.innerHTML =
    section("d-que", "Qué descargar", downloadScope, `
      <div class="chips">
        <button class="chip" data-scope="indicador" aria-pressed="${downloadScope === "indicador"}">Indicador actual</button>
        <button class="chip" data-scope="seleccion" aria-pressed="${downloadScope === "seleccion"}">Países seleccionados</button>
        <button class="chip" data-scope="todos" aria-pressed="${downloadScope === "todos"}">Los 20 indicadores</button>
      </div>
      <p class="note">${downloadScope === "seleccion"
        ? (sel.length ? "Países: " + sel.map(c => esc(DATA.countries[c].name)).join(", ") : "No has seleccionado ningún país todavía.")
        : "Se aplican los filtros que tengas puestos."}</p>`) +
    section("d-fmt", "Formato", downloadFormat.toUpperCase(), `
      <div class="chips">${["csv","json","txt"].map(f =>
        `<button class="chip" data-fmt="${f}" aria-pressed="${downloadFormat === f}">${f.toUpperCase()}</button>`).join("")}</div>
      <p class="note">Columnas: país, ISO3, región, indicador, código, año, valor y unidad.</p>`) +
    `<div style="padding-top:14px">
      <p class="note" style="margin:0 0 9px">Periodo ${yearFrom}–${yearTo} · se cambia en Configuración</p>
      <button class="btn full" id="dl" type="button">Descargar datos</button>
      <p class="note" id="dlNote">La atribución al Banco Mundial viaja dentro del fichero: la licencia CC BY 4.0 la exige.</p>
    </div>`;
  wireSections(body);
  body.querySelectorAll("[data-scope]").forEach(b => b.addEventListener("click", async () => {
    downloadScope = b.dataset.scope;
    if (downloadScope === "todos") await ensureAll();
    renderPanel();
  }));
  body.querySelectorAll("[data-fmt]").forEach(b => b.addEventListener("click", () => { downloadFormat = b.dataset.fmt; renderPanel(); }));
  document.getElementById("dl").addEventListener("click", () => {
    const n = exportData();
    document.getElementById("dlNote").textContent = `${n.toLocaleString("es-ES")} filas exportadas.`;
  });
}

/* Qué significa cada eje en cada gráfica. Lo que es un selector de indicador
   se puede cambiar; lo que viene impuesto por la forma de la gráfica, no. */
const AXES = {
  lineas:       { x: { fixed: "Año" },     y: { pick: "A" } },
  barras:       { x: { pick: "A" },        y: { fixed: "Países, ordenados" } },
  dispersion:   { x: { pick: "A" },        y: { pick: "B" } },
  calor:        { x: { fixed: "Año" },     y: { fixed: "Países" }, color: { pick: "A" } },
  distribucion: { x: { pick: "A" },        y: { fixed: "Número de países" } },
};
function axisControl(label, spec) {
  if (spec.fixed) return `<div><p class="note" style="margin:0 0 4px">${label}</p>
    <div class="txt full" style="color:var(--ink-3);cursor:default">${spec.fixed}</div></div>`;
  const current = spec.pick === "A" ? metricA : metricB;
  return `<div><p class="note" style="margin:0 0 4px">${label}</p>
    <select class="txt full" data-axis="${spec.pick}">${DATA.indicators.map(i =>
      `<option value="${i.id}" ${i.id === current ? "selected" : ""}>${esc(i.name)}</option>`).join("")}</select></div>`;
}

function renderDrawer() {
  const body = document.getElementById("drawerBody"), ind = byId(metricA);
  const q = chartQuery.toLowerCase();
  const list = CHARTS.filter(c => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
  const svg = buildChart(640, 400);
  const sel = chartCountries();
  const ax = AXES[chartType];
  body.innerHTML = `
    <input class="txt full" id="chSearch" type="text" placeholder="Buscar gráfica…" value="${esc(chartQuery)}" style="margin-bottom:9px">
    <div class="gal">${list.map(c => `<button type="button" data-ch="${c.id}" aria-pressed="${c.id === chartType}">
      <svg viewBox="0 0 40 34">${c.icon.replaceAll("CC", c.id === chartType ? css("--accent") : css("--ink-3"))}</svg>
      <b>${c.name}</b><small>${c.desc}</small></button>`).join("")}</div>
    <div style="display:grid;gap:9px;margin-top:12px">
      ${axisControl("Eje horizontal", ax.x)}
      ${axisControl("Eje vertical", ax.y)}
      ${ax.color ? axisControl("Color", ax.color) : ""}
    </div>
    <div class="preview" style="margin-top:12px">
      <h4>${esc(ind.name)}</h4>
      <p>${chartType === "lineas" || chartType === "calor" ? `${yearFrom}–${yearTo}` : year} · ${esc(ind.unit)}${
        sel.length ? " · " + sel.map(c => esc(DATA.countries[c].name)).join(", ") : ""}</p>
      <div id="chartHolder">${svg || `<p class="empty">Sin datos para esta configuración. Selecciona un país o amplía el rango de años.</p>`}</div>
      <div class="btns" style="margin-top:10px">
        <button class="btn" id="dlPng" type="button">PNG</button>
        <button class="btn plain" id="dlHtml" type="button">HTML</button>
        <button class="btn plain" id="dlCsv" type="button">CSV</button>
      </div>
      <p class="note">En el visor de claude.ai las descargas están bloqueadas. Abre el fichero local para probarlas.</p>
    </div>`;
  body.querySelector("#chartHolder svg")?.setAttribute("style", "width:100%;height:auto;display:block");
  const s = document.getElementById("chSearch");
  s.addEventListener("input", () => {
    chartQuery = s.value; renderDrawer();
    const n = document.getElementById("chSearch"); n.focus(); n.setSelectionRange(n.value.length, n.value.length);
  });
  body.querySelectorAll("[data-ch]").forEach(b => b.addEventListener("click", () => { chartType = b.dataset.ch; renderDrawer(); renderPanel(); }));
  body.querySelectorAll("[data-axis]").forEach(s2 => s2.addEventListener("change", async e => {
    const id = e.target.value;
    await ensureSeries(id);
    if (e.target.dataset.axis === "A") metricA = id; else metricB = id;
    renderDrawer();
  }));
  document.getElementById("dlPng").addEventListener("click", exportPNG);
  document.getElementById("dlHtml").addEventListener("click", exportHTML);
  document.getElementById("dlCsv").addEventListener("click", () => { downloadFormat = "csv"; exportData(); });
}

/* -------------------------------------------------------------- popover --- */
document.getElementById("infoBtn").addEventListener("click", e => {
  document.querySelector(".pop")?.remove();
  const ind = byId(indicatorId), [a, b] = DATA.years[indicatorId];
  const el = document.createElement("div");
  el.className = "pop";
  el.innerHTML = `<button class="x" type="button" aria-label="Cerrar">×</button>
    <h4>${esc(ind.name)}</h4><p>${esc(ind.description)}</p>
    <dl><dt>Unidad</dt><dd>${esc(ind.unit)}</dd><dt>Periodo</dt><dd>${a}–${b}</dd>
    <dt>Código</dt><dd>${esc(ind.code)}</dd><dt>Origen</dt><dd>${esc(ind.upstream)}</dd>
    <dt>Licencia</dt><dd>CC BY 4.0</dd></dl>`;
  document.getElementById("stage").appendChild(el);
  const r = e.currentTarget.getBoundingClientRect(), sr = document.getElementById("stage").getBoundingClientRect();
  el.style.left = Math.max(12, r.left - sr.left - 10) + "px";
  el.style.bottom = (sr.bottom - r.top + 10) + "px";
  el.querySelector(".x").addEventListener("click", () => el.remove());
});

/* ------------------------------------------------------------------ ui --- */
function setLogo(i) {
  logoIndex = i;
  document.getElementById("logoSlot").innerHTML = LOGOS[i](css("--accent"));
  document.querySelectorAll("#logoPick button")
    .forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.logo === i)));
}
document.querySelectorAll("#logoPick button").forEach(b => b.addEventListener("click", () => setLogo(+b.dataset.logo)));
document.querySelectorAll(".panel .tabs button").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
document.getElementById("handle").addEventListener("click", () => setPanel(!panelOpen));
document.getElementById("drawerX").addEventListener("click", () => setDrawer(false));
document.getElementById("spinBtn").addEventListener("click", e => {
  spinning = !spinning; e.currentTarget.textContent = spinning ? "❚❚" : "▶"; });
document.getElementById("zoomIn").addEventListener("click", () => { scaleFactor = Math.min(2.6, scaleFactor * 1.2); draw(); });
document.getElementById("zoomOut").addEventListener("click", () => { scaleFactor = Math.max(.28, scaleFactor / 1.2); draw(); });
document.getElementById("themeBtn").addEventListener("click", () => {
  document.documentElement.setAttribute("data-theme", isLight() ? "dark" : "light");
  setLogo(logoIndex); rebuildScale(); renderPanel(); if (drawerOpen) renderDrawer(); draw(); });

const hudFoldBtn = document.getElementById("hudFold");
hudFoldBtn.addEventListener("click", () => {
  hudFolded = !hudFolded;
  document.getElementById("hud").classList.toggle("folded", hudFolded);
  document.getElementById("yrInline").hidden = !hudFolded;
  hudFoldBtn.textContent = hudFolded ? "▸" : "▾";
  hudFoldBtn.setAttribute("aria-expanded", String(!hudFolded));
});

document.getElementById("yearRange").addEventListener("input", e => {
  year = +e.target.value;
  document.getElementById("yearOut").textContent = year;
  rebuildScale(); renderPanel(); if (drawerOpen) renderDrawer(); draw();
});

const playBtn = document.getElementById("playBtn");
playBtn.addEventListener("click", () => {
  playing = !playing;
  playBtn.textContent = playing ? "❚❚" : "▶";
  clearInterval(playTimer);
  if (!playing) return;
  const [a, b] = DATA.years[indicatorId];
  if (year >= b) year = a;
  playTimer = setInterval(() => {
    year++;
    if (year >= b) { year = b; playing = false; playBtn.textContent = "▶"; clearInterval(playTimer); }
    syncYearUI(); rebuildScale(); renderPanel(); if (drawerOpen) renderDrawer(); draw();
  }, 260);
});

const search = document.getElementById("search"), results = document.getElementById("results");
search.addEventListener("input", () => {
  const q = search.value.trim().toLowerCase();
  if (q.length < 2) { results.hidden = true; return; }
  const hits = Object.entries(DATA.countries).filter(([, c]) => c.name.toLowerCase().includes(q)).slice(0, 12);
  results.innerHTML = hits.length
    ? hits.map(([code, c]) => `<button type="button" data-go="${code}">${esc(c.name)}<small>${code}</small></button>`).join("")
    : `<button type="button" disabled>Sin resultados</button>`;
  results.hidden = false;
  results.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => {
    goTo(b.dataset.go); results.hidden = true; search.value = ""; }));
});
document.addEventListener("click", e => { if (!e.target.closest(".search")) results.hidden = true; });
window.addEventListener("resize", () => resize());

const [ya0, yb0] = DATA.years[indicatorId];
year = yb0; yearFrom = ya0; yearTo = yb0;
setLogo(0);
setPanel(true);
syncYearUI();
rebuildScale();
renderPins();
renderPanel();
resize();

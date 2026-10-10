"use strict";
/* =====================================================================
   Utilidades compartidas
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wait = ms => new Promise(r => setTimeout(r, ms));
const NS = "http://www.w3.org/2000/svg";
const SUB = ["₀", "₁", "₂", "₃"];
const STILL = new URLSearchParams(location.search).has("still");   // revisión: sin animaciones de entrada
// modo de ensayo: atajos para practicar (saltos, desbloqueos); su progreso se guarda aparte
const REHEARSAL = new URLSearchParams(location.search).has("ensayo");
const mq = matchMedia("(prefers-reduced-motion: reduce)");
let reduced = mq.matches || STILL;
mq.addEventListener?.("change", e => { reduced = e.matches || STILL; });

/* crea un elemento SVG */
function mk(tag, attrs = {}, parent, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  if (parent) parent.append(e);
  return e;
}
/* crea un elemento HTML desde texto */
function html(str) {
  const t = document.createElement("template");
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
}

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

/* curvas */
const ease = {
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 4),
  in: t => t * t * t
};

/* animación simple basada en requestAnimationFrame */
function tween(ms, fn, curve = ease.inOut) {
  return new Promise(res => {
    if (ms <= 0 || reduced) { fn(1); res(); return; }
    const t0 = performance.now();
    const step = now => {
      const p = clamp((now - t0) / ms, 0, 1);
      fn(curve(p));
      if (p < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}

/* vuelo de cámara óptimo (van Wijk y Nuij, igual que d3.interpolateZoom):
   se aleja, se desplaza y se acerca, en vez de cruzar en línea recta */
function interpolateZoom(p0, p1) {
  const rho = Math.SQRT2, rho2 = 2, rho4 = 4, eps = 1e-12;
  const [ux0, uy0, w0] = p0, [ux1, uy1, w1] = p1;
  const dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy;
  let i, S;
  if (d2 < eps) {
    S = Math.log(w1 / w0) / rho;
    i = t => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S)];
  } else {
    const d1 = Math.sqrt(d2);
    const b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1);
    const b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
    const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
    const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    S = (r1 - r0) / rho;
    i = t => {
      const s = t * S, c0 = Math.cosh(r0);
      const u = w0 / (rho2 * d1) * (c0 * Math.tanh(rho * s + r0) - Math.sinh(r0));
      return [ux0 + u * dx, uy0 + u * dy, w0 * c0 / Math.cosh(rho * s + r0)];
    };
  }
  i.duration = Math.abs(S) * 1000;
  return i;
}

/* geometría de cristales */
function hexPts(cx, cy, r, rot = Math.PI / 6) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = rot + i * Math.PI / 3;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
}
function flakePath(cx, cy, r) {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 - Math.PI / 2;
    const P = t => [cx + Math.cos(a) * r * t, cy + Math.sin(a) * r * t];
    const [x1, y1] = P(1), [mx, my] = P(.55), k = r * .28;
    d += `M${cx} ${cy}L${x1.toFixed(1)} ${y1.toFixed(1)}`;
    d += `M${mx.toFixed(1)} ${my.toFixed(1)}l${(Math.cos(a - .9) * k).toFixed(1)} ${(Math.sin(a - .9) * k).toFixed(1)}`;
    d += `M${mx.toFixed(1)} ${my.toFixed(1)}l${(Math.cos(a + .9) * k).toFixed(1)} ${(Math.sin(a + .9) * k).toFixed(1)}`;
  }
  return d;
}
function starPath(cx, cy, rx, ry, w = .16) {
  return `M${cx} ${cy - ry}L${cx + rx * w} ${cy - ry * w}L${cx + rx} ${cy}L${cx + rx * w} ${cy + ry * w}L${cx} ${cy + ry}L${cx - rx * w} ${cy + ry * w}L${cx - rx} ${cy}L${cx - rx * w} ${cy - ry * w}Z`;
}

/* =====================================================================
   El mapa del lienzo (unidad: 1 pantalla = 1920 × 1080)
   Espejo izquierda / derecha:
   ← escenario único ← MUX ← entradas I0..I3 (orbes del HUB)   |   botón DEMUX → DEMUX → cuatro destinos →
   ===================================================================== */
const FW = 1920, FH = 1080;
const MEMBERS = [
  { name: "Ana", theme: "marceline", topic: "Fundamentos", c: "#E0344A" },
  { name: "Ameth", theme: "tsaritsa", topic: "Funcionamiento lógico", c: "#9FD4FF" },
  { name: "Jonathan", theme: "venom", topic: "Diseño y expansión", c: "#9A6BFF" },
  { name: "Carlos", theme: "dio", topic: "Aplicaciones", c: "#F2C14E" }
];
const ROW_Y = [-1980, -660, 660, 1980];                 // filas de los cuatro destinos del DEMUX
const MUX_STAGE = [-6144, 0];                            // el escenario único de salida del MUX
// posición de la estación k de un integrante en cada lado
const stationPos = (side, m, k) => side === "mux"
  ? [MUX_STAGE[0] - k * 2240, MUX_STAGE[1]]
  : [6144 + k * 2240, ROW_Y[m]];
const MB = { x0: -3100, x1: -3780, inH: 400, outH: 140 };  // bloque MUX: entradas a la derecha (x0), salida a la izquierda (x1)
const MB_IN = [-300, -100, 100, 300];
const DB = { x0: 3100, x1: 3780, inH: 140, outH: 400 };  // bloque DEMUX en el mundo
const DB_OUT = [-300, -100, 100, 300];

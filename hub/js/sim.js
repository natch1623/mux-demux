"use strict";
/* =====================================================================
   Motor lógico compartido: un solo MUX 4:1 / DEMUX 1:4 correcto,
   con dibujos interactivos que cada mundo viste con su propia estética.
   Convención de Enable: EN activo en alto. EN = 1 habilita; con EN = 0
   el MUX entrega Y = 0 y el DEMUX deja todas sus salidas en 0.
   ===================================================================== */
function Logic(init = {}) {
  const st = Object.assign({ s1: 0, s0: 0, d: [1, 0, 1, 1], din: 1, en: 1 }, init);
  const subs = new Set();
  const api = {
    st,
    get sel() { return st.s1 * 2 + st.s0; },
    get mux() { return st.en ? st.d[api.sel] : 0; },
    demux(i) { return st.en && i === api.sel ? st.din : 0; },
    set(p) { Object.assign(st, p); subs.forEach(f => f(api)); },
    toggle(k, i) {
      if (k === "d") { const d = st.d.slice(); d[i] ^= 1; api.set({ d }); }
      else api.set({ [k]: st[k] ^ 1 });
    },
    on(f) { subs.add(f); f(api); }
  };
  return api;
}

/* toque o tecla sobre un elemento (pantalla táctil primero) */
function tap(el, fn) {
  el.setAttribute("tabindex", "0");
  el.setAttribute("role", "button");
  el.addEventListener("click", e => { e.stopPropagation(); fn(e); });
  el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); fn(e); } });
}

/* cristal con un bit adentro */
function crystal(parent, x, y, r, label, cls = "") {
  const g = mk("g", { class: "cr " + cls }, parent);
  // la forma depende del mundo: cristal, parlante, célula o esfera de reloj
  const sh = DRESS.bitShape(DRESS.themeOf(parent), x, y, r, (x + y) % 7);
  mk("path", { class: "cr-halo", d: sh.halo }, g);
  mk("path", { class: "cr-body", d: sh.body }, g);
  mk("path", { class: "cr-facet", d: sh.facet }, g);
  const bit = mk("text", { class: "cr-bit", x, y: y + r * .3 }, g, "0");
  if (label) mk("text", { class: "cr-lbl", x, y: y - r - 16 }, g, label);
  return { g, set(v) { bit.textContent = v; g.classList.toggle("one", !!v); } };
}

/* llave de selección S1 / S0 */
function selKey(parent, x, y, name) {
  const g = mk("g", { class: "key" }, parent);
  mk("rect", { class: "key-body", x: x - 58, y: y - 30, width: 116, height: 60, rx: 30 }, g);
  const t = mk("text", { class: "key-t", x, y: y + 9 }, g, `${name} = 0`);
  return { g, set(v) { t.textContent = `${name} = ${v}`; g.classList.toggle("one", !!v); } };
}

const bind = (list, el, fn) => list.push([el, fn]);
const paint = (list, L) => list.forEach(([el, fn]) => el.classList.toggle("v1", !!fn(L)));

/* ---------- símbolo MUX 4:1 interactivo ---------- */
function muxSymbol(svg, L, opts = {}) {
  const names = opts.names || ["S₁", "S₀"];
  const ys = [110, 230, 350, 470], binds = [];
  const gW = mk("g", {}, svg), gR = mk("g", {}, svg), gT = mk("g", {}, svg);
  const ins = ys.map((y, i) => {
    const w = mk("path", { class: "w", d: `M150 ${y}H420` }, gW);
    bind(binds, w, L => L.st.d[i]);
    const c = crystal(gT, 110, y, 36, `D${SUB[i]}`);
    tap(c.g, () => L.toggle("d", i));
    return c;
  });
  mk("polygon", { class: "blk", points: "420,60 620,140 620,440 420,520" }, gT);
  mk("text", { class: "blk-t", x: 520, y: 166 }, gT, "MUX 4:1");
  const routes = ys.map(y => mk("path", { class: "route", d: `M420 ${y}L620 290` }, gR));
  const out = mk("path", { class: "w", d: "M620 290H812" }, gW);
  bind(binds, out, L => L.mux);
  const Y = crystal(gT, 870, 290, 52, "Y", "big");
  const keys = [["s1", 452, 507, names[0]], ["s0", 588, 453, names[1]]].map(([k, x, y0, n]) => {
    const w = mk("path", { class: "w sel", d: `M${x} ${y0}V556` }, gW);
    bind(binds, w, L => L.st[k]);
    const key = selKey(gT, x, 588, n);
    tap(key.g, () => L.toggle(k));
    return [k, key];
  });
  if (opts.en) enPin(gW, gT, binds, L, 560, 116);
  L.on(L => {
    ins.forEach((c, i) => c.set(L.st.d[i]));
    routes.forEach((r, i) => r.classList.toggle("on", !!L.st.en && i === L.sel));
    svg.classList.toggle("disabled", !L.st.en);
    keys.forEach(([k, key]) => key.set(L.st[k]));
    Y.set(L.mux);
    paint(binds, L);
  });
  // la señal de la entrada elegida cruza el bloque y enciende Y
  DRESS.revealOn(svg, L, L => L.st.en ? `M150 ${ys[L.sel]}H420L620 290H818` : null, () => Y.g);
}

/* ---------- símbolo DEMUX 1:4 interactivo ---------- */
function demuxSymbol(svg, L, opts = {}) {
  const ys = [130, 240, 350, 460], binds = [];
  const gW = mk("g", {}, svg), gR = mk("g", {}, svg), gT = mk("g", {}, svg);
  const inW = mk("path", { class: "w", d: "M168 290H380" }, gW);
  bind(binds, inW, L => L.st.din);
  const D = crystal(gT, 110, 290, 52, "D", "big");
  tap(D.g, () => L.toggle("din"));
  mk("polygon", { class: "blk", points: "380,210 580,80 580,500 380,370" }, gT);
  // el rótulo va sobre el borde corto (izquierdo): dentro del bloque lo cruzaban el borde inclinado y las rutas
  mk("text", { class: "blk-t", x: 400, y: 128 }, gT, "DEMUX 1:4");
  const routes = ys.map(y => mk("path", { class: "route", d: `M380 290L580 ${y}` }, gR));
  const outs = ys.map((y, i) => {
    const w = mk("path", { class: "w", d: `M580 ${y}H832` }, gW);
    bind(binds, w, L => L.demux(i));
    // las salidas están muy juntas: la etiqueta va a la derecha del cristal, no encima
    mk("text", { class: "lbl", x: 922, y: y + 10, style: "text-anchor:start;font-size:28px" }, gT, `Y${SUB[i]}`);
    return crystal(gT, 870, y, 36, null);
  });
  const keys = [["s1", 412, 391, "S₁"], ["s0", 548, 479, "S₀"]].map(([k, x, y0, n]) => {
    const w = mk("path", { class: "w sel", d: `M${x} ${y0}V556` }, gW);
    bind(binds, w, L => L.st[k]);
    const key = selKey(gT, x, 588, n);
    tap(key.g, () => L.toggle(k));
    return [k, key];
  });
  if (opts.en) enPin(gW, gT, binds, L, 500, 132);
  L.on(L => {
    D.set(L.st.din);
    routes.forEach((r, i) => r.classList.toggle("on", !!L.st.en && i === L.sel));
    svg.classList.toggle("disabled", !L.st.en);
    outs.forEach((c, i) => c.set(L.demux(i)));
    keys.forEach(([k, key]) => key.set(L.st[k]));
    paint(binds, L);
  });
  DRESS.revealOn(svg, L, L => L.st.en ? `M162 290H380L580 ${ys[L.sel]}H834` : null, L => outs[L.sel].g);
}

/* pin de habilitación EN (llave arriba del bloque) */
function enPin(gW, gT, binds, L, x, yEdge) {
  const w = mk("path", { class: "w sel", d: `M${x} 54V${yEdge}` }, gW);
  bind(binds, w, L => L.st.en);
  const key = selKey(gT, x, 24, "EN");
  key.g.classList.add("en");
  tap(key.g, () => L.toggle("en"));
  L.on(L => key.set(L.st.en));
}

/* ---------- rieles de selección con sus NOT (comunes a ambos circuitos) ---------- */
function selRails(g, gT, binds, L) {
  const rails = { s1: 200, ns1: 250, s0: 330, ns0: 380 };
  [["s1", 200, 250, "S₁"], ["s0", 330, 380, "S₀"]].forEach(([k, x, nx, n]) => {
    const r = mk("path", { class: "w", d: `M${x} 50V612` }, g);
    bind(binds, r, L => L.st[k]);
    const br = mk("path", { class: "w", d: `M${x} 64H${nx}V74` }, g);
    bind(binds, br, L => L.st[k]);
    mk("polygon", { class: "gate", points: `${nx - 15},74 ${nx + 15},74 ${nx},102` }, gT);
    mk("circle", { class: "gate", cx: nx, cy: 108, r: 6 }, gT);
    const nr = mk("path", { class: "w", d: `M${nx} 114V612` }, g);
    bind(binds, nr, L => 1 - L.st[k]);
    mk("text", { class: "rail-t", x: nx + 14, y: 140, "text-anchor": "start" }, gT).innerHTML = `<tspan class="ov">${n}</tspan>`;
    const key = selKey(gT, x, 24, n);
    key.g.classList.add("sm");
    tap(key.g, () => L.toggle(k));
    L.on(L => key.set(L.st[k]));
  });
  return rails;
}
const andPath = (x, cy) => `M${x} ${cy - 46}H${x + 44}A46 46 0 0 1 ${x + 44} ${cy + 46}H${x}Z`;
const dot = (g, x, y) => mk("circle", { class: "dot", cx: x, cy: y, r: 6 }, g);

/* ---------- MUX 4:1 con NOT, AND y OR ---------- */
function muxGates(svg, L) {
  const binds = [], rows = [175, 295, 415, 535];
  const gB = mk("g", {}, svg), gW = mk("g", {}, svg), gT = mk("g", {}, svg);
  const R = selRails(gW, gT, binds, L);
  const bands = [], ands = [];
  rows.forEach((cy, i) => {
    bands.push(mk("rect", { class: "band", x: 560, y: cy - 62, width: 170, height: 124, rx: 18 }, gB));
    const a = (i >> 1) ? "s1" : "ns1", b = (i & 1) ? "s0" : "ns0";
    const va = L => (i >> 1) ? L.st.s1 : 1 - L.st.s1, vb = L => (i & 1) ? L.st.s0 : 1 - L.st.s0;
    const w1 = mk("path", { class: "w", d: `M${R[a]} ${cy - 28}H600` }, gW); bind(binds, w1, va); dot(gT, R[a], cy - 28);
    const w2 = mk("path", { class: "w", d: `M${R[b]} ${cy}H600` }, gW); bind(binds, w2, vb); dot(gT, R[b], cy);
    const w3 = mk("path", { class: "w", d: `M84 ${cy + 28}H600` }, gW); bind(binds, w3, L => L.st.d[i]);
    const c = crystal(gT, 56, cy + 28, 22, null, "sm");
    mk("text", { class: "rail-t", x: 56, y: cy - 6 }, gT, `D${SUB[i]}`);
    tap(c.g, () => L.toggle("d", i));
    L.on(L => c.set(L.st.d[i]));
    const g = mk("path", { class: "gate", d: andPath(600, cy) }, gT);
    ands.push(g);
    const oy = 335 + (i - 1.5) * 26;
    const o = mk("path", { class: "w", d: `M690 ${cy}C748 ${cy} 742 ${oy} 802 ${oy}` }, gW);
    bind(binds, o, L => va(L) & vb(L) & L.st.d[i]);
  });
  mk("path", { class: "gate", d: "M792 262Q838 335 792 408Q890 408 952 335Q890 262 792 262Z" }, gT);
  mk("text", { class: "gate-t", x: 860, y: 343 }, gT, "OR");
  const out = mk("path", { class: "w", d: "M952 335H1040" }, gW); bind(binds, out, L => L.mux);
  const Y = crystal(gT, 1072, 335, 28, "Y", "sm");
  L.on(L => {
    bands.forEach((b, i) => b.classList.toggle("on", i === L.sel));
    ands.forEach((g, i) => g.classList.toggle("on", i === L.sel));
    Y.set(L.mux);
    paint(binds, L);
  });
  // dato → su AND → OR → Y
  DRESS.revealOn(svg, L, L => { const cy = rows[L.sel], oy = 335 + (L.sel - 1.5) * 26; return `M84 ${cy + 28}H620L690 ${cy}C748 ${cy} 742 ${oy} 802 ${oy}L952 335H1046`; }, () => Y.g, { ms: 900 });
}

/* ---------- DEMUX 1:4 con NOT y AND ---------- */
function demuxGates(svg, L) {
  const binds = [], rows = [175, 295, 415, 535];
  const gB = mk("g", {}, svg), gW = mk("g", {}, svg), gT = mk("g", {}, svg);
  const R = selRails(gW, gT, binds, L);
  const dr = mk("path", { class: "w", d: "M470 50V612" }, gW); bind(binds, dr, L => L.st.din);
  const Dk = selKey(gT, 470, 24, "D"); Dk.g.classList.add("sm");
  tap(Dk.g, () => L.toggle("din"));
  L.on(L => Dk.set(L.st.din));
  const bands = [], ands = [], outs = [];
  rows.forEach((cy, i) => {
    bands.push(mk("rect", { class: "band", x: 560, y: cy - 62, width: 170, height: 124, rx: 18 }, gB));
    const a = (i >> 1) ? "s1" : "ns1", b = (i & 1) ? "s0" : "ns0";
    const va = L => (i >> 1) ? L.st.s1 : 1 - L.st.s1, vb = L => (i & 1) ? L.st.s0 : 1 - L.st.s0;
    const w1 = mk("path", { class: "w", d: `M${R[a]} ${cy - 28}H600` }, gW); bind(binds, w1, va); dot(gT, R[a], cy - 28);
    const w2 = mk("path", { class: "w", d: `M${R[b]} ${cy}H600` }, gW); bind(binds, w2, vb); dot(gT, R[b], cy);
    const w3 = mk("path", { class: "w", d: `M470 ${cy + 28}H600` }, gW); bind(binds, w3, L => L.st.din); dot(gT, 470, cy + 28);
    ands.push(mk("path", { class: "gate", d: andPath(600, cy) }, gT));
    const o = mk("path", { class: "w", d: `M690 ${cy}H900` }, gW); bind(binds, o, L => L.demux(i));
    outs.push(crystal(gT, 940, cy, 26, null, "sm"));
    mk("text", { class: "rail-t", x: 1000, y: cy + 8 }, gT, `Y${SUB[i]}`);
  });
  L.on(L => {
    bands.forEach((b, i) => b.classList.toggle("on", i === L.sel));
    ands.forEach((g, i) => g.classList.toggle("on", i === L.sel));
    outs.forEach((c, i) => c.set(L.demux(i)));
    paint(binds, L);
  });
  // D baja por su riel, entra al AND elegido y sale por su Y
  DRESS.revealOn(svg, L, L => `M470 54V${rows[L.sel] + 28}H620L690 ${rows[L.sel]}H914`, L => outs[L.sel].g, { ms: 900 });
}

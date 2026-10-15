"use strict";
/* =====================================================================
   Materiales compartidos de las transiciones (dirección de arte de transiciones):
   - hielo con espesor (cara translúcida, canto, sombra, arista de luz, grieta interior),
     escarcha granular y ramificada (textura calculada una vez);
   - materia viscosa (lóbulos con volumen, reflejos estrechos que siguen la curvatura,
     membranas translúcidas y filamentos);
   - tinta de manga (contornos de grosor variable, tramas de puntos, rayado, papel marfil).
   Todo se dibuja en capas fijas a pantalla (px) y se anima con MUNDOS.anim, tween o un
   bucle que respeta MOTION.skip: «Omitir transición» y ?still dejan el estado final.
   ===================================================================== */
const MAT = (() => {
  const NS = "http://www.w3.org/2000/svg";
  let serie = 0;
  const uid = p => `${p}${++serie}`;
  // aleatorio determinista (cada transición pide su propia semilla)
  const rng = (s = 7) => { let x = (s * 2654435761) % 2147483647 || 1; return () => ((x = x * 16807 % 2147483647) / 2147483647); };
  const el = (tag, at = {}, padre) => { const e = document.createElementNS(NS, tag); for (const k in at) if (at[k] != null) e.setAttribute(k, at[k]); if (padre) padre.append(e); return e; };
  const f1 = v => v.toFixed(1);
  const pts = p => p.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
  const linea = p => "M" + p.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L");
  // curva cerrada suave por puntos (Catmull-Rom)
  function suave(p, cerrada = true) {
    const n = p.length; if (n < 3) return linea(p);
    let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
    const lim = cerrada ? n : n - 1;
    for (let i = 0; i < lim; i++) {
      const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      const a = cerrada || i > 0 ? p0 : p1, b = cerrada || i < n - 2 ? p3 : p2;
      d += `C${f1(p1[0] + (p2[0] - a[0]) / 6)} ${f1(p1[1] + (p2[1] - a[1]) / 6)} ${f1(p2[0] - (b[0] - p1[0]) / 6)} ${f1(p2[1] - (b[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + (cerrada ? "Z" : "");
  }
  /* lienzo SVG a pantalla completa en px, con su <defs> */
  function lienzo(capa, cls = "") {
    const W = innerWidth, H = innerHeight;
    const svg = el("svg", { class: `mt-svg ${cls}`, viewBox: `0 0 ${W} ${H}`, width: W, height: H, "aria-hidden": "true" }, capa);
    const defs = el("defs", {}, svg);
    return { svg, defs, W, H };
  }
  /* lienzo 2D a pantalla completa (partículas) */
  function lienzo2d(capa) {
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    const cv = document.createElement("canvas"); cv.className = "mt-cv";
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    capa.append(cv);
    const x = cv.getContext("2d"); x.scale(dpr, dpr);
    return { cv, x, W, H };
  }
  /* reloj de una transición: llama fn(t) con t de 0 a 1 durante ms; se completa al instante
     con «Omitir transición», ?still o movimiento reducido */
  const reloj = (ms, fn) => tween(ms, fn, t => t);
  const ease = {
    io: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
    out: t => 1 - (1 - t) ** 3,
    in: t => t * t * t,
    back: t => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2
  };
  const tramo = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

  /* ---------- texturas (calculadas una vez) ---------- */
  const tex = {};
  // escarcha: grano blanco con agujas ramificadas, opaca en el centro de cada cristal
  function texEscarcha() {
    if (tex.escarcha) return tex.escarcha;
    const S = 320, c = document.createElement("canvas"); c.width = c.height = S;
    const x = c.getContext("2d"), r = rng(31);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(234,246,255,${(.05 + r() * .25).toFixed(2)})`; const s = .6 + r() * 1.8; x.fillRect(r() * S, r() * S, s, s); }
    x.lineCap = "round";
    const rama = (px, py, a, l, w, d) => {
      if (d > 4 || l < 3) return;
      const qx = px + Math.cos(a) * l, qy = py + Math.sin(a) * l;
      x.strokeStyle = `rgba(242,251,255,${(.35 - d * .05).toFixed(2)})`; x.lineWidth = w;
      x.beginPath(); x.moveTo(px, py); x.lineTo(qx, qy); x.stroke();
      for (let k = 0; k < 3; k++) { const t = .3 + r() * .6, s = (r() < .5 ? -1 : 1) * (.6 + r() * .5); rama(px + (qx - px) * t, py + (qy - py) * t, a + s, l * (.35 + r() * .25), w * .6, d + 1); }
    };
    for (let i = 0; i < 26; i++) rama(r() * S, r() * S, r() * 6.283, 18 + r() * 40, 1.6, 0);
    return (tex.escarcha = c.toDataURL());
  }
  // papel marfil de manga con fibra y pequeñas irregularidades de impresión
  function texPapel() {
    if (tex.papel) return tex.papel;
    const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
    const x = c.getContext("2d"), r = rng(5);
    x.fillStyle = "#F3E9D2"; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(120,96,60,${(r() * .06).toFixed(3)})`; x.fillRect(r() * S, r() * S, 1 + r() * 2, 1); }
    for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(140,110,70,${(.04 + r() * .05).toFixed(3)})`; x.beginPath(); const a = r() * S, b = r() * S; x.moveTo(a, b); x.lineTo(a + (r() - .5) * 40, b + (r() - .5) * 8); x.stroke(); }
    return (tex.papel = c.toDataURL());
  }

  /* ---------- HIELO ---------- */
  // gradientes del material (una vez por lienzo)
  function defsHielo(defs) {
    const id = uid("hz");
    const g = (n, a, stops) => { const e = el("linearGradient", Object.assign({ id: `${id}-${n}` }, a), defs); stops.forEach(([o, c, op]) => el("stop", { offset: o, "stop-color": c, "stop-opacity": op ?? 1 }, e)); };
    g("cara", { x1: 0, y1: 0, x2: 1, y2: 1 }, [[0, "#EAF6FF", .78], [.35, "#A8D8F0", .55], [.7, "#2F6FA8", .62], [1, "#0D3B57", .78]]);
    g("canto", { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, "#6FA6C8", .95], [1, "#0A2236", .98]]);
    g("brillo", { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, "#FFFFFF", 0], [.5, "#FFFFFF", .9], [1, "#FFFFFF", 0]]);
    const p = el("pattern", { id: `${id}-esc`, width: 320, height: 320, patternUnits: "userSpaceOnUse" }, defs);
    el("image", { href: texEscarcha(), width: 320, height: 320 }, p);
    return { cara: `url(#${id}-cara)`, canto: `url(#${id}-canto)`, brillo: `url(#${id}-brillo)`, escarcha: `url(#${id}-esc)` };
  }
  /* esquirla de hielo con espesor: sombra proyectada, canto (espesor), cara translúcida,
     escarcha en la cara, grieta interior y arista de luz (su brillo cambia al girar) */
  function esquirla(padre, p, m, { grosor = 9, luz = -2.4, r = Math.random } = {}) {
    const cx = p.reduce((a, q) => a + q[0], 0) / p.length, cy = p.reduce((a, q) => a + q[1], 0) / p.length;
    const g = el("g", { class: "mt-esq", style: `transform-origin:${f1(cx)}px ${f1(cy)}px;transform-box:view-box` }, padre);
    el("polygon", { class: "mt-esq-sombra", points: pts(p.map(([x, y]) => [x + grosor * 1.6, y + grosor * 2.2])) }, g);
    el("polygon", { class: "mt-esq-canto", points: pts(p.map(([x, y]) => [x + grosor * .7, y + grosor])), fill: m.canto }, g);
    el("polygon", { class: "mt-esq-cara", points: pts(p), fill: m.cara }, g);
    el("polygon", { class: "mt-esq-esc", points: pts(p), fill: m.escarcha }, g);
    // grieta interior: de un vértice hacia el centro, quebrada
    const v = p[Math.floor(r() * p.length)];
    el("path", { class: "mt-esq-grieta", d: linea([v, [(v[0] + cx) / 2 + (r() - .5) * 18, (v[1] + cy) / 2 + (r() - .5) * 18], [cx + (r() - .5) * 10, cy + (r() - .5) * 10]]) }, g);
    // arista de luz: el lado más orientado a la luz (arriba a la izquierda)
    let mejor = 0, idx = 0;
    p.forEach((q, i) => { const n = p[(i + 1) % p.length], a = Math.atan2(n[1] - q[1], n[0] - q[0]); const s = Math.cos(a - luz); if (s > mejor) { mejor = s; idx = i; } });
    const arista = el("path", { class: "mt-esq-arista", d: linea([p[idx], p[(idx + 1) % p.length]]) }, g);
    g.arista = arista; g.c = [cx, cy];
    return g;
  }
  /* ramificación (escarcha o grieta): devuelve [d, segmentos] desde (x,y) en ángulo a */
  function ramas(r, x, y, a, l, prof = 3, abre = .7) {
    let d = "";
    const rec = (px, py, ang, len, k) => {
      const n = 3 + Math.floor(r() * 3); let qx = px, qy = py;
      d += `M${f1(px)} ${f1(py)}`;
      for (let i = 0; i < n; i++) { const an = ang + (r() - .5) * .5; qx += Math.cos(an) * len / n; qy += Math.sin(an) * len / n; d += `L${f1(qx)} ${f1(qy)}`; }
      if (k < prof) { const m = 1 + Math.floor(r() * 2); for (let j = 0; j < m; j++) { const t = .35 + r() * .5; rec(px + (qx - px) * t, py + (qy - py) * t, ang + (r() < .5 ? -1 : 1) * abre * (.6 + r() * .6), len * (.42 + r() * .2), k + 1); } }
    };
    rec(x, y, a, l, 0);
    return d;
  }

  /* ---------- MATERIA VISCOSA (Venom) ---------- */
  function defsViscosa(defs) {
    const id = uid("vs");
    // cuerpo casi negro; el volumen lo dan el canto iluminado (vsCanto) y los reflejos
    const rg = el("radialGradient", { id: `${id}-cuerpo`, cx: "50%", cy: "50%", r: "70%" }, defs);
    [[0, "#07080C"], [.7, "#050507"], [1, "#030304"]].forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, rg));
    const lg = el("linearGradient", { id: `${id}-memb`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    [[0, "#1A2030", .55], [1, "#050507", .85]].forEach(([o, c, op]) => el("stop", { offset: o, "stop-color": c, "stop-opacity": op }, lg));
    return { cuerpo: `url(#${id}-cuerpo)`, memb: `url(#${id}-memb)` };
  }
  /* volumen de una masa: canto iluminado (franja ancha, gris azulado, solo dentro de la
     masa) + sombra interior; devuelve una función que actualiza ambos con la forma */
  function vsCanto(padre, defs) {
    const id = uid("vsc"), cp = el("clipPath", { id }, defs), forma = el("path", {}, cp);
    const g = el("g", { "clip-path": `url(#${id})` }, padre);
    const ancho = el("path", { class: "vs-canto" }, g), fino = el("path", { class: "vs-canto-fino" }, g);
    return (dCerrada, dBorde) => { forma.setAttribute("d", dCerrada); ancho.setAttribute("d", dBorde); fino.setAttribute("d", dBorde); };
  }
  /* borde de lóbulos grandes y pequeños: puntos de una frontera ondulada entre x0 y x1
     a la altura y (dir = +1 si la masa queda abajo) */
  function lobulos(r, x0, x1, y, amp, n) {
    const p = [];
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, grande = i % 3 === 0;
      p.push([x + (r() - .5) * 12, y - (grande ? amp * (.7 + r() * .5) : amp * (.15 + r() * .4))]);
    }
    return p;
  }
  /* reflejos estrechos sobre las crestas (siguen la curvatura del borde) */
  function reflejos(p, desp = 7) {
    let d = "";
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i - 1], b = p[i], c = p[i + 1];
      if (b[1] < a[1] && b[1] < c[1]) { // cresta
        d += `M${f1((a[0] + b[0]) / 2)} ${f1((a[1] + b[1]) / 2 + desp)}Q${f1(b[0])} ${f1(b[1] + desp * .4)} ${f1((b[0] + c[0]) / 2 - 4)} ${f1((b[1] + c[1]) / 2 + desp)}`;
      }
    }
    return d;
  }
  // cuerpo de un tentáculo: polígono que se afina desde la base a la punta
  function tentaculo(cen, w0, w1) {
    const L = cen.length, izq = [], der = [];
    cen.forEach((q, i) => {
      const a = cen[Math.max(0, i - 1)], b = cen[Math.min(L - 1, i + 1)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const w = w0 + (w1 - w0) * (i / (L - 1)), nx = -Math.sin(ang) * w / 2, ny = Math.cos(ang) * w / 2;
      izq.push([q[0] + nx, q[1] + ny]); der.push([q[0] - nx, q[1] - ny]);
    });
    return { cuerpo: suave([...izq, ...der.reverse()]), lomo: suave(izq.map(([x, y], i) => [x * .7 + cen[i][0] * .3, y * .7 + cen[i][1] * .3]), false) };
  }

  /* ---------- TINTA DE MANGA (DIO) ---------- */
  function defsTinta(defs) {
    const id = uid("tn");
    const trama = el("pattern", { id: `${id}-trama`, width: 9, height: 9, patternUnits: "userSpaceOnUse", patternTransform: "rotate(18)" }, defs);
    el("circle", { cx: 4.5, cy: 4.5, r: 1.7, fill: "#0B0B0F" }, trama);
    const fina = el("pattern", { id: `${id}-fina`, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(18)" }, defs);
    el("circle", { cx: 3, cy: 3, r: .9, fill: "#0B0B0F" }, fina);
    const ray = el("pattern", { id: `${id}-ray`, width: 10, height: 10, patternUnits: "userSpaceOnUse", patternTransform: "rotate(-35)" }, defs);
    el("path", { d: "M0 5H10", stroke: "#0B0B0F", "stroke-width": 2.2 }, ray);
    const papel = el("pattern", { id: `${id}-papel`, width: 256, height: 256, patternUnits: "userSpaceOnUse" }, defs);
    el("image", { href: texPapel(), width: 256, height: 256 }, papel);
    return { trama: `url(#${id}-trama)`, fina: `url(#${id}-fina)`, rayado: `url(#${id}-ray)`, papel: `url(#${id}-papel)` };
  }
  /* trazo de tinta con grosor variable: un relleno entre dos curvas (pincel) */
  function pincel(p, w0, w1, wm = (w0 + w1) * .9) {
    const L = p.length, a = [], b = [];
    p.forEach((q, i) => {
      const t = i / (L - 1), w = (t < .5 ? w0 + (wm - w0) * t * 2 : wm + (w1 - wm) * (t - .5) * 2) / 2;
      const u = p[Math.max(0, i - 1)], v = p[Math.min(L - 1, i + 1)], ang = Math.atan2(v[1] - u[1], v[0] - u[0]);
      a.push([q[0] - Math.sin(ang) * w, q[1] + Math.cos(ang) * w]); b.push([q[0] + Math.sin(ang) * w, q[1] - Math.cos(ang) * w]);
    });
    return suave([...a, ...b.reverse()]);
  }
  /* estrella de impacto irregular con salpicaduras */
  function impacto(r, cx, cy, R, n = 13) {
    const p = [];
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 + (r() - .5) * .12, rr = i % 2 ? R * (.38 + r() * .14) : R * (.8 + r() * .45); p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    const gotas = Array.from({ length: 9 }, () => { const a = r() * Math.PI * 2, d = R * (1.15 + r() * .6); return [cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3 + r() * 9]; });
    return { estrella: linea(p) + "Z", gotas };
  }
  /* reloj detallado: bisel, grabados, numerales romanos, agujas diferenciadas, sombras */
  function reloj2(padre, cx, cy, R) {
    const g = el("g", { class: "mt-reloj" }, padre);
    el("circle", { cx: cx + R * .05, cy: cy + R * .07, r: R * 1.02, class: "mt-rl-sombra" }, g);
    el("circle", { cx, cy, r: R, class: "mt-rl-bisel" }, g);
    el("circle", { cx, cy, r: R * .9, class: "mt-rl-esfera" }, g);
    el("circle", { cx, cy, r: R * .9, class: "mt-rl-trama" }, g);
    el("circle", { cx, cy, r: R * .78, class: "mt-rl-anillo" }, g);
    let marcas = "";
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r1 = R * (i % 5 ? .84 : .8), r2 = R * .88; marcas += `M${f1(cx + Math.cos(a) * r1)} ${f1(cy + Math.sin(a) * r1)}L${f1(cx + Math.cos(a) * r2)} ${f1(cy + Math.sin(a) * r2)}`; }
    el("path", { d: marcas, class: "mt-rl-marcas" }, g);
    ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"].forEach((t, i) => {
      const a = i / 12 * Math.PI * 2 - Math.PI / 2, rr = R * .66;
      el("text", { x: f1(cx + Math.cos(a) * rr), y: f1(cy + Math.sin(a) * rr + R * .05), class: "mt-rl-num", "font-size": f1(R * .14) }, g).textContent = t;
    });
    // grabado: roseta en el centro
    let ros = "";
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ros += `M${f1(cx)} ${f1(cy)}Q${f1(cx + Math.cos(a + .3) * R * .22)} ${f1(cy + Math.sin(a + .3) * R * .22)} ${f1(cx + Math.cos(a) * R * .3)} ${f1(cy + Math.sin(a) * R * .3)}`; }
    el("path", { d: ros, class: "mt-rl-grabado" }, g);
    const larga = el("g", { style: `transform-origin:${f1(cx)}px ${f1(cy)}px;transform-box:view-box` }, g);
    el("path", { d: `M${f1(cx - R * .03)} ${f1(cy + R * .12)}L${f1(cx)} ${f1(cy - R * .76)}L${f1(cx + R * .03)} ${f1(cy + R * .12)}Z`, class: "mt-rl-aguja" }, larga);
    const corta = el("g", { style: `transform-origin:${f1(cx)}px ${f1(cy)}px;transform-box:view-box` }, g);
    el("path", { d: `M${f1(cx - R * .05)} ${f1(cy + R * .08)}L${f1(cx - R * .02)} ${f1(cy - R * .46)}L${f1(cx)} ${f1(cy - R * .54)}L${f1(cx + R * .02)} ${f1(cy - R * .46)}L${f1(cx + R * .05)} ${f1(cy + R * .08)}Z`, class: "mt-rl-aguja corta" }, corta);
    el("circle", { cx, cy, r: R * .055, class: "mt-rl-eje" }, g);
    g.larga = larga; g.corta = corta;
    return g;
  }

  // fluidez: las texturas se calculan y decodifican en un momento libre después de cargar,
  // no en el primer cuadro de la primera transición
  const libre = window.requestIdleCallback || (f => setTimeout(f, 1200));
  addEventListener("load", () => libre(() => [texEscarcha(), texPapel()].forEach(src => { const i = new Image(); i.src = src; i.decode?.().catch(() => {}); })));

  return { NS, uid, rng, el, pts, linea, suave, lienzo, lienzo2d, reloj, ease, tramo, texEscarcha, texPapel,
    defsHielo, esquirla, ramas, defsViscosa, vsCanto, lobulos, reflejos, tentaculo, defsTinta, pincel, impacto, reloj2 };
})();

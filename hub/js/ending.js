"use strict";
/* =====================================================================
   Ending dibujado a mano, homenaje al primer ending de JoJo («Roundabout»):
   1. Cuadro congelado: la última vista de las conclusiones se detiene, vira a sepia
      y entra deslizándose la flecha «CONTINUARÁ... →».
   2. Una franja de papel cubre la pantalla (la flecha sigue en su sitio) y debajo
      aparece el mismo circuito redibujado a tinta.
   3. La cámara recorre un mural de láminas entintadas, cada una con su lavado de color:
      Módulo I · II · III · MUX/DEMUX (aquí estamos) · CLK · Módulo IV (a lápiz) · ?
      y fundido a negro.

   Todo se dibuja en Canvas 2D con trazos de pincel sembrados (cada trazo tiene tres
   dibujos que se alternan: «boil»), revelado a 12 cuadros por segundo (en dos) y
   papel con grano que se mueve con el mural. El texto de cada lámina sigue en el DOM
   (accesible y probado por tnav); el lienzo va detrás, en coordenadas de pantalla,
   sincronizado con la cámara de app.js (cam, camScale).

   Nombres y temas de los Módulos I–III: tal como los dio el equipo.
   Módulo IV: el equipo describió su contenido (latches, flip-flops, registros,
   tablas de estado, FSM, Mealy, Moore) pero no su nombre oficial.
   ===================================================================== */
const MURAL_Y = 12000;

/* ---------------- tinta ---------------- */
const INK = (() => {
  const VAR = 3;                                    // dibujos por trazo (boil)
  function rng(seed) {
    let s = seed | 0;
    return () => {
      s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function resample(pts, step) {
    const out = [pts[0].slice()];
    let acc = 0;
    for (let k = 1; k < pts.length; k++) {
      let [x0, y0] = pts[k - 1];
      const [x1, y1] = pts[k];
      let d = Math.hypot(x1 - x0, y1 - y0);
      while (d > 0 && acc + d >= step) {
        const t = (step - acc) / d;
        x0 += (x1 - x0) * t; y0 += (y1 - y0) * t;
        out.push([x0, y0]);
        d = Math.hypot(x1 - x0, y1 - y0); acc = 0;
      }
      acc += d;
    }
    const L = pts[pts.length - 1], E = out[out.length - 1];
    if (Math.hypot(L[0] - E[0], L[1] - E[1]) > 1) out.push(L.slice());
    return out;
  }
  /* un trazo de pincel: línea central temblorosa (3 variantes) y ancho con presión y punta */
  function stroke(pts, o, seed) {
    const P = resample(pts, o.step || 7), n = P.length, v = [];
    let len = 0;
    for (let k = 1; k < n; k++) len += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]);
    for (let q = 0; q < VAR; q++) {
      const r = rng(seed * 31 + q * 7919);
      const a1 = r() * 6.28, a2 = r() * 6.28, a3 = r() * 6.28, f1 = .05 + r() * .06, f2 = .18 + r() * .2;
      const sx = (r() - .5) * o.j * 1.4, sy = (r() - .5) * o.j * 1.4;
      const xs = new Float32Array(n), ys = new Float32Array(n), ws = new Float32Array(n), nx = new Float32Array(n), ny = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        const A = P[Math.max(0, k - 1)], B = P[Math.min(n - 1, k + 1)];
        let tx = B[0] - A[0], ty = B[1] - A[1];
        const tl = Math.hypot(tx, ty) || 1;
        nx[k] = -ty / tl; ny[k] = tx / tl;
        const off = o.j * (Math.sin(k * f1 + a1) * .65 + Math.sin(k * f2 + a2) * .35);
        xs[k] = P[k][0] + nx[k] * off + sx;
        ys[k] = P[k][1] + ny[k] * off + sy;
        const t = n > 1 ? k / (n - 1) : .5;
        const tip = o.cap ? 1 : .22 + .78 * Math.pow(Math.sin(Math.PI * t), .45);
        ws[k] = o.w * tip * (1 + o.press * Math.sin(k * .09 + a3)) / 2;
      }
      v.push({ xs, ys, ws, nx, ny });
    }
    return { v, n, len };
  }
  function trace(ctx, s, q, p) {
    if (s.n < 2) return;
    const d = s.v[q], m = p >= 1 ? s.n : Math.max(2, Math.ceil(s.n * p));
    ctx.beginPath();
    ctx.moveTo(d.xs[0] + d.nx[0] * d.ws[0], d.ys[0] + d.ny[0] * d.ws[0]);
    for (let k = 1; k < m; k++) ctx.lineTo(d.xs[k] + d.nx[k] * d.ws[k], d.ys[k] + d.ny[k] * d.ws[k]);
    for (let k = m - 1; k >= 0; k--) ctx.lineTo(d.xs[k] - d.nx[k] * d.ws[k], d.ys[k] - d.ny[k] * d.ws[k]);
    ctx.closePath();
    ctx.fill();
  }
  /* rayado: rectas paralelas recortadas por un polígono */
  function hatch(poly, ang, gap, r) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const q = poly.map(([x, y]) => [x * c + y * s, -x * s + y * c]);
    const ys = q.map(p => p[1]), y1 = Math.max(...ys), segs = [];
    for (let y = Math.min(...ys) + gap * (.3 + r() * .5); y < y1; y += gap * (.85 + r() * .3)) {
      const xi = [];
      for (let k = 0; k < q.length; k++) {
        const [ax, ay] = q[k], [bx, by] = q[(k + 1) % q.length];
        if ((ay <= y) !== (by <= y)) xi.push(ax + (y - ay) / (by - ay) * (bx - ax));
      }
      xi.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xi.length; k += 2) {
        const a = xi[k] + r() * gap * .6, b = xi[k + 1] - r() * gap * .6;
        if (b - a < 4) continue;
        segs.push([[a * c - y * s, a * s + y * c], [b * c - y * s, b * s + y * c]]);
      }
    }
    return segs;
  }
  return { VAR, rng, stroke, trace, hatch };
})();

/* geometría */
const G = {
  q(x0, y0, cx, cy, x1, y1, n = 20) {
    const o = [];
    for (let k = 0; k <= n; k++) { const t = k / n, u = 1 - t; o.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]); }
    return o;
  },
  c(x0, y0, ax, ay, bx, by, x1, y1, n = 28) {
    const o = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, u = 1 - t;
      o.push([u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x1, u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y1]);
    }
    return o;
  },
  arc(cx, cy, rx, ry, a0, a1, n = 40) {
    const o = [];
    for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return o;
  }
};

/* una lámina: lista de trazos, lavados y letras con su momento de aparición */
function sheet(seed) {
  const r = INK.rng(seed), items = [];
  let T = 0;
  const api = {
    r, items,
    at(t) { T = t; return api; },
    line(pts, o = {}) {
      const st = INK.stroke(pts, { w: o.w ?? 4, j: o.j ?? 1.3, press: o.press ?? .2, cap: o.cap, step: o.step }, r() * 1e9 | 0);
      const d = o.d ?? clamp(st.len / 1500, .1, .55);
      items.push({ k: "s", st, t0: T, d, c: o.c || "ink", a: o.a ?? 1 });
      T += o.gap ?? d * .45;
      return api;
    },
    wash(poly, o = {}) {
      const reg = o.reg === false ? 0 : 1;
      items.push({ k: "w", poly, t0: T, d: o.d ?? .45, c: o.c || "wash", a: o.a ?? .5, dx: (r() - .5) * 12 * reg, dy: (r() - .5) * 9 * reg, reg });
      T += o.gap ?? .08;
      return api;
    },
    text(str, x, y, o = {}) {
      items.push({ k: "t", str, x, y, font: o.font, c: o.c || "ink", al: o.al || "center", rot: o.rot || 0, a: o.a ?? 1, t0: T, d: o.d ?? .3,
        stroke: o.stroke, lw: o.lw || 4, fill: o.fill !== false, shake: o.shake || 1 });
      T += o.gap ?? .08;
      return api;
    },
    hatch(poly, ang, gap, o = {}) {
      for (const sg of INK.hatch(poly, ang, gap, r)) api.line(sg, { w: o.w ?? 1.6, j: o.j ?? .5, press: .3, c: o.c, a: o.a, d: o.d ?? .07, gap: o.gap ?? .014 });
      return api;
    },
    /* rectángulo de boceto: cuatro rectas que se pasan de las esquinas */
    box(x, y, w, h, o = {}) {
      const e = o.over ?? 7;
      api.line([[x - e, y], [x + w + e * .6, y]], o).line([[x + w, y - e * .6], [x + w, y + h + e]], o)
        .line([[x + w + e * .4, y + h], [x - e, y + h]], o).line([[x, y + h + e * .5], [x, y - e]], o);
      return api;
    },
    ring(cx, cy, rx, o = {}) {
      const ry = o.ry ?? rx, a0 = r() * 6.28;
      return api.line(G.arc(cx, cy, rx, ry, a0, a0 + Math.PI * 2 * (o.sweep ?? 1.06), 48), o);
    },
    dot(cx, cy, rr, c = "ink") { return api.wash(G.arc(cx, cy, rr, rr, 0, 6.2, 14), { c, a: 1, reg: false, d: .1, gap: .02 }); },
    gate(kind, x, y, s, o = {}) {
      const g = gateShape(kind, x, y, s);
      if (o.fill !== false) api.wash(g.body, { c: o.fc || "wash", a: o.fa ?? .5 });
      api.line(g.body, { w: o.w ?? 4, j: o.j ?? 1, cap: true });
      g.extra.forEach(p => api.line(p, { w: o.w ?? 4, j: o.j ?? 1 }));
      if (g.bub) api.ring(g.bub[0], g.bub[1], g.bub[2], { w: (o.w ?? 4) * .8, j: .4 });
      return g;
    },
    /* ajusta los tiempos para que la lámina se termine de dibujar en «total» segundos */
    fit(total) {
      const end = Math.max(0, ...items.filter(i => i.t0 >= 0).map(i => i.t0 + i.d));
      if (end > total) { const f = total / end; items.forEach(i => { if (i.t0 >= 0) { i.t0 *= f; i.d *= f; } }); }
      api.end = Math.min(end, total);
      return api;
    },
    end: 0
  };
  return api;
}

/* compuertas en una caja s×s (entrada a la izquierda) */
function gateShape(kind, x, y, s) {
  const base = kind.replace(/^N(?=AND|OR)/, "").replace("XNOR", "XOR");
  const neg = /^N/.test(kind) || kind === "XNOR";
  const P = (u, v) => [x + u * s, y + v * s];
  let body, extra = [], right;
  if (base === "AND") {
    body = [P(0, 0), P(.5, 0), ...G.arc(x + .5 * s, y + .5 * s, .5 * s, .5 * s, -Math.PI / 2, Math.PI / 2, 24), P(0, 1), P(0, 0)];
    right = 1;
  } else if (base === "OR" || base === "XOR") {
    body = [...G.q(...P(0, 0), ...P(.7, 0), ...P(1.05, .5)), ...G.q(...P(1.05, .5), ...P(.7, 1), ...P(0, 1)), ...G.q(...P(0, 1), ...P(.28, .5), ...P(0, 0))];
    right = 1.05;
    if (base === "XOR") extra = [G.q(...P(-.15, 0), ...P(.13, .5), ...P(-.15, 1))];
  } else {
    body = [P(0, 0), P(.9, .5), P(0, 1), P(0, 0)];
    right = .9;
  }
  const bub = neg || base === "NOT" ? [x + (right + .08) * s, y + .5 * s, .08 * s] : null;
  return { body, extra, bub, out: x + (bub ? right + .16 : right) * s };
}

/* emblemas de los cuatro mundos (las cuatro entradas del MUX) */
function emblem(sh, kind, cx, cy, R) {
  if (kind === "snow") {
    for (let k = 0; k < 3; k++) {
      const a = Math.PI / 2 + k * Math.PI / 3, c = Math.cos(a) * R, s = Math.sin(a) * R;
      sh.line([[cx - c, cy - s], [cx + c, cy + s]], { w: 3.5, j: .4 });
    }
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3 + Math.PI / 2, mx = cx + Math.cos(a) * R * .6, my = cy + Math.sin(a) * R * .6;
      for (const d of [-.7, .7]) sh.line([[mx, my], [mx + Math.cos(a + d) * R * .32, my + Math.sin(a + d) * R * .32]], { w: 2.5, j: .3, d: .05 });
    }
  } else if (kind === "bat") {
    const pts = [[-1, -.1], [-.6, -.38], [-.36, -.06], [-.16, -.26], [-.06, -.12], [0, -.3], [.06, -.12], [.16, -.26], [.36, -.06], [.6, -.38], [1, -.1], [.72, .06], [.56, .28], [.36, .12], [.16, .32], [0, .2], [-.16, .32], [-.36, .12], [-.56, .28], [-.72, .06]]
      .map(([u, v]) => [cx + u * R * 1.2, cy + v * R * 1.2]);
    sh.wash(pts, { c: "ink", a: .92, reg: false });
    sh.line([...pts, pts[0]], { w: 2.4, j: .4, cap: true });
  } else if (kind === "goo") {
    const pts = [];
    for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, rr = R * (.72 + .3 * sh.r()); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .85]); }
    sh.wash(pts, { c: "ink", a: .95, reg: false });
    for (const dx of [-.4, .05, .45]) sh.line([[cx + dx * R, cy + R * .5], [cx + dx * R + 3, cy + R * (1 + sh.r() * .7)]], { w: 7, j: .8, press: .5, d: .12 });
    sh.ring(cx - R * .25, cy - R * .15, R * .14, { w: 2, c: "paper", j: .2 });
  } else {
    sh.ring(cx, cy, R, { w: 3.5, j: .5 });
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * 6.283, c = Math.cos(a), s = Math.sin(a), l = k % 3 ? .82 : .7;
      sh.line([[cx + c * R * l, cy + s * R * l], [cx + c * R * .92, cy + s * R * .92]], { w: 2, j: .2, d: .03, gap: .01 });
    }
    sh.line([[cx, cy], [cx + R * .05, cy - R * .62]], { w: 4, j: .2, cap: true }).line([[cx, cy], [cx + R * .5, cy + R * .1]], { w: 3, j: .2, cap: true });
  }
}

/* paletas por lámina (papel, tinta, lavado, acento, realce) */
const MURAL_PAL = [
  { paper: "#E6D2A8", ink: "#2A1A0E", wash: "#B9773F", acc: "#8E2A1C", hi: "#D6B357" },
  { paper: "#D9D8B6", ink: "#1E2A24", wash: "#5E8C7A", acc: "#2F5D55", hi: "#C9A54A" },
  { paper: "#E8C8B2", ink: "#2A1212", wash: "#B2432F", acc: "#7A1E1A", hi: "#D9A040" },
  { paper: "#E6D29E", ink: "#2A1E0C", wash: "#C08A2B", acc: "#7A4A12", hi: "#B23A2A" },
  { paper: "#EBDAA6", ink: "#1E140C", wash: "#C9352F", acc: "#9A2A22", hi: "#D9A030" },
  { paper: "#211A31", ink: "#EDE3F7", wash: "#6E4FA8", acc: "#B9A2E8", hi: "#E3B341" },
  { paper: "#D8D6D0", ink: "#3E3E46", wash: "#9A9AA6", acc: "#5A5A66", hi: "#7A7A86" },
  { paper: "#D4BF96", ink: "#2A1A0E", wash: "#8A6A40", acc: "#5A3A1E", hi: "#B98A40" }
];
const SERIF = (w, px, it = true) => `${it ? "italic " : ""}${w} ${px}px "Cormorant Garamond", Georgia, serif`;
const MONO = px => `500 ${px}px "JetBrains Mono", monospace`;

/* la flecha «CONTINUARÁ... →»: la misma lámina en el cuadro congelado y en el mural */
const TBC_ARROW = (() => {
  const a = sheet(4242).at(-1);
  const pts = [[110, 770], [850, 770], [850, 736], [1012, 820], [850, 904], [850, 870], [110, 870]];
  a.wash(pts, { c: "hi", a: 1, reg: false, d: .001, gap: 0 });
  a.hatch([[110, 846], [850, 846], [850, 870], [110, 870]], .95, 9, { w: 1.3, a: .55, d: .001, gap: 0 });
  a.hatch([[850, 820], [1012, 820], [850, 904]], .95, 9, { w: 1.3, a: .55, d: .001, gap: 0 });
  a.line([...pts, pts[0]], { w: 6.5, j: .9, cap: true, d: .001, gap: 0 });
  a.line([[126, 786], [834, 786]], { w: 1.8, j: .5, a: .7, d: .001, gap: 0 });
  a.text("CONTINUARÁ...", 478, 846, { font: SERIF(700, 76), c: "ink", d: .001, gap: 0 });
  return a;
})();

/* ---------------- láminas ---------------- */
function muralArt(i) {
  const s = sheet(1000 + i * 97);
  const Y = 905, HI = 862, LO = 948;
  /* hilo conductor: una sola señal que cambia de forma de lámina en lámina */
  const t = sheet(5000 + i * 31);
  const tw = { w: 4.5, j: 1.1 };
  if (i === 0) t.line(G.c(0, Y, 640, 860, 1280, 950, 1920, Y, 60), tw);
  if (i === 1) {
    const bits = "11111101010", w = 1920 / bits.length, pts = [[0, Y]];
    [...bits].forEach((b, k) => { const y = b === "1" ? HI : LO; pts.push([k * w, y], [(k + 1) * w, y]); });
    pts.push([1920, Y]);
    t.line(pts, { ...tw, cap: true, d: 1 });
    [...bits].forEach((b, k) => t.text(b, k * w + w / 2, HI - 18, { font: MONO(28), c: "acc", d: .1, gap: .03 }));
  }
  if (i === 2) {
    let x = 0;
    for (const [gx, k] of [[420, "AND"], [960, "OR"], [1500, "NOT"]]) { t.line([[x, Y], [gx, Y]], tw); t.gate(k, gx, Y - 30, 60, { w: 3, fa: .35 }); x = gx + (k === "NOT" ? 72 : 64); }
    t.line([[x, Y], [1920, Y]], tw);
  }
  if (i === 3) {
    const ys = [866, 892, 918, 944];
    ys.forEach(y => t.line([[0, Y], [160, y], [1920, y]], { w: 3.2, j: .9, gap: .05 }));
    [[480, "Σ"], [980, "="], [1480, "DEC"]].forEach(([x, l]) => { t.wash([[x, 846], [x + 120, 846], [x + 120, 964], [x, 964]], { c: "paper", a: 1, reg: false }); t.box(x, 846, 120, 118, { w: 3.5 }); t.text(l, x + 60, 918, { font: MONO(32) }); });
  }
  if (i === 4) {
    const ys = [866, 892, 918, 944];
    ys.forEach(y => t.line([[0, y], [520, y]], { w: 3.2, j: .9, gap: .04 }));
    t.wash([[520, 840], [640, 875], [640, 935], [520, 970]], { c: "ink", a: .9 }).line([[520, 840], [640, 875], [640, 935], [520, 970], [520, 840]], { w: 3.5, cap: true });
    for (let x = 650; x < 1270; x += 46) t.line([[x, Y], [x + 26, Y]], { w: 6, c: "wash", j: .5, d: .04, gap: .015 });
    t.wash([[1280, 875], [1400, 840], [1400, 970], [1280, 935]], { c: "ink", a: .9 }).line([[1280, 875], [1400, 840], [1400, 970], [1280, 935], [1280, 875]], { w: 3.5, cap: true });
    ys.forEach(y => t.line([[1400, y], [1640, y], [1920, Y]], { w: 3.2, j: .9, gap: .04 }));
  }
  if (i === 5) {
    const pts = [[0, Y], [0, LO]];
    for (let x = 0; x < 1920; x += 240) pts.push([x + 120, LO], [x + 120, HI], [x + 240, HI], [x + 240, LO]);
    t.line(pts, { w: 5, j: .8, cap: true, d: 1.2 });
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; t.line([[120 + Math.cos(a) * 16, HI + Math.sin(a) * 16], [120 + Math.cos(a) * 42, HI + Math.sin(a) * 42]], { w: 3, c: "hi", d: .05, gap: .01 }); }
  }
  if (i === 6) {
    const pen = { w: 2.2, j: 1.8, a: .75, c: "ink", press: .4 };
    const curve = G.c(0, Y, 300, 860, 500, 950, 760, Y, 30).concat(G.c(760, Y, 1100, 860, 1500, 950, 1920, Y, 40));
    for (let k = 0; k + 4 < curve.length; k += 5) t.line(curve.slice(k, k + 4), { ...pen, d: .05, gap: .02 });
    [420, 960, 1500].forEach(x => t.ring(x, Y, 34, { ...pen, sweep: .92 }));
  }
  if (i === 7) {
    t.line(G.c(0, Y, 260, 880, 520, 930, 760, Y, 30), { w: 4, j: 1.2, a: .8 });
    [[800, 840], [870, 900], [930, 948]].forEach(([a, b]) => t.line([[a, Y + 2], [b, Y]], { w: 2, j: .6, a: .45, d: .06 }));
  }
  t.fit(1.6);

  /* ilustración */
  if (i === 0) {
    // el cuadro congelado redibujado: entradas → MUX → canal → DEMUX → destinos
    const ins = [280, 380, 480, 580];
    s.at(0);
    ins.forEach(y => { s.line([[256, y], [520, y + (430 - y) * .12]], { w: 3.5 }); s.wash(G.arc(230, y, 24, 24, 0, 6.2, 16), { c: "wash", a: .6 }); s.ring(230, y, 24, { w: 3 }); });
    const mux = [[520, 232], [700, 320], [700, 600], [520, 688]];
    s.wash(mux, { c: "acc", a: .35 }).hatch(mux, .8, 15, { w: 1.4 }).line([...mux, mux[0]], { w: 5.5, cap: true });
    s.text("MUX", 610, 478, { font: SERIF(700, 50) });
    s.line([[700, 460], [1220, 460]], { w: 5 });
    for (let x = 730; x < 1200; x += 60) s.line([[x, 476], [x + 30, 476]], { w: 3, c: "acc", d: .04, gap: .01 });
    s.text("canal", 960, 438, { font: SERIF(600, 40), c: "acc" });
    const dmx = [[1220, 320], [1400, 232], [1400, 688], [1220, 600]];
    s.wash(dmx, { c: "acc", a: .35 }).hatch(dmx, -.8, 15, { w: 1.4 }).line([...dmx, dmx[0]], { w: 5.5, cap: true });
    s.text("DEMUX", 1310, 478, { font: SERIF(700, 44) });
    ins.forEach(y => { s.line([[1400, y + (430 - y) * .12], [1666, y]], { w: 3.5 }); s.wash(G.arc(1690, y, 24, 24, 0, 6.2, 16), { c: "wash", a: .6 }); s.ring(1690, y, 24, { w: 3 }); });
    s.text("MUX → canal → DEMUX", 960, 170, { font: SERIF(600, 46), c: "acc" });
  }
  if (i === 1) {
    // «2026» en bloque con extrusión, y la cinta perforada con sus bits
    s.at(0);
    for (let k = 14; k > 0; k -= 2) s.text("2026", 1370 + k * 1.3, 470 + k * 1.1, { font: SERIF(700, 300, false), c: "wash", a: .9, d: .05, gap: .02 });
    s.text("2026", 1370, 470, { font: SERIF(700, 300, false), c: "paper", stroke: "ink", lw: 5, d: .4 });
    const mid = G.c(880, 800, 1150, 560, 1500, 860, 1900, 640, 80);
    const side = sgn => mid.map((p, k) => {
      const A = mid[Math.max(0, k - 1)], B = mid[Math.min(mid.length - 1, k + 1)], l = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
      return [p[0] - (B[1] - A[1]) / l * 46 * sgn, p[1] + (B[0] - A[0]) / l * 46 * sgn];
    });
    const up = side(1), dn = side(-1);
    s.wash([...up, ...dn.slice().reverse()], { c: "paper", a: 1, reg: false });
    s.wash([...up, ...dn.slice().reverse()], { c: "hi", a: .3 });
    s.line(up, { w: 3.5 }).line(dn, { w: 3.5 });
    "11111101010".split("").forEach((b, k) => {
      const q = Math.round(8 + k * 6.2), p = mid[q], A = mid[q - 1], B = mid[q + 1], l = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const nx = -(B[1] - A[1]) / l, ny = (B[0] - A[0]) / l;
      s.dot(p[0] - nx * 2, p[1] - ny * 2, 5, "acc");
      if (b === "1") s.dot(p[0] + nx * 22, p[1] + ny * 22, 11);
      else s.ring(p[0] + nx * 22, p[1] + ny * 22, 10, { w: 1.6, j: .3, a: .5 });
    });
    s.text("7EA₁₆", 1660, 230, { font: MONO(46), c: "acc", rot: -.12 });
    s.box(1560, 180, 200, 74, { w: 2.6, c: "acc" });
    s.text("3752₈", 1760, 520, { font: MONO(40), c: "acc", rot: .1 });
  }
  if (i === 2) {
    // monumento NAND con su sombra rayada, mapa de Karnaugh y la fila de compuertas
    s.at(0);
    s.line([[880, 330], [1000, 330]], { w: 4 }).line([[880, 530], [1000, 530]], { w: 4 });
    s.text("A", 860, 318, { font: SERIF(600, 44) }).text("B", 860, 518, { font: SERIF(600, 44) });
    const g = s.gate("NAND", 1000, 230, 400, { w: 6, fa: .55 });
    const low = [[1000, 470], [1400, 470], ...G.arc(1200, 430, 200, 200, Math.atan2(40, 200), Math.PI / 2, 16), [1000, 630]];
    s.hatch(low, .7, 13, { w: 1.5 }).hatch(low, -.7, 17, { w: 1.2, a: .7 });
    s.line(G.arc(1200, 430, 214, 214, -1.2, 1.4, 30), { w: 2.5, a: .6 });
    s.line([[g.out, 430], [1700, 430]], { w: 4 });
    s.text("Y", 1728, 446, { font: SERIF(600, 48) });
    const kx = 1540, ky = 140, c = 56;
    for (let k = 0; k <= 4; k++) { s.line([[kx, ky + k * c], [kx + 4 * c, ky + k * c]], { w: 2, j: .5, d: .06, gap: .02 }); s.line([[kx + k * c, ky], [kx + k * c, ky + 4 * c]], { w: 2, j: .5, d: .06, gap: .02 }); }
    const grp = G.arc(kx + 2 * c, ky + 2 * c, c * 1.15, c * 1.15, 0, Math.PI * 2.1, 40);
    s.wash(grp, { c: "wash", a: .45 }).line(grp, { w: 4.5, c: "acc" });
    s.text("Karnaugh", kx + 2 * c, ky - 18, { font: SERIF(600, 32), c: "acc" });
    ["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"].forEach((k, n) => {
      const x = 150 + n * 245;
      s.gate(k, x, 700, 62, { w: 3, fa: .4 });
      s.text(k, x + 34, 808, { font: MONO(24), d: .1, gap: .03 });
    });
  }
  if (i === 3) {
    // semisumador: A, B → XOR (S) y AND (Cₒ), y la flecha que empuja hacia MUX/DEMUX
    s.at(0);
    s.text("semisumador", 1300, 180, { font: SERIF(600, 40), c: "acc" });
    s.text("A", 900, 312, { font: SERIF(600, 46) }).text("B", 900, 452, { font: SERIF(600, 46) });
    s.line([[930, 300], [1142, 300]], { w: 3.5 }).line([[930, 440], [1110, 440], [1110, 380], [1142, 380]], { w: 3.5 });
    s.line([[1040, 300], [1040, 560], [1150, 560]], { w: 3.5 }).line([[1080, 440], [1080, 640], [1150, 640]], { w: 3.5 });
    s.dot(1040, 300, 8).dot(1080, 440, 8);
    const x1 = s.gate("XOR", 1150, 260, 160, { w: 4.5, fa: .5 });
    const x2 = s.gate("AND", 1150, 520, 160, { w: 4.5, fa: .5 });
    s.hatch([[1150, 380], [1300, 380], [1318, 420], [1150, 420]], .8, 11, { w: 1.3 });
    s.hatch([[1150, 640], [1300, 640], [1290, 680], [1150, 680]], .8, 11, { w: 1.3 });
    s.line([[x1.out, 340], [1500, 340]], { w: 3.5 }).line([[x2.out, 600], [1500, 600]], { w: 3.5 });
    s.text("S", 1530, 356, { font: SERIF(600, 46) }).text("Cₒ", 1538, 616, { font: SERIF(600, 46) });
    const arr = G.c(1300, 780, 1500, 700, 1700, 820, 1880, 720, 40);
    s.line(arr, { w: 14, press: .5, j: 1.5, d: .6 });
    s.line([[1830, 690], [1884, 718], [1846, 768]], { w: 10, j: 1, cap: true });
  }
  if (i === 4) {
    // el presente: MUX → canal → DEMUX, con los emblemas de los cuatro mundos
    s.at(0);
    const ys = [470, 560, 650, 740], kinds = ["bat", "snow", "goo", "clock"];
    ys.forEach((y, k) => { emblem(s, kinds[k], 150, y, 30); s.line([[194, y], [360, y + (605 - y) * .1]], { w: 3.5 }); });
    const top = [[360, 430], [384, 410], [584, 490], [560, 510]];
    s.wash(top, { c: "ink", a: .5 }).hatch(top, 0, 7, { w: 1.2 });
    const mux = [[360, 430], [560, 510], [560, 700], [360, 780]];
    s.wash(mux, { c: "wash", a: .55 }).hatch([[360, 640], [560, 640], [560, 700], [360, 780]], .9, 12, { w: 1.4 }).line([...mux, mux[0]], { w: 6, cap: true });
    s.text("MUX", 462, 622, { font: SERIF(700, 46) });
    s.line([[560, 605], [1360, 605]], { w: 6 });
    s.text("canal", 960, 570, { font: SERIF(600, 42), c: "acc" });
    const top2 = [[1360, 510], [1384, 492], [1584, 412], [1560, 430]];
    s.wash(top2, { c: "ink", a: .5 }).hatch(top2, 0, 7, { w: 1.2 });
    const dmx = [[1360, 510], [1560, 430], [1560, 780], [1360, 700]];
    s.wash(dmx, { c: "wash", a: .55 }).hatch([[1360, 640], [1560, 640], [1560, 780], [1360, 700]], -.9, 12, { w: 1.4 }).line([...dmx, dmx[0]], { w: 6, cap: true });
    s.text("DEMUX", 1460, 622, { font: SERIF(700, 40) });
    ys.forEach((y, k) => { s.line([[1560, y + (605 - y) * .1], [1726, y]], { w: 3.5 }); emblem(s, kinds[k], 1770, y, 30); });
    s.line([[430, 762], [430, 815]], { w: 3 }).line([[490, 738], [490, 815]], { w: 3 });
    s.text("S₁ S₀", 460, 846, { font: MONO(24), c: "acc" });
    s.line([[1430, 728], [1430, 815]], { w: 3 }).line([[1490, 752], [1490, 815]], { w: 3 });
    s.text("S₁ S₀", 1460, 846, { font: MONO(24), c: "acc" });
    s.live = (ctx, tick, pal) => {
      ctx.font = MONO(30); ctx.textAlign = "center"; ctx.fillStyle = pal.acc;
      for (let k = 0; k < 6; k++) {
        const x = 590 + ((tick * 14 + k * 130) % 740);
        ctx.fillText("1011"[k % 4] === "1" ? "1" : "0", x, 595);
      }
    };
  }
  if (i === 5) {
    // CLK: la esfera del reloj detenida y el «ゴゴゴ» de la amenaza que viene
    s.at(0);
    const cx = 1450, cy = 410, R = 290;
    s.wash(G.arc(cx, cy, R, R, 0, 6.2, 40), { c: "wash", a: .35 });
    s.ring(cx, cy, R, { w: 6 }).ring(cx, cy, R - 24, { w: 2.5, a: .8 });
    const RN = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
    RN.forEach((n, k) => {
      const a = k / 12 * 6.283 - Math.PI / 2;
      s.text(n, cx + Math.cos(a) * (R - 70), cy + Math.sin(a) * (R - 70) + 14, { font: `700 ${k % 3 ? 34 : 46}px Cinzel, serif`, d: .08, gap: .03 });
      s.line([[cx + Math.cos(a) * (R - 26), cy + Math.sin(a) * (R - 26)], [cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10)]], { w: 3, d: .04, gap: .01 });
    });
    const hand = (a, l, w) => s.line([[cx, cy], [cx + Math.cos(a) * l, cy + Math.sin(a) * l]], { w, cap: true, j: .3 });
    hand(-Math.PI / 2 - .03, R * .72, 10); hand(-Math.PI / 2 - .55, R * .48, 13); hand(-Math.PI / 2 + .06, R * .82, 3);
    s.dot(cx, cy, 14, "hi");
    [[880, 300, -.2], [1000, 190, .12], [1060, 330, -.06], [930, 450, .16]].forEach(([x, y, r]) =>
      s.text("ゴ", x, y, { font: `900 118px "Yu Gothic", Meiryo, "Hiragino Sans", sans-serif`, c: "acc", stroke: "paper", lw: 6, rot: r, shake: 4 }));
  }
  if (i === 6) {
    // Módulo IV a lápiz: líneas de construcción, flip-flops y máquina de estados sin terminar
    const pen = { w: 2.4, j: 1.6, a: .8, press: .4 };
    const faint = { w: 1.2, j: .8, a: .3 };
    s.at(0);
    s.line([[900, 200], [1860, 200]], faint).line([[900, 480], [1860, 480]], faint).line([[960, 140], [960, 820]], faint).line([[900, 640], [1700, 640]], faint);
    for (const [x, l] of [[1000, "Flip-Flop D"], [1290, "JK"]]) {
      s.box(x, 200, 200, 270, pen).box(x + 3, 203, 200, 270, { ...pen, a: .4 });
      s.text(l, x + 100, 180, { font: MONO(28), a: .85 });
    }
    s.text("D", 1030, 270, { font: MONO(26) }).text("CLK ›", 1052, 430, { font: MONO(22) }).text("Q", 1170, 270, { font: MONO(26) }).text("Q̄", 1170, 430, { font: MONO(26) });
    s.text("J", 1318, 270, { font: MONO(26) }).text("K", 1318, 430, { font: MONO(26) }).text("Q", 1460, 270, { font: MONO(26) });
    s.wash([[1520, 300], [1640, 260], [1700, 330], [1580, 380]], { c: "wash", a: .15 });
    for (const [x, l, sw] of [[1040, "S0", 1.06], [1300, "S1", 1.06], [1560, "S2", .7]]) {
      s.ring(x, 640, 70, { ...pen, sweep: sw }).ring(x + 2, 642, 72, { ...pen, a: .35, sweep: sw * .8 });
      s.text(l, x, 652, { font: MONO(30) });
    }
    s.line(G.q(1110, 615, 1170, 560, 1230, 615), pen).line([[1218, 598], [1232, 616], [1210, 620]], pen);
    s.line(G.q(1370, 615, 1430, 560, 1490, 615), pen);
    const back = G.q(1490, 690, 1300, 820, 1110, 690);
    for (let k = 0; k + 3 < back.length; k += 4) s.line(back.slice(k, k + 3), { ...pen, d: .05 });
    s.text("Mealy?  Moore?", 1300, 790, { font: SERIF(600, 36), a: .7, rot: -.03 });
  }
  if (i === 7) {
    // el mural se queda sin terminar: un «?» a pincel
    s.at(.6);
    s.line(G.c(820, 360, 820, 180, 1100, 170, 1110, 330, 30).concat(G.c(1110, 330, 1118, 450, 960, 450, 962, 590, 24)), { w: 30, press: .35, j: 2, d: 1.2 });
    s.at(2);
    s.wash(G.arc(962, 680, 22, 20, 0, 6.2, 14), { c: "ink", a: 1, reg: false, d: .2 });
  }
  s.fit(i === 0 ? 2.4 : 3.2);
  return { art: s, thread: t };
}

/* ---------------- textos del mural (DOM) ---------------- */
function buildMural(world) {
  const P = [];
  P.push({
    title: "CONTINUARÁ... →",
    dwell: 4200,
    notes: "Primer elemento del ending: «CONTINUARÁ... →». El último cuadro se congela en sepia, entra la flecha y el circuito se redibuja a tinta. A partir de aquí la cámara recorre el mural de toda la materia.",
    html: `<p class="tbc">CONTINUARÁ... <i>→</i></p>`
  });
  P.push({
    title: "Módulo I · Sistemas Numéricos y Códigos Binarios",
    dwell: 8000,
    notes: "Módulo I: decimal, binario, octal y hexadecimal con sus conversiones; códigos ASCII, BCD y Gray; paridad. El mismo número cambia de forma sin cambiar su valor.",
    html: `<p class="mod">Módulo I</p><h2>Sistemas Numéricos<br><em>y Códigos Binarios</em></h2>
      <div class="morph">
        <span style="--d:0">2026<sub>10</sub></span><span style="--d:1">11111101010<sub>2</sub></span>
        <span style="--d:2">3752<sub>8</sub></span><span style="--d:3">7EA<sub>16</sub></span>
      </div>
      <ul class="tags v"><li>ASCII · «M» = 77 = 4D<sub>16</sub></li><li>BCD · 2026 = 0010 0000 0010 0110</li><li>Gray · 0110 → 0101</li><li>Paridad par · 1011001 → bit 0</li></ul>`
  });
  P.push({
    title: "Módulo II · Álgebra Booleana y Familias Lógicas",
    dwell: 8500,
    notes: "Módulo II: las siete compuertas, De Morgan, mintérminos y maxtérminos, mapas de Karnaugh, las familias TTL y CMOS, y la descripción en VHDL.",
    html: `<p class="mod">Módulo II</p><h2>Álgebra Booleana<br><em>y Familias Lógicas</em></h2>
      <p class="law">De Morgan: <span class="ov">A·B</span> = <span class="ov">A</span> + <span class="ov">B</span></p>
      <ul class="tags"><li>mintérminos Σm</li><li>maxtérminos ΠM</li><li>TTL · CMOS</li><li>VHDL</li></ul>`
  });
  P.push({
    title: "Módulo III · Lógica Combinacional",
    dwell: 8000,
    notes: "Módulo III: codificadores y decodificadores, buffers tri-state, XOR/XNOR, sumadores, restadores y comparadores. Todos responden solo a sus entradas del momento… y el camino lleva a MUX/DEMUX.",
    html: `<p class="mod">Módulo III</p><h2>Lógica <em>Combinacional</em></h2>
      <ul class="chain">${["Codificadores", "Decodificadores", "Tri-state", "XOR / XNOR", "Sumadores", "Restadores", "Comparadores"].map((t, i) => `<li style="--d:${i}">${t}</li>`).join("")}</ul>`
  });
  P.push({
    title: "MUX / DEMUX · aquí estamos",
    dwell: 6500,
    notes: "El presente: MUX y DEMUX. Muchos → uno y uno → muchos, gobernados por las líneas de selección. Los cuatro emblemas son los cuatro mundos de la presentación.",
    html: `<p class="mod">Aquí estamos</p><h2 class="big">MUX <i>/</i> <em>DEMUX</em></h2>`
  });
  P.push({
    title: "CLK · el primer pulso",
    dwell: 7500,
    notes: "Lámina nocturna. Aparece la señal de reloj CLK y un reloj detenido. Con el primer flanco de subida empieza lo que viene: la lógica secuencial, donde importan el tiempo, la memoria y el estado.",
    html: `<p class="mod">combinacional → secuencial</p><h2 class="clk-t">CLK</h2>
      <ul class="tags"><li>tiempo</li><li>memoria</li><li>estado</li></ul>`
  });
  P.push({
    title: "Módulo IV · lo que viene",
    dwell: 8500,
    notes: "Módulo IV, todavía por estudiar (por eso está a lápiz): latches, flip-flops D y JK, registros, tablas de estado y transiciones, máquinas de estados finitos (FSM) de Mealy y de Moore.",
    html: `<p class="mod">Módulo IV</p><h2>Lo que <em>viene</em></h2>
      <ul class="tags v"><li>latches</li><li>registros</li><li>tablas de estado</li><li>transiciones</li><li>FSM · Mealy · Moore</li></ul>`
  });
  P.push({
    title: "?",
    dwell: 0,
    notes: "El mural queda incompleto: el hilo se corta y solo queda un «?» a pincel. Fundido a negro.",
    html: `<p class="q">?</p><div class="black"></div>`
  });

  const N = P.length;
  const el = html(`<section class="st mural" aria-label="Ending" style="left:${-FW / 2}px;top:${MURAL_Y - FH / 2}px;width:${N * FW}px">
    ${P.map((p, i) => `<div class="panel p${i}" style="left:${i * FW}px">${p.html}</div>`).join("")}
  </section>`);
  world.append(el);
  const panels = $$(".panel", el);

  /* ---------------- lienzos ---------------- */
  const cv = $("#muralInk"), ctx = cv.getContext("2d");
  const ov = $("#tbcInk"), octx = ov.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(1.5, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    for (const c of [cv, ov]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    dirty = true;
  }
  /* grano del papel (pertenece al papel: se mueve con el mural) */
  const grain = (() => {
    const g = document.createElement("canvas"); g.width = g.height = 256;
    const c = g.getContext("2d"), r = INK.rng(77);
    for (let k = 0; k < 2600; k++) {
      c.fillStyle = r() < .55 ? `rgba(40,25,10,${.05 + r() * .09})` : `rgba(255,250,235,${.05 + r() * .1})`;
      c.fillRect(r() * 256, r() * 256, 1 + r() * 1.6, 1 + r() * 1.6);
    }
    c.strokeStyle = "rgba(60,40,20,.06)"; c.lineWidth = 1;
    for (let k = 0; k < 40; k++) { const x = r() * 256, y = r() * 256, a = r() * 6.28, l = 6 + r() * 18; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    return g;
  })();
  const gpat = ctx.createPattern(grain, "repeat"), gpatO = octx.createPattern(grain, "repeat");

  let ART = null;                                   // láminas, se construyen la primera vez
  const art = () => ART || (ART = P.map((_, i) => muralArt(i)));
  const rev = new Array(N).fill(null);             // momento en que empezó a dibujarse cada lámina
  let on = false, raf = 0, lastCam = null, lastTick = -1, dirty = true, frozen = false;

  const tickOf = now => Math.floor(now / (1000 / 12));          // exposición: en dos (12 cuadros/s)
  const boilOf = tick => Math.floor(tick / 2) % INK.VAR;        // cada trazo cambia de dibujo a 6 cuadros/s
  const elapsed = (i, now) => rev[i] == null ? -9 : reduced ? Infinity : (tickOf(now) - tickOf(rev[i])) / 12;

  function paintSheet(c, sh, pal, el, q) {
    for (const it of sh.items) {
      const p = el === Infinity ? 1 : clamp((el - it.t0) / it.d, 0, 1);
      if (p <= 0) continue;
      const col = pal[it.c] || it.c;
      if (it.k === "s") { c.globalAlpha = it.a; c.fillStyle = col; INK.trace(c, it.st, q, p); }
      else if (it.k === "w") {
        c.globalAlpha = it.a * p; c.fillStyle = col;
        const jx = it.dx + (q - 1) * .8 * it.reg, jy = it.dy - (q - 1) * .6 * it.reg;
        c.beginPath(); it.poly.forEach(([x, y], k) => k ? c.lineTo(x + jx, y + jy) : c.moveTo(x + jx, y + jy)); c.closePath(); c.fill();
      } else {
        const J = [[0, 0, 0], [.8, -.6, .004], [-.6, .7, -.004]][q];
        c.save();
        c.globalAlpha = it.a * p;
        c.translate(it.x + J[0] * it.shake, it.y + J[1] * it.shake);
        c.rotate(it.rot + J[2] * it.shake);
        c.font = it.font; c.textAlign = it.al; c.lineJoin = "round";
        if (it.stroke) { c.strokeStyle = pal[it.stroke] || it.stroke; c.lineWidth = it.lw; c.strokeText(it.str, 0, 0); }
        if (it.fill) { c.fillStyle = col; c.fillText(it.str, 0, 0); }
        c.restore();
      }
    }
    c.globalAlpha = 1;
  }

  /* ---------------- el mural ---------------- */
  function draw(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (frozen || Math.abs(cam[1] - MURAL_Y) > FH || cam[2] > FW * 3) return;
    const s = camScale(), tick = reduced ? 0 : tickOf(now), q = boilOf(tick);
    const ox = W / 2 - cam[0] * s, oy = H / 2 - (cam[1] - MURAL_Y) * s;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // papel: un solo pliego que pasa de un tono a otro entre láminas
    const x0 = ox - FW / 2 * s, x1 = ox + (N * FW - FW / 2) * s, gr = ctx.createLinearGradient(x0, 0, x1, 0);
    MURAL_PAL.forEach((p, i) => { gr.addColorStop((i + .06) / N, p.paper); gr.addColorStop((i + .94) / N, p.paper); });
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    gpat.setTransform(new DOMMatrix([s * 1.6, 0, 0, s * 1.6, ox, oy]));
    ctx.fillStyle = gpat; ctx.fillRect(0, 0, W, H);
    const A = art();
    for (let i = 0; i < N; i++) {
      const left = ox + (i * FW - FW / 2) * s;
      if (left > W || left + FW * s < 0) continue;
      const el = elapsed(i, now), pal = MURAL_PAL[i];
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * left, dpr * (oy - FH / 2 * s));
      paintSheet(ctx, A[i].thread, pal, el, q);
      // la ilustración deriva despacio, como el paneo sobre una lámina fija
      const drift = el < 0 ? 0 : -34 * Math.sin(Math.PI / 2 * clamp(el / 10, 0, 1));
      ctx.translate(drift, drift * -.25);
      paintSheet(ctx, A[i].art, pal, el, q);
      if (A[i].art.live && el > A[i].art.end) A[i].art.live(ctx, tick, pal);
      if (i === 0) { ctx.translate(-drift, drift * .25); paintSheet(ctx, TBC_ARROW, pal, Infinity, q); }
    }
    // viñeta de impresión vieja
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.hypot(W, H) * .6);
    vg.addColorStop(0, "rgba(30,15,5,0)"); vg.addColorStop(1, "rgba(30,15,5,.38)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  function loop(now) {
    if (!on) return;
    if (!reduced) raf = requestAnimationFrame(loop);
    const tick = tickOf(now);
    // la cámara se dibuja en cada cuadro; el dibujo (revelado y boil) cambia en dos
    if (cam === lastCam && tick === lastTick && !dirty) return;
    lastCam = cam; lastTick = tick; dirty = false;
    draw(now);
  }
  function start() {
    if (on) { if (reduced) draw(performance.now()); return; }
    on = true; cv.classList.add("on"); resize();
    raf = requestAnimationFrame(loop);
  }

  /* ---------------- cuadro congelado y flecha ---------------- */
  // la flecha va en coordenadas de la lámina 0; aquí se pasa a la pantalla con el encuadre del mural
  function overlayTo(c) {
    const s0 = Math.min(W / FW, H / FH);
    c.setTransform(dpr * s0, 0, 0, dpr * s0, dpr * (W / 2 - FW / 2 * s0), dpr * (H / 2 - FH / 2 * s0));
  }
  function overlayRun(ms, paint) {
    return new Promise(res => {
      const t0 = performance.now();
      let last = -1;
      const f = now => {
        if (!frozen) return res();
        const t = Math.min(1, (now - t0) / ms), tick = tickOf(now - t0);
        if (tick !== last || t >= 1) {
          last = tick;
          octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, ov.width, ov.height);
          paint(ms ? Math.min(1, tick / 12 * 1000 / ms) : 1, boilOf(tickOf(now)));
        }
        if (t < 1) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
  }
  const backOut = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
  // franjas de papel que barren la pantalla (bordes rasgados, siempre los mismos)
  const BANDS = (() => { const r = INK.rng(91); return Array.from({ length: 7 }, (_, b) => ({ delay: [0, .12, .05, .2, .08, .16, .03][b], notch: Array.from({ length: 7 }, () => (r() - .5) * 90) })); })();
  function paintBands(p) {
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.beginPath();
    BANDS.forEach((b, k) => {
      const t = clamp((p - b.delay) / .7, 0, 1), e = -120 + (W + 300) * (t * t * (3 - 2 * t));
      if (t <= 0) return;
      const y0 = k * H / 7 - 8, y1 = (k + 1) * H / 7 + 8;
      octx.moveTo(0, y0); octx.lineTo(e, y0);
      b.notch.forEach((n, j) => octx.lineTo(e + n, y0 + (y1 - y0) * (j + 1) / 8));
      octx.lineTo(e, y1); octx.lineTo(0, y1); octx.closePath();
    });
    octx.fillStyle = MURAL_PAL[0].paper; octx.fill();
    gpatO.setTransform(new DOMMatrix([1.6, 0, 0, 1.6, 0, 0]));
    octx.fillStyle = gpatO; octx.fill();
  }
  function paintArrow(dx, q, lines) {
    overlayTo(octx);
    octx.translate(dx, 0);
    if (lines) for (const [y, l] of [[790, 380], [822, 520], [856, 300]]) {   // líneas de velocidad
      octx.fillStyle = MURAL_PAL[0].ink; octx.globalAlpha = .55;
      octx.fillRect(110 - l - 40, y, l, 4);
    }
    octx.globalAlpha = 1;
    paintSheet(octx, TBC_ARROW, MURAL_PAL[0], Infinity, q);
  }

  /* swap(): app.js cambia, debajo de las franjas, del cuadro congelado al mural */
  async function freeze(swap) {
    art();
    resize();
    frozen = true;
    ov.classList.add("on");
    document.body.classList.add("frozen");
    if (reduced) {
      await overlayRun(0, (_, q) => paintArrow(0, q));
      await wait(0);
    } else {
      await overlayRun(170, () => { octx.setTransform(1, 0, 0, 1, 0, 0); octx.fillStyle = "rgba(255,244,214,.55)"; octx.fillRect(0, 0, ov.width, ov.height); });
      await overlayRun(560, (t, q) => paintArrow(-1150 * (1 - backOut(t)), q, t < .8));
      await overlayRun(2400, (_, q) => paintArrow(0, q));
      await overlayRun(900, (t, q) => { paintBands(t); paintArrow(0, q); });
    }
    if (!frozen) return;                               // se salió durante la animación
    await swap();
    document.body.classList.remove("frozen");
    rev[0] = performance.now();
    frozen = false; dirty = true;
    start();
    if (!reduced) {
      // el papel de encima se desvanece: debajo está el mismo papel, con la flecha en el mismo sitio
      let a = 1;
      await new Promise(res => { const f = () => { a -= 1 / 5; ov.style.opacity = Math.max(0, a); a > 0 ? setTimeout(f, 1000 / 12) : res(); }; f(); });
    }
    ov.classList.remove("on"); ov.style.opacity = "";
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, ov.width, ov.height);
  }

  addEventListener("resize", () => { if (on || frozen) resize(); if(on && reduced) draw(performance.now()); });

  let timer = 0;
  mq.addEventListener("change",()=>{ clearTimeout(timer); if(on){cancelAnimationFrame(raf);dirty=true;raf=requestAnimationFrame(loop);} });
  const api = {
    el,
    views: P.map((_, i) => [i * FW, MURAL_Y, FW]),
    titles: P.map(p => p.title),
    notes: P.map(p => p.notes),
    travel: 1900,
    onAuto: null,
    freeze,
    enter(i) {
      const now = performance.now();
      for (let k = 0; k < i; k++) if (rev[k] == null) rev[k] = -1e9;   // lo anterior ya está dibujado
      if (rev[i] == null) rev[i] = now;
      start(); dirty = true;
      panels.forEach((p, k) => {
        p.classList.toggle("on", k === i);
        p.inert = k !== i;
        p.setAttribute("aria-hidden", k === i ? "false" : "true");
      });
      clearTimeout(timer);
      if (!reduced && P[i].dwell && api.onAuto) timer = setTimeout(() => api.onAuto?.(), P[i].dwell);
    },
    // al salir hacia n, la lámina de destino empieza a dibujarse mientras la cámara viaja
    leave(i, n = i + 1) {
      panels[i]?.classList.add("past");
      if (n >= 0 && n < N && rev[n] == null) rev[n] = performance.now();
    },
    stop() {
      clearTimeout(timer);
      on = false; frozen = false; cancelAnimationFrame(raf);
      document.body.classList.remove("frozen");
      cv.classList.remove("on"); ov.classList.remove("on"); ov.style.opacity = "";
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, ov.width, ov.height);
      rev.fill(null);
      panels.forEach(p => p.classList.remove("on", "past"));
    }
  };
  return api;
}

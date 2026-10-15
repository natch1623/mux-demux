"use strict";
/* =====================================================================
   Tsaritsa · transiciones internas (segunda versión, con detalle de material),
   inspiradas en cuatro habilidades Cryo (adaptación propia, sin arte oficial):
   A. Ventisca de arrastre (Ayaka): un frente de nieve cruza la escena y arrastra
      cada bloque cuando lo alcanza; la nieve oculta el relevo.
   B. Lluvia glacial (Ganyu): una esfera de loto sobre el escenario deja caer
      carámbanos tallados que encapsulan los bloques; la última descarga lo fractura.
   C. Sello de la soberana (Shenhe): un sello con runas y talismanes se dibuja bajo el
      circuito; su anillo recorre la escena, vuelve los bloques siluetas heladas que se
      deshacen en copos y, al cerrarse, deja materializado el contenido nuevo.
   D. Onda de ruptura (Wriothesley): compresión breve y una onda con agujas de hielo
      que parte los bloques en placas con espesor y las lanza siguiendo la onda.
   Detalle: copos dendríticos, niebla de varios lóbulos, esquirlas talladas, racimos
   de cristales, talismanes y destellos (js/mundos/tz-detalle.js).
   Reglas: el cambio de diapositiva (commit) solo con cobertura total; lo que se mueve
   o se deforma es la copia que se va; el contenido nuevo queda quieto y nítido.
   Versiones anteriores: docs/respaldos/trans-tsaritsa-v1.js (escarcha, ventisca,
   cristal, aurora) y trans-tsaritsa-v2-geometrica.js.
   ===================================================================== */
(() => {
  const { el, rng, lienzo, lienzo2d, reloj, ease, tramo, defsHielo, esquirla, ramas, linea, suave, uid } = MAT;
  const { copo, niebla, brillo, esquirla: chip, cristales, talisman, runa, motor } = TZD;

  /* ---------- bloques de la diapositiva (zonas de la retícula) ---------- */
  const ZONAS = [".z-titulo", ".z-expl", ".z-sel", ".z-comp"];
  function zonas(raiz) {
    const box = raiz?.querySelector(".st-in");
    if (!box) return [];
    const lista = ZONAS.map(q => box.querySelector(":scope > " + q)).filter(e => e && e.getClientRects().length)
      .map(e => ({ el: e, r: e.getBoundingClientRect(), tipo: e.classList.contains("z-titulo") ? "titulo" : e.classList.contains("z-comp") ? "circuito" : "panel" }))
      .filter(b => b.r.width > 8 && b.r.height > 8);
    return lista.length ? lista : [{ el: box, r: box.getBoundingClientRect(), tipo: "circuito" }];
  }
  const centro = b => [b.r.left + b.r.width / 2, b.r.top + b.r.height / 2];
  const escala = c => (c.copia ? c.copia.getBoundingClientRect().width / FW : 1) || 1;
  const envolver = (v, a, b) => a + ((((v - a) % (b - a)) + (b - a)) % (b - a));
  const limpiar = lista => lista.forEach(b => { b.el.style.translate = b.el.style.rotate = b.el.style.opacity = b.el.style.filter = ""; });
  // contorno irregular de hielo alrededor de un rectángulo (puntos con salientes)
  function contorno(r, rect, pad) {
    const p = [], L = rect.left - pad, R = rect.right + pad, T = rect.top - pad, B = rect.bottom + pad;
    const lado = (a, b, n, nx, ny) => { for (let i = 0; i < n; i++) { const u = i / n, j = (r() < .3 ? 14 + r() * 16 : r() * 8); p.push([a[0] + (b[0] - a[0]) * u + nx * j, a[1] + (b[1] - a[1]) * u + ny * j]); } };
    const nh = Math.max(3, Math.round((R - L) / 90)), nv = Math.max(2, Math.round((B - T) / 90));
    lado([L, T], [R, T], nh, 0, -1); lado([R, T], [R, B], nv, 1, 0); lado([R, B], [L, B], nh, 0, 1); lado([L, B], [L, T], nv, -1, 0);
    return p;
  }

  /* fractura de una lámina de hielo en piezas con espesor, desde (ox, oy) */
  async function fracturar(svg, m, r, W, H, ox, oy, { n = 6, grieta = 110, vuelo = 340, sale = null, chispas = null } = {}) {
    const D = Math.hypot(W, H);
    const g = el("path", { d: Array.from({ length: n + 1 }, (_, i) => ramas(r, ox, oy, i / (n + 1) * 6.283 + r() * .4, D * .55, 1, .5)).join(""), class: "tz-grieta", pathLength: 1 }, svg);
    await reloj(grieta, t => { g.style.strokeDashoffset = 1 - t; });
    const ang = Array.from({ length: n }, (_, i) => i / n * 6.283 + (r() - .5) * .5);
    const borde = a => [ox + Math.cos(a) * D, oy + Math.sin(a) * D];
    const quiebre = a => [ox + Math.cos(a) * D * .22 + (r() - .5) * 30, oy + Math.sin(a) * D * .22 + (r() - .5) * 30];
    sale?.();
    const piezas = ang.map((a, i) => {
      const b = ang[(i + 1) % n] + (i === n - 1 ? 6.283 : 0);
      return esquirla(svg, [[ox, oy], quiebre(a), borde(a), borde((a + b) / 2), borde(b), quiebre(b)], m, { grosor: 22, r });
    });
    g.remove();
    const vuelos = piezas.map((p, i) => {
      const [cx, cy] = p.c, dx = cx - ox, dy = cy - oy, L = Math.hypot(dx, dy) || 1, empuje = D * (.35 + r() * .2), giro = (r() - .5) * 40;
      return t => { const a = ease.in(t), s0 = tramo(t, 0, .2) * 8; p.style.transform = `translate(${dx / L * (s0 + empuje * a)}px,${dy / L * (s0 + empuje * a) + 260 * a * a}px) rotate(${giro * a}deg) scale(${1 - .15 * a})`; p.style.opacity = 1 - tramo(t, .55, 1); p.arista.style.opacity = .35 + .65 * Math.abs(Math.cos(giro * a * Math.PI / 90 + i)); };
    });
    await reloj(vuelo, t => { vuelos.forEach(v => v(t)); chispas?.(t); });
  }
  function lamina(padre, m, W, H, attrs = {}) {
    const g = el("g", attrs, padre);
    el("rect", { width: W, height: H, fill: "#0C2D47" }, g);
    el("rect", { width: W, height: H, fill: m.cara, opacity: .9 }, g);
    el("rect", { width: W, height: H, fill: m.escarcha, opacity: .95 }, g);
    return g;
  }
  // estallido de hielo: racimo que brota, nube, astillas y destellos
  function estallido(P, r, px, py, t, { tam = 150, astillas = 7, rot = 0, vida = .5 } = {}) {
    P.add({ img: cristales(Math.floor(r() * 4)), x: px, y: py + tam * .1, w: tam, t0: t, vida: Math.max(.1, vida), s0: .05, s1: 1, es: ease.back, rot: rot + (r() - .5) * .5, ay: .92, ent: .05, sal: .25 });
    P.add({ img: niebla(Math.floor(r() * 4)), x: px, y: py, w: tam * 1.6, t0: t, vida: .35, s0: .3, s1: 1.4, es: ease.out, a: .9, ent: .1, sal: .6 });
    for (let i = 0; i < astillas; i++) {
      const a = -Math.PI / 2 + (r() - .5) * 2.6, v = 500 + r() * 900;
      P.add({ img: chip(Math.floor(r() * 4)), x: px, y: py, w: 14 + r() * 22, t0: t, vida: .3 + r() * .15, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 3200, rot: r() * 6, vr: (r() - .5) * 30, ent: .02, sal: .4 });
    }
    for (let i = 0; i < 3; i++) P.add({ img: brillo(), x: px + (r() - .5) * tam * .6, y: py - r() * tam * .6, w: 30 + r() * 30, t0: t + r() * .05, vida: .18, s0: .2, s1: 1, ent: .3, sal: .6 });
  }

  /* ======================================================================
     A. Ventisca de arrastre (1100 ms)
     0–150 polvo, copos y esquirlas indican el viento · 150–600 cada bloque se mueve
     cuando el frente lo alcanza, dejando una estela de nieve (el título gira, el panel
     se inclina, el circuito resiste y sale entero) · 600–800 nieve máxima: relevo ·
     800–1100 el contenido nuevo llega con una pequeña inercia entre los últimos cristales.
     Planos: niebla y nieve fina al fondo, cintas de hielo y copos al medio, esquirlas
     talladas cerca de la cámara. El palacio (fondo) no se mueve.
     ====================================================================== */
  async function ventisca({ commit, instantanea, quitar, dir }) {
    const c = instantanea(), s = dir >= 0 ? -1 : 1, k = escala(c), bl = zonas(c.copia);
    const { cv, x, W, H } = lienzo2d(c), r = rng(dir >= 0 ? 41 : 43), P = motor(cv, x);
    const x0 = s < 0 ? W + 80 : -80;
    const frente = t => x0 + s * (W + 160) * ease.io(tramo(t, .08, .46));
    const MASA = { titulo: .6, panel: .8, circuito: 1.15 };
    bl.forEach(b => { b.borde = s < 0 ? b.r.right : b.r.left; b.t0 = null; b.m = MASA[b.tipo]; b.gira = (r() < .5 ? -1 : 1); b.dx = 0; b.dy = 0; b.vel = 0; });
    const polvo = Array.from({ length: 300 }, () => ({ x: r() * W, y: r() * H, v: 1.5 + r() * 1.1, z: .7 + r() * 1.5, f: r() * 6.283, a: .35 + r() * .5 }));
    const finos = Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * H, v: 1.3 + r() * .9, w: 5 + r() * 8, f: r() * 6.283, rot: r() * 6, vr: (r() - .5) * 8, v2: Math.floor(r() * 4) }));
    const medios = Array.from({ length: 22 }, () => ({ x: r() * W, y: r() * H, v: 1.2 + r() * .7, w: 16 + r() * 22, f: r() * 6.283, rot: r() * 6, vr: (r() - .5) * 6, v2: Math.floor(r() * 4) }));
    const cintas = Array.from({ length: 12 }, () => ({ x: r() * W, y: r() * H, v: 1.1 + r() * .6, l: 180 + r() * 280, amp: (r() - .5) * 120, w: 3 + r() * 6, f: r() * 6.283 }));
    const nubes = Array.from({ length: 14 }, () => ({ x: r() * W, y: H * (.05 + r() * .9), v: .7 + r() * .5, w: 380 + r() * 420, v2: Math.floor(r() * 4), f: r() * 6 }));
    const grandes = Array.from({ length: 7 }, () => ({ x: r() * W, y: H * (.08 + r() * .84), v: 2.2 + r() * 1, w: 60 + r() * 70, rot: r() * 6.283, vr: (r() - .5) * 7, v2: Math.floor(r() * 4), brilla: r() }));
    const dens = t => .22 + .78 * Math.min(1, tramo(t, .1, .5)) - .6 * tramo(t, .8, 1);
    const velo = t => tramo(t, .47, .62) * (1 - tramo(t, .74, .96));
    let hecho = false, nuevos = [];
    try {
      await reloj(1100, t => {
        const f = frente(t), d = dens(t);
        for (const b of bl) {
          if (b.t0 == null && (s < 0 ? f <= b.borde + 40 : f >= b.borde - 40)) {
            b.t0 = t;
            // golpe de viento en el borde del bloque: nube y copos que se desprenden
            for (let i = 0; i < 3; i++) P.add({ img: niebla(i), x: b.borde, y: b.r.top + b.r.height * (.2 + .3 * i), w: 260 + r() * 160, t0: t, vida: .35, vx: s * 900, s0: .5, s1: 1.3, a: .7, sal: .6 });
            for (let i = 0; i < 12; i++) P.add({ img: copo(i % 4), x: b.borde + (r() - .5) * 30, y: b.r.top + r() * b.r.height, w: 8 + r() * 14, t0: t, vida: .3 + r() * .2, vx: s * (700 + r() * 900), vy: (r() - .5) * 200, rot: r() * 6, vr: (r() - .5) * 20 });
          }
          if (b.t0 == null || hecho) continue;
          const u = (t - b.t0) / (.36 * b.m), pesado = b.tipo === "circuito";
          const res = pesado ? .22 : 0, v = clamp((u - res) / (1 - res), 0, 1);
          const temblor = pesado && u < res ? Math.sin(u * 70) * 4 * (1 - u / res) : 0;
          b.dx = s * W * 1.25 * ease.in(v) + s * 14 * ease.out(Math.min(1, u * 3)) + temblor;
          b.dy = b.tipo === "titulo" ? -46 * ease.out(Math.min(1, u)) : b.tipo === "panel" ? 22 * v : 6 * v;
          const rot = b.tipo === "titulo" ? -s * 7 * ease.out(Math.min(1, u)) * b.gira : b.tipo === "panel" ? -s * 5 * v : -s * 1.4 * v;
          b.el.style.translate = `${(b.dx / k).toFixed(1)}px ${(b.dy / k).toFixed(1)}px`;
          b.el.style.rotate = `${rot.toFixed(2)}deg`;
          b.el.style.opacity = (1 - tramo(u, .6, 1.05)).toFixed(3);
          b.vel = v * (1 - tramo(u, .6, 1.05));
        }
        if (!hecho && t >= .63) {
          hecho = true; c.copia.remove(); commit();
          nuevos = zonas($(".st.cur"));
          nuevos.forEach(b => { b.el.style.opacity = 0; });
        }
        if (hecho) nuevos.forEach((b, i) => { const ui = tramo(t, .74 + i * .02, 1), ei = ease.back(ui); b.el.style.translate = `${(-s * 64 * (1 - ei)).toFixed(1)}px 0`; b.el.style.opacity = ease.out(tramo(ui, 0, .55)).toFixed(3); });

        x.clearRect(0, 0, W, H);
        const vv = velo(t);
        if (vv > 0) {
          const g = x.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, `rgba(206,230,247,${vv})`); g.addColorStop(.5, `rgba(228,243,252,${vv})`); g.addColorStop(1, `rgba(192,220,240,${vv})`);
          x.fillStyle = g; x.fillRect(0, 0, W, H);
        }
        // niebla en volumen, arrastrada por el viento
        for (const n of nubes) P.uno(niebla(n.v2), envolver(n.x + s * n.v * W * t, -n.w / 2, W + n.w / 2), n.y + Math.sin(t * 4 + n.f) * 20, n.w, { a: Math.min(1, .35 * d + .9 * vv) });
        // banda del frente, con nubes que ruedan
        const bf = Math.max(0, 1 - tramo(t, .55, .7));
        if (bf > 0) {
          const g = x.createLinearGradient(f - s * 520, 0, f + s * 180, 0);
          g.addColorStop(0, "rgba(234,246,255,0)"); g.addColorStop(.55, `rgba(226,242,253,${.22 * bf})`); g.addColorStop(.8, `rgba(234,246,255,${.4 * bf})`); g.addColorStop(1, "rgba(234,246,255,0)");
          x.fillStyle = g; x.fillRect(0, 0, W, H);
          for (let i = 0; i < 5; i++) P.uno(niebla(i % 4), f + s * 40, H * (i + .5) / 5 + Math.sin(t * 9 + i) * 40, 420, { a: .45 * bf, rot: t * 3 * s + i });
        }
        // estelas de nieve detrás de los bloques arrastrados
        for (const b of bl) {
          if (b.t0 == null || hecho || b.vel < .02) continue;
          const cx = b.borde + b.dx, cy = b.r.top + b.r.height / 2 + b.dy, l = 140 + 560 * b.vel, hh = Math.min(b.r.height, 420);
          for (let i = 0; i < 5; i++) P.uno(niebla(i % 4), cx - s * l * i / 5, cy + (i % 2 ? -1 : 1) * hh * .18, hh * (1.1 - i * .12), { a: .6 * b.vel * (1 - i / 5), rot: i + t * 2 });
        }
        // nieve fina
        x.fillStyle = "#F2FBFF";
        for (const p of polvo) { x.globalAlpha = p.a * d; x.fillRect(envolver(p.x + s * p.v * W * t, -20, W + 20), p.y + Math.sin(t * 8 + p.f) * 10 + 30 * t, p.z * 2.4, p.z); }
        x.globalAlpha = 1;
        for (const p of finos) P.uno(copo(p.v2), envolver(p.x + s * p.v * W * t, -20, W + 20), p.y + Math.sin(t * 7 + p.f) * 14, p.w, { rot: p.rot + p.vr * t, a: .85 * d });
        // cintas curvas de hielo
        x.lineCap = "round";
        for (const p of cintas) {
          const px = envolver(p.x + s * p.v * W * t, -400, W + 400), py = p.y + Math.sin(t * 5 + p.f) * 18, ex = px - s * p.l;
          const g = x.createLinearGradient(px, 0, ex, 0); g.addColorStop(0, `rgba(240,250,255,${.75 * d})`); g.addColorStop(1, "rgba(200,232,252,0)");
          x.strokeStyle = g; x.lineWidth = p.w;
          x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px - s * p.l * .5, py + p.amp, ex, py + p.amp * .3); x.stroke();
          x.strokeStyle = `rgba(255,255,255,${.9 * d})`; x.lineWidth = 1;
          x.beginPath(); x.moveTo(px, py - p.w * .3); x.quadraticCurveTo(px - s * p.l * .5, py + p.amp - p.w * .3, px - s * p.l * .7, py + p.amp * .4); x.stroke();
        }
        for (const p of medios) P.uno(copo(p.v2), envolver(p.x + s * p.v * W * t, -40, W + 40), p.y + Math.sin(t * 5 + p.f) * 24, p.w, { rot: p.rot + p.vr * t, a: .95 * d });
        P.draw(t);
        // esquirlas talladas cerca de la cámara, con destello al girar
        for (const p of grandes) {
          const px = envolver(p.x + s * p.v * W * t, -140, W + 140), py = p.y + Math.sin(t * 3 + p.rot) * 30, ro = p.rot + p.vr * t;
          P.uno(chip(p.v2), px, py, p.w, { rot: ro, a: Math.min(1, d * 1.2) * .9 });
          const gl = Math.max(0, Math.sin(ro * 2 + p.brilla * 6));
          if (gl > .85) P.uno(brillo(), px - p.w * .2, py - p.w * .15, p.w * .9, { a: (gl - .85) / .15 * d });
        }
      });
    } finally { limpiar(nuevos); quitar(c); }
  }

  /* ======================================================================
     B. Lluvia glacial (1000 ms + fractura)
     Una esfera de loto aparece sobre el escenario; los carámbanos tallados caen con
     estela y, al impactar, brotan racimos de cristales y el bloque queda encapsulado en
     hielo irregular; la última descarga cae al centro, el hielo cubre la escena y se
     fractura: entre los fragmentos aparece la siguiente.
     ====================================================================== */
  async function lluvia({ commit, instantanea, quitar, dir }) {
    const c = instantanea(), { svg, defs, W, H } = lienzo(c), m = defsHielo(defs), r = rng(dir >= 0 ? 7 : 19);
    const { cv, x } = lienzo2d(c), P = motor(cv, x);
    const D = Math.hypot(W, H), bl = zonas(c.copia);
    const O = [W * (.5 + (r() - .5) * .1), H * .13];
    // ---- la esfera: aura, círculo rúnico, pétalos de loto y núcleo
    const hid = uid("tzl"), rg = el("radialGradient", { id: hid }, defs);
    [[0, "#F2FBFF", .95], [.35, "#9FD4FF", .5], [1, "#9FD4FF", 0]].forEach(([o, col, op]) => el("stop", { offset: o, "stop-color": col, "stop-opacity": op }, rg));
    const pid = uid("tzp"), pg = el("linearGradient", { id: pid, x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    [[0, "#5FA5D6", .85], [.6, "#CFEAFB", .9], [1, "#FFFFFF", .95]].forEach(([o, col, op]) => el("stop", { offset: o, "stop-color": col, "stop-opacity": op }, pg));
    const esf = el("g", { class: "tz-esfera" }, svg);
    const halo = el("circle", { cx: O[0], cy: O[1], r: 120, fill: `url(#${hid})` }, esf);
    const ruedaRunas = el("g", {}, esf);
    el("circle", { cx: O[0], cy: O[1], r: 78, class: "tz-anillo-fino oro" }, ruedaRunas);
    el("circle", { cx: O[0], cy: O[1], r: 70, class: "tz-anillo-fino" }, ruedaRunas);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; el("path", { d: runa(r), class: "tz-glifo", transform: `translate(${(O[0] + Math.cos(a) * 74).toFixed(1)} ${(O[1] + Math.sin(a) * 74).toFixed(1)}) rotate(${(a * 180 / Math.PI + 90).toFixed(1)}) scale(.55)` }, ruedaRunas); }
    const loto = el("g", {}, esf);
    for (let i = 0; i < 8; i++) el("path", { d: "M0 0C11 -14 12 -40 0 -56C-12 -40 -11 -14 0 0Z", fill: `url(#${pid})`, class: "tz-petalo", transform: `translate(${O[0]} ${O[1]}) rotate(${i * 45})` }, loto);
    for (let i = 0; i < 8; i++) el("path", { d: "M0 0C7 -10 8 -26 0 -36C-8 -26 -7 -10 0 0Z", fill: `url(#${pid})`, class: "tz-petalo", transform: `translate(${O[0]} ${O[1]}) rotate(${i * 45 + 22.5})` }, loto);
    el("circle", { cx: O[0], cy: O[1], r: 15, fill: "#F6FCFF", class: "tz-nucleo" }, esf);
    el("path", { d: flakePath(O[0], O[1], 12), class: "tz-flor" }, esf);
    // ---- cápsulas de hielo irregular (facetas, escarcha y grietas)
    bl.forEach(b => {
      const g = el("g", { opacity: 0 }, svg), p = contorno(r, b.r, 14), dP = suave(p, true);
      el("path", { d: dP, fill: m.cara, opacity: .55 }, g);
      el("path", { d: dP, fill: m.escarcha, opacity: .7 }, g);
      const ints = [0, 1, 2].map(() => [b.r.left + b.r.width * (.2 + r() * .6), b.r.top + b.r.height * (.2 + r() * .6)]);
      el("path", { d: p.map((q, i) => `M${ints[i % 3][0].toFixed(1)} ${ints[i % 3][1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(""), class: "tz-faceta" }, g);
      el("path", { d: dP, class: "tz-capsula-borde" }, g);
      el("path", { d: ramas(r, b.r.left + b.r.width * .3, b.r.top, 1.3, b.r.height * .9, 2, .6), class: "tz-rama", pathLength: 1, style: "stroke-dashoffset:0" }, g);
      b.cap = g; b.hit = null; b.esq = [p[0], p[Math.floor(p.length / 2)]];
    });
    // ---- carámbanos tallados (cara clara, cara oscura, arista y grieta)
    const carambano = (L, w) => {
      const g = el("g", { opacity: 0 }, svg);
      el("path", { d: `M0 ${-w / 2}L${L * .8} ${-w * .3}L${L} 0L${L * .8} ${w * .3}L0 ${w / 2}L${-L * .1} 0Z`, fill: m.cara, class: "tz-carambano" }, g);
      el("path", { d: `M${-L * .1} 0L0 ${-w / 2}L${L * .8} ${-w * .3}L${L} 0Z`, fill: "#FFFFFF", opacity: .38 }, g);
      el("path", { d: `M${-L * .1} 0L0 ${w / 2}L${L * .8} ${w * .3}L${L} 0Z`, fill: "#1D4F7E", opacity: .35 }, g);
      el("path", { d: `M${-L * .05} 0L${L * .97} 0M${L * .3} ${-w * .2}L${L * .45} ${w * .05}L${L * .55} ${-w * .1}`, class: "tz-carambano-arista" }, g);
      return g;
    };
    const obj = bl.flatMap(b => [[b.r.left + b.r.width * (.15 + r() * .25), b.r.top + b.r.height * (.1 + r() * .3)], [b.r.left + b.r.width * (.55 + r() * .3), b.r.top + b.r.height * (.45 + r() * .4)]].map(p => ({ p, b })));
    obj.sort(() => r() - .5);
    const n = obj.length;
    obj.forEach((o, i) => { o.t0 = .16 + .34 * (n > 1 ? i / (n - 1) : 0); o.ic = carambano(84, 17); o.de = [O[0] + (r() - .5) * 150, O[1] + 24]; o.cayo = false; });
    const C = [W / 2, H / 2], gran = carambano(230, 46);
    // ---- lámina final: frente de escarcha irregular desde el centro
    const cid = uid("tzlc"), cp = el("clipPath", { id: cid, clipPathUnits: "userSpaceOnUse" }, defs), frente = el("path", { d: "M0 0Z" }, cp);
    const lam = lamina(svg, m, W, H, { "clip-path": `url(#${cid})` });
    const ruido = Array.from({ length: 3 }, () => r() * 6);
    const forma = R => { const p = []; for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283, q = R * (1 + .08 * Math.sin(a * 7 + ruido[0]) + .05 * Math.sin(a * 13 + ruido[1])); p.push([C[0] + Math.cos(a) * q, C[1] + Math.sin(a) * q]); } return suave(p); };
    const ondaC = el("circle", { cx: C[0], cy: C[1], r: 0, class: "tz-onda-anillo", opacity: 0 }, svg);
    const destello = el("rect", { width: W, height: H, fill: "#F7FCFF", opacity: 0 }, svg);
    svg.append(esf);
    const pose = (ic, de, a, u, L) => { const px = de[0] + (a[0] - de[0]) * u, py = de[1] + (a[1] - de[1]) * u, ang = Math.atan2(a[1] - de[1], a[0] - de[0]) * 180 / Math.PI; ic.setAttribute("transform", `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${ang.toFixed(1)}) translate(${-L} 0)`); return [px, py]; };
    let hecho = false, granCayo = false;
    // partículas que orbitan la esfera
    const orbitas = Array.from({ length: 12 }, (_, i) => ({ img: i % 3 ? brillo() : copo(i % 4), w: 10 + r() * 14, a0: r() * 6.283, R: 95 + r() * 45, v: 6 + r() * 4 }));
    try {
      await reloj(1000, t => {
        const ap = ease.back(tramo(t, 0, .16)), late = 1 + .05 * Math.sin(t * 40) * tramo(t, .1, .6);
        esf.setAttribute("transform", `translate(${O[0]} ${O[1]}) scale(${(ap * late).toFixed(3)}) translate(${-O[0]} ${-O[1]})`);
        const ve = 1 - tramo(t, .72, .86);
        esf.style.opacity = ve;
        ruedaRunas.setAttribute("transform", `rotate(${(t * 140).toFixed(1)} ${O[0]} ${O[1]})`);
        loto.setAttribute("transform", `rotate(${(-t * 60).toFixed(1)} ${O[0]} ${O[1]})`);
        halo.setAttribute("r", (120 + 50 * tramo(t, .5, .66)).toFixed(1));
        x.clearRect(0, 0, W, H);
        orbitas.forEach(o => { const a = o.a0 + o.v * t; P.uno(o.img, O[0] + Math.cos(a) * o.R * ap, O[1] + Math.sin(a) * o.R * .5 * ap, o.w, { a: .9 * ve * tramo(t, .04, .14) }); });
        for (const o of obj) {
          const u = tramo(t, o.t0, o.t0 + .1);
          o.ic.setAttribute("opacity", u > 0 && u < 1 ? 1 : 0);
          if (u > 0 && u < 1) {
            const [px, py] = pose(o.ic, o.de, o.p, ease.in(u), 84);
            P.add({ img: r() < .5 ? brillo() : niebla(0), x: px, y: py, w: r() < .5 ? 16 : 70, t0: t, vida: .12, a: .7, ent: .1, sal: .8 });
          }
          if (u >= 1 && !o.cayo) {
            o.cayo = true; if (o.b.hit == null) o.b.hit = t;
            estallido(P, r, o.p[0], o.p[1], t, { tam: 120 + r() * 60, vida: .8 - t });
          }
        }
        bl.forEach(b => {
          if (b.hit == null) return;
          b.cap.setAttribute("opacity", ease.out(tramo(t, b.hit, b.hit + .07)).toFixed(3));
          if (!b.picos) { b.picos = true; b.esq.forEach(([px, py], i) => P.add({ img: cristales(i + 1), x: px, y: py + 10, w: 90 + r() * 40, t0: t, vida: Math.max(.1, .8 - t), s0: .1, s1: 1, es: ease.back, rot: (i ? 2.6 : -.5) + (r() - .5) * .4, ay: .92, ent: .05, sal: .05 })); }
        });
        // la última descarga
        const ug = tramo(t, .56, .66);
        gran.setAttribute("opacity", ug > 0 && ug < 1 ? 1 : 0);
        if (ug > 0 && ug < 1) { const [px, py] = pose(gran, O, C, ease.in(ug), 230); for (let i = 0; i < 2; i++) P.add({ img: niebla(i), x: px + (r() - .5) * 30, y: py - 80, w: 130, t0: t, vida: .15, a: .6, sal: .8 }); }
        if (ug >= 1 && !granCayo) { granCayo = true; estallido(P, r, C[0], C[1] + 40, t, { tam: 380, astillas: 16, vida: .3 }); }
        frente.setAttribute("d", forma(Math.max(1, D * ease.out(tramo(t, .66, .77)))));
        const uo = tramo(t, .66, .8); ondaC.setAttribute("r", (D * .6 * ease.out(uo)).toFixed(1)); ondaC.setAttribute("opacity", uo > 0 && uo < 1 ? (1 - uo).toFixed(2) : 0);
        destello.setAttribute("opacity", (.75 * Math.sin(Math.PI * tramo(t, .66, .8))).toFixed(3));
        P.draw(t);
        if (!hecho && t >= .78) { hecho = true; c.copia.remove(); commit(); }
      });
      if (!hecho) { hecho = true; c.copia.remove(); commit(); }
      destello.remove(); ondaC.remove(); x.clearRect(0, 0, W, H);
      // fractura con astillas y destellos que salen de las grietas
      const Q = motor(cv, x);
      for (let i = 0; i < 26; i++) { const a = r() * 6.283, v = 600 + r() * 1400; Q.add({ img: i % 3 ? chip(i % 4) : brillo(), x: C[0] + Math.cos(a) * 60, y: C[1] + Math.sin(a) * 60, w: 14 + r() * 26, t0: r() * .2, vida: .6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 2600, rot: r() * 6, vr: (r() - .5) * 20, ent: .05 }); }
      await fracturar(svg, m, r, W, H, C[0], C[1], { n: 7, grieta: 110, vuelo: 360, sale: () => { lam.remove(); bl.forEach(b => b.cap.remove()); }, chispas: t => { x.clearRect(0, 0, W, H); Q.draw(t); } });
    } finally { if (!hecho) commit(); quitar(c); }
  }

  /* ======================================================================
     C. Sello de la soberana (1150 ms)
     El sello (anillos con marcas, banda de runas, hexagrama, pétalos y flor) se dibuja
     bajo el circuito; ocho talismanes giran a su alrededor. El anillo, con runas y
     agujas de hielo, recorre la escena: los bloques se vuelven siluetas heladas que
     se deshacen en copos. Cubierta la escena, cambia la diapositiva; el anillo vuelve,
     se cierra sobre el sello y el contenido nuevo se materializa a su paso.
     ====================================================================== */
  async function sello({ commit, instantanea, quitar }) {
    const c = instantanea(), { svg, defs, W, H } = lienzo(c), m = defsHielo(defs), r = rng(5);
    const { cv, x } = lienzo2d(c), P = motor(cv, x);
    const bl = zonas(c.copia), comp = bl.find(b => b.tipo === "circuito");
    const C = comp ? centro(comp) : [W / 2, H / 2];
    const D = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([a, b]) => Math.hypot(a - C[0], b - C[1]))) + 80;
    const R0 = Math.min(160, Math.min(W, H) * .17);
    const cid = uid("tzs"), cp = el("clipPath", { id: cid, clipPathUnits: "userSpaceOnUse" }, defs), circ = el("circle", { cx: C[0], cy: C[1], r: 0 }, cp);
    const niebla0 = lamina(svg, m, W, H, { "clip-path": `url(#${cid})`, opacity: 0 });
    // ---- el sello
    const sg = el("g", { class: "tz-sello" }, svg);
    const P2 = (a, R) => [C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R];
    const tri = (a0, R) => linea([0, 1, 2, 0].map(i => P2(a0 + i * 2.094, R)));
    const marcas = Array.from({ length: 72 }, (_, i) => { const a = i / 72 * 6.283, l = i % 6 ? .05 : .1; const [x1, y1] = P2(a, R0 * 1.2), [x2, y2] = P2(a, R0 * (1.2 + l)); return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`; }).join("");
    const petalos = Array.from({ length: 12 }, (_, i) => { const a = i / 12 * 6.283, [px, py] = P2(a, R0 * .55), [qx, qy] = P2(a, R0 * .74), nx = Math.cos(a + 1.57) * R0 * .06, ny = Math.sin(a + 1.57) * R0 * .06, mx = (px + qx) / 2, my = (py + qy) / 2; return `M${px.toFixed(1)} ${py.toFixed(1)}Q${(mx + nx).toFixed(1)} ${(my + ny).toFixed(1)} ${qx.toFixed(1)} ${qy.toFixed(1)}Q${(mx - nx).toFixed(1)} ${(my - ny).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}Z`; }).join("");
    // halo de los trazos (el mismo dibujo, ancho y tenue: brillo sin filtros)
    const resplandor = el("g", { class: "tz-sello-halo" }, sg);
    [R0, R0 * 1.12].forEach(R => el("circle", { cx: C[0], cy: C[1], r: R }, resplandor));
    const trazos = [
      el("circle", { cx: C[0], cy: C[1], r: R0 * 1.32, class: "hielo fino", pathLength: 1 }, sg),
      el("path", { d: marcas, class: "oro fino", pathLength: 1 }, sg),
      el("circle", { cx: C[0], cy: C[1], r: R0 * 1.12, class: "hielo", pathLength: 1 }, sg),
      el("circle", { cx: C[0], cy: C[1], r: R0, class: "oro", pathLength: 1 }, sg),
      el("circle", { cx: C[0], cy: C[1], r: R0 * .82, class: "hielo", pathLength: 1 }, sg),
      el("path", { d: tri(-Math.PI / 2, R0 * .8) + tri(Math.PI / 2, R0 * .8), class: "hielo", pathLength: 1 }, sg),
      el("path", { d: petalos, class: "oro", pathLength: 1 }, sg),
      el("path", { d: flakePath(C[0], C[1], R0 * .42), class: "oro", pathLength: 1 }, sg)];
    // banda de runas entre R0 y 1.12·R0 (gira)
    const giro = el("g", {}, sg);
    for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283, [px, py] = P2(a, R0 * 1.06); el("path", { d: runa(r), class: "tz-glifo", transform: `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${(a * 180 / Math.PI + 90).toFixed(1)}) scale(.7)` }, giro); }
    // ---- el anillo viajero: tres círculos, banda de runas y rombos
    const an = el("g", { class: "tz-anillo", opacity: 0 }, svg);
    const a1 = el("circle", { cx: C[0], cy: C[1], r: R0 }, an), a2 = el("circle", { cx: C[0], cy: C[1], r: R0, class: "oro" }, an), a3 = el("circle", { cx: C[0], cy: C[1], r: R0, class: "punteado" }, an);
    const glifos = Array.from({ length: 28 }, () => el("path", { d: runa(r), class: "tz-glifo" }, an));
    const runas = Array.from({ length: 8 }, () => el("path", { d: "M0 -16L10 0L0 16L-10 0Z", class: "tz-runa" }, an));
    // ---- talismanes: giran alrededor del sello y luego viajan con el anillo
    const tals = Array.from({ length: 8 }, (_, i) => ({ img: talisman(i % 4), a0: i / 8 * 6.283, f: r() * 6 }));
    bl.forEach(b => { const [x0, y0] = centro(b); b.d = Math.hypot(x0 - C[0], y0 - C[1]); b.t0 = null; });
    let hecho = false, nuevos = [], cerrado = false;
    const radio = t => t < .62 ? R0 + (D - R0) * ease.io(tramo(t, .22, .62)) : D + (R0 - D) * ease.io(tramo(t, .62, .9));
    try {
      await reloj(1150, t => {
        const dib = ease.out(tramo(t, 0, .26));
        trazos.forEach((p, i) => { p.style.strokeDashoffset = (1 - clamp(dib * 1.6 - i * .08, 0, 1)).toFixed(3); });
        resplandor.style.opacity = (.6 * dib * (1 - tramo(t, .9, 1))).toFixed(3);
        giro.style.opacity = tramo(t, .12, .28);
        giro.setAttribute("transform", `rotate(${(t * 90).toFixed(1)} ${C[0]} ${C[1]})`);
        sg.style.opacity = 1 - tramo(t, .92, 1);
        const R = radio(t);
        an.setAttribute("opacity", (tramo(t, .2, .26) * (1 - tramo(t, .88, .94))).toFixed(3));
        a1.setAttribute("r", R.toFixed(1)); a2.setAttribute("r", Math.max(1, R - 14).toFixed(1)); a3.setAttribute("r", Math.max(1, R - 30).toFixed(1));
        glifos.forEach((e, i) => { const a = i / 28 * 6.283 - t * 2; e.setAttribute("transform", `translate(${(C[0] + Math.cos(a) * (R - 22)).toFixed(1)} ${(C[1] + Math.sin(a) * (R - 22)).toFixed(1)}) rotate(${(a * 180 / Math.PI + 90).toFixed(1)}) scale(.8)`); });
        runas.forEach((e, i) => { const a = i / 8 * 6.283 + t * 3.2; e.setAttribute("transform", `translate(${(C[0] + Math.cos(a) * (R - 7)).toFixed(1)} ${(C[1] + Math.sin(a) * (R - 7)).toFixed(1)}) rotate(${(a * 180 / Math.PI + 90).toFixed(1)})`); });
        const fr = t < .62 ? R : R * (1 - tramo(t, .9, 1));
        circ.setAttribute("r", Math.max(0, fr).toFixed(1));
        niebla0.setAttribute("opacity", (t < .62 ? .3 + .7 * tramo(t, .4, .62) : 1).toFixed(3));
        if (!hecho) for (const b of bl) {
          if (b.t0 == null && R >= b.d && t >= .22) {
            b.t0 = t; b.el.style.filter = "grayscale(1) sepia(1) hue-rotate(165deg) saturate(2.2) brightness(1.35) contrast(.85)";
            // la silueta se deshace en copos y destellos
            for (let i = 0; i < 34; i++) { const px = b.r.left + r() * b.r.width, py = b.r.top + r() * b.r.height, a = Math.atan2(py - C[1], px - C[0]); P.add({ img: i % 4 ? copo(i % 4) : brillo(), x: px, y: py, w: 8 + r() * 16, t0: t + .06 + r() * .12, vida: .3 + r() * .15, vx: Math.cos(a) * (150 + r() * 250), vy: Math.sin(a) * (150 + r() * 250) - 180, rot: r() * 6, vr: (r() - .5) * 8, ent: .2, sal: .5 }); }
          }
          if (b.t0 == null) continue;
          b.el.style.opacity = (1 - ease.in(tramo(t, b.t0, b.t0 + .2))).toFixed(3);
        }
        if (!hecho && t >= .62) {
          hecho = true; c.copia.remove(); commit();
          nuevos = zonas($(".st.cur"));
          nuevos.forEach(b => { const [x0, y0] = centro(b); b.d = Math.hypot(x0 - C[0], y0 - C[1]); b.t0 = null; b.el.style.opacity = 0; });
        }
        if (hecho) for (const b of nuevos) {
          if (b.t0 == null && (R <= b.d || t >= .9)) { b.t0 = t; for (let i = 0; i < 10; i++) P.add({ img: brillo(), x: b.r.left + r() * b.r.width, y: b.r.top + r() * b.r.height, w: 18 + r() * 24, t0: t + r() * .05, vida: .14, ent: .3, sal: .6, a: .9 }); }
          b.el.style.opacity = b.t0 == null ? 0 : ease.out(tramo(t, b.t0, b.t0 + .1)).toFixed(3);
        }
        // ---- lienzo: agujas de hielo en el anillo, niebla en su borde interior, talismanes
        x.clearRect(0, 0, W, H);
        const va = tramo(t, .22, .3) * (1 - tramo(t, .86, .94));
        if (va > 0) {
          for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283 + t * 1.2; P.uno(cristales(i % 4), C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R, 70 + (i % 3) * 14, { rot: a + Math.PI / 2, a: .9 * va, ay: .92 }); }
          if (r() < .5) { const a = r() * 6.283; P.add({ img: niebla(Math.floor(r() * 4)), x: C[0] + Math.cos(a) * (R - 30), y: C[1] + Math.sin(a) * (R - 30), w: 110 + r() * 70, t0: t, vida: .1, a: .3, sal: .7 }); }
        }
        tals.forEach((q, i) => {
          const ve = tramo(t, .04 + i * .015, .16 + i * .015) * (1 - tramo(t, .82, .9));
          if (ve <= 0) return;
          const pre = t < .22, Rt = pre ? R0 * (1.5 + .2 * Math.sin(t * 20 + i)) : Math.max(R0 * 1.5, R + 40);
          const a = q.a0 + t * 4.5, px = C[0] + Math.cos(a) * Rt, py = C[1] + Math.sin(a) * Rt * (pre ? .62 : 1) - (pre ? 40 * (1 - ve) : 0);
          x.save(); x.globalAlpha = ve; x.translate(px, py); x.rotate(a + Math.PI / 2 + .25 * Math.sin(t * 30 + q.f)); x.scale(Math.cos(t * 22 + q.f) * .35 + .65, 1);
          x.drawImage(q.img, -21, -58, 42, 116); x.restore();
        });
        if (t >= .88 && !cerrado) { cerrado = true; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; P.add({ img: i % 2 ? brillo() : copo(i % 4), x: C[0] + Math.cos(a) * R0, y: C[1] + Math.sin(a) * R0, w: 14 + r() * 18, t0: t, vida: .12, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, ent: .1, sal: .6 }); } }
        P.draw(t);
      });
    } finally { limpiar(nuevos); if (!hecho) commit(); quitar(c); }
  }

  /* ======================================================================
     D. Onda de ruptura (1000 ms + franjas)
     Compresión: esquirlas y escarcha convergen al punto de impacto y el núcleo se
     carga. La onda (filo blanco, banda de hielo, agujas que brotan en su frente y
     niebla) atraviesa la diapositiva; al alcanzar cada bloque lo parte en dos placas
     con espesor que salen impulsadas entre astillas. Detrás queda una lámina de hielo
     agrietada (cobertura total); cambia la diapositiva y la lámina se abre en franjas.
     ====================================================================== */
  async function onda({ commit, instantanea, quitar, dir }) {
    const c = instantanea(), s = dir >= 0 ? -1 : 1, k = escala(c);
    const cr = c.copia ? c.copia.getBoundingClientRect() : { left: 0, top: 0 };
    const { svg, defs, W, H } = lienzo(c), m = defsHielo(defs), r = rng(dir >= 0 ? 29 : 31);
    const { cv, x } = lienzo2d(c), P = motor(cv, x);
    const bl = zonas(c.copia);
    const ix = s < 0 ? W * .93 : W * .07, iy = H * .5;
    const capaPl = html('<div class="tz-placas"></div>'); c.append(capaPl);
    const loc = (X, Y) => `${((X - cr.left) / k).toFixed(1)}px ${((Y - cr.top) / k).toFixed(1)}px`;
    bl.forEach((b, bi) => {
      const cx = b.r.left + b.r.width * (.42 + r() * .16), pad = 30;
      const corte = Array.from({ length: 6 }, (_, i) => [cx + (r() - .5) * b.r.width * .14, b.r.top - pad + (b.r.height + 2 * pad) * i / 5]);
      const L = b.r.left - pad, R = b.r.right + pad, T = b.r.top - pad, B = b.r.bottom + pad;
      const polis = [[[L, T], ...corte, [L, B]], [[R, T], ...corte, [R, B]]];
      b.corte = corte;
      b.placas = polis.map((poly, pi) => {
        const w = html('<div class="tz-placa"></div>');
        w.style.filter = `drop-shadow(${(-s * 8).toFixed(0)}px 11px 0 rgba(10,36,58,.95)) drop-shadow(0 0 1.5px #EAF6FF)`;
        const cl = c.copia.cloneNode(true);
        cl.querySelector(".st-bg")?.remove();
        const idx = [...c.copia.querySelectorAll(".st-in > *")].indexOf(b.el);
        if (idx >= 0) [...cl.querySelectorAll(".st-in > *")].forEach((e, i) => { if (i !== idx) e.style.visibility = "hidden"; });
        cl.style.clipPath = `polygon(${poly.map(([X, Y]) => loc(X, Y)).join(",")})`;
        w.append(cl); w.hidden = true; capaPl.append(w);
        const pc = poly.reduce((a, q) => [a[0] + q[0] / poly.length, a[1] + q[1] / poly.length], [0, 0]);
        w.style.transformOrigin = `${pc[0].toFixed(1)}px ${pc[1].toFixed(1)}px`;
        return { w, vy: (pi - .5) * (90 + r() * 80) + (r() - .5) * 40, giro: (pi ? 1 : -1) * (8 + r() * 10) * (bi % 2 ? 1 : -1), vel: 1.25 + r() * .35 };
      });
      b.borde = s < 0 ? b.r.right : b.r.left; b.t0 = null;
    });
    // compresión: esquirlas y copos que convergen al núcleo
    for (let i = 0; i < 22; i++) { const a = r() * 6.283, d0 = 300 + r() * 320; P.add({ img: i % 3 ? chip(i % 4) : copo(i % 4), x: ix + Math.cos(a) * d0, y: iy + Math.sin(a) * d0, w: 14 + r() * 26, t0: r() * .04, vida: .17, vx: -Math.cos(a) * d0 / .17, vy: -Math.sin(a) * d0 / .17, rot: r() * 6, vr: (r() - .5) * 20, ent: .3, sal: .2 }); }
    const nucleo = el("circle", { cx: ix, cy: iy, r: 0, fill: m.cara, class: "tz-capsula" }, svg);
    const anilloSuelo = el("ellipse", { cx: ix, cy: iy + 40, rx: 0, ry: 0, class: "tz-anillo-suelo" }, svg);
    const lam = lamina(svg, m, W, H);
    const lamClip = uid("tzo"), cp = el("clipPath", { id: lamClip, clipPathUnits: "userSpaceOnUse" }, defs), forma = el("path", {}, cp);
    lam.setAttribute("clip-path", `url(#${lamClip})`);
    // grietas en la lámina recién formada (siguen a la onda)
    const grLam = el("path", { d: Array.from({ length: 16 }, (_, i) => ramas(r, s < 0 ? W - r() * W * .6 : r() * W * .6, H * (i + .5) / 16, (s < 0 ? Math.PI : 0) + (r() - .5) * .8, W * (.18 + r() * .18), 3, .9)).join(""), class: "tz-rama tz-rama-lamina", pathLength: 1, "clip-path": `url(#${lamClip})` }, svg);
    const banda2 = el("path", { class: "tz-onda-banda2" }, svg), banda = el("path", { class: "tz-onda-banda", stroke: m.cara }, svg), filo = el("path", { class: "tz-onda-filo" }, svg);
    const choque = el("circle", { cx: ix, cy: iy, r: 0, class: "tz-onda-anillo", opacity: 0 }, svg);
    svg.append(nucleo);
    const xa = s < 0 ? W + 60 : -60, alcance = W + 420;
    const frenteX = t => xa + s * alcance * ease.in(tramo(t, .2, .62)) ** .8;
    const curva = f => { const p = []; for (let i = 0; i <= 12; i++) { const y = -40 + (H + 80) * i / 12, q = (y - iy) / H; p.push([f - s * 220 * q * q * 2.2, y]); } return p; };
    let hecho = false, solto = false;
    try {
      await reloj(1000, t => {
        const comp = tramo(t, 0, .18), suelta = tramo(t, .18, .3);
        const esc = t < .18 ? 1 - .03 * ease.in(comp) : 1 - .03 * (1 - ease.back(suelta));
        c.style.transformOrigin = `${ix}px ${iy}px`; c.style.transform = `scale(${esc.toFixed(4)})`;
        nucleo.setAttribute("r", (t < .2 ? 14 + 34 * ease.in(comp) : 48 * (1 - tramo(t, .2, .28))).toFixed(1));
        const rs = 260 * (1 - ease.in(comp)); anilloSuelo.setAttribute("rx", (t < .2 ? rs : 0).toFixed(1)); anilloSuelo.setAttribute("ry", (t < .2 ? rs * .25 : 0).toFixed(1));
        const uc = tramo(t, .19, .34); choque.setAttribute("r", (700 * ease.out(uc)).toFixed(1)); choque.setAttribute("opacity", uc > 0 && uc < 1 ? (1 - uc).toFixed(2) : 0);
        if (t >= .18 && !solto) { solto = true; estallido(P, r, ix, iy + 30, t, { tam: 260, astillas: 14, rot: -s * Math.PI / 2, vida: .3 }); }
        // la onda
        const f = frenteX(t), p = curva(f), dF = linea(p);
        const activa = t > .19 && t < .66;
        filo.setAttribute("d", activa ? dF : "");
        banda.setAttribute("d", activa ? linea(p.map(([a, b]) => [a + s * 34, b])) : "");
        banda2.setAttribute("d", activa ? linea(p.map(([a, b]) => [a + s * 90, b])) : "");
        forma.setAttribute("d", t > .19 ? `${dF}L${xa - s * 400} ${H + 40}L${xa - s * 400} -40Z` : "M0 0Z");
        grLam.style.strokeDashoffset = (1 - ease.out(tramo(t, .22, .66))).toFixed(3);
        if (activa) for (let i = 0; i < 3; i++) {
          const j = Math.floor(r() * 13), [px, py] = p[j];
          P.add({ img: niebla(j % 4), x: px + s * 30, y: py, w: 180 + r() * 140, t0: t, vida: .12, vx: s * 1600, a: .5, sal: .7 });
          if (r() < .6) P.add({ img: chip(j % 4), x: px, y: py + (r() - .5) * 40, w: 12 + r() * 18, t0: t, vida: .2, vx: s * (1800 + r() * 1400), vy: (r() - .5) * 900, g: 1800, rot: r() * 6, vr: (r() - .5) * 25, ent: .02 });
        }
        // los bloques se parten al llegar la onda
        for (const b of bl) {
          if (b.t0 == null && t > .19 && (s < 0 ? f <= b.borde : f >= b.borde)) {
            b.t0 = t; b.el.style.visibility = "hidden"; b.placas.forEach(q => { q.w.hidden = false; });
            b.corte.forEach(([px, py], i) => { for (let j = 0; j < 3; j++) P.add({ img: j ? chip((i + j) % 4) : brillo(), x: px, y: py, w: 10 + r() * 20, t0: t, vida: .25, vx: s * (900 + r() * 900), vy: (r() - .5) * 700, g: 2200, rot: r() * 6, vr: (r() - .5) * 30, ent: .02 }); });
            const [bx, by] = centro(b);
            P.add({ img: niebla(1), x: bx, y: by, w: Math.max(b.r.width, 300), t0: t, vida: .25, vx: s * 900, a: .6, s0: .6, s1: 1.3, sal: .7 });
          }
          if (b.t0 == null) continue;
          const u = t - b.t0;
          b.placas.forEach(q => {
            const dx = s * (W * q.vel * ease.in(tramo(u, 0, .4)) + 40 * ease.out(tramo(u, 0, .08))), dy = q.vy * tramo(u, 0, .4);
            q.w.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${(q.giro * ease.out(tramo(u, 0, .4))).toFixed(2)}deg)`;
            q.w.style.opacity = (1 - tramo(u, .26, .4)).toFixed(3);
          });
        }
        x.clearRect(0, 0, W, H);
        // agujas de hielo que brotan a lo largo del frente
        if (activa) for (let i = 1; i < 12; i++) { const [px, py] = p[i]; P.uno(cristales(i % 4), px - s * 6, py, 90 + 30 * Math.sin(i * 2.3 + t * 30), { rot: s > 0 ? Math.PI / 2 : -Math.PI / 2, ay: .92, a: .95 }); }
        P.draw(t);
        if (!hecho && t >= .64) { hecho = true; c.copia?.remove(); commit(); }
      });
      if (!hecho) { hecho = true; c.copia?.remove(); commit(); }
      c.style.transform = "";
      capaPl.remove(); filo.remove(); banda.remove(); banda2.remove(); choque.remove(); x.clearRect(0, 0, W, H);
      // la lámina se abre en franjas que siguen la onda, con astillas y niebla en los cortes
      const N = 5, cortes = Array.from({ length: N + 1 }, (_, i) => Array.from({ length: 7 }, (_, j) => [i === 0 ? -60 : i === N ? W + 60 : W * i / N + (r() - .5) * 70, -40 + (H + 80) * j / 6]));
      const grietas = el("path", { d: cortes.slice(1, -1).map(cc => linea(cc)).join(""), class: "tz-grieta", pathLength: 1 }, svg);
      await reloj(100, t => { grietas.style.strokeDashoffset = 1 - t; });
      lam.remove(); grLam.remove(); grietas.remove();
      const franjas = Array.from({ length: N }, (_, i) => esquirla(svg, [...cortes[i], ...cortes[i + 1].slice().reverse()], m, { grosor: 20, r }));
      const Q = motor(cv, x);
      cortes.slice(1, -1).forEach(cc => cc.forEach(([px, py]) => { for (let j = 0; j < 2; j++) Q.add({ img: j ? chip(Math.floor(r() * 4)) : niebla(Math.floor(r() * 4)), x: px, y: py, w: j ? 14 + r() * 20 : 160, t0: r() * .15, vida: .55, vx: s * (400 + r() * 600), vy: (r() - .5) * 300, g: j ? 2000 : 0, rot: r() * 6, vr: (r() - .5) * 20, a: j ? 1 : .5 }); }));
      const orden = i => s < 0 ? i : N - 1 - i;
      await reloj(420, t => {
        franjas.forEach((g, i) => {
          const u = tramo(t, orden(i) * .09, orden(i) * .09 + .6), a = ease.in(u);
          g.style.transform = `translate(${(s * W * .7 * a).toFixed(1)}px,${(120 * a * a).toFixed(1)}px) rotate(${(s * 9 * a * (i % 2 ? 1 : -.6)).toFixed(2)}deg)`;
          g.style.opacity = 1 - tramo(u, .5, 1);
          g.arista.style.opacity = .4 + .6 * Math.abs(Math.cos(a * 3 + i));
        });
        x.clearRect(0, 0, W, H); Q.draw(t);
      });
    } finally { if (!hecho) commit(); c.style.transform = ""; quitar(c); }
  }

  MUNDOS.transiciones("tsaritsa", [
    { nombre: "Ventisca de arrastre", ms: 1100, run: ventisca },
    { nombre: "Lluvia glacial", ms: 1470, run: lluvia },
    { nombre: "Sello de la soberana", ms: 1150, run: sello },
    { nombre: "Onda de ruptura", ms: 1520, run: onda }
  ]);
})();

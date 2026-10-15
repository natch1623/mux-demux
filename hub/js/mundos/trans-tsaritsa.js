"use strict";
/* =====================================================================
   Tsaritsa · transiciones internas (escarcha, ventisca, cristal, aurora).
   Material: escarcha opaca y granular en el borde activo, hielo translúcido con
   espesor y grietas interiores, cristal de caras definidas, plata y oro mate.
   El cambio de diapositiva (commit) ocurre solo con cobertura completa.
   ===================================================================== */
(() => {
  const { el, rng, lienzo, lienzo2d, reloj, ease, tramo, defsHielo, esquirla, ramas, linea, pts } = MAT;

  /* A. Escarcha (900 ms): la congelación nace en las esquinas con ramificaciones,
     el borde activo es blanco y granular, el interior translúcido. Cubre, cambia,
     se agrieta siguiendo la estructura y se parte en seis piezas con espesor. */
  async function escarcha({ commit, capa, quitar, dir }) {
    const c = capa("tz-tr"), { svg, defs, W, H } = lienzo(c), m = defsHielo(defs), r = rng(dir > 0 ? 11 : 23);
    const D = Math.hypot(W, H), esq = [[0, 0], [W, 0], [W, H], [0, H]].filter((_, i) => i !== (dir > 0 ? 2 : 0));
    // recorte vectorial (no máscara): se dibuja mucho más rápido en cada cuadro
    const mid = MAT.uid("tzm"), mask = el("clipPath", { id: mid, clipPathUnits: "userSpaceOnUse" }, defs);
    // frente de congelación irregular (no circular): radio con ruido por ángulo
    const semilla = esq.map(() => [r() * 6, r() * 6, r() * 6]);
    const frente = (i, R, cerrado) => {
      const [x, y] = esq[i], a0 = Math.atan2(H / 2 - y, W / 2 - x) - Math.PI / 2 - .2, p = [];
      for (let k = 0; k <= 48; k++) { const a = a0 + (Math.PI + .4) * k / 48, [s1, s2, s3] = semilla[i]; const q = R * (1 + .07 * Math.sin(a * 7 + s1) + .04 * Math.sin(a * 17 + s2) + .02 * Math.sin(a * 41 + s3)); p.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); }
      return cerrado ? linea([[x, y], ...p]) + "Z" : linea(p);
    };
    const circ = esq.map(() => el("path", { d: "M0 0Z" }, mask));
    const lamina = el("g", { "clip-path": `url(#${mid})` }, svg);
    el("rect", { width: W, height: H, fill: "#0C2D47" }, lamina);                   // espesor opaco: oculta el cambio
    el("rect", { width: W, height: H, fill: m.cara, opacity: .9 }, lamina);
    el("rect", { width: W, height: H, fill: m.escarcha, opacity: .95 }, lamina);
    // borde activo: banda de escarcha granular y un filo blanco discontinuo
    const bordes = esq.map(() => { const g = el("g", {}, svg); el("path", { class: "tz-frente-esc", stroke: m.escarcha }, g); el("path", { class: "tz-frente-filo" }, g); return g; });
    const rams = esq.map(([x, y]) => { const a = Math.atan2(H / 2 - y, W / 2 - x); return el("path", { d: ramas(r, x, y, a, D * .62, 3, .65), class: "tz-rama", pathLength: 1 }, svg); });
    try {
      await reloj(430, t => {
        const k = ease.out(t), R = D * .86 * k;
        circ.forEach((e, i) => e.setAttribute("d", frente(i, R, true)));
        bordes.forEach((g, i) => { const d = frente(i, Math.max(1, R - 4), false); g.childNodes.forEach(n => n.setAttribute("d", d)); g.style.opacity = 1 - tramo(t, .8, 1); });
        rams.forEach(e => e.style.strokeDashoffset = 1 - k);
      });
      commit();
      // grietas que siguen la congelación, desde el punto donde se unen los frentes
      const ox = W * (.45 + r() * .1), oy = H * (.45 + r() * .1);
      const grieta = el("path", { d: Array.from({ length: 7 }, (_, i) => ramas(r, ox, oy, i / 7 * 6.283 + r() * .4, D * .55, 1, .5)).join(""), class: "tz-grieta", pathLength: 1 }, svg);
      await reloj(130, t => { grieta.style.strokeDashoffset = 1 - t; });
      // seis piezas principales con espesor; se separan y descubren la nueva
      const n = 6, ang = Array.from({ length: n }, (_, i) => i / n * 6.283 + (r() - .5) * .5), lejos = D;
      const borde = a => [ox + Math.cos(a) * lejos, oy + Math.sin(a) * lejos];
      const quiebre = a => [ox + Math.cos(a) * D * .22 + (r() - .5) * 30, oy + Math.sin(a) * D * .22 + (r() - .5) * 30];
      lamina.remove(); bordes.forEach(e => e.remove()); rams.forEach(e => e.remove());
      const piezas = ang.map((a, i) => {
        const b = ang[(i + 1) % n] + (i === n - 1 ? 6.283 : 0);
        const p = [[ox, oy], quiebre(a), borde(a), borde((a + b) / 2), borde(b), quiebre(b)];
        return esquirla(svg, p, m, { grosor: 22, r });
      });
      grieta.remove();
      const vuelos = piezas.map((g, i) => {
        const [cx, cy] = g.c, dx = cx - ox, dy = cy - oy, L = Math.hypot(dx, dy) || 1, empuje = D * (.35 + r() * .2), giro = (r() - .5) * 40;
        return { g, f: t => { const a = ease.in(t), s = tramo(t, 0, .2) * 8; g.style.transform = `translate(${dx / L * (s + empuje * a)}px,${dy / L * (s + empuje * a) + 260 * a * a}px) rotate(${giro * a}deg) scale(${1 - .15 * a})`; g.style.opacity = 1 - tramo(t, .55, 1); g.arista.style.opacity = .35 + .65 * Math.abs(Math.cos(giro * a * Math.PI / 90 + i)); } };
      });
      await reloj(340, t => vuelos.forEach(v => v.f(t)));
    } finally { quitar(c); }
  }

  /* B. Ventisca (800 ms): una ráfaga diagonal en tres planos (partículas al fondo,
     copos reconocibles al centro, trazos grandes y suaves al frente). La nieve se
     concentra en una banda que oculta el cambio y luego se dispersa. */
  async function ventisca({ commit, instantanea, quitar, dir }) {
    const c = instantanea(), { cv, x, W, H } = lienzo2d(c), r = rng(41);
    commit();
    const s = dir >= 0 ? 1 : -1, A = s > 0 ? .35 : Math.PI - .35, ux = Math.cos(A), uy = Math.sin(A);
    const proy = (px, py) => px * ux + py * uy;
    const lo = Math.min(proy(0, 0), proy(W, 0), proy(0, H), proy(W, H)), hi = Math.max(proy(0, 0), proy(W, 0), proy(0, H), proy(W, H));
    const span = hi - lo, ancho = span * .3;
    const planos = [
      { n: 420, v: .9, t: () => 1.4 + r() * 2.2, a: .75 },
      { n: 150, v: 1.15, t: () => 6 + r() * 7, a: .95, copo: true },
      { n: 16, v: 1.5, t: () => 40 + r() * 50, a: .32, suave: true }];
    const part = planos.flatMap(p => Array.from({ length: p.n }, () => ({ ...p, x: r() * W * 1.6 - W * .3, y: r() * H * 1.6 - H * .3, z: p.t(), j: .85 + r() * .3, fase: r() * 6.283 })));
    const copo = (px, py, z, rot) => { x.save(); x.translate(px, py); x.rotate(rot); x.beginPath(); for (let k = 0; k < 6; k++) { x.moveTo(0, 0); x.lineTo(0, -z); x.rotate(Math.PI / 3); } x.stroke(); x.restore(); };
    try {
      await reloj(800, t => {
        const banda = lo - ancho + (span + ancho * 2) * ease.io(t), corte = banda;
        // la hoja vieja se retira detrás de la banda (semiplano perpendicular a la ráfaga)
        const ext = 4000, px = ux * (corte), py = uy * (corte), nx = -uy, ny = ux;
        const P = (a, b) => `${(px + nx * a + ux * b).toFixed(1)}px ${(py + ny * a + uy * b).toFixed(1)}px`;
        c.copia.style.clipPath = `polygon(${P(-ext, 0)},${P(ext, 0)},${P(ext, ext)},${P(-ext, ext)})`;
        x.clearRect(0, 0, W, H);
        // velo de la banda: oculta el borde del corte
        const g = x.createLinearGradient(ux * (banda - ancho), uy * (banda - ancho), ux * (banda + ancho), uy * (banda + ancho));
        g.addColorStop(0, "rgba(234,246,255,0)"); g.addColorStop(.3, "rgba(200,226,244,.5)"); g.addColorStop(.5, "rgba(214,236,250,.96)"); g.addColorStop(.7, "rgba(200,226,244,.5)"); g.addColorStop(1, "rgba(234,246,255,0)");
        x.fillStyle = g; x.fillRect(0, 0, W, H);
        x.strokeStyle = "rgba(242,251,255,.9)"; x.lineCap = "round";
        for (const p of part) {
          const d = 520 * p.v * p.j * t, qx = p.x + ux * d + Math.sin(t * 9 + p.fase) * 6, qy = p.y + uy * d;
          const dens = Math.exp(-(((proy(qx, qy) - banda) / (ancho * .9)) ** 2));
          if (dens < .03) continue;
          x.globalAlpha = p.a * dens;
          if (p.suave) { const rg = x.createRadialGradient(qx, qy, 0, qx, qy, p.z); rg.addColorStop(0, "rgba(255,255,255,.9)"); rg.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = rg; x.beginPath(); x.ellipse(qx, qy, p.z * 1.8, p.z * .7, A, 0, 6.283); x.fill(); }
          else if (p.copo) { x.lineWidth = Math.max(1, p.z * .22); copo(qx, qy, p.z, p.fase + t * 3); }
          else { x.fillStyle = "#F2FBFF"; x.fillRect(qx, qy, p.z, p.z); }
        }
        x.globalAlpha = 1;
      });
    } finally { quitar(c); }
  }

  /* C. Cristal giratorio (1000 ms): un cristal facetado (bipirámide hexagonal) crece y
     gira; las caras hacia la luz reflejan, las laterales se oscurecen y las aristas
     siguen unidas. Cuando una cara amplia cubre el campo cambia la diapositiva. */
  async function cristal({ commit, instantanea, quitar, dir }) {
    const c = instantanea(), { x, W, H } = lienzo2d(c);
    const L = [-.55, -.65, .52], nl = Math.hypot(...L), luz = L.map(v => v / nl);
    const cx = W / 2, cy = H / 2;
    let hecho = false;
    try {
      await reloj(1000, t => {
        const crece = t < .45 ? ease.out(t / .45) : 1 - ease.in((t - .45) / .55);
        const S = Math.max(W, H) * (.1 + .52 * crece), th = (dir >= 0 ? 1 : -1) * t * Math.PI * 1.6;
        if (!hecho && t >= .45) { hecho = true; c.copia.remove(); commit(); }
        x.clearRect(0, 0, W, H);
        // fondo frío que asegura cobertura total en el instante del cambio
        const fondo = 1 - Math.min(1, Math.abs(t - .45) / .22);
        if (fondo > 0) { x.fillStyle = `rgba(10,27,51,${fondo.toFixed(3)})`; x.fillRect(0, 0, W, H); }
        // vértices: ecuador hexagonal girado y dos ápices
        const ec = Array.from({ length: 6 }, (_, k) => { const a = k / 6 * Math.PI * 2 + th; return [Math.cos(a), 0, Math.sin(a)]; });
        const ap = [[0, -1.25, 0], [0, 1.25, 0]];
        const caras = [];
        for (let k = 0; k < 6; k++) for (const top of ap) {
          const a = ec[k], b = ec[(k + 1) % 6], v = [top, a, b];
          const u1 = a.map((q, i) => q - top[i]), u2 = b.map((q, i) => q - top[i]);
          let n = [u1[1] * u2[2] - u1[2] * u2[1], u1[2] * u2[0] - u1[0] * u2[2], u1[0] * u2[1] - u1[1] * u2[0]];
          const ctr = v.reduce((s, q) => s.map((w, i) => w + q[i] / 3), [0, 0, 0]);
          if (n[0] * ctr[0] + n[1] * ctr[1] + n[2] * ctr[2] < 0) n = n.map(w => -w);
          const nn = Math.hypot(...n); n = n.map(w => w / nn);
          if (n[2] <= 0) continue;
          caras.push({ v, n, z: ctr[2], k });
        }
        caras.sort((a, b) => a.z - b.z);
        for (const f of caras) {
          const p = f.v.map(([vx, vy]) => [cx + vx * S, cy + vy * S]);
          const lam = Math.max(0, f.n[0] * luz[0] + f.n[1] * luz[1] + f.n[2] * luz[2]);
          const lado = 1 - f.n[2];                                   // caras de canto: más oscuras
          const g = x.createLinearGradient(p[0][0], p[0][1], (p[1][0] + p[2][0]) / 2, (p[1][1] + p[2][1]) / 2);
          // de la sombra fría (#061526) al hielo iluminado (#EAF6FF), con curva para más contraste
          const cl = (b, a) => { b = Math.pow(Math.max(0, Math.min(1, b)), 1.35); return `rgba(${Math.round(6 + 228 * b)},${Math.round(21 + 225 * b)},${Math.round(38 + 217 * b)},${a})`; };
          const alfa = t < .45 ? 1 : (f.k % 3 === 1 ? .5 : .96);     // tras el cambio, algunas caras dejan ver la siguiente
          g.addColorStop(0, cl(Math.min(1, lam * 1.1 + .1), alfa)); g.addColorStop(1, cl(Math.max(0, lam * .6 - lado * .3), alfa));
          x.fillStyle = g; x.beginPath(); x.moveTo(...p[0]); x.lineTo(...p[1]); x.lineTo(...p[2]); x.closePath(); x.fill();
          x.strokeStyle = lam > .75 ? "rgba(255,255,255,.95)" : "rgba(168,216,240,.55)"; x.lineWidth = lam > .75 ? 2.4 : 1.4; x.stroke();
          // faceta interior (talla) y destello en el vértice más iluminado
          const m3 = [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3];
          x.strokeStyle = `rgba(234,246,255,${(.12 + lam * .25).toFixed(2)})`; x.lineWidth = 1;
          x.beginPath(); p.forEach((q, i) => { const qq = [q[0] + (m3[0] - q[0]) * .28, q[1] + (m3[1] - q[1]) * .28]; i ? x.lineTo(...qq) : x.moveTo(...qq); }); x.closePath(); x.stroke();
          if (lam > .85) { const v = p[0]; const rg = x.createRadialGradient(v[0], v[1], 0, v[0], v[1], 26); rg.addColorStop(0, "rgba(255,255,255,.9)"); rg.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = rg; x.fillRect(v[0] - 26, v[1] - 26, 52, 52); }
        }
        // ecuador en oro mate
        x.strokeStyle = "rgba(217,178,95,.7)"; x.lineWidth = 2; x.beginPath();
        ec.forEach(([vx, vy, vz], i) => { if (vz < -.1) return; const px = cx + vx * S, py = cy + vy * S; i ? x.lineTo(px, py) : x.moveTo(px, py); });
        x.stroke();
      });
    } finally { quitar(c); }
  }

  /* D. Aurora (900 ms): una cortina de bandas translúcidas (azul petróleo, verde pálido,
     violeta frío) con pliegues amplios desciende, se densifica para ocultar el cambio
     y sale del encuadre dejando el contenido nítido. */
  async function aurora({ commit, instantanea, quitar }) {
    const c = instantanea(), { x, W, H } = lienzo2d(c);
    const bandas = [["15,76,92", .9, 0], ["159,227,193", .55, 1.3], ["140,123,216", .5, 2.4], ["90,190,200", .45, 3.1], ["170,150,235", .35, 4.4]];
    let hecho = false;
    try {
      await reloj(900, t => {
        const borde = -H * .15 + H * 2.8 * ease.io(t), cola = borde - H * 1.6;   // frente inferior y cola superior
        if (!hecho && cola < -H * .3 && borde > H * 1.02) { hecho = true; c.copia.remove(); commit(); }
        if (!hecho && t >= .62) { hecho = true; c.copia.remove(); commit(); }
        x.clearRect(0, 0, W, H);
        // cuerpo de la cortina: denso en el centro, translúcido en la cola
        const g = x.createLinearGradient(0, cola, 0, borde);
        g.addColorStop(0, "rgba(10,27,51,0)"); g.addColorStop(.18, "rgba(10,27,51,.96)"); g.addColorStop(.9, "rgba(10,27,51,.98)"); g.addColorStop(1, "rgba(10,27,51,.6)");
        x.fillStyle = g; x.fillRect(0, Math.max(0, cola), W, Math.min(H, borde) - Math.max(0, cola));
        // bandas con pliegues: borde ondulado y degradado hacia arriba
        bandas.forEach(([col, a, f], i) => {
          const base = borde - i * 26, alto = 180 + i * 40;
          x.beginPath();
          for (let px = 0; px <= W + 20; px += 20) { const py = base + Math.sin(px * .006 + f + t * 5) * 34 + Math.sin(px * .017 + f * 2) * 12; px ? x.lineTo(px, py) : x.moveTo(px, py); }
          for (let px = W + 20; px >= 0; px -= 20) { const py = base - alto + Math.sin(px * .005 + f + t * 4) * 50; x.lineTo(px, py); }
          x.closePath();
          const gb = x.createLinearGradient(0, base - alto, 0, base + 30);
          gb.addColorStop(0, `rgba(${col},0)`); gb.addColorStop(.75, `rgba(${col},${a * .55})`); gb.addColorStop(1, `rgba(${col},${a})`);
          x.fillStyle = gb; x.fill();
        });
        // pliegues verticales: rayos finos que dan el aspecto de cortina
        x.globalCompositeOperation = "lighter";
        for (let k = 0; k < 26; k++) {
          const px = (k / 26) * W + Math.sin(k * 3.1 + t * 4) * 30, y0 = borde - 260 - (k % 5) * 30;
          const gr = x.createLinearGradient(0, y0, 0, borde);
          gr.addColorStop(0, "rgba(159,227,193,0)"); gr.addColorStop(1, "rgba(159,227,193,.16)");
          x.fillStyle = gr; x.fillRect(px, y0, 3 + (k % 3) * 2, borde - y0);
        }
        x.globalCompositeOperation = "source-over";
      });
    } finally { quitar(c); }
  }

  MUNDOS.transiciones("tsaritsa", [
    { nombre: "Escarcha", ms: 900, run: escarcha },
    { nombre: "Ventisca", ms: 800, run: ventisca },
    { nombre: "Cristal giratorio", ms: 1000, run: cristal },
    { nombre: "Aurora", ms: 900, run: aurora }
  ]);
})();

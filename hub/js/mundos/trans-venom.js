"use strict";
/* =====================================================================
   Venom · transiciones internas (devoración, tentáculo, goteo, mutación).
   Material: negro carbón con volumen (degradado de cuerpo), reflejos estrechos que
   siguen la curvatura, membranas translúcidas entre lóbulos y filamentos que se
   estiran antes de romperse. El cuerpo arrastra a sus extremos (viscosidad).
   ===================================================================== */
(() => {
  const { el, rng, lienzo, reloj, ease, tramo, suave, linea, defsViscosa, vsCanto, lobulos, reflejos, tentaculo } = MAT;

  // masa con borde superior de lóbulos: cuerpo, sombra del pliegue, membranas y reflejos
  function masa(svg, m, defs) {
    const g = el("g", { class: "vn-masa2" }, svg);
    const sombra = el("path", { class: "vn-pliegue" }, g);
    const cuerpo = el("path", { fill: m.cuerpo }, g);
    const canto = vsCanto(g, defs);
    const memb = el("path", { class: "vn-membrana", fill: m.memb }, g);
    const brillo = el("path", { class: "vn-reflejo" }, g);
    const hilos = el("path", { class: "vn-hilo" }, g);
    return {
      g, pinta(p, W, H, abajo = true, membranas = true) {
        const cierre = abajo ? [[W + 80, H + 400], [-80, H + 400]] : [[W + 80, -400], [-80, -400]];
        const d = suave([...p, ...cierre]);
        cuerpo.setAttribute("d", d);
        canto(d, suave(p, false));
        sombra.setAttribute("d", suave(p.map(([x, y]) => [x, y + (abajo ? 16 : -16)]), false));
        brillo.setAttribute("d", reflejos(abajo ? p : p.map(([x, y]) => [x, -y])).replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (s, a, b) => abajo ? s : `${a} ${-b}`));
        // membranas: piel fina entre crestas vecinas, un poco por encima del borde
        let md = "";
        if (membranas) for (let i = 1; i < p.length - 2; i += 3) { const a = p[i], b = p[i + 2], mid = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) + (abajo ? -14 : 14)]; md += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${mid[0].toFixed(1)} ${mid[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}L${b[0].toFixed(1)} ${(b[1] + (abajo ? 30 : -30)).toFixed(1)}L${a[0].toFixed(1)} ${(a[1] + (abajo ? 30 : -30)).toFixed(1)}Z`; }
        memb.setAttribute("d", md);
      }, hilos(d) { hilos.setAttribute("d", d); }
    };
  }

  /* A. Devoración (800 ms): la masa asciende con lóbulos grandes y pequeños; el cuerpo
     tiene inercia y los extremos se retrasan. Cubre, cambia y se recoge; los últimos
     filamentos se alargan y se rompen. */
  async function devoracion({ commit, capa, quitar }) {
    const c = capa("vn-tr"), { svg, defs, W, H } = lienzo(c), m = defsViscosa(defs), r = rng(5);
    const M = masa(svg, m, defs), n = 16, base0 = lobulos(r, -60, W + 60, 0, 120, n), fase = base0.map(() => r() * 6.283);
    let ant = H + 200, hecho = false;
    try {
      await reloj(800, t => {
        const sube = t < .5, k = sube ? ease.io(t / .5) : ease.in((t - .5) / .5);
        const y = sube ? H + 220 - (H + 520) * k : -300 + (H + 560) * k;
        const v = Math.abs(y - ant); ant = y;
        if (!hecho && !sube) { hecho = true; commit(); }
        // los lóbulos se estiran con la velocidad (los extremos se retrasan) y ondulan
        const p = base0.map(([x, by], i) => [x, y + by * (1 + Math.min(.8, v / 60)) + Math.sin(t * 14 + fase[i]) * 10]);
        M.pinta(p, W, H, true);
        // filamentos al recogerse: del borde superior de la pantalla hacia las crestas, se estiran y ceden
        if (!sube && t < .92) {
          const corte = tramo(t, .6, .9);
          let d = "";
          for (let i = 2; i < p.length - 1; i += 4) { const [x, yy] = p[i]; const top = -10 + (yy + 10) * corte; d += `M${(x + 6).toFixed(1)} ${top.toFixed(1)}C${(x - 10).toFixed(1)} ${((top + yy) / 2).toFixed(1)} ${(x + 14).toFixed(1)} ${((top + yy) / 2).toFixed(1)} ${x.toFixed(1)} ${yy.toFixed(1)}`; }
          M.hilos(d);
        } else M.hilos("");
      });
    } finally { quitar(c); }
  }

  /* B. Tentáculo barredor (700 ms): entra, gira y engancha un borde de la diapositiva;
     primero el contacto deforma un poco la hoja, luego la arrastra fuera. La base
     conduce el movimiento y la punta responde con retraso. */
  async function tentaculoT({ commit, instantanea, quitar, dir }) {
    const c = instantanea(), s = dir >= 0 ? 1 : -1, { svg, defs, W, H } = lienzo(c), m = defsViscosa(defs);
    commit();
    const cuerpo = el("path", { fill: m.cuerpo, class: "vn-tent2" }, svg), canto = vsCanto(svg, defs), lomo = el("path", { class: "vn-reflejo" }, svg), sombra = el("path", { class: "vn-sombra-tent" }, svg);
    svg.prepend(sombra);
    const X = x => s > 0 ? x : W - x;
    try {
      await reloj(700, t => {
        const llega = ease.out(tramo(t, 0, .38)), arrastra = ease.in(tramo(t, .38, 1));
        const des = -W * 1.15 * arrastra;                                           // la hoja sale
        const tipX = W * .34 * llega + des * .96, tipY = H * .46 + Math.sin(t * 9) * 8;   // agarra la hoja a un tercio; la punta va con retraso
        const baseX = -200 - W * .25 * arrastra + (1 - llega) * -600, baseY = H * .78;
        const n = 14, cen = [];
        for (let i = 0; i < n; i++) {
          const u = i / (n - 1), giro = Math.sin(u * Math.PI * 1.5 + t * 6) * 40 * (1 - u);
          const px = baseX + (tipX - baseX) * ease.out(u) * llega + giro, py = baseY + (tipY - baseY) * u - Math.sin(u * Math.PI) * 120;
          cen.push([X(px), py]);
        }
        // gancho: la punta se curva alrededor del borde
        const [ux, uy] = cen[n - 1]; cen.push([ux + s * 22, uy - 26], [ux + s * 40, uy - 6]);
        const { cuerpo: d, lomo: l } = tentaculo(cen, 190, 26);
        cuerpo.setAttribute("d", d); lomo.setAttribute("d", l); canto(d, d); sombra.setAttribute("d", d); sombra.setAttribute("transform", "translate(14 22)");
        // contacto: pequeña deformación local y luego arrastre de la hoja
        const tira = tramo(t, .3, .42);
        c.copia.style.translate = `${s * des}px 0`;
        c.copia.style.filter = `brightness(${1 - .15 * tira})`;
        c.copia.style.translate = `${s * des}px ${(6 * (tira - arrastra)).toFixed(1)}px`;
      });
    } finally { quitar(c); }
  }

  /* C. Goteo (900 ms): gotas que se forman en el borde superior con tamaños y tiempos
     distintos, algunas unidas por hilos; alimentan una cortina viscosa que cubre, y al
     recogerse quedan unas pocas gotas finales. Cada reflejo sigue la forma de su gota. */
  async function goteo({ commit, capa, quitar }) {
    const c = capa("vn-tr"), { svg, defs, W, H } = lienzo(c), m = defsViscosa(defs), r = rng(9);
    const cortina = el("path", { fill: m.cuerpo }, svg), cantoC = vsCanto(svg, defs), filo = el("path", { class: "vn-reflejo" }, svg), hilos = el("path", { class: "vn-hilo" }, svg);
    const N = 11, gotas = Array.from({ length: N }, (_, i) => ({ x: W * (i + .5) / N + (r() - .5) * 60, r: 14 + r() * 22, t0: r() * .25, cae: .2 + r() * .15,
      g: el("path", { fill: m.cuerpo }, svg), b: el("path", { class: "vn-reflejo-gota" }, svg) }));
    const gota = (x, y0, y, rr) => `M${x} ${y0}C${x + rr * .25} ${y0 + (y - y0) * .55} ${x + rr} ${y - rr * .7} ${x + rr} ${y}A${rr} ${rr} 0 1 1 ${x - rr} ${y}C${x - rr} ${y - rr * .7} ${x - rr * .25} ${y0 + (y - y0) * .55} ${x} ${y0}Z`;
    let hecho = false;
    try {
      await reloj(900, t => {
        const baja = t < .5;
        const fondo = baja ? -40 + (H + 140) * ease.in(tramo(t, .18, .5)) : (H + 100) * (1 - ease.io(tramo(t, .55, .95)));
        if (!hecho && !baja) { hecho = true; commit(); }
        // borde inferior de la cortina con chorros (los aportan las gotas)
        const p = [];
        for (let i = 0; i <= 22; i++) { const x = -40 + (W + 80) * i / 22; p.push([x, fondo + Math.sin(i * 2.1 + t * 8) * 18 + (i % 3 === 0 ? 46 : 0)]); }
        cortina.setAttribute("d", suave([[W + 60, -300], [-60, -300], ...p])); cantoC(suave([[W + 60, -300], [-60, -300], ...p]), suave(p, false));
        filo.setAttribute("d", reflejos(p.map(([x, y]) => [x, -y])).replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (s, a, b) => `${a} ${-b - 10}`));
        let hd = "";
        gotas.forEach((q, i) => {
          const u = tramo(t, q.t0, q.t0 + q.cae), u2 = tramo(t, q.t0 + q.cae, q.t0 + q.cae + .25);
          const fin = !baja && i % 4 === 1;                                   // unas pocas gotas finales
          if ((u <= 0 && !fin) || (!fin && !baja)) { q.g.setAttribute("d", ""); q.b.setAttribute("d", ""); return; }
          const rr = q.r * (.4 + .6 * Math.min(1, u * 1.4));
          const yb = fin ? fondo + 40 + (H) * ease.in(tramo(t, .6, 1)) : 10 + rr + 50 * u + H * 1.1 * ease.in(u2);
          const y0 = u2 > 0 || fin ? yb - rr * 2.4 : 0;
          q.g.setAttribute("d", gota(q.x, y0, yb, rr));
          q.b.setAttribute("d", `M${q.x - rr * .55} ${yb - rr * .2}Q${q.x - rr * .5} ${yb - rr * .75} ${q.x - rr * .05} ${yb - rr * .85}`);
          // hilos entre gotas vecinas mientras cuelgan
          const v = gotas[i + 1];
          if (v && u > .3 && u2 === 0 && i % 2 === 0) { const uv = tramo(t, v.t0, v.t0 + v.cae); if (uv > .3) hd += `M${q.x} ${yb - rr}Q${(q.x + v.x) / 2} ${yb + 30} ${v.x} ${10 + v.r * uv + 50 * uv}`; }
        });
        hilos.setAttribute("d", hd);
      });
    } finally { quitar(c); }
  }

  /* D. Mutación (600 ms): la deformación nace en un punto de contacto y se propaga como
     tensión sobre una membrana; el borde se estira, se estrecha y absorbe la diapositiva.
     La nueva aparece cuando la materia se estabiliza: sin distorsión residual. */
  async function mutacion({ commit, instantanea, quitar, dir }) {
    const c = instantanea(), { svg, defs, W, H } = lienzo(c), m = defsViscosa(defs), r = rng(3);
    const fid = MAT.uid("vnm"), f = el("filter", { id: fid, x: "-5%", y: "-5%", width: "110%", height: "110%" }, defs);
    el("feTurbulence", { type: "fractalNoise", baseFrequency: ".014 .022", numOctaves: 1, seed: 4 }, f);
    const disp = el("feDisplacementMap", { in: "SourceGraphic", scale: 0, xChannelSelector: "R", yChannelSelector: "G" }, f);
    // capa de distorsión aplicada solo a una copia recortada al anillo de propagación
    const P = [dir >= 0 ? W * .78 : W * .22, H * .42], D = Math.hypot(W, H);
    const membrana = el("path", { fill: m.cuerpo }, svg), canto = vsCanto(svg, defs), brillo = el("path", { class: "vn-reflejo" }, svg), tension = el("path", { class: "vn-tension" }, svg);
    const ruido = Array.from({ length: 28 }, () => r() * 6.283);
    const forma = (R, k) => { const p = []; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283, q = R * (1 + k * (.14 * Math.sin(a * 3 + ruido[i]) + .08 * Math.sin(a * 7 + ruido[(i + 5) % 28]))); p.push([P[0] + Math.cos(a) * q, P[1] + Math.sin(a) * q * .9]); } return p; };
    c.copia.style.filter = `url(#${fid})`;
    let hecho = false;
    try {
      await reloj(600, t => {
        const crece = ease.in(tramo(t, 0, .55)), recoge = ease.io(tramo(t, .62, 1));
        disp.setAttribute("scale", (90 * crece).toFixed(1));
        if (!hecho && t >= .56) { hecho = true; c.copia.remove(); commit(); }
        const R = hecho ? D * (1 - recoge) * 1.05 : 30 + D * 1.05 * crece;
        const p = forma(Math.max(1, R), hecho ? .4 + recoge : .7 - crece * .4);
        membrana.setAttribute("d", suave(p)); canto(suave(p), suave(p));
        brillo.setAttribute("d", suave(p.slice(15, 23).map(([x, y]) => [P[0] + (x - P[0]) * .9, P[1] + (y - P[1]) * .9]), false));
        // tensión: un anillo fino que corre delante del borde
        tension.setAttribute("d", hecho ? "" : suave(forma(R + 40, .3)));
        tension.style.opacity = hecho ? 0 : 1 - crece;
      });
    } finally { quitar(c); }
  }

  MUNDOS.transiciones("venom", [
    { nombre: "Devoración", ms: 800, run: devoracion },
    { nombre: "Tentáculo barredor", ms: 700, run: tentaculoT },
    { nombre: "Goteo", ms: 900, run: goteo },
    { nombre: "Mutación", ms: 600, run: mutacion }
  ]);
})();

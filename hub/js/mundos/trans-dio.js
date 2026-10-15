"use strict";
/* =====================================================================
   DIO · transiciones internas (tiempo detenido, página de manga, líneas de
   velocidad, golpe). Material: tinta de grosor variable, tramas de puntos,
   rayado direccional, papel marfil con márgenes y pequeñas irregularidades.
   La energía nace de la anticipación, el impacto y la pausa posterior.
   ===================================================================== */
(() => {
  const { el, rng, lienzo, reloj, ease, tramo, linea, suave, defsTinta, pincel, impacto, reloj2 } = MAT;
  const TINTA = "#0B0B0F";

  /* A. Tiempo detenido (700 ms): un cambio cromático breve inicia la detención; la página
     queda en impresión gris (trama) y un reloj aparece detrás de una diagonal; pausa;
     un corte de tinta atraviesa la página y descubre la nueva; vuelve el color. */
  async function detenido({ commit, instantanea, quitar, esperar }) {
    const c = instantanea(), { svg, defs, W, H } = lienzo(c), t = defsTinta(defs);
    commit();                 // la copia congelada cubre todo: debajo ya está la nueva, que el corte descubre
    c.copia.style.filter = "invert(1) hue-rotate(180deg)";
    await esperar(90);
    c.copia.style.filter = "grayscale(1) contrast(1.25) brightness(.92) sepia(.12)";
    // trama de impresión sobre la página detenida
    const trama = el("rect", { width: W, height: H, fill: t.fina, opacity: .22 }, svg);
    // banda diagonal detrás de la cual aparece el reloj
    const banda = el("path", { d: `M${-W * .1} ${H * .78}L${W * 1.1} ${H * .1}L${W * 1.1} ${H * .42}L${-W * .1} ${H * 1.1}Z`, fill: TINTA, opacity: .0 }, svg);
    const R = Math.min(W, H) * .3, rl = reloj2(svg, W * .5, H * .48, R);
    rl.style.opacity = 0;
    const corte = el("path", { class: "dio-corte" }, svg);
    const bc = c.copia.getBoundingClientRect(), esc = bc.width / FW, lx = x => (x - bc.left) / esc, ly = y => (y - bc.top) / esc;
    let hecho = false;
    try {
      await reloj(610, u => {
        const ap = ease.out(tramo(u, 0, .3));
        rl.style.opacity = ap; rl.style.transform = `scale(${.85 + .15 * ap})`; rl.style.transformOrigin = `${W / 2}px ${H * .48}px`;
        banda.setAttribute("opacity", (.55 * ap * (1 - tramo(u, .75, 1))).toFixed(2));
        rl.larga.style.transform = `rotate(${-40 * (1 - ap)}deg)`; rl.corta.style.transform = `rotate(${-15 * (1 - ap)}deg)`;
        // pausa perceptible (0,3–0,5) y luego el corte diagonal
        const k = ease.io(tramo(u, .5, .82));
        if (!hecho && k >= 1) { hecho = true; c.copia.remove(); }
        const x0 = -W * .2 + W * 1.4 * k;
        corte.setAttribute("d", pincel([[x0 - W * .25, H * 1.1], [x0, H * .5], [x0 + W * .25, -H * .1]], 4, 4, 34));
        if (!hecho) c.copia.style.clipPath = `polygon(${lx(x0 + W * .25)}px ${ly(-10)}px,${lx(W + 10)}px ${ly(-10)}px,${lx(W + 10)}px ${ly(H + 10)}px,${lx(x0 - W * .25)}px ${ly(H + 10)}px)`;
        const sale = tramo(u, .82, 1);
        if (sale > 0) { [rl, trama, corte].forEach(e => e.style.opacity = 1 - sale); }
      });
    } finally { quitar(c); }
  }

  /* B. Página de manga (900 ms): cinco viñetas de tamaños desiguales con márgenes
     claros; una domina (negro sólido con ドドド), las demás preparan su llegada. Entran
     en orden, cubren todo, cambia la diapositiva y la composición se abre. */
  async function manga({ commit, capa, quitar, dir }) {
    const c = capa("dio-tr"), { svg, defs, W, H } = lienzo(c), t = defsTinta(defs), r = rng(dir > 0 ? 3 : 8);
    const m = 14;  // margen claro entre viñetas
    // [x, y, w, h] en fracciones, con cortes ligeramente inclinados
    const V = [[0, 0, .6, .52, -1, 0], [.6, 0, .4, .38, 0, -1], [.6, .38, .4, .62, 1, 0], [0, .52, .3, .48, 0, 1], [.3, .52, .3, .48, 0, 1]];
    el("rect", { width: W, height: H, fill: t.papel }, svg).style.opacity = 0;
    const papel = svg.lastChild;
    const vin = V.map(([x, y, w, h, dx, dy], i) => {
      const g = el("g", { class: "dio-vin" }, svg);
      const sk = (r() - .5) * 26, X0 = x * W + m, Y0 = y * H + m, X1 = (x + w) * W - m, Y1 = (y + h) * H - m;
      const p = [[X0 + (i % 2 ? sk : 0), Y0], [X1, Y0 + (i % 2 ? 0 : sk * .5)], [X1 - (i % 2 ? 0 : sk), Y1], [X0, Y1]];
      el("polygon", { points: MAT.pts(p.map(([a, b]) => [a + 8, b + 10])), fill: TINTA, opacity: .35 }, g);       // sombra dura
      const fondo = i === 0 ? TINTA : ["#F3E9D2", "#E6007E", "#FFD400", "#F3E9D2"][i - 1];
      el("polygon", { points: MAT.pts(p), fill: fondo }, g);
      if (i === 1 || i === 4) el("polygon", { points: MAT.pts(p), fill: t.trama, opacity: .45 }, g);
      if (i === 2) el("polygon", { points: MAT.pts(p), fill: t.rayado, opacity: .3 }, g);
      if (i === 3) { el("polygon", { points: MAT.pts(p), fill: t.papel }, g); el("path", { d: pincel([[X0 + 30, Y1 - 40], [X1 - 60, Y0 + 80]], 2, 10, 14), fill: TINTA }, g); }
      el("polygon", { points: MAT.pts(p), class: "dio-borde" }, g);
      if (i === 0) {
        // viñeta dominante: líneas de velocidad blancas y ドドド
        let d = ""; for (let k = 0; k < 26; k++) { const a = k / 26 * 6.283, cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, R1 = 60 + r() * 60, R2 = 900; d += `M${cx + Math.cos(a) * R1} ${cy + Math.sin(a) * R1}L${cx + Math.cos(a + .02) * R2} ${cy + Math.sin(a + .02) * R2}`; }
        const cp = el("clipPath", { id: MAT.uid("vc") }, defs); el("polygon", { points: MAT.pts(p) }, cp);
        el("path", { d, class: "dio-vel-blanca", "clip-path": `url(#${cp.id})` }, g);
        const tx = el("text", { x: (X0 + X1) / 2, y: (Y0 + Y1) / 2 + 40, class: "dio-ono-vin", "font-size": Math.round(H * .13) }, g); tx.textContent = "ドドド";
      }
      return { g, dx, dy, d: i };
    });
    let hecho = false;
    try {
      await reloj(900, u => {
        const abre = tramo(u, .58, 1);
        if (!hecho && u >= .5) { hecho = true; commit(); }
        papel.style.opacity = Math.min(1, tramo(u, .25, .4)) * (1 - ease.in(abre));
        vin.forEach(({ g, dx, dy, d }) => {
          const llega = ease.back(tramo(u, d * .06, d * .06 + .26)), va = ease.in(tramo(abre, d * .05, d * .05 + .7));
          const k = (1 - llega) + va;
          g.style.transform = `translate(${(dx * W * .9 * k).toFixed(1)}px,${(dy * H * .9 * k).toFixed(1)}px)`;
          g.style.opacity = u < .02 ? 0 : 1;
        });
      });
    } finally { quitar(c); }
  }

  /* C. Líneas de velocidad (600 ms): convergen al foco donde aparece el elemento
     principal (el título); trazos finos, masas negras y cortes de color, con una zona
     despejada alrededor del texto. La nueva diapositiva se abre desde ese foco. */
  async function velocidad({ commit, instantanea, quitar }) {
    const c = instantanea(), { svg, defs, W, H } = lienzo(c), r = rng(17);
    // foco: el título de la diapositiva nueva (aún no visible): esquina superior izquierda
    const F = [W * .3, H * .1];
    const g = el("g", {}, svg), tiras = [];
    for (let k = 0; k < 130; k++) {
      const a = k / 130 * 6.283 + (r() - .5) * .04, tipo = k % 9 === 0 ? "masa" : k % 6 === 0 ? "color" : "fina";
      const w = tipo === "masa" ? .045 + r() * .03 : tipo === "color" ? .02 : .004 + r() * .006;
      const R1 = 140 + r() * 120, R2 = Math.hypot(W, H) * 1.2;
      const p = [[F[0] + Math.cos(a) * R1, F[1] + Math.sin(a) * R1], [F[0] + Math.cos(a - w) * R2, F[1] + Math.sin(a - w) * R2], [F[0] + Math.cos(a + w) * R2, F[1] + Math.sin(a + w) * R2]];
      tiras.push({ e: el("polygon", { points: MAT.pts(p), fill: tipo === "color" ? (k % 2 ? "#FFD400" : "#E6007E") : TINTA, opacity: tipo === "fina" ? .85 : 1 }, g), r0: R1 });
    }
    let hecho = false;
    try {
      await reloj(600, u => {
        const llega = ease.out(tramo(u, 0, .35)), abre = ease.io(tramo(u, .38, .9));
        g.style.transformOrigin = `${F[0]}px ${F[1]}px`;
        g.style.transform = `scale(${2.2 - 1.2 * llega + .35 * abre})`;
        g.style.opacity = (u < .9 ? 1 : 1 - tramo(u, .9, 1)).toFixed(2);
        if (!hecho && u >= .38) { hecho = true; commit(); }
        if (hecho) { const rr = Math.hypot(W, H) * 1.15 * abre; const m = `radial-gradient(circle at ${F[0]}px ${F[1]}px, transparent ${rr}px, #000 ${rr + 2}px)`; c.style.webkitMaskImage = m; c.style.maskImage = m; }
      });
    } finally { quitar(c); }
  }

  /* D. Golpe (500 ms): anticipación (la página se comprime un poco), impacto (estrella
     irregular con bordes de tinta y salpicaduras, amarillo en la zona del golpe, marco
     desplazado 5 px) y asentamiento exacto, sin vibración residual. */
  async function golpe({ commit, instantanea, quitar }) {
    const c = instantanea(), { svg, defs, W, H } = lienzo(c), r = rng(29), t = defsTinta(defs);
    const P = [W * .52, H * .46], R = Math.min(W, H) * .42, { estrella, gotas } = impacto(r, P[0], P[1], R);
    const g = el("g", { style: `transform-origin:${P[0]}px ${P[1]}px` }, svg);
    el("path", { d: estrella, fill: "#FFD400", class: "dio-estrella" }, g);
    el("path", { d: estrella, fill: t.trama, opacity: .25 }, g);
    const { estrella: nucleo } = impacto(r, P[0], P[1], R * .45, 9);
    el("path", { d: nucleo, fill: "#FFFFFF", class: "dio-estrella" }, g);
    gotas.forEach(([x, y, s]) => el("circle", { cx: x, cy: y, r: s, fill: TINTA }, g));
    const destello = el("rect", { width: W, height: H, fill: "#FFF6CC", opacity: 0 }, svg);
    svg.insertBefore(destello, g);
    const vp = $("#viewport");
    let hecho = false;
    try {
      await reloj(500, u => {
        const anti = tramo(u, 0, .2), imp = ease.out(tramo(u, .2, .42)), sale = ease.in(tramo(u, .55, 1));
        if (!hecho) { c.copia.style.translate = `0 ${(4 * anti).toFixed(1)}px`; }
        g.style.transform = `scale(${(.15 + 1.05 * imp) * (1 + .5 * sale)})`;
        g.style.opacity = (imp > 0 ? 1 - sale : 0).toFixed(2);
        destello.setAttribute("opacity", (u < .3 ? 0 : u < .42 ? tramo(u, .3, .36) : 1 - ease.out(tramo(u, .42, .7))).toFixed(2));
        if (!hecho && u >= .37) { hecho = true; c.copia.remove(); commit(); }
        // desplazamiento breve del marco (≤ 5 px) solo durante el impacto
        const sh = u > .2 && u < .5 ? Math.sin((u - .2) * 60) * 5 * (1 - tramo(u, .2, .5)) : 0;
        vp.style.translate = `${sh.toFixed(1)}px ${(-sh * .6).toFixed(1)}px`;
      });
    } finally { vp.style.translate = ""; quitar(c); }
  }

  MUNDOS.transiciones("dio", [
    { nombre: "Tiempo detenido", ms: 700, run: detenido },
    { nombre: "Página de manga", ms: 900, run: manga },
    { nombre: "Líneas de velocidad", ms: 600, run: velocidad },
    { nombre: "Golpe", ms: 500, run: golpe }
  ]);
})();

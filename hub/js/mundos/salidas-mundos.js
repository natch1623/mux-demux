"use strict";
/* =====================================================================
   Salidas de Tsaritsa (§4.2), Venom (§5.2) y DIO (§6.2) con el acabado de
   materiales (js/mundos/materiales.js). Reemplazan a las de secuencias-mundos.js.
   Cada una termina con una capa del puente (fondo #0D0F14 + cable gris limpio a
   media altura, PUENTE.cable) y la devuelve sin quitarla: el núcleo la retira al
   empezar el vuelo de regreso.
   ===================================================================== */
(() => {
  const { el, rng, lienzo, reloj, ease, tramo, suave, linea, pts, defsHielo, esquirla, ramas, defsViscosa, vsCanto, reflejos, defsTinta, pincel, reloj2 } = MAT;
  const FONDO = "#0D0F14";
  // cable del puente en su capa, detrás de lo que ya haya en ella
  const cableAtras = (c, desde) => { const s = PUENTE.cable(c, { desde, senal: false }); c.prepend(s); return s; };
  // de unidades de diseño del cable (origen al centro) a px de pantalla
  const aPx = () => { const s = Math.min(innerWidth / FW, innerHeight / FH); return (x, y) => [innerWidth / 2 + x * s, innerHeight / 2 + y * s]; };

  /* ---------------- Tsaritsa ----------------
     Una lámina de hielo cubre por congelación progresiva desde los bordes; se forma una
     grieta y la lámina se desprende en pocas piezas grandes, dejando el circuito. A la
     vez la escarcha retrocede por el cable, los cristales se recogen y queda una niebla
     baja breve; las gotas nacen de la condensación en los bordes de las piezas. */
  async function salirTsaritsa(ctx) {
    const c = ctx.capa("se se-tz salida"), r = rng(13);
    c.style.background = "transparent";
    const { svg, defs, W, H } = lienzo(c), m = defsHielo(defs), D = Math.hypot(W, H);
    // congelación desde los cuatro bordes hacia el centro (máscara con borde irregular)
    // recorte vectorial con hueco (regla par-impar) en vez de máscara
    const mid = MAT.uid("tzs"), mask = el("clipPath", { id: mid, clipPathUnits: "userSpaceOnUse" }, defs);
    const marco = `M0 0H${W}V${H}H0Z`, recorte = el("path", { d: marco, "clip-rule": "evenodd" }, mask);
    const hueco = { setAttribute: (_, d) => recorte.setAttribute("d", marco + d) };
    const lam = el("g", { "clip-path": `url(#${mid})` }, svg);
    el("rect", { width: W, height: H, fill: "#0C2D47" }, lam);
    el("rect", { width: W, height: H, fill: m.cara, opacity: .9 }, lam);
    el("rect", { width: W, height: H, fill: m.escarcha }, lam);
    const filo = el("path", { class: "tz-frente-filo" }, svg);
    const fase = Array.from({ length: 5 }, () => r() * 6);
    const forma = R => { const p = []; for (let k = 0; k < 64; k++) { const a = k / 64 * 6.283; const q = R * (1 + .08 * Math.sin(a * 5 + fase[0]) + .05 * Math.sin(a * 11 + fase[1]) + .03 * Math.sin(a * 23 + fase[2])); p.push([W / 2 + Math.cos(a) * q * W / D, H / 2 + Math.sin(a) * q * H / D]); } return suave(p); };
    await reloj(520, t => { const R = D * .75 * (1 - ease.io(t)); const d = R > 2 ? forma(R) : ""; hueco.setAttribute("d", d); filo.setAttribute("d", d); filo.style.opacity = 1 - tramo(t, .85, 1); });
    filo.remove();
    // debajo ya está el circuito: fondo del puente y el cable con escarcha que retrocede
    c.style.background = FONDO;
    const cable = cableAtras(c, ctx.desde), P = aPx(), [cx0, cy0] = P(0, 0), [xa] = P(-FW, 0), [xb] = P(FW, 0);
    const cristales = Array.from({ length: 30 }, (_, i) => { const x = xa + (xb - xa) * (i + .5) / 30, s = 6 + r() * 9, up = i % 2 ? -1 : 1; return el("path", { class: "tz-cr-cable", d: `M${x} ${cy0}L${x + s * .6} ${cy0 - up * s * 1.6}L${x} ${cy0 - up * s * 2.6}L${x - s * .6} ${cy0 - up * s * 1.6}Z` }, svg); });
    cristales.forEach(e => svg.insertBefore(e, lam));
    const niebla = el("rect", { y: H * .62, width: W, height: H * .38, class: "tz-niebla-baja" }, svg);
    svg.insertBefore(niebla, lam);
    // grieta principal y desprendimiento en cinco piezas grandes con espesor
    const ox = W * (.42 + r() * .16), oy = H * (.4 + r() * .2);
    const grieta = el("path", { d: Array.from({ length: 5 }, (_, i) => ramas(r, ox, oy, i / 5 * 6.283 + r() * .5, D * .6, 1, .45)).join(""), class: "tz-grieta", pathLength: 1 }, svg);
    await reloj(180, t => { grieta.style.strokeDashoffset = 1 - t; });
    lam.remove(); mask.remove();
    const n = 5, ang = Array.from({ length: n }, (_, i) => i / n * 6.283 + (r() - .5) * .6), Lj = D;
    const borde = a => [ox + Math.cos(a) * Lj, oy + Math.sin(a) * Lj], q = a => [ox + Math.cos(a) * D * .18 + (r() - .5) * 40, oy + Math.sin(a) * D * .18 + (r() - .5) * 40];
    const piezas = ang.map((a, i) => { const b = ang[(i + 1) % n] + (i === n - 1 ? 6.283 : 0); return esquirla(svg, [[ox, oy], q(a), borde(a), borde((a + b) / 2), borde(b), q(b)], m, { grosor: 24, r }); });
    grieta.remove();
    // gotas de condensación en los bordes de las piezas (secundarias)
    const gotas = Array.from({ length: 14 }, () => el("ellipse", { class: "tz-gota-c", rx: 2.5 + r() * 3, ry: 4 + r() * 5 }, svg));
    const gp = gotas.map(() => { const pz = piezas[Math.floor(r() * n)].c; return [pz[0] + (r() - .5) * 200, pz[1] + (r() - .5) * 120, .6 + r() * .8]; });
    await reloj(900, t => {
      piezas.forEach((g, i) => { const [x, y] = g.c, dx = x - ox, dy = y - oy, L = Math.hypot(dx, dy) || 1, a = ease.in(tramo(t, 0, .8)), gi = (i % 2 ? 1 : -1) * (18 + i * 6);
        g.style.transform = `translate(${dx / L * D * .4 * a}px,${dy / L * D * .4 * a + 420 * a * a}px) rotate(${gi * a}deg) scale(${1 - .12 * a})`; g.style.opacity = 1 - tramo(t, .55, .85);
        g.arista.style.opacity = .3 + .7 * Math.abs(Math.cos(gi * a / 30 + i)); });
      gotas.forEach((e, i) => { const [x, y, v] = gp[i], u = tramo(t, .1 + v * .1, .9); e.setAttribute("cx", x); e.setAttribute("cy", y + 380 * u * u * v); e.style.opacity = u > 0 ? (1 - u) * .8 : 0; });
      // la escarcha retrocede desde los extremos hacia el centro
      cristales.forEach((e, i) => { const lejos = Math.abs(i - 14.5) / 15; e.style.opacity = 1 - tramo(t, .25 + (1 - lejos) * .45, .4 + (1 - lejos) * .5); });
      niebla.style.opacity = (Math.sin(Math.PI * tramo(t, .1, 1)) * .55).toFixed(2);
    });
    [...piezas, ...gotas, ...cristales, niebla].forEach(e => e.remove());
    return c;
  }

  /* ---------------- Venom ----------------
     La materia invade desde los bordes y cubre la diapositiva; luego es atraída hacia el
     punto donde conecta con el cable: la masa se alarga, los lóbulos convergen, se forma
     un cuello, los filamentos ceden y la última gota cae al cable y corre hacia el bloque. */
  async function salirVenom(ctx) {
    const c = ctx.capa("se se-vn salida"), r = rng(21);
    c.style.background = "transparent";
    const { svg, defs, W, H } = lienzo(c), m = defsViscosa(defs);
    const lado = ctx.desde === "derecha" ? 1 : -1, P = aPx(), [px, py] = P(lado * FW * .5, 0);
    // invasión: un hueco lobulado que se cierra desde los bordes
    const mid = MAT.uid("vns"), mask = el("clipPath", { id: mid, clipPathUnits: "userSpaceOnUse" }, defs);
    const marco = `M0 0H${W}V${H}H0Z`, recorte = el("path", { d: marco, "clip-rule": "evenodd" }, mask);
    const hueco = { setAttribute: (_, d) => recorte.setAttribute("d", marco + d) };
    const g = el("g", { "clip-path": `url(#${mid})` }, svg);
    el("rect", { width: W, height: H, fill: m.cuerpo }, g);
    const canto = vsCanto(svg, defs), brillo = el("path", { class: "vn-reflejo" }, svg);
    const fase = Array.from({ length: 40 }, () => r() * 6);
    const lob = (cx, cy, R, k = 1, alarg = 0, dirx = 1) => { const p = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, q = R * (1 + k * (.12 * Math.sin(a * 4 + fase[i % 7]) + .07 * Math.sin(a * 9 + fase[(i + 3) % 11]))); const e = 1 + alarg * Math.max(0, Math.cos(a) * dirx); p.push([cx + Math.cos(a) * q * e, cy + Math.sin(a) * q * (1 - alarg * .35)]); } return suave(p); };
    const D = Math.hypot(W, H) * .62;
    await reloj(520, t => { const R = D * (1 - ease.io(t)); const d = R > 3 ? lob(W / 2, H / 2, R, 1.3) : ""; hueco.setAttribute("d", d); canto(`M0 0H${W}V${H}H0Z` + d, d); brillo.setAttribute("d", d ? reflejos(Array.from({ length: 30 }, (_, i) => { const a = i / 30 * 6.283; return [W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R]; })) : ""); });
    // cubierta total: debajo el circuito; la masa es atraída hacia el punto del cable
    c.style.background = FONDO;
    cableAtras(c, ctx.desde);
    g.remove(); mask.remove(); brillo.remove();
    const cuerpo = el("path", { fill: m.cuerpo }, svg), canto2 = vsCanto(svg, defs), refl = el("path", { class: "vn-reflejo" }, svg);
    const cuello = el("path", { fill: m.cuerpo }, svg), gota = el("path", { fill: m.cuerpo, class: "vn-gota-c" }, svg), estela = el("path", { class: "vn-estela" }, svg);
    const R0 = Math.hypot(W, H) * .7;
    await reloj(950, t => {
      const a = ease.io(tramo(t, 0, .7));
      const cx = W / 2 + (px - lado * 80 - W / 2) * a, cy = H / 2 + (py - 120 - H / 2) * a, R = R0 * (1 - a) + 34 * a;
      const d = lob(cx, cy, R, 1 - a * .6, .6 * a, lado);
      cuerpo.setAttribute("d", d); canto2(d, d);
      refl.setAttribute("d", `M${cx - R * .5} ${cy - R * .55}Q${cx} ${cy - R * .85} ${cx + R * .45} ${cy - R * .6}`);
      // cuello y gota: se estira hacia el cable y cede
      const k = tramo(t, .55, .78), suelta = tramo(t, .78, 1);
      const gy = cy + R * .8 + (py - (cy + R * .8)) * ease.in(Math.max(k, suelta)), gx = px - lado * 80;
      const rr = 14 + 8 * k;
      gota.setAttribute("d", k > 0 ? `M${gx} ${gy - rr * 2.2}C${gx + rr * .3} ${gy - rr} ${gx + rr} ${gy - rr * .6} ${gx + rr} ${gy}A${rr} ${rr} 0 1 1 ${gx - rr} ${gy}C${gx - rr} ${gy - rr * .6} ${gx - rr * .3} ${gy - rr} ${gx} ${gy - rr * 2.2}Z` : "");
      cuello.setAttribute("d", k > 0 && suelta === 0 ? `M${gx - 9 * (1 - k)} ${cy + R * .6}Q${gx} ${(cy + gy) / 2} ${gx - 3} ${gy - rr * 1.6}L${gx + 3} ${gy - rr * 1.6}Q${gx + 2} ${(cy + gy) / 2} ${gx + 9 * (1 - k) + 2} ${cy + R * .6}Z` : "");
      // la masa restante se retira hacia arriba del borde y desaparece al soltar la gota
      cuerpo.style.opacity = refl.style.opacity = 1 - suelta;
      if (suelta > 0) cuerpo.parentNode && canto2("", "");
      // la gota corre por el cable hacia el bloque dejando una estela breve que se recoge
      const corre = ease.in(tramo(t, .86, 1)), xg = gx + lado * (W * .62) * corre;
      if (corre > 0) { gota.setAttribute("transform", `translate(${xg - gx} 0) scale(${1 - .5 * corre} ${1 - .3 * corre})`); gota.style.transformOrigin = `${gx}px ${py}px`; estela.setAttribute("d", `M${gx + (xg - gx) * .55} ${py}L${xg} ${py}`); estela.style.opacity = 1 - corre; }
    });
    [cuerpo, refl, cuello, gota, estela].forEach(e => e.remove()); canto2("", "");
    return c;
  }

  /* ---------------- DIO ----------------
     La diapositiva se congela en impresión gris; detrás de ella el reloj retrocede y
     unas viñetas se desplazan en sentido inverso; una fractura diagonal recorre la página
     y las dos mitades se separan dejando el circuito; el cable pierde su curva y su
     vibración, recupera el material común y empieza el regreso. */
  async function salirDio(ctx) {
    const c = ctx.instantanea();
    c.classList.add("se", "se-dio", "salida");
    const { svg, defs, W, H } = lienzo(c), t = defsTinta(defs), r = rng(33);
    c.copia.style.filter = "grayscale(1) contrast(1.3) brightness(.9) sepia(.15)";
    const trama = el("rect", { width: W, height: H, fill: t.fina, opacity: .2 }, svg);
    // marcos de viñeta que se desplazan en sentido inverso y el reloj que retrocede
    const marcos = [[.05, .08, .38, .36], [.55, .1, .4, .3], [.08, .55, .3, .38], [.6, .52, .34, .4]].map(([x, y, w, h]) => el("rect", { x: x * W, y: y * H, width: w * W, height: h * H, class: "dio-marco-inv" }, svg));
    const rl = reloj2(svg, W * .5, H * .5, Math.min(W, H) * .2);
    await reloj(620, u => {
      const a = ease.io(u);
      rl.larga.style.transform = `rotate(${-720 * a}deg)`; rl.corta.style.transform = `rotate(${-200 * a}deg)`;
      rl.style.opacity = Math.min(1, u * 4);
      marcos.forEach((e, i) => { e.style.transform = `translate(${(i % 2 ? 1 : -1) * 60 * a}px,${(i < 2 ? -1 : 1) * 30 * a}px)`; e.style.opacity = .9 * Math.min(1, u * 3); });
    });
    // debajo, el circuito: fondo del puente y el cable con contorno de tinta, tenso y curvo
    const fondo = html(`<div class="mundo-puente-fondo"></div>`); c.prepend(fondo);
    const cable = cableAtras(c, ctx.desde), alma = cable.firstChild;
    c.prepend(fondo);                                         // el fondo detrás del cable
    const Wd = +cable.getAttribute("viewBox").split(" ")[2];
    const tinta = alma.cloneNode(); tinta.setAttribute("class", "dio-cable-tinta"); alma.before(tinta);
    // fractura diagonal y separación de las dos mitades (cada una es una copia recortada)
    const bc = c.copia.getBoundingClientRect(), esc = bc.width / FW, lx = x => (x - bc.left) / esc, ly = y => (y - bc.top) / esc;
    const otra = c.copia.cloneNode(true); c.copia.after(otra);
    const fx = [W * .62, -20], fy = [W * .38, H + 20];
    const z = [[fx[0], fx[1]], [W * .55, H * .3], [W * .47, H * .52], [W * .44, H * .74], [fy[0], fy[1]]];       // zigzag de la fractura
    const izq = [[-20, -20], ...z, [-20, H + 20]], der = [[W + 20, -20], ...z, [W + 20, H + 20]];
    const clip = p => `polygon(${p.map(([x, y]) => `${lx(x).toFixed(1)}px ${ly(y).toFixed(1)}px`).join(",")})`;
    c.copia.style.clipPath = clip(izq); otra.style.clipPath = clip(der);
    const grieta = el("path", { d: pincel(z, 3, 3, 16), class: "dio-fractura" }, svg);
    [trama, ...marcos, rl].forEach(e => e.remove());
    await reloj(150, u => { grieta.style.opacity = u; });
    await reloj(620, u => {
      const a = ease.in(u);
      c.copia.style.translate = `${(-W * .7 * a).toFixed(1)}px ${(80 * a).toFixed(1)}px`; c.copia.style.rotate = `${-6 * a}deg`;
      otra.style.translate = `${(W * .7 * a).toFixed(1)}px ${(-40 * a).toFixed(1)}px`; otra.style.rotate = `${5 * a}deg`;
      grieta.style.opacity = 1 - tramo(u, .1, .4);
      // el cable pierde su curva y su vibración
      const amp = 46 * (1 - ease.out(tramo(u, .2, 1))), vib = Math.sin(u * 40) * 6 * (1 - u);
      alma.setAttribute("d", `M${-Wd / 2 - 20} 0Q0 ${(amp + vib).toFixed(1)} ${Wd / 2 + 20} 0`);
      tinta.setAttribute("d", alma.getAttribute("d")); tinta.style.opacity = 1 - tramo(u, .5, 1);
    });
    c.copia.remove(); otra.remove(); grieta.remove(); tinta.remove();
    alma.setAttribute("d", `M${-Wd / 2 - 20} 0H${Wd / 2 + 20}`);
    return c;
  }

  MUNDOS.secuencias("tsaritsa", { salir: salirTsaritsa });
  MUNDOS.secuencias("venom", { salir: salirVenom });
  MUNDOS.secuencias("dio", { salir: salirDio });
})();

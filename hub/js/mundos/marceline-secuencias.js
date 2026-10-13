"use strict";
/* =====================================================================
   Marceline · secuencias (S₁S₀ = 00). Especificación §1.4, §1.6 y §1.9;
   contrato: docs/MUNDOS-CONTRATO.md (§3 API y §8 nombres compartidos).

   - entrar: el cable del puente se vuelve cuerda de bajo; el pulso la pulsa,
     viaja, la hace vibrar y suena en la cejuela. Una mano pinta la estación con
     crayón, cae el papel arrugado, entran cinco murciélagos, el título se
     escribe con marcador y uno de ellos se posa en la inicial (el de la escena
     toma su lugar sin salto).
   - salir: el crayón vuelve a cubrir con el fondo del puente desde el lado del
     cable, la cuerda se desafina, se aplana y queda el cable gris; la capa se
     devuelve sin quitarla.
   - transiciones, en rotación: Página de cuaderno 700 ms · Murciélago borrador
     900 ms · Acorde rojo 600 ms · Garabato 800 ms.

   Todo es dibujo propio (SVG, CSS y canvas). Cada espera pasa por ctx.anim,
   ctx.esperar o tween: «Omitir transición» (Esc) deja el estado final al instante.
   La cuerda usa las unidades de diseño del puente (PUENTE.cable): la costura con
   el vuelo es exacta.
   ===================================================================== */
(() => {
  /* ---------- paleta, medidas y curvas ---------- */
  const P = { noche: "#1B1330", papel: "#2A2140", morado: "#7B4FD6", vino: "#B3203F", piel: "#8FA3B8", amarillo: "#F2C14E", texto: "#F4EFE6", crayon: "#D9CDB8", cuerpo: "#130B22" };
  // colores del puente: los de su hoja (--pt-*) si están, para empalmar exacto
  function puente() {
    const cs = getComputedStyle(document.documentElement), v = (n, d) => cs.getPropertyValue(n).trim() || d;
    return { fondo: v("--pt-fondo", "#0D0F14"), cable: v("--pt-cable", "#4A515E"), cian: v("--pt-cian", "#4DF3FF"), nucleo: v("--pt-nucleo", "#E4FEFF") };
  }
  // w, h: pantalla en px · s: escala de la cámara · W, H: pantalla en unidades de diseño
  function medir() {
    const w = innerWidth, h = innerHeight, s = Math.min(w / FW, h / FH);
    return { w, h, s, W: w / s, H: h / s };
  }
  const lineal = t => t;
  const io = t => t < .5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
  const sale = t => 1 - (1 - t) ** 3;
  const rebote = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
  const tramo = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const mix = (a, b, t) => a + (b - a) * t;
  const F = n => +n.toFixed(2);
  const azar = s => () => (s = s * 16807 % 2147483647) / 2147483647;
  const rgb = c => {
    c = String(c).trim();
    if (c[0] === "#") { let x = c.slice(1); if (x.length < 6) x = [...x].map(d => d + d).join(""); const n = parseInt(x.slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    const m = c.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
  };
  const mixColor = (a, b, t) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(mix(v, y[i], t))).join(",")})`; };
  // sonido opcional (REALMS.tone ya respeta el botón de sonido); nunca al omitir
  const tono = (k = "touch") => { if (!MOTION.skip) REALMS.tone("marceline", k); };
  let serie = 0;

  /* reloj de las secuencias: como tween, pero (1) pinta el estado inicial en el acto,
     (2) deja pasar `calentar` cuadros antes de contar (el primer raster de las capas
     nuevas no se come la animación) y (3) avanza a lo sumo 34 ms por cuadro: un tirón
     pausa el dibujo en vez de saltarse lo que tenía que verse. Omitir (Esc) o ?still
     dejan el estado final al instante, igual que tween. */
  function animar(ms, fn, curva = t => t, calentar = 0) {
    return new Promise(res => {
      if (ms <= 0 || reduced || MOTION.skip) { fn(curva(1)); res(); return; }
      let raf = 0, done = false, t = 0, prev = performance.now();
      const finish = () => { if (done) return; done = true; cancelAnimationFrame(raf); MOTION.pending.delete(finish); fn(curva(1)); res(); };
      MOTION.pending.add(finish);
      fn(curva(0));
      const step = now => {
        if (done) return;
        if (reduced || MOTION.skip) { finish(); return; }
        if (calentar > 0) { calentar--; prev = now; raf = requestAnimationFrame(step); return; }
        t += clamp(now - prev, 0, 34);
        prev = now;
        const p = clamp(t / ms, 0, 1);
        fn(curva(p));
        if (p < 1) raf = requestAnimationFrame(step); else { done = true; MOTION.pending.delete(finish); res(); }
      };
      raf = requestAnimationFrame(step);
    });
  }

  /* =====================================================================
     Crayón en un lienzo: textura de cera (vetas y poros) y la mano que pinta
     ===================================================================== */
  let cera = null;
  function textura() {
    if (cera) return cera;
    const n = 160, cv = document.createElement("canvas"), r = azar(11);
    cv.width = cv.height = n;
    const g = cv.getContext("2d"), img = g.createImageData(n, n), d = img.data, cruda = Array.from({ length: n }, r);
    const veta = x => { let s = 0; for (let j = -2; j <= 2; j++) s += cruda[(x + j + n * 4) % n] * (3 - Math.abs(j)); return s / 9; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      // vetas casi verticales (el sentido de los barridos) que ondulan un poco
      let a = .97 - .66 * clamp((veta(x + Math.round(3 * Math.sin(y / n * Math.PI * 4))) - .54) / .2, 0, 1);
      if (r() < .1) a *= .16;            // poros del papel: la cera no entra
      a *= .8 + .2 * r();
      const i = (y * n + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    return (cera = cv);
  }
  // la textura teñida, como patrón del lienzo g
  function patron(g, color) {
    const t = textura(), cv = document.createElement("canvas");
    cv.width = t.width; cv.height = t.height;
    const c = cv.getContext("2d");
    c.drawImage(t, 0, 0);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = color; c.fillRect(0, 0, cv.width, cv.height);
    return g.createPattern(cv, "repeat");
  }
  // lienzo a pantalla completa (× devicePixelRatio, máx. 2), debajo de lo que ya tenga la capa
  function lienzo(capa, M) {
    const dpr = Math.min(2, devicePixelRatio || 1), cv = document.createElement("canvas");
    cv.className = "mc-lienzo";
    cv.width = Math.round(M.w * dpr); cv.height = Math.round(M.h * dpr);
    capa.prepend(cv);
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { cv, g };
  }
  /* recorrido de la mano: barridos diagonales alternos (baja, sube) que avanzan de un
     borde al otro; puntos cada ~8 px con su largo acumulado y el ancho del crayón */
  function barridos(M, desdeIzq, semilla) {
    const { w, h } = M, r = azar(semilla), ancho = .36 * h, paso = ancho / 1.9, m = .1 * h, v = [];
    for (let i = 0, x = -ancho * .45; x < w + ancho * .9; i++, x += paso) v.push([x + (r() - .5) * paso * .3, i % 2 ? h + m : -m]);
    const pts = [];
    let L = 0;
    for (let i = 0; i < v.length - 1; i++) {
      const [x0, y0] = v[i], [x1, y1] = v[i + 1];
      const cx = (x0 + x1) / 2 + (r() - .5) * paso * 1.1, cy = (y0 + y1) / 2 + (r() - .5) * h * .12;
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8);
      for (let j = i ? 1 : 0; j <= n; j++) {
        const t = j / n, u = 1 - t;
        let x = u * u * x0 + 2 * u * t * cx + t * t * x1;
        const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
        if (!desdeIzq) x = w - x;
        const q = pts[pts.length - 1];
        if (q) L += Math.hypot(x - q.x, y - q.y);
        pts.push({ x, y, L, w: ancho * (.88 + .12 * Math.sin(L / 83 + i * 1.7)) });
      }
    }
    return { pts, L, ancho, desdeIzq };
  }
  const indice = (pts, s) => { let a = 0, b = pts.length - 1; while (b - a > 1) { const m = (a + b) >> 1; if (pts[m].L < s) a = m; else b = m; } return a; };
  function linea(g, pts, off) {
    g.beginPath();
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = a.y - b.y, ny = b.x - a.x;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l; ny /= l;
      g[i ? "lineTo" : "moveTo"](p.x + nx * off, p.y + ny * off);
    });
    g.stroke();
  }
  /* un tramo [s0, s1] del recorrido con trazo de crayón: núcleo con la textura y dos
     cantos rotos (discontinuos) para que el borde nunca quede limpio */
  function trazar(g, rec, s0, s1, estilo, alPunto) {
    s1 = Math.min(s1, rec.L);
    if (s1 - s0 < .5) return;
    const pts = rec.pts.slice(indice(rec.pts, s0), indice(rec.pts, s1) + 2);
    if (pts.length < 2) return;
    const w = pts.reduce((a, p) => a + p.w, 0) / pts.length;
    g.strokeStyle = estilo; g.lineJoin = "round";
    g.lineCap = "round"; g.setLineDash([]); g.globalAlpha = 1; g.lineWidth = w * .78;
    linea(g, pts, 0);
    g.lineCap = "butt"; g.lineWidth = w * .16; g.globalAlpha = .7;
    g.setLineDash([w * .22, w * .07, w * .09, w * .05]); g.lineDashOffset = -s0;
    linea(g, pts, w * .43); linea(g, pts, -w * .43);
    g.setLineDash([]); g.globalAlpha = 1;
    if (alPunto) pts.forEach(p => alPunto(p, w));
  }
  /* la mano pinta el recorrido: delante va el crayón morado y, un barrido detrás, el
     destino: "borrar" abre lo que hay debajo (la estación); un color, lo cubre */
  function mano(g, rec, { ms, destino, alPunto, alCuadro }) {
    const morado = patron(g, P.morado), fin = destino === "borrar" ? patron(g, "#000") : patron(g, destino);
    const lag = rec.ancho * 3, total = rec.L + lag;
    let cab = 0, cola = 0;
    return animar(ms, t => {
      const s = total * io(t), c1 = Math.min(rec.L, s), k1 = Math.max(0, s - lag);
      g.globalCompositeOperation = "source-over";
      trazar(g, rec, cab, c1, morado, alPunto);
      g.globalCompositeOperation = destino === "borrar" ? "destination-out" : "source-over";
      trazar(g, rec, cola, k1, fin);
      g.globalCompositeOperation = "source-over";
      cab = c1; cola = k1;
      alCuadro?.(t);
    }, lineal);
  }

  /* =====================================================================
     La cuerda de bajo sobre el cable del puente (unidades de diseño, origen en el
     centro de la pantalla, igual que PUENTE.cable): alma, entorchado, brillo y ecos
     de la vibración con un feTurbulence suave SOLO sobre la cuerda; trastes,
     cejuela y clavija; estela y pulso cian del puente con stroke-dashoffset.
     ===================================================================== */
  const PULSO = (typeof PUENTE !== "undefined" && PUENTE.PULSO) ||
    [["pt-p-halo", -8, 48, 40], ["pt-p-cuerpo", 0, 40, 12], ["pt-p-nucleo", 3, 30, 5]].map(([cls, a, b, w]) => ({ cls, w, a: a + w / 2, b: b - w / 2 }));
  const ESTELA = (typeof PUENTE !== "undefined" && PUENTE.ESTELA) || ["pt-halo", "pt-brillo", "pt-hilo"];
  const CABLE = (typeof PUENTE !== "undefined" && PUENTE.CABLE) || 6;

  function cuerda(capa, M, pu, desde) {
    const { W, H } = M, id = "mcq" + ++serie;
    const izq = desde !== "izquierda";                  // la cejuela queda lejos del cable: a la izquierda en el MUX
    const sg = izq ? -1 : 1;                            // sentido del viaje del pulso en x
    const xA = -sg * (W / 2 + 40), xB = sg * (W / 2 - W * .075), xF = sg * (W / 2 + 40);
    const largo = Math.abs(xB - xA), uc = Math.abs(xA) / largo;
    const xP = xB + sg * W * .04, yP = -H * .045;       // clavija, más allá de la cejuela
    const svg = mk("svg", { class: "mc-cuerda", viewBox: `${F(-W / 2)} ${F(-H / 2)} ${F(W)} ${F(H)}`, "aria-hidden": "true" }, capa);
    const defs = mk("defs", {}, svg);
    const fl = mk("filter", { id: id + "f", filterUnits: "userSpaceOnUse", x: F(-W / 2 - 60), y: -170, width: F(W + 120), height: 340 }, defs);
    mk("feTurbulence", { type: "fractalNoise", baseFrequency: ".013 .08", numOctaves: 2, seed: 7, result: "r" }, fl);
    const desplaza = mk("feDisplacementMap", { in: "SourceGraphic", in2: "r", scale: 0, xChannelSelector: "R", yChannelSelector: "G" }, fl);

    // mástil: cuatro trastes pequeños, cejuela de hueso y clavija
    const mastil = mk("g", { class: "mc-mastil" }, svg), r = azar(5);
    const forma = (h, w) => `M${-w} ${-h}Q${-w * 1.6} ${h * .1} ${-w * .8} ${h}L${w * .9} ${h * .97}Q${w * 1.5} ${-h * .1} ${w * 1.05} ${-h * 1.04}Z`;
    const trastes = [.15, .28, .39, .48].map(fr => {
      const g = mk("g", { transform: `translate(${F(xB - sg * fr * W)} 0) rotate(${F((r() - .5) * 8)})` }, mastil), i = mk("g", {}, g);
      mk("path", { class: "mc-traste-sombra", d: forma(30, 4), transform: "translate(3 3)" }, i);
      mk("path", { class: "mc-traste", d: forma(30, 4) }, i);
      return i;
    });
    const cejuela = mk("g", {}, mk("g", { transform: `translate(${F(xB)} 0)` }, mastil));
    mk("path", { class: "mc-cejuela", d: "M-6 -27L6 -28L7 27L-7 28Z" }, cejuela);
    const clavija = mk("g", {}, mk("g", { transform: `translate(${F(xP)} ${F(yP)})` }, mastil));
    mk("circle", { class: "mc-clavija", r: 13 }, clavija);
    mk("path", { class: "mc-clavija-eje", d: "M-5 0H5M0 -5V5" }, clavija);

    // la cuerda, con el temblor de crayón
    const cg = mk("g", { class: "mc-cuerda-trazo", filter: `url(#${id}f)` }, svg);
    const ecos = [mk("path", { class: "mc-eco" }, cg), mk("path", { class: "mc-eco" }, cg)];
    const resto = mk("path", { class: "mc-resto", d: `M${F(xB)} 0H${F(xF)}` }, cg);
    const punta = mk("path", { class: "mc-punta", d: `M${F(xB)} 0L${F(xP)} ${F(yP)}` }, cg);
    const alma = mk("path", { class: "mc-alma", pathLength: 1000 }, cg);
    const ento = mk("path", { class: "mc-entorchado" }, cg);
    const brillo = mk("path", { class: "mc-brillo" }, cg);
    // estela y pulso del puente (sin temblor): mismas clases que PUENTE.cable
    const estela = mk("g", { class: "pt-tramo" }, svg);
    const luz = ESTELA.map(c => mk("path", { class: c, pathLength: 1000 }, estela));
    const pulso = mk("g", { class: "pt-pulso" }, svg);
    const capasPulso = PULSO.map(p => mk("path", { class: p.cls, "stroke-width": p.w, pathLength: 1000 }, pulso));

    const N = 120;
    const camino = (f, dy = 0) => {
      let d = "";
      for (let i = 0; i <= N; i++) { const u = i / N; d += `${i ? "L" : "M"}${F(xA + (xB - xA) * u)} ${F(f(u) + dy)}`; }
      return d;
    };
    const plano = () => 0;
    /* un cuadro: { forma(u), grosor, color, temblor, ento, eco(u), ecoOp, resto, punta, revela,
       mastil: { tr: [4], cej, clav }, luz, pulso: { u, op } } */
    function pintar(e) {
      const f = e.forma || plano, d = camino(f);
      desplaza.setAttribute("scale", F(5 * (e.temblor || 0)));
      alma.setAttribute("d", d);
      alma.setAttribute("stroke", e.color);
      alma.setAttribute("stroke-width", F(e.grosor));
      alma.setAttribute("stroke-dasharray", e.revela == null || e.revela >= 1 ? "none" : `${F(e.revela * 1000)} 3000`);
      resto.setAttribute("stroke", e.restoColor || e.color);
      resto.setAttribute("stroke-width", F(e.restoGrosor || e.grosor));
      resto.style.opacity = e.resto ?? 1;
      punta.style.opacity = e.punta || 0;
      const en = e.ento || 0;
      ento.style.opacity = F(en * .85);
      brillo.style.opacity = F(en * .55);
      if (en > 0) {
        ento.setAttribute("d", d); ento.setAttribute("stroke-width", F(e.grosor * .72));
        brillo.setAttribute("d", camino(f, -e.grosor * .24)); brillo.setAttribute("stroke-width", F(e.grosor * .2));
      }
      ecos.forEach((p, i) => {
        p.style.opacity = e.eco ? F(e.ecoOp || 0) : 0;
        if (e.eco && e.ecoOp > .005) { p.setAttribute("d", camino(u => (i ? -1 : 1) * e.eco(u))); p.setAttribute("stroke", e.color); p.setAttribute("stroke-width", F(e.grosor * .7)); }
      });
      const m = e.mastil || {};
      trastes.forEach((t, i) => t.setAttribute("transform", `scale(1 ${F(m.tr?.[i] || 0)})`));
      cejuela.setAttribute("transform", `scale(${F(m.cej || 0)})`);
      clavija.setAttribute("transform", `scale(${F(m.clav || 0)}) rotate(${F((1 - (m.clav || 0)) * -120)})`);
      mastil.style.opacity = m.op ?? 1;
      // estela: del borde del cable a la cabeza (dashoffset); pulso: 40 unidades detrás de la cabeza
      const p = e.pulso;
      estela.style.opacity = p ? F(p.op * (e.luz ?? 1)) : 0;
      pulso.style.opacity = p ? F(p.op) : 0;
      if (p) {
        const u = p.u * 1000;
        luz.forEach(l => { l.setAttribute("d", d); l.setAttribute("stroke-dasharray", `${F(u)} 3000`); });
        capasPulso.forEach((c, i) => {
          const a = PULSO[i].a / largo * 1000, b = PULSO[i].b / largo * 1000;
          c.setAttribute("d", d);
          c.setAttribute("stroke-dasharray", `${F(b - a)} 3000`);
          c.setAttribute("stroke-dashoffset", F(-(u - b)));
        });
      }
    }
    return { svg, pintar, uc, xA, xB, sg, largo, x: u => xA + (xB - xA) * u };
  }
  // del cable del puente a la cuerda: el estado inicial es exactamente el cable con la señal
  const cableInicial = (pu, uc) => ({ grosor: CABLE, color: pu.cable, ento: 0, resto: 1, punta: 0, mastil: { op: 0 }, luz: 1, pulso: { u: uc, op: 1 } });

  /* =====================================================================
     Murciélagos (dibujo propio). Mismas proporciones que el posado de la escena
     (viewBox de 80 × 80): así, al plegar las alas, se funde con él.
     ===================================================================== */
  const ALA = "M33 40C21 31 6 21-10 18C-32 15-55 21-74 32C-66 36-62 42-60 50C-52 44-42 44-36 52C-30 44-20 44-14 54C-8 46 2 46 8 56C16 50 26 52 34 58Z";
  const DEDOS = "M-10 18L-60 50M-10 18L-36 52M-10 18L-14 54M-10 18L8 56";
  function murcielago(padre, cls = "") {
    const s = mk("svg", { class: "mc-murcielago " + cls, viewBox: "-80 -20 240 120", "aria-hidden": "true" }, padre);
    for (const lado of ["i", "d"]) {
      const g = mk("g", { class: "mc-ala " + lado }, s), h = mk("g", lado === "d" ? { transform: "translate(80 0) scale(-1 1)" } : {}, g);
      mk("path", { class: "mc-bat-cuerpo", d: ALA }, h);
      mk("path", { class: "mc-bat-pliegue", d: DEDOS }, h);
      mk("path", { class: "mc-bat-borde", d: ALA }, h);
    }
    const c = mk("g", { class: "mc-torso" }, s);
    const torso = "M33 36Q29 50 35 63Q40 68 45 63Q51 50 47 36Z", cabeza = "M26 30L26 16L29 4L35 12L40 10L45 12L51 4L54 16L54 30L46 38L34 38Z";
    mk("path", { class: "mc-bat-cuerpo", d: torso }, c);
    mk("path", { class: "mc-bat-borde", d: torso }, c);
    mk("path", { class: "mc-bat-pata", d: "M37 64L36 70M43 64L44 70" }, c);
    mk("path", { class: "mc-bat-cuerpo", d: cabeza }, c);
    mk("path", { class: "mc-bat-borde", d: cabeza }, c);
    mk("path", { class: "mc-bat-oreja", d: "M30 15L30.5 9L33 13M50 15L49.5 9L47 13" }, c);
    mk("ellipse", { class: "mc-bat-mejilla", cx: 30.5, cy: 29, rx: 3.2, ry: 1.8 }, c);
    mk("ellipse", { class: "mc-bat-mejilla", cx: 49.5, cy: 29, rx: 3.2, ry: 1.8 }, c);
    mk("ellipse", { class: "mc-bat-ojo", cx: 34.5, cy: 23, rx: 3.1, ry: 3.7 }, c);
    mk("ellipse", { class: "mc-bat-ojo", cx: 45.5, cy: 23, rx: 3.1, ry: 3.7 }, c);
    mk("circle", { class: "mc-bat-pupila", cx: 35.2, cy: 23.6, r: 1.3 }, c);
    mk("circle", { class: "mc-bat-pupila", cx: 46.2, cy: 23.6, r: 1.3 }, c);
    mk("path", { class: "mc-bat-colmillo", d: "M37.2 31.6L38.4 35.6L39.6 31.6ZM40.4 31.6L41.6 35.6L42.8 31.6Z" }, c);
    mk("path", { class: "mc-bat-boca", d: "M36.4 31.2Q40 33.2 43.6 31.2" }, c);
    return s;
  }
  // coloca un murciélago: (x, y) en px es el centro de su caja de 80 × 80; e = px por unidad
  const ubicar = (el, x, y, rot, e) => { el.style.transform = `translate(${F(x)}px,${F(y)}px) rotate(${F(rot)}deg) scale(${e.toFixed(4)})`; };
  const bezier = (p, t) => { const u = 1 - t; return [0, 1].map(j => u * u * u * p[0][j] + 3 * u * u * t * p[1][j] + 3 * u * t * t * p[2][j] + t * t * t * p[3][j]); };
  // inclinación suave según el rumbo (alabeo), sin dar vuelta la silueta
  const alabeo = (dx, dy) => clamp(Math.atan2(dy * (dx < 0 ? -1 : 1), Math.abs(dx) + 1e-6) * 180 / Math.PI * .45, -24, 24);

  /* =====================================================================
     ENTRADA (§1.4, ≈ 4,8 s)
     ===================================================================== */
  /* letras del título con su caja en pantalla y su estilo (para la copia en SVG) */
  function letrasDe(h2) {
    const out = [], rango = document.createRange();
    const w = document.createTreeWalker(h2, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest(".mc-posado, svg") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    for (let n; (n = w.nextNode());) {
      const cs = getComputedStyle(n.parentElement), t = n.data;
      for (let i = 0; i < t.length;) {
        const len = t.codePointAt(i) > 0xffff ? 2 : 1, ch = t.slice(i, i + len);
        if (ch.trim()) { rango.setStart(n, i); rango.setEnd(n, i + len); const r = rango.getBoundingClientRect(); if (r.width) out.push({ ch, r, cs }); }
        i += len;
      }
    }
    return out;
  }
  // línea de base del título: una caja vacía en línea se apoya en ella (se quita en el acto)
  function lineaBase(h2) {
    const s = document.createElement("span");
    s.style.cssText = "display:inline-block;width:0;height:0;margin:0;padding:0;border:0;vertical-align:baseline";
    const t = document.createTreeWalker(h2, NodeFilter.SHOW_TEXT).nextNode();
    (t ? t.parentNode : h2).insertBefore(s, t ? t.nextSibling : null);
    const y = s.getBoundingClientRect().bottom;
    s.remove();
    return y;
  }
  const sombraDe = ts => { const m = ts && ts !== "none" && ts.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})\s+(-?[\d.]+)px\s+(-?[\d.]+)px/i); return m ? { c: m[1], x: +m[2], y: +m[3] } : null; };

  /* el título se escribe con marcador: copia en SVG letra por letra, alineada con el h2
     real (caja de cada carácter); el contorno se traza con stroke-dasharray y luego se
     llena. Devuelve { svg, listo } o null */
  function escribir(ctx, capa, h2, ms) {
    const letras = letrasDe(h2);
    if (!letras.length) return null;
    const M = medir(), esc = h2.getBoundingClientRect().width / (h2.offsetWidth || 1), base = lineaBase(h2);
    const svg = mk("svg", { class: "mc-escritura", viewBox: `0 0 ${F(M.w)} ${F(M.h)}`, "aria-hidden": "true" }, capa);
    const sombras = mk("g", {}, svg), trazos = mk("g", {}, svg);
    const n = letras.length, paso = n > 1 ? Math.max(0, ms - 470) / (n - 1) : 0;
    const listo = Promise.all(letras.map((l, i) => {
      const fs = parseFloat(l.cs.fontSize) * esc, L = F(fs * 6), d0 = i * paso, Lp = L + "px";
      const estilo = `font-family:${l.cs.fontFamily};font-size:${F(fs)}px;font-weight:${l.cs.fontWeight};font-style:${l.cs.fontStyle};text-transform:${l.cs.textTransform}`;
      const sh = sombraDe(l.cs.textShadow), anims = [];
      if (sh) {
        const s = mk("text", { x: F(l.r.left + sh.x * esc), y: F(base + sh.y * esc), fill: sh.c, style: estilo, opacity: 0 }, sombras, l.ch);
        anims.push(ctx.anim(s, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: d0 + 190, easing: "ease-out" }));
      }
      const t = mk("text", { x: F(l.r.left), y: F(base), fill: l.cs.color, stroke: l.cs.color, "stroke-width": F(fs * .032), "stroke-linejoin": "round", "stroke-linecap": "round", "stroke-dasharray": `${L} ${L}`, "stroke-dashoffset": L, "fill-opacity": 0, style: estilo }, trazos, l.ch);
      anims.push(
        ctx.anim(t, [{ strokeDashoffset: Lp }, { strokeDashoffset: "0px" }], { duration: 300, delay: d0, easing: "cubic-bezier(.3,.1,.3,1)" }),
        ctx.anim(t, [{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 200, delay: d0 + 190, easing: "ease-out" }),
        ctx.anim(t, [{ strokeOpacity: 1 }, { strokeOpacity: 0 }], { duration: 170, delay: d0 + 300, easing: "ease-in" }));
      return Promise.all(anims);
    }));
    return { svg, listo };
  }

  /* dónde se posa: el centro del murciélago de la escena (su caja de 80 × 80) o, si
     no está, sobre la inicial del título */
  function destinoPosado(sec, h2, M) {
    const b = $(".mc-posado", sec), r = b?.getBoundingClientRect();
    if (r?.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2, e: b.offsetWidth * M.s / 80, rot: -3, el: b };
    const l = h2 && letrasDe(h2).find(x => /[\p{L}\p{N}]/u.test(x.ch));
    if (l) { const e = l.r.height / 110; return { x: l.r.left + l.r.width / 2, y: l.r.top - 30 * e, e, rot: -3 }; }
    return { x: M.w * .1, y: M.h * .08, e: .7 * M.s, rot: 0 };
  }

  /* cinco murciélagos entran desde arriba a la derecha con trayectorias curvas
     distintas; el último va a posarse (llega al final de ms) */
  async function bandada(capa, M, destino, ms) {
    const { w, h, s } = M, caja = html('<div class="mc-bandada"></div>'), B = (x, y) => [x * w, y * h];
    capa.append(caja);
    const vuelos = [
      { t0: 0, d: .66, p: [B(1.08, -.1), B(.74, .3), B(.36, .66), B(-.14, .44)], e: .62, a: .17 },
      { t0: .05, d: .78, p: [B(1.12, .02), B(.64, .9), B(.24, .76), B(.04, -.2)], e: .5, a: .19 },
      { t0: .1, d: .76, p: [B(1.06, -.08), B(.76, .22), B(.46, -.02), B(-.12, .26)], e: .36, a: .15 },
      { t0: .16, d: .72, p: [B(1.14, .14), B(.58, .3), B(.62, .98), B(.2, 1.18)], e: .44, a: .18 },
      { t0: .2, d: .8, p: [B(1.1, -.12), B(.78, .58), [destino.x + .2 * w, destino.y - .34 * h], [destino.x, destino.y]], e: destino.e, a: .2, posa: true }
    ];
    const els = vuelos.map(v => { const el = murcielago(caja); el.style.setProperty("--aleteo", v.a + "s"); el.style.opacity = 0; return el; });
    await tween(ms, T => vuelos.forEach((v, i) => {
      const el = els[i], lt = tramo(T, v.t0, v.t0 + v.d);
      if (T < v.t0 || (lt >= 1 && !v.posa)) { el.style.opacity = 0; return; }
      const t = v.posa ? sale(lt) : io(lt) * .35 + lt * .65;
      const [x, y] = bezier(v.p, t), [x2, y2] = bezier(v.p, Math.min(1, t + .02)), [x1, y1] = bezier(v.p, Math.max(0, t - .02));
      let rot = alabeo(x2 - x1, y2 - y1), e = v.e * s;
      if (v.posa) {
        // llega frenando: endereza, aletea más lento y pliega las alas
        const f = tramo(lt, .62, 1);
        rot = mix(rot, destino.rot, sale(f));
        e = mix(.95 * s, destino.e, sale(tramo(lt, .3, 1)));
        el.style.setProperty("--aleteo", (v.a + .1 * f).toFixed(3) + "s");
        el.classList.toggle("mc-plegado", lt > .9);
      }
      el.style.opacity = 1;
      ubicar(el, x, y, rot, e);
    }), lineal);
    return els[4];
  }

  /* el papel arrugado de la escena cae sobre la estación: se anima el .mc-papel real
     (oculto por la escena mientras dura mc-entrando) hasta su reposo exacto */
  function caePapel(ctx, sec) {
    const papel = $(".mc-papel", sec);
    if (!papel) return null;
    const cs = getComputedStyle(papel), o = parseFloat(cs.opacity) || .18, fin = cs.transform === "none" ? "" : " " + cs.transform;
    const T = (y, r, k) => `translate(0px,${y}%) rotate(${r}deg) scale(${k})${fin}`;
    ctx.anim(papel, [
      { visibility: "visible", opacity: 0, transform: T(-8, -2.6, 1.07), easing: "cubic-bezier(.5,0,.9,.6)" },
      { visibility: "visible", opacity: Math.min(1, o * 2.4), transform: T(.5, .6, 1), offset: .6, easing: "cubic-bezier(.2,.6,.4,1)" },
      { visibility: "visible", opacity: Math.min(1, o * 1.6), transform: T(-.25, -.25, 1), offset: .8, easing: "ease-in-out" },
      { visibility: "visible", opacity: o, transform: T(0, 0, 1) }
    ], { duration: 650, id: "mc-papel" });
    return papel;
  }

  async function entrar(ctx) {
    const { sec } = ctx, pu = puente(), M = medir(), { w, h, s } = M;
    // en el mismo cuadro: la capa del puente (fondo, cable gris y la señal en el centro)
    const capa = ctx.capa("mundo-puente marceline mc-sec mc-entrada");
    capa.style.setProperty("--mc-s", s);
    const base = typeof PUENTE !== "undefined" && PUENTE.cable ? PUENTE.cable(capa, { desde: ctx.desde, senal: true }) : null;
    sec.classList.add("mc-entrando", "mc-sec-titulo");
    const q = cuerda(capa, M, pu, ctx.desde);
    q.pintar(cableInicial(pu, q.uc));
    let papel = null;
    try {
      /* 0,0–1,4 s: el cable se vuelve cuerda de bajo (se engruesa, aparecen los trastes);
         el pulso tira de ella, la suelta y viaja hasta la cejuela; la cuerda vibra con
         una onda senoidal de amplitud decreciente y la nota suena al llegar */
      const uc = q.uc, A = 18;
      const tri = u => u < uc ? u / uc : (1 - u) / (1 - uc);
      const onda = u => Math.sin(Math.PI * 5 * u);
      let sono = false;
      await tween(1400, p => {
        base?.remove();
        const t = p * 1.4, a = sale(tramo(t, 0, .36));
        const tiro = A * sale(tramo(t, .05, .4));                        // el pulso tira de la cuerda
        const v = tramo(t, .4, 1.4), env = (1 - v) ** 1.35;               // viaje y vibración que se apaga
        const b = sale(tramo(t, .4, .62));                                // del tirón a la onda senoidal
        const up = uc + (1 - uc) * io(v);                                 // posición del pulso
        const osc = Math.cos(2 * Math.PI * 6.2 * Math.max(0, t - .4));
        const ventana = u => clamp((up - u) / .06, 0, 1);                // vibra lo que el pulso ya recorrió
        const forma = u => -(tiro * (1 - b) * tri(u) + A * b * env * onda(u) * ventana(u)) * osc;
        q.pintar({
          forma, grosor: mix(CABLE, 11, a), color: mixColor(pu.cable, P.piel, a), temblor: a, ento: a,
          eco: u => tiro * (1 - b) * tri(u) + A * b * env * Math.abs(onda(u)) * ventana(u), ecoOp: .24 * tramo(t, .42, .56) * env,
          resto: 1 - sale(tramo(t, .1, .36)), restoColor: pu.cable, restoGrosor: CABLE, punta: sale(tramo(t, .16, .4)),
          mastil: { tr: [0, 1, 2, 3].map(i => rebote(tramo(t, .04 + i * .06, .3 + i * .06))), cej: rebote(tramo(t, .14, .38)), clav: rebote(tramo(t, .2, .42)) },
          luz: 1 - sale(tramo(t, .1, .5)), pulso: { u: t < .4 ? uc : up, op: 1 - tramo(t, 1.3, 1.4) }
        });
        if (!sono && t >= 1.36) { sono = true; tono(); }
      }, lineal);
      // la nota: dos ondas de crayón salen de la cejuela (una sola vez)
      const nota = mk("svg", { class: "mc-nota", viewBox: q.svg.getAttribute("viewBox"), "aria-hidden": "true" }, capa);
      [0, 1].forEach(i => ctx.anim(mk("circle", { cx: F(q.xB), cy: 0, r: 8 }, nota), [{ r: "8px", opacity: .9, strokeWidth: "5px" }, { r: "136px", opacity: 0, strokeWidth: "1.5px" }],
        { duration: 680, delay: i * 160, easing: "cubic-bezier(.2,.7,.3,1)" }));

      /* 1,4–2,4 s: una mano pinta la pantalla con crayón desde la cejuela y revela la
         estación; la cuerda queda debajo de la pintura */
      const { cv, g } = lienzo(capa, M);
      g.fillStyle = pu.fondo; g.fillRect(0, 0, w, h);
      capa.style.background = "transparent";
      const rec = barridos(M, q.sg < 0, 17), yc = h / 2;
      let frente = rec.desdeIzq ? -1e5 : 1e5;
      await mano(g, rec, {
        ms: 1000, destino: "borrar",
        alPunto: (pt, wd) => { if (Math.abs(pt.y - yc) < wd * .42) frente = rec.desdeIzq ? Math.max(frente, pt.x + wd * .36) : Math.min(frente, pt.x - wd * .36); },
        alCuadro: () => { q.svg.style.clipPath = rec.desdeIzq ? `inset(0 0 0 ${F(Math.max(0, frente))}px)` : `inset(0 ${F(Math.max(0, w - frente))}px 0 0)`; }
      });
      q.svg.remove();
      // los granos de cera que quedaron se asientan
      ctx.anim(cv, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-out" }).then(() => cv.remove());

      // 2,4 s: cae el papel arrugado
      papel = caePapel(ctx, sec);
      await ctx.esperar(800);

      // 3,2 s: cinco murciélagos; el último se posará en la inicial del título a los 4,8 s
      const h2 = $(".z-titulo h2", sec) || $("h2", sec), destino = destinoPosado(sec, h2, M);
      const vuelo = bandada(capa, M, destino, 1600);
      await ctx.esperar(800);

      // 4,0 s: el título se escribe con marcador; al terminar aparece el real
      const escrito = h2 && escribir(ctx, capa, h2, 760);
      const titulo = (escrito ? escrito.listo : Promise.resolve()).then(() => {
        sec.classList.remove("mc-sec-titulo");
        if (escrito) return ctx.anim(escrito.svg, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-out" });
      });
      const [bat] = await Promise.all([vuelo, titulo]);

      // 4,8 s: se posa; el murciélago de la escena toma su lugar sin salto
      sec.classList.remove("mc-entrando");
      papel?.getAnimations().forEach(a => { if (a.id === "mc-papel") a.cancel(); });
      papel = null;
      if (destino.el) await Promise.all([
        ctx.anim(destino.el, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out", fill: "none" }),
        ctx.anim(bat, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-in" })
      ]);
      else await ctx.anim(bat, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, delay: 300, easing: "ease-in" });
    } finally {
      sec.classList.remove("mc-entrando", "mc-sec-titulo");
      papel?.getAnimations().forEach(a => { if (a.id === "mc-papel") a.cancel(); });
      ctx.quitar(capa);
    }
  }

  /* =====================================================================
     SALIDA (§1.9, ≈ 1,9 s): el crayón cubre desde el lado del cable con el fondo del
     puente, aparece la cuerda, se desafina, se aplana y queda el cable gris
     ===================================================================== */
  async function salir(ctx) {
    const pu = puente(), M = medir();
    const capa = ctx.capa("mundo-puente marceline mc-sec mc-salida");
    capa.style.setProperty("--mc-s", M.s);
    capa.style.background = "transparent";
    const { cv, g } = lienzo(capa, M);
    const q = cuerda(capa, M, pu, ctx.desde);
    q.svg.style.opacity = 0;
    try {
      // los trazos se borran desde el lado del cable (derecha → izquierda en el MUX)
      await mano(g, barridos(M, ctx.desde === "izquierda", 31), { ms: 760, destino: pu.fondo });
    } finally {
      capa.style.background = "";
      cv.remove();
    }
    q.svg.style.opacity = 1;
    const { uc } = q, rr = azar(9);
    const jit = Array.from({ length: 24 }, () => rr() - .5);
    let notas = 0;
    await tween(1080, p => {
      const t = p * 1.08;
      const ap = sale(tramo(t, 0, .26));                                  // aparece desde el lado del cable
      const fl = io(tramo(t, .74, 1.08));                                  // se aplana
      const tau = Math.max(0, t - .2), des = tramo(t, .2, .74);
      // desafinada: modos que no armonizan, frecuencias que bajan y un temblor irregular
      const ph = (f0, df) => 2 * Math.PI * (f0 * tau - df * tau * tau / 2);
      const j = jit[Math.min(jit.length - 1, Math.floor(tau * 40))];
      const A = 15 * sale(tramo(t, .2, .3)) * (1 - fl) * (.8 + .4 * j) * (1 - .35 * des);
      const comba = 13 * sale(tramo(t, .3, .7)) * (1 - fl);                // la cuerda floja se comba
      const forma = u => A * (Math.sin(Math.PI * u) * Math.cos(ph(7.5, 7)) + .55 * Math.sin(2 * Math.PI * u) * Math.cos(ph(11.3, 9) + 1) + .3 * Math.sin(3 * Math.PI * u + .7) * Math.cos(ph(4.1, 2))) + comba * Math.sin(Math.PI * u);
      q.pintar({
        forma, revela: ap, grosor: mix(11, CABLE, fl), color: mixColor(P.piel, pu.cable, fl), temblor: ap * (1 - fl), ento: tramo(t, .2, .32) * (1 - fl),
        eco: u => Math.abs(A) * (Math.abs(Math.sin(Math.PI * u)) + .4 * Math.abs(Math.sin(2 * Math.PI * u))) + comba * Math.sin(Math.PI * u), ecoOp: .2 * des * (1 - fl),
        resto: fl, restoColor: pu.cable, restoGrosor: CABLE, punta: tramo(t, .18, .3) * (1 - fl),
        mastil: { tr: [0, 1, 2, 3].map(i => rebote(tramo(t, .06 + i * .04, .26 + i * .04)) * (1 - fl)), cej: rebote(tramo(t, .14, .3)) * (1 - fl), clav: rebote(tramo(t, .18, .34)) * (1 - fl) }
      });
      // con sonido: dos notas que bajan
      if (notas === 0 && t >= .22) { notas = 1; tono("phase"); }
      if (notas === 1 && t >= .5) { notas = 2; tono(); }
    }, lineal);
    // queda el cable del puente (el mismo dibujo que el vuelo)
    if (typeof PUENTE !== "undefined" && PUENTE.cable) { PUENTE.cable(capa, { desde: ctx.desde, senal: false }); q.svg.remove(); }
    return capa;
  }

  /* =====================================================================
     TRANSICIONES (§1.6)
     ===================================================================== */
  // recorta un polígono por el semiplano (p − m)·n ≥ 0
  function semiplano(poli, m, n) {
    const out = [], lado = p => (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1];
    for (let i = 0; i < poli.length; i++) {
      const a = poli[i], b = poli[(i + 1) % poli.length], da = lado(a), db = lado(b);
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  const poligono = (pts, dx = 0, dy = 0) => pts.length > 2 ? `polygon(${pts.map(p => `${F(p[0] + dx)}px ${F(p[1] + dy)}px`).join(",")})` : "polygon(0 0,0 0,0 0)";
  const trazo = pts => pts.map((p, i) => `${i ? "L" : "M"}${F(p[0])} ${F(p[1])}`).join("");
  // la instantánea de la hoja vieja dentro de un marco a pantalla completa (para recortarla)
  function hojaVieja(ctx, cls) {
    const r = ctx.desde.getBoundingClientRect(), c = ctx.instantanea(ctx.desde), marco = html(`<div class="mc-hoja-vieja"></div>`);
    c.classList.add("marceline", "mc-sec", cls);
    c.style.setProperty("--mc-s", medir().s);
    marco.append(c.copia);
    c.append(marco);
    return { c, marco, r };
  }

  /* Página de cuaderno (700 ms): la hoja vieja se voltea sobre su borde izquierdo (el
     lomo): la esquina de abajo se levanta, el pliegue la cruza en perspectiva 3D con
     sombra y el reverso de papel, y debajo queda la nueva. Al retroceder, en espejo.
     Sin filtros: la sombra de la hoja levantada es una copia plana desplazada (como las
     de los trastes) y las del pliegue son franjas con degradado, no capas de D × D. */
  async function pagina(ctx) {
    const { c, marco, r } = hojaVieja(ctx, "mc-pagina");
    ctx.commit();
    const s = medir().s;
    const sombra = html('<div class="mc-sombra-nueva"><i></i></div>');
    const vuelta = html('<div class="mc-vuelta"><div class="mc-reverso-sombra"></div><div class="mc-reverso"><i class="mc-renglones"></i><i class="mc-pliegue"></i></div></div>');
    c.append(sombra, vuelta);
    const [rs, rev] = vuelta.children, pl = $(".mc-pliegue", rev), sm = sombra.firstChild;
    const Wp = r.width, Hp = r.height, ox = r.left, oy = r.top, sg = ctx.dir >= 0 ? 1 : -1;
    [rev, rs].forEach(x => Object.assign(x.style, { left: ox + "px", top: oy + "px", width: Wp + "px", height: Hp + "px" }));
    vuelta.style.perspectiveOrigin = `${F(ox + Wp / 2)}px ${F(oy + Hp / 2)}px`;
    rev.insertBefore(garabatosReverso(Wp, Hp, sg), pl);
    const D = Math.hypot(Wp, Hp) * 2, caja = [[0, 0], [Wp, 0], [Wp, Hp], [0, Hp]], C = sg > 0 ? [Wp, Hp] : [0, Hp];
    [pl, sm].forEach(x => { x.style.height = F(D) + "px"; });
    const desplaza = `translate(${F(sg * 8 * s)}px,${F(11 * s)}px) `;
    // el primer cuadro ya muestra la esquina apenas levantada: así las capas se rasterizan
    // en los dos cuadros de espera y los 700 ms se ven completos
    await animar(700, p => {
      const e = Math.max(.004, io(p));
      // la esquina C se arrastra hasta el lomo (e = 1); el pliegue es la mediatriz de C → G
      const G = [C[0] - sg * e * 2 * Wp, Hp - Math.sin(Math.PI * Math.min(1, e * 1.15)) * .22 * Hp];
      const dx = C[0] - G[0], dy = C[1] - G[1], l = Math.hypot(dx, dy);
      const n = [dx / l, dy / l], m = [(C[0] + G[0]) / 2, (C[1] + G[1]) / 2];
      const Fp = semiplano(caja, m, n), U = semiplano(caja, m, [-n[0], -n[1]]);
      marco.style.clipPath = poligono(U, ox, oy);
      sombra.style.clipPath = poligono(Fp, ox, oy);
      rev.style.clipPath = rs.style.clipPath = poligono(Fp);
      // reflejo sobre el pliegue y la hoja levantada hacia quien mira
      const a = Math.atan2(n[0], -n[1]), an = Math.atan2(n[1], n[0]), alza = 34 * Math.sin(Math.PI * e);
      const giro = `translate(${F(m[0])}px,${F(m[1])}px) rotate(${a}rad) rotateX(${F(alza)}deg) scaleY(-1) rotate(${-a}rad) translate(${F(-m[0])}px,${F(-m[1])}px)`;
      rev.style.transform = giro;
      rs.style.transform = desplaza + giro;
      rs.style.opacity = F(Math.sin(Math.PI * e));
      const junto = `translate(${F(m[0])}px,${F(m[1])}px) rotate(${an}rad) translate(0px,${F(-D / 2)}px)`;
      pl.style.transform = junto;
      sm.style.transform = `translate(${F(ox)}px,${F(oy)}px) ${junto}`;
      sm.style.opacity = F(.35 + .65 * Math.sin(Math.PI * Math.min(1, e * 1.1)));
      // solo el último tramo, con el pliegue ya en el lomo (fuera de cuadro en 16:9)
      vuelta.style.opacity = F(1 - tramo(e, .96, 1));
    }, lineal, 2);
    ctx.quitar(c);
  }
  // garabatos de crayón en el reverso de la hoja (cerca de la esquina que se levanta primero)
  function garabatosReverso(Wp, Hp, sg) {
    const s = mk("svg", { class: "mc-reverso-garabatos", viewBox: `0 0 ${F(Wp)} ${F(Hp)}`, preserveAspectRatio: "none" });
    const k = Hp / 1080, X = x => sg > 0 ? x * Wp : (1 - x) * Wp;
    const g = mk("g", { transform: `translate(${F(X(.8))} ${F(Hp * .74)}) scale(${F(k)})` }, s);
    mk("path", { d: starPath(0, 0, 46, 46, .2) + "M-70 70Q-30 40 10 74T90 70", class: "mc-rg-crayon" }, g);
    const nota = mk("g", { transform: `translate(${F(X(.62))} ${F(Hp * .4)}) scale(${F(k)}) rotate(-8)` }, s);
    mk("path", { d: "M0 0V-92L46 -104V-14M0 -60L46 -72", class: "mc-rg-crayon" }, nota);
    mk("ellipse", { cx: -12, cy: 2, rx: 15, ry: 11, class: "mc-rg-tinta" }, nota);
    mk("ellipse", { cx: 34, cy: -12, rx: 15, ry: 11, class: "mc-rg-tinta" }, nota);
    const cal = mk("g", { transform: `translate(${F(X(.9))} ${F(Hp * .3)}) scale(${F(k)}) rotate(10)` }, s);
    mk("path", { d: "M-30 0C-34-38 34-38 30 0C30 14 22 18 16 20V32H-16V20C-22 18-30 14-30 0ZM-14-4a7 8 0 1 0 .1 0M14-4a7 8 0 1 0 .1 0M-6 32V24M6 32V24", class: "mc-rg-vino" }, cal);
    return s;
  }

  /* Murciélago borrador (900 ms): un murciélago grande cruza la pantalla y deja una
     franja que borra la hoja vieja; la franja se abre tras él hasta revelar la nueva */
  async function borrador(ctx) {
    const { c, marco } = hojaVieja(ctx, "mc-borrador");
    ctx.commit();
    const M = medir(), { w, h, s } = M, sg = ctx.dir >= 0 ? 1 : -1;
    const svg = mk("svg", { class: "mc-estela", viewBox: `0 0 ${F(w)} ${F(h)}`, "aria-hidden": "true" }, c);
    const bordes = [mk("path", {}, svg), mk("path", {}, svg)];
    const caja = html('<div class="mc-bandada"></div>');
    c.append(caja);
    const bat = murcielago(caja, "mc-grande");
    bat.style.setProperty("--aleteo", ".11s");
    const x0 = sg > 0 ? -.16 * w : 1.16 * w, x1 = sg > 0 ? 1.16 * w : -.16 * w;
    const yDe = x => h * (.5 + .07 * Math.sin(x / w * 5.4 + .8) - .04 * (x / w - .5));
    const ruido = x => Math.sin(x * .031) * 6 * s + Math.sin(x * .093 + 1.7) * 3 * s;
    const h0 = .085 * h;
    await animar(900, p => {
      const e = mix(p, io(p), .55), bx = mix(x0, x1, e), by = yDe(bx);
      // la franja se abre hacia arriba y abajo según lo lejos que ya pasó
      const abre = d => h0 + d * .42 + d * d / (w * 1.6) + h * 1.3 * tramo(p, .55, 1) ** 2;
      const arriba = [], abajo = [];
      for (let x = sg > 0 ? -30 : w + 30; sg > 0 ? x < bx : x > bx; x += sg * 20) {
        const d = Math.abs(bx - x), a = abre(d), y = yDe(x);
        arriba.push([x, y - a + ruido(x)]); abajo.push([x, y + a * .92 - ruido(x + 40)]);
      }
      if (arriba.length) {
        const nariz = [bx - sg * 26 * s, by];
        marco.style.clipPath = `path(evenodd,"M0 0H${F(w)}V${F(h)}H0Z${trazo([...arriba, nariz, ...abajo.reverse()])}Z")`;
        bordes[0].setAttribute("d", trazo(arriba.filter(q => q[1] > -20)));
        bordes[1].setAttribute("d", trazo(abajo.filter(q => q[1] < h + 20)));
      }
      svg.style.opacity = F(1 - tramo(p, .7, 1));
      ubicar(bat, bx, by, alabeo(sg, (yDe(bx + sg * 8) - by) / 8) * .8, 1.9 * s);
    }, lineal, 2);
    ctx.quitar(c);
  }

  /* Acorde rojo (600 ms): la pantalla se tiñe de rojo vino que desciende con las
     cuerdas vibrando; cuando cubre todo cambia la hoja y la banda se retira hacia abajo
     dejando la nueva (al retroceder, sube) */
  async function acorde(ctx) {
    const M = medir(), { w, h, s } = M, baja = ctx.dir >= 0, id = "mca" + ++serie;
    const c = ctx.capa("marceline mc-sec mc-acorde");
    const svg = mk("svg", { viewBox: `0 0 ${F(w)} ${F(h)}`, preserveAspectRatio: "none" }, c);
    const gr = mk("linearGradient", { id: id, gradientUnits: "userSpaceOnUse", x1: 0, x2: 0 }, mk("defs", {}, svg));
    [[0, .0], [.12, .82], [.2, 1], [.8, 1], [.88, .82], [1, 0]].forEach(([o, a], i) =>
      mk("stop", { offset: o, "stop-color": i === 2 || i === 3 ? "#7A1530" : P.vino, "stop-opacity": a }, gr));
    const banda = mk("path", { fill: `url(#${id})` }, svg);
    const cuerdas = [0, 1, 2, 3, 4].map(() => mk("path", { class: "mc-acorde-cuerda" }, svg));
    const filos = [mk("path", { class: "mc-acorde-filo" }, svg), mk("path", { class: "mc-acorde-filo" }, svg)];
    const Hb = 1.9 * h, total = h + Hb, Y = y => baja ? y : h - y;
    let hecho = false;
    const ondula = (y0, amp, f, t, ph) => {
      const pts = [];
      for (let x = -20; x <= w + 20; x += w / 48) pts.push([x, Y(y0 + amp * Math.sin(Math.PI * (x / w) * 3 + ph) * Math.cos(2 * Math.PI * f * t + ph))]);
      return pts;
    };
    await animar(600, p => {
      const e = io(p), t = p * .6, lead = e * total, trail = lead - Hb;
      const amp = 22 * s * (1 - .6 * p);
      const a = ondula(lead, amp, 7, t, 0), b = ondula(trail, amp, 6, t, 1.3);
      banda.setAttribute("d", trazo([...a, ...b.reverse()]) + "Z");
      gr.setAttribute("y1", F(Y(trail))); gr.setAttribute("y2", F(Y(lead)));
      filos[0].setAttribute("d", trazo(ondula(lead - .1 * h, amp * .8, 7, t, 0)));
      filos[1].setAttribute("d", trazo(ondula(trail + .1 * h, amp * .8, 6, t, 1.3)));
      cuerdas.forEach((q, i) => q.setAttribute("d", trazo(ondula(trail + Hb * (.3 + i * .1), amp * (.5 + .12 * i) * (1 - p), 8 + i, t, i * .9))));
      // cubre la pantalla entera: cambia la hoja (una sola vez)
      if (!hecho && e >= .5) { hecho = true; ctx.commit(); tono(); }
    }, lineal, 2);
    if (!hecho) ctx.commit();
    ctx.quitar(c);
  }

  /* Garabato (800 ms): un garabato en espiral crece desde un punto; su interior ya es
     la hoja nueva y el trazo de crayón la va abriendo hasta cubrir la pantalla */
  async function garabato(ctx) {
    const { c, marco } = hojaVieja(ctx, "mc-garabato");
    ctx.commit();
    const M = medir(), { w, h, s } = M, ox = w * (ctx.dir >= 0 ? .6 : .4), oy = h * .52;
    const Rmax = Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => Math.hypot(x - ox, (y - oy) / .92))) + 40 * s;
    const sep = .2 * h, b = sep / (2 * Math.PI), th1 = Rmax / b + 2 * Math.PI;
    const rad = th => Math.max(0, b * th * (1 + .06 * Math.sin(th * 2.3 + 1.1)) + 7 * s * Math.sin(th * 7.7));
    const pto = th => [ox + rad(th) * Math.cos(th), oy + rad(th) * Math.sin(th) * .92];
    const svg = mk("svg", { class: "mc-espiral", viewBox: `0 0 ${F(w)} ${F(h)}`, "aria-hidden": "true" }, c);
    const sombra = mk("g", { class: "mc-esp-sombra" }, svg), linea = mk("g", { class: "mc-esp-linea" }, svg);
    const tramos = [.2, .45, .72, 1].map(o => [mk("path", { opacity: o }, sombra), mk("path", { opacity: o }, linea)]);
    const trozo = (a, z) => { const pts = []; for (let th = a; th <= z + 1e-6; th += .045) pts.push(pto(Math.min(th, z))); return pts; };
    await animar(800, p => {
      const e = tramo(p, 0, .9), thp = th1 * (1 - (1 - e) ** 1.6);
      // la vuelta exterior encierra la hoja nueva
      const dentro = trozo(Math.max(0, thp - 2 * Math.PI), thp);
      marco.style.clipPath = dentro.length > 2 ? `path(evenodd,"M0 0H${F(w)}V${F(h)}H0Z${trazo(dentro)}Z")` : "none";
      const cola = 2.6 * Math.PI, a0 = Math.max(0, thp - cola);
      tramos.forEach(([sh, ln], i) => {
        const d = trazo(trozo(a0 + (thp - a0) * i / 4, a0 + (thp - a0) * (i + 1) / 4));
        sh.setAttribute("d", d); ln.setAttribute("d", d);
      });
      svg.style.opacity = F(1 - tramo(p, .9, 1));
    }, lineal, 2);
    ctx.quitar(c);
  }

  MUNDOS.definir("marceline", {
    entrar, salir,
    transiciones: [
      { nombre: "Página de cuaderno", ms: 700, run: pagina },
      { nombre: "Murciélago borrador", ms: 900, run: borrador },
      { nombre: "Acorde rojo", ms: 600, run: acorde },
      { nombre: "Garabato", ms: 800, run: garabato }
    ]
  });
})();

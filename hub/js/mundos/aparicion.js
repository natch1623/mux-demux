"use strict";
/* =====================================================================
   Aparición de los contenidos de cada diapositiva, con el gesto de su mundo
   (reemplaza la subida de 26 px con desenfoque, igual para todos):
   - Marceline: una pasada de crayón morado descubre el bloque (borde irregular).
   - Tsaritsa: una línea de escarcha dibuja el borde; aparece el contenido y un
     reflejo recorre el marco. El hielo queda fuera de los caracteres.
   - Venom: una membrana se retira desde un borde; el contenido queda recto.
   - DIO: el bloque entra como viñeta (desplazamiento corto, parada firme) con
     líneas de énfasis alrededor que se extinguen rápido.
   El contenido nunca se desenfoca ni se deforma, y queda quieto al terminar.
   La decoración vive en una capa fija y se retira al terminar (o con Esc).
   ===================================================================== */
const APARICION = (() => {
  const { el, rng, reloj, ease, tramo, suave } = MAT;
  // caja del bloque en pantalla y una capa SVG fija del tamaño de la ventana
  function marco(bloque) {
    const r = bloque.getBoundingClientRect();
    const c = MUNDOS.capa("aparicion");
    const W = innerWidth, H = innerHeight;
    const svg = el("svg", { class: "mt-svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H }, c);
    return { c, svg, r };
  }

  async function marceline(b) {
    const { c, svg, r } = marco(b), rr = rng(Math.round(r.x + r.y));
    // el bloque se descubre detrás de un borde de crayón que avanza de izquierda a derecha
    const filo = el("path", { class: "ap-crayon" }, svg), grano = el("path", { class: "ap-crayon-grano" }, svg);
    const ys = Array.from({ length: 9 }, (_, i) => r.top - 8 + (r.height + 16) * i / 8), jit = ys.map(() => (rr() - .5) * 26);
    try {
      await reloj(460, t => {
        const x = r.left - 30 + (r.width + 60) * ease.out(t);
        const borde = ys.map((y, i) => [x + jit[i] * (1 - t * .5), y]);
        b.style.clipPath = `polygon(-40px -40px,${(x - r.left + 30).toFixed(1)}px -40px,${borde.map(([bx, by]) => `${(bx - r.left).toFixed(1)}px ${(by - r.top).toFixed(1)}px`).join(",")},${(x - r.left + 30).toFixed(1)}px ${r.height + 40}px,-40px ${r.height + 40}px)`;
        const d = MAT.linea(borde);
        filo.setAttribute("d", d); grano.setAttribute("d", d);
        filo.style.opacity = grano.style.opacity = 1 - tramo(t, .8, 1);
      });
    } finally { b.style.clipPath = ""; c.remove(); }
  }

  async function tsaritsa(b) {
    const { c, svg, r } = marco(b), m = 6;
    const per = 2 * (r.width + r.height + 4 * m);
    const borde = el("rect", { x: r.left - m, y: r.top - m, width: r.width + 2 * m, height: r.height + 2 * m, class: "ap-escarcha", pathLength: 1 }, svg);
    const id = MAT.uid("apg"), defs = el("defs", {}, svg), lg = el("linearGradient", { id, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    [[0, 0], [.5, .85], [1, 0]].forEach(([o, a]) => el("stop", { offset: o, "stop-color": "#FFF4CF", "stop-opacity": a }, lg));
    const brillo = el("rect", { x: r.left - m, y: r.top - m, width: 80, height: r.height + 2 * m, fill: `url(#${id})`, opacity: 0 }, svg);
    b.style.opacity = 0;
    try {
      await reloj(620, t => {
        borde.style.strokeDashoffset = 1 - ease.out(tramo(t, 0, .5));
        b.style.opacity = ease.out(tramo(t, .3, .62));
        const k = tramo(t, .55, 1); brillo.setAttribute("x", r.left - m - 80 + (r.width + 2 * m + 80) * ease.io(k)); brillo.setAttribute("opacity", k > 0 ? .55 * Math.sin(Math.PI * k) : 0);
        borde.style.opacity = 1 - tramo(t, .75, 1);
      });
    } finally { b.style.opacity = ""; c.remove(); }
  }

  async function venom(b) {
    const { c, svg, r } = marco(b), rr = rng(Math.round(r.width));
    // membrana negra con borde lobulado que se retira hacia la izquierda
    const memb = el("path", { class: "ap-membrana" }, svg), refl = el("path", { class: "vn-reflejo" }, svg);
    const n = 10, ond = Array.from({ length: n + 1 }, () => rr());
    try {
      await reloj(520, t => {
        const x = r.left - 20 + (r.right - r.left + 40) * (1 - ease.io(t));   // frente que retrocede
        const p = Array.from({ length: n + 1 }, (_, i) => [x + (ond[i] - .5) * 40 + Math.sin(i * 1.9 + t * 8) * 10, r.top - 10 + (r.height + 20) * i / n]);
        memb.setAttribute("d", suave([[r.left - 40, r.bottom + 10], [r.left - 40, r.top - 10], ...p], true));
        refl.setAttribute("d", suave(p.map(([px, py]) => [px - 9, py]), false));
        refl.style.opacity = .8 * (1 - tramo(t, .7, 1));
      });
    } finally { c.remove(); }
  }

  async function dio(b) {
    const { c, svg, r } = marco(b), rr = rng(Math.round(r.top));
    // énfasis: líneas cortas de tinta alrededor del bloque
    let d = "";
    for (let i = 0; i < 14; i++) {
      const lado = i % 4, u = .1 + rr() * .8;
      const [x, y, dx, dy] = lado === 0 ? [r.left + r.width * u, r.top - 12, 0, -1] : lado === 1 ? [r.right + 12, r.top + r.height * u, 1, 0] : lado === 2 ? [r.left + r.width * u, r.bottom + 12, 0, 1] : [r.left - 12, r.top + r.height * u, -1, 0];
      const l = 16 + rr() * 26; d += `M${x} ${y}L${x + dx * l} ${y + dy * l}`;
    }
    const lineas = el("path", { d, class: "ap-enfasis" }, svg);
    try {
      await MUNDOS.anim(b, [{ translate: "-22px 0", opacity: 0 }, { translate: "3px 0", opacity: 1, offset: .7 }, { translate: "0 0", opacity: 1 }], { duration: 240, easing: "cubic-bezier(.2,.9,.3,1)", fill: "none" });
      await reloj(260, t => { lineas.style.opacity = 1 - t; lineas.style.transform = `scale(${1 + .04 * t})`; lineas.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`; });
    } finally { c.remove(); }
  }

  const GESTOS = { marceline, tsaritsa, venom, dio };
  // aparece un bloque con el gesto de su mundo (sin gesto propio: un fundido corto)
  function aparecer(bloque, tema) {
    const g = GESTOS[tema];
    if (!g) return MUNDOS.anim(bloque, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease", fill: "none" });
    return g(bloque).catch(() => {});
  }
  return { aparecer };
})();

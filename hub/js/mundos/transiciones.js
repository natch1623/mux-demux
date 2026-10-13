"use strict";
/* =====================================================================
   Transiciones internas de Tsaritsa (§2.6), Venom (§3.6) y DIO (§4.6).
   Estos mundos aún conservan su escena anterior: aquí solo se registran
   sus cuatro transiciones, que el núcleo rota en orden (MUNDOS.transiciones).
   Cada una llama a commit() una sola vez, cuando la diapositiva vieja ya está
   cubierta o copiada; el núcleo resuelve Esc, ?still y movimiento reducido.
   ===================================================================== */
(() => {
  const capaSvg = (c, cuerpo, vb = "0 0 100 100", cls = "", par = "none") => {
    c.insertAdjacentHTML("beforeend", `<svg class="${cls}" viewBox="${vb}" preserveAspectRatio="${par}" aria-hidden="true">${cuerpo}</svg>`);
    return c.lastElementChild;
  };
  const div = (c, cls, estilo = "") => { const d = html(`<div class="${cls}" style="${estilo}"></div>`); c.append(d); return d; };
  // grietas que nacen del centro (pocas, quebradas)
  const grietas = () => [[50, 50, 8, 4], [50, 50, 94, 10], [50, 50, 96, 88], [50, 50, 6, 92], [50, 50, 50, -2], [50, 50, 102, 54], [50, 50, -2, 46], [50, 50, 54, 104]]
    .map(([x, y, X, Y], i) => `M${x} ${y}L${(x + X) / 2 + (i % 2 ? 4 : -4)} ${(y + Y) / 2 + (i % 3 ? -3 : 3)}L${X} ${Y}`).join("");
  // seis esquirlas que cubren la pantalla (triángulos desde el centro)
  const ESQUIRLAS = [[0, 0, 55, 0], [55, 0, 100, 0, 100, 38], [100, 38, 100, 100, 62, 100], [62, 100, 0, 100], [0, 100, 0, 58], [0, 58, 0, 0]];

  /* ---------------- Tsaritsa: hielo, ventisca, cristal, aurora ---------------- */
  MUNDOS.transiciones("tsaritsa", [
    { nombre: "Escarcha", ms: 900, async run({ commit, capa, anim, esperar, quitar }) {
      const c = capa("tz tz-escarcha");
      try {
        const hielo = div(c, "tz-hielo tz-borde");
        await anim(hielo, [{ "--tz-h": "62%" }, { "--tz-h": "-30%" }], { duration: 420, easing: "cubic-bezier(.3,.1,.6,1)" });
        commit();
        const g = capaSvg(c, `<path d="${grietas()}" pathLength="1"/>`, "0 0 100 100", "tz-grietas");
        await anim(g.firstChild, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 160, easing: "ease-out" });
        hielo.remove(); g.remove();
        await Promise.all(ESQUIRLAS.map(p => {
          const pts = p.length === 4 ? [50, 50, ...p] : [50, 50, ...p.slice(0, 4), p[4], p[5]];
          const poly = [];
          for (let i = 0; i < pts.length; i += 2) poly.push(`${pts[i]}% ${pts[i + 1]}%`);
          const d = div(c, "tz-hielo tz-esquirla", `clip-path:polygon(${poly.join(",")})`);
          const cx = pts.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b) / (pts.length / 2) - 50;
          const cy = pts.filter((_, i) => i % 2).reduce((a, b) => a + b) / (pts.length / 2) - 50;
          return anim(d, [{ transform: "none", opacity: 1 }, { transform: `translate(${cx * 1.3}vw,${cy * 1.3 + 18}vh) rotate(${cx > 0 ? 16 : -16}deg)`, opacity: 0 }], { duration: 320, easing: "cubic-bezier(.4,0,1,1)" });
        }));
      } finally { quitar(c); }
    } },
    { nombre: "Ventisca", ms: 800, async run({ commit, dir, instantanea, anim, quitar }) {
      const c = instantanea(), izq = dir >= 0;
      commit();
      try {
        const nieve = div(c, "tz-ventisca");
        const frente = izq ? ["inset(0 0 0 0)", "inset(0 0 0 100%)"] : ["inset(0 0 0 0)", "inset(0 100% 0 0)"];
        await Promise.all([
          anim(c.copia, [{ clipPath: frente[0], opacity: 1 }, { clipPath: frente[1], opacity: .7 }], { duration: 640, delay: 80, easing: "cubic-bezier(.45,0,.3,1)" }),
          anim(nieve, [{ transform: `translateX(${izq ? -110 : 110}%)`, opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: 1, offset: .75 }, { transform: `translateX(${izq ? 110 : -110}%)`, opacity: 0 }], { duration: 800, easing: "cubic-bezier(.45,0,.3,1)" })
        ]);
      } finally { quitar(c); }
    } },
    { nombre: "Cristal giratorio", ms: 1000, async run({ commit, capa, anim, quitar }) {
      const c = capa("tz tz-facetas"), COL = 8, FIL = 5, piezas = [];
      for (let f = 0; f < FIL; f++) for (let k = 0; k < COL; k++) for (const t of [0, 1]) {
        const x0 = k / COL * 100, x1 = (k + 1) / COL * 100, y0 = f / FIL * 100, y1 = (f + 1) / FIL * 100;
        const inv = (k + f) % 2;
        const tri = t ? (inv ? `${x0}% ${y0}%,${x1}% ${y0}%,${x0}% ${y1}%` : `${x0}% ${y0}%,${x1}% ${y0}%,${x1}% ${y1}%`)
                      : (inv ? `${x1}% ${y0}%,${x1}% ${y1}%,${x0}% ${y1}%` : `${x0}% ${y0}%,${x0}% ${y1}%,${x1}% ${y1}%`);
        const d = div(c, `tz-faceta ${t ? "a" : "b"}`, `clip-path:polygon(${tri});transform-origin:${(x0 + x1) / 2}% ${(y0 + y1) / 2}%`);
        piezas.push([d, Math.hypot(k - (COL - 1) / 2, (f - (FIL - 1) / 2) * 1.6)]);
      }
      try {
        await Promise.all(piezas.map(([d, r]) => anim(d, [{ transform: "rotateY(90deg)", opacity: 0 }, { transform: "rotateY(0)", opacity: 1 }], { duration: 300, delay: r * 34, easing: "cubic-bezier(.3,.7,.3,1)" })));
        commit();
        await Promise.all(piezas.map(([d, r]) => anim(d, [{ transform: "rotateX(0)", opacity: 1 }, { transform: "rotateX(-90deg)", opacity: 0 }], { duration: 300, delay: r * 34, easing: "cubic-bezier(.6,0,.8,.4)" })));
      } finally { quitar(c); }
    } },
    { nombre: "Aurora", ms: 900, async run({ commit, capa, anim, quitar }) {
      const c = capa("tz tz-aurora-capa"), cortina = div(c, "tz-aurora");
      try {
        await anim(cortina, [{ transform: "translateY(-100%)" }, { transform: "translateY(0)" }], { duration: 430, easing: "cubic-bezier(.5,0,.6,1)" });
        commit();
        await anim(cortina, [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(100%)", opacity: .6 }], { duration: 470, easing: "cubic-bezier(.4,0,.6,1)" });
      } finally { quitar(c); }
    } }
  ]);

  /* ---------------- Venom: devoración, tentáculo, goteo, mutación ---------------- */
  // borde superior orgánico de la masa (viewBox 0 0 100 120)
  const masa = "M0 14C6 4 11 16 17 9S27 0 33 8 43 18 49 7 58 2 63 11 72 17 78 6 88 3 92 12 97 4 100 9V120H0Z";
  MUNDOS.transiciones("venom", [
    { nombre: "Devoración", ms: 800, async run({ commit, capa, anim, quitar }) {
      const c = capa("vn vn-devora"), s = capaSvg(c, `<path class="vn-masa" d="${masa}"/><path class="vn-brillo" d="M8 22C20 14 30 26 44 18M60 20C70 13 82 24 94 16"/>`, "0 0 100 120");
      try {
        await anim(s, [{ transform: "translateY(100%)" }, { transform: "translateY(-12%)" }], { duration: 380, easing: "cubic-bezier(.55,0,.4,1)" });
        commit();
        await anim(s, [{ transform: "translateY(-12%)" }, { transform: "translateY(102%)" }], { duration: 420, easing: "cubic-bezier(.6,0,.45,1)" });
      } finally { quitar(c); }
    } },
    { nombre: "Tentáculo barredor", ms: 700, async run({ commit, dir, instantanea, anim, quitar }) {
      const c = instantanea(), izq = dir >= 0;
      commit();
      const t = capaSvg(c, `<path class="vn-tentaculo" d="M-30 108C10 70 0 40 22 30S38 4 30 -10"/><path class="vn-tentaculo-luz" d="M-22 98C14 66 6 42 24 32"/>`, "0 0 60 100", "vn-tent");
      try {
        const desde = izq ? -45 : 105, hasta = izq ? 105 : -45;
        if (!izq) t.style.transform = "scaleX(-1)";
        await Promise.all([
          anim(t, [{ left: `${desde}%` }, { left: `${hasta}%` }], { duration: 700, easing: "cubic-bezier(.5,0,.4,1)" }),
          anim(c.copia, [{ translate: "0 0", opacity: 1 }, { translate: `${izq ? 110 : -110}vw 0`, opacity: .85 }], { duration: 520, delay: 160, easing: "cubic-bezier(.55,0,.6,1)" })
        ]);
      } finally { quitar(c); }
    } },
    { nombre: "Goteo", ms: 900, async run({ commit, capa, anim, quitar }) {
      const c = capa("vn vn-goteo");
      const cortina = capaSvg(c, `<path class="vn-masa" d="M0 0H100V100C96 104 93 99 90 108S84 101 80 104 72 115 68 103 61 100 57 106 49 118 45 104 37 99 33 107 25 112 21 102 13 99 9 108 2 101 0 104Z"/>`, "0 0 100 120", "vn-cortina");
      const gotas = Array.from({ length: 14 }, (_, i) => div(c, "vn-gota", `left:${4 + i * 6.8 + (i % 3) * 1.3}%;width:${18 + (i * 7) % 16}px;height:${28 + (i * 11) % 22}px`));
      try {
        await Promise.all([
          ...gotas.map((g, i) => anim(g, [{ transform: "translateY(-12vh)" }, { transform: "translateY(112vh)" }], { duration: 420, delay: (i * 37) % 160, easing: "cubic-bezier(.5,0,1,1)" })),
          anim(cortina, [{ transform: "translateY(-120%)" }, { transform: "translateY(-120%)", offset: .25 }, { transform: "translateY(0)" }], { duration: 470, easing: "cubic-bezier(.5,0,.7,1)" })
        ]);
        gotas.forEach(g => g.remove());
        commit();
        await anim(cortina, [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(18%)", opacity: 0 }], { duration: 430, easing: "ease-in" });
      } finally { quitar(c); }
    } },
    { nombre: "Mutación", ms: 600, async run({ commit, instantanea, anim, quitar }) {
      const c = instantanea();
      c.insertAdjacentHTML("afterbegin", `<svg class="vn-defs" aria-hidden="true"><filter id="vn-mut" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`);
      const disp = $("feDisplacementMap", c);
      c.copia.style.filter = "url(#vn-mut)";
      commit();
      try {
        await Promise.all([
          tween(600, t => disp.setAttribute("scale", (t * 160).toFixed(1)), ease.in),
          anim(c.copia, [{ opacity: 1 }, { opacity: 1, offset: .45 }, { opacity: 0 }], { duration: 600, easing: "ease-in" })
        ]);
      } finally { quitar(c); }
    } }
  ]);

  /* ---------------- DIO: tiempo detenido, viñetas, velocidad, golpe ---------------- */
  const reloj = `<circle class="dio-esfera" cx="50" cy="50" r="40"/><circle class="dio-aro" cx="50" cy="50" r="34"/>${
    Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<path class="dio-marca" d="M${50 + Math.cos(a) * 30} ${50 + Math.sin(a) * 30}L${50 + Math.cos(a) * 36} ${50 + Math.sin(a) * 36}"/>`; }).join("")
  }<g class="dio-aguja larga"><path d="M50 52V20"/></g><g class="dio-aguja corta"><path d="M50 52V31"/></g><circle class="dio-eje" cx="50" cy="50" r="3"/>`;
  MUNDOS.transiciones("dio", [
    { nombre: "Tiempo detenido", ms: 700, async run({ commit, instantanea, anim, esperar, quitar }) {
      const c = instantanea();
      try {
        // un solo destello invertido de 120 ms; luego el tiempo queda gris y detenido
        c.copia.style.filter = "invert(1) hue-rotate(180deg)";
        await esperar(120);
        c.copia.style.filter = "grayscale(1) contrast(1.15) brightness(.85)";
        const r = capaSvg(c, reloj, "0 0 100 100", "dio-reloj", "xMidYMid meet");
        await Promise.all([
          anim(r, [{ transform: "scale(.4)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 200, easing: "cubic-bezier(.2,1.4,.4,1)" }),
          anim($(".dio-aguja.larga", r), [{ transform: "rotate(-540deg)" }, { transform: "rotate(0)" }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" }),
          anim($(".dio-aguja.corta", r), [{ transform: "rotate(-200deg)" }, { transform: "rotate(0)" }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" })
        ]);
        commit();
        // corte diagonal: la diapositiva detenida se parte y se va
        await Promise.all([
          anim(c.copia, [{ clipPath: "polygon(0 0,100% 0,100% 100%,0 100%)" }, { clipPath: "polygon(0 0,0 0,0 0,0 0)" }], { duration: 260, easing: "cubic-bezier(.7,0,.3,1)" }),
          anim(r, [{ opacity: 1 }, { opacity: 0, transform: "scale(1.3)" }], { duration: 260, easing: "ease-in" })
        ]);
      } finally { quitar(c); }
    } },
    { nombre: "Página de manga", ms: 900, async run({ commit, capa, anim, quitar }) {
      const c = capa("dio dio-manga");
      // viñetas de distinto tamaño, bordes negros gruesos (x, y, w, h en %, entrada)
      const V = [[0, 0, 58, 46, "-110%,0"], [58, 0, 42, 46, "0,-110%"], [0, 46, 34, 54, "0,110%"], [34, 46, 38, 54, "110%,0"], [72, 46, 28, 54, "110%,0"]];
      const pan = V.map(([x, y, w, h, de], i) => {
        const d = div(c, `dio-vineta v${i}`, `left:${x}%;top:${y}%;width:${w}%;height:${h}%`);
        if (i === 1) d.innerHTML = "<span>ドドド</span>";
        return [d, de];
      });
      try {
        await Promise.all(pan.map(([d, de], i) => anim(d, [{ transform: `translate(${de})` }, { transform: "translate(0,0)" }], { duration: 300, delay: i * 40, easing: "cubic-bezier(.3,1.3,.5,1)" })));
        commit();
        await Promise.all(pan.map(([d, de], i) => anim(d, [{ transform: "translate(0,0)" }, { transform: `translate(${de.split(",").map(v => v.startsWith("-") ? v.slice(1) : v === "0" ? "0" : "-" + v).join(",")})` }], { duration: 300, delay: 120 + i * 40, easing: "cubic-bezier(.6,0,.8,.3)" })));
      } finally { quitar(c); }
    } },
    { nombre: "Líneas de velocidad", ms: 600, async run({ commit, instantanea, anim, quitar }) {
      const c = instantanea();
      c.classList.add("dio-hueco");
      const rayos = Array.from({ length: 44 }, (_, i) => {
        const a = i / 44 * Math.PI * 2, w = .018 + (i % 3) * .012;
        const p = (r, b) => `${50 + Math.cos(b) * r} ${50 + Math.sin(b) * r}`;
        return `<path class="${i % 2 ? "am" : "mg"}" d="M${p(18, a)}L${p(90, a - w)}L${p(90, a + w)}Z"/>`;
      }).join("");
      const s = capaSvg(c, rayos, "0 0 100 100", "dio-rayos");
      commit();
      try {
        await Promise.all([
          anim(s, [{ transform: "scale(1.6) rotate(-6deg)", opacity: 0 }, { opacity: 1, offset: .3 }, { transform: "scale(1) rotate(0)", opacity: 0 }], { duration: 600, easing: "cubic-bezier(.2,.7,.3,1)" }),
          anim(c.copia, [{ "--dio-h": "0%" }, { "--dio-h": "75%" }], { duration: 520, easing: "cubic-bezier(.6,0,.3,1)" })
        ]);
      } finally { quitar(c); }
    } },
    { nombre: "Golpe", ms: 500, async run({ commit, instantanea, anim, quitar }) {
      const c = instantanea(), flash = div(c, "dio-flash"), vp = $("#viewport");
      const s = capaSvg(c, `<path class="dio-impacto" d="M50 22L56 40 76 30 64 48 86 54 64 60 72 80 54 66 50 88 44 66 26 80 36 60 12 54 36 48 24 30 44 40Z"/>`, "0 0 100 100", "dio-golpe");
      try {
        await Promise.all([
          anim(flash, [{ opacity: 0 }, { opacity: .85, offset: .3 }, { opacity: 0 }], { duration: 220, easing: "ease-out" }),
          anim(s, [{ transform: "scale(.2)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1, offset: .5 }, { transform: "scale(1.4)", opacity: 0 }], { duration: 360, easing: "ease-out" })
        ]);
        commit();
        // temblor de cámara de 8 px y la diapositiva vieja sale despedida
        await Promise.all([
          anim(vp, [{ translate: "0 0" }, { translate: "8px -6px" }, { translate: "-8px 5px" }, { translate: "6px 4px" }, { translate: "0 0" }], { duration: 240, easing: "linear", fill: "none" }),
          anim(c.copia, [{ translate: "0 0", rotate: "0deg", opacity: 1 }, { translate: "0 60vh", rotate: "7deg", opacity: 0 }], { duration: 260, easing: "cubic-bezier(.5,0,1,.6)" })
        ]);
      } finally { quitar(c); }
    } }
  ]);
})();

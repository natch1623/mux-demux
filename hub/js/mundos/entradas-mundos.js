"use strict";
/* =====================================================================
   Entradas de Venom (§5.1) y DIO (§6.1) con el acabado de materiales.
   Reemplazan a las de secuencias-mundos.js. Igual que las demás: la capa se crea
   de forma síncrona con el mismo cable y la señal del puente (PUENTE.cable), y al
   terminar no queda nada encima de la estación.
   ===================================================================== */
(() => {
  const { el, rng, lienzo, reloj, ease, tramo, suave, linea, defsViscosa, vsCanto, reflejos, tentaculo, defsTinta, pincel, reloj2 } = MAT;
  const titulo = sec => $(".z-titulo h2", sec) || $("h2", sec);
  const aPx = () => { const s = Math.min(innerWidth / FW, innerHeight / FH); return [s, (x, y) => [innerWidth / 2 + x * s, innerHeight / 2 + y * s]]; };

  /* =============================== VENOM =============================== */
  async function entrarVenom(ctx) {
    const { sec, quitar } = ctx;
    const c = ctx.capa("mundo-puente se se-vn entrada"), cable = PUENTE.cable(c, { desde: ctx.desde, senal: true });
    const h2 = titulo(sec); if (h2) h2.style.visibility = "hidden";
    try {
      const { svg, defs, W, H } = lienzo(c), m = defsViscosa(defs), r = rng(17), [s] = aPx();
      const nx = W / 2, ny = H / 2, lado = ctx.desde === "derecha" ? 1 : -1;
      // 0,0–0,9 s: el cable se engrosa en un nodo; la materia se acumula bajo su superficie
      const bulto = el("path", { fill: m.cuerpo }, svg), cantoB = vsCanto(svg, defs), brilloB = el("path", { class: "vn-reflejo" }, svg);
      const gota = el("path", { fill: m.cuerpo, class: "vn-gota-c" }, svg), brilloG = el("path", { class: "vn-reflejo-gota" }, svg);
      const nodo = (k, ond) => { const p = []; for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, rx = 30 + 70 * k, ry = 6 + 30 * k; p.push([nx + Math.cos(a) * rx * (1 + .06 * Math.sin(a * 3 + ond)), ny + Math.sin(a) * ry * (1 + .1 * Math.sin(a * 5 + ond))]); } return suave(p); };
      await reloj(900, t => {
        const k = ease.out(tramo(t, 0, .6)), d = nodo(k, t * 6);
        bulto.setAttribute("d", d); cantoB(d, d);
        brilloB.setAttribute("d", `M${nx - 40 * k - 20} ${ny - 18 * k}Q${nx} ${ny - 32 * k} ${nx + 40 * k + 10} ${ny - 16 * k}`);
        // la gota se alarga bajo el nodo antes de desprenderse
        const g = tramo(t, .45, 1), rr = 9 + 7 * g, y0 = ny + 20 * k, yb = y0 + 14 + 70 * ease.in(g);
        gota.setAttribute("d", g > 0 ? `M${nx} ${y0}C${nx + rr * .3} ${(y0 + yb) / 2} ${nx + rr} ${yb - rr * .6} ${nx + rr} ${yb}A${rr} ${rr} 0 1 1 ${nx - rr} ${yb}C${nx - rr} ${yb - rr * .6} ${nx - rr * .3} ${(y0 + yb) / 2} ${nx} ${y0}Z` : "");
        brilloG.setAttribute("d", g > 0 ? `M${nx - rr * .55} ${yb - rr * .2}Q${nx - rr * .5} ${yb - rr * .75} ${nx - rr * .05} ${yb - rr * .85}` : "");
        cable.pulso?.setAttribute("opacity", 1 - k);
      });
      // la gota se desprende y cae
      await reloj(260, t => { const y = ease.in(t) * H * .6; gota.setAttribute("transform", `translate(0 ${y})`); brilloG.setAttribute("transform", `translate(0 ${y})`); gota.style.opacity = brilloG.style.opacity = 1 - tramo(t, .6, 1); });
      gota.remove(); brilloG.remove();
      // 0,9–1,8 s: dos tentáculos avanzan por el cable, base gruesa, punta fina, con torsión
      const tents = [-1, 1].map(() => ({ g: el("path", { fill: m.cuerpo, class: "vn-tent2" }, svg), lomo: el("path", { class: "vn-reflejo" }, svg) }));
      const cantoT = tents.map(() => vsCanto(svg, defs));
      await reloj(900, t => {
        const k = ease.out(t);
        tents.forEach(({ g, lomo }, i) => {
          const sg = i ? 1 : -1, L = W * .52 * k, cen = [];
          for (let j = 0; j < 12; j++) { const u = j / 11; cen.push([nx + sg * (40 + L * u), ny + Math.sin(u * 9 - t * 12 + i) * 12 * u]); }
          const { cuerpo, lomo: l } = tentaculo(cen, 70, 6);
          g.setAttribute("d", cuerpo); lomo.setAttribute("d", l); cantoT[i](cuerpo, cuerpo);
        });
        const d = nodo(1 + .3 * k, t * 8); bulto.setAttribute("d", d); cantoB(d, d);
      });
      // 1,8–2,9 s: la materia se extiende desde el nodo con lóbulos desiguales y filamentos
      const masa = el("path", { fill: m.cuerpo }, svg), cantoM = vsCanto(svg, defs), refl = el("path", { class: "vn-reflejo" }, svg), hilos = el("path", { class: "vn-hilo" }, svg);
      const fase = Array.from({ length: 48 }, () => r() * 6);
      const lob = (R, k) => { const p = []; for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283, q = R * (1 + k * (.16 * Math.sin(a * 3 + fase[i % 9]) + .09 * Math.sin(a * 7 + fase[(i + 4) % 13]) + .04 * Math.sin(a * 13 + fase[i]))); p.push([nx + Math.cos(a) * q * 1.25, ny + Math.sin(a) * q * .85]); } return p; };
      const D = Math.hypot(W, H) * .78;
      await reloj(1100, t => {
        const R = 60 + D * ease.io(t), p = lob(R, 1 - .4 * t), d = suave(p);
        masa.setAttribute("d", d); cantoM(d, d);
        refl.setAttribute("d", reflejos(p.slice(30, 44).map(([x, y]) => [x, y]).concat([]), 9));
        let hd = ""; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + .4, q = R * 1.05, e = [nx + Math.cos(a) * (q + 120), ny + Math.sin(a) * (q + 80)]; hd += `M${nx + Math.cos(a) * q * 1.2} ${ny + Math.sin(a) * q * .8}Q${(nx + e[0]) / 2 + 30} ${(ny + e[1]) / 2} ${e[0]} ${e[1]}`; }
        hilos.setAttribute("d", t < .85 ? hd : ""); hilos.style.opacity = 1 - tramo(t, .6, .85);
      });
      [bulto, brilloB, ...tents.flatMap(x => [x.g, x.lomo]), hilos, refl].forEach(e => e.remove()); cantoB("", ""); cantoT.forEach(f => f("", ""));
      cable.remove();
      c.classList.add("se-vn-negro");
      // 2,9–3,9 s: contracción lenta; dos aberturas blancas con forma de ojos que parpadean
      const ojos = el("g", { class: "vn-ojos2" }, svg), ex = W / 2, ey = H * .44, sc = Math.min(W, H) / 720;
      const ojo = sg => `M${ex + sg * 20 * sc} ${ey - 8 * sc}Q${ex + sg * 110 * sc} ${ey - 70 * sc} ${ex + sg * 200 * sc} ${ey - 92 * sc}Q${ex + sg * 170 * sc} ${ey + 10 * sc} ${ex + sg * 40 * sc} ${ey + 34 * sc}Z`;
      const blanco = [-1, 1].map(sg => el("path", { d: ojo(sg), fill: "#EDEDE6" }, ojos));
      const parpado = [-1, 1].map(sg => el("path", { fill: "#050507" }, ojos));
      const contorno = [-1, 1].map(sg => el("path", { d: ojo(sg), class: "vn-ojo-borde" }, ojos));
      await reloj(1000, t => {
        masa.setAttribute("transform", `translate(${nx} ${ny}) scale(${1 - .02 * Math.sin(t * Math.PI)}) translate(${-nx} ${-ny})`);
        // la materia se contrae alrededor del ojo: el párpado baja y sube una vez
        const abre = ease.out(tramo(t, 0, .3)), cierra = Math.sin(Math.PI * tramo(t, .5, .75));
        ojos.style.opacity = abre;
        parpado.forEach((p, i) => { const sg = i ? 1 : -1, y = ey - 100 * sc + 140 * sc * (1 - abre + cierra); p.setAttribute("d", `M${ex + sg * 10 * sc} ${ey - 120 * sc}L${ex + sg * 220 * sc} ${ey - 120 * sc}L${ex + sg * 220 * sc} ${y}Q${ex + sg * 110 * sc} ${y + 30 * sc} ${ex + sg * 10 * sc} ${y}Z`); });
      });
      // 3,9–4,5 s: la membrana se recoge hacia arriba; hilos rezagados se estiran y ceden
      c.classList.remove("se-vn-negro"); c.style.background = "transparent"; ojos.remove(); masa.remove(); cantoM("", "");
      const cort = el("path", { fill: m.cuerpo }, svg), cantoC = vsCanto(svg, defs), filo = el("path", { class: "vn-reflejo" }, svg), hil2 = el("path", { class: "vn-hilo" }, svg);
      const xs = Array.from({ length: 9 }, (_, i) => W * (i + .5) / 9 + (r() - .5) * 60);
      await reloj(620, t => {
        const y = H * (1.05 - 1.25 * ease.in(t)), p = [];
        for (let i = 0; i <= 24; i++) { const x = -40 + (W + 80) * i / 24; p.push([x, y + Math.sin(i * 1.7 + t * 6) * 22 + (i % 4 === 0 ? 40 : 0)]); }
        const d = suave([[W + 60, -400], [-60, -400], ...p]); cort.setAttribute("d", d); cantoC(d, suave(p, false));
        filo.setAttribute("d", reflejos(p.map(([a, b]) => [a, -b])).replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (q, a, b) => `${a} ${-b - 10}`));
        const k = tramo(t, .1, .95);
        hil2.setAttribute("d", k < 1 ? xs.map((x, i) => { const yb = y + 30 + (H - y) * (1 - k) * (.3 + (i % 3) * .2); return `M${x} ${y}C${x - 8} ${(y + yb) / 2} ${x + 8} ${(y + yb) / 2} ${x} ${yb}`; }).join("") : "");
        hil2.style.opacity = 1 - tramo(t, .7, .95);
      });
      // el título queda descubierto; termina toda deformación antes de leerlo
      if (h2) { h2.style.visibility = ""; await MUNDOS.anim(h2, [{ clipPath: "inset(100% -4% -10% -4%)" }, { clipPath: "inset(-20% -4% -10% -4%)" }], { duration: 380, easing: "cubic-bezier(.3,0,.2,1)", fill: "none" }); }
    } finally { if (h2) h2.style.visibility = ""; quitar(c); }
  }

  /* ================================ DIO ================================ */
  // silueta original: figura de abrigo largo, brazo alzado con la mano abierta, la otra en la cadera
  const POSE = {
    cuerpo: "M150 92C170 92 182 108 180 128C179 140 172 150 164 154L168 172C196 178 214 190 222 208L262 150C268 140 280 140 284 150L288 158C292 166 288 174 282 180L240 240C232 252 224 258 214 262L212 330C230 380 244 450 250 560L214 566L184 420L172 566L136 562L146 420C140 380 140 340 146 300L118 300C104 300 96 290 100 278L112 238C116 224 126 214 140 208L136 172L138 154C128 148 122 136 122 124C122 106 134 92 150 92Z",
    mano: "M262 150L256 118C255 112 262 110 264 116L270 140L272 104C272 97 281 97 281 104L280 138L288 108C290 101 299 103 297 110L290 142L300 122C303 116 311 120 308 126L292 162Z",
    pliegues: "M150 300C156 360 158 420 154 520M188 300C196 360 206 430 222 520M170 214C176 236 178 256 176 280M146 224C154 236 158 250 158 262M200 200C206 210 210 222 212 236",
    sombra: "M180 214C204 222 214 240 212 262L212 330C226 370 236 430 242 520L214 528C206 440 196 380 186 340Z",
    cadera: "M116 276C110 262 118 246 132 244L150 262C140 270 130 280 116 276Z"
  };
  async function entrarDio(ctx) {
    const { sec, quitar } = ctx;
    const c = ctx.capa("mundo-puente se se-dio entrada"), cable = PUENTE.cable(c, { desde: ctx.desde, senal: true });
    const h2 = titulo(sec); if (h2) h2.style.visibility = "hidden";
    try {
      const { svg, defs, W, H } = lienzo(c), t = defsTinta(defs), r = rng(41);
      const lado = ctx.desde === "derecha" ? 1 : -1, ny = H / 2;
      // 0,0–0,8 s: el cable toma un contorno de tinta y rojo oscuro, vibra; el pulso se detiene
      const tinta = el("path", { class: "dio-cable-tinta" }, svg), rojo = el("path", { class: "dio-cable-rojo" }, svg);
      svg.before(cable); c.append(svg);
      await reloj(800, u => {
        const k = ease.out(tramo(u, 0, .5)), vib = Math.sin(u * 70) * 5 * (1 - tramo(u, .5, 1)) * k;
        const d = `M-20 ${ny}Q${W / 2} ${ny + vib} ${W + 20} ${ny}`;
        tinta.setAttribute("d", d); rojo.setAttribute("d", d); tinta.style.opacity = rojo.style.opacity = k;
        cable.pulso?.setAttribute("transform", `translate(${(lado * W * .18 * ease.out(tramo(u, 0, .45))) / aPx()[0]} 0)`);
      });
      // 0,8–1,7 s: todo se congela; inversión breve de la capa ilustrada; reloj en un plano posterior
      const parts = el("g", {}, svg);
      for (let i = 0; i < 18; i++) { const x = r() * W, y = r() * H, l = 30 + r() * 80; el("path", { d: `M${x} ${y}L${x + l} ${y - l * .25}`, class: "dio-linea-cortada" }, parts); }
      c.classList.add("se-dio-invertido");
      await MUNDOS.esperar(120);
      c.classList.remove("se-dio-invertido");
      const R = Math.min(W, H) * .32, rl = reloj2(svg, W / 2, ny, R);
      svg.insertBefore(rl, tinta);
      await reloj(780, u => { const a = ease.out(tramo(u, 0, .35)); rl.style.opacity = a; rl.style.transformOrigin = `${W / 2}px ${ny}px`; rl.style.transform = `scale(${.8 + .2 * a})`;
        rl.larga.style.transform = `rotate(${u * 900}deg)`; rl.corta.style.transform = `rotate(${u * 160}deg)`; });
      // 1,7–2,1 s: las agujas frenan y se detienen exactamente en las doce; un pulso luminoso
      const a0 = 900 % 360, b0 = 160;
      const pulso = el("circle", { cx: W / 2, cy: ny, r: R, class: "dio-pulso-reloj" }, svg);
      await reloj(400, u => { const k = ease.out(u); rl.larga.style.transform = `rotate(${a0 + (360 - a0) * k}deg)`; rl.corta.style.transform = `rotate(${b0 + (360 - b0) * k}deg)`;
        const p = tramo(u, .85, 1); pulso.setAttribute("r", R * (1 + .25 * p)); pulso.style.opacity = p > 0 ? (1 - p) * .9 : 0; });
      // 2,1–3,6 s: la estación aparece detrás; líneas de velocidad y bandas hacia el foco,
      // ゴゴゴゴ con tinta y perspectiva, y la silueta dibujada con contornos, sombras y trama
      c.style.background = "transparent"; cable.remove(); parts.remove(); pulso.remove(); tinta.remove(); rojo.remove();
      const F = [W * .3, H * .1];
      const vel = el("g", { class: "dio-vel" }, svg);
      for (let k = 0; k < 110; k++) {
        const a = k / 110 * 6.283 + (r() - .5) * .04, w = k % 8 === 0 ? .07 : .006 + r() * .008, R1 = Math.hypot(W, H) * (.42 + r() * .15), R2 = Math.hypot(W, H) * 1.3;
        el("polygon", { points: MAT.pts([[F[0] + Math.cos(a) * R1, F[1] + Math.sin(a) * R1], [F[0] + Math.cos(a - w) * R2, F[1] + Math.sin(a - w) * R2], [F[0] + Math.cos(a + w) * R2, F[1] + Math.sin(a + w) * R2]]), fill: k % 8 === 0 ? (k % 16 ? "#FFD400" : "#E6007E") : "#0B0B0F" }, vel);
      }
      svg.insertBefore(vel, rl);
      const gogo = el("g", { class: "dio-gogo2" }, svg);
      // en perspectiva: cada ゴ más grande y más cerca, inclinado sobre su propio centro
      ["ゴ", "ゴ", "ゴ", "ゴ"].forEach((g, i) => { const gx = W * .935 - i * W * .012, gy = H * .5 + i * H * .1, wr = el("g", { transform: `translate(${gx} ${gy}) rotate(${-10 + i * 3}) skewX(-12)` }, gogo); const tx = el("text", { x: 0, y: 0, "font-size": (H * (.07 + i * .018)).toFixed(0), "dominant-baseline": "middle" }, wr); tx.textContent = g; });
      const S = H * .62 / 600, pose = el("g", { class: "dio-pose2", transform: `translate(${W * .015} ${H * .36}) scale(${S})` }, svg);
      el("path", { d: POSE.cuerpo, fill: "#4B1D7A" }, pose);
      el("path", { d: POSE.sombra, fill: t.trama }, pose);
      el("path", { d: POSE.cadera, fill: "#2A0F45" }, pose);
      el("path", { d: POSE.mano, fill: "#F3E9D2" }, pose);
      const trazo = el("path", { d: POSE.cuerpo + POSE.mano, class: "dio-pose-trazo", pathLength: 1 }, pose);
      el("path", { d: POSE.pliegues, class: "dio-pose-pliegue" }, pose);
      await reloj(1500, u => {
        rl.style.opacity = 1 - tramo(u, 0, .35);
        vel.style.opacity = ease.out(tramo(u, 0, .3)) * (1 - tramo(u, .75, 1) * .6);
        vel.style.transformOrigin = `${F[0]}px ${F[1]}px`; vel.style.transform = `scale(${1.4 - .4 * ease.out(tramo(u, 0, .35))})`;
        const g = tramo(u, .2, .45); gogo.style.opacity = g * .9;
        gogo.style.transform = g >= 1 && u < .75 ? `translate(${Math.sin(u * 200) * 2}px,${Math.cos(u * 180) * 1.5}px)` : "";
        trazo.style.strokeDashoffset = 1 - ease.io(tramo(u, .45, .9)); pose.style.opacity = tramo(u, .45, .55);
      });
      rl.remove();
      // 3,6–5,0 s: el título llega con anticipación, impacto, desplazamiento breve del marco y parada firme
      if (h2) {
        h2.style.visibility = "";
        await MUNDOS.anim(h2, [{ scale: 1, opacity: 0, offset: 0 }, { scale: .9, opacity: 0, offset: .25 }, { scale: 2.1, opacity: 0, offset: .26 }, { scale: .96, opacity: 1, offset: .7 }, { scale: 1, opacity: 1 }], { duration: 420, easing: "cubic-bezier(.5,0,.6,1)", fill: "none" });
        await MUNDOS.anim($("#viewport"), [{ translate: "0 0" }, { translate: "5px -3px" }, { translate: "-4px 2px" }, { translate: "0 0" }], { duration: 180, easing: "linear", fill: "none" });
      }
      await reloj(560, u => { [vel, gogo, pose].forEach(e => e.style.opacity = (1 - ease.in(u)) * (e === vel ? .4 : 1)); });
    } finally { if (h2) h2.style.visibility = ""; $("#viewport").style.translate = ""; quitar(c); }
  }

  MUNDOS.secuencias("venom", { entrar: entrarVenom });
  MUNDOS.secuencias("dio", { entrar: entrarDio });
})();

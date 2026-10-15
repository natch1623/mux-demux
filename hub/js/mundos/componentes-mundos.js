"use strict";
/* =====================================================================
   Componentes reinterpretados y 5 toques de Tsaritsa (§2.5, §2.7),
   Venom (§3.5, §3.7) y DIO (§4.5, §4.7), en las estaciones con un 4:1 / 1:4 suelto.
   No reemplazan el circuito: lo visten. Las piezas lógicas (cristales, llaves,
   sensores, dispositivos) siguen siendo las mismas y siguen mandando; aquí se
   agregan el mecanismo, los rayos, la criatura o el reloj, y se leen la selección
   y la salida del propio dibujo (con un observador), así nunca se desincroniza.
   ===================================================================== */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, at = {}, padre) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (padre) padre.append(e); return e; };
  const P = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  const ETIQUETAS = {
    tsaritsa: ["En reposo", "Engranajes y esfera", "Los anillos se alinean", "Rayo del pilar", "Escarcha en los demás", "Rayo de salida y decreto"],
    venom: ["Dormido", "Despierta", "Tendones tensos", "El tentáculo atrapa", "Los demás se retraen", "Viaja a la boca"],
    dio: ["Tiempo quieto", "El reloj se activa", "Palancas fijadas", "La manecilla apunta", "Zoom dramático", "¡Impacto!"]
  };

  /* ---------- lectura del dibujo ---------- */
  function datos(sec) {
    const svg = $("svg.fig", sec), demux = sec.dataset.id.startsWith("demux"), dio = sec.classList.contains("w-dio");
    const caja = e => { const b = e.getBBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height, b }; };
    const canales = (dio ? $$(demux ? ".device" : ".sensor", svg) : $$(".cr:not(.big)", svg)).map(e => ({ el: e, ...caja(e) }));
    const ext = dio ? (demux ? $(".box", svg) : $(".box.adc", svg)) : $(".cr.big", svg);
    return { svg, demux, blk: caja($(".blk", svg)), canales, ext: { el: ext, ...caja(ext) } };
  }
  function seleccion(sec, d) {
    const b = k => $(`.tg[data-k="${k}"] b`, sec);
    if (b("s1") && b("s0")) return +b("s1").textContent * 2 + +b("s0").textContent;
    const keys = $$(".key:not(.en)", d.svg).sort((a, c) => a.getBBox().x - c.getBBox().x);
    if (keys.length === 2) return (keys[0].classList.contains("one") ? 2 : 0) + (keys[1].classList.contains("one") ? 1 : 0);
    return Math.max(0, d.canales.findIndex(c => c.el.classList.contains("on")));
  }
  function salida(sec, d, s) {
    if (d.svg.closest(".w-dio") && !d.demux) return true;                       // el ADC siempre recibe una lectura
    if (d.demux) return d.canales[s]?.el.classList.contains(sec.classList.contains("w-dio") ? "on" : "one");
    return d.ext.el.classList.contains("one");
  }

  /* ---------- dibujo de cada mundo ---------- */
  const dibujar = {
    tsaritsa(d, id) {
      const { x: cx, y: cy } = d.blk, R = Math.min(d.blk.h / 2 + 36, 270);
      const atras = el("g", { class: "mw-comp mw-atras" }); d.svg.prepend(atras);
      const defs = el("defs", {}, atras);
      const g = el("radialGradient", { id: `tz-oro-${id}`, cx: "38%", cy: "34%", r: "70%" }, defs);
      [["0", "#FFF4CF"], [".45", "#D9B25F"], ["1", "#6B4A12"]].forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, g));
      el("circle", { class: "tz-aro", cx, cy, r: R }, atras);
      el("circle", { class: "tz-aro fino", cx, cy, r: R - 16 }, atras);
      d.engranes = [-135, -45, 45, 135].map((a, i) => {
        const r = a * Math.PI / 180, gx = cx + Math.cos(r) * R, gy = cy + Math.sin(r) * R;
        const w = el("g", { transform: `translate(${P(gx, gy)})` }, atras);
        return el("path", { class: "tz-engrane", d: DRESS.gearD(0, 0, 34, 16), "data-i": i }, w);
      });
      const frente = el("g", { class: "mw-comp mw-frente", "pointer-events": "none" }); d.svg.append(frente);
      d.rayo1 = el("path", { class: "tz-rayo", pathLength: 1 }, frente);
      d.rayo2 = el("path", { class: "tz-rayo dos", pathLength: 1 }, frente);
      d.anillos = [74, 56].map((r, i) => {
        const w = el("g", { class: "tz-anillo", style: `transform-origin:${cx}px ${cy}px` }, frente);
        el("circle", { cx, cy, r }, w);
        el("rect", { class: "tz-muesca", x: cx - 5, y: cy - r - 9, width: 10, height: 18 }, w);
        return w;
      });
      el("circle", { class: "tz-esfera-halo", cx, cy, r: 52 }, frente);
      el("circle", { class: "tz-esfera", cx, cy, r: 34, fill: `url(#tz-oro-${id})` }, frente);
      // pilares de cristal (las entradas del MUX o las salidas del DEMUX) y la salida ovalada
      d.canales.forEach(c => {
        const x = c.x, y = c.y, w = 30, h = Math.min(54, c.h / 2 - 4);
        const pilar = `M${P(x - w, y + h - 10)}L${P(x - w, y - h + 14)}L${P(x, y - h)}L${P(x + w, y - h + 14)}L${P(x + w, y + h - 10)}L${P(x, y + h)}Z`;
        $(".cr-body", c.el)?.setAttribute("d", pilar);
        $(".cr-halo", c.el)?.setAttribute("d", `M${P(x - w - 10, y + h)}L${P(x - w - 10, y - h + 8)}L${P(x, y - h - 12)}L${P(x + w + 10, y - h + 8)}L${P(x + w + 10, y + h)}L${P(x, y + h + 12)}Z`);
        $(".cr-facet", c.el)?.setAttribute("d", `M${P(x, y - h)}V${(y + h).toFixed(1)}M${P(x - w, y - h + 14)}L${P(x, y)}L${P(x + w, y - h + 14)}`);
      });
      if (d.ext.el?.classList.contains("cr")) {
        const { x, y } = d.ext, rx = 46, ry = 66;
        const ov = (a, b) => `M${P(x - a, y)}A${a} ${b} 0 1 0 ${P(x + a, y)}A${a} ${b} 0 1 0 ${P(x - a, y)}Z`;
        $(".cr-body", d.ext.el)?.setAttribute("d", ov(rx, ry));
        $(".cr-halo", d.ext.el)?.setAttribute("d", ov(rx + 18, ry + 18));
        $(".cr-facet", d.ext.el)?.setAttribute("d", ov(rx * .55, ry * .55));
      }
    },
    venom(d) {
      const b = d.blk.b, { x: cx, y: cy } = d.blk, lado = d.demux ? 1 : -1;
      const atras = el("g", { class: "mw-comp mw-atras" }); d.svg.prepend(atras);
      // tentáculos desde la masa hasta cada entrada (o salida), con cápsula alrededor del orbe
      d.tent = d.canales.map((c, i) => {
        const x0 = d.demux ? b.x + b.width - 6 : b.x + 6, y0 = cy + (i - 1.5) * b.height * .18;
        const tip = d.demux ? c.x - c.w / 2 : c.x + c.w / 2;
        el("rect", { class: "vn-capsula", x: c.b.x - 10, y: c.b.y - 8, width: c.b.width + 20, height: c.b.height + 16, rx: 34 }, atras);
        const t = el("path", { class: "vn-tentaculo", d: `M${P(x0, y0)}C${P(x0 + lado * 60, y0 - 30)} ${P(tip - lado * 80, c.y + 30)} ${P(tip, c.y)}`, "data-i": i }, atras);
        return t;
      });
      const frente = el("g", { class: "mw-comp mw-frente", "pointer-events": "none" }); d.svg.append(frente);
      // ojos genéricos y boca en el lado de la salida
      const ojos = el("g", { class: "vn-ojos" }, frente);
      el("path", { d: `M${P(cx - 62, cy - 120)}Q${P(cx - 30, cy - 104)} ${P(cx - 8, cy - 96)}L${P(cx - 16, cy - 84)}Q${P(cx - 46, cy - 88)} ${P(cx - 62, cy - 120)}Z` }, ojos);
      el("path", { d: `M${P(cx + 62, cy - 120)}Q${P(cx + 30, cy - 104)} ${P(cx + 8, cy - 96)}L${P(cx + 16, cy - 84)}Q${P(cx + 46, cy - 88)} ${P(cx + 62, cy - 120)}Z` }, ojos);
      const mx = cx, my = cy + 70, boca = el("g", { class: "vn-boca" }, frente);
      el("path", { class: "vn-garganta", d: `M${P(mx - 56, my)}Q${P(mx, my + 54)} ${P(mx + 56, my)}Q${P(mx, my + 8)} ${P(mx - 56, my)}Z` }, boca);
      const dientes = (y, s) => Array.from({ length: 7 }, (_, k) => { const x = mx - 48 + k * 16; return `M${P(x, y)}L${P(x + 8, y + s * 16)}L${P(x + 16, y)}`; }).join("");
      el("path", { class: "vn-dientes", d: dientes(my - 2, 1) }, boca);
      d.mandibula = el("path", { class: "vn-dientes abajo", d: dientes(my + 2, -1) }, boca);
      d.orbe = el("circle", { class: "vn-orbe", r: 14, cx: -100, cy: -100 }, frente);
      d.boca = boca; d.my = my;
    },
    dio(d, id) {
      const { x: cx, y: cy } = d.blk, R = d.demux ? 175 : 300;
      const atras = el("g", { class: "mw-comp mw-atras" }); d.svg.prepend(atras);
      // engranajes detrás de la esfera
      d.engranes = [[-0.8, 1.15, 64], [0.55, -1.1, 46]].map(([fx, fy, r]) => {
        const w = el("g", { transform: `translate(${P(cx + fx * R, cy + fy * R * .7)})` }, atras);
        return el("path", { class: "dio-engrane", d: DRESS.gearD(0, 0, r, 14) }, w);
      });
      el("circle", { class: "dio-esfera", cx, cy, r: R }, atras);
      // cuatro sectores de color, uno por canal, orientados hacia cada canal
      const COL = ["#FFD400", "#E6007E", "#2BD67B", "#FF7A1A"];
      d.canales.forEach((c, i) => {
        const a = Math.atan2(c.y - cy, c.x - cx), w = .36, r = R - 10;
        el("path", { class: "dio-sector", "data-i": i, fill: COL[i], d: `M${P(cx, cy)}L${P(cx + Math.cos(a - w) * r, cy + Math.sin(a - w) * r)}A${r} ${r} 0 0 1 ${P(cx + Math.cos(a + w) * r, cy + Math.sin(a + w) * r)}Z` }, atras);
        // viñeta de manga detrás de cada entrada (o destino)
        el("rect", { class: "dio-vineta", x: c.b.x - 12, y: c.b.y - 10, width: c.b.width + 24, height: c.b.height + 20 }, atras);
      });
      el("circle", { class: "dio-centro", cx, cy, r: R * .18 }, atras);
      const frente = el("g", { class: "mw-comp mw-frente", "pointer-events": "none" }); d.svg.append(frente);
      // la manecilla va detrás del bloque: no tapa su rótulo
      d.aguja = el("path", { class: "dio-aguja", d: `M${P(cx - 9, cy)}L${P(cx, cy - R * .82)}L${P(cx + 9, cy)}Z`, style: `transform-origin:${cx}px ${cy}px` }, atras);
      d.cx = cx; d.cy = cy;
      d.ono = el("text", { class: "dio-baan", "text-anchor": "middle" }, frente);
      d.ono.textContent = "バァーン";
    }
  };

  /* ---------- estado según el toque ---------- */
  const armadas = new WeakMap();
  function armar(sec) {
    if (armadas.has(sec)) return armadas.get(sec);
    const svg = $("svg.fig", sec);
    if (!svg?.isConnected) return null;
    let d;
    try { d = datos(sec); } catch { return null; }
    const tema = sec.dataset.realm;
    dibujar[tema](d, sec.dataset.id);
    d.tema = tema; d.n = 0;
    armadas.set(sec, d);
    // la lógica manda: cualquier cambio en el dibujo (llaves, cristales, palancas) se refleja
    let pend = 0;
    new MutationObserver(ms => {
      if (ms.every(m => m.target.closest?.(".mw-comp"))) return;
      cancelAnimationFrame(pend); pend = requestAnimationFrame(() => pintar(sec, d, d.n, false));
    }).observe(sec, { subtree: true, attributes: true, attributeFilter: ["class", "aria-pressed"], characterData: true, childList: false });
    return d;
  }
  function pintar(sec, d, n, adelante) {
    const s = seleccion(sec, d), y = salida(sec, d, s);
    d.n = n;
    sec.dataset.toque = n;
    for (let i = 1; i <= 5; i++) d.svg.classList.toggle("mw-t" + i, n >= i);
    d.svg.classList.toggle("mw-y1", !!y);
    d.canales.forEach((c, i) => { c.el.classList.toggle("mw-sel", i === s); c.el.classList.toggle("mw-otro", i !== s); });
    const c = d.canales[s];
    if (d.tema === "tsaritsa") {
      const { x: cx, y: cy } = d.blk;
      /* el rayo sigue el circuito: sale del borde de la pieza, corre por su cable hasta el
         bloque, llega a la esfera y de ahí sale por el lado opuesto hasta el borde del destino
         (nunca cruza ni tapa las cifras de los pilares ni de la salida) */
      const ori = d.demux ? d.ext : c, des = d.demux ? c : d.ext, bx0 = d.blk.b.x, bx1 = d.blk.b.x + d.blk.b.width;
      const borde = (p, lado) => p.x + lado * (p.w / 2 + 2);
      d.rayo1.setAttribute("d", `M${P(borde(ori, 1), ori.y)}L${P(bx0, ori.y)}L${P(cx, cy)}`);
      d.rayo2.setAttribute("d", `M${P(cx, cy)}L${P(bx1, des.y)}L${P(borde(des, -1), des.y)}`);
      d.engranes.forEach((g, i) => g.classList.toggle("rapido", i === s));
      // los anillos giran hasta alinear sus muescas con el canal elegido (como una cerradura)
      const ang = Math.atan2(c.y - cy, c.x - cx) * 180 / Math.PI + 90;
      d.anillos.forEach((a, i) => { a.style.transform = `rotate(${n >= 2 ? ang : (i ? -71 : 43)}deg)`; });
      if (adelante && n === 3) MUNDOS.anim(d.rayo1, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 600, easing: "cubic-bezier(.3,0,.2,1)", fill: "none" });
      if (adelante && n === 5) MUNDOS.anim(d.rayo2, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 600, easing: "cubic-bezier(.3,0,.2,1)", fill: "none" });
      decreto(sec, d, s, n);
    } else if (d.tema === "venom") {
      d.tent.forEach((t, i) => { t.classList.toggle("elegido", i === s); });
      d.boca.classList.toggle("abierta", n >= 5 && !!y);
      if (adelante && n === 5) viaje(d, s);
    } else if (d.tema === "dio") {
      const a = Math.atan2(c.y - d.cy, c.x - d.cx) * 180 / Math.PI + 90;
      d.aguja.style.transform = `rotate(${n >= 3 ? a : 0}deg)`;
      const dest = d.demux ? c : d.ext;
      d.ono.setAttribute("x", d.demux ? dest.b.x - 90 : dest.x); d.ono.setAttribute("y", d.demux ? dest.y - 22 : dest.b.y - 18);
      if (adelante && n === 5 && !reduced) MUNDOS.anim(d.svg, [{ translate: "0 0" }, { translate: "8px -6px" }, { translate: "-8px 5px" }, { translate: "5px 3px" }, { translate: "0 0" }], { duration: 260, easing: "linear", fill: "none" });
    }
    if (adelante && n >= 1) SONIDO.fase(d.tema, ETIQUETAS[d.tema][n], { sel: s, y });
  }
  // Venom: el valor viaja por la masa desde el tentáculo elegido hasta la boca
  function viaje(d, s) {
    if (reduced) return;
    const t = d.tent[s], L = t.getTotalLength(), ini = d.demux ? 0 : L;
    const p0 = t.getPointAtLength(ini), { x: cx } = d.blk, frames = [];
    for (let k = 0; k <= 12; k++) { const q = t.getPointAtLength(d.demux ? L * k / 12 : L * (1 - k / 12)); frames.push({ transform: `translate(${q.x + 100}px,${q.y + 100}px)`, opacity: 1 }); }
    frames.push({ transform: `translate(${cx + 100}px,${d.my + 100}px)`, opacity: 0 });
    MUNDOS.anim(d.orbe, frames, { duration: 700, easing: "ease-in-out", fill: "none" });
  }
  // Tsaritsa: placa de decreto con la fila activa iluminada desde atrás
  function decreto(sec, d, s, n) {
    let placa = $(".tz-decreto", sec);
    if (!placa) {
      placa = html(`<table class="tz-decreto" aria-label="Decreto: combinación de selección y canal"><tbody>${[0, 1, 2, 3].map(i =>
        `<tr><td>${i.toString(2).padStart(2, "0")}</td><td>◆</td><td>${d.demux ? "Y" : "D"}${"₀₁₂₃"[i]}</td></tr>`).join("")}</tbody></table>`);
      $(".z-expl", sec)?.append(placa);
    }
    $$("tr", placa).forEach((tr, i) => tr.classList.toggle("on", n >= 5 && i === s));
    placa.classList.toggle("visible", n >= 5);
  }

  const fases = tema => ({
    etiquetas: ETIQUETAS[tema],
    aplicar(sec, n, info) { const d = armar(sec); if (d) pintar(sec, d, n, info.adelante && !reduced); }
  });
  const estaciones = (tema, ids) => Object.fromEntries(ids.map(id => [id, { fases: fases(tema) }]));
  // el dibujo se arma cuando la estación ya está en el documento (mostrar)
  const mostrar = (sec, def) => { if (def.el.dataset.id in ESTAS) { const d = armar(sec); if (d) pintar(sec, d, d.n, false); } };
  const ESTAS = { "mux-1-0": 1, "demux-1-0": 1, "mux-2-2": 1, "demux-2-2": 1, "mux-3-0": 1, "demux-3-0": 1 };
  MUNDOS.definir("tsaritsa", { mostrar, estaciones: estaciones("tsaritsa", ["mux-1-0", "demux-1-0"]) });
  MUNDOS.definir("venom", { mostrar, estaciones: estaciones("venom", ["mux-2-2", "demux-2-2"]) });
  MUNDOS.definir("dio", { mostrar, estaciones: estaciones("dio", ["mux-3-0", "demux-3-0"]) });
})();

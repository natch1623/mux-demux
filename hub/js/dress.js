"use strict";
/* =====================================================================
   Materiales de cada mundo y momentos de revelación
   - cada temática se distingue por formas y materiales, no solo por color:
     Tsaritsa: hielo tallado (facetas, aristas, esquirlas)
     Marceline: escenario musical oscuro (gabinetes con rejilla, focos, tarima)
     Venom: materia orgánica (bordes que se deforman, venas, tentáculos)
     DIO: metal dorado y relojería (remaches, engranajes, esferas de reloj)
   - los bloques ganan volumen (cara lateral extruida) y los cables, funda
   - pulse(): la señal recorre el circuito; al llegar ilumina la salida
     y aparece el resultado (el espectáculo ayuda a explicar)
   ===================================================================== */
const DRESS = (() => {
  const defs = $("#defs");
  const lin = (id, stops, a = { x1: 0, y1: 0, x2: 1, y2: 1 }) => {
    const g = mk("linearGradient", Object.assign({ id }, a), defs);
    stops.forEach(([o, c, op]) => mk("stop", { offset: o, "stop-color": c, "stop-opacity": op ?? 1 }, g));
  };
  const rad = (id, stops, a = {}) => {
    const g = mk("radialGradient", Object.assign({ id, cx: "35%", cy: "30%", r: "80%" }, a), defs);
    stops.forEach(([o, c, op]) => mk("stop", { offset: o, "stop-color": c, "stop-opacity": op ?? 1 }, g));
  };

  /* ---------- materiales ---------- */
  // hielo tallado: translúcido, con un brillo frío en la arista superior
  lin("m-ice", [[0, "#F4FAFF", .62], [.3, "#BFE3FF", .26], [.62, "#3D6FD0", .34], [1, "#9FD4FF", .5]]);
  lin("m-ice-side", [[0, "#1B3A80", .9], [1, "#081530", .95]]);
  // gabinete de amplificador: vinilo oscuro con rejilla
  lin("m-tolex", [[0, "#4A0E18"], [.5, "#24060C"], [1, "#12030A"]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  lin("m-tolex-side", [[0, "#0A0204"], [1, "#000"]]);
  const grille = mk("pattern", { id: "p-grille", width: 13, height: 13, patternUnits: "userSpaceOnUse" }, defs);
  mk("circle", { cx: 6.5, cy: 6.5, r: 2.7, fill: "#000", "fill-opacity": .7 }, grille);
  mk("circle", { cx: 5.6, cy: 5.6, r: 1, fill: "#FF8A98", "fill-opacity": .25 }, grille);
  // materia orgánica: brillo húmedo y núcleo negro
  rad("m-goo", [[0, "#63788E"], [.18, "#29343F"], [.55, "#090D12"], [1, "#000"]]);
  lin("m-goo-side", [[0, "#05020A"], [1, "#000"]]);
  // metal dorado bruñido
  lin("m-gold", [[0, "#FFF0B8"], [.18, "#F2C14E"], [.42, "#8C6416"], [.6, "#E3B341"], [.82, "#6B4A12"], [1, "#C9862B"]]);
  lin("m-gold-side", [[0, "#3A2606"], [1, "#140C02"]]);
  // DIO: sombras de cel y tinta; el volumen se conserva sin metal fotográfico.
  lin("m-manga", [[0, "#F5DE6C"], [.48, "#F5DE6C"], [.481, "#BA923C"], [.74, "#BA923C"], [.741, "#764166"], [1, "#764166"]]);
  const manga = mk("pattern", { id: "p-manga", width: 9, height: 9, patternUnits: "userSpaceOnUse" }, defs);
  mk("path", { d: "M-2 2L2-2M0 9L9 0M7 11L11 7", stroke: "#160c22", "stroke-width": 1.8 }, manga);
  // haz de foco
  lin("m-beam", [[0, "#FFE3E7", .5], [.35, "#FF5A6E", .16], [1, "#FF5A6E", 0]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  lin("m-ray", [[0, "#FFE7A3", .0], [.5, "#FFE7A3", .14], [1, "#FFE7A3", 0]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  lin("m-shard", [[0, "#EAF6FF", .5], [.6, "#9FD4FF", .1], [1, "#3D6FD0", 0]], { x1: 0, y1: 1, x2: 0, y2: 0 });
  lin("m-shard-top", [[0, "#EAF6FF", .45], [.6, "#9FD4FF", .08], [1, "#3D6FD0", 0]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  rad("m-floor", [[0, "#FF5A6E", .35], [.5, "#8C1C2C", .12], [1, "#000", 0]], { cx: "50%", cy: "0%", r: "70%" });
  rad("m-cell", [[0, "#9A6BFF", .28], [.6, "#3B2466", .1], [1, "#000", 0]], { cx: "50%", cy: "50%", r: "50%" });

  /* ---------- geometría ---------- */
  const themeOf = node => (node.closest?.(".st")?.className.match(/\bw-(\w+)/) || [])[1] || "tsaritsa";
  const P = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  // contorno cerrado y suave que pasa por puntos (Catmull-Rom → Bézier)
  function smooth(pts) {
    const n = pts.length;
    let d = `M${P(...pts[0])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${P(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)} ${P(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)} ${P(...p2)}`;
    }
    return d + "Z";
  }
  const blob = (x, y, r, seed = 1, k = .14) => smooth(Array.from({ length: 9 }, (_, i) => {
    const a = i / 9 * Math.PI * 2, q = r * (1 + Math.sin(i * 2.7 + seed * 1.9) * k);
    return [x + Math.cos(a) * q, y + Math.sin(a) * q];
  }));
  const circ = (x, y, r) => `M${P(x - r, y)}A${r} ${r} 0 1 0 ${P(x + r, y)}A${r} ${r} 0 1 0 ${P(x - r, y)}Z`;
  const hexD = (x, y, r) => "M" + hexPts(x, y, r).split(" ").join("L") + "Z";
  function ticksD(x, y, r1, r2, n) {
    let d = "";
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; d += `M${P(x + Math.cos(a) * r1, y + Math.sin(a) * r1)}L${P(x + Math.cos(a) * r2, y + Math.sin(a) * r2)}`; }
    return d;
  }
  function gearD(x, y, r, teeth = 12) {
    const pts = [], ri = r * .8;
    for (let i = 0; i < teeth; i++) {
      const a = i / teeth * Math.PI * 2, w = Math.PI / teeth;
      [[a - w * .55, ri], [a - w * .35, r], [a + w * .35, r], [a + w * .55, ri]].forEach(([b, q]) => pts.push(P(x + Math.cos(b) * q, y + Math.sin(b) * q)));
    }
    return "M" + pts.join("L") + "Z" + circ(x, y, r * .28);
  }

  /* forma del «cristal» (bit) según el mundo */
  function bitShape(theme, x, y, r, seed = 1) {
    if (theme === "marceline") return { body: circ(x, y, r), facet: circ(x, y, r * .62) + circ(x, y, r * .3), halo: circ(x, y, r * 1.35) };
    if (theme === "venom") return { body: blob(x, y, r, seed), facet: blob(x - r * .18, y - r * .2, r * .38, seed + 3, .2), halo: blob(x, y, r * 1.4, seed + 1) };
    if (theme === "dio") return { body: circ(x, y, r), facet: ticksD(x, y, r * .78, r * .94, 12), halo: circ(x, y, r * 1.35) };
    return { body: hexD(x, y, r), facet: hexD(x, y, r * .62), halo: hexD(x, y, r * 1.35) };
  }

  /* ---------- vestir una figura: volumen, material y ornamentos ---------- */
  const DEPTH = { tsaritsa: [10, 14], marceline: [12, 14], venom: [8, 12], dio: [12, 12] };
  function polyPts(el) {
    if (el.points?.numberOfItems) return [...Array(el.points.numberOfItems)].map((_, i) => [el.points.getItem(i).x, el.points.getItem(i).y]);
    return null;
  }
  /* contorno orgánico: cada arista se ondula (precalculado; un filtro de ruido
     haría que el navegador lo recalculara al mover la cámara) */
  function organic(pts, seed) {
    const out = [];
    pts.forEach(([x, y], i) => {
      const [nx, ny] = pts[(i + 1) % pts.length], L = Math.hypot(nx - x, ny - y), k = Math.max(2, Math.round(L / 34));
      const ux = (nx - x) / L, uy = (ny - y) / L;
      for (let j = 0; j < k; j++) {
        const t = j / k, a = j ? Math.sin(j * 2.3 + i * 1.7 + seed) * Math.min(9, L * .05) : 0;
        out.push([x + (nx - x) * t - uy * a, y + (ny - y) * t + ux * a]);
      }
    });
    return smooth(out);
  }
  function dressShape(el, theme) {
    if (el.dataset.dressed) return;
    el.dataset.dressed = 1;
    if (theme === "venom" && el.tagName === "polygon") {
      // la materia orgánica reemplaza al polígono (que queda como referencia invisible)
      const pts0 = polyPts(el), path = mk("path", { class: el.getAttribute("class"), d: organic(pts0, pts0[0][0] % 5), "data-dressed": 1 });
      el.after(path);
      el.setAttribute("class", "blk-src");
      el.removeAttribute("data-dressed");
      el.dataset.dressed = 1;
      return dressOrganic(path, pts0);
    }
    const [dx, dy] = DEPTH[theme];
    // cara lateral: copia desplazada detrás (le da cuerpo al bloque)
    const side = el.cloneNode(false);
    side.removeAttribute("data-dressed");
    side.setAttribute("class", "blk-side");
    side.setAttribute("transform", `translate(${dx} ${dy})`);
    side.removeAttribute("role"); side.removeAttribute("tabindex");
    el.before(side);
    const pts = polyPts(el);
    if (!pts) return;
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const inset = k => pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
    const h = Math.max(...pts.map(p => p[1])) - Math.min(...pts.map(p => p[1]));
    const g = mk("g", { class: "orn", "aria-hidden": "true" });
    el.after(g);
    if (theme === "tsaritsa") {
      // facetas talladas: del punto de luz a cada vértice, y un contorno interior
      const lx = cx - (cx - pts[0][0]) * .35, ly = cy - h * .18;
      mk("path", { class: "o-facet", d: pts.map(([x, y]) => `M${P(lx, ly)}L${P(x, y)}`).join("") }, g);
      mk("polygon", { class: "o-inner", points: inset(.78).map(p => p.join(",")).join(" ") }, g);
      mk("path", { class: "o-glint", d: `M${P(...pts[0])}L${P(...pts[1])}` }, g);
    } else if (theme === "marceline") {
      // rejilla de parlante y esquineros metálicos
      mk("polygon", { class: "o-grille", points: inset(.82).map(p => p.join(",")).join(" "), fill: "url(#p-grille)" }, g);
      pts.forEach(([x, y]) => mk("rect", { class: "o-corner", x: x - 9, y: y - 9, width: 18, height: 18, rx: 3, transform: `rotate(45 ${x} ${y})` }, g));
    } else if (theme === "venom") {
      // compuertas: solo cuerpo (las ondas se notan en los bloques)
      const v = inset(.62);
      mk("path", { class: "o-vein", d: v.map(([x, y], i) => `M${P(cx, cy)}Q${P((cx + x) / 2 + (i % 2 ? 14 : -14), (cy + y) / 2)} ${P(x, y)}`).join("") }, g);
      pts.forEach(([x, y], i) => {
        const ox = (x - cx), oy = (y - cy), L = Math.hypot(ox, oy) || 1, ux = ox / L, uy = oy / L, s = Math.min(70, h * .3);
        mk("path", { class: "o-tendril", d: `M${P(x - ux * 6, y - uy * 6)}C${P(x + ux * s * .5 - uy * 18, y + uy * s * .5 + ux * 18)} ${P(x + ux * s + uy * 14, y + uy * s - ux * 14)} ${P(x + ux * s * 1.1, y + uy * s * 1.1 + (i % 2 ? 10 : -10))}` }, g);
      });
    } else if (theme === "dio") {
      // engranaje detrás, grabado interior y remaches en las esquinas
      const gr = Math.min(h * .42, 160);
      // la posición va en el envoltorio: el engranaje gira sobre su propio centro
      const wrap = mk("g", { class: "o-gearwrap", transform: `translate(${P(cx, cy)})` }, null);
      mk("path", { class: "o-gear", d: gearD(0, 0, gr, 14) }, wrap);
      side.before(wrap);
      mk("polygon", { class: "o-engrave", points: inset(.84).map(p => p.join(",")).join(" ") }, g);
      inset(.9).forEach(([x, y]) => mk("circle", { class: "o-rivet", cx: x, cy: y, r: 5.5 }, g));
    }
  }
  function dressOrganic(el, pts) {
    const side = el.cloneNode(false);
    side.setAttribute("class", "blk-side");
    side.setAttribute("transform", `translate(${DEPTH.venom.join(" ")})`);
    el.before(side);
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const h = Math.max(...pts.map(p => p[1])) - Math.min(...pts.map(p => p[1]));
    const g = mk("g", { class: "orn", "aria-hidden": "true" });
    el.after(g);
    const v = pts.map(([x, y]) => [cx + (x - cx) * .62, cy + (y - cy) * .62]);
    mk("path", { class: "o-vein", d: v.map(([x, y], i) => `M${P(cx, cy)}Q${P((cx + x) / 2 + (i % 2 ? 14 : -14), (cy + y) / 2)} ${P(x, y)}`).join("") }, g);
    pts.forEach(([x, y], i) => {
      const ox = x - cx, oy = y - cy, L = Math.hypot(ox, oy) || 1, ux = ox / L, uy = oy / L, s = Math.min(60, h * .28);
      mk("path", { class: "o-tendril", d: `M${P(x - ux * 6, y - uy * 6)}C${P(x + ux * s * .5 - uy * 18, y + uy * s * .5 + ux * 18)} ${P(x + ux * s + uy * 14, y + uy * s - ux * 14)} ${P(x + ux * s * 1.1, y + uy * s * 1.1 + (i % 2 ? 10 : -10))}` }, g);
    });
  }

  /* funda de los cables: un trazo más ancho y oscuro debajo de cada conductor */
  function sheathe(svg) {
    $$(".w:not([data-dressed])", svg).forEach(w => {
      if (w.closest(".orn")) return;
      w.dataset.dressed = 1;
      const c = w.cloneNode(false);
      c.removeAttribute("data-dressed");
      ["data-w", "data-i", "data-out", "data-wa", "data-wb", "data-wy", "data-wd", "data-wo", "data-s0", "data-s1"].forEach(a => c.removeAttribute(a));
      c.setAttribute("class", "w-case");
      w.before(c);
    });
  }
  /* las rutas internas van por encima del cuerpo del bloque (si no, el material las tapa) */
  function liftRoutes(svg) {
    const r = $$(".route", svg);
    if (!r.length) return;
    let top = $(":scope > g.routes-top", svg);
    if (!top) top = mk("g", { class: "routes-top" }, svg);
    r.forEach(x => { if (x.parentNode !== top) top.append(x); });
    // los textos de los bloques siguen encima de las rutas
    $$(".blk-t, .t-mini", svg).forEach(t => top.after(t));
  }
  let glowId = 0;
  function fitGlow(svg) {
    if (svg.dataset.glow) return;
    const source = $("#glowU"), box = svg.viewBox.baseVal;
    if (!source || !box.width || !box.height) return;
    const localDefs = mk("defs", {}, svg), filter = source.cloneNode(true);
    const id = `figure-glow-${++glowId}`;
    filter.id = id;
    filter.setAttribute("x", box.x - 48);
    filter.setAttribute("y", box.y - 48);
    filter.setAttribute("width", box.width + 96);
    filter.setAttribute("height", box.height + 96);
    localDefs.append(filter);
    svg.dataset.glow = id;
    svg.style.setProperty("--figure-glow", `url(#${id})`);
  }
  function fig(svg) {
    const theme = themeOf(svg);
    svg.classList.add("dressed");
    fitGlow(svg);
    $$(".blk, path.gate", svg).forEach(el => dressShape(el, theme));
    sheathe(svg);
    if (typeof AMBIENCE !== 'undefined') AMBIENCE.figure(svg,theme);
    liftRoutes(svg);
  }

  /* ---------- momentos de revelación ---------- */
  // la señal recorre el circuito: un cometa que avanza por el camino d
  const pulses = new WeakMap();
  function cancelPulse(svg) {
    const old = pulses.get(svg);
    if (old) { old.animation.cancel(); old.group.remove(); pulses.delete(svg); }
  }
  function pulse(svg, d, { ms = 580, hot = true, value = null } = {}) {
    cancelPulse(svg);
    if (reduced || MOTION.skip || !svg.isConnected || !svg.closest('.st')?.classList.contains('cur')) return Promise.resolve();
    const g = mk('g', { class: 'spark' + (hot ? '' : ' cold'), 'aria-hidden': 'true' }, svg);
    const route = mk('path', { d, fill: 'none', stroke: 'none' }, g);
    const marker = mk('g', {}, g);
    const theme = themeOf(svg);
    mk('rect', { class:'sp-token', x:-20, y:-20, width:40, height:40, rx:theme === 'venom' ? 13 : theme === 'tsaritsa' ? 2 : 5 }, marker);
    mk('text', { class:'sp-bit', x:0, y:1 }, marker, value ?? '→');
    const length = route.getTotalLength();
    const frames = Array.from({length:49}, (_,i) => {
      const p = route.getPointAtLength(length*i/48);
      const rotate = theme === 'marceline' ? ` rotate(${Math.sin(i*.8)*5}deg)` : '';
      return {transform:`translate(${p.x}px,${p.y}px)${rotate}`,offset:i/48};
    });
    const animation = marker.animate(frames,{duration:Math.min(ms,700),easing:'linear',fill:'both'});
    pulses.set(svg,{group:g,animation});
    return animation.finished.catch(e=>{if(e.name!=='AbortError')throw e;}).finally(()=>{g.remove();if(pulses.get(svg)?.group===g)pulses.delete(svg);});
  }
  function arrive(el) {
    if (!el || reduced) return;
    el.classList.add('arrived'); clearTimeout(el._arr);
    el._arr=setTimeout(()=>el.classList.remove('arrived'),160);
  }
  function result() { /* The result stays readable while the explanatory marker travels. */ }
  function revealOn(svg, L, getD, getOut, { ms = 580 } = {}) {
    svg.dataset.replay = "true";
    let first = true, token = 0;
    const run = () => {
      const mine = ++token;
      cancelPulse(svg);
      if (!svg.closest('.st')?.classList.contains('cur')) return;
      const d = getD(L); if (!d) return;
      const sec = svg.closest('.st'), out = getOut?.(L);
      const id = sec.dataset.id;
      const value = id === 'mux-0-0' ? '♪' : id === 'mux-3-0' ? '→' : sec.classList.contains('side-demux') ? L.demux(L.sel) : L.mux;
      pulse(svg,d,{ms,hot:L.st.en!==0,value}).then(()=>{if(mine===token)arrive(out);});
    };
    L.on(()=>{if(first){first=false;return;}run();});
    svg.addEventListener('replay-signal',run);
    queueMicrotask(()=>svg.closest('.st')?.addEventListener('leave',()=>{++token;cancelPulse(svg);}));
  }

  /* ---------- fondos de cada mundo ---------- */
  function backdrop(theme, side, k) {
    const s = mk("svg", { class: "bd bd-" + theme, viewBox: "0 0 1920 1080", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true" });
    const flip = side === "demux";
    const X = x => flip ? 1920 - x : x;
    if (theme === "tsaritsa") {
      // esquirlas de hielo talladas que suben del suelo y cuelgan del techo
      const shards = [[40, 260, 120], [150, 420, 90], [250, 300, 70], [1700, 380, 110], [1820, 520, 80], [1590, 240, 60]];
      shards.forEach(([x, h, w], i) => {
        const tx = x + (i % 2 ? 18 : -14);
        mk("path", { class: "sh", d: `M${X(x - w / 2)} 1080L${X(tx)} ${1080 - h}L${X(x + w / 2)} 1080Z`, fill: "url(#m-shard)" }, s);
        mk("path", { class: "sh-e", d: `M${X(tx)} ${1080 - h}L${X(x + w * .1)} 1080` }, s);
      });
      [[300, 160, 60], [520, 90, 40], [1420, 140, 54], [1260, 80, 36]].forEach(([x, h, w]) =>
        mk("path", { class: "sh", d: `M${X(x - w / 2)} 0L${X(x)} ${h}L${X(x + w / 2)} 0Z`, fill: "url(#m-shard-top)" }, s));
      // rosetón tallado
      const r = mk("g", { class: "rose", transform: `translate(${X(1380)} 520)` }, s);
      mk("path", { d: flakePath(0, 0, 430) }, r);
      mk("path", { d: hexD(0, 0, 470) + hexD(0, 0, 330) }, r);
    } else if (theme === "marceline") {
      // tarima con tablas en perspectiva, focos y torres de parlantes
      mk("rect", { x: 0, y: 820, width: 1920, height: 260, fill: "url(#m-floor)" }, s);
      const vp = 960;
      let d = "";
      for (let i = -12; i <= 12; i++) d += `M${vp + i * 40} 820L${vp + i * 260} 1080`;
      for (const y of [850, 890, 945, 1010]) d += `M0 ${y}H1920`;
      mk("path", { class: "planks", d }, s);
      mk("path", { class: "edge", d: "M0 820H1920" }, s);
      [[420, -10], [1000, 4], [1560, 14]].forEach(([x, rot], i) =>
        mk("path", { class: "beam b" + i, d: `M${x - 30} -20L${x + 30} -20L${x + 300} 840L${x - 300} 840Z`, fill: "url(#m-beam)", transform: `rotate(${rot} ${x} 0)` }, s));
      [[30, 140], [1750, 140]].forEach(([x, w]) => {
        const g = mk("g", { class: "stack" }, s);
        [[560, 130], [690, 130]].forEach(([y, h]) => {
          mk("rect", { x, y, width: w, height: h, rx: 8 }, g);
          mk("circle", { class: "cone", cx: x + w / 2, cy: y + h / 2, r: h * .34 }, g);
        });
      });
    } else if (theme === "venom") {
      // materia orgánica que invade desde los bordes, con células y tentáculos
      mk("path", { class: "mass", d: smooth([[-60, 700], [140, 760], [260, 900], [200, 1140], [-80, 1140]]) }, s);
      mk("path", { class: "mass", d: smooth([[1980, -60], [1760, -40], [1660, 140], [1800, 300], [1990, 260]]) }, s);
      [["M-20 880C200 820 260 700 420 690S640 760 720 700", 14], ["M1940 160C1760 200 1700 320 1560 330S1360 280 1290 340", 12],
       ["M140 1100C180 960 300 940 360 860", 9], ["M1700 -20C1680 120 1560 160 1500 240", 8]].forEach(([d, w]) =>
        mk("path", { class: "tendril", d, "stroke-width": w }, s));
      [[1500, 820, 90], [1640, 700, 46], [380, 180, 70], [260, 320, 34], [1240, 960, 40]].forEach(([x, y, r], i) =>
        mk("path", { class: "cell", d: blob(x, y, r, i + 2, .2), fill: "url(#m-cell)" }, s));
    } else if (theme === "dio") {
      // esfera de reloj con números romanos, engranajes y rayos dorados
      [[-12, 300], [8, 600], [24, 900]].forEach(([a, y]) => mk("rect", { class: "ray", x: -200, y: y - 30, width: 2400, height: 60, fill: "url(#m-ray)", transform: `rotate(${a} 960 ${y})` }, s));
      const cx = X(1440), cy = 560, R = 470;
      const face = mk("g", { class: "face" }, s);
      mk("path", { d: circ(cx, cy, R) + circ(cx, cy, R - 26) }, face);
      mk("path", { class: "tk", d: ticksD(cx, cy, R - 60, R - 34, 60) }, face);
      mk("path", { class: "tk b", d: ticksD(cx, cy, R - 80, R - 34, 12) }, face);
      ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"].forEach((t, i) => {
        const a = i / 12 * Math.PI * 2 - Math.PI / 2;
        mk("text", { x: cx + Math.cos(a) * (R - 125), y: cy + Math.sin(a) * (R - 125) + 16 }, face, t);
      });
      const hands = mk("g", { class: "hands", transform: `translate(${cx} ${cy})` }, s);
      mk("path", { class: "hand h1", d: "M-6 30L0 -300L6 30Z" }, hands);
      mk("path", { class: "hand h2", d: "M-9 30L0 -200L9 30Z" }, hands);
      [[X(200), 940, 150, 16, ""], [X(390), 860, 90, 11, " rev"], [X(1780), 120, 120, 14, " rev"]].forEach(([x, y, r, t, c]) => {
        const g = mk("g", { class: "gear" + c, transform: `translate(${x} ${y})` }, s);
        mk("path", { d: gearD(0, 0, r, t) }, g);
      });
    }
    return s;
  }

  /* ---------- montaje de una estación ---------- */
  function station(sec, theme, side, k) {
    // los mundos ya rediseñados (js/mundos/) montan su propia escena y retícula
    if (MUNDOS.activo(theme)) MUNDOS.montar(sec, theme, side, k);
    else REALMS.mount(sec, theme);
    $$("svg.fig", sec).forEach(fig);
  }

  return { fig, pulse, arrive, result, revealOn, bitShape, themeOf, station, blob, gearD, circ, smooth };
})();

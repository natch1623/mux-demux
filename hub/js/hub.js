"use strict";
/* =====================================================================
   HUB central
   - izquierda: cuatro orbes = entradas I0..I3 del MUX (un integrante cada uno);
     la señal sale de cada orbe por el borde izquierdo hacia el MUX (fuera de pantalla),
     en espejo con el DEMUX de la derecha
   - derecha: un único orbe = el DEMUX; por dentro tiene cuatro zonas
     invisibles de 90° (arriba 1, derecha 2, abajo 3, izquierda 4) que hacen
     de líneas de selección S1 S0; de él sale un solo cable hacia fuera
   ===================================================================== */
const HUB = (() => {
  const el = html(`<section class="st hub" data-id="hub" style="left:${-FW / 2}px;top:${-FH / 2}px">
    <svg class="hub-art" viewBox="0 0 1920 1080" aria-hidden="true"></svg>
    <div class="hub-title">
      <svg class="crest" viewBox="-60 -60 120 120" aria-hidden="true"><path d="${starPath(0, 0, 18, 56, .2)}"/><path d="${starPath(0, 0, 40, 12, .25)}"/><circle r="5"/></svg>
      <h1><span>MUX</span><i>/</i><em>DEMUX</em></h1>
      <div class="orn" aria-hidden="true"><i></i><b></b><i></i></div>
      <p>Multiplexores y Demultiplexores</p>
      <dl class="hub-cred">
        <div><dt>Asignatura</dt><dd>Circuitos Lógicos Electrónicos</dd></div>
        <div><dt>Docente</dt><dd>Ing. Mónica M. Magallón Mariscal, M.Sc.</dd></div>
      </dl>
    </div>
    <svg class="hub-ui" viewBox="0 0 1920 1080" role="group" aria-label="Entradas del MUX y botón del DEMUX"></svg>
    <div class="hub-bits" aria-hidden="true"><span>S₁</span><i id="lamp1"></i><span>S₀</span><i id="lamp0"></i></div>
    <p class="hub-team"><b>Equipo 3</b> · Ana · Ameth · Jonathan · Carlos</p>
  </section>`);
  const art = $(".hub-art", el), ui = $(".hub-ui", el);
  const defs = $("#defs");
  const grad = (id, stops, attrs = {}, tag = "radialGradient") => {
    const g = mk(tag, Object.assign(tag === "radialGradient" ? { id, cx: "38%", cy: "32%", r: "78%" } : { id }, attrs), defs);
    stops.forEach(([o, c, a]) => mk("stop", { offset: o, "stop-color": c, "stop-opacity": a ?? 1 }, g));
  };

  /* ---------- geometría ---------- */
  const IN_X = 200, IN_Y = [210, 430, 650, 870], IN_R = 70;
  const DX = 1630, DY = 540, DR = 150, DEMUX_SCALE = .8;

  /* ---------- fondo: palacio helado hecho de rutas de señal ---------- */
  grad("h-horizon", [[0, "#9FD4FF", .28], [.5, "#3D6FD0", .08], [1, "#3D6FD0", 0]], { cx: "50%", cy: "50%", r: "50%" });
  grad("h-spire", [[0, "#1B3A80", .75], [1, "#0A1530", 0]], { x1: 0, y1: 0, x2: 0, y2: 1 }, "linearGradient");
  {
    mk("ellipse", { cx: 960, cy: 1010, rx: 900, ry: 120, fill: "url(#h-horizon)" }, art);
    // silueta del palacio (muy tenue, solo da profundidad)
    const pal = mk("g", { class: "palace" }, art);
    [[960, 300, 46], [900, 220, 30], [1020, 220, 30], [840, 160, 24], [1080, 160, 24], [780, 120, 20], [1140, 120, 20],
     [620, 150, 34], [1300, 150, 34], [560, 96, 22], [1360, 96, 22]].forEach(([x, h, w]) =>
      mk("path", { d: `M${x - w / 2} 1080V${1080 - h * .55}L${x} ${1080 - h}L${x + w / 2} ${1080 - h * .55}V1080Z`, fill: "url(#h-spire)" }, pal));
    const g = mk("g", { class: "arch" }, art);
    [[960, 1080, 820, 980], [960, 1080, 660, 860]].forEach(([cx, base, half, top]) =>
      mk("path", { d: `M${cx - half} ${base}V${base - top * .55}Q${cx - half} ${base - top} ${cx} ${base - top - 60}Q${cx + half} ${base - top} ${cx + half} ${base - top * .55}V${base}` }, g));
    const r = mk("g", { class: "rings" }, art);
    [430, 380, 300].forEach((rad, i) => mk("circle", { cx: 960, cy: 520, r: rad, "stroke-dasharray": i === 1 ? "3 10" : null }, r));
    mk("polygon", { points: hexPts(960, 520, 380, 0) }, r);
    mk("path", { class: "flake", d: flakePath(960, 520, 300) }, r);
  }

  /* ---------- núcleo: un chip con el título impreso; las señales convergen en sus patas ---------- */
  grad("h-core", [[0, "#CFE6FF", .32], [.45, "#5E9BEA", .1], [1, "#3D6FD0", 0]], { cx: "50%", cy: "50%", r: "50%" });
  grad("h-chip", [[0, "#13254F", .92], [.5, "#0A1530", .95], [1, "#060D22", .97]], { x1: 0, y1: 0, x2: 1, y2: 1 }, "linearGradient");
  grad("h-pin", [[0, "#F4E6C2"], [.5, "#B59A5E"], [1, "#F4E6C2"]], { x1: 0, y1: 0, x2: 0, y2: 1 }, "linearGradient");
  const CH = { x0: 440, x1: 1420, y0: 262, y1: 780 }, CX = (CH.x0 + CH.x1) / 2, CY = (CH.y0 + CH.y1) / 2;
  {
    const core = mk("g", { class: "core" }, art);
    mk("ellipse", { class: "core-glow", cx: CX, cy: CY, rx: 760, ry: 470, fill: "url(#h-core)" }, core);
    // pistas que llegan al chip desde todos lados: las cuatro entradas, el DEMUX y los bordes
    const conv = mk("g", { class: "conv" }, core);
    const leftPins = [400, 476, 566, 642], tops = [600, 720, 840, 1020, 1140, 1260];
    const paths = [];
    IN_Y.forEach((y, i) => paths.push([`M${IN_X + IN_R + 30} ${y}C${IN_X + 200} ${y} ${CH.x0 - 120} ${leftPins[i]} ${CH.x0 - 26} ${leftPins[i]}`, MEMBERS[i].c]));
    paths.push([`M${DX - (DR + 34) * DEMUX_SCALE} ${DY}C${DX - (DR + 60) * DEMUX_SCALE} ${DY} ${CH.x1 + 70} ${CY} ${CH.x1 + 26} ${CY}`, "#CFE6FF"]);
    tops.forEach((x, k) => {
      const lane = 18 + (k % 3) * 22;
      paths.push([`M${x + (k < 3 ? -160 : 160)} 0V${lane + 40}Q${x + (k < 3 ? -160 : 160)} ${lane + 80} ${x} ${lane + 110}V${CH.y0 - 26}`, "#9FD4FF"]);
      paths.push([`M${x + (k < 3 ? -120 : 120)} 1080V${1080 - lane - 40}Q${x + (k < 3 ? -120 : 120)} ${1080 - lane - 80} ${x} ${1080 - lane - 110}V${CH.y1 + 26}`, "#9FD4FF"]);
    });
    paths.forEach(([d, c], k) => {
      mk("path", { class: "cv-line", d }, conv);
      mk("path", { class: "cv-pulse", d, pathLength: 1, style: `--c:${c};--d:${(k * .73) % 5.2}s` }, conv);
    });
    // patas del chip
    const pins = mk("g", { class: "chip-pins" }, core);
    leftPins.forEach(y => mk("rect", { x: CH.x0 - 28, y: y - 9, width: 30, height: 18, rx: 3, fill: "url(#h-pin)" }, pins));
    mk("rect", { x: CH.x1 - 2, y: CY - 9, width: 30, height: 18, rx: 3, fill: "url(#h-pin)" }, pins);
    tops.forEach(x => {
      mk("rect", { x: x - 9, y: CH.y0 - 28, width: 18, height: 30, rx: 3, fill: "url(#h-pin)" }, pins);
      mk("rect", { x: x - 9, y: CH.y1 - 2, width: 18, height: 30, rx: 3, fill: "url(#h-pin)" }, pins);
    });
    // encapsulado: cara lateral, cuerpo, bisel y muesca de la pata 1
    mk("rect", { class: "chip-side", x: CH.x0 + 10, y: CH.y0 + 14, width: CH.x1 - CH.x0, height: CH.y1 - CH.y0, rx: 26 }, core);
    mk("rect", { class: "chip-body", x: CH.x0, y: CH.y0, width: CH.x1 - CH.x0, height: CH.y1 - CH.y0, rx: 26, fill: "url(#h-chip)" }, core);
    mk("rect", { class: "chip-bevel", x: CH.x0 + 16, y: CH.y0 + 16, width: CH.x1 - CH.x0 - 32, height: CH.y1 - CH.y0 - 32, rx: 16 }, core);
    mk("circle", { class: "chip-notch", cx: CH.x0 + 46, cy: CH.y0 + 46, r: 11 }, core);
    // grabado en el chip: el circuito completo en miniatura (lo que revela el alejamiento final)
    const die = mk("g", { class: "die", transform: `translate(${CX} ${CH.y1 - 66}) scale(.021)` }, core);
    const rows = ROW_Y;
    mk("rect", { x: MUX_STAGE[0] - 3 * 2240 - FW / 2, y: -FH / 2, width: 3 * 2240 + FW, height: FH, rx: 120 }, die);
    mk("path", { d: `M${MB.x0} ${-MB.inH}L${MB.x1} ${-MB.outH}V${MB.outH}L${MB.x0} ${MB.inH}Z M${DB.x0} ${-DB.inH}L${DB.x1} ${-DB.outH}V${DB.outH}L${DB.x0} ${DB.inH}Z` }, die);
    mk("path", { d: MB_IN.map(y => `M${-FW / 2} 0C-1900 0 -2300 ${y} ${MB.x0} ${y}`).join("") + `M${MB.x1} 0H${MUX_STAGE[0] + FW / 2}M${FW / 2} 0H${DB.x0}` +
      rows.map((y, i) => `M${DB.x1} ${DB_OUT[i]}C4400 ${DB_OUT[i]} 4300 ${y} ${6144 - FW / 2} ${y}`).join("") }, die);
    rows.forEach(y => mk("rect", { x: 6144 - FW / 2, y: y - FH / 2, width: 3 * 2240 + FW, height: FH, rx: 120 }, die));
    mk("rect", { class: "die-hub", x: -FW / 2, y: -FH / 2, width: FW, height: FH, rx: 120 }, die);
  }

  /* ---------- degradados de los orbes ---------- */
  // Marceline: cielo nocturno gris azulado (su tono de piel) que cae a negro, con un borde rojo
  grad("o-marceline", [[0, "#5C6488"], [.42, "#2A2442"], [.78, "#130A1A"], [1, "#050207"]]);
  grad("mc-axe", [[0, "#FF6A7C"], [.45, "#D21F3C"], [1, "#6E0A1C"]], { x1: 0, y1: 0, x2: 1, y2: 1 }, "linearGradient");
  grad("mc-moon", [[0, "#F4F6FB"], [.7, "#C9D1E2"], [1, "#8E9AB6"]], { cx: "40%", cy: "35%", r: "70%" });
  { // recorte al círculo del orbe (el cabello y el bajo no se salen)
    const cp = mk("clipPath", { id: "clip-orb" }, defs);
    mk("circle", { r: 70 }, cp);
  }
  grad("o-tsaritsa", [[0, "#FFFFFF"], [.35, "#BFE3FF"], [.72, "#3D6FD0"], [1, "#0B1A44"]]);
  grad("o-venom", [[0, "#6B4AB0"], [.35, "#2A1A4D"], [.75, "#0B0716"], [1, "#000"]]);
  grad("o-dio", [[0, "#3A2A10"], [.6, "#140E04"], [1, "#000"]]);
  grad("o-shine", [[0, "#fff", .7], [.22, "#fff", .12], [.7, "#fff", 0], [1, "#000", .35]], { cx: "34%", cy: "26%", r: "72%" });
  grad("o-demux", [[0, "#F4FAFF"], [.22, "#9FD4FF"], [.5, "#3D4FB0"], [.78, "#24123E"], [1, "#07040E"]], { cx: "50%", cy: "50%", r: "50%" });
  grad("o-smoke", [[0, "#6B3FBF", .55], [1, "#2A1A4D", 0]], { cx: "50%", cy: "50%", r: "50%" });
  grad("o-demux-glow", [[0, "#9FD4FF", .5], [.5, "#9A6BFF", .25], [1, "#E0344A", 0]], { cx: "50%", cy: "50%", r: "50%" });
  grad("o-bezel", [[0, "#FFFFFF"], [.3, "#8E9FC4"], [.55, "#F2F5FF"], [.8, "#6F7FA6"], [1, "#DCE6FA"]], { x1: 0, y1: 0, x2: 1, y2: 1 }, "linearGradient");
  grad("mux-facet", [[0, "#EAF4FF", .34], [.5, "#8FC4FF", .1], [1, "#3D6FD0", .28]], { x1: 0, y1: 0, x2: 1, y2: 1 }, "linearGradient");

  const emblem = {
    // Ilustraciones individuales generadas a partir de las propuestas elegidas.
    marceline(g) {
      mk("image", { class:"o-illustration", href:"assets/botones/marceline-05.png",
        x:-82, y:-82, width:164, height:164, preserveAspectRatio:"xMidYMid meet" }, g);
    },
    tsaritsa(g) {
      mk("image", { class:"o-illustration", href:"assets/botones/tsaritsa-04.png",
        x:-82, y:-82, width:164, height:164, preserveAspectRatio:"xMidYMid meet" }, g);
    },
    venom(g) {
      mk("image", { class:"o-illustration", href:"assets/botones/venom-emblem-v2.svg",
        x:-82, y:-82, width:164, height:164, preserveAspectRatio:"xMidYMid meet" }, g);
    },
    dio(g) {
      mk("image", { class:"o-illustration", href:"assets/botones/dio-09.png",
        x:-82, y:-82, width:164, height:164, preserveAspectRatio:"xMidYMid meet" }, g);
    }
  };
  const ticks = (r1, r2, n, major) => {
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = i * 2 * Math.PI / n, rr = i % major ? r1 : r1 - (r2 - r1);
      d += `M${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}L${(Math.cos(a) * r2).toFixed(1)} ${(Math.sin(a) * r2).toFixed(1)}`;
    }
    return d;
  };


  /* ---------- conductos: la señal SALE de cada entrada hacia el MUX (borde izquierdo)
     y sale del botón DEMUX hacia su bloque (borde derecho) ---------- */
  const gWires = mk("g", {}, ui);
  const idleKF = [{ strokeDashoffset: .2 }, { strokeDashoffset: -1, offset: .35 }, { strokeDashoffset: -1 }];
  const inWires = IN_Y.map((y, i) => {
    const d = `M${IN_X - IN_R - 8} ${y}H0`;
    mk("path", { class: "duct", d }, gWires);
    const core = mk("path", { class: "hub-in", style: `--c:${MEMBERS[i].c}`, d }, gWires);
    const idle = mk("path", { class: "idle", style: `--c:${MEMBERS[i].c}`, d, pathLength: 1 }, gWires);
    if (!reduced) idle.animate(idleKF, { duration: 4200, delay: 900 + i * 650, iterations: Infinity, easing: "cubic-bezier(.45,0,.3,1)" });
    return core;
  });
  const outD = `M${DX + (DR + 10) * DEMUX_SCALE} ${DY}H1920`;
  mk("path", { class: "duct", d: outD }, gWires);
  const outCore = mk("path", { class: "hub-out", d: outD }, gWires);
  const outIdle = mk("path", { class: "idle", style: "--c:#CFE6FF", d: outD, pathLength: 1 }, gWires);
  if (!reduced) outIdle.animate(idleKF, { duration: 4200, delay: 3600, iterations: Infinity, easing: "cubic-bezier(.45,0,.3,1)" });

  /* ---------- orbes de entrada ---------- */
  const orbs = MEMBERS.map((m, i) => {
    const g = mk("g", { class: `orb in t-${m.theme}`, transform: `translate(${IN_X} ${IN_Y[i]})`, "aria-label": `Entrada I${SUB[i]} del MUX: ${m.name}`, style: `--c:${m.c}` }, ui);
    mk("circle", { class: "o-glow", r: IN_R * 1.9, fill: m.c }, g);
    const sc = mk("g", { class: "o-scale" }, g);
    mk("path", { class: "o-ticks", d: ticks(IN_R + 18, IN_R + 26, 36, 6) }, sc);
    mk("circle", { class: "o-body", r: IN_R, fill: `url(#o-${m.theme})` }, sc);
    emblem[m.theme](mk("g", { class: "o-em" }, sc));
    mk("circle", { class: "o-shine", r: IN_R, fill: "url(#o-shine)" }, sc);
    mk("circle", { class: "o-bezel", r: IN_R + 6 }, sc);
    mk("circle", { class: "o-seal", r: IN_R + 34 }, sc);
    mk("text", { class: "o-tag", x: IN_R + 44, y: 8, "text-anchor": "start" }, g, `I${SUB[i]}`);
    mk("circle", { class: "o-hit", r: IN_R + 24 }, g);
    return g;
  });

  /* ---------- orbe DEMUX: una sola pieza, cuatro zonas invisibles ---------- */
  const dm = mk("g", { class: "orb demux", transform: `translate(${DX} ${DY}) scale(${DEMUX_SCALE})`, "aria-label": "Botón del DEMUX" }, ui);
  mk("circle", { class: "o-glow", r: DR * 1.7, fill: "url(#o-demux-glow)" }, dm);
  const dsc = mk("g", { class: "o-scale" }, dm);
  mk("path", { class: "o-ticks d", d: ticks(DR + 20, DR + 30, 72, 6) }, dsc);
  mk("circle", { class: "o-body", r: DR, fill: "url(#o-demux)" }, dsc);
  // Una sola ilustración; halos, foco y sectores siguen siendo SVG interactivo.
  mk("image", { class: "o-illustration demux-illustration", href: "assets/botones/demux-portal-v2.webp",
    x: -(DR + 8), y: -(DR + 8), width: (DR + 8) * 2, height: (DR + 8) * 2,
    preserveAspectRatio: "xMidYMid meet" }, dsc);
  mk("circle", { class: "o-bezel", r: DR + 8 }, dsc);
  // revelación de las conclusiones: los cuatro sectores con su código S1 S0
  const reveal = mk("g", { class: "zones", "aria-hidden": "true" }, dm);
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([x, y], i) => {
    const a = Math.atan2(y, x), a0 = a - Math.PI / 4, a1 = a + Math.PI / 4, r = DR + 4;
    mk("path", { class: "zone", d: `M0 0L${Math.cos(a0) * r} ${Math.sin(a0) * r}A${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r}Z`, style: `--c:${MEMBERS[i].c}` }, reveal);
    mk("text", { class: "zone-t", x: x * 84, y: y * 84 + 12 }, reveal, i.toString(2).padStart(2, "0"));
  });
  const hitD = mk("circle", { class: "o-hit", r: DR + 22 }, dm);
  const ripples = mk("g", {}, ui);

  /* ---------- toques ---------- */
  let onPick = () => {};
  const LONG = 900;   // solo en modo de ensayo: mantener presionado abre una sección sellada
  function press(target, getChoice) {
    let timer = 0, fired = false;
    target.addEventListener("pointerdown", e => {
      if (e.button > 0) return;
      e.preventDefault();
      const choice = getChoice(e);
      ripple(e);
      if (choice == null) return;
      fired = false;
      clearTimeout(timer);
      if (REHEARSAL) timer = setTimeout(() => { fired = true; onPick({ ...choice, force: true, x: e.clientX, y: e.clientY }); }, LONG);
      target._pending = { choice, x: e.clientX, y: e.clientY };
    });
    const up = () => {
      clearTimeout(timer);
      const p = target._pending; target._pending = null;
      if (p && !fired) onPick({ ...p.choice, force: false, x: p.x, y: p.y });
    };
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", () => { clearTimeout(timer); target._pending = null; });
    target.addEventListener("pointerleave", () => { clearTimeout(timer); target._pending = null; });
  }
  function ripple(e) {
    if (reduced) return;
    const p = ui.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(ui.getScreenCTM().inverse());
    const c = mk("circle", { class: "ripple", cx: q.x, cy: q.y, r: 10 }, ripples);
    c.animate([{ r: 10, opacity: .9 }, { r: 120, opacity: 0 }], { duration: 700, easing: "cubic-bezier(.23,1,.32,1)" }).onfinish = () => c.remove();
  }
  orbs.forEach((g, i) => {
    press(g, () => ({ side: "mux", m: i }));
    g.setAttribute("tabindex", "0"); g.setAttribute("role", "button");
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick({ side: "mux", m: i, force: REHEARSAL && e.shiftKey }); } });
  });

  /* zona del DEMUX a partir de un punto de la pantalla.
     Usa el rectángulo real del botón (ya escalado por la cámara).
     Devuelve 0..3 (integrante) o null si el toque es ambiguo:
     - zona muerta central (radio < 18 % del botón)
     - franja de ±5° en los límites diagonales entre sectores
     - fuera del círculo táctil */
  function demuxZone(clientX, clientY) {
    const r = hitD.getBoundingClientRect(), R = r.width / 2;
    const dx = clientX - (r.left + R), dy = clientY - (r.top + R), d = Math.hypot(dx, dy);
    if (d < R * .18 || d > R) return null;
    const ang = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;          // 0° derecha, 90° abajo
    const toEdge = Math.abs(((ang - 45) % 90 + 90) % 90 - 45);             // distancia angular a la diagonal más cercana
    if (45 - toEdge < 5) return null;
    return [1, 2, 3, 0][Math.floor(((ang + 45) % 360) / 90)];              // der→Ameth, abajo→Jonathan, izq→Carlos, arriba→Ana
  }
  press(dm, e => {
    const zone = demuxZone(e.clientX, e.clientY);
    return zone == null ? null : { side: "demux", m: zone };
  });
  dm.setAttribute("tabindex", "0"); dm.setAttribute("role", "button");
  dm.setAttribute("aria-label", "Botón del DEMUX. Elige el destino con las flechas: arriba, derecha, abajo o izquierda.");
  // teclado: cada flecha equivale a tocar su zona (sin mostrar los sectores)
  dm.addEventListener("keydown", e => {
    const zone = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key];
    if (zone != null) { e.preventDefault(); e.stopPropagation(); onPick({ side: "demux", m: zone, force: REHEARSAL && e.shiftKey }); }
  });

  const lamps = bits => {
    $("#lamp1", el).classList.toggle("on", bits?.[0] === "1");
    $("#lamp0", el).classList.toggle("on", bits?.[1] === "1");
    el.classList.toggle("has-bits", !!bits);
  };

  function resetMux() { lamps(null); }
  // al elegir: las lámparas S1 S0 muestran la combinación (el pulso lo dibuja el mapa)
  function arm(side, m) {
    lamps(m.toString(2).padStart(2, "0"));
    el.style.setProperty("--route", MEMBERS[m].c);
    if (side === "demux") dm.classList.add("fire");
  }

  /* ---------- estado visual ---------- */
  function paint({ active, side, done, sealed }) {
    orbs.forEach((g, i) => {
      g.classList.toggle("lit", side === "mux" && active === i);
      g.classList.toggle("off", active != null && !(side === "mux" && active === i));
      g.classList.toggle("done", done.mux.has(i));
      g.classList.toggle("sealed", sealed.mux && i === 3);
    });
    dm.classList.toggle("lit", side === "demux" && active != null);
    dm.classList.toggle("off", side === "mux" && active != null);
    if (active == null) { dm.classList.remove("fire"); lamps(null); }
    inWires.forEach((w, i) => w.classList.toggle("on", side === "mux" && active === i));
    outCore.classList.toggle("on", side === "demux" && active != null);
    el.classList.toggle("busy", active != null);
  }
  function reject(side, m) {
    const g = $(".o-scale", side === "mux" ? orbs[m] : dm);
    g.animate([{ translate: "0 0" }, { translate: "-8px 0" }, { translate: "7px 0" }, { translate: "-4px 0" }, { translate: "0 0" }], { duration: 360, easing: "ease-out" });
  }

  /* versión grande de un orbe, para el emblema de cada mundo */
  function orbSVG(theme) {
    const s = mk("svg", { class: "big-orb", "data-art": theme, viewBox: "-130 -130 260 260", "aria-hidden": "true" });
    mk("circle", { class: "bo-glow", r: 120, fill: MEMBERS.find(m => m.theme === theme).c }, s);
    mk("path", { class: "bo-ticks", d: ticks(IN_R + 18, IN_R + 30, 48, 6) }, s);
    mk("circle", { r: IN_R, fill: `url(#o-${theme})` }, s);
    emblem[theme](mk("g", {}, s));
    mk("circle", { r: IN_R, fill: "url(#o-shine)" }, s);
    mk("circle", { class: "o-bezel", r: IN_R + 6 }, s);
    mk("circle", { class: "bo-ring", r: IN_R + 44 }, s);
    return s;
  }

  return {
    el, paint, reject, arm, resetMux, orbSVG, demuxZone,
    focusOrb(side, m) { (side === "mux" ? orbs[m] : dm)?.focus({ preventScroll: true }); },
    set onPick(f) { onPick = f; },
    showZones(v) { reveal.classList.toggle("on", v); reveal.setAttribute("aria-hidden", v ? "false" : "true"); },
    inWorld: IN_Y.map(y => [IN_X - FW / 2, y - FH / 2]),
    inR: IN_R,
    demuxWorld: [DX - FW / 2, DY - FH / 2],
    demuxR: DR * DEMUX_SCALE
  };
})();

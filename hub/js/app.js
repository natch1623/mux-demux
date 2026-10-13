"use strict";
/* =====================================================================
   Cámara, estado y navegación de la presentación

   ESTADOS (S.mode)
   - "hub"    portada: 4 entradas del MUX a la izquierda, botón DEMUX a la derecha
   - "route"  recorrido de un integrante en un lado: S.side ("mux"|"demux"), S.m (0..3), S.k (estación)
   - "concl"  conclusiones: S.concl = 0 mapa · 1 zonas del DEMUX · 2 síntesis
   - "ending" mural final: S.e = panel actual

   PROGRESO (S.done.mux / S.done.demux = integrantes con su ruta TERMINADA)
   - una ruta se termina solo al avanzar desde su última estación;
     volver antes al HUB no cuenta
   - las cuatro rutas (incluida DIO) están abiertas desde el inicio, para poder estudiar en cualquier orden
   - el botón secreto está al final de la ruta de DIO y se activa solo si el
     otro lado ya está completo (es decir, en el segundo DIO, empiece por donde empiece)

   MODO DE ENSAYO (?ensayo): atajos para practicar (Shift abre secciones selladas,
   C conclusiones, E ending, ?at=lado-integrante-estación) con un progreso guardado aparte.
   ===================================================================== */
const WORLD = $("#world");
WORLD.append(HUB.el);
const STATIONS = buildStations(WORLD);
const MURAL = buildMural(WORLD);

/* ---------------- capa de cables y mapa (coordenadas del mundo) ---------------- */
const MAP = (() => {
  const X0 = -15200, Y0 = -3600, MW = 30400, MH = 8200;
  const svg = mk("svg", { class: "map", viewBox: `${X0} ${Y0} ${MW} ${MH}`, style: `left:${X0}px;top:${Y0}px;width:${MW}px;height:${MH}px`, "aria-hidden": "true" });
  WORLD.prepend(svg);
  const gD = mk("g", { class: "districts" }, svg),
    gW = mk("g", {}, svg), gM = mk("g", { class: "dblock mblock" }, svg), gB = mk("g", { class: "dblock" }, svg),
    gR = mk("g", { class: "reveal" }, svg);
  const maxK = Math.max(...ROUTES.mux.map(r => r.length), ...ROUTES.demux.map(r => r.length)) - 1;

  /* ---- bloque en forma de trapecio con llaves S1 S0, ruta interna y pines ---- */
  function block(g, { xIn, xOut, inH, outH, ins, outs, name, ratio, keyX }) {
    // xIn: lado de las entradas, xOut: lado de las salidas
    const pts = `${xIn},${-inH} ${xOut},${-outH} ${xOut},${outH} ${xIn},${inH}`;
    mk("polygon", { class: "b-glow", points: pts }, g);
    // cara lateral: el bloque tiene cuerpo
    mk("polygon", { class: "b-side", points: pts, transform: "translate(46 58)" }, g);
    mk("polygon", { class: "b-body", points: pts }, g);
    mk("path", { class: "b-glint", d: `M${xIn} ${-inH}L${xOut} ${-outH}` }, g);
    mk("path", { class: "b-fct", d: `M${xIn} 0H${xOut}M${xIn} ${-inH * .5}L${xOut} ${-outH * .5}M${xIn} ${inH * .5}L${xOut} ${outH * .5}` }, g);
    const topY = x => -inH + (x - xIn) / (xOut - xIn) * (inH - outH);
    const keys = keyX.map((x, j) => {
      const kg = mk("g", { class: "b-sel" }, g);
      mk("path", { class: "b-sline", d: `M${x} -432V${topY(x)}` }, kg);
      mk("rect", { class: "b-key", x: x - 95, y: -522, width: 190, height: 90, rx: 45 }, kg);
      const n = j ? "S₀" : "S₁";
      return { g: kg, t: mk("text", { class: "b-keyt", x, y: -459 }, kg, `${n} ·`), n };
    });
    const pairs = [];
    ins.forEach(yi => outs.forEach(yo => pairs.push([yi, yo])));
    const routes = pairs.map(([yi, yo]) => mk("path", { class: "b-route", d: `M${xIn} ${yi}L${xOut} ${yo}` }, g));
    ins.forEach((y, i) => {
      mk("circle", { class: "b-pin", cx: xIn, cy: y, r: 15 }, g);
      if (ins.length > 1) mk("text", { class: "b-pint", x: xIn + (xOut > xIn ? 30 : -30), y: y + 14, "text-anchor": xOut > xIn ? "start" : "end" }, g, `I${SUB[i]}`);
    });
    outs.forEach((y, i) => {
      mk("circle", { class: "b-pin", cx: xOut, cy: y, r: 15 }, g);
      if (outs.length > 1) mk("text", { class: "b-pint", x: xOut + (xOut > xIn ? -30 : 30), y: y + 14, "text-anchor": xOut > xIn ? "end" : "start" }, g, `Y${SUB[i]}`);
    });
    const lbl = mk("text", { class: "b-label", x: (xIn + xOut) / 2, y: Math.max(inH, outH) + 110 }, g, name + " ");
    mk("tspan", { class: "b-sub" }, lbl, ratio);
    return {
      routes,
      set(i) {
        const bits = i.toString(2).padStart(2, "0");
        keys.forEach((k, j) => { k.t.textContent = `${k.n} ${bits[j]}`; k.g.classList.toggle("one", bits[j] === "1"); });
        g.classList.add("armed");
      },
      reset() { g.classList.remove("armed"); routes.forEach(r => r.classList.remove("on")); keys.forEach(k => { k.t.textContent = `${k.n} ·`; k.g.classList.remove("one"); }); }
    };
  }
  const wire = (d, color) => { mk("path", { class: "duct", d }, gW); return mk("path", { class: "wire", style: `--c:${color}`, d }, gW); };

  /* ---- MUX (izquierda): cuatro cables salen de los orbes, entran al MUX; una salida al escenario ---- */
  const muxInD = i => { const by = HUB.inWorld[i][1]; return `M${-FW / 2} ${by}C-1900 ${by} -2300 ${MB_IN[i]} ${MB.x0} ${MB_IN[i]}`; };
  const muxIns = MEMBERS.map((m, i) => wire(muxInD(i), m.c));
  const stageRight = MUX_STAGE[0] + FW / 2;
  const muxOutD = `M${MB.x1} 0H${stageRight}`;
  const muxOut = wire(muxOutD, "#CFE6FF");
  const mux = block(gM, { xIn: MB.x0, xOut: MB.x1, inH: MB.inH, outH: MB.outH, ins: MB_IN, outs: [0], name: "MUX", ratio: "4 : 1", keyX: [-3580, -3300] });

  /* ---- DEMUX (derecha): un cable entra, cuatro ramas a cuatro destinos ---- */
  const cableD = `M${FW / 2} 0H${DB.x0}`;
  const cable = wire(cableD, "#CFE6FF");
  const branchD = i => `M${DB.x1} ${DB_OUT[i]}C4400 ${DB_OUT[i]} 4300 ${ROW_Y[i]} ${stationPos("demux", i, 0)[0] - FW / 2} ${ROW_Y[i]}`;
  const branches = MEMBERS.map((m, i) => wire(branchD(i), m.c));
  const demux = block(gB, { xIn: DB.x0, xOut: DB.x1, inH: DB.inH, outH: DB.outH, ins: [0], outs: DB_OUT, name: "DEMUX", ratio: "1 : 4", keyX: [3300, 3580] });

  /* ---- revelación de las conclusiones ---- */
  const big = (x, y, size, txt, cls = "", anchor) => mk("text", { class: "map-t " + cls, x, y, "font-size": size, "text-anchor": anchor }, gR, txt);
  const stageLeft = stationPos("mux", 0, maxK)[0] - FW / 2;
  /* cada mundo se enciende como un distrito del mismo circuito, uno tras otro:
     a la derecha, una fila por destino del DEMUX; a la izquierda, el escenario único
     del MUX con las cuatro franjas de sus entradas */
  MEMBERS.forEach((m, i) => {
    const last = ROUTES.demux[i].length - 1, x0 = stationPos("demux", i, 0)[0] - FW / 2 - 160, x1 = stationPos("demux", i, last)[0] + FW / 2 + 160;
    const d = mk("g", { class: `district t-${m.theme}`, style: `--c:${m.c};--i:${i}` }, gD);
    mk("rect", { class: "d-body", x: x0, y: ROW_Y[i] - FH / 2 - 50, width: x1 - x0, height: FH + 100, rx: 90 }, d);
    mk("rect", { class: "d-band", x: stageLeft - 200, y: -FH / 2 - 200 + i * (FH + 400) / 4, width: stageRight - stageLeft + 400, height: (FH + 400) / 4, rx: i === 0 || i === 3 ? 120 : 0 }, d);
  });
  big(0, -3900, 1040, "Cuatro mundos, un solo circuito", "it final");
  mk("rect", { class: "stage", x: stageLeft - 60, y: -FH / 2 - 60, width: stageRight - stageLeft + 120, height: FH + 120, rx: 40 }, gR);
  // el canal: si la salida del MUX alimenta la entrada del DEMUX
  mk("path", { class: "canal", d: `M${MB.x1 - 260} 0V1560H${DB.x0 - 260}V0` }, gR);
  big(0, 1500, 380, "canal", "it");
  big(0, -760, 420, "MUX → canal → DEMUX", "hero");
  big((stageLeft + stageRight) / 2, -FH / 2 - 160, 260, "Salida del MUX: un solo escenario", "it");
  big((stageLeft + stageRight) / 2, FH / 2 + 520, 480, "MUX · muchos → uno", "it");
  big(MB.x0 + 120, -700, 200, "I₀ – I₃", "blk", "start");
  MEMBERS.forEach((m, i) => big(stationPos("demux", i, 0)[0] - FW / 2 - 240, ROW_Y[i] + 80, 420, `Y${SUB[i]} · ${m.name}`, "district-name", "end").style.setProperty("--c", m.c));
  big(9600, -2860, 480, "DEMUX · uno → muchos", "it");

  /* ---- pulso de la señal (capa propia por encima del HUB: la señal nace en el orbe) ---- */
  const top = mk("svg", { class: "map trace", viewBox: `${X0} ${Y0} ${MW} ${MH}`, style: `left:${X0}px;top:${Y0}px;width:${MW}px;height:${MH}px`, "aria-hidden": "true" });
  WORLD.append(top);
  const pG = mk("path", { class: "wpulse-glow", pathLength: 1 }, top), pC = mk("path", { class: "wpulse", pathLength: 1 }, top);
  /* recorrido completo de la señal: orbe → cable → bloque → cable → centro del destino.
     La cámara lo sigue sin alejarse. k: alarga el camino hasta la estación k
     (para volver al HUB desde cualquier estación). */
  function trace(side, i, { k = 0 } = {}) {
    const [ex] = stationPos(side, i, 0), c = MEMBERS[i].c;
    const segs = side === "mux"
      ? [`M${HUB.inWorld[i][0]} ${HUB.inWorld[i][1]}H${-FW / 2}`, muxInD(i), `M${MB.x0} ${MB_IN[i]}L${MB.x1} 0`, `M${MB.x1} 0H${ex}`]
      : [`M${HUB.demuxWorld[0]} ${HUB.demuxWorld[1]}H${DB.x0}`, `M${DB.x0} 0L${DB.x1} ${DB_OUT[i]}`, branchD(i), `M${ex - FW / 2} ${ROW_Y[i]}H${ex}`];
    if (k) segs.push(`M${ex} ${stationPos(side, i, 0)[1]}H${stationPos(side, i, k)[0]}`);
    const blk = side === "mux" ? 2 : 1;
    const lens = segs.map(d => { pC.setAttribute("d", d); return pC.getTotalLength(); });
    // un solo camino continuo: cada tramo empieza donde terminó el anterior
    const d = segs.map((x, k) => k ? x.replace(/^M[^A-Za-z]*/, "") : x).join("");
    pG.setAttribute("d", d); pC.setAttribute("d", d); pG.style.stroke = c;
    const L = lens.reduce((a, b) => a + b, 0);
    const blockAt = lens.slice(0, blk).reduce((a, b) => a + b, 0), blockEnd = blockAt + lens[blk];
    const blockCenter = side === "mux" ? [(MB.x0 + MB.x1) / 2, 0] : [(DB.x0 + DB.x1) / 2, 0];
    const edge = lens.slice(0, 4).reduce((a, b) => a + b, 0) - FW / 2;   // borde de la primera diapositiva
    const tail = 560 / L;
    const g = side === "mux" ? gM : gB, b = side === "mux" ? mux : demux;
    return {
      blockAt, blockEnd, blockCenter, length: L,
      point: s => pC.getPointAtLength(s),
      // cabeza del pulso en s; se desvanece al entrar a la diapositiva
      head(s) {
        const o = reduced ? 0 : clamp((edge - s) / 260, 0, 1);
        [pG, pC].forEach(p => { p.style.strokeDasharray = `${tail} 2`; p.style.strokeDashoffset = tail - s / L; p.style.opacity = o; });
      },
      // al llegar al bloque: primero S1 S0 toman su valor, luego se enciende la ruta interna
      select() { g.style.setProperty("--route", c); b.set(i); },
      route() { b.routes.forEach((r, k) => r.classList.toggle("on", k === i)); },
      // los cables del recorrido quedan encendidos
      light() {
        if (side === "mux") {
          muxIns.forEach((x, k) => x.classList.toggle("on", k === i));
          muxOut.style.setProperty("--c", c); muxOut.classList.add("on");
        } else {
          cable.classList.add("on");
          branches.forEach((x, k) => x.classList.toggle("on", k === i));
        }
      },
      done() { [pG, pC].forEach(p => { p.style.opacity = 0; }); }
    };
  }

  return {
    trace,
    reset() {
      [...muxIns, muxOut, cable, ...branches].forEach(w => w.classList.remove("on"));
      mux.reset(); demux.reset();
    },
    reveal(on) { svg.classList.toggle("revealed", on); },
    // la frase final vive en pantalla, no en el lienzo (texto gigante animado congela el render)
    phrase(on) { const p = $("#finalPhrase"); p.classList.toggle("on", on); p.setAttribute("aria-hidden", on ? "false" : "true"); }
  };
})();

/* el escenario del MUX muestra solo las diapositivas de la entrada elegida */
const stageShow = m => $$(".st.side-mux").forEach(e => e.classList.toggle("live", +e.dataset.m === m));

/* ---------------- encuadres (todos en un solo lugar) ---------------- */
const VIEW = {
  hub: [0, 0, FW],
  station: def => [def.x, def.y, FW],
  full: [0, 200, 29000],
  demuxClose: () => [HUB.demuxWorld[0], HUB.demuxWorld[1], 1100],
  mural: i => MURAL.views[i]
};

/* ---------------- cámara ---------------- */
let cam = VIEW.hub;
function applyCam([x, y, w]) {
  const vw = innerWidth, vh = innerHeight, s = Math.min(vw / w, vh / (w * FH / FW));
  WORLD.style.transform = `translate3d(${(vw / 2 - x * s).toFixed(2)}px,${(vh / 2 - y * s).toFixed(2)}px,0) scale(${s})`;
  cam = [x, y, w];
}
/* punto del mundo → píxel de pantalla con la cámara actual */
const camScale = () => Math.min(innerWidth / cam[2], innerHeight / (cam[2] * FH / FW));
function toScreen(p) {
  const s = camScale();
  return [innerWidth / 2 + (p.x - cam[0]) * s, innerHeight / 2 + (p.y - cam[1]) * s];
}
/* mientras la cámara viaja, el lienzo es una sola capa y sus animaciones CSS se pausan:
   así el navegador solo la desplaza y escala, sin volver a pintarla en cada cuadro.
   Es un contador para que una coreografía de varios tramos no la suelte entre tramo y tramo. */
let movers = 0;
const moving = on => WORLD.classList.toggle("moving", (movers = Math.max(0, movers + (on ? 1 : -1))) > 0);
/* la cámara recorre el cable de la señal sin cambiar el zoom.
   Ida (HUB → destino), en tres tiempos:
   1. sale del centro del HUB, se engancha a la señal y la sigue por el cable hasta el bloque,
      donde se detiene centrada en él;
   2. en el bloque: S1 S0 toman su valor, se enciende la ruta interna y la señal lo cruza;
   3. la cámara sale tras la señal por el cable de salida hasta la diapositiva.
   Vuelta (back): el mismo cable al revés. Con hold > 0 también se detiene en el bloque;
   sin hold, va de corrido.
   hold: tiempo extra de la parada en el bloque (para animaciones que lo necesitan).
   onSignal(s): largo recorrido por la señal; onProgress(p): avance total 0..1;
   onBlock(on, ms): la señal entra (con la duración de la parada) o sale del bloque. */
const sineInOut = t => -(Math.cos(Math.PI * t) - 1) / 2;
async function follow(tr, to, { onT, onSignal, onBlock, onProgress, back = false, hold = 0 } = {}) {
  const catchUp = 700;                                   // tramo en que la cámara se engancha o se suelta
  const bc = [...tr.blockCenter, FW], { blockAt, blockEnd, length } = tr;
  const ease01 = d => sineInOut(clamp(d / catchUp, 0, 1));
  const signal = s => { if (!back) tr.head(s); onSignal?.(s); onProgress?.(back ? 1 - s / length : s / length); };
  /* un tramo: la señal va de s0 a s1; la cámara se suelta de A al salir y se engancha a B al llegar
     (A o B en null: va pegada a la señal) */
  const leg = (s0, s1, A, B, ms, onTT) => tween(ms, t => {
    const s = s0 + (s1 - s0) * t, p = tr.point(s);
    let c = [p.x, p.y, FW];
    if (A) { const k = ease01(Math.abs(s - s0)); c = [A[0] + (c[0] - A[0]) * k, A[1] + (c[1] - A[1]) * k, FW]; }
    if (B) { const k = 1 - ease01(Math.abs(s1 - s)); c = [c[0] + (B[0] - c[0]) * k, c[1] + (B[1] - c[1]) * k, FW]; }
    applyCam(c);
    signal(s);
    onTT?.(t);
  }, sineInOut);
  moving(true);
  try {
    const start = cam;
    if (back && !hold) { await leg(length, 0, start, to, clamp(length / 3, 2000, 3400)); return; }
    if (!back) {
      // 1. del orbe al bloque
      await leg(0, blockAt, start, bc, clamp(blockAt / 2, 1300, 2000));
      // 2. en el bloque
      applyCam(bc);
      onBlock?.(true, (reduced ? 0 : 1250) + hold);
      tr.select();
      await wait(reduced ? 0 : 450);
      tr.route();
      await tween(650, t => signal(blockAt + (blockEnd - blockAt) * t), ease.inOut);
      await wait(reduced ? 0 : 150 + hold);
      // 3. del bloque a la diapositiva
      onBlock?.(false);
      await leg(blockEnd, length, bc, null, clamp((length - blockEnd) / 2.2, 1300, 2400), onT);
    } else {
      // 1. de la diapositiva al bloque
      await leg(length, blockEnd, start, bc, clamp((length - blockEnd) / 2.6, 1300, 2400));
      // 2. en el bloque: la señal lo cruza de vuelta
      applyCam(bc);
      onBlock?.(true, hold);
      await tween(hold, t => signal(blockEnd + (blockAt - blockEnd) * t), sineInOut);
      onBlock?.(false);
      // 3. del bloque al HUB
      await leg(blockAt, 0, bc, to, clamp(blockAt / 2.4, 1200, 2000));
    }
  } finally {
    if (!back) { tr.select(); tr.route(); }
    tr.done();
    applyCam(to); moving(false);
  }
}
/* desplazamiento lateral, sin zoom (entre estaciones y en el mural) */
async function pan(to, ms) {
  const a = cam;
  moving(true);
  try { await tween(ms, t => applyCam([a[0] + (to[0] - a[0]) * t, a[1] + (to[1] - a[1]) * t, a[2] + (to[2] - a[2]) * t]), sineInOut); }
  finally { applyCam(to); moving(false); }
}
async function fly(to, { ms, curve = ease.inOut, onT } = {}) {
  const i = interpolateZoom(cam, to);
  const dur = ms ?? clamp(i.duration * .85, 1100, 2600);
  moving(true);
  try { await tween(dur, t => { applyCam(i(t)); onT?.(t); }, curve); }
  finally { applyCam(to); moving(false); }
}
addEventListener("resize", () => applyCam(cam));
applyCam(cam);
// el foco nunca debe desplazar el lienzo (todo se mueve con la cámara)
$("#viewport").addEventListener("scroll", e => { e.target.scrollTop = 0; e.target.scrollLeft = 0; });

/* ---------------- tinte del fondo: el cielo cambia de tono poco a poco durante el viaje ---------------- */
const TINT = (() => {
  const el = $("#tint");
  return {
    to(theme) { el.className = "tint t-" + theme; el.style.opacity = 0; },
    set: p => { el.style.opacity = sineInOut(clamp(p, 0, 1)).toFixed(3); },
    // al llegar, el cielo ya tiene el tono del destino: el tinte se retira sin que se note
    done() { el.style.opacity = 0; el.className = "tint"; }
  };
})();

/* Marceline: los murciélagos siguen a la señal y, en el bloque, dan una vuelta completa a su alrededor */
function batHooks(tr, on) {
  if (!on) return {};
  const orbit = () => { const s = camScale(), [x, y] = toScreen({ x: tr.blockCenter[0], y: tr.blockCenter[1] - 40 }); return [x, y, 560 * s, 470 * s]; };
  return { hold: 1000, onSignal: BATS.frame, onBlock: (inside, ms) => BATS.ring(inside ? orbit : null, ms) };
}

/* ---------------- velos por temática ---------------- */
const VEIL = (() => {
  const v = $("#veil");
  const SHARDS = [[50, 0, 100, 0, 100, 40], [100, 40, 100, 100, 60, 100], [60, 100, 0, 100, 0, 70], [0, 70, 0, 0, 50, 0], [100, 0, 100, 40, 100, 0], [0, 0, 50, 0, 0, 0]];
  async function cover(theme) {
    if (reduced) return;
    if (theme === "marceline") return BATS.cover();
    if (theme === "venom") return VENOM.cover();
    v.className = "on t-" + theme;
    v.innerHTML = theme === "tsaritsa" ? `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M50 50L8 4M50 50L96 12M50 50L92 96M50 50L4 88M50 50L50 0M50 50L100 58M30 28L18 34M70 30L80 22M68 72L80 80M28 70L20 78"/></svg>` : "";
    await v.animate(theme === "tsaritsa"
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 1, clipPath: "circle(0% at 50% 50%)" }, { opacity: 1, clipPath: "circle(75% at 50% 50%)" }],
      { duration: 360, easing: "cubic-bezier(.7,0,.3,1)", fill: "forwards" }).finished;
  }
  async function uncover(theme) {
    if (reduced) { v.className = ""; return; }
    if (theme === "marceline") return BATS.scatter();
    if (theme === "venom") return VENOM.uncover();
    if (theme === "tsaritsa") {
      // la escarcha se quiebra en fragmentos que salen despedidos
      v.getAnimations().forEach(a => a.cancel());
      v.style.opacity = 0;
      const box = html(`<div class="shards"></div>`);
      document.body.append(box);
      await Promise.all(SHARDS.map(p => {
        const d = document.createElement("i");
        d.style.clipPath = `polygon(50% 50%, ${p[0]}% ${p[1]}%, ${p[2]}% ${p[3]}%, ${p[4]}% ${p[5]}%)`;
        box.append(d);
        const cx = (p[0] + p[2] + p[4]) / 3 - 50, cy = (p[1] + p[3] + p[5]) / 3 - 50;
        return d.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${cx * 1.6}vw,${cy * 1.6}vh) rotate(${cx > 0 ? 14 : -14}deg) scale(1.08)`, opacity: 0 }],
          { duration: 620, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" }).finished;
      }));
      box.remove();
      v.style.opacity = "";
    } else {
      v.getAnimations().forEach(a => a.cancel());
      await v.animate([{ clipPath: "circle(75% at 50% 50%)" }, { clipPath: "circle(0% at 50% 50%)" }], { duration: 440, easing: "cubic-bezier(.7,0,.3,1)", fill: "forwards" }).finished;
    }
    v.className = ""; v.innerHTML = "";
    v.getAnimations().forEach(a => a.cancel());
  }
  return { cover, uncover };
})();

/* ---------------- estado ---------------- */
const SAVE = REHEARSAL ? "muxdemux-ensayo-v2" : "muxdemux-progreso-v2";
const saved = store.get(SAVE, { mux: [], demux: [] });
const S = { mode: "hub", side: null, m: null, k: 0, concl: 0, e: 0, busy: false,
  done: { mux: new Set(saved.mux), demux: new Set(saved.demux) } };
const persist = () => store.set(SAVE, { mux: [...S.done.mux], demux: [...S.done.demux] });
const sealed = () => false;      // todo desbloqueado: DIO se puede ver sin terminar las otras tres rutas
const other = side => side === "mux" ? "demux" : "mux";
const route = () => ROUTES[S.side][S.m];
const atLast = () => S.mode === "route" && S.k === route().length - 1;
// el segundo DIO termina en su propia estación (no vuelve al HUB): primero se registra
// la ruta como terminada y recién entonces se arma el secreto
const isSecondDio = () => S.mode === "route" && S.m === 3 && S.done[other(S.side)].size === 4;
const secretArmed = () => isSecondDio() && atLast() && S.done[S.side].has(3);

/* solo la estación activa es navegable y visible para tecnologías de asistencia */
function setActive() {
  const cur = S.mode === "route" ? route()[S.k].el : S.mode === "hub" ? HUB.el : S.mode === "ending" ? MURAL.el : null;
  [HUB.el, MURAL.el, ...STATIONS.map(d => d.el)].forEach(el => {
    const on = el === cur;
    el.inert = !on;
    el.classList.toggle("cur", on);                  // solo la estación visible anima sus fondos
    el.setAttribute("aria-hidden", on ? "false" : "true");
  });
}
function focusStation() {
  const def = route()[S.k];
  const h = def.el.querySelector("h2");
  if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  def.el.dispatchEvent(new Event("enter"));          // animaciones que corren solo mientras se ve
}
const leaveStation = () => { if (S.mode === "route") route()[S.k].el.dispatchEvent(new Event("leave")); };

function paintHub() { HUB.paint({ active: S.mode === "hub" ? null : S.m, side: S.side, done: S.done, sealed: { mux: sealed("mux") } }); }
function paintUi() {
  const ui = $("#routeUi");
  ui.classList.toggle("on", S.mode !== "hub");
  document.documentElement.dataset.mode = S.mode;
  if (S.mode === "route") {
    const m = MEMBERS[S.m];
    $("#rwSide").textContent = S.side === "mux" ? `MUX · I${SUB[S.m]}` : `DEMUX · Y${SUB[S.m]}`;
    $("#rwWho").textContent = `${m.name} · ${m.topic}`;
    $("#rwDots").innerHTML = route().map((_, i) => `<i class="${i === S.k ? "cur" : i < S.k ? "past" : ""}"></i>`).join("");
    ui.style.setProperty("--c", m.c);
    const fin = isSecondDio() && atLast();
    $("#bNext").setAttribute("aria-label", !atLast() ? "Siguiente" : fin ? (S.done[S.side].has(3) ? "Volver al HUB" : "Terminar la ruta") : "Terminar la sección y volver al HUB");
    if (fin && S.done[S.side].has(3)) $("#rwWho").textContent = `${m.name} · ruta terminada ✓`;
    $$(".secret").forEach(b => b.classList.toggle("armed", secretArmed()));
  } else if (S.mode === "concl") {
    $("#rwSide").textContent = "Conclusiones";
    $("#rwWho").textContent = ["El circuito completo", "Las zonas del DEMUX", "Síntesis"][S.concl];
    $("#rwDots").innerHTML = [0, 1, 2].map(i => `<i class="${i === S.concl ? "cur" : i < S.concl ? "past" : ""}"></i>`).join("");
    ui.style.setProperty("--c", "#F2C14E");
    $("#bNext").setAttribute("aria-label", "Siguiente");
  } else if (S.mode === "ending") {
    $("#rwSide").textContent = "Ending";
    $("#rwWho").textContent = MURAL.titles[S.e];
    $("#rwDots").innerHTML = MURAL.views.map((_, i) => `<i class="${i === S.e ? "cur" : i < S.e ? "past" : ""}"></i>`).join("");
    ui.style.setProperty("--c", "#C9352F");
  }
  paintNotes();
}
const CONCL_NOTES = [
  "Gran alejamiento: por primera vez se ve el circuito completo. A la izquierda, las cuatro entradas salían del HUB hacia el MUX y todas llegaban a un único escenario: muchos → uno (las cuatro huellas apiladas). A la derecha, el botón mandaba la señal por un solo cable al DEMUX, que la repartía a cuatro destinos: uno → muchos. Abajo, el canal: si la salida del MUX alimenta la entrada del DEMUX, se forma MUX → canal → DEMUX.",
  "Revelación: el botón del DEMUX tenía cuatro zonas invisibles. Cada zona era una combinación de S1 S0: arriba 00 (Ana), derecha 01 (Ameth), abajo 10 (Jonathan), izquierda 11 (Carlos). Las líneas de selección eran sus dedos.",
  "Síntesis: el MUX decide qué información pasa; el DEMUX decide hacia dónde se dirige."
];
function paintNotes() {
  let meta = "HUB", text = "Portada. A la izquierda, cuatro entradas del MUX: cada integrante toca la suya; la señal sale por el borde izquierdo, entra al MUX y sale por su única salida al escenario. A la derecha, un solo botón del DEMUX: cada integrante sabe en qué zona tocarlo (arriba Ana, derecha Ameth, abajo Jonathan, izquierda Carlos) y la señal viaja al DEMUX, que la manda a su destino. Las cuatro rutas están abiertas: se pueden ver en cualquier orden, incluida la de Carlos (DIO). El cronómetro y el progreso se guardan en este navegador hasta pulsar «Nueva sesión» (arriba a la derecha, dos toques).";
  if (S.mode === "route") { const d = route()[S.k]; meta = `${S.side.toUpperCase()} · ${MEMBERS[S.m].name} · ${S.k + 1}/${route().length} · ${d.title}`; text = d.notes; }
  if (S.mode === "concl") { meta = "Conclusiones"; text = CONCL_NOTES[S.concl]; }
  if (S.mode === "ending") { meta = `Ending · ${S.e + 1}/${MURAL.views.length}`; text = MURAL.notes[S.e]; }
  $("#nMeta").textContent = meta;
  $("#nText").textContent = text;
}
const say = t => { $("#live").textContent = t; };

/* ---------------- navegación ---------------- */
// una acción a la vez: lo que se pulse durante un vuelo se descarta (no se acumula)
async function lock(fn) {
  if (S.busy) return false;
  S.busy = true;
  document.documentElement.classList.add("busy");
  try { await fn(); } finally {
    S.busy = false;
    movers = 0; WORLD.classList.remove("moving");     // nunca queda pausado si algo falla a mitad de camino
    document.documentElement.classList.remove("busy");
  }
  return true;
}

function openRoute({ side, m, force, x, y }) {
  if (S.mode !== "hub" || S.busy) return;
  if (m === 3 && sealed(side) && !(REHEARSAL && force)) { HUB.reject(side, m); say(`Carlos se abre cuando Ana, Ameth y Jonathan terminen el ${side === "mux" ? "MUX" : "DEMUX"}.`); return; }
  lock(async () => {
    TIMER.start();
    Object.assign(S, { mode: "route", side, m, k: 0 });
    paintHub();
    setActive();
    const mem = MEMBERS[m], theme = mem.theme;
    if (x != null) FX.burst(x, y, 30, 7, FX.PAL[theme]);
    say(`${side === "mux" ? "MUX" : "DEMUX"}: ${mem.name}, ${mem.topic}`);
    const target = VIEW.station(route()[0]);
    let covered = null;
    // el velo entra al final del último tramo (la bandada de Marceline necesita un poco más para cubrir)
    const coverAt = t => { if (!covered && t > (theme === "marceline" ? .7 : .82)) covered = VEIL.cover(theme); };
    // la señal sale del orbe y la cámara la sigue por el cable, siempre al mismo zoom:
    // MUX: entrada → MUX (elige con S1 S0) → salida única → escenario
    // DEMUX: botón → cable único → DEMUX (elige con S1 S0) → su rama → destino
    if (side === "mux") stageShow(m);
    HUB.arm(side, m);
    const tr = MAP.trace(side, m);
    tr.light();
    // Marceline: una bandada de murciélagos acompaña a la señal por el cable
    const bats = theme === "marceline";
    if (bats) BATS.follow(len => toScreen(tr.point(clamp(len, 0, tr.length))));
    // Venom: el simbionte se arrastra por el cable junto a la señal
    const goo = theme === "venom";
    if (goo) VENOM.follow(len => toScreen(tr.point(clamp(len, 0, tr.length))), camScale);
    // el fondo pasa poco a poco al tono del destino, al ritmo de la señal
    TINT.to(theme);
    await follow(tr, target, { onT: coverAt, onProgress: TINT.set, ...batHooks(tr, bats), ...(goo ? { onSignal: VENOM.frame } : {}) });
    await covered;
    FX.setTheme(theme, true);
    document.documentElement.dataset.theme = theme;
    TINT.done();
    paintUi();
    await VEIL.uncover(theme);
    focusStation();
  });
}

function step(dir) {
  if (S.busy) return;
  if (S.mode === "concl") return conclStep(dir);
  if (S.mode === "ending") return muralStep(dir);
  if (S.mode !== "route") return;
  const n = S.k + dir;
  if (n < 0) return backToHub(false);
  if (n >= route().length) {
    if (isSecondDio() && !S.done[S.side].has(3)) return finishInPlace();   // el secreto se arma aquí mismo
    return backToHub(true);                                                 // terminar la última estación completa la ruta
  }
  lock(async () => {
    leaveStation();
    S.k = n;
    paintUi(); setActive();
    await pan(VIEW.station(route()[n]), 850);
    focusStation();
  });
}

function finishInPlace() {
  S.done[S.side].add(3); persist();
  paintUi();
  const b = route()[S.k].el.querySelector(".secret");
  if (b && !reduced) b.animate([{ transform: "scale(.6)", opacity: .3 }, { transform: "scale(1.25)", opacity: 1 }, { transform: "scale(1)", opacity: 1 }], { duration: 900, easing: "cubic-bezier(.34,1.56,.64,1)" });
  b?.focus({ preventScroll: true });
  say("Ruta terminada. El sol de la esquina despertó.");
}

function backToHub(completed = false) {
  if (S.mode === "hub") return;
  lock(async () => {
    const was = S.mode, side = S.side, m = S.m, k = S.k;
    leaveStation();
    if (was === "route" && completed) { S.done[side].add(m); persist(); }
    if (was === "concl" || was === "ending") { MAP.reveal(false); MAP.phrase(false); HUB.showZones(false); WORLD.classList.remove("pile"); MURAL.stop(); }
    S.mode = "hub";
    paintUi(); setActive();
    if (was === "ending") await VEIL.cover("dio");
    // desde una ruta, la cámara vuelve por el mismo cable y el fondo vuelve poco a poco al del HUB;
    // desde las conclusiones, vuela
    if (was === "route") {
      FX.setTheme("hub");
      const tr = MAP.trace(side, m, { k }), bats = MEMBERS[m].theme === "marceline", goo = MEMBERS[m].theme === "venom";
      const sample = len => toScreen(tr.point(clamp(len, 0, tr.length)));
      if (bats) BATS.follow(sample, { back: true });
      if (goo) VENOM.follow(sample, camScale, { back: true });
      TINT.to("hub");
      await follow(tr, VIEW.hub, { back: true, onProgress: TINT.set, ...batHooks(tr, bats), ...(goo ? { onSignal: VENOM.frame } : {}), hold: bats ? 1900 : 0 });
      if (bats) BATS.scatter(Math.sign(tr.point(0).x - tr.point(40).x) || -1);
      if (goo) VENOM.retract();                                  // al llegar, el simbionte se recoge en su orbe
    }
    FX.setTheme("hub");
    document.documentElement.dataset.theme = "hub";
    TINT.done();
    if (was === "ending") applyCam(VIEW.hub);
    else if (was !== "route") await fly(VIEW.hub);
    if (was === "ending") await VEIL.uncover("dio");
    HUB.resetMux(); MAP.reset();
    S.side = null; S.m = null;
    paintHub();
    if (was === "route") HUB.focusOrb(side, m);
    say(completed ? `${MEMBERS[m].name} terminó su ruta del ${side === "mux" ? "MUX" : "DEMUX"}. HUB.` : "HUB");
  });
}

/* ---------------- conclusiones ---------------- */
function openConclusions() {
  lock(async () => {
    if (S.mode === "route") leaveStation();
    S.mode = "concl"; S.concl = 0;
    MAP.reset(); HUB.resetMux(); stageShow(-1);
    WORLD.classList.add("pile");
    FX.setTheme("hub");
    document.documentElement.dataset.theme = "hub";
    paintUi(); setActive();
    await fly(VIEW.full, { ms: 3200 });
    MAP.reveal(true);
    say("Conclusiones: el circuito completo, MUX, canal y DEMUX");
  });
}
function conclStep(dir) {
  const n = S.concl + dir;
  if (n < 0) return;                       // no se vuelve a la ruta desde las conclusiones
  if (n > 2) return startEnding();
  lock(async () => {
    S.concl = n;
    paintUi();
    if (n === 0) { HUB.showZones(false); MAP.phrase(false); await fly(VIEW.full, { ms: 1800 }); MAP.reveal(true); }
    if (n === 1) {
      // de cerca, los cables animados del mapa se apagan (despejan la vista y ahorran trabajo al render)
      MAP.phrase(false); MAP.reveal(false);
      await fly(VIEW.demuxClose(), { ms: 2200 });
      HUB.showZones(true);
      say("Las cuatro zonas del DEMUX: arriba 00, derecha 01, abajo 10, izquierda 11");
    }
    if (n === 2) { HUB.showZones(false); await fly(VIEW.full, { ms: 2200 }); MAP.reveal(true); MAP.phrase(true); say("El MUX decide qué información pasa; el DEMUX decide hacia dónde se dirige."); }
  });
}

/* ---------------- ending: mural horizontal ---------------- */
function startEnding() {
  lock(async () => {
    await VEIL.cover("dio");
    MAP.reveal(false); MAP.phrase(false); WORLD.classList.remove("pile");
    S.mode = "ending"; S.e = 0;
    FX.setTheme("ending");
    document.documentElement.dataset.theme = "ending";
    applyCam(VIEW.mural(0));
    paintUi(); setActive();
    await VEIL.uncover("dio");
    MURAL.enter(0);
    say(MURAL.titles[0]);
  });
}
function muralStep(dir) {
  const n = S.e + dir;
  if (n < 0 || n >= MURAL.views.length) return;
  lock(async () => {
    MURAL.leave(S.e);
    S.e = n;
    paintUi();
    await pan(VIEW.mural(n), reduced ? 0 : MURAL.travel);
    MURAL.enter(n);
    say(MURAL.titles[n]);
  });
}

MURAL.onAuto = () => muralStep(1);

/* ---------------- botón secreto (final de la ruta de DIO) ---------------- */
$$(".secret").forEach(b => tap(b, () => {
  if (S.busy) return;
  if (secretArmed()) { const r = b.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 60, 10, FX.PAL.dio); openConclusions(); }
  else b.animate([{ rotate: "0deg" }, { rotate: "40deg" }, { rotate: "0deg" }], { duration: 500, easing: "ease-out" });
}));

/* ---------------- controles ---------------- */
HUB.onPick = openRoute;
$("#bHub").addEventListener("click", () => backToHub(false));
$("#bPrev").addEventListener("click", () => step(-1));
$("#bNext").addEventListener("click", () => step(1));
const toggleNotes = f => $("#notes").classList.toggle("open", f ?? !$("#notes").classList.contains("open"));
$("#tNotes").addEventListener("click", () => toggleNotes());
$("#nClose").addEventListener("click", () => toggleNotes(false));
const toggleFull = () => document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.().catch(() => {});
$("#tFull").addEventListener("click", toggleFull);

addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  if (e.target.closest?.("[role=button],button,tr") && (k === " " || k === "Enter")) return;
  if (k === "ArrowRight" || k === "PageDown" || k === " ") { if (e.target.closest?.(".orb.demux")) return; e.preventDefault(); step(1); return; }
  if (k === "ArrowLeft" || k === "PageUp") { if (e.target.closest?.(".orb.demux")) return; e.preventDefault(); step(-1); return; }
  if (k === "Escape" || k === "Home") { if (S.mode === "route") backToHub(false); return; }
  if (S.mode === "hub") {
    // 1–4: entradas del MUX · 5–8: zonas del DEMUX (respetan el bloqueo de DIO)
    const code = e.code.match(/^(Digit|Numpad)([1-8])$/);
    if (code) { const n = +code[2] - 1; openRoute({ side: n < 4 ? "mux" : "demux", m: n % 4, force: REHEARSAL && e.shiftKey }); return; }
  }
  if (k === "n" || k === "N") toggleNotes();
  else if (k === "f" || k === "F") toggleFull();
  else if (REHEARSAL && (k === "c" || k === "C") && S.mode !== "concl") openConclusions();
  else if (REHEARSAL && (k === "e" || k === "E") && S.mode !== "ending") startEnding();
  else if (REHEARSAL && k === "R" && e.shiftKey) { S.done.mux.clear(); S.done.demux.clear(); persist(); paintHub(); say("Progreso de ensayo reiniciado"); }
});

/* deslizar en pantalla táctil: siguiente / anterior */
{
  let sx = 0, sy = 0, on = false;
  $("#viewport").addEventListener("pointerdown", e => { on = e.pointerType !== "mouse" && !e.target.closest("[role=button],button,tr"); sx = e.clientX; sy = e.clientY; });
  $("#viewport").addEventListener("pointerup", e => {
    if (!on) return; on = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (S.mode !== "hub" && Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  });
}

/* ---------------- cronómetro (arranca con la primera ruta) ---------------- */
const TIMER = (() => {
  const KEY = REHEARSAL ? "muxdemux-crono-ensayo" : "muxdemux-crono";
  let st = Object.assign({ acc: 0, run: null }, store.get(KEY, {}));
  const save = () => store.set(KEY, st);
  const el = $("#tNow");
  const paint = () => {
    const ms = st.acc + (st.run ? Date.now() - st.run : 0), s = Math.floor(ms / 1000);
    el.textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    $("#tTimer").classList.toggle("paused", !st.run && st.acc > 0);
  };
  setInterval(paint, 500); paint();
  $("#tTimer").addEventListener("click", () => { if (st.run) { st.acc += Date.now() - st.run; st.run = null; } else st.run = Date.now(); save(); paint(); });
  return {
    start() { if (!st.run && !st.acc) { st.run = Date.now(); save(); } },
    reset() { st = { acc: 0, run: null }; save(); paint(); }
  };
})();

/* ---------------- nueva sesión: reinicia cronómetro y progreso (dos toques) ---------------- */
{
  let armed = 0;
  const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 3200); };
  $("#tReset").addEventListener("click", () => {
    if (S.busy) return;
    if (Date.now() - armed > 3000) { armed = Date.now(); toast("Toca otra vez para empezar una sesión nueva (cronómetro y progreso en cero)"); return; }
    armed = 0;
    TIMER.reset();
    S.done.mux.clear(); S.done.demux.clear(); persist();
    if (S.mode !== "hub") backToHub(false); else paintHub();
    toast("Sesión nueva: cronómetro y progreso en cero");
    say("Sesión nueva");
  });
}

/* ---------------- arranque ---------------- */
document.documentElement.dataset.theme = "hub";
if (STILL) document.documentElement.classList.add("still");
if (REHEARSAL) {
  document.documentElement.classList.add("rehearsal");
  $(".tools").insertAdjacentHTML("afterbegin", `<span class="badge" title="Modo de ensayo: progreso aparte · Shift abre secciones selladas · C conclusiones · E ending · Shift+R reinicia">Ensayo</span>`);
  // ?ensayo&at=mux-1-0 abre directo una estación; at=concl / at=ending
  const at = new URLSearchParams(location.search).get("at");
  const m = at?.match(/^(mux|demux)-([0-3])-(\d)$/);
  if (m && ROUTES[m[1]][+m[2]][+m[3]]) {
    Object.assign(S, { mode: "route", side: m[1], m: +m[2], k: +m[3] });
    if (S.side === "mux") stageShow(S.m);
    const theme = MEMBERS[S.m].theme;
    FX.setTheme(theme, true); document.documentElement.dataset.theme = theme;
    applyCam(VIEW.station(route()[S.k]));
  } else if (at === "concl") {
    Object.assign(S, { mode: "concl", concl: 0 });
    WORLD.classList.add("pile");
    applyCam(VIEW.full); MAP.reveal(true);
  } else if (/^ending(-\d+)?$/.test(at || "")) {
    Object.assign(S, { mode: "ending", e: +(at.split("-")[1] || 0) });
    FX.setTheme("ending"); document.documentElement.dataset.theme = "ending";
    applyCam(VIEW.mural(S.e)); MURAL.enter(S.e);
  }
}
STATIONS.forEach(d => d.el.style.setProperty("--m", d.m));   // para la pila de huellas
MAP.phrase(false);
paintHub();
paintUi();
setActive();
requestAnimationFrame(() => HUB.el.classList.add("on"));

"use strict";
/* =====================================================================
   Ending: un mural continuo que la cámara recorre de izquierda a derecha,
   inspirado en el lenguaje del primer ending de JoJo (grabado, tinta,
   rojo, dorado, negro y púrpura), sin copiar fotogramas ni personajes.

   Recorrido: CONTINUARÁ... → · Módulo I · Módulo II · Módulo III
              · MUX / DEMUX (aquí estamos) · CLK · Módulo IV · ?

   Nombres y temas de los Módulos I–III: tal como los dio el equipo.
   Módulo IV: el equipo describió su contenido (latches, flip-flops, registros,
   tablas de estado, FSM, Mealy, Moore) pero no su nombre oficial.
   ===================================================================== */
const MURAL_Y = 12000;

/* El hilo conductor del mural: una sola señal que cambia de forma panel a panel.
   Panel 0 trazo libre · 1 los bits de 2026 se vuelven forma de onda · 2 la onda atraviesa
   compuertas · 3 se abre en un bus que pasa por bloques combinacionales · 4 converge en
   MUX → canal → DEMUX · 5 se vuelve el reloj CLK · 6 boceto punteado · 7 se interrumpe. */
function muralThread(N) {
  const Y = 905, HI = 862, LO = 948, g = [];
  const seg = (i, inner) => g.push(`<g class="th th${i}">${inner}</g>`);
  // 0 · trazo libre
  seg(0, `<path d="M0 ${Y}C640 860 1280 950 ${FW} ${Y}"/>`);
  // 1 · bits de 2026 = 11111101010
  {
    const bits = "11111101010", x0 = FW, w = FW / bits.length;
    let d = `M${x0} ${Y}`, lab = "";
    [...bits].forEach((b, k) => {
      const y = b === "1" ? HI : LO, x = x0 + k * w;
      d += `V${y}H${x + w}`;
      lab += `<text class="bit" x="${x + w / 2}" y="${HI - 22}">${b}</text>`;
    });
    seg(1, `<path d="${d}V${Y}"/>${lab}`);
  }
  // 2 · la señal atraviesa compuertas
  {
    const x0 = 2 * FW, gates = [[420, "M0-30H24A30 30 0 0 1 24 30H0Z"], [960, "M0-30Q40-30 56 0Q40 30 0 30Q14 0 0-30Z"], [1500, "M0-30L46 0L0 30ZM50 0a6 6 0 1 0 .1 0"]];
    let d = `M${x0} ${Y}`;
    gates.forEach(([gx]) => { d += `H${x0 + gx}M${x0 + gx + 62} ${Y}`; });
    d += `H${x0 + FW}`;
    seg(2, `<path d="${d}"/>${gates.map(([gx, gp]) => `<path class="gate" transform="translate(${x0 + gx} ${Y})" d="${gp}"/>`).join("")}`);
  }
  // 3 · bus de cuatro líneas con bloques combinacionales
  {
    const x0 = 3 * FW, ys = [866, 892, 918, 944];
    let d = `M${x0} ${Y}L${x0 + 160} ${ys[0]}M${x0} ${Y}L${x0 + 160} ${ys[1]}M${x0} ${Y}L${x0 + 160} ${ys[2]}M${x0} ${Y}L${x0 + 160} ${ys[3]}`;
    ys.forEach(y => { d += `M${x0 + 160} ${y}H${x0 + FW}`; });
    const box = (x, t) => `<rect class="blk" x="${x0 + x}" y="846" width="120" height="118" rx="8"/><text class="blk-t" x="${x0 + x + 60}" y="918">${t}</text>`;
    seg(3, `<path d="${d}"/>${box(480, "Σ")}${box(980, "=")}${box(1480, "DEC")}`);
  }
  // 4 · el bus converge en MUX → canal → DEMUX y vuelve a abrirse
  {
    const x0 = 4 * FW, ys = [866, 892, 918, 944];
    let d = "";
    ys.forEach(y => { d += `M${x0} ${y}H${x0 + 520}`; });
    d += `M${x0 + 640} ${Y}H${x0 + 1280}`;
    ys.forEach(y => { d += `M${x0 + 1400} ${y}H${x0 + 1640}`; });
    d += `M${x0 + 1640} 866L${x0 + FW} ${Y}M${x0 + 1640} 892L${x0 + FW} ${Y}M${x0 + 1640} 918L${x0 + FW} ${Y}M${x0 + 1640} 944L${x0 + FW} ${Y}`;
    seg(4, `<path d="${d}"/><path class="blk" d="M${x0 + 520} 840L${x0 + 640} 875V935L${x0 + 520} 970Z"/><path class="blk" d="M${x0 + 1280} 875L${x0 + 1400} 840V970L${x0 + 1280} 935Z"/><path class="canal" d="M${x0 + 640} ${Y}H${x0 + 1280}"/>`);
  }
  // 5 · el reloj
  {
    const x0 = 5 * FW, T = 240;
    let d = `M${x0} ${Y}V${LO}`;
    for (let x = x0; x < x0 + FW; x += T) d += `H${x + T / 2}V${HI}H${x + T}V${LO}`;
    seg(5, `<path class="clk" d="${d}"/>`);
  }
  // 6 · boceto: estados y transiciones, todavía en lápiz
  {
    const x0 = 6 * FW;
    seg(6, `<path class="sketch" d="M${x0} ${Y}C${x0 + 300} 860 ${x0 + 500} 950 ${x0 + 760} ${Y}S${x0 + 1300} 870 ${x0 + FW} ${Y}"/>${[420, 960, 1500].map(x => `<circle class="sketch" cx="${x0 + x}" cy="${Y}" r="34"/>`).join("")}`);
  }
  // 7 · el hilo se interrumpe
  {
    const x0 = 7 * FW;
    seg(7, `<path class="sketch fade" d="M${x0} ${Y}C${x0 + 260} 880 ${x0 + 520} 930 ${x0 + 760} ${Y}"/><path class="sketch faint" d="M${x0 + 800} ${Y}h40m30 4h30m30-2h18"/>`);
  }
  return g.join("");
}

function buildMural(world) {
  const P = [];   // paneles: { title, notes, html, dwell }
  const gate = (kind, x, y, label) => {
    // compuertas grabadas: cuerpo + negación cuando aplica
    const bodies = {
      AND: "M0 0H34A36 36 0 0 1 34 72H0Z",
      OR: "M0 0Q60 0 80 36Q60 72 0 72Q22 36 0 0Z",
      XOR: "M8 0Q66 0 86 36Q66 72 8 72Q30 36 8 0ZM-4 0Q18 36-4 72",
      NOT: "M0 0L64 36L0 72Z"
    };
    const base = kind.replace(/^N(?=AND|OR)/, "").replace("XNOR", "XOR");
    const neg = /^N|XNOR/.test(kind) && kind !== "NOT" || kind === "NOT";
    const w = base === "NOT" ? 64 : base === "AND" ? 70 : 86;
    return `<g transform="translate(${x} ${y})"><path class="g-body" d="${bodies[base]}"/>${neg ? `<circle class="g-body" cx="${w + 8}" cy="36" r="7"/>` : ""}
      <text x="${w / 2}" y="104">${label || kind}</text></g>`;
  };
  const kmap = `<g class="kmap" transform="translate(0 0)">${[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c =>
    `<rect x="${c * 58}" y="${r * 58}" width="58" height="58"/>`).join("")).join("")}
    <rect class="k-group" x="58" y="58" width="116" height="116" rx="18"/><text x="116" y="-18">Karnaugh</text></g>`;

  P.push({
    title: "CONTINUARÁ... →",
    dwell: 4200,
    notes: "Primer elemento del ending: «CONTINUARÁ... →». A partir de aquí la cámara recorre el mural de toda la materia.",
    html: `<p class="tbc">CONTINUARÁ... <i>→</i></p>`
  });
  P.push({
    title: "Módulo I · Sistemas Numéricos y Códigos Binarios",
    dwell: 8000,
    notes: "Módulo I: decimal, binario, octal y hexadecimal con sus conversiones; códigos ASCII, BCD y Gray; paridad. El mismo número cambia de forma sin cambiar su valor.",
    html: `<p class="mod">Módulo I</p><h2>Sistemas Numéricos<br><em>y Códigos Binarios</em></h2>
      <div class="morph">
        <span style="--d:0">2026<sub>10</sub></span><span style="--d:1">11111101010<sub>2</sub></span>
        <span style="--d:2">3752<sub>8</sub></span><span style="--d:3">7EA<sub>16</sub></span>
      </div>
      <ul class="tags"><li>ASCII · «M» = 77 = 4D<sub>16</sub></li><li>BCD · 2026 = 0010 0000 0010 0110</li><li>Gray · 0110 → 0101</li><li>Paridad par · 1011001 → bit 0</li></ul>`
  });
  P.push({
    title: "Módulo II · Álgebra Booleana y Familias Lógicas",
    dwell: 8500,
    notes: "Módulo II: las siete compuertas, De Morgan, mintérminos y maxtérminos, mapas de Karnaugh, las familias TTL y CMOS, y la descripción en VHDL.",
    html: `<p class="mod">Módulo II</p><h2>Álgebra Booleana<br><em>y Familias Lógicas</em></h2>
      <svg class="gates" viewBox="0 -10 1320 130">${["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"].map((g, i) => gate(g, i * 186, 0)).join("")}</svg>
      <div class="row2">
        <p class="law">De Morgan: <span class="ov">A·B</span> = <span class="ov">A</span> + <span class="ov">B</span></p>
        <svg class="kmapsvg" viewBox="-20 -60 280 300">${kmap}</svg>
        <ul class="tags v"><li>mintérminos Σm</li><li>maxtérminos ΠM</li><li>TTL · CMOS</li><li>VHDL</li></ul>
      </div>`
  });
  P.push({
    title: "Módulo III · Lógica Combinacional",
    dwell: 8000,
    notes: "Módulo III: codificadores y decodificadores, buffers tri-state, XOR/XNOR, sumadores, restadores y comparadores. Todos responden solo a sus entradas del momento… y el camino lleva a MUX/DEMUX.",
    html: `<p class="mod">Módulo III</p><h2>Lógica <em>Combinacional</em></h2>
      <ul class="chain">${["Codificadores", "Decodificadores", "Tri-state", "XOR / XNOR", "Sumadores", "Restadores", "Comparadores"].map((t, i) => `<li style="--d:${i}">${t}</li>`).join("")}</ul>
      <p class="arrow-on">→</p>`
  });
  P.push({
    title: "MUX / DEMUX · aquí estamos",
    dwell: 6500,
    notes: "El presente: MUX y DEMUX. Muchos → uno y uno → muchos, gobernados por las líneas de selección.",
    html: `<p class="mod gold">Aquí estamos</p><h2 class="big">MUX <i>/</i> <em>DEMUX</em></h2>
      <svg class="md" viewBox="0 0 1200 300" aria-hidden="true">
        <g class="md-in">${[40, 110, 180, 250].map(y => `<path d="M0 ${y}H200"/>`).join("")}</g>
        <path class="md-blk" d="M200 20L340 80V220L200 280Z"/><text x="262" y="160">MUX</text>
        <path class="md-ch" d="M340 150H860"/><text class="it" x="600" y="128">canal</text>
        <path class="md-blk" d="M860 80L1000 20V280L860 220Z"/><text x="922" y="160">DEMUX</text>
        <g class="md-in">${[40, 110, 180, 250].map(y => `<path d="M1000 ${y}H1200"/>`).join("")}</g>
      </svg>`
  });
  P.push({
    title: "CLK · el primer pulso",
    dwell: 7500,
    notes: "Zona oscura. Aparece la señal de reloj CLK. Con el primer flanco de subida empieza lo que viene: la lógica secuencial, donde importan el tiempo, la memoria y el estado.",
    html: `<p class="mod dark">combinacional → secuencial</p>
      <svg class="clk" viewBox="0 0 1600 260" aria-hidden="true"><path pathLength="1" d="M0 200H200V60H400V200H600V60H800V200H1000V60H1200V200H1400V60H1600"/><circle class="edge" cx="200" cy="60" r="16"/></svg>
      <h2 class="clk-t">CLK</h2>
      <ul class="tags trio"><li>tiempo</li><li>memoria</li><li>estado</li></ul>`
  });
  P.push({
    title: "Módulo IV · lo que viene",
    dwell: 8500,
    notes: "Módulo IV, todavía por estudiar: latches, flip-flops D y JK, registros, tablas de estado y transiciones, máquinas de estados finitos (FSM) de Mealy y de Moore.",
    html: `<p class="mod">Módulo IV</p><h2 class="sketchy">Lo que <em>viene</em></h2>
      <svg class="sketch" viewBox="0 0 1300 360" aria-hidden="true">
        <g class="ff"><rect x="20" y="40" width="190" height="240" rx="6"/><text x="115" y="30">Flip-Flop D</text><text class="s" x="40" y="110">D</text><text class="s" x="40" y="230">CLK ›</text><text class="s" x="170" y="110">Q</text></g>
        <g class="ff"><rect x="290" y="40" width="190" height="240" rx="6"/><text x="385" y="30">JK</text><text class="s" x="310" y="100">J</text><text class="s" x="310" y="240">K</text><text class="s" x="440" y="100">Q</text></g>
        <g class="fsm"><circle cx="680" cy="160" r="70"/><circle cx="930" cy="160" r="70"/><circle cx="1180" cy="160" r="70"/>
          <path d="M750 140Q805 100 860 140M1000 140Q1055 100 1110 140M1110 190Q930 330 750 190"/>
          <text x="680" y="170">S0</text><text x="930" y="170">S1</text><text x="1180" y="170">S2</text></g>
      </svg>
      <ul class="tags"><li>latches</li><li>registros</li><li>tablas de estado</li><li>transiciones</li><li>FSM · Mealy · Moore</li></ul>`
  });
  P.push({
    title: "?",
    dwell: 0,
    notes: "El mural queda incompleto: las líneas terminan, los dibujos son bocetos y el camino sigue hacia una zona desconocida. Fundido a negro.",
    html: `<svg class="unfinished" viewBox="0 0 1600 400" aria-hidden="true"><path pathLength="1" d="M0 200C300 120 500 300 800 200S1200 140 1350 200"/><path class="dash" pathLength="1" d="M1350 200C1420 225 1470 210 1520 200"/></svg>
      <p class="q">?</p><div class="black"></div>`
  });

  const N = P.length;
  const el = html(`<section class="st mural" aria-label="Ending" style="left:${-FW / 2}px;top:${MURAL_Y - FH / 2}px;width:${N * FW}px">
    <svg class="mural-bg" viewBox="0 0 ${N * FW} ${FH}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)"><path d="M0 0V14" stroke="#F2E3C0" stroke-opacity=".05" stroke-width="2"/></pattern>
        <linearGradient id="mural-sky" x1="0" x2="1">
          <stop offset="0" stop-color="#3A0E12"/><stop offset=".35" stop-color="#2A0D24"/><stop offset=".55" stop-color="#3B1A3C"/>
          <stop offset=".66" stop-color="#07060A"/><stop offset=".8" stop-color="#140A1C"/><stop offset="1" stop-color="#000"/>
        </linearGradient>
      </defs>
      <rect width="${N * FW}" height="${FH}" fill="url(#mural-sky)"/>
      <rect width="${N * FW}" height="${FH}" fill="url(#hatch)"/>
      <g class="thread">${muralThread(N)}</g>
    </svg>
    ${P.map((p, i) => `<div class="panel p${i}" style="left:${i * FW}px">${p.html}</div>`).join("")}
  </section>`);
  world.append(el);
  const panels = $$(".panel", el);

  let timer = 0;
  const api = {
    el,
    views: P.map((_, i) => [i * FW, MURAL_Y, FW]),
    titles: P.map(p => p.title),
    notes: P.map(p => p.notes),
    travel: 1700,
    onAuto: null,
    enter(i) {
      $$(".thread .th", el).forEach((t, k) => t.classList.toggle("on", k === i || k === i - 1));
      panels.forEach((p, k) => {
        p.classList.toggle("on", k === i);
        p.inert = k !== i;
        p.setAttribute("aria-hidden", k === i ? "false" : "true");
      });
      clearTimeout(timer);
      if (P[i].dwell && api.onAuto) timer = setTimeout(() => api.onAuto(), P[i].dwell);
    },
    leave(i) { panels[i]?.classList.add("past"); },
    stop() { clearTimeout(timer); panels.forEach(p => p.classList.remove("on", "past")); }
  };
  return api;
}

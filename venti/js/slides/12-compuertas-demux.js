/* 12 · Implementación del DEMUX 1:4 con compuertas (punto 6) */
(function () {
  const K = SvgKit;
  const R = { s1: 420, s1n: 500, s0: 580, s0n: 660, d: 760 };
  const AX = 880, AW = 130, AH = 92, AY = [590, 700, 810, 920];
  const USE = [["s1n", "s0n"], ["s1n", "s0"], ["s1", "s0n"], ["s1", "s0"]];
  const sub = (b, i, n) => `${b}<tspan font-size="0.65em" dy="0.3em">${i}</tspan><tspan dy="-0.3em">${n ? "'" : ""}</tspan>`;

  function build() {
    let g0 = "", g1 = "";
    g0 += K.wire([[180, 260], [R.s1, 260], [R.s1, 960]], "draw", 'pathLength="1" data-sig="s1"');
    g0 += K.wire([[300, 260], [300, 330], [320, 330]], "draw", 'pathLength="1" data-sig="s1"');
    g0 += K.not(320, 330) + K.wire([[392, 330], [R.s1n, 330], [R.s1n, 960]], "draw", 'pathLength="1" data-sig="s1n"');
    g0 += K.wire([[180, 400], [R.s0, 400], [R.s0, 960]], "draw", 'pathLength="1" data-sig="s0"');
    g0 += K.wire([[300, 400], [300, 470], [320, 470]], "draw", 'pathLength="1" data-sig="s0"');
    g0 += K.not(320, 470) + K.wire([[392, 470], [R.s0n, 470], [R.s0n, 960]], "draw", 'pathLength="1" data-sig="s0n"');
    g0 += K.wire([[180, 530], [R.d, 530], [R.d, 960]], "draw", 'pathLength="1" data-sig="d"');
    g0 += K.dot(300, 260) + K.dot(300, 400);
    g0 += K.text(150, 260, sub("S", 1), "g big", "end") + K.text(150, 400, sub("S", 0), "g big", "end") + K.text(150, 530, "D", "a big", "end");
    g0 += `<text class="val" data-v="s1" x="195" y="232"></text><text class="val" data-v="s0" x="195" y="372"></text><text class="val" data-v="d" x="195" y="502"></text>`;
    [["s1", 1, 0], ["s1n", 1, 1], ["s0", 0, 0], ["s0n", 0, 1]].forEach(([k, i, n]) => { g0 += K.text(R[k], 222, sub("S", i, n), "g", "middle"); });
    AY.forEach((y, k) => {
      const [a, b] = USE[k];
      const p1 = K.pin(y, AH, 0, 3), p2 = K.pin(y, AH, 1, 3), p3 = K.pin(y, AH, 2, 3);
      g1 += K.wire([[R[a], p1], [AX, p1]], "", `data-sig="${a}"`) + K.dot(R[a], p1);
      g1 += K.wire([[R[b], p2], [AX, p2]], "", `data-sig="${b}"`) + K.dot(R[b], p2);
      g1 += K.wire([[R.d, p3], [AX, p3]], "", 'data-sig="d"') + K.dot(R.d, p3);
      g1 += K.and(AX, y, AW, AH, "and" + k) + K.text(AX + AW / 2 - 12, y, "&amp;", "m", "middle");
      g1 += K.wire([[AX + AW, y], [1240, y]], "", `data-sig="y${k}"`);
      g1 += K.text(1270, y, sub("Y", k), "big", "start") + `<text class="val big-val" data-v="y${k}" x="1340" y="${y}">?</text>`;
    });
    return `<svg class="gates logic" viewBox="0 0 1920 1080"><g data-in="0">${g0}</g><g data-in="1">${g1}</g></svg>`;
  }
  const CASES = { 2: { S1: 0, S0: 1, D: 1 }, 3: { S1: 0, S0: 1, D: 0 }, 4: { S1: 0, S0: 1, D: 1 } };
  function evaluate(c) {
    const v = { s1: c.S1, s1n: 1 - c.S1, s0: c.S0, s0n: 1 - c.S0, d: c.D };
    USE.forEach(([a, b], k) => (v["y" + k] = v[a] & v[b] & c.D));
    return v;
  }

  Deck.add({
    id: "compuertas-demux", title: "DEMUX con compuertas", who: "Jonathan", topic: "DEMUX y diseño", time: 60,
    notes: [
      "Para construirlo usamos los mismos rieles que en el MUX: S1, S0 y sus complementos con dos inversores. Además, el dato D se reparte a todas las compuertas.",
      "Cuatro AND de tres entradas: cada una combina un minterm de S con D. Su salida es directamente una Y. A diferencia del MUX, no hace falta una OR al final.",
      "Ejemplo: S1S0 = 01 y D = 1. La única AND con S1' = 1 y S0 = 1 es la segunda: Y1 = 1. Las otras tienen al menos un 0 en la selección, así que dan 0.",
      "Si D baja a 0, Y1 también baja a 0: la compuerta sigue «elegida» pero transporta un 0. El dato viaja; la selección solo abre el camino.",
      "En circuitos reales esto es el 74HC139 (dos decodificadores/demultiplexores 2 a 4) o el 74HC155. Sus salidas suelen ser activas en bajo, es decir, la salida elegida vale 0: hay que leer la hoja de datos."
    ],
    extra: "Conteo: DEMUX 1:4 = 2 NOT + 4 AND(3). MUX 4:1 = 2 NOT + 4 AND(3) + 1 OR(4). Comparten la parte que decodifica S.",
    html: `
      <div class="kicker">Punto 6 · implementación con compuertas</div>
      <h1 class="title">El DEMUX <em>por dentro</em></h1>
      ${build()}
      <div class="bom panel" data-in="4">
        <div><b>2</b> NOT</div><div><b>4</b> AND <small>(3 entradas)</small></div><div><b>0</b> OR</div>
        <p>≈ 74HC139 / 74HC155 · salidas activas en bajo</p>
      </div>
      <div class="says top">
        <p class="say" data-in="0" data-out="1">Mismos rieles de <span class="g">selección</span>, más el dato <b>D</b>.</p>
        <p class="say" data-in="1" data-out="2">Una <b>AND</b> por salida: minterm de S · D.</p>
        <p class="say" data-in="2" data-out="3"><span class="g">S<sub>1</sub>S<sub>0</sub> = 01</span>, D = 1 → solo <b>Y<sub>1</sub> = 1</b>.</p>
        <p class="say" data-in="3" data-out="4">D = 0 → Y<sub>1</sub> = 0: el dato <b>viaja</b>, S solo abre.</p>
        <p class="say" data-in="4">Chip real: <b>74HC139</b> (salidas activas en bajo).</p>
      </div>`,
    onPhase(ctx, p) {
      const c = CASES[p];
      const svg = ctx.q(".gates");
      const v = c ? evaluate(c) : null;
      svg.querySelectorAll("[data-sig]").forEach(w => {
        const s = w.dataset.sig;
        w.classList.toggle("s", /^s/.test(s));
        w.classList.toggle("v1", !!(v && v[s]));
      });
      svg.querySelectorAll(".val").forEach(t => {
        const s = t.dataset.v;
        t.textContent = v ? v[s] : /^y/.test(s) ? "?" : "";
        t.classList.toggle("v1", !!(v && v[s])); t.classList.toggle("v0", !!(v && !v[s]));
      });
      [0, 1, 2, 3].forEach(k => {
        const g = svg.querySelector(".and" + k);
        const sel = !!(v && v[USE[k][0]] && v[USE[k][1]]);
        g.classList.toggle("open", sel); g.classList.toggle("shut", !!v && !sel);
      });
    }
  });
})();

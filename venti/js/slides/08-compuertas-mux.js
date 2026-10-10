/* 8 · Diagrama lógico del MUX 4:1 con compuertas (punto 3) — se ensambla y luego se prueba con pulsos */
(function () {
  const K = SvgKit;
  const R = { s1: 420, s1n: 500, s0: 580, s0n: 660 };     // rieles verticales
  const AX = 820, AW = 130, AH = 100, AY = [560, 680, 800, 920];
  const OX = 1200, OW = 150, OH = 220, OYc = 740;
  const USE = [["s1n", "s0n"], ["s1n", "s0"], ["s1", "s0n"], ["s1", "s0"]];
  const orPin = k => K.pin(OYc, OH, k, 4);
  const orX = k => { const f = (orPin(k) - (OYc - OH / 2)) / OH; return OX + 2 * f * (1 - f) * 0.28 * OW - 2; };

  function build() {
    let g0 = "", g1 = "", g2 = "";
    // líneas de selección, inversores y rieles
    g0 += K.wire([[180, 260], [R.s1, 260], [R.s1, 940]], "draw", 'pathLength="1" data-sig="s1"');
    g0 += K.wire([[300, 260], [300, 330], [320, 330]], "draw", 'pathLength="1" data-sig="s1"');
    g0 += K.not(320, 330) + K.wire([[392, 330], [R.s1n, 330], [R.s1n, 940]], "draw", 'pathLength="1" data-sig="s1n"');
    g0 += K.wire([[180, 410], [R.s0, 410], [R.s0, 940]], "draw", 'pathLength="1" data-sig="s0"');
    g0 += K.wire([[300, 410], [300, 480], [320, 480]], "draw", 'pathLength="1" data-sig="s0"');
    g0 += K.not(320, 480) + K.wire([[392, 480], [R.s0n, 480], [R.s0n, 940]], "draw", 'pathLength="1" data-sig="s0n"');
    g0 += K.dot(300, 260) + K.dot(300, 410);
    g0 += K.text(150, 260, "S<tspan font-size='0.65em' dy='0.3em'>1</tspan>", "g big", "end") + K.text(150, 410, "S<tspan font-size='0.65em' dy='0.3em'>0</tspan>", "g big", "end");
    g0 += `<text class="val" data-v="s1" x="195" y="232">0</text><text class="val" data-v="s0" x="195" y="382">0</text>`;
    const sub = (b, i, n) => `${b}<tspan font-size="0.65em" dy="0.3em">${i}</tspan><tspan dy="-0.3em">${n ? "'" : ""}</tspan>`;
    [["s1", 1, 0], ["s1n", 1, 1], ["s0", 0, 0], ["s0n", 0, 1]].forEach(([k, i, n]) => { g0 += K.text(R[k], 222, sub("S", i, n), "g", "middle"); });
    // compuertas AND
    AY.forEach((y, k) => {
      const [a, b] = USE[k];
      const p1 = K.pin(y, AH, 0, 3), p2 = K.pin(y, AH, 1, 3), p3 = K.pin(y, AH, 2, 3);
      g1 += K.wire([[R[a], p1], [AX, p1]], "", `data-sig="${a}"`) + K.dot(R[a], p1);
      g1 += K.wire([[R[b], p2], [AX, p2]], "", `data-sig="${b}"`) + K.dot(R[b], p2);
      g1 += K.wire([[180, p3], [AX, p3]], "", `data-sig="i${k}"`);
      g1 += K.and(AX, y, AW, AH, "and" + k);
      g1 += K.text(150, p3, `I<tspan font-size='0.65em' dy='0.3em'>${k}</tspan>`, "a big", "end");
      g1 += `<text class="val" data-v="i${k}" x="195" y="${p3 - 26}">0</text>`;
      g1 += K.text(AX + AW / 2 - 12, y, "&amp;", "m", "middle");
      g2 += K.wire([[AX + AW, y], [1080 + k * 12, y], [1080 + k * 12, orPin(k)], [orX(k), orPin(k)]], "", `data-sig="a${k}"`);
    });
    // compuerta OR y salida
    g2 += K.or(OX, OYc, OW, OH, "orY") + K.text(OX + OW / 2 - 8, OYc, "≥1", "m", "middle");
    g2 += K.wire([[OX + OW, OYc], [1520, OYc]], "", 'data-sig="y"');
    g2 += K.text(1550, OYc, "Y", "big", "start") + `<text class="val big-val" data-v="y" x="1600" y="${OYc}">?</text>`;
    return `<svg class="gates logic" viewBox="0 0 1920 1080">
      <g class="g-sel" data-in="0">${g0}</g><g class="g-and" data-in="1">${g1}</g><g class="g-or" data-in="2">${g2}</g></svg>`;
  }

  const CASES = { 3: { S1: 1, S0: 0, I: [0, 1, 1, 0] }, 4: { S1: 1, S0: 0, I: [0, 1, 0, 0] }, 5: { S1: 1, S0: 0, I: [0, 1, 1, 0] } };
  function evaluate(c) {
    const v = { s1: c.S1, s1n: 1 - c.S1, s0: c.S0, s0n: 1 - c.S0 };
    c.I.forEach((x, k) => (v["i" + k] = x));
    USE.forEach(([a, b], k) => (v["a" + k] = v[a] & v[b] & c.I[k]));
    v.y = v.a0 | v.a1 | v.a2 | v.a3;
    return v;
  }

  Deck.add({
    id: "compuertas-mux", title: "Diagrama lógico del MUX", who: "Ameth", topic: "Funcionamiento lógico", time: 75,
    notes: [
      "La expresión se convierte directamente en circuito. Primero, las líneas de selección: S1 y S0 entran, y dos inversores (NOT) generan S1' y S0'. Así tenemos cuatro rieles.",
      "Cada término es una AND de tres entradas: dos rieles de selección y un dato. La AND de arriba toma S1', S0' e I0, igual que el primer término de la expresión.",
      "Las cuatro salidas de las AND entran a una OR de cuatro entradas, cuya salida es Y. Total: 2 NOT, 4 AND de 3 entradas y 1 OR de 4 entradas.",
      "Probemos con valores reales: S1 = 1, S0 = 0 y datos I0..I3 = 0, 1, 1, 0. Solo la tercera AND tiene sus dos entradas de selección en 1 (S1 y S0'), así que se «abre» y deja pasar I2 = 1. Las demás dan 0 sin importar su dato. Y = 1.",
      "Si ahora I2 cambia a 0, la misma compuerta sigue abierta, pero transporta un 0: Y = 0. Y sigue a I2, que es lo que dice la tabla para S1S0 = 10.",
      "Este es el circuito real: el 74HC153 contiene dos MUX 4:1 con esta estructura más una entrada de habilitación. Con 8 entradas (74HC151) solo cambian el número de rieles y el tamaño de las AND."
    ],
    extra: "Si la docente pide otra combinación, por ejemplo S1S0 = 01: se abre la 2.ª AND (S1', S0) → Y = I1. Explicar siempre: ¿qué AND tiene sus dos entradas de selección en 1?",
    html: `
      <div class="kicker">Punto 3 · diagrama lógico</div>
      <h1 class="title">El MUX <em>por dentro</em></h1>
      ${build()}
      <div class="bom panel" data-in="5">
        <div><b>2</b> NOT</div><div><b>4</b> AND <small>(3 entradas)</small></div><div><b>1</b> OR <small>(4 entradas)</small></div>
        <p>≈ 74HC153 · dos MUX 4:1 con habilitación</p>
      </div>
      <div class="says top">
        <p class="say" data-in="0" data-out="1">S<sub>1</sub>, S<sub>0</sub> y sus <span class="g">complementos</span> forman 4 rieles.</p>
        <p class="say" data-in="1" data-out="2">Una <b>AND</b> por término: 2 rieles + 1 dato.</p>
        <p class="say" data-in="2" data-out="3">Una <b>OR</b> junta los cuatro términos en Y.</p>
        <p class="say" data-in="3" data-out="4"><span class="g">S<sub>1</sub>S<sub>0</sub> = 10</span>: solo se abre la AND de I<sub>2</sub> → <b>Y = 1</b>.</p>
        <p class="say" data-in="4" data-out="5">I<sub>2</sub> pasa a 0 → <b>Y = 0</b>. Y sigue a I<sub>2</sub>.</p>
        <p class="say" data-in="5">Circuito real: así está hecho el <b>74HC153</b>.</p>
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
        t.textContent = v ? v[s] : s === "y" ? "?" : "";
        t.classList.toggle("v1", !!(v && v[s])); t.classList.toggle("v0", !!(v && !v[s]));
      });
      [0, 1, 2, 3].forEach(k => {
        const g = svg.querySelector(".and" + k);
        g.classList.toggle("open", !!(v && v[USE[k][0]] && v[USE[k][1]]));
        g.classList.toggle("shut", !!(v && !(v[USE[k][0]] && v[USE[k][1]])));
      });
      svg.querySelector(".orY").classList.toggle("open", !!(v && v.y));
    }
  });
})();

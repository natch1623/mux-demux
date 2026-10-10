/* 9 · Ejemplo resuelto paso a paso (requisito 4): entradas → salida por la expresión */
(function () {
  const sub = (b, i, n) => `${b}<sub>${i}</sub>${n ? "'" : ""}`;
  const cell = (html, cls, phase, at) => `<div class="c ${cls || ""}" data-in="${phase}" ${at ? `data-at="${at}"` : ""}>${html}</div>`;
  const TERMS = [[sub("S", 1, 1), sub("S", 0, 1), sub("I", 0)], [sub("S", 1, 1), sub("S", 0), sub("I", 1)], [sub("S", 1), sub("S", 0, 1), sub("I", 2)], [sub("S", 1), sub("S", 0), sub("I", 3)]];
  const SUBS = [["0", "1", "0"], ["0", "0", "1"], ["1", "1", "1"], ["1", "0", "0"]];
  const RES = ["0", "0", "1", "0"];
  Deck.add({
    id: "ejemplo", title: "Ejemplo resuelto", who: "Ameth", topic: "Funcionamiento lógico", time: 55,
    notes: [
      "Ejemplo resuelto. Datos: I0 = 0, I1 = 1, I2 = 1, I3 = 0. Selección: S1 = 1, S0 = 0. Por lo tanto los complementos valen S1' = 0 y S0' = 1.",
      "Escribimos la expresión completa del MUX 4:1.",
      "Sustituimos cada variable por su valor, término por término. Primer término: S1'·S0'·I0 = 0·1·0. Segundo: 0·0·1. Tercero: 1·1·1. Cuarto: 1·0·0.",
      "Resolvemos los productos: 0 + 0 + 1 + 0 = 1. Y = 1, que es exactamente I2: coincide con la tabla para S1S0 = 10.",
      "Otra combinación (como la que podría pedir la docente): S1S0 = 11. Ahora solo sobrevive el cuarto término: 1·1·I3 = I3 = 0, así que Y = 0 aunque I1 e I2 valgan 1."
    ],
    extra: "Truco para cualquier combinación: convertir S1S0 a decimal (k) y leer I_k. La expresión solo se usa para demostrarlo.",
    html: `
      <div class="kicker">Requisito 4 · ejemplo resuelto</div>
      <h1 class="title">Entradas → <em>salida</em>, paso a paso</h1>
      <div class="ex-data" data-in="0">
        <span class="chip">I<sub>0</sub> = 0</span><span class="chip">I<sub>1</sub> = 1</span><span class="chip">I<sub>2</sub> = 1</span><span class="chip">I<sub>3</sub> = 0</span>
        <span class="chip gold">S<sub>1</sub> = 1</span><span class="chip gold">S<sub>0</sub> = 0</span>
        <span class="chip muted">S<sub>1</sub>' = 0 · S<sub>0</sub>' = 1</span>
      </div>
      <div class="ex-grid formula">
        ${cell("Y =", "lhs", 1)}${TERMS.map((t, k) => (k ? cell("+", "op", 1) : "") + cell(`<span class="g">${t[0]}·${t[1]}</span>·${t[2]}`, "", 1, k === 2 ? "3" : "")).join("")}
        ${cell("=", "lhs", 2)}${SUBS.map((t, k) => (k ? cell("+", "op", 2) : "") + cell(`(${t[0]})(${t[1]})(${t[2]})`, k === 2 ? "key" : "", 2)).join("")}
        ${cell("=", "lhs", 3)}${RES.map((r, k) => (k ? cell("+", "op", 3) : "") + cell(r, k === 2 ? "key big" : "dim big", 3)).join("")}
      </div>
      <div class="ex-result panel" data-in="3"><span>Y = <b>1</b> = I<sub>2</sub></span><em>✓ coincide con la tabla (fila 10)</em></div>
      <div class="ex-alt panel" data-in="4"><span class="g">S<sub>1</sub>S<sub>0</sub> = 11</span> → solo queda 1·1·I<sub>3</sub> → <b>Y = I<sub>3</sub> = 0</b></div>`
  });
})();

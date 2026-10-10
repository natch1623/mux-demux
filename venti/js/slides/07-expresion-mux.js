/* 7 · Expresión booleana del MUX 4:1 construida término a término (punto 3) */
(function () {
  const T = [
    ["S<sub>1</sub>'", "S<sub>0</sub>'", "I<sub>0</sub>", "00"],
    ["S<sub>1</sub>'", "S<sub>0</sub>", "I<sub>1</sub>", "01"],
    ["S<sub>1</sub>", "S<sub>0</sub>'", "I<sub>2</sub>", "10"],
    ["S<sub>1</sub>", "S<sub>0</sub>", "I<sub>3</sub>", "11"]
  ];
  const term = (t, k) => `<span class="t" data-in="${k + 1}" data-at="${k + 1}"><span class="g">${t[0]}·${t[1]}</span>·<span class="act">${t[2]}</span></span>`;
  Deck.add({
    id: "expresion-mux", title: "Expresión booleana", who: "Ameth", topic: "Funcionamiento lógico", time: 55,
    notes: [
      "De la tabla sale la expresión. Y es una suma (OR) de cuatro productos (AND), uno por fila.",
      "Fila 00: el producto S1'·S0' vale 1 SOLO cuando S1 = 0 y S0 = 0. Multiplicado por I0, deja pasar I0 únicamente en esa combinación.",
      "Fila 01: S1'·S0·I1.",
      "Fila 10: S1·S0'·I2.",
      "Fila 11: S1·S0·I3.",
      "Cada producto tiene dos partes: la parte dorada «decodifica» la combinación de S (es un minterm de S) y la parte turquesa es el dato. Como en cada momento solo un minterm vale 1, solo un término puede ser distinto de 0, y la OR entrega ese término.",
      "Forma compacta: Y = Σ m_k · I_k, donde m_k es el minterm k de las líneas de selección. Esta misma forma sirve para cualquier MUX de 2^n entradas."
    ],
    extra: "Verificación rápida: S1S0=10 → S1'=0 anula los términos 1 y 2; S0=0 anula el 4; queda Y = 1·1·I2 = I2.",
    html: `
      <div class="kicker">Punto 3 · expresión booleana</div>
      <h1 class="title">Una suma de <em>caminos</em></h1>
      <div class="expr formula">
        <span class="lhs">Y =</span>
        ${T.map((t, k) => (k ? `<span class="op plus" data-in="${k + 1}">+</span>` : "") + term(t, k)).join("")}
      </div>
      <div class="expr-notes" data-in="5">
        <span class="n-and">AND: decodifica S y deja pasar un dato</span>
        <span class="n-or">OR: entrega el único término activo</span>
      </div>
      <div class="sop panel" data-in="6"><div class="formula">Y = <span class="sig">Σ</span> m<sub>k</sub> · I<sub>k</sub></div><p>m<sub>k</sub>: minterm k de las líneas de selección</p></div>
      <div class="mini-t panel" data-in="1">
        <table class="truth"><thead><tr><th>S<sub>1</sub>S<sub>0</sub></th><th class="out sep">término activo</th></tr></thead>
          <tbody>${T.map((t, k) => `<tr data-in="${k + 1}" data-at="${k + 1}"><td>${t[3]}</td><td class="o sep">${t[0]}·${t[1]}·${t[2]}</td></tr>`).join("")}</tbody></table>
      </div>
      <div class="says side">
        <p class="say" data-in="0" data-out="1">Un <b>producto</b> por fila de la tabla, todos sumados.</p>
${T.map((t, k) => `<p class="say" data-in="${k + 1}" data-out="${k + 2}"><span class="g">${t[0]}·${t[1]}</span> vale 1 solo cuando S<sub>1</sub>S<sub>0</sub> = ${t[3]}.</p>`).join("")}
        <p class="say" data-in="5" data-out="6">Solo <b>un</b> término puede valer 1 a la vez.</p>
        <p class="say" data-in="6">Vale para cualquier MUX de 2<sup>n</sup> entradas.</p>
      </div>`
  });
})();

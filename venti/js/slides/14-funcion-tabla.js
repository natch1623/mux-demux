/* 14 · MUX como generador de funciones I: de la tabla de verdad a las entradas (punto 7, requisito 4) */
(function () {
  const F = [0, 1, 1, 0, 0, 0, 1, 1];                 // F = Σm(1, 2, 6, 7)
  const ASSIGN = ["C", "C'", "0", "1"];
  const WHY = ["F = C", "F = C'", "siempre 0", "siempre 1"];
  Deck.add({
    id: "funcion-tabla", title: "MUX como generador de funciones", who: "Carlos", topic: "Funciones y aplicaciones", time: 60,
    notes: [
      "Un MUX también sirve para IMPLEMENTAR funciones booleanas. Ejemplo: F(A, B, C) = Σm(1, 2, 6, 7), una función de tres variables. Queremos hacerla con un solo MUX 4:1.",
      "Truco: dos variables (A y B) van a las líneas de selección: A a S1 y B a S0. Así, cada combinación de AB elige una entrada, y cada entrada «ve» un par de filas de la tabla, las que solo se diferencian en C.",
      "Par AB = 00 (filas 0 y 1): F vale 0 cuando C = 0 y 1 cuando C = 1. Es decir, F = C. Conectamos I0 = C.",
      "Par AB = 01 (filas 2 y 3): F vale 1 y luego 0, lo contrario de C: I1 = C'.",
      "Par AB = 10 (filas 4 y 5): F vale 0 en las dos: I2 = 0 (tierra).",
      "Par AB = 11 (filas 6 y 7): F vale 1 en las dos: I3 = 1 (Vcc).",
      "Regla general para cada par: (0,0) → 0; (1,1) → 1; igual a C → C; contrario a C → C'. Solo hay cuatro casos posibles, así que CUALQUIER función de 3 variables cabe en un MUX 4:1 más, como mucho, un inversor."
    ],
    extra: "Si la docente da otra función, por ejemplo Σm(0, 3, 5, 6): pares (1,0)→C', (0,1)→C, (0,1)→C, (1,0)→C'. Practicar con el simulador (modo FUNCIÓN), que deriva las entradas solo.",
    html: `
      <div class="kicker">Punto 7 · MUX como generador de funciones</div>
      <h1 class="title">F(A, B, C) = <em>Σm(1, 2, 6, 7)</em></h1>
      <div class="fn-table panel">
        <table class="truth"><thead><tr><th class="ab">A</th><th class="ab">B</th><th>C</th><th class="out sep">F</th><th class="sep pinh" data-in="1">entrada</th></tr></thead>
          <tbody>${F.map((f, m) => {
            const pair = m >> 1, first = m % 2 === 0;
            return `<tr class="pair${pair} ${first ? "first" : ""}" data-at="${pair + 2}"><td class="ab">${m >> 2}</td><td class="ab">${(m >> 1) & 1}</td><td>${m & 1}</td><td class="o sep ${f ? "" : "zero"}">${f}</td>${first ? `<td class="sep pin" rowspan="2"><span data-in="1">I<sub>${pair}</sub></span><span class="eq" data-in="${pair + 2}"> = <b>${ASSIGN[pair]}</b><small>${WHY[pair]}</small></span></td>` : ""}</tr>`;
          }).join("")}</tbody></table>
      </div>
      <div class="ab-map" data-in="1"><span class="chip gold">A → S<sub>1</sub></span><span class="chip gold">B → S<sub>0</sub></span><span class="chip">C → datos</span></div>
      <div class="rules panel" data-in="6">
        <h3>Regla para cada par</h3>
        <div><span>0, 0</span><b>0</b></div><div><span>1, 1</span><b>1</b></div><div><span>0, 1</span><b>C</b></div><div><span>1, 0</span><b>C'</b></div>
      </div>
      <div class="says side">
        <p class="say" data-in="0" data-out="1">Objetivo: esta función con <b>un solo MUX 4:1</b>.</p>
        <p class="say" data-in="1" data-out="2">A y B a la <span class="g">selección</span>: cada par de filas es una entrada.</p>
        ${[0, 1, 2, 3].map(k => `<p class="say" data-in="${k + 2}" data-out="${k + 3}">Par ${k >> 1}${k & 1}: ${WHY[k]} → <b>I<sub>${k}</sub> = ${ASSIGN[k]}</b>.</p>`).join("")}
      </div>`
  });
})();

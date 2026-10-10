/* 6 · Tabla de funcionamiento del MUX 4:1 (punto 3 del Equipo 3) */
(function () {
  const IY = [380, 480, 580, 680];
  const mini = () => `
    <svg class="mini logic" viewBox="0 0 1920 1080">
      ${IY.map((y, k) => `<path class="w base in${k}" d="M1080 ${y} L1250 ${y}"/><text x="1050" y="${y}" text-anchor="end" class="iname">I<tspan font-size="0.65em" dy="0.3em">${k}</tspan></text>`).join("")}
      <path class="body3" d="M1250 330 L1450 430 L1450 630 L1250 730 Z"/>
      ${IY.map((y, k) => `<path class="route" data-at="${k + 1}" d="M1250 ${y} C 1340 ${y}, 1370 530, 1450 530"/>`).join("")}
      <path class="w base yout" d="M1450 530 L1620 530"/><text x="1650" y="530" class="yname">Y</text>
      <path class="w s" d="M1325 693 L1325 800 M1375 668 L1375 800"/>
      <text x="1300" y="840" text-anchor="end" class="g">S<tspan font-size="0.65em" dy="0.3em">1</tspan></text>
      <text x="1400" y="840" text-anchor="start" class="g">S<tspan font-size="0.65em" dy="0.3em">0</tspan></text>
    </svg>`;
  const ROWS = [["0", "0", 0], ["0", "1", 1], ["1", "0", 2], ["1", "1", 3]];
  Deck.add({
    id: "tabla-mux", title: "Tabla de funcionamiento", who: "Ameth", topic: "Funcionamiento lógico", time: 55,
    notes: [
      "Ahora la parte formal. Esta es la tabla de funcionamiento del MUX 4:1: a la izquierda las líneas de selección, a la derecha la salida.",
      "Fila 1: S1 = 0 y S0 = 0. El camino que se abre es el de I0, entonces Y = I0.",
      "Fila 2: S1S0 = 01 → Y = I1.",
      "Fila 3: S1S0 = 10 → Y = I2.",
      "Fila 4: S1S0 = 11 → Y = I3.",
      "Detalle técnico: es una tabla «comprimida». En la columna Y no ponemos 0 o 1 sino el nombre de una entrada. La tabla de verdad completa tendría 6 variables (S1, S0, I0…I3): 2^6 = 64 filas. La comprimida dice lo mismo en 4."
    ],
    extra: "Si preguntan: ¿por qué no se usa la tabla de 64 filas? → porque Y solo depende de UNA entrada por fila; las otras 3 son «no importa» para esa combinación de S.",
    html: `
      <div class="kicker">Punto 3 · tabla de funcionamiento</div>
      <h1 class="title">¿Qué entrada <em>llega a Y</em>?</h1>
      <div class="tbl panel big-table">
        <table class="truth"><thead><tr><th>S<sub>1</sub></th><th>S<sub>0</sub></th><th class="out sep">Y</th></tr></thead>
        <tbody>${ROWS.map((r, i) => `<tr data-in="${i + 1}" data-at="${i + 1}"><td>${r[0]}</td><td>${r[1]}</td><td class="o sep">I<sub>${r[2]}</sub></td></tr>`).join("")}</tbody></table>
      </div>
      ${mini()}
      <div class="says">
        <p class="say" data-in="0" data-out="1">Entradas de control a la izquierda, <b>salida</b> a la derecha.</p>
        ${ROWS.map((r, i) => `<p class="say" data-in="${i + 1}" data-out="${i + 2}"><span class="g">${r[0]}${r[1]}</span> → se abre el camino de <b>I<sub>${r[2]}</sub></b>.</p>`).join("")}
        <p class="say" data-in="5">Tabla comprimida: Y es <b>una entrada</b>, no un 0/1 fijo. Completa: 2<sup>6</sup> = 64 filas.</p>
      </div>`
  });
})();

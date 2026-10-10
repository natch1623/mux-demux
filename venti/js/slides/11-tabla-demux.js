/* 11 · Tabla de funcionamiento y expresiones del DEMUX 1:4 (punto 6) */
(function () {
  const EQ = ["D·S<sub>1</sub>'·S<sub>0</sub>'", "D·S<sub>1</sub>'·S<sub>0</sub>", "D·S<sub>1</sub>·S<sub>0</sub>'", "D·S<sub>1</sub>·S<sub>0</sub>"];
  Deck.add({
    id: "tabla-demux", title: "Tabla y expresiones del DEMUX", who: "Jonathan", topic: "DEMUX y diseño", time: 55,
    notes: [
      "La tabla de funcionamiento del DEMUX tiene las mismas cuatro combinaciones de selección, pero ahora hay cuatro columnas de salida.",
      "Fila 00: Y0 recibe el dato D y las otras valen 0. De ahí sale la ecuación: Y0 = D·S1'·S0'.",
      "Fila 01: Y1 = D·S1'·S0.",
      "Fila 10: Y2 = D·S1·S0'.",
      "Fila 11: Y3 = D·S1·S0.",
      "Observen el patrón: cada salida es D multiplicado (AND) por un minterm de S. Si quitamos D, son las ecuaciones de un decodificador 2 a 4. Por eso en la práctica el mismo chip (74HC139 o 74HC155) se usa como decodificador o como DEMUX, metiendo el dato por la entrada de habilitación."
    ],
    extra: "Comparación con el MUX: en el MUX hay UNA ecuación con 4 términos sumados; en el DEMUX hay CUATRO ecuaciones de un solo término cada una.",
    html: `
      <div class="kicker">Punto 6 · tabla y expresiones</div>
      <h1 class="title">¿A qué salida <em>va D</em>?</h1>
      <div class="tbl panel dmx-table">
        <table class="truth"><thead><tr><th>S<sub>1</sub></th><th>S<sub>0</sub></th><th class="out sep">Y<sub>0</sub></th><th class="out">Y<sub>1</sub></th><th class="out">Y<sub>2</sub></th><th class="out">Y<sub>3</sub></th><th class="out sep eqh">expresión</th></tr></thead>
        <tbody>${[0, 1, 2, 3].map(r => `<tr data-in="${r + 1}" data-at="${r + 1}"><td>${r >> 1}</td><td>${r & 1}</td>${[0, 1, 2, 3].map(c => `<td class="${c === 0 ? "sep " : ""}${c === r ? "o" : "zero"}">${c === r ? "D" : "0"}</td>`).join("")}<td class="sep eq">Y<sub>${r}</sub> = ${EQ[r]}</td></tr>`).join("")}</tbody></table>
      </div>
      <div class="says">
        <p class="say" data-in="0" data-out="1">Misma selección, ahora <b>cuatro</b> salidas.</p>
        ${[0, 1, 2, 3].map(r => `<p class="say" data-in="${r + 1}" data-out="${r + 2}"><span class="g">${r >> 1}${r & 1}</span> → Y<sub>${r}</sub> = D; las demás valen <b>0</b>.</p>`).join("")}
        <p class="say" data-in="5">Cada salida = <b>D AND un minterm de S</b>: un decodificador con dato.</p>
      </div>`
  });
})();

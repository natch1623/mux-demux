/* 5 · Relación entre entradas y líneas de selección: 2^n (punto 4 del Equipo 3) */
(function () {
  const X0 = 1250, X1 = 380, Y0 = 260, H = 660;
  const CODES = { 1: "1", 2: "10", 3: "101", 4: "1011" };
  function tree(n) {
    const dx = (X0 - X1) / n;
    const node = (L, j) => [X0 - L * dx, Y0 + ((j + 0.5) * H) / (1 << L)];
    const code = CODES[n];
    // nodos del camino elegido (MSB en la raíz, como en un árbol de MUX 2:1)
    const hot = new Set(); let j = 0; hot.add("0,0");
    for (let L = 0; L < n; L++) { j = 2 * j + +code[L]; hot.add(L + 1 + "," + j); }
    let edges = "", nodes = "", labels = "";
    for (let L = 0; L < n; L++) {
      for (let k = 0; k < 1 << L; k++) {
        const [px, py] = node(L, k);
        [2 * k, 2 * k + 1].forEach(c => {
          const [cx, cy] = node(L + 1, c);
          const isHot = hot.has(L + "," + k) && hot.has(L + 1 + "," + c);
          edges += `<path pathLength="1" class="edge draw ${isHot ? "hot" : ""}" style="transition-delay:${L * 140}ms" d="M${px} ${py} C ${px - dx / 2} ${py}, ${cx + dx / 2} ${cy}, ${cx} ${cy}"/>`;
        });
        nodes += `<circle class="node ${hot.has(L + "," + k) ? "hot" : ""}" cx="${px}" cy="${py}" r="${Math.max(6, 13 - n * 1.5)}"/>`;
      }
      labels += `<text class="lvl" x="${X0 - (L + 0.5) * dx}" y="${Y0 - 40}">S<tspan font-size="0.65em" dy="0.3em">${n - 1 - L}</tspan><tspan dy="-0.3em"> = ${code[L]}</tspan></text>`;
    }
    const leaves = 1 << n, leafCode = parseInt(code, 2);
    for (let k = 0; k < leaves; k++) {
      const [lx, ly] = node(n, k);
      nodes += `<circle class="leaf ${k === leafCode ? "hot" : ""}" cx="${lx}" cy="${ly}" r="${Math.max(7, 16 - n * 2)}"/>`;
      nodes += `<text class="lname ${k === leafCode ? "hot" : ""}" x="${lx - 26}" y="${ly}">I<tspan font-size="0.65em" dy="0.3em">${k}</tspan></text>`;
    }
    return `<g class="tree t${n}" data-in="${n - 1}" ${n < 4 ? `data-out="${n}"` : ""}>${labels}${edges}${nodes}
      <path class="w base" d="M${X0} ${Y0 + H / 2} L${X0 + 80} ${Y0 + H / 2}"/><text class="yname" x="${X0 + 100}" y="${Y0 + H / 2}">Y</text></g>`;
  }

  Deck.add({
    id: "relacion", title: "Entradas y líneas de selección", who: "Ana", topic: "Fundamentos", time: 45,
    notes: [
      "¿Por qué el MUX 4:1 tiene exactamente dos líneas de selección? Empecemos con una: un bit solo puede decir 0 o 1, así que elige entre 2 entradas.",
      "Con dos bits hay cuatro códigos (00, 01, 10, 11): cuatro entradas. Cada bit nuevo duplica el árbol de caminos.",
      "Con tres líneas, 8 entradas: el MUX 8:1 (como el 74HC151). Leyendo el camino dorado: S2S1S0 = 101 elige I5.",
      "Con cuatro líneas, 16 entradas (74150). El número de entradas crece como potencia de 2.",
      "Relación general: entradas = 2^n, o al revés n = log2(entradas). Si las entradas no son potencia de 2, por ejemplo 6, se redondea hacia arriba: n = 3 y sobran 2 códigos sin usar."
    ],
    extra: "Pregunta posible: ¿cuántas líneas necesita un MUX de 32 entradas? → log2 32 = 5. ¿Y de 10 entradas? → ⌈log2 10⌉ = 4 (sobran 6 códigos).",
    html: `
      <div class="kicker">Punto 4 · relación 2<sup>n</sup></div>
      <h1 class="title">Cada línea <em>duplica</em> las entradas</h1>
      <svg class="trees logic" viewBox="0 0 1920 1080">${[1, 2, 3, 4].map(tree).join("")}</svg>
      <div class="pow panel">
        <table class="truth"><thead><tr><th>n líneas</th><th class="out">entradas</th></tr></thead>
          <tbody>${[1, 2, 3, 4].map(n => `<tr data-in="${n - 1}" data-at="${n - 1}"><td>${n}</td><td class="o">2<sup>${n}</sup> = ${1 << n}</td></tr>`).join("")}</tbody></table>
      </div>
      <div class="pow-law panel" data-in="4">
        <div class="formula">entradas = 2<sup>n</sup> <span class="op">⇔</span> n = log<sub>2</sub>(entradas)</div>
        <p>¿6 entradas? → <b>n = 3</b>; sobran 2 códigos.</p>
      </div>`
  });
})();

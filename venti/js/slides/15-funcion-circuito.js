/* 15 · MUX como generador de funciones II: circuito en 3D y comprobación fila por fila */
(function () {
  const F = [0, 1, 1, 0, 0, 0, 1, 1];                       // F = Σm(1, 2, 6, 7)
  const dataFor = C => [C, 1 - C, 0, 1];                      // I0 = C, I1 = C', I2 = 0, I3 = 1
  const muxY = m => dataFor(m & 1)[m >> 1];                   // sel = 2A + B
  const NAMES = ["I<sub>0</sub> = C", "I<sub>1</sub> = C'", "I<sub>2</sub> = 0", "I<sub>3</sub> = 1"];

  function showRow(ctx, m, upto) {
    ctx.qa(".vf tbody tr").forEach((tr, k) => {
      tr.classList.toggle("now", k === m);
      tr.classList.toggle("done", k <= upto);
      tr.querySelector(".y").textContent = k <= upto ? muxY(k) : "·";
      tr.querySelector(".ok").textContent = k <= upto ? (muxY(k) === F[k] ? "✓" : "✗") : "";
    });
    const ok = F.filter((f, k) => k <= upto && muxY(k) === f).length;
    ctx.q(".vf-score").textContent = upto < 0 ? "" : `${ok}/${upto + 1}`;
    ctx.q(".abc").innerHTML = m < 0 ? "" : `A B C = <b>${m >> 2} ${(m >> 1) & 1} ${m & 1}</b>`;
    ctx.root.dispatchEvent(new CustomEvent("fnrow", { detail: m }));
  }

  Deck.add({
    id: "funcion-circuito", title: "Comprobación de la función", who: "Carlos", topic: "Funciones y aplicaciones", time: 60,
    cam: { x: 1.4, y: -0.9, z: 0.3, lx: 0.8, ly: -0.2 },
    notes: [
      "Este es el circuito: A va a S1, B a S0, y las entradas de datos reciben C, C' (con un inversor), 0 (tierra) y 1 (Vcc).",
      "Comprobemos las 8 filas. Para cada ABC, el MUX elige la entrada 2A + B y entrega su valor. Por ejemplo ABC = 011: se elige I1 = C' = 0, y F(011) = 0. Coincide. Así con las ocho.",
      "Resultado: 8 de 8 coinciden. Con un MUX 4:1 y un inversor reemplazamos el circuito de compuertas de la función. En general, un MUX con n líneas de selección implementa cualquier función de n + 1 variables. Así funcionan las LUT de las FPGA."
    ],
    extra: "Si preguntan «¿y si usamos un MUX 8:1?» → A, B y C van a la selección y las 8 entradas reciben directamente la columna F (0 o 1); no hace falta inversor.",
    html: `
      <div class="kicker">Punto 7 · comprobación animada</div>
      <h1 class="title">¿El MUX <em>coincide</em> con F?</h1>
      <div class="abc chip"></div>
      <div class="vf panel">
        <table class="truth"><thead><tr><th>A</th><th>B</th><th>C</th><th class="sep">F</th><th class="out">Y<small> MUX</small></th><th></th></tr></thead>
          <tbody>${F.map((f, m) => `<tr><td>${m >> 2}</td><td>${(m >> 1) & 1}</td><td>${m & 1}</td><td class="sep">${f}</td><td class="o y">·</td><td class="ok"></td></tr>`).join("")}</tbody></table>
        <div class="vf-score"></div>
      </div>
      <div class="says side left">
        <p class="say" data-in="0" data-out="1"><span class="g">A → S<sub>1</sub>, B → S<sub>0</sub></span>; los datos reciben C, C', 0, 1.</p>
        <p class="say" data-in="1" data-out="2">Fila por fila: <b>Y del MUX = F</b>.</p>
        <p class="say" data-in="2"><b>8/8 ✓</b> · un MUX con n líneas hace cualquier función de <b>n + 1</b> variables.</p>
      </div>`,
    onPhase(ctx, p) {
      if (p === 0) showRow(ctx, -1, -1);
      if (p === 1) {
        if (ctx.calm) { showRow(ctx, 7, 7); return; }
        let m = 0; showRow(ctx, 0, 0);
        ctx.every(() => { if (m < 7) { m++; showRow(ctx, m, m); } }, 900);
      }
      if (p === 2) showRow(ctx, 7, 7);
    },
    scene(ctx) {
      const rig = ctx.rig({ type: "mux", at: [1270, 560], scale: 0.84, title: "MUX 4:1", inNames: NAMES });
      rig.set({ sel: 0, data: dataFor(0), live: false });
      const onRow = e => { const m = e.detail; if (m < 0) rig.set({ live: false, sel: 0, data: dataFor(0) }); else rig.set({ live: true, sel: m >> 1, data: dataFor(m & 1) }); };
      ctx.root.addEventListener("fnrow", onRow);
      ctx.onDispose(() => ctx.root.removeEventListener("fnrow", onRow));
      return {
        setPhase(p) {
          rig.showAll(true);
          if (p === 0) rig.set({ live: false, sel: 0, data: dataFor(0) });
          if (p === 2) rig.set({ live: true, sel: 3, data: dataFor(1) });
        }
      };
    }
  });
})();

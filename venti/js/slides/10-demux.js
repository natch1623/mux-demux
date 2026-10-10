/* 10 · Demultiplexor 1 a 4 en 3D (punto 5 del Equipo 3): el espejo del MUX */
(function () {
  const SEL = [0, 0, 0, 0, 1, 2, 3, 3];
  const D = [1, 1, 1, 1, 1, 1, 1, 0];
  Deck.add({
    id: "demux", title: "Demultiplexor 1 a 4", who: "Jonathan", topic: "DEMUX y diseño", time: 65,
    cam: { x: 1.6, y: -1.1, z: 0.4, lx: 0.9, ly: -0.25 },
    notes: [
      "El demultiplexor es el espejo del MUX: tiene UNA entrada de datos, D, y la va a repartir.",
      "Tiene cuatro salidas, Y0 a Y3. El símbolo está invertido: lado angosto a la entrada, ancho a las salidas.",
      "Igual que el MUX, dos líneas de selección S1 y S0 deciden el camino. Con 2 líneas → 4 salidas (la misma relación 2^n).",
      "S1S0 = 00: el dato D = 1 viaja a Y0. Las otras salidas quedan en 0.",
      "01: D va a Y1.",
      "10: D va a Y2.",
      "11: D va a Y3.",
      "Si D = 0, la salida elegida también vale 0: todas quedan en 0. Por eso decimos que el DEMUX «copia D en la salida elegida»; las no elegidas siempre valen 0 (no guardan su valor anterior, no hay memoria)."
    ],
    extra: "Pregunta posible: ¿cuál es la diferencia entre DEMUX y decodificador? → Un decodificador 2→4 activa la salida elegida con 1 fijo; el DEMUX hace lo mismo pero el valor es D. Si D = 1 fijo, un DEMUX es un decodificador.",
    html: `
      <div class="kicker">Punto 5 · demultiplexor 1 a 4</div>
      <h1 class="title">DEMUX <em>1 a 4</em></h1>
      <div class="readout panel left" data-in="3">
        <div class="ro-row"><span class="gold">S<sub>1</sub>S<sub>0</sub></span><b class="bits">00</b></div>
        <div class="ro-row small"><span class="muted">en decimal</span><b class="dec">0</b></div>
        <div class="ro-row big"><span>Y<sub class="k">0</sub> = D =</span><b class="yv">1</b></div>
        <div class="ro-row small"><span class="muted">las demás salidas</span><b>0</b></div>
      </div>
      <div class="says side left">
        <p class="say" data-in="0" data-out="1">Una sola entrada de <b>datos</b>: D.</p>
        <p class="say" data-in="1" data-out="2">Cuatro <b>salidas</b>: Y<sub>0</sub> … Y<sub>3</sub>.</p>
        <p class="say" data-in="2" data-out="3">Las mismas líneas de <span class="g">selección</span>: S<sub>1</sub>, S<sub>0</sub>.</p>
        <p class="say" data-in="3" data-out="4">00 → D llega a <b>Y<sub>0</sub></b>.</p>
        <p class="say" data-in="4" data-out="5">01 → D llega a <b>Y<sub>1</sub></b>.</p>
        <p class="say" data-in="5" data-out="6">10 → D llega a <b>Y<sub>2</sub></b>.</p>
        <p class="say" data-in="6" data-out="7">11 → D llega a <b>Y<sub>3</sub></b>.</p>
        <p class="say" data-in="7">Si D = 0, <b>todas</b> las salidas valen 0.</p>
      </div>`,
    onPhase(ctx, p) {
      const s = SEL[p];
      ctx.q(".bits").textContent = ((s >> 1) & 1) + "" + (s & 1);
      ctx.q(".dec").textContent = s; ctx.q(".k").textContent = s;
      ctx.q(".yv").textContent = D[p]; ctx.q(".yv").classList.toggle("one", !!D[p]);
    },
    scene(ctx) {
      const rig = ctx.rig({ type: "demux", at: [1300, 560], scale: 0.86, title: "DEMUX 1:4" });
      return {
        setPhase(p) {
          rig.show({ inputs: true, labels: true, body: p >= 1, output: p >= 1, select: p >= 2, routes: p >= 3 });
          rig.set({ sel: SEL[p], d: D[p], live: p >= 3 });
        }
      };
    }
  });
})();

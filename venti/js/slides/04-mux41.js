/* 4 · MUX 4 a 1 en 3D: entradas, líneas de selección y salida (punto 2 del Equipo 3) */
(function () {
  const DATA = [1, 0, 1, 1];
  const SEL_BY_PHASE = [0, 0, 0, 0, 1, 2, 3, 2];
  Deck.add({
    id: "mux41", title: "Multiplexor 4 a 1", who: "Ana", topic: "Fundamentos", time: 65,
    cam: { x: -1.6, y: -1.1, z: 0.4, lx: -0.9, ly: -0.25 },
    notes: [
      "El MUX 4 a 1 tiene cuatro entradas de DATOS: I0, I1, I2 e I3. Cada una trae un bit (aquí 1, 0, 1, 1).",
      "Tiene UNA sola salida, Y. El cuerpo es el símbolo trapezoidal: el lado ancho recibe las entradas, el angosto entrega la salida.",
      "Abajo están las dos líneas de SELECCIÓN, S1 y S0 (las cuerdas doradas). No son datos: son control. S1 es el bit más significativo.",
      "Con S1S0 = 00 la compuerta abre el camino de I0: Y copia a I0, que vale 1. Las demás entradas están, pero se ignoran.",
      "Con 01 pasa I1. Ojo: I1 vale 0, así que Y = 0. El MUX no «busca unos»: copia lo que haya en la entrada elegida.",
      "Con 10 (dos en decimal) pasa I2 = 1.",
      "Con 11 (tres) pasa I3 = 1.",
      "Regla general: Y es la entrada cuyo número es el código binario S1S0. Eso es multiplexar: la selección decide, los datos solo viajan."
    ],
    extra: "Si preguntan «¿qué pasa si dos entradas valen 1?» → no importa: solo pasa la elegida. «¿Y si S cambia?» → Y cambia a la nueva entrada (ver limitaciones: glitch).",
    html: `
      <div class="kicker">Punto 2 · multiplexor 4 a 1</div>
      <h1 class="title">MUX <em>4 a 1</em></h1>
      <div class="flat-note" aria-hidden="true"></div>
      <div class="readout panel" data-in="3">
        <div class="ro-row"><span class="gold">S<sub>1</sub>S<sub>0</sub></span><b class="bits">00</b></div>
        <div class="ro-row small"><span class="muted">en decimal</span><b class="dec">0</b></div>
        <div class="ro-row big"><span>Y = I<sub class="k">0</sub> =</span><b class="yv">1</b></div>
      </div>
      <div class="says side">
        <p class="say" data-in="0" data-out="1">Cuatro entradas de <b>datos</b>: I<sub>0</sub> … I<sub>3</sub>.</p>
        <p class="say" data-in="1" data-out="2">Una sola <b>salida</b>: Y.</p>
        <p class="say" data-in="2" data-out="3">Dos líneas de <span class="g">selección</span>: S<sub>1</sub> y S<sub>0</sub>.</p>
        <p class="say" data-in="3" data-out="4">00 → solo <b>I<sub>0</sub></b> llega a Y.</p>
        <p class="say" data-in="4" data-out="5">01 → pasa I<sub>1</sub>, aunque valga <b>0</b>.</p>
        <p class="say" data-in="5" data-out="6">10 → pasa I<sub>2</sub>.</p>
        <p class="say" data-in="6" data-out="7">11 → pasa I<sub>3</sub>.</p>
        <p class="say" data-in="7">Y copia la entrada cuyo número es <span class="g">S<sub>1</sub>S<sub>0</sub></span> en binario.</p>
      </div>`,
    onPhase(ctx, p) {
      const sel = SEL_BY_PHASE[p];
      ctx.q(".bits").textContent = ((sel >> 1) & 1) + "" + (sel & 1);
      ctx.q(".dec").textContent = sel;
      ctx.q(".k").textContent = sel;
      ctx.q(".yv").textContent = DATA[sel];
      ctx.q(".yv").classList.toggle("one", !!DATA[sel]);
    },
    scene(ctx) {
      const rig = ctx.rig({ type: "mux", at: [690, 560], scale: 0.88, title: "MUX 4:1" });
      rig.set({ sel: 0, data: DATA });
      return {
        setPhase(p) {
          rig.show({ inputs: p >= 0, labels: true, body: p >= 1, output: p >= 1, select: p >= 2, routes: p >= 3 });
          rig.set({ sel: SEL_BY_PHASE[p], data: DATA, live: p >= 3 });
        }
      };
    }
  });
})();

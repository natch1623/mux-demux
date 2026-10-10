/* 13 · Limitaciones y otras combinaciones (lo que la docente puede preguntar) */
(function () {
  const wave = (pts, y0, cls) => `<path class="wv ${cls || ""}" d="M${pts.map(([x, v]) => `${x} ${y0 - v * 46}`).join(" L")}"/>`;
  Deck.add({
    id: "limitaciones", title: "Limitaciones", who: "Jonathan", topic: "DEMUX y diseño", time: 60,
    notes: [
      "Primera limitación: un MUX deja pasar UNA entrada por vez. Las otras se ignoran; si su dato cambia mientras no están seleccionadas, ese cambio se pierde, a menos que el sistema las vaya turnando lo bastante rápido.",
      "Segunda: el «glitch». Al pasar de S1S0 = 01 a 10 cambian dos bits. Si S1 sube unos nanosegundos antes de que S0 baje, por un instante el código es 11 y Y muestra I3. Aquí I1 = I2 = 0 e I3 = 1: aparece un pulso falso. Por eso en sistemas síncronos se cambia S y se lee Y después de que se estabiliza.",
      "Tercera: los chips reales tienen una entrada de habilitación. En el 74HC153 es E' (activa en bajo): si E' = 1, Y = 0 sin importar S ni los datos. Sirve para apagar el MUX o para conectar varios en cascada.",
      "Cuarta: para más entradas se conectan en cascada. Un MUX 8:1 se arma con dos MUX 4:1 (S1 y S0 compartidas) y un MUX 2:1 controlado por S2. Funciona, pero cada nivel añade retardo de propagación."
    ],
    extra: "Otras preguntas: ¿Puede un MUX funcionar al revés como DEMUX? → En digital no (las compuertas tienen dirección); los MUX analógicos como el CD4051 sí son bidireccionales.",
    html: `
      <div class="kicker">Limitaciones · combinaciones fuera del ejemplo</div>
      <h1 class="title">Lo que el ejemplo <em>no muestra</em></h1>
      <div class="lim-grid">
        <section class="lim panel" data-in="0">
          <video class="lim-clip" src="assets/video/una-a-la-vez.mp4" muted playsinline preload="auto" aria-hidden="true"></video>
          <h3>1 · Una entrada a la vez</h3>
          <svg viewBox="0 0 560 170" class="logic">
            ${[0, 1, 2, 3].map(k => `<circle cx="40" cy="${25 + k * 40}" r="13" class="${k === 2 ? "lv-on" : "lv-off"}"/><path class="w ${k === 2 ? "v1" : "base"}" d="M53 ${25 + k * 40} L220 85"/>`).join("")}
            <path class="w v1" d="M220 85 L520 85"/><text x="300" y="130" class="m">3 de 4 esperan</text>
          </svg>
          <p>Las no elegidas se <b>ignoran</b>: si no esperan su turno, su dato se pierde.</p>
        </section>
        <section class="lim panel" data-in="1">
          <video class="lim-clip" src="assets/video/glitch.mp4" muted playsinline preload="auto" aria-hidden="true"></video>
          <h3>2 · Glitch al cambiar S</h3>
          <svg viewBox="0 0 560 210" class="logic">
            <text x="20" y="40" class="g">S<tspan font-size="0.65em" dy="0.3em">1</tspan></text>${wave([[70, 0], [250, 0], [250, 1], [540, 1]], 60, "s")}
            <text x="20" y="110" class="g">S<tspan font-size="0.65em" dy="0.3em">0</tspan></text>${wave([[70, 1], [300, 1], [300, 0], [540, 0]], 130, "s")}
            <text x="20" y="180" class="a">Y</text>${wave([[70, 0], [250, 0], [250, 1], [300, 1], [300, 0], [540, 0]], 200, "y")}
            <rect class="gl" x="244" y="8" width="62" height="200" rx="8"/><text x="330" y="168" class="err-t">pulso falso: I<tspan font-size="0.65em" dy="0.3em">3</tspan></text>
          </svg>
          <p>Si S<sub>1</sub> y S<sub>0</sub> no cambian juntos, Y muestra <b>otra entrada</b> por nanosegundos.</p>
        </section>
        <section class="lim panel" data-in="2">
          <video class="lim-clip" src="assets/video/habilitacion.mp4" muted playsinline preload="auto" aria-hidden="true"></video>
          <h3>3 · Habilitación E'</h3>
          <div class="en-demo"><span class="chip">E' = 1</span><span class="arrow">→</span><span class="chip">Y = 0 siempre</span></div>
          <div class="en-demo"><span class="chip ok">E' = 0</span><span class="arrow">→</span><span class="chip ok">Y = I<sub>k</sub></span></div>
          <p>74HC153: E' activa en bajo. Sirve para <b>apagar</b> el MUX o encadenar varios.</p>
        </section>
        <section class="lim panel" data-in="3">
          <video class="lim-clip" src="assets/video/cascada.mp4" muted playsinline preload="auto" aria-hidden="true"></video>
          <h3>4 · Expansión en cascada</h3>
          <svg viewBox="0 0 560 190" class="logic">
            <path class="gate" d="M60 10 L150 40 L150 100 L60 130 Z" transform="translate(0,-4) scale(1,.62)"/>
            <path class="gate" d="M60 10 L150 40 L150 100 L60 130 Z" transform="translate(0,96) scale(1,.62)"/>
            <text x="105" y="40" class="m" text-anchor="middle">4:1</text><text x="105" y="140" class="m" text-anchor="middle">4:1</text>
            <path class="w base" d="M150 40 L250 40 L250 70 L300 70 M150 140 L250 140 L250 110 L300 110"/>
            <path class="gate" d="M300 50 L380 75 L380 105 L300 130 Z"/><text x="340" y="92" class="m" text-anchor="middle">2:1</text>
            <path class="w v1" d="M380 90 L460 90"/><text x="475" y="92" class="a">Y</text>
            <path class="w s" d="M340 125 L340 175"/><text x="356" y="172" class="g">S<tspan font-size="0.65em" dy="0.3em">2</tspan></text>
            
          </svg>
          <p>8:1 = dos 4:1 (S<sub>1</sub>S<sub>0</sub> comunes) + un 2:1 (S<sub>2</sub>). Más niveles → <b>más retardo</b>.</p>
        </section>
      </div>`,
    // Cada fase amplía su panel y reproduce su clip (motion/, Remotion → assets/video/).
    // Con animaciones mínimas se muestra el cuadro final, que resume el efecto.
    onPhase(ctx, p) {
      ctx.q(".lim-grid").dataset.focus = p;
      ctx.qa(".lim-clip").forEach((v, k) => {
        if (k !== p) { v.pause(); return; }
        const show = () => {
          if (ctx.calm) { v.pause(); v.currentTime = Math.max(0, v.duration - 0.05); return; }
          v.currentTime = 0;
          const pr = v.play(); if (pr) pr.catch(() => {});
        };
        if (v.readyState >= 1) show(); else v.addEventListener("loadedmetadata", show, { once: true });
      });
    },
    onLeave(ctx) { ctx.qa(".lim-clip").forEach(v => v.pause()); }
  });
})();

"use strict";
/* =====================================================================
   Sonido de toda la presentación: síntesis propia con Web Audio (sin música,
   voces ni archivos externos; funciona sin red).
   - Ambiente por mundo (muy bajo) y del HUB.
   - Puente: pulso que viaja, clics de S₁/S₀, ruta fijada, regreso.
   - Entradas, salidas y las cuatro transiciones internas de cada mundo.
   - Aparición de partes, toques, libro del anexo, alejamiento final y ending.
   Empieza activado: el navegador solo permite sonar después del primer toque o
   tecla, así que el contexto se abre con esa primera interacción. El botón ♪
   silencia o activa (se recuerda en este navegador). «Omitir transición» (Esc)
   corta los sonidos de la secuencia en curso.
   ===================================================================== */
const SONIDO = (() => {
  const CLAVE = "muxdemux-sonido";
  let ac = null, master = null, bus = null, reverb = null, secuencia = null, amb = null, ambTema = null;
  let activo = store.get(CLAVE, true);
  const ahora = () => ac.currentTime;

  /* ---------- motor ---------- */
  function abrir() {
    if (ac) { if (ac.state !== "running") ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = activo ? .8 : 0;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ac.destination);
    // reverberación corta generada (sala)
    reverb = ac.createConvolver();
    const L = ac.sampleRate * 1.6, ir = ac.createBuffer(2, L, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3); }
    reverb.buffer = ir;
    const rv = ac.createGain(); rv.gain.value = .22; reverb.connect(rv); rv.connect(master);
    bus = ac.createGain(); bus.connect(master); bus.connect(reverb);
    if (ambTema) ambiente(ambTema, true);
  }
  ["pointerdown", "keydown", "touchstart"].forEach(t => addEventListener(t, abrir, { capture: true, passive: true }));

  let ruido = null;
  function bufRuido() {
    if (ruido) return ruido;
    const L = ac.sampleRate * 2; ruido = ac.createBuffer(1, L, ac.sampleRate);
    const d = ruido.getChannelData(0); for (let i = 0; i < L; i++) d[i] = Math.random() * 2 - 1;
    return ruido;
  }
  // destino de una voz: la secuencia en curso (si hay) o el bus general
  const destino = () => secuencia || bus;
  /* tono: { f, f2, tipo, t, d, v, ataque, dest, filtro } */
  function tono({ f = 440, f2 = null, tipo = "sine", t = 0, d = .3, v = .2, ataque = .005, dest, q = 0, corte = null }) {
    t /= RITMO.k; d /= RITMO.k;                       // el viaje acelerado también acelera su sonido
    const t0 = ahora() + t, o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + d);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + ataque); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    let n = o;
    if (corte) { const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = corte; fl.Q.value = q; o.connect(fl); n = fl; }
    n.connect(g); g.connect(dest || destino());
    o.start(t0); o.stop(t0 + d + .05);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  /* ruido filtrado: { t, d, v, tipo (bandpass…), f, f2, q, ataque } */
  function soplo({ t = 0, d = .5, v = .2, tipo = "bandpass", f = 1000, f2 = null, q = 1, ataque = .02, dest, cola = null }) {
    t /= RITMO.k; d /= RITMO.k; if (cola != null) cola /= RITMO.k;
    const t0 = ahora() + t, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = bufRuido(); s.loop = true; s.playbackRate.value = .9 + Math.random() * .2;
    fl.type = tipo; fl.Q.value = q; fl.frequency.setValueAtTime(f, t0);
    if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + d);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + ataque);
    g.gain.setValueAtTime(v, t0 + Math.max(ataque, d - (cola ?? d * .6)));
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    s.connect(fl); fl.connect(g); g.connect(dest || destino());
    s.start(t0, Math.random()); s.stop(t0 + d + .05);
    s.onended = () => { s.disconnect(); fl.disconnect(); g.disconnect(); };
  }
  // ráfaga de clics cortos (crujidos, granos, tic-tac)
  function granos({ t = 0, d = .5, n = 20, f = 3000, v = .08, q = 6 }) {
    for (let i = 0; i < n; i++) soplo({ t: t + Math.random() * d, d: .02 + Math.random() * .03, v: v * (.5 + Math.random()), f: f * (.7 + Math.random() * .6), q, ataque: .001, cola: .02 });
  }
  // cuerda pulsada (Karplus-Strong simple con ruido + tono)
  function pulsar({ t = 0, f = 55, d = 2.2, v = .35, brillo = 1800 }) {
    tono({ t, f, tipo: "sawtooth", d, v: v * .55, corte: brillo, q: 2 });
    tono({ t, f: f * 2, tipo: "triangle", d: d * .7, v: v * .25 });
    soplo({ t, d: .05, v: v * .5, f: 2500, q: 1, ataque: .001, cola: .04 });
  }
  // campanilla de cristal / oro
  function campana({ t = 0, f = 1760, d = 1.4, v = .1 }) {
    [1, 2.76, 5.4].forEach((k, i) => tono({ t, f: f * k, d: d / (1 + i * .6), v: v / (1 + i * 1.6), tipo: "sine", ataque: .002 }));
  }
  // golpe grave (impacto, cierre)
  function golpe({ t = 0, f = 90, v = .5, d = .5 }) {
    tono({ t, f: f * 2.2, f2: f * .6, tipo: "sine", d, v, ataque: .002 });
    soplo({ t, d: .18, v: v * .5, f: 900, f2: 200, q: .7, ataque: .001, cola: .15, tipo: "lowpass" });
  }
  // aleteo (murciélagos)
  function aleteo({ t = 0, n = 6, v = .07 }) { for (let i = 0; i < n; i++) soplo({ t: t + i * .085, d: .07, v, f: 600, f2: 300, q: 1.5, ataque: .005, cola: .05 }); }

  /* ---------- secuencias (entradas, salidas, transiciones) ---------- */
  function nuevaSecuencia() {
    cortar(.04);
    secuencia = ac.createGain(); secuencia.connect(bus);
    return secuencia;
  }
  function cortar(ms = .12) {
    if (!secuencia || !ac) return;
    const g = secuencia; secuencia = null;
    g.gain.setTargetAtTime(0, ahora(), ms / 3);
    setTimeout(() => g.disconnect(), ms * 1000 + 300);
  }
  const listo = () => ac && activo && ac.state === "running";

  const RECETAS = {
    /* --- puente --- */
    pulso: ({ dur = 1.4 } = {}) => { soplo({ d: dur, v: .09, f: 500, f2: 2600, q: 4, ataque: .1 }); tono({ f: 220, f2: 440, tipo: "sine", d: dur, v: .04, ataque: .2 }); },
    selector: ({ bits = "00" } = {}) => {
      [0, 1].forEach(i => { soplo({ t: i * .13, d: .03, v: .22, f: 3200, q: 8, ataque: .001, cola: .02 }); tono({ t: i * .13, f: bits[i] === "1" ? 880 : 440, d: .14, v: .08, tipo: "square", corte: 2400 }); });
    },
    ruta: () => { tono({ t: .02, f: 660, d: .5, v: .07, tipo: "triangle" }); tono({ t: .08, f: 990, d: .6, v: .05 }); },
    salida: ({ dur = 1 } = {}) => soplo({ d: dur, v: .06, f: 1800, f2: 700, q: 3, ataque: .05 }),
    regreso: ({ dur = 3 } = {}) => { soplo({ d: dur, v: .07, f: 2400, f2: 400, q: 3, ataque: .15 }); tono({ t: dur - .3, f: 330, d: .6, v: .05, tipo: "triangle" }); },
    /* --- entradas --- */
    "entrada-marceline": () => {
      tono({ f: 82, d: .8, v: .05, tipo: "sawtooth", corte: 600, ataque: .3 });          // el cable se tensa y vuelve cuerda
      pulsar({ t: .45, f: 55, d: 2.8, v: .4 });                                         // el pulso pulsa la cuerda
      pulsar({ t: 1.38, f: 82.4, d: 2.2, v: .3, brillo: 2400 });                        // la nota en la cejuela
      soplo({ t: 1.4, d: 1.1, v: .1, f: 3500, q: .8, ataque: .05 }); granos({ t: 1.4, d: 1, n: 40, f: 2500, v: .05 });   // crayón
      soplo({ t: 2.4, d: .5, v: .08, f: 1500, f2: 600, q: .7 }); granos({ t: 2.4, d: .5, n: 14, f: 1800, v: .06 });       // papel
      aleteo({ t: 3.1, n: 10, v: .06 }); aleteo({ t: 3.4, n: 8, v: .045 });
      soplo({ t: 3.9, d: .75, v: .06, f: 5000, q: 2, ataque: .02 });                   // marcador
      tono({ t: 4.75, f: 523, d: .5, v: .05, tipo: "triangle" }); tono({ t: 4.82, f: 784, d: .6, v: .04, tipo: "triangle" });
    },
    "entrada-tsaritsa": () => {
      for (let i = 0; i < 9; i++) campana({ t: i * .12, f: 1800 + i * 160, d: .5, v: .04 });     // cristales en el cable
      soplo({ t: 1.2, d: .8, v: .1, f: 6000, f2: 9000, q: .7, ataque: .1 }); granos({ t: 1.2, d: .8, n: 60, f: 6000, v: .04 }); // escarcha
      tono({ t: 2.0, f: 1200, d: .2, v: .05, tipo: "sine" });                           // blanco azulado
      soplo({ t: 2.15, d: .12, v: .35, f: 4000, q: .5, ataque: .001, cola: .1 });       // grieta
      golpe({ t: 2.15, f: 70, v: .25, d: .6 });
      granos({ t: 2.2, d: .9, n: 70, f: 5200, v: .12, q: 3 });                          // estallido de vidrio
      for (let i = 0; i < 6; i++) campana({ t: 2.25 + Math.random() * .7, f: 2600 + Math.random() * 2400, d: .7, v: .05 });
      soplo({ t: 2.7, d: 2.6, v: .07, f: 700, f2: 1200, q: .6, ataque: .6 });          // viento con la nieve
      [523, 659, 784, 1047].forEach((f, i) => campana({ t: 3.9 + i * .14, f, d: 1.5, v: .05 }));   // marco
      campana({ t: 5.0, f: 2093, d: 2, v: .06 });                                       // brillo dorado del título
    },
    "entrada-venom": () => {
      tono({ f: 45, f2: 70, tipo: "sawtooth", d: 1, v: .14, corte: 300, ataque: .3 });  // el nodo se hincha
      tono({ t: 1.05, f: 400, f2: 90, d: .25, v: .12 });                                 // la gota cae (plop)
      soplo({ t: .95, d: 1, v: .08, f: 300, f2: 160, q: 2, ataque: .2 });               // tentáculos se arrastran
      for (let i = 0; i < 6; i++) tono({ t: 1 + i * .15, f: 180 + Math.random() * 60, f2: 70, d: .18, v: .05 });
      tono({ t: 2.1, f: 38, f2: 30, tipo: "sawtooth", d: 1.4, v: .2, corte: 220, ataque: .4 });   // la mancha cubre
      soplo({ t: 2.1, d: 1.2, v: .08, f: 220, q: 1.5, ataque: .4 });
      soplo({ t: 3.1, d: .9, v: .06, f: 380, f2: 240, q: 4, ataque: .4 });             // respiración
      tono({ t: 3.3, f: 55, d: 1, v: .1, tipo: "sine", ataque: .3 });
      tono({ t: 3.75, f: 1200, f2: 900, d: .18, v: .03 });                               // parpadeo
      soplo({ t: 4.1, d: .5, v: .08, f: 900, f2: 300, q: 3, ataque: .03 });             // la membrana se recoge (succión)
    },
    "entrada-dio": () => {
      tono({ f: 110, f2: 220, tipo: "sawtooth", d: .8, v: .07, corte: 900, ataque: .1 }); // el cable se tensa
      tono({ t: .8, f: 1600, f2: 120, d: .4, v: .12, tipo: "sine" });                    // el tiempo se detiene
      soplo({ t: .8, d: .45, v: .14, f: 6000, f2: 300, q: .6, ataque: .01, cola: .4 });
      for (let i = 0; i < 9; i++) soplo({ t: 1.0 + i * .1 * (1 + i * .08), d: .02, v: .2, f: 3500, q: 10, ataque: .001, cola: .02 });   // tic-tac que se acelera y frena
      campana({ t: 2.05, f: 1046, d: 1.6, v: .1 });                                      // se detiene en las doce
      tono({ t: 2.1, f: 41, tipo: "sawtooth", d: 1.6, v: .16, corte: 160, ataque: .3 }); // ゴゴゴ
      tono({ t: 2.1, f: 43.5, tipo: "sawtooth", d: 1.6, v: .12, corte: 160, ataque: .3 });
      soplo({ t: 2.9, d: .7, v: .05, f: 2400, q: 2, ataque: .1 });                       // trazo de la silueta
      golpe({ t: 3.75, f: 80, v: .6, d: .7 });                                            // golpe del título
      soplo({ t: 3.75, d: .3, v: .2, f: 3000, f2: 800, q: .5, ataque: .001, cola: .25 });
    },
    /* --- salidas --- */
    "salida-marceline": () => { soplo({ d: .8, v: .1, f: 3500, q: .8, ataque: .05 }); granos({ d: .8, n: 30, f: 2500, v: .05 }); tono({ t: .8, f: 82, f2: 41, tipo: "sawtooth", d: 1.1, v: .14, corte: 700 }); },
    "salida-tsaritsa": () => { soplo({ d: .5, v: .08, f: 6000, q: .7, ataque: .1 }); soplo({ t: .55, d: .1, v: .3, f: 4000, q: .5, ataque: .001, cola: .08 }); granos({ t: .6, d: .8, n: 40, f: 4800, v: .09 }); for (let i = 0; i < 6; i++) tono({ t: .9 + Math.random() * .7, f: 1800 + Math.random() * 900, f2: 900, d: .12, v: .03 }); soplo({ t: .9, d: 1, v: .05, f: 600, q: .5, ataque: .3 }); },
    "salida-venom": () => { tono({ f: 38, tipo: "sawtooth", d: .6, v: .14, corte: 220, ataque: .2 }); soplo({ t: .5, d: .9, v: .1, f: 700, f2: 200, q: 3, ataque: .1 }); tono({ t: 1.3, f: 380, f2: 90, d: .25, v: .1 }); soplo({ t: 1.4, d: .4, v: .05, f: 300, q: 2, ataque: .05 }); },
    "salida-dio": () => { for (let i = 0; i < 7; i++) soplo({ t: i * .085, d: .02, v: .18, f: 3500, q: 10, ataque: .001, cola: .02 }); tono({ t: .1, f: 120, f2: 1600, d: .5, v: .08 }); soplo({ t: .62, d: .15, v: .3, f: 2500, q: .5, ataque: .001, cola: .12 }); golpe({ t: .62, f: 70, v: .3 }); soplo({ t: .8, d: .6, v: .07, f: 1200, f2: 300, q: 1, ataque: .02 }); },
    /* --- transiciones internas (por nombre) --- */
    "Página de cuaderno": () => { soplo({ d: .6, v: .1, f: 1800, f2: 900, q: .7, ataque: .05 }); granos({ d: .5, n: 10, f: 2200, v: .05 }); },
    "Murciélago borrador": () => { aleteo({ n: 9, v: .08 }); soplo({ t: .1, d: .7, v: .06, f: 3000, q: .7 }); },
    "Acorde rojo": () => { [55, 82.4, 110].forEach((f, i) => pulsar({ t: i * .025, f, d: 1.2, v: .18 })); },
    "Garabato": () => { soplo({ d: .75, v: .1, f: 3500, q: .8, ataque: .03 }); granos({ d: .7, n: 35, f: 2500, v: .05 }); },
    "Escarcha": () => { soplo({ d: .45, v: .09, f: 6000, f2: 9000, q: .7, ataque: .05 }); granos({ d: .4, n: 30, f: 6000, v: .04 }); soplo({ t: .45, d: .1, v: .28, f: 4000, q: .5, ataque: .001, cola: .08 }); granos({ t: .5, d: .4, n: 40, f: 5000, v: .1, q: 3 }); },
    "Ventisca": () => soplo({ d: .85, v: .14, f: 500, f2: 2000, q: .8, ataque: .25 }),
    "Cristal giratorio": () => { [1568, 1760, 2093, 2349, 2637].forEach((f, i) => campana({ t: i * .15, f, d: .9, v: .05 })); soplo({ d: 1, v: .04, f: 5000, q: 2, ataque: .3 }); },
    "Aurora": () => { [261, 329, 392, 523].forEach((f, i) => tono({ t: i * .05, f, d: 1.2, v: .04, tipo: "sine", ataque: .3 })); soplo({ d: 1, v: .03, f: 2500, q: 3, ataque: .3 }); },
    // Tsaritsa, segunda versión
    "Ventisca de arrastre": () => {
      granos({ d: .25, n: 18, f: 6000, v: .05 });                                        // polvo y esquirlas: de dónde viene el viento
      soplo({ d: 1.15, v: .16, f: 380, f2: 2200, q: .7, ataque: .45, cola: .45 });       // el frente crece y arrastra
      soplo({ t: .15, d: .5, v: .06, f: 900, f2: 300, q: 2, ataque: .05 });               // el circuito resiste (grave)
      soplo({ t: .55, d: .35, v: .1, f: 5000, q: .6, ataque: .08 });                     // nieve máxima
      granos({ t: .3, d: .7, n: 40, f: 5200, v: .05, q: 3 });
      campana({ t: .82, f: 1568, d: .9, v: .035 });                                       // el contenido nuevo se asienta
    },
    "Lluvia glacial": () => {
      [1568, 2093, 2637].forEach((f, i) => campana({ t: i * .05, f, d: 1.2, v: .04 }));   // la esfera
      for (let i = 0; i < 7; i++) { const t = .16 + i * .055; tono({ t, f: 2600, f2: 900, d: .1, v: .025 }); soplo({ t: t + .1, d: .05, v: .16, f: 4200, q: .7, ataque: .001, cola: .04 }); granos({ t: t + .1, d: .12, n: 6, f: 5000, v: .06 }); }
      tono({ t: .56, f: 1800, f2: 300, d: .12, v: .05 });                                 // la última descarga
      golpe({ t: .66, f: 70, v: .45, d: .6 }); soplo({ t: .66, d: .3, v: .25, f: 3500, f2: 900, q: .5, ataque: .001, cola: .25 });
      granos({ t: .9, d: .45, n: 60, f: 5200, v: .1, q: 3 });                              // fractura
      for (let i = 0; i < 5; i++) campana({ t: .92 + i * .07, f: 2400 + i * 300, d: .6, v: .03 });
    },
    "Sello de la soberana": () => {
      tono({ f: 98, d: 1.3, v: .05, tipo: "triangle", ataque: .3 }); tono({ f: 147, d: 1.2, v: .03, tipo: "triangle", ataque: .3 });
      [523, 784].forEach((f, i) => campana({ t: .05 + i * .1, f, d: 1.4, v: .05 }));      // el sello se dibuja
      soplo({ t: .25, d: .5, v: .07, f: 800, f2: 3500, q: 3, ataque: .1 });                // el anillo recorre la escena
      granos({ t: .35, d: .35, n: 30, f: 5500, v: .04 });                                  // siluetas que se disuelven en escarcha
      soplo({ t: .72, d: .35, v: .05, f: 3500, f2: 900, q: 3, ataque: .05 });              // el anillo vuelve
      [1047, 1568, 2093].forEach((f, i) => campana({ t: 1.02 + i * .03, f, d: 1.4, v: .05 }));   // se cierra
    },
    "Onda de ruptura": () => {
      tono({ f: 60, f2: 180, tipo: "sawtooth", d: .2, v: .1, corte: 600, ataque: .15 });   // compresión
      golpe({ t: .2, f: 60, v: .6, d: .7 }); soplo({ t: .2, d: .45, v: .2, f: 2500, f2: 500, q: .6, ataque: .005 });
      for (let i = 0; i < 4; i++) { soplo({ t: .3 + i * .07, d: .06, v: .2, f: 3800, q: .6, ataque: .001, cola: .05 }); granos({ t: .3 + i * .07, d: .12, n: 10, f: 4600, v: .07 }); }
      granos({ t: 1.05, d: .4, n: 45, f: 5000, v: .08, q: 3 }); soplo({ t: 1.05, d: .4, v: .06, f: 1200, f2: 400, q: .8 });
    },
    "Devoración": () => { tono({ f: 40, f2: 60, tipo: "sawtooth", d: .8, v: .14, corte: 240, ataque: .15 }); soplo({ d: .8, v: .07, f: 320, q: 2, ataque: .2 }); },
    "Tentáculo barredor": () => { soplo({ d: .7, v: .1, f: 260, f2: 900, q: 2, ataque: .15 }); tono({ t: .25, f: 160, f2: 60, d: .3, v: .08 }); },
    "Goteo": () => { for (let i = 0; i < 7; i++) tono({ t: i * .1 + Math.random() * .05, f: 500 + Math.random() * 300, f2: 120, d: .14, v: .06 }); tono({ t: .3, f: 45, tipo: "sawtooth", d: .6, v: .1, corte: 200, ataque: .15 }); },
    "Mutación": () => { tono({ f: 90, f2: 30, tipo: "sawtooth", d: .6, v: .12, corte: 500 }); soplo({ d: .6, v: .07, f: 200, f2: 1200, q: 6, ataque: .1 }); },
    "Tiempo detenido": () => { tono({ f: 1500, f2: 150, d: .35, v: .1 }); for (let i = 0; i < 4; i++) soplo({ t: .15 + i * .1, d: .02, v: .18, f: 3500, q: 10, ataque: .001, cola: .02 }); soplo({ t: .5, d: .15, v: .25, f: 2500, q: .5, ataque: .001, cola: .12 }); },
    "Página de manga": () => { for (let i = 0; i < 5; i++) { soplo({ t: i * .06, d: .12, v: .1, f: 1500, f2: 600, q: .7, ataque: .005 }); golpe({ t: i * .06 + .1, f: 140, v: .08, d: .2 }); } },
    "Líneas de velocidad": () => soplo({ d: .55, v: .16, f: 400, f2: 5000, q: 1, ataque: .02 }),
    "Golpe": () => { soplo({ d: .1, v: .1, f: 800, q: .7 }); golpe({ t: .1, f: 70, v: .65, d: .6 }); soplo({ t: .1, d: .3, v: .22, f: 3500, f2: 900, q: .5, ataque: .001, cola: .25 }); },
    fundido: () => soplo({ d: .35, v: .04, f: 1200, q: .7, ataque: .1 }),
    /* --- otros momentos --- */
    libro: () => { soplo({ d: .25, v: .08, f: 2000, f2: 900, q: .7 }); campana({ t: .05, f: 1318, d: 1.2, v: .06 }); },
    alejamiento: () => { [130.8, 196, 261.6, 329.6].forEach((f, i) => tono({ t: i * .25, f, d: 3.4 - i * .2, v: .05, tipo: "triangle", ataque: .6 })); soplo({ d: 3.2, v: .05, f: 400, f2: 2400, q: .6, ataque: 1 }); [0, 1, 2, 3].forEach(i => campana({ t: 1.3 + i * .55, f: [523, 659, 784, 1047][i], d: 1.5, v: .05 })); },
    vuelo: () => soplo({ d: 2, v: .06, f: 600, f2: 1400, q: .6, ataque: .5 }),
    final: () => { tono({ f: 196, d: 2.5, v: .05, tipo: "triangle", ataque: .2 }); soplo({ d: .5, v: .1, f: 1500, f2: 400, q: .6 }); granos({ t: .5, d: 1.5, n: 25, f: 2000, v: .03 }); },
    lamina: () => { soplo({ d: .5, v: .07, f: 1600, f2: 700, q: .7 }); granos({ d: .4, n: 8, f: 2000, v: .04 }); }
  };
  // aparición de partes y toques, con el timbre de cada mundo
  const TIMBRE = {
    marceline: (k) => k === "phase" ? pulsar({ f: [110, 146.8, 164.8, 196][Math.floor(Math.random() * 4)], d: 1, v: .12, brillo: 2200 }) : tono({ f: 196, d: .2, v: .08, tipo: "triangle" }),
    tsaritsa: (k) => campana({ f: k === "phase" ? [1568, 1760, 2093][Math.floor(Math.random() * 3)] : 2349, d: k === "phase" ? 1 : .4, v: .06 }),
    venom: (k) => { tono({ f: k === "phase" ? 70 : 110, f2: 45, tipo: "sawtooth", d: .35, v: .09, corte: 400 }); soplo({ d: .25, v: .04, f: 400, q: 3 }); },
    dio: (k) => { golpe({ f: k === "phase" ? 110 : 160, v: k === "phase" ? .2 : .12, d: .25 }); if (k === "phase") soplo({ d: .12, v: .08, f: 2500, q: .7, ataque: .001, cola: .1 }); },
    hub: () => tono({ f: 523, d: .2, v: .05 })
  };

  /* ---------- ambiente por mundo (muy bajo, en bucle) ---------- */
  function ambiente(tema, forzar = false) {
    if (tema === ambTema && !forzar) return;
    ambTema = tema;
    if (!ac) return;
    const viejo = amb;
    if (viejo) { viejo.g.gain.setTargetAtTime(0, ahora(), .5); setTimeout(() => { viejo.stop(); }, 2500); }
    amb = null;
    if (!tema) return;
    const g = ac.createGain(); g.gain.value = 0; g.connect(bus);
    g.gain.setTargetAtTime(1, ahora(), .8);
    const fuentes = [], timers = [];
    const osc = (f, tipo, v, corte) => { const o = ac.createOscillator(), gg = ac.createGain(); o.type = tipo; o.frequency.value = f; gg.gain.value = v; let n = o; if (corte) { const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = corte; o.connect(fl); n = fl; } n.connect(gg); gg.connect(g); o.start(); fuentes.push(o); return o; };
    const viento = (f, q, v) => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gg = ac.createGain(); s.buffer = bufRuido(); s.loop = true; fl.type = "bandpass"; fl.frequency.value = f; fl.Q.value = q; gg.gain.value = v; s.connect(fl); fl.connect(gg); gg.connect(g); s.start(); fuentes.push(s); return { fl, gg }; };
    const lfo = (param, f, amp) => { const o = ac.createOscillator(), a = ac.createGain(); o.frequency.value = f; a.gain.value = amp; o.connect(a); a.connect(param); o.start(); fuentes.push(o); };
    const cada = (ms, fn) => { const id = setInterval(() => { if (listo()) fn(); }, ms); timers.push(id); };
    if (tema === "hub") { osc(65.4, "sine", .025); osc(98, "sine", .015); const w = viento(900, .6, .012); lfo(w.fl.frequency, .07, 300); }
    else if (tema === "marceline") { osc(55, "triangle", .02, 300); const w = viento(2500, .5, .006); cada(5200, () => pulsar({ f: [55, 73.4, 82.4][Math.floor(Math.random() * 3)], d: 2.5, v: .05, brillo: 900, dest: g })); }
    else if (tema === "tsaritsa") { const w = viento(1200, .7, .03); lfo(w.fl.frequency, .05, 600); lfo(w.gg.gain, .09, .012); cada(4200, () => campana({ f: 2000 + Math.random() * 2500, d: 1.6, v: .02, dest: g })); }
    else if (tema === "venom") { const o = osc(36, "sawtooth", .03, 160); const w = viento(200, 2, .03); lfo(w.gg.gain, .25, .025); lfo(o.frequency, .1, 2); }
    else if (tema === "dio") { osc(41, "sawtooth", .018, 130); osc(43.6, "sawtooth", .014, 130); cada(1000, () => soplo({ d: .02, v: .05, f: 3200, q: 10, ataque: .001, cola: .02, dest: g })); }
    else if (tema === "concl") { osc(130.8, "triangle", .015); osc(196, "triangle", .01); viento(800, .5, .01); }
    amb = { g, stop() { fuentes.forEach(f => { try { f.stop(); } catch {} }); timers.forEach(clearInterval); g.disconnect(); } };
  }

  /* ---------- API ---------- */
  function play(nombre, opts) {
    if (!listo() || !RECETAS[nombre]) return;
    try { RECETAS[nombre](opts); } catch {}
  }
  // una secuencia (entrada, salida, transición): reemplaza a la anterior y se corta con Esc
  function sec(nombre, opts) {
    if (!listo() || !RECETAS[nombre]) return;
    nuevaSecuencia();
    try { RECETAS[nombre](opts); } finally { /* la secuencia sigue sonando hasta su fin o hasta cortar() */ }
  }
  /* bajo eléctrico de cuatro cuerdas al aire: 0 Mi (E1) · 1 La (A1) · 2 Re (D2) · 3 Sol (G2).
     Cuerda pulsada por síntesis Karplus-Strong (ruido que recircula por un retardo con
     filtro): ataque de púa, cuerpo grave y decaimiento natural. Las muestras se calculan
     una vez por cuerda. */
  const CUERDAS = [41.2, 55, 73.42, 98];
  const muestras = {};
  function muestraBajo(i) {
    if (muestras[i]) return muestras[i];
    const sr = ac.sampleRate, f = CUERDAS[i], N = Math.round(sr / f), L = Math.round(sr * 3.2);
    const b = ac.createBuffer(1, L, sr), d = b.getChannelData(0);
    // excitación: ruido suavizado (púa redondeada, más grave que una guitarra)
    const linea = new Float32Array(N);
    let prev = 0; for (let k = 0; k < N; k++) { prev = prev * .55 + (Math.random() * 2 - 1) * .45; linea[k] = prev; }
    const perdida = .9965 - i * .0006;
    for (let n = 0, k = 0; n < L; n++, k = (k + 1) % N) {
      const sig = linea[(k + 1) % N];
      const v = linea[k];
      d[n] = v;
      linea[k] = (v + sig) * .5 * perdida;
    }
    // quita el clic inicial y normaliza
    let max = 0; for (let n = 0; n < L; n++) max = Math.max(max, Math.abs(d[n]));
    for (let n = 0; n < L; n++) d[n] = d[n] / (max || 1) * Math.min(1, n / 60);
    return (muestras[i] = b);
  }
  function bajo(i, { v = .55 } = {}) {
    if (!listo() || !(i >= 0 && i < 4)) return;
    const t0 = ahora(), s = ac.createBufferSource(), cuerpo = ac.createBiquadFilter(), tono = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = muestraBajo(i);
    cuerpo.type = "lowshelf"; cuerpo.frequency.value = 160; cuerpo.gain.value = 7;     // cuerpo grave del amplificador
    tono.type = "lowpass"; tono.frequency.setValueAtTime(2400, t0); tono.frequency.exponentialRampToValueAtTime(700, t0 + 1.2);
    g.gain.setValueAtTime(v, t0); g.gain.setTargetAtTime(0, t0 + 2.2, .35);
    s.connect(cuerpo); cuerpo.connect(tono); tono.connect(g); g.connect(bus);
    s.start(t0); s.stop(t0 + 3.2);
    s.onended = () => { s.disconnect(); cuerpo.disconnect(); tono.disconnect(); g.disconnect(); };
  }
  // toque genérico de un botón: se omite si ese mismo toque ya produjo un sonido lógico
  let ultimaLogica = 0;
  function toque(tema, kind = "touch") {
    if (!listo() || document.documentElement.classList.contains("busy")) return;
    if (kind !== "touch") return (TIMBRE[tema] || TIMBRE.hub)(kind);
    setTimeout(() => { if (performance.now() - ultimaLogica > 120) (TIMBRE[tema] || TIMBRE.hub)(kind); }, 30);
  }

  /* ---------- sonido según lo que muestra la diapositiva ---------- */
  // nota de cada canal (0..3) con el timbre del mundo; y = 0: la salida queda muda (golpe apagado)
  const ESCALA = { tsaritsa: [1047, 1319, 1568, 2093], venom: [55, 65.4, 73.4, 82.4], dio: [523, 659, 784, 1047], hub: [523, 659, 784, 1047] };
  function bajoApagado(i, { t = 0, v = .3 } = {}) {
    const t0 = ahora() + t, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = muestraBajo(i); fl.type = "lowpass"; fl.frequency.value = 380;
    g.gain.setValueAtTime(v, t0); g.gain.setTargetAtTime(0, t0 + .06, .03);
    s.connect(fl); fl.connect(g); g.connect(bus); s.start(t0); s.stop(t0 + .4);
    s.onended = () => { s.disconnect(); fl.disconnect(); g.disconnect(); };
  }
  function nota(tema, i, y = 1, { t = 0, v = 1 } = {}) {
    if (tema === "marceline") return y ? setTimeout(() => bajo(i, { v: .45 * v }), t * 1000) : bajoApagado(i, { t, v: .35 * v });
    const f = (ESCALA[tema] || ESCALA.hub)[i];
    if (!y) return soplo({ t, d: .12, v: .12 * v, f: tema === "venom" ? 180 : 700, f2: 200, q: .8, ataque: .002, cola: .1 });
    if (tema === "tsaritsa") { campana({ t, f, d: 1.6, v: .08 * v }); campana({ t: t + .03, f: f * 1.5, d: 1.1, v: .03 * v }); }
    else if (tema === "venom") { tono({ t, f, tipo: "sawtooth", d: 1, v: .16 * v, corte: 380, ataque: .03 }); tono({ t, f: f * .5, d: 1.1, v: .1 * v }); soplo({ t, d: .3, v: .05 * v, f: 300, f2: 120, q: 3 }); }
    else if (tema === "dio") { golpe({ t, f: 90, v: .18 * v, d: .3 }); campana({ t: t + .02, f, d: 1.4, v: .07 * v }); }
    else campana({ t, f, d: 1, v: .05 * v });
  }
  // los dos bits de selección, S₁ y S₀: grave = 0, agudo = 1
  function bits(i, t = 0) {
    [1, 0].forEach((b, k) => { const v1 = (i >> b) & 1; soplo({ t: t + k * .12, d: .03, v: .2, f: 3200, q: 8, ataque: .001, cola: .02 }); tono({ t: t + k * .12, f: v1 ? 880 : 440, d: .12, v: .07, tipo: "square", corte: 2400 }); });
  }
  // cuerdas apagadas (las otras callan)
  const callan = (sel, t = 0) => [0, 1, 2, 3].filter(i => i !== sel).forEach((i, k) => bajoApagado(i, { t: t + k * .09, v: .22 }));
  // aparición de cada fase, por su etiqueta (las de las diapositivas genéricas y las de los 5 toques)
  const ENCENDER = {
    marceline: () => { soplo({ d: .15, v: .12, f: 2500, q: .7, ataque: .001, cola: .1 }); tono({ t: .05, f: 60, d: 1.2, v: .06, tipo: "sawtooth", corte: 240, ataque: .3 }); },
    tsaritsa: () => { soplo({ d: .9, v: .06, f: 3000, f2: 7000, q: 2, ataque: .2 }); [0, 1, 2].forEach(k => campana({ t: .2 + k * .12, f: [1568, 2093, 2637][k], d: .9, v: .035 })); },
    venom: () => { tono({ f: 40, f2: 62, tipo: "sawtooth", d: .9, v: .12, corte: 260, ataque: .25 }); soplo({ d: .8, v: .06, f: 260, q: 2, ataque: .2 }); },
    dio: () => { for (let k = 0; k < 4; k++) soplo({ t: k * .14, d: .02, v: .16, f: 3400, q: 10, ataque: .001, cola: .02 }); golpe({ t: .58, f: 110, v: .18, d: .3 }); }
  };
  const FASES = {
    // diapositivas genéricas
    "El circuito": tema => ENCENDER[tema]?.(),
    "Toca y comprueba": tema => { nota(tema, 0, 1, { v: .5 }); nota(tema, 3, 1, { t: .14, v: .5 }); },
    "Tabla y comprobación": () => { for (let k = 0; k < 4; k++) soplo({ t: k * .09, d: .03, v: .12, f: 2600 + k * 300, q: 8, ataque: .001, cola: .02 }); },
    // Marceline: el amplificador
    "Se enciende": () => { soplo({ d: .05, v: .2, f: 2000, q: .7, ataque: .001, cola: .04 }); tono({ t: .05, f: 60, d: 1.4, v: .07, tipo: "sawtooth", corte: 220, ataque: .25 }); tono({ t: .05, f: 120, d: 1.2, v: .03, ataque: .3 }); },
    "Gira la perilla": () => { for (let k = 0; k < 6; k++) soplo({ t: k * .06, d: .015, v: .14, f: 2200, q: 9, ataque: .001, cola: .012 }); },
    "Viaja la señal": () => soplo({ d: .7, v: .06, f: 400, f2: 1800, q: 3, ataque: .1 }),
    "Las otras callan": (tema, c) => callan(c.sel),
    "Los otros callan": (tema, c) => callan(c.sel),
    "La setlist": () => { soplo({ d: .6, v: .07, f: 5000, q: 2, ataque: .02 }); granos({ d: .5, n: 14, f: 3000, v: .04 }); },
    // Tsaritsa: la cámara de selección
    "Engranajes y esfera": () => { for (let k = 0; k < 8; k++) soplo({ t: k * .1, d: .02, v: .09, f: 1800, q: 12, ataque: .001, cola: .015 }); tono({ d: .9, f: 220, f2: 330, v: .025, tipo: "triangle", ataque: .3 }); },
    "Los anillos se alinean": (tema, c) => { for (let k = 0; k < 7; k++) soplo({ t: k * .05 * (1 + k * .15), d: .02, v: .12, f: 2600, q: 10, ataque: .001, cola: .015 }); golpe({ t: .62, f: 150, v: .12, d: .2 }); bits(c.sel, .7); },
    "Rayo del pilar": (tema, c) => { soplo({ d: .6, v: .07, f: 1500, f2: 6000, q: 4, ataque: .05 }); campana({ t: .45, f: ESCALA.tsaritsa[c.sel], d: 1.2, v: .06 }); },
    "Escarcha en los demás": () => { soplo({ d: .5, v: .07, f: 6500, f2: 9000, q: .8, ataque: .05 }); granos({ d: .5, n: 40, f: 5500, v: .05 }); },
    "Rayo de salida y decreto": (tema, c) => { soplo({ d: .6, v: .06, f: 2000, f2: 7000, q: 4, ataque: .05 }); nota(tema, c.sel, c.y, { t: .5 }); },
    // Venom: el circuito asimilado
    "Despierta": () => { soplo({ d: 1, v: .08, f: 300, f2: 180, q: 3, ataque: .4 }); tono({ f: 45, d: 1, v: .08, tipo: "sawtooth", corte: 200, ataque: .4 }); },
    "Tendones tensos": () => { tono({ f: 70, f2: 110, tipo: "sawtooth", d: .7, v: .08, corte: 500, q: 6, ataque: .1 }); granos({ d: .6, n: 12, f: 600, v: .05, q: 4 }); },
    "El tentáculo atrapa": (tema, c) => { tono({ f: 420, f2: 90, d: .2, v: .12 }); golpe({ t: .05, f: ESCALA.venom[c.sel] * 1.2, v: .2, d: .3 }); },
    "Los demás se retraen": () => soplo({ d: .6, v: .09, f: 900, f2: 200, q: 3, ataque: .05 }),
    "Viaja a la boca": (tema, c) => { for (let k = 0; k < 5; k++) tono({ t: k * .12, f: 260 - k * 25, f2: 80, d: .14, v: .05 }); nota(tema, c.sel, c.y, { t: .7 }); },
    // DIO: el teatro del tiempo
    "El reloj se activa": () => { for (let k = 0; k < 4; k++) soplo({ t: k * .25, d: .02, v: .16, f: k % 2 ? 2600 : 3400, q: 10, ataque: .001, cola: .02 }); },
    "Palancas fijadas": (tema, c) => { golpe({ f: 130, v: .14, d: .2 }); golpe({ t: .12, f: 130, v: .14, d: .2 }); bits(c.sel, .02); },
    "La manecilla apunta": (tema, c) => { for (let k = 0; k < 6; k++) soplo({ t: k * .045, d: .015, v: .13, f: 3000, q: 10, ataque: .001, cola: .012 }); campana({ t: .3, f: ESCALA.dio[c.sel], d: .6, v: .04 }); },
    "Zoom dramático": () => { tono({ f: 41, tipo: "sawtooth", d: 1, v: .14, corte: 170, ataque: .2 }); tono({ f: 43.6, tipo: "sawtooth", d: 1, v: .1, corte: 170, ataque: .2 }); },
    "¡Impacto!": (tema, c) => { golpe({ f: 70, v: .5, d: .6 }); soplo({ d: .25, v: .18, f: 3000, f2: 800, q: .5, ataque: .001, cola: .2 }); if (c.y) campana({ t: .05, f: ESCALA.dio[c.sel], d: 1.6, v: .07 }); }
  };
  function fase(tema, etiqueta, ctx = {}) {
    if (!listo() || !etiqueta) return;
    const c = { sel: 0, y: 1, ...ctx };
    const m = /^Combinación ([01])([01])$/.exec(etiqueta);
    try {
      if (m) { const i = +m[1] * 2 + +m[2]; bits(i); nota(tema, i, 1, { t: .3, v: .7 }); return; }
      if (FASES[etiqueta]) return FASES[etiqueta](tema, c);
      (TIMBRE[tema] || TIMBRE.hub)("phase");
    } catch {}
  }
  /* un cambio lógico hecho por quien presenta (palanca, cristal, enable…):
     el bit tocado suena 1 (agudo) o 0 (grave); si cambia la selección, suenan S₁S₀;
     luego la salida: la nota del canal elegido o un golpe apagado si vale 0 */
  let gesto = 0;
  ["pointerdown", "keydown"].forEach(t => addEventListener(t, () => { gesto = performance.now(); }, { capture: true, passive: true }));
  function logica(tema, antes, L, { demux = false, salida = true } = {}) {
    if (!listo() || performance.now() - gesto > 600 || document.documentElement.classList.contains("busy")) return;
    const st = L.st, sel = L.sel, selAntes = antes.s1 * 2 + antes.s0;
    ultimaLogica = performance.now();
    let t = 0;
    try {
      if (sel !== selAntes) { bits(sel); t = .28; }
      else if (antes.en !== st.en) { tono({ f: st.en ? 220 : 440, f2: st.en ? 440 : 160, d: .25, v: .07, tipo: "triangle" }); t = .2; }
      else {
        const i = st.d.findIndex((x, k) => x !== antes.d[k]);
        const v = antes.din !== st.din ? st.din : i >= 0 ? st.d[i] : null;
        if (v != null) { tono({ f: v ? 660 : 330, f2: v ? 990 : 220, d: .14, v: .07, tipo: "triangle" }); t = .16; }
      }
      if (!salida) return;
      const y = demux ? (st.en ? st.din : 0) : L.mux, yAntes = demux ? (antes.en ? antes.din : 0) : (antes.en ? antes.d[selAntes] : 0);
      if (sel !== selAntes || y !== yAntes) nota(tema, sel, y, { t });
    } catch {}
  }
  function activar(on) {
    activo = on; store.set(CLAVE, on);
    if (on) abrir();
    if (master) master.gain.setTargetAtTime(on ? .8 : 0, ahora(), .05);
    if (!on) cortar();
  }
  // «Omitir transición»: también corta el sonido de la secuencia
  const finOrig = MOTION.finish.bind(MOTION);
  MOTION.finish = function () { cortar(); return finOrig(); };

  return { play, sec, toque, bajo, fase, logica, ambiente, activar, cortar, get activo() { return activo; } };
})();

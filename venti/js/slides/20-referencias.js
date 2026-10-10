/* 20 · Referencias (≥ 3, requisito 7) y preguntas */
(function () {
  const REFS = [
    ["Libro", "Mano, M. M. y Ciletti, M. D. (2013). <i>Diseño digital</i>, 5.ª ed. Pearson. Cap. 4: multiplexores y decodificadores."],
    ["Libro", "Floyd, T. L. (2006). <i>Fundamentos de sistemas digitales</i>, 9.ª ed. Pearson Prentice Hall. Cap. 6."],
    ["Libro", "Tocci, R. J., Widmer, N. S. y Moss, G. L. (2007). <i>Sistemas digitales: principios y aplicaciones</i>, 10.ª ed. Pearson."],
    ["Hoja de datos", "Texas Instruments. <i>SN74HC153: Dual 4-Line to 1-Line Data Selectors/Multiplexers</i>. ti.com/product/SN74HC153"],
    ["Hoja de datos", "Texas Instruments. <i>SN74HC139: Dual 2-Line to 4-Line Decoders/Demultiplexers</i>. ti.com/product/SN74HC139"],
    ["Hoja de datos", "Texas Instruments. <i>CD4051B: CMOS Single 8-Channel Analog Multiplexer/Demultiplexer</i>. ti.com/product/CD4051B"]
  ];
  Deck.add({
    id: "referencias", title: "Referencias y preguntas", who: "Carlos", topic: "Cierre", time: 30,
    notes: [
      "Fuentes: tres libros universitarios de lógica digital y tres hojas de datos de fabricante (los circuitos integrados que mencionamos). Todas están en docs/REFERENCIAS.md.",
      "Abrir preguntas. Invitar a la docente a proponer otra combinación o función: el simulador queda listo para responder en vivo (tecla S: salta directo al simulador)."
    ],
    html: `
      <div class="kicker" data-in="0" data-out="1">Requisito 7 · fuentes consultadas</div>
      <h1 class="title" data-in="0" data-out="1">Referencias</h1>
      <div class="kicker" data-in="1">Cierre</div>
      <ol class="refs" data-in="0" data-out="1">${REFS.map(([t, r]) => `<li><span class="tag">${t}</span>${r}</li>`).join("")}</ol>
      <div class="ask" data-in="1">
        <svg viewBox="0 0 120 120" aria-hidden="true"><path class="fe" d="M18 104 C 40 70, 66 40, 104 16 C 92 50, 64 82, 18 104 Z"/><path class="sp" d="M18 104 L 92 30"/></svg>
        <h2>¿Preguntas?</h2>
        <p>Propongan otra combinación de S, otros datos u otra función de tres variables: la probamos en el simulador.</p>
      </div>`
  });
})();

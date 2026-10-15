"use strict";
/* =====================================================================
   Transiciones internas de Tsaritsa (§2.6), Venom (§3.6) y DIO (§4.6).
   Estos mundos aún conservan su escena anterior: aquí solo se registran
   sus cuatro transiciones, que el núcleo rota en orden (MUNDOS.transiciones).
   Cada una llama a commit() una sola vez, cuando la diapositiva vieja ya está
   cubierta o copiada; el núcleo resuelve Esc, ?still y movimiento reducido.
   ===================================================================== */
(() => {
  const capaSvg = (c, cuerpo, vb = "0 0 100 100", cls = "", par = "none") => {
    c.insertAdjacentHTML("beforeend", `<svg class="${cls}" viewBox="${vb}" preserveAspectRatio="${par}" aria-hidden="true">${cuerpo}</svg>`);
    return c.lastElementChild;
  };
  const div = (c, cls, estilo = "") => { const d = html(`<div class="${cls}" style="${estilo}"></div>`); c.append(d); return d; };
  // grietas que nacen del centro (pocas, quebradas)
  const grietas = () => [[50, 50, 8, 4], [50, 50, 94, 10], [50, 50, 96, 88], [50, 50, 6, 92], [50, 50, 50, -2], [50, 50, 102, 54], [50, 50, -2, 46], [50, 50, 54, 104]]
    .map(([x, y, X, Y], i) => `M${x} ${y}L${(x + X) / 2 + (i % 2 ? 4 : -4)} ${(y + Y) / 2 + (i % 3 ? -3 : 3)}L${X} ${Y}`).join("");
  // seis esquirlas que cubren la pantalla (triángulos desde el centro)
  const ESQUIRLAS = [[0, 0, 55, 0], [55, 0, 100, 0, 100, 38], [100, 38, 100, 100, 62, 100], [62, 100, 0, 100], [0, 100, 0, 58], [0, 58, 0, 0]];

  // Tsaritsa: ver js/mundos/trans-tsaritsa.js

  // Venom: ver js/mundos/trans-venom.js

  // DIO: ver js/mundos/trans-dio.js
})();

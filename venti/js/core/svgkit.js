/* =====================================================================
   SvgKit — formas de compuertas y cables para diagramas lógicos (SVG).
   Coordenadas en px del escenario. Devuelve cadenas SVG.
   Convención: (x, y) = punto medio del borde de ENTRADA de la compuerta.
   ===================================================================== */
(function () {
  "use strict";
  const K = {
    and(x, y, w = 110, h = 92, cls = "") {
      const y0 = y - h / 2, y1 = y + h / 2, xm = x + w - h / 2;
      return `<path class="gate ${cls}" d="M${x} ${y0} H${xm} A${h / 2} ${h / 2} 0 0 1 ${xm} ${y1} H${x} Z"/>`;
    },
    or(x, y, w = 120, h = 100, cls = "") {
      const y0 = y - h / 2, y1 = y + h / 2;
      return `<path class="gate ${cls}" d="M${x} ${y0} Q${x + w * 0.28} ${y} ${x} ${y1} Q${x + w * 0.62} ${y1} ${x + w} ${y} Q${x + w * 0.62} ${y0} ${x} ${y0} Z"/>`;
    },
    not(x, y, w = 56, h = 48, cls = "") {
      return `<path class="gate ${cls}" d="M${x} ${y - h / 2} L${x + w} ${y} L${x} ${y + h / 2} Z"/><circle class="bubble ${cls}" cx="${x + w + 8}" cy="${y}" r="8"/>`;
    },
    /* y de la entrada k (0..n-1) de una compuerta de alto h centrada en y */
    pin(y, h, k, n) { return y - h / 2 + (h * (k + 1)) / (n + 1); },
    /* salida de una compuerta */
    outAnd(x, y, w = 110) { return [x + w, y]; },
    outOr(x, y, w = 120) { return [x + w, y]; },
    outNot(x, y, w = 56) { return [x + w + 16, y]; },
    wire(pts, cls = "", attrs = "") { return `<path class="w ${cls}" ${attrs} d="M${pts.map(p => p.join(" ")).join(" L")}"/>`; },
    dot(x, y) { return `<circle class="dot" cx="${x}" cy="${y}" r="6"/>`; },
    text(x, y, s, cls = "", anchor = "middle") { return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}" dominant-baseline="central">${s}</text>`; },
    /* longitud de cada trazo para animarlo con .draw */
    measure(svg) { svg.querySelectorAll(".draw").forEach(p => { try { p.style.setProperty("--len", Math.ceil(p.getTotalLength()) + 2); } catch (e) {} }); }
  };
  /* sub-índice en SVG */
  K.sub = (base, s) => `${base}<tspan font-size="0.65em" dy="0.3em">${s}</tspan><tspan dy="-0.3em"> </tspan>`;
  window.SvgKit = K;
})();

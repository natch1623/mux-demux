"use strict";
/* =====================================================================
   Pantalla puente (especificación §0): el vuelo de la cámara por el cable
   entre el HUB y la primera diapositiva, común a los cuatro mundos.
   Fondo gris oscuro #0D0F14, cable de 6 unidades con brillo cian #4DF3FF,
   pulso de 40 unidades, pausa de 0,3 s en el bloque con S₁/S₀ que parpadean y
   se fijan, ruta elegida a 14 y las otras tres al 15 %.
   (unidad = px de diseño a 1920 de ancho; la cámara la escala a la pantalla)

   El vuelo y el dibujo sobre el lienzo viven en app.js (follow, MAP, TINT).
   Aquí: el estado html.puente, la geometría común del pulso y de la estela, y
   cable(), que dibuja el mismo cable en una capa fija para que la entrada y la
   salida de un mundo empalmen exacto con el lienzo.
   app.js llama a empezar() antes del vuelo y a terminar() al llegar.
   ===================================================================== */
const PUENTE = (() => {
  const raiz = document.documentElement;
  const CABLE = 6, ANCHO = 14;
  /* pulso de 40 unidades: cada capa se describe por la silueta visible detrás de la
     cabeza [desde, hasta] y su grosor; con extremos redondos el trazo va de
     desde + grosor/2 a hasta − grosor/2 (a y b: distancias detrás de la cabeza) */
  const PULSO = [["pt-p-halo", -8, 48, 40], ["pt-p-cuerpo", 0, 40, 12], ["pt-p-nucleo", 3, 30, 5]]
    .map(([cls, desde, hasta, w]) => ({ cls, w, a: desde + w / 2, b: Math.max(desde + w / 2 + .01, hasta - w / 2) }));
  // capas del brillo cian de la ruta activa, de la más ancha a la más fina (grosores en puente.css)
  const ESTELA = ["pt-halo", "pt-brillo", "pt-hilo"];

  /* ---------- estado del puente ---------- */
  let sale = null, fundido = null;
  // ctx: { side, m, theme, tr, regreso, k, sec }
  function empezar(ctx = {}) {
    raiz.classList.add("puente");
    /* regreso desde un mundo que aún no tiene salida propia (no deja capa): en vez de
       desaparecer de golpe, la estación que se deja se va con la cámara y se funde */
    if (ctx.regreso && ctx.sec && !MUNDOS.conEntrada(ctx.theme) && !reduced && !MOTION.skip) {
      sale = ctx.sec;
      sale.classList.add("puente-sale");
      fundido = sale.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 560, easing: "cubic-bezier(.4,0,.7,1)", fill: "forwards" });
    }
  }
  function terminar() {
    raiz.classList.remove("puente");
    fundido?.cancel(); fundido = null;
    sale?.classList.remove("puente-sale"); sale = null;
  }

  /* ---------- el cable del puente en una capa fija ----------
     Lo que se ve al llegar a la estación 0 (o al dejar la estación k): cable gris de 6
     unidades a media altura, de borde a borde. Con señal: el brillo cian entra por el lado
     de llegada ("derecha" en el MUX, "izquierda" en el DEMUX) y la cabeza del pulso queda
     en el centro. Coordenadas: unidades de diseño con el origen en el centro de la pantalla,
     a la misma escala que la cámara. Devuelve el <svg> (con .pulso y .estela). */
  function cable(capa, { desde = "derecha", senal = false } = {}) {
    const w = innerWidth, h = innerHeight, s = Math.min(w / FW, h / FH), W = w / s, H = h / s;
    const svg = mk("svg", { class: "pt-capa", viewBox: `${-W / 2} ${-H / 2} ${W} ${H}`, "aria-hidden": "true" }, capa);
    mk("path", { class: "pt-cable", d: `M${-W / 2 - 20} 0H${W / 2 + 20}` }, svg);
    if (senal) {
      const lado = desde === "derecha" ? 1 : -1;
      svg.estela = mk("g", { class: "pt-tramo" }, svg);
      ESTELA.forEach(c => mk("path", { class: c, d: `M${lado * (W / 2 + 40)} 0H0` }, svg.estela));
      svg.pulso = mk("g", { class: "pt-pulso" }, svg);
      PULSO.forEach(p => mk("path", { class: p.cls, "stroke-width": p.w, d: `M${lado * p.b} 0H${lado * p.a}` }, svg.pulso));
    }
    return svg;
  }

  return { empezar, terminar, cable, CABLE, ANCHO, PULSO, ESTELA };
})();

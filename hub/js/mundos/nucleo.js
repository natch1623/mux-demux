"use strict";
/* =====================================================================
   Mundos · núcleo común (especificación: docs/ESPECIFICACION-MUNDOS.md;
   contrato para quien programe un mundo: docs/MUNDOS-CONTRATO.md)

   - Registro: cada mundo se define con MUNDOS.definir(tema, parte); varios
     archivos pueden aportar partes del mismo mundo (escena, estaciones…).
   - Retícula fija de la estación: título 12 % · componente 56 % · selección
     abajo al centro · explicación lateral 22 % · márgenes 4 % · chip «S₁S₀ = XX».
   - Entrada y salida del mundo, transiciones internas en rotación, fases propias.
   - Utilidades: capa fija, instantánea de la estación y animaciones que
     respetan «Omitir transición» y el movimiento reducido (fundido de 300 ms).
   Nunca calcula ni cambia bits: solo representación.
   ===================================================================== */
const MUNDOS = (() => {
  const BITS = { marceline: "00", tsaritsa: "01", venom: "10", dio: "11" };
  const reg = {};

  /* ---------- registro ---------- */
  function definir(tema, parte) {
    const w = reg[tema] || (reg[tema] = { transiciones: [], estaciones: {} });
    const { transiciones = [], estaciones = {}, ...resto } = parte;
    Object.assign(w, resto);
    w.transiciones.push(...transiciones);
    for (const id in estaciones) w.estaciones[id] = Object.assign(w.estaciones[id] || {}, estaciones[id]);
  }
  const activo = tema => !!reg[tema];
  const temaDe = def => def && MEMBERS[def.m]?.theme;

  /* ---------- movimiento ---------- */
  // quieto: sin animación alguna (revisión ?still u «Omitir transición»)
  const quieto = () => STILL || MOTION.skip;
  // suave: el sistema pide movimiento reducido → solo fundidos de 300 ms
  const suave = () => !STILL && mq.matches;
  /* animación WAAPI: se completa con «Omitir transición» (que termina las animaciones finitas),
     nunca rechaza, y en modo quieto aplica el estado final al instante */
  async function anim(el, frames, opts = {}) {
    const o = typeof opts === "number" ? { duration: opts } : { ...opts };
    o.fill ??= "both";
    if (quieto()) { o.duration = 0; o.delay = 0; o.endDelay = 0; o.iterations = 1; }
    const a = el.animate(frames, o);
    if (MOTION.skip) try { a.finish(); } catch {}
    try { await a.finished; } catch (e) { if (e.name !== "AbortError") throw e; }
    return a;
  }
  const esperar = ms => wait(quieto() ? 0 : ms);

  /* ---------- capas fijas en pantalla ---------- */
  // capa a pantalla completa, por encima del lienzo y debajo de la barra de navegación
  function capa(cls = "") {
    const c = html(`<div class="mundo-capa ${cls}" aria-hidden="true"></div>`);
    document.body.append(c);
    return c;
  }
  /* copia visual de la estación actual, fija en pantalla con la escala de la cámara
     (para voltear, borrar o deformar la diapositiva que se va) */
  function instantanea(sec = $(".st.cur")) {
    const c = capa("mundo-instantanea");
    if (!sec) return c;
    const r = sec.getBoundingClientRect(), s = r.width / FW;
    const copia = sec.cloneNode(true);
    copia.removeAttribute("data-id");
    copia.classList.add("copia");
    copia.inert = true;
    Object.assign(copia.style, { left: `${r.left}px`, top: `${r.top}px`, transform: `scale(${s})`, transformOrigin: "0 0", position: "absolute", margin: 0 });
    // los lienzos no se copian solos
    const a = $$("canvas", sec), b = $$("canvas", copia);
    a.forEach((cv, i) => { try { b[i].getContext("2d").drawImage(cv, 0, 0); } catch {} });
    c.append(copia);
    c.copia = copia;
    return c;
  }
  const quitar = el => el?.remove();

  /* ---------- retícula ---------- */
  const chipMundo = tema => html(`<p class="mundo-chip" aria-label="Indicador de mundo: S1 S0 igual a ${BITS[tema].split("").join(" ")}"><span>S₁S₀</span><i>=</i><b>${BITS[tema]}</b></p>`);
  /* reparte el contenido de una estación «texto + figura» en las zonas de la retícula.
     Si el constructor del mundo ya usó las zonas, solo agrega el chip. */
  function reticula(sec, tema) {
    const box = $(".st-in", sec);
    if (!$(":scope > .z-titulo", box)) {
      const titulo = html('<header class="z-titulo"><div class="z-tit"></div></header>');
      const comp = html('<div class="z-comp"></div>'), sel = html('<div class="z-sel"></div>'), expl = html('<div class="z-expl"></div>');
      const tit = titulo.firstChild;
      const text = $(":scope > .col-text", box);
      // las composiciones especiales también se reparten:
      // «texto + figura» (también el anillo), ecuación al centro y árbol a pantalla completa
      const eq = $(":scope > .eq-stage", box), head = $(":scope > .full-head", box);
      if (text) {
        expl.className += text.className.replace("col-text", "");
        [$(":scope > .chip", text), $(":scope > h2", text)].filter(Boolean).forEach(e => tit.append(e));
        $$(":scope > .ctrl", text).forEach(e => sel.append(e));
        [...text.children].forEach(e => expl.append(e));
        text.remove();
      } else if (eq) {
        [$(":scope > .chip", eq), $(":scope > h2", eq)].filter(Boolean).forEach(e => tit.append(e));
        sec.classList.add("z-ancha");                 // la ecuación usa todo el ancho
      } else if (head) {
        [$(".full-title > .chip", head), $(".full-title > h2", head)].filter(Boolean).forEach(e => tit.append(e));
        const side = $(".full-side", head);
        if (side) { $$(":scope > .ctrl", side).forEach(e => sel.append(e)); [...side.children].forEach(e => expl.append(e)); }
        head.remove();
      }
      // el botón secreto conserva su lugar (posición absoluta en la estación)
      [...box.children].filter(e => !e.matches(".secret, .secreto-anexo")).forEach(e => comp.append(e));
      box.append(titulo, comp, sel, expl);
    }
    if (!$(".mundo-chip", box)) $(":scope > .z-titulo", box).append(chipMundo(tema));
  }

  /* ---------- montaje (desde DRESS.station) ---------- */
  function montar(sec, tema, side, k) {
    sec.classList.add("mundo", "reticula");
    sec.dataset.realm = tema;
    reticula(sec, tema);
    reg[tema].montar?.(sec, { tema, side, k, id: sec.dataset.id, bits: BITS[tema] });
  }
  /* constructor propio de una estación (en vez del de content.js / worlds.js).
     Se llama antes de que buildStations complete def (def.el, def.m… aún no existen). */
  function construir(def, el, side, m, k) {
    const e = reg[MEMBERS[m]?.theme]?.estaciones?.[`${side}-${m}-${k}`];
    if (!e?.build) return false;
    e.build(el, def, { side, m, k, id: `${side}-${m}-${k}` });
    return true;
  }

  /* ---------- selección de la estación visible (desde REALMS.select) ---------- */
  let actual = null;           // tema del mundo en curso (o null)
  function seleccionar(def) {
    const tema = def && activo(temaDe(def)) ? temaDe(def) : null;
    if (tema !== actual) {
      if (actual) reg[actual].detener?.();
      actual = tema;
      if (tema) reg[tema].iniciar?.();
    }
    document.documentElement.classList.toggle("en-mundo", !!tema);
    if (tema) reg[tema].mostrar?.(def.el, def);
  }

  /* ---------- transiciones entre estaciones del mismo mundo ----------
     Un mundo que aún conserva su escena anterior puede traer solo sus transiciones
     (MUNDOS.transiciones): no cuenta como rediseñado, pero usa la misma rotación. */
  const turno = {}, soloTrans = {};
  const transiciones = (tema, lista) => (soloTrans[tema] ||= []).push(...lista);
  const conTransiciones = tema => activo(tema) || !!soloTrans[tema]?.length;
  async function fundido(commit) {
    const c = instantanea();
    commit();
    try { await anim(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease" }); }
    finally { quitar(c); }
  }
  async function transicion(tema, commit, dir) {
    let hecho = false;
    const una = () => { if (!hecho) { hecho = true; commit(); } };
    const lista = reg[tema]?.transiciones?.length ? reg[tema].transiciones : (soloTrans[tema] || []);
    try {
      if (quieto() || !lista.length) return una();
      if (suave()) return await fundido(una);
      // en orden, sin repetir la misma dos veces seguidas
      turno[tema] = ((turno[tema] ?? -1) + 1) % lista.length;
      const t = lista[turno[tema]];
      await t.run({ commit: una, dir, desde: $(".st.cur"), hacia: () => $(".st.cur"), tema, capa, instantanea, anim, esperar, quitar });
    } finally { una(); }
  }

  /* ---------- entrada y salida del mundo ---------- */
  let cortina = null;          // capa que deja la salida, hasta que empieza el vuelo de regreso
  // mundos que aún conservan su escena anterior pero ya tienen entrada y salida propias
  const soloSec = {};
  const secuencias = (tema, partes) => { soloSec[tema] = Object.assign(soloSec[tema] || {}, partes); };
  const conEntrada = tema => !!(reg[tema]?.entrar || soloSec[tema]?.entrar);
  const sec = (tema, k) => reg[tema]?.[k] ? reg[tema] : soloSec[tema];
  const base = (tema, ctx) => Object.assign({ tema, bits: BITS[tema], capa, instantanea, anim, esperar, quitar,
    desde: ctx.side === "mux" ? "derecha" : "izquierda" }, ctx);
  async function entrar(tema, ctx) {
    const w = sec(tema, "entrar");
    if (quieto() || !w?.entrar) return;
    if (suave()) {
      const c = capa("mundo-puente");
      try { await anim(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease" }); } finally { quitar(c); }
      return;
    }
    await w.entrar(base(tema, ctx));
  }
  async function salir(tema, ctx) {
    const w = sec(tema, "salir");
    soltar();
    if (quieto() || !w?.salir) return;
    if (suave()) {
      cortina = capa("mundo-puente");
      await anim(cortina, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease" });
      return;
    }
    // la salida devuelve la capa que deja en pantalla (fondo del puente y cable gris)
    cortina = (await w.salir(base(tema, ctx))) || null;
  }
  // el vuelo de regreso ya empezó: la capa de la salida se retira
  function soltar() {
    const c = cortina; cortina = null;
    if (!c) return;
    if (quieto()) return quitar(c);
    anim(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-out" }).then(() => quitar(c));
  }

  /* ---------- fases ----------
     fases(def): las fases propias de una estación ({ etiquetas, aplicar(sec, n, info) }) o null.
     fase(def, n, info): REALMS avisa cada cambio de fase (n = fase visible; sin guía, la última).
     info: { guiado, total, custom, previa } · previa = fase anterior de esa estación (para animar
     solo al avanzar). Con fases propias llama a aplicar(); si no, al fase() del mundo. */
  function fases(def) { return reg[temaDe(def)]?.estaciones?.[def.el?.dataset.id]?.fases || null; }
  const previas = new WeakMap();
  function fase(def, n, info) {
    const tema = temaDe(def);
    if (!def?.el || !activo(tema)) return;
    const previa = previas.get(def.el) ?? null;
    previas.set(def.el, n);
    const i = { ...info, previa, adelante: previa != null && n > previa };
    if (info.custom) info.custom.aplicar(def.el, n, i);
    else reg[tema].fase?.(def.el, n, i);
  }

  return { BITS, definir, activo, transiciones, conTransiciones, secuencias, conEntrada, montar, construir, seleccionar, transicion, entrar, salir, soltar, fases, fase,
    capa, instantanea, anim, esperar, quieto, suave, quitar, get actual() { return actual; } };
})();

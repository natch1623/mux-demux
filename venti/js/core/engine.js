/* =====================================================================
   Motor de fases — "slides con fases"
   - Cada diapositiva declara sus fases (una nota de orador por fase).
   - El estado de una fase es DECLARATIVO: para la fase p se aplican las
     clases p0..p(p) y se encienden los [data-in]/[data-out]; así avanzar
     y retroceder siempre deja el mismo estado (reversible por diseño).
   - Toque / clic / espacio / → avanzan; ← retrocede.
   ===================================================================== */
(function () {
  "use strict";

  const Style = {
    get(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); },
    ms(name) { const v = Style.get(name); return v.endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000; }
  };
  window.Style = Style;

  const STAGE_W = 1920, STAGE_H = 1080;
  const defs = [];
  const state = { i: 0, p: 0, started: false, lastStep: 0, startTime: 0, slideStart: 0, busy: false };
  let root, stage, slidesEl, hud, inlineNotes, notesWin = null;
  const listeners = [];

  /* ---------- utilidades ---------- */
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

  /* ---------- registro ---------- */
  function add(def) {
    def.notes = def.notes || [""];
    def.phases = def.notes.length;
    def.time = def.time || 60;
    defs.push(def);
  }

  /* ---------- escalado 16:9 ---------- */
  function fit() {
    const w = window.innerWidth, h = window.innerHeight;
    const s = Math.min(w / STAGE_W, h / STAGE_H);
    const ox = (w - STAGE_W * s) / 2, oy = (h - STAGE_H * s) / 2;
    stage.style.transform = `translate(${ox}px, ${oy}px) scale(${s})`;
    Deck.scale = s; Deck.offset = { x: ox, y: oy };
    if (window.Sky3D) Sky3D.resize(STAGE_W * s, STAGE_H * s, ox, oy);
  }

  /* ---------- construcción ---------- */
  function build() {
    root = document.documentElement;
    stage = document.getElementById("stage");
    slidesEl = document.getElementById("slides");
    hud = document.getElementById("hud");
    inlineNotes = document.getElementById("inline-notes");

    defs.forEach((d, i) => {
      const sec = el("section", "slide " + (d.cls || ""));
      sec.id = "s-" + d.id;
      sec.dataset.index = i;
      sec.innerHTML = d.html || "";
      const lab = el("div", "labels3d");
      sec.appendChild(lab);
      d.el = sec; d.labels = lab;
      d.ctx = makeCtx(d, i);
      slidesEl.appendChild(sec);
      if (d.init) d.init(d.ctx);
    });
    buildHud();
  }

  function makeCtx(d, i) {
    return {
      def: d, index: i, el: null,
      get root() { return d.el; },
      q: s => d.el.querySelector(s),
      qa: s => Array.from(d.el.querySelectorAll(s)),
      get phase() { return state.i === i ? state.p : 0; },
      get calm() { return root.classList.contains("calm") || matchMedia("(prefers-reduced-motion: reduce)").matches; },
      timers: [],
      later(fn, ms) { const t = setTimeout(fn, this.calm ? 0 : ms); this.timers.push(t); return t; },
      clearTimers() { this.timers.forEach(clearTimeout); this.timers.length = 0; },
      every(fn, ms) { const t = setInterval(fn, ms); this.timers.push(t); return t; }
    };
  }

  /* ---------- HUD: lira de progreso ---------- */
  function buildHud() {
    hud.innerHTML = `
      <div class="hud-who"><span class="hud-name"></span><span class="hud-topic"></span></div>
      <div class="hud-lyre" aria-hidden="true">
        <div class="hud-track"></div>
        <div class="hud-slides"></div>
        <svg class="hud-feather" viewBox="0 0 40 40"><path d="M6 34 C 14 22, 22 12, 34 6 C 30 16, 22 26, 6 34 Z"/><path class="spine" d="M6 34 L 30 10"/></svg>
      </div>
      <div class="hud-phases" aria-label="fases"></div>
      <div class="hud-count"></div>`;
    const sl = hud.querySelector(".hud-slides");
    defs.forEach((d, i) => {
      const b = el("i", "hud-dot");
      b.dataset.who = d.who || "";
      b.title = (i + 1) + ". " + d.title;
      sl.appendChild(b);
    });
  }

  function updateHud() {
    const d = defs[state.i];
    hud.querySelector(".hud-name").textContent = d.who || "";
    hud.querySelector(".hud-topic").textContent = d.topic || "";
    const dots = hud.querySelectorAll(".hud-dot");
    dots.forEach((b, k) => { b.classList.toggle("done", k < state.i); b.classList.toggle("now", k === state.i); });
    const frac = defs.length > 1 ? (state.i + state.p / Math.max(1, d.phases)) / (defs.length - 1) : 0;
    hud.style.setProperty("--progress", clamp(frac, 0, 1));
    const ph = hud.querySelector(".hud-phases");
    if (ph.childElementCount !== d.phases) { ph.innerHTML = ""; for (let k = 0; k < d.phases; k++) ph.appendChild(el("i", "ph")); }
    ph.querySelectorAll(".ph").forEach((b, k) => { b.classList.toggle("on", k <= state.p); b.classList.toggle("now", k === state.p); });
    hud.querySelector(".hud-count").textContent = `${state.i + 1}/${defs.length}`;
    hud.classList.toggle("hidden", !!d.hideHud);
  }

  /* ---------- aplicar una fase (idempotente) ---------- */
  function applyPhase(d, p, dir) {
    const s = d.el;
    s.dataset.phase = p;
    for (let k = 0; k < Math.max(d.phases, 12); k++) s.classList.toggle("p" + k, k <= p);
    s.querySelectorAll("[data-in],[data-out]").forEach(n => {
      const a = n.dataset.in != null ? +n.dataset.in : 0;
      const b = n.dataset.out != null ? +n.dataset.out : 1e9;
      n.classList.toggle("on", p >= a && p < b);
    });
    s.querySelectorAll("[data-at]").forEach(n => {
      n.classList.toggle("now", n.dataset.at.split(",").map(Number).includes(p));
    });
    d.ctx.clearTimers();
    if (d.onPhase) d.onPhase(d.ctx, p, dir);
    if (window.Sky3D) Sky3D.setPhase(state.i, p, dir);
  }

  /* ---------- navegación ---------- */
  function markStep() {
    const now = performance.now();
    // Dos toques muy seguidos = "saltar animación": la fase se aplica sin transición
    if (now - state.lastStep < 260) { root.classList.add("instant"); clearTimeout(markStep.t); markStep.t = setTimeout(() => root.classList.remove("instant"), 120); }
    state.lastStep = now;
    if (!state.started) { state.started = true; state.startTime = Date.now(); state.slideStart = Date.now(); }
  }

  function next() {
    if (window.Vientos) Vientos.finish();
    const d = defs[state.i];
    markStep();
    if (state.p < d.phases - 1) { state.p++; applyPhase(d, state.p, 1); after(); }
    else if (state.i < defs.length - 1) go(state.i + 1, 0, 1);
  }
  function prev() {
    if (window.Vientos) Vientos.finish();
    const d = defs[state.i];
    markStep();
    if (state.p > 0) { state.p--; applyPhase(d, state.p, -1); after(); }
    else if (state.i > 0) go(state.i - 1, defs[state.i - 1].phases - 1, -1);
  }

  function go(i, p, dir) {
    if (window.Vientos) Vientos.finish();
    i = clamp(i, 0, defs.length - 1);
    const from = defs[state.i], to = defs[i];
    if (from === to) { state.p = clamp(p, 0, to.phases - 1); applyPhase(to, state.p, dir || 1); after(); return; }
    dir = dir || (i > state.i ? 1 : -1);
    if (from.onLeave) from.onLeave(from.ctx);
    from.ctx.clearTimers();

    // transición coreografiada (js/core/vientos.js): la diapositiva nueva se
    // arma en el «relevo» del efecto, por eso onEnter/applyPhase van en enter()
    const fromIdx = state.i;
    const enter = () => { if (to.onEnter) to.onEnter(to.ctx, dir); applyPhase(to, state.p, dir); };
    const fx = window.Vientos && Vientos.play({ from, to, fromIdx, toIdx: i, dir, enter });
    if (fx) {
      state.i = i; state.p = clamp(p, 0, to.phases - 1);
      state.slideStart = Date.now();
      from.el.classList.remove("current", "entering");
      to.el.classList.add("current");
      if (window.Sky3D) Sky3D.travel(i, dir, false, fx.cam);
      fx.start();
      after();
      return;
    }

    // transición propia: la diapositiva saliente "se la lleva el viento"
    const dur = Style.ms("--dur-slide");
    slidesEl.querySelectorAll(".slide.leaving").forEach(n => n.classList.remove("leaving", "fwd", "back"));
    from.el.classList.remove("current", "entering");
    from.el.classList.add("leaving", dir > 0 ? "fwd" : "back");
    const old = from.el;
    setTimeout(() => old.classList.remove("leaving", "fwd", "back"), dur + 60);

    state.i = i; state.p = clamp(p, 0, to.phases - 1);
    state.slideStart = Date.now();
    to.el.classList.remove("leaving", "fwd", "back");
    to.el.classList.add("current", "entering", dir > 0 ? "from-right" : "from-left");
    setTimeout(() => to.el.classList.remove("entering", "from-right", "from-left"), dur + 60);

    if (window.Sky3D) Sky3D.travel(i, dir);
    if (to.onEnter) to.onEnter(to.ctx, dir);
    applyPhase(to, state.p, dir);
    after();
  }

  function after() {
    updateHud();
    renderNotes();
    try { history.replaceState(null, "", "#" + (state.i + 1) + "." + (state.p + 1)); } catch (e) { /* file:// en algunos navegadores */ }
    listeners.forEach(fn => fn(state.i, state.p));
  }

  /* ---------- notas del orador ---------- */
  function notesHTML() {
    const d = defs[state.i];
    const nd = defs[state.i + 1];
    const elapsed = state.started ? (Date.now() - state.startTime) / 1000 : 0;
    const sEl = state.started ? (Date.now() - state.slideStart) / 1000 : 0;
    const planned = defs.slice(0, state.i).reduce((a, x) => a + x.time, 0);
    const delta = elapsed - planned;
    const items = d.notes.map((n, k) => `<li class="${k === state.p ? "now" : k < state.p ? "done" : ""}"><b>Fase ${k + 1}</b> ${n}</li>`).join("");
    const nextTxt = state.p < d.phases - 1 ? `Fase ${state.p + 2}: ${d.notes[state.p + 1]}` : nd ? `Diapositiva ${state.i + 2} · ${nd.title} (${nd.who || ""})` : "Fin";
    return `
      <header>
        <div class="t-total"><small>Total</small>${fmt(elapsed)}<small> / meta ${fmt(defs.reduce((a, x) => a + x.time, 0))}</small></div>
        <div class="t-slide ${sEl > d.time ? "late" : ""}"><small>Esta diapositiva</small>${fmt(sEl)}<small> / ${fmt(d.time)}</small></div>
        <div class="t-delta ${state.started && delta > 20 ? "late" : ""}"><small>Ritmo (vs. plan)</small>${state.started ? (delta >= 0 ? "+" : "−") + fmt(Math.abs(delta)) : "—"}</div>
      </header>
      <h2>${state.i + 1}. ${d.title} <span>${d.who || ""}${d.topic ? " · " + d.topic : ""}</span></h2>
      <ol>${items}</ol>
      ${d.extra ? `<div class="extra">${d.extra}</div>` : ""}
      <p class="next"><b>Siguiente →</b> ${nextTxt}</p>
      <nav><button data-act="prev">← Atrás</button><button data-act="next">Avanzar →</button><button data-act="reset">Reiniciar cronómetro</button></nav>`;
  }

  function renderNotes() {
    if (inlineNotes && inlineNotes.classList.contains("open")) inlineNotes.innerHTML = notesHTML();
    if (notesWin && !notesWin.closed) {
      try { notesWin.document.getElementById("notes").innerHTML = notesHTML(); } catch (e) { notesWin = null; }
    }
  }
  setInterval(() => { if (state.started) renderNotes(); }, 1000);

  function openNotesWindow() {
    if (notesWin && !notesWin.closed) { notesWin.focus(); return; }
    const w = window.open("", "notas-mux-demux", "width=960,height=760");
    if (!w) { toggleInline(); return; }
    notesWin = w;
    const base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    w.document.open();
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Notas del orador · MUX/DEMUX</title>
      <link rel="stylesheet" href="${base}css/tokens.css"><link rel="stylesheet" href="${base}css/notes.css"></head>
      <body class="notes-window"><main id="notes"></main></body></html>`);
    w.document.close();
    w.document.addEventListener("keydown", onKey);
    w.document.addEventListener("click", onNotesClick);
    renderNotes();
  }
  function toggleInline() {
    inlineNotes.classList.toggle("open");
    renderNotes();
  }
  function onNotesClick(e) {
    const b = e.target.closest("[data-act]"); if (!b) return;
    if (b.dataset.act === "next") next();
    if (b.dataset.act === "prev") prev();
    if (b.dataset.act === "reset") { state.startTime = Date.now(); state.slideStart = Date.now(); state.started = true; renderNotes(); }
  }

  /* ---------- entrada ---------- */
  function onKey(e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key;
    if (["ArrowRight", " ", "PageDown", "Enter"].includes(k)) {
      // en el simulador, Enter/Espacio sobre un botón lo activan sin avanzar
      if ((k === " " || k === "Enter") && e.target && e.target.closest && e.target.closest("button,[role=button]")) return;
      e.preventDefault(); next();
    }
    else if (["ArrowLeft", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); prev(); }
    else if (k === "Home") go(0, 0, -1);
    else if (k === "s" || k === "S") { const j = defs.findIndex(d => d.id === "simulador"); if (j >= 0) go(j, 0); }
    else if (k === "End") go(defs.length - 1, 0, 1);
    else if (k === "n" || k === "N") openNotesWindow();
    else if (k === "h" || k === "H") toggleInline();
    else if (k === "m" || k === "M") { root.classList.toggle("calm"); toast(root.classList.contains("calm") ? "Animaciones mínimas" : "Animaciones completas"); }
    else if (k === "f" || k === "F") { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen(); }
    else if (k === "Escape" && inlineNotes.classList.contains("open")) toggleInline();
  }

  let pDown = null;
  function isUI(t) { return t.closest && t.closest("button, a, input, select, label, [data-ui], .notes-inline"); }
  function onPointerDown(e) { if (isUI(e.target)) { pDown = null; return; } pDown = { x: e.clientX, y: e.clientY, t: performance.now() }; }
  function onPointerUp(e) {
    if (!pDown || isUI(e.target)) { pDown = null; return; }
    const dx = e.clientX - pDown.x, dy = e.clientY - pDown.y;
    pDown = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); return; } // deslizar
    if (Math.hypot(dx, dy) > 20) return;
    const x = (e.clientX - Deck.offset.x) / Deck.scale;
    if (x < STAGE_W * 0.12) prev(); else next(); // borde izquierdo = atrás
  }

  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 1400);
  }

  /* ---------- arranque ---------- */
  function start() {
    build();
    fit();
    window.addEventListener("resize", fit);
    document.addEventListener("keydown", onKey);
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointerup", onPointerUp);
    inlineNotes.addEventListener("click", onNotesClick);

    if (window.Sky3D) Sky3D.init(document.getElementById("gl"), defs);
    fit();

    // reanudar desde #diapositiva.fase
    const m = /#(\d+)(?:\.(\d+))?/.exec(location.hash);
    const i = m ? clamp(+m[1] - 1, 0, defs.length - 1) : 0;
    const p = m && m[2] ? +m[2] - 1 : 0;
    state.i = i;
    defs[i].el.classList.add("current");
    if (window.Sky3D) Sky3D.travel(i, 0, true);
    if (defs[i].onEnter) defs[i].onEnter(defs[i].ctx, 1);
    state.p = clamp(p, 0, defs[i].phases - 1);
    applyPhase(defs[i], state.p, 1);
    after();
    document.body.classList.add("ready");
    window.addEventListener("hashchange", () => {
      const h = /#(\d+)(?:\.(\d+))?/.exec(location.hash);
      if (h) go(+h[1] - 1, h[2] ? +h[2] - 1 : 0);
    });
  }

  const Deck = {
    add, start, next, prev, go, toast,
    get defs() { return defs; },
    get state() { return { i: state.i, p: state.p }; },
    onChange(fn) { listeners.push(fn); },
    STAGE_W, STAGE_H, scale: 1, offset: { x: 0, y: 0 }
  };
  window.Deck = Deck;
})();

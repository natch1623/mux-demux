"use strict";
/* =====================================================================
   Contenido de Ana (Marceline), Jonathan (Venom) y Carlos (DIO).
   Cada estación: una idea, una interacción, poco texto en pantalla;
   la explicación completa va en las notas (tecla N).
   Las estaciones reciben los eventos "enter" y "leave" cuando la cámara
   llega o se va (para animaciones que corren solo mientras se ven).
   ===================================================================== */
const sub = (v, i) => `${v}<sub>${i}</sub>`;                 // solo en HTML
// dentro de SVG no se puede usar <sub> (rompe el SVG): dígitos subíndice Unicode
const usv = (v, i) => v + String(i).split("").map(d => "₀₁₂₃₄₅₆₇₈₉"[d]).join("");
const bits2 = i => i.toString(2).padStart(2, "0");

/* plantilla común: texto a la izquierda, figura a la derecha */
function shell(side, m, kicker, h2, lede, { fig = "", ctrl = "", extra = "", cls = "" } = {}) {
  return `<div class="col-text ${cls}">
      <p class="chip"><b>${side === "mux" ? "MUX" : "DEMUX"}</b>${kicker} · ${MEMBERS[m].name}</p>
      <h2>${h2}</h2>
      <p class="lede">${lede}</p>
      ${extra}
      ${ctrl ? `<div class="ctrl">${ctrl}</div>` : ""}
    </div>${fig}`;
}
/* botón de palanca accesible (HTML) */
const tg = (k, label) => `<button class="tg" data-k="${k}" aria-pressed="false"><span>${label}</span><b>0</b></button>`;
function bindToggles(el, L) {
  $$(".tg[data-k]", el).forEach(b => b.addEventListener("click", e => { e.stopPropagation(); L.toggle(b.dataset.k); }));
  L.on(L => $$(".tg[data-k]", el).forEach(b => {
    const v = L.st[b.dataset.k];
    b.setAttribute("aria-pressed", v ? "true" : "false");
    $("b", b).textContent = v;
  }));
}
/* selector segmentado accesible */
function seg(name, opts, cur) {
  return `<div class="seg" role="radiogroup" aria-label="${name}">${opts.map(([v, t]) =>
    `<button role="radio" data-v="${v}" aria-checked="${v === cur}">${t}</button>`).join("")}</div>`;
}
function bindSeg(el, fn) {
  $$(".seg button", el).forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    $$(".seg button", el).forEach(x => x.setAttribute("aria-checked", x === b));
    fn(b.dataset.v);
  }));
}
const onStation = (el, enter, leave) => {
  const st = () => el.closest(".st");
  queueMicrotask(() => { st()?.addEventListener("enter", enter); if (leave) st()?.addEventListener("leave", leave); });
};

/* árbol de bloques 2:1 (cascada): N entradas → 1 salida (o espejo para DEMUX).
   Se despliega nivel por nivel (--l) y devuelve el recorrido de la entrada «pick»
   hasta la salida, para que la señal lo cruce. */
function treeSVG(N, mirror, { W = 900, H = 520, pick = 0 } = {}) {
  const n = Math.log2(N), x0 = 70, colW = (W - 140) / (n + .4);
  const X = v => mirror ? W - v : v;
  let s = "";
  const yIn = k => 30 + (k + .5) * (H - 60) / N;
  let prev = Array.from({ length: N }, (_, k) => yIn(k)), at = pick;
  const trail = [[X(x0 - 6), yIn(pick)]];
  for (let j = 0; j < n; j++) {
    const next = [];
    for (let b = 0; b < prev.length / 2; b++) {
      const ya = prev[2 * b], yb = prev[2 * b + 1], yc = (ya + yb) / 2, x = x0 + (j + .5) * colW;
      const h = Math.max(22, (yb - ya) * .5 + 18), w = Math.min(70, colW * .45);
      const xs = j ? x - colW + w : x - colW * .5;           // sale del bloque anterior (o de las entradas)
      s += `<g class="lvl" style="--l:${j}"><path class="w" d="M${X(xs)} ${ya}H${X(x)}M${X(xs)} ${yb}H${X(x)}"/>`;
      s += `<polygon class="blk" points="${X(x)},${yc - h} ${X(x + w)},${yc - h * .55} ${X(x + w)},${yc + h * .55} ${X(x)},${yc + h}"/>`;
      if (j === 0 && N <= 4) s += `<text class="t-mini" x="${X(x + w / 2)}" y="${yc + 6}">2:1</text>`;
      s += `</g>`;
      if (b === at >> 1) trail.push([X(x), at % 2 ? yb : ya], [X(x + w), yc]);
      next.push(yc);
    }
    at >>= 1;
    prev = next;
  }
  const xe = X(x0 + (n - .5) * colW + Math.min(70, colW * .45));
  s += `<g class="lvl" style="--l:${n}"><path class="w on" d="M${xe} ${prev[0]}H${X(W - 30)}"/><circle class="pin out" cx="${X(W - 30)}" cy="${prev[0]}" r="14"/></g>`;
  trail.push([X(W - 30), prev[0]]);
  for (let k = 0; k < N; k++) s += `<circle class="pin${k === pick ? " one" : ""}" cx="${X(x0 - 6)}" cy="${yIn(k)}" r="${N > 8 ? 7 : 10}"/>`;
  // camino: horizontal hasta cada bloque y lo cruza en diagonal (al revés en el DEMUX)
  const pts = mirror ? trail.slice().reverse() : trail;
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
  return { svg: `<svg class="fig tree" viewBox="0 0 ${W} ${H}" aria-hidden="true">${s}<path class="route on selected-trail" d="${d}"/></svg>`, trail: d };
}

/* =====================================================================
   ANA · Marceline · Fundamentos — cuerdas y conexiones
   ===================================================================== */
const NOTES4 = ["Mi", "La", "Re", "Sol"];
const ANA = { mux: [], demux: [] };

ANA.mux.push({
  title: "Qué es un multiplexor",
  notes: "Un multiplexor (MUX) tiene varias entradas de datos, unas líneas de selección y una sola salida. Piensen en un bajo de cuatro cuerdas conectado a un solo amplificador: las cuerdas son las entradas I0 a I3, los interruptores de la pedalera S1 y S0 eligen cuál cuerda llega al amplificador, y el amplificador es la salida Y. Solo suena una a la vez. Toquen S1 y S0 para cambiar de cuerda.",
  build(el) {
    const L = Logic({ s1: 0, s0: 1 });
    const ys = [110, 210, 310, 410];
    el.innerHTML = shell("mux", 0, "Fundamentos", "¿Qué es un <em>multiplexor</em>?",
      "Elige <b>una</b> de varias entradas y la envía por <b>una sola</b> salida.", {
        extra: `<dl class="parts"><div><dt>Entradas de datos</dt><dd>${sub("I", 0)}–${sub("I", 3)} · las cuerdas</dd></div>
          <div><dt>Líneas de selección</dt><dd>${sub("S", 1)} ${sub("S", 0)} · pedalera binaria</dd></div>
          <div><dt>Salida</dt><dd>Y · el amplificador</dd></div></dl><p class="readout" data-r></p>`,
        ctrl: tg("s1", "S₁") + tg("s0", "S₀"),
        fig: `<svg class="fig" viewBox="0 0 1000 560" aria-label="Cuatro cuerdas entran a un MUX y una sola llega al amplificador">
          ${ys.map((y, i) => `<g class="peg"><circle cx="58" cy="${y}" r="16"/><text x="58" y="${y - 28}">${usv("I", i)} · ${NOTES4[i]}</text></g>
            <path class="str" data-i="${i}" d="M74 ${y}H560"/>
            <path class="route" data-i="${i}" d="M560 ${y}L690 260"/>`).join("")}
          <polygon class="blk" points="560,60 690,150 690,370 560,460"/><text class="blk-t" x="625" y="275">MUX</text>
          <path class="w" data-out d="M690 260H820"/>
          <g class="amp"><rect x="820" y="170" width="150" height="180" rx="16"/><circle class="cone" cx="895" cy="260" r="54"/><circle cx="895" cy="260" r="16"/></g>
          <text class="lbl" x="895" y="150">Y</text><text class="amp-note" x="895" y="392" data-note></text>
          <path class="w sel" d="M600 433V500M650 398V500"/><text class="lbl s" x="600" y="530">S₁</text><text class="lbl s" x="650" y="530">S₀</text>
        </svg>`
      });
    bindToggles(el, L);
    L.on(L => {
      $$(".str", el).forEach((s, i) => s.classList.toggle("on", i === L.sel));
      $$(".route", el).forEach((s, i) => s.classList.toggle("on", i === L.sel));
      $("[data-note]", el).textContent = `suena ${NOTES4[L.sel]}`;
      $("[data-r]", el).innerHTML = `${sub("S", 1)}${sub("S", 0)} = <b>${bits2(L.sel)}</b> → Y = ${sub("I", L.sel)} (${NOTES4[L.sel]})`;
    });
    DRESS.revealOn($(".fig", el), L, L => `M74 ${ys[L.sel]}H560L690 260H830`, () => $(".amp", el));
  }
});

/* N:1 y 2ⁿ (y su espejo 1:N) */
function nStation(side) {
  const mux = side === "mux";
  return {
    title: mux ? "Notación N:1 y la relación 2ⁿ" : "Notación 1:N y la relación 2ⁿ",
    notes: mux
      ? "Con n líneas de selección se forman 2 elevado a n combinaciones, así que se pueden elegir N = 2^n entradas. Por eso los MUX se nombran N:1 (N entradas, 1 salida): 2:1 usa 1 línea, 4:1 usa 2, 8:1 usa 3 y 16:1 usa 4. Al revés, n = log2 N. Elijan n para ver crecer las cuerdas."
      : "El DEMUX se nombra 1:N: una entrada y N salidas. Igual que el MUX, con n líneas de selección se direccionan N = 2^n salidas: 1:2 usa 1 línea, 1:4 usa 2, 1:8 usa 3 y 1:16 usa 4. Elijan n para ver cuántos amplificadores se pueden alimentar.",
    build(el) {
      el.innerHTML = shell(side, 0, "Fundamentos", mux ? "N : 1 y <em>2ⁿ</em>" : "1 : N y <em>2ⁿ</em>",
        mux ? "Con <b>n</b> líneas de selección se eligen <b>2ⁿ</b> entradas." : "Con <b>n</b> líneas de selección se alcanzan <b>2ⁿ</b> salidas.", {
          extra: `<p class="formula" data-f></p>
            <table class="ice-table compact" aria-label="Relación entre líneas de selección y tamaño"><thead><tr><th>n</th><th>N = 2ⁿ</th><th>nombre</th></tr></thead>
            <tbody>${[1, 2, 3, 4].map(n => `<tr data-n="${n}"><td>${n}</td><td>${2 ** n}</td><td>${mux ? `${2 ** n}:1` : `1:${2 ** n}`}</td></tr>`).join("")}</tbody></table>`,
          ctrl: seg("Líneas de selección n", [[1, "n = 1"], [2, "n = 2"], [3, "n = 3"], [4, "n = 4"]], 2),
          fig: `<svg class="fig" viewBox="0 0 1000 560" data-fan aria-hidden="true"></svg>`
        });
      const svg = $("[data-fan]", el);
      const draw = n => {
        const N = 2 ** n, ys = Array.from({ length: N }, (_, k) => 40 + (k + .5) * 460 / N);
        const X = v => mux ? v : 1000 - v;
        let s = ys.map((y, k) => `<path class="str thin" d="M${X(70)} ${y}C${X(300)} ${y} ${X(380)} ${270 + (y - 270) * .5} ${X(520)} ${270 + (y - 270) * .5}"/>
          ${N <= 8 ? `<text class="lbl xs" x="${X(40)}" y="${y + 7}">${usv(mux ? "I" : "Y", k)}</text>` : k === 0 || k === N - 1 ? `<text class="lbl xs" x="${X(40)}" y="${y + 7}">${usv(mux ? "I" : "Y", k)}</text>` : ""}`).join("");
        s += `<polygon class="blk" points="${[[520, 70], [650, 150], [650, 390], [520, 470]].map(([x, y]) => `${X(x)},${y}`).join(" ")}"/>
          <text class="blk-t" x="${X(585)}" y="282">${mux ? `${N}:1` : `1:${N}`}</text>
          <path class="w on" d="M${X(650)} 270H${X(900)}"/><text class="lbl" x="${X(930)}" y="278">${mux ? "Y" : "D"}</text>`;
        for (let k = 0; k < n; k++) {
          const x = 540 + k * (90 / Math.max(1, n - 1 || 1));
          s += `<path class="w sel" d="M${X(x)} ${470 - (x - 520) * .6}V530"/><text class="lbl xs" x="${X(x)}" y="556">${usv("S", n - 1 - k)}</text>`;
        }
        svg.innerHTML = s;
        DRESS.fig(svg);
        $("[data-f]", el).innerHTML = `N = 2<sup>${n}</sup> = <b>${N}</b> &nbsp;·&nbsp; n = log₂ ${N} = <b>${n}</b>`;
        $$("tr[data-n]", el).forEach(tr => tr.classList.toggle("on", +tr.dataset.n === n));
      };
      draw(2);
      bindSeg(el, v => draw(+v));
    }
  };
}
ANA.mux.push(nStation("mux"));

ANA.demux.push({
  title: "Qué es un demultiplexor",
  notes: "El demultiplexor (DEMUX) hace lo opuesto: una sola entrada de datos D, unas líneas de selección y varias salidas. Imaginen un bajo con un solo cable y una pedalera que lo manda a uno de cuatro amplificadores: S1 y S0 eligen cuál amplificador recibe la señal; los demás quedan en silencio, es decir, en 0. Toquen D, S1 y S0.",
  build(el) {
    const L = Logic({ s1: 1, s0: 0, din: 1 });
    const ys = [110, 210, 310, 410];
    el.innerHTML = shell("demux", 0, "Fundamentos", "¿Qué es un <em>demultiplexor</em>?",
      "Toma <b>una</b> entrada y la envía a <b>una</b> de varias salidas.", {
        extra: `<dl class="parts"><div><dt>Entrada de datos</dt><dd>D · el bajo</dd></div>
          <div><dt>Líneas de selección</dt><dd>${sub("S", 1)} ${sub("S", 0)} · la pedalera</dd></div>
          <div><dt>Salidas</dt><dd>${sub("Y", 0)}–${sub("Y", 3)} · los amplificadores</dd></div></dl><p class="readout" data-r></p>`,
        ctrl: tg("din", "D") + tg("s1", "S₁") + tg("s0", "S₀"),
        fig: `<svg class="fig" viewBox="0 0 1000 560" aria-label="Un cable entra a un DEMUX y llega a uno de cuatro amplificadores">
          <g class="peg"><circle cx="90" cy="260" r="26"/><text x="90" y="216">D</text></g>
          <path class="str in" d="M116 260H330"/>
          <polygon class="blk" points="330,190 460,90 460,430 330,330"/><text class="blk-t" x="395" y="275">DEMUX</text>
          ${ys.map((y, i) => `<path class="route" data-i="${i}" d="M330 260L460 ${y}"/>
            <path class="str out" data-i="${i}" d="M460 ${y}H720"/>
            <g class="amp sm" data-i="${i}"><rect x="720" y="${y - 40}" width="100" height="80" rx="12"/><circle class="cone" cx="770" cy="${y}" r="26"/></g>
            <text class="lbl" x="840" y="${y + 8}" text-anchor="start" data-y="${i}">${usv("Y", i)}</text>`).join("")}
          <path class="w sel" d="M360 353V500M420 399V500"/><text class="lbl s" x="360" y="530">S₁</text><text class="lbl s" x="420" y="530">S₀</text>
        </svg>`
      });
    bindToggles(el, L);
    L.on(L => {
      $(".str.in", el).classList.toggle("on", !!L.st.din);
      $$(".route", el).forEach((s, i) => s.classList.toggle("on", i === L.sel));
      $$(".str.out", el).forEach((s, i) => s.classList.toggle("on", !!L.demux(i)));
      $$(".amp.sm", el).forEach((a, i) => a.classList.toggle("on", !!L.demux(i)));
      $$("[data-y]", el).forEach((t, i) => { t.textContent = `${usv("Y", i)} = ${L.demux(i)}`; });
      $("[data-r]", el).innerHTML = `${sub("S", 1)}${sub("S", 0)} = <b>${bits2(L.sel)}</b> → ${sub("Y", L.sel)} = D = <b>${L.st.din}</b>; las demás = 0`;
    });
    DRESS.revealOn($(".fig", el), L, L => `M116 260H330L460 ${ys[L.sel]}H730`, L => $$(".amp.sm", el)[L.sel]);
  }
});
ANA.demux.push(nStation("demux"));

/* =====================================================================
   JONATHAN · Venom · Diseño y expansión — ramificaciones y cascadas
   ===================================================================== */
const JON = { mux: [], demux: [] };

function sizesStation(side) {
  const mux = side === "mux";
  return {
    title: mux ? "Crecer por cascada: 2:1 → 16:1" : "Crecer por cascada: 1:2 → 1:16",
    layout: "full",
    notes: mux
      ? "Un MUX grande se puede construir ramificando MUX 2:1, como un árbol: cada nivel usa una línea de selección. Un 4:1 necesita 3 bloques 2:1 en 2 niveles; un 8:1, 7 bloques en 3 niveles; un 16:1, 15 bloques en 4 niveles. En general, un N:1 hecho con 2:1 usa N − 1 bloques y log2 N niveles. Al elegir un tamaño, el árbol se despliega nivel por nivel por toda la pantalla y una señal lo recorre desde una entrada hasta la salida."
      : "El DEMUX crece igual, pero el árbol se abre: un 1:2 reparte a dos 1:2, y así sucesivamente. Un 1:N hecho con DEMUX 1:2 usa N − 1 bloques en log2 N niveles; cada nivel lo controla una línea de selección. Al elegir un tamaño, el árbol se despliega y la señal baja por las ramas hasta una salida.",
    build(el) {
      el.innerHTML = `<div class="full-head">
          <div class="full-title"><p class="chip"><b>${mux ? "MUX" : "DEMUX"}</b>Diseño y expansión · ${MEMBERS[2].name}</p>
            <h2>${mux ? "Crecer por <em>ramificación</em>" : "Abrirse en <em>ramas</em>"}</h2></div>
          <div class="full-side"><p class="lede">${mux ? "Un MUX grande es un árbol de MUX 2:1: cada nivel usa una línea de selección." : "Un DEMUX grande es un árbol de DEMUX 1:2 que se abre nivel por nivel."}</p>
            <p class="formula" data-f></p>
            <div class="ctrl">${seg("Tamaño", mux ? [[2, "2:1"], [4, "4:1"], [8, "8:1"], [16, "16:1"]] : [[2, "1:2"], [4, "1:4"], [8, "1:8"], [16, "1:16"]], 8)}</div></div>
        </div>
        <div class="tree-box" data-tree></div>`;
      let first = true;
      const draw = N => {
        const t = treeSVG(N, !mux, { W: 1660, H: 560, pick: Math.max(0, N - 3) });
        const box = $("[data-tree]", el);
        box.innerHTML = t.svg;
        const svg = $("svg", box);
        DRESS.fig(svg);
        $("[data-f]", el).innerHTML = `${mux ? `${N}:1` : `1:${N}`} → <b>${N - 1}</b> bloques ${mux ? "2:1" : "1:2"} · <b>${Math.log2(N)}</b> ${Math.log2(N) === 1 ? "nivel" : "niveles"} = ${Math.log2(N)} ${Math.log2(N) === 1 ? "línea" : "líneas"} de selección`;
        svg.dataset.replay = "true";
        const trace = () => DRESS.pulse(svg, t.trail, { ms: 650, value: "→" });
        svg.addEventListener("replay-signal", trace);
        if (!first) trace();
        first = false;
      };
      draw(8);
      bindSeg(el, v => draw(+v));
    }
  };
}

JON.mux.push(sizesStation("mux"));
JON.mux.push({
  title: "Cascada: un 4:1 con tres 2:1",
  notes: "Aquí el MUX 4:1 está hecho con tres MUX 2:1. Los dos primeros, controlados por S0, eligen entre I0/I1 y entre I2/I3. El tercero, controlado por S1, elige cuál de esos dos resultados sale. El resultado es idéntico al MUX 4:1: Y = I de índice 2·S1 + S0. Toquen las entradas y la selección para comprobarlo.",
  build(el) {
    const L = Logic({ s1: 1, s0: 1, d: [0, 1, 1, 0] });
    el.innerHTML = shell("mux", 2, "Diseño y expansión", "Cascada <em>4 : 1</em>",
      "Dos MUX 2:1 con S₀ y un tercero con S₁ equivalen a un MUX 4:1.", {
        extra: `<p class="readout" data-r></p>`,
        ctrl: tg("s1", "S₁") + tg("s0", "S₀") + [0, 1, 2, 3].map(i => `<button class="tg sm" data-d="${i}" aria-pressed="false"><span>I${SUB[i]}</span><b>0</b></button>`).join(""),
        fig: `<svg class="fig" viewBox="0 0 1000 560" aria-label="MUX 4:1 construido con tres MUX 2:1">
          ${[90, 190, 350, 450].map((y, i) => `<path class="w" data-w="${i}" d="M110 ${y}H260"/><circle class="pin big" data-p="${i}" cx="90" cy="${y}" r="20"/><text class="pin-t" x="90" y="${y + 8}" data-pt="${i}">0</text><text class="lbl xs" x="40" y="${y + 7}">${usv("I", i)}</text>`).join("")}
          <polygon class="blk" points="260,60 360,90 360,190 260,220"/><text class="t-mini" x="310" y="148">2:1</text>
          <polygon class="blk" points="260,320 360,350 360,450 260,480"/><text class="t-mini" x="310" y="408">2:1</text>
          <path class="route" data-a="0" d="M260 90L360 140"/><path class="route" data-a="1" d="M260 190L360 140"/>
          <path class="route" data-b="0" d="M260 350L360 400"/><path class="route" data-b="1" d="M260 450L360 400"/>
          <path class="w" data-wa d="M360 140C480 140 480 220 600 220"/><path class="w" data-wb d="M360 400C480 400 480 320 600 320"/>
          <text class="val" x="455" y="160" data-va>0</text><text class="val" x="455" y="410" data-vb>0</text>
          <polygon class="blk" points="600,170 700,210 700,330 600,370"/><text class="t-mini" x="650" y="278">2:1</text>
          <path class="route" data-c="0" d="M600 220L700 270"/><path class="route" data-c="1" d="M600 320L700 270"/>
          <path class="w" data-wy d="M700 270H860"/><circle class="pin big" data-py cx="890" cy="270" r="30"/><text class="pin-t big" x="890" y="282" data-ty>0</text><text class="lbl" x="890" y="225">Y</text>
          <path class="w sel" data-s0 d="M310 20V75M310 465V540"/><text class="lbl xs" x="340" y="34">S₀</text><text class="lbl xs" x="345" y="540">S₀</text>
          <path class="w sel" data-s1 d="M650 350V540"/><text class="lbl xs" x="685" y="540">S₁</text>
        </svg>`
      });
    bindToggles(el, L);
    $$("[data-d]", el).forEach(b => b.addEventListener("click", e => { e.stopPropagation(); L.toggle("d", +b.dataset.d); }));
    L.on(L => {
      const s0 = L.st.s0, s1 = L.st.s1, a = L.st.d[s0], b = L.st.d[2 + s0], y = s1 ? b : a;
      $$("[data-d]", el).forEach((bt, i) => { bt.setAttribute("aria-pressed", L.st.d[i] ? "true" : "false"); $("b", bt).textContent = L.st.d[i]; });
      $$("[data-pt]", el).forEach((t, i) => { t.textContent = L.st.d[i]; t.classList.toggle("on", !!L.st.d[i]); });
      $$("[data-p]", el).forEach((p, i) => p.classList.toggle("one", !!L.st.d[i]));
      $$("[data-w]", el).forEach((w, i) => w.classList.toggle("v1", !!L.st.d[i]));
      $$("[data-a]", el).forEach((r, i) => r.classList.toggle("on", i === s0));
      $$("[data-b]", el).forEach((r, i) => r.classList.toggle("on", i === s0));
      $$("[data-c]", el).forEach((r, i) => r.classList.toggle("on", i === s1));
      $("[data-wa]", el).classList.toggle("v1", !!a); $("[data-wb]", el).classList.toggle("v1", !!b);
      $("[data-va]", el).textContent = a; $("[data-vb]", el).textContent = b;
      $("[data-wy]", el).classList.toggle("v1", !!y); $("[data-ty]", el).textContent = y; $("[data-ty]", el).classList.toggle("on", !!y); $("[data-py]", el).classList.toggle("one", !!y);
      $("[data-s0]", el).classList.toggle("v1", !!s0); $("[data-s1]", el).classList.toggle("v1", !!s1);
      // comprobación: coincide con el MUX 4:1
      $("[data-r]", el).innerHTML = `${sub("S", 1)}${sub("S", 0)} = <b>${s1}${s0}</b> → Y = ${sub("I", L.sel)} = <b>${y}</b> ${y === L.mux ? "✓ igual que el 4:1" : "✗"}`;
    });
    // entrada → su 2:1 (S₀) → el 2:1 final (S₁) → Y
    DRESS.revealOn($(".fig", el), L, L => {
      const i = L.sel, y0 = [90, 190, 350, 450][i], top = i < 2;
      return `M110 ${y0}H260L360 ${top ? 140 : 400}C480 ${top ? 140 : 400} 480 ${top ? 220 : 320} 600 ${top ? 220 : 320}L700 270H862`;
    }, () => $("[data-py]", el), { ms: 900 });
  }
});
JON.mux.push({
  title: "Enable",
  notes: "La entrada Enable (EN) habilita o apaga el MUX completo. Convención usada aquí: EN activo en alto, es decir, EN = 1 habilita y EN = 0 fuerza Y = 0 sin importar las entradas. Ojo: en circuitos integrados como el 74151 la habilitación es activa en bajo (se marca con una barra) y se habilita con 0. El Enable sirve para conectar varios MUX en cascada y activar solo uno.",
  build(el) {
    const L = Logic({ s1: 0, s0: 1, d: [0, 1, 1, 0], en: 1 });
    el.innerHTML = shell("mux", 2, "Diseño y expansión", "La entrada <em>Enable</em>",
      "Con EN = 0 el MUX se apaga: Y = 0, sin importar las entradas.", {
        extra: `<p class="eqline">Y = EN · (${sub("I", "sel")})</p><p class="convention">Convención: EN activo en alto. En el 74151, Ē es activo en bajo.</p><p class="readout" data-r></p>`,
        ctrl: tg("en", "EN") + tg("s1", "S₁") + tg("s0", "S₀"),
        fig: `<svg class="fig" viewBox="0 0 1000 640" aria-label="MUX 4:1 con entrada Enable"></svg>`
      });
    muxSymbol($("svg.fig", el), L, { en: true });
    bindToggles(el, L);
    L.on(L => { $("[data-r]", el).innerHTML = L.st.en ? `EN = 1 → Y = ${sub("I", L.sel)} = <b>${L.mux}</b>` : `EN = 0 → Y = <b>0</b> (apagado)`; });
  }
});
JON.mux.push({
  title: "Funciones booleanas con un MUX",
  notes: "Un MUX 4:1 puede implementar cualquier función de dos variables: se conectan A y B a las líneas de selección y en cada entrada de datos se coloca el valor de la tabla de verdad para esa fila. Por ejemplo, para XOR las entradas valen 0, 1, 1, 0. Elijan la función y cambien A y B: la salida sigue la tabla.",
  build(el) {
    const F = { XOR: [0, 1, 1, 0], AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], NAND: [1, 1, 1, 0] };
    const L = Logic({ s1: 0, s0: 1, d: F.XOR.slice() });
    let fn = "XOR";
    el.innerHTML = shell("mux", 2, "Diseño y expansión", "Funciones con un <em>MUX</em>",
      "A y B van a la selección; cada entrada de datos es una fila de la tabla de verdad.", {
        extra: `<table class="ice-table compact" aria-label="Tabla de verdad"><thead><tr><th>A</th><th>B</th><th data-fn>F = A XOR B</th></tr></thead>
          <tbody>${[0, 1, 2, 3].map(i => `<tr data-row="${i}"><td>${i >> 1}</td><td>${i & 1}</td><td data-fv="${i}"></td></tr>`).join("")}</tbody></table>`,
        ctrl: seg("Función", Object.keys(F).map(k => [k, k]), "XOR") + tg("s1", "A") + tg("s0", "B"),
        fig: `<svg class="fig" viewBox="0 0 1000 640" aria-label="MUX 4:1 implementando una función"></svg>`
      });
    muxSymbol($("svg.fig", el), L, { names: ["A", "B"] });
    bindToggles(el, L);
    bindSeg(el, v => { fn = v; L.set({ d: F[v].slice() }); $("[data-fn]", el).textContent = `F = A ${v} B`; });
    L.on(L => {
      $$("tr[data-row]", el).forEach((tr, i) => tr.classList.toggle("on", i === L.sel));
      $$("[data-fv]", el).forEach((td, i) => { td.textContent = L.st.d[i]; });
    });
  }
});

JON.demux.push(sizesStation("demux"));
JON.demux.push({
  title: "Cascada: un 1:4 con tres 1:2",
  notes: "El DEMUX 1:4 también se arma con bloques pequeños: un DEMUX 1:2 controlado por S1 manda D a la rama de arriba o a la de abajo; en cada rama, un DEMUX 1:2 controlado por S0 elige la salida final. Resultado: D llega a Y de índice 2·S1 + S0, igual que el DEMUX 1:4.",
  build(el) {
    const L = Logic({ s1: 1, s0: 0, din: 1 });
    el.innerHTML = shell("demux", 2, "Diseño y expansión", "Cascada <em>1 : 4</em>",
      "Un DEMUX 1:2 con S₁ alimenta dos DEMUX 1:2 con S₀.", {
        extra: `<p class="readout" data-r></p>`,
        ctrl: tg("din", "D") + tg("s1", "S₁") + tg("s0", "S₀"),
        fig: `<svg class="fig" viewBox="0 0 1000 560" aria-label="DEMUX 1:4 construido con tres DEMUX 1:2">
          <circle class="pin big" data-pd cx="80" cy="270" r="30"/><text class="pin-t big" x="80" y="282" data-td>0</text><text class="lbl" x="80" y="225">D</text>
          <path class="w" data-wd d="M110 270H300"/>
          <polygon class="blk" points="300,230 400,190 400,350 300,310"/><text class="t-mini" x="350" y="278">1:2</text>
          <path class="route" data-c="0" d="M300 270L400 220"/><path class="route" data-c="1" d="M300 270L400 320"/>
          <path class="w" data-wa d="M400 220C500 220 500 140 600 140"/><path class="w" data-wb d="M400 320C500 320 500 400 600 400"/>
          <polygon class="blk" points="600,110 700,80 700,200 600,170"/><text class="t-mini" x="650" y="148">1:2</text>
          <polygon class="blk" points="600,370 700,340 700,460 600,430"/><text class="t-mini" x="650" y="408">1:2</text>
          <path class="route" data-y="0" d="M600 140L700 100"/><path class="route" data-y="1" d="M600 140L700 180"/>
          <path class="route" data-y="2" d="M600 400L700 360"/><path class="route" data-y="3" d="M600 400L700 440"/>
          ${[100, 180, 360, 440].map((y, i) => `<path class="w" data-wo="${i}" d="M700 ${y}H860"/><circle class="pin big" data-po="${i}" cx="885" cy="${y}" r="20"/><text class="pin-t" x="885" y="${y + 8}" data-to="${i}">0</text><text class="lbl xs" x="945" y="${y + 7}">${usv("Y", i)}</text>`).join("")}
          <path class="w sel" data-s1 d="M350 330V540"/><text class="lbl xs" x="385" y="540">S₁</text>
          <path class="w sel" data-s0 d="M650 20V95M650 445V540"/><text class="lbl xs" x="680" y="34">S₀</text><text class="lbl xs" x="685" y="540">S₀</text>
        </svg>`
      });
    bindToggles(el, L);
    L.on(L => {
      const D = L.st.din, s1 = L.st.s1, s0 = L.st.s0;
      $("[data-td]", el).textContent = D; $("[data-td]", el).classList.toggle("on", !!D); $("[data-pd]", el).classList.toggle("one", !!D); $("[data-wd]", el).classList.toggle("v1", !!D);
      $$("[data-c]", el).forEach((r, i) => r.classList.toggle("on", i === s1));
      $("[data-wa]", el).classList.toggle("v1", !!(D && !s1)); $("[data-wb]", el).classList.toggle("v1", !!(D && s1));
      $$("[data-y]", el).forEach((r, i) => r.classList.toggle("on", (i >> 1) === s1 && (i & 1) === s0));
      $$("[data-wo]", el).forEach((w, i) => w.classList.toggle("v1", !!L.demux(i)));
      $$("[data-po]", el).forEach((p, i) => p.classList.toggle("one", !!L.demux(i)));
      $$("[data-to]", el).forEach((t, i) => { t.textContent = L.demux(i); t.classList.toggle("on", !!L.demux(i)); });
      $("[data-s0]", el).classList.toggle("v1", !!s0); $("[data-s1]", el).classList.toggle("v1", !!s1);
      $("[data-r]", el).innerHTML = `${sub("S", 1)}${sub("S", 0)} = <b>${s1}${s0}</b> → ${sub("Y", L.sel)} = D = <b>${D}</b>; las demás = 0`;
    });
    DRESS.revealOn($(".fig", el), L, L => {
      const i = L.sel, top = i < 2, yo = [100, 180, 360, 440][i];
      return `M110 270H300L400 ${top ? 220 : 320}C500 ${top ? 220 : 320} 500 ${top ? 140 : 400} 600 ${top ? 140 : 400}L700 ${yo}H866`;
    }, L => $$("[data-po]", el)[L.sel], { ms: 900 });
  }
});
JON.demux.push({
  title: "Enable",
  notes: "En el DEMUX, Enable (EN) apaga todas las salidas: con EN = 0 todas valen 0 aunque D sea 1. Convención usada aquí: EN activo en alto. Muchos circuitos integrados (por ejemplo el 74139 o el 74155) usan habilitación activa en bajo. En cascada, el Enable decide cuál de varios DEMUX está activo.",
  build(el) {
    const L = Logic({ s1: 1, s0: 1, din: 1, en: 1 });
    el.innerHTML = shell("demux", 2, "Diseño y expansión", "La entrada <em>Enable</em>",
      "Con EN = 0 todas las salidas quedan en 0, aunque D sea 1.", {
        extra: `<p class="eqline">${sub("Y", "i")} = EN · (selección i) · D</p><p class="convention">Convención: EN activo en alto. En el 74139, Ē es activo en bajo.</p><p class="readout" data-r></p>`,
        ctrl: tg("en", "EN") + tg("din", "D") + tg("s1", "S₁") + tg("s0", "S₀"),
        fig: `<svg class="fig" viewBox="0 0 1000 640" aria-label="DEMUX 1:4 con entrada Enable"></svg>`
      });
    demuxSymbol($("svg.fig", el), L, { en: true });
    bindToggles(el, L);
    L.on(L => { $("[data-r]", el).innerHTML = L.st.en ? `EN = 1 → ${sub("Y", L.sel)} = D = <b>${L.st.din}</b>` : `EN = 0 → todas las salidas = <b>0</b>`; });
  }
});
JON.demux.push({
  title: "DEMUX y decodificador",
  notes: "Un decodificador 2 a 4 activa exactamente una salida según su dirección de dos bits. Un DEMUX 1:4 hace lo mismo cuando su entrada de datos vale 1: por eso un decodificador es un DEMUX con D fijo en 1. Y al revés, un decodificador con entrada Enable funciona como DEMUX si el dato se conecta al Enable. Convención: salidas activas en alto. Cambien D: con D = 1 ambos coinciden; con D = 0 el DEMUX queda en ceros mientras el decodificador sigue marcando la dirección.",
  build(el) {
    const L = Logic({ s1: 0, s0: 1, din: 1 });
    el.innerHTML = shell("demux", 2, "Diseño y expansión", "DEMUX y <em>decodificador</em>",
      "Un decodificador 2 a 4 es un DEMUX 1:4 con la entrada D fija en 1.", {
        extra: `<table class="ice-table compact cmp" aria-label="Comparación"><thead><tr><th>${sub("A", 1)}${sub("A", 0)}</th><th>Decodificador ${sub("Y", 3)}…${sub("Y", 0)}</th><th>DEMUX ${sub("Y", 3)}…${sub("Y", 0)}</th></tr></thead>
          <tbody>${[0, 1, 2, 3].map(i => `<tr data-row="${i}"><td>${bits2(i)}</td><td data-dec="${i}"></td><td data-dmx="${i}"></td></tr>`).join("")}</tbody></table>
          <p class="convention">Salidas activas en alto. Un decodificador con Enable funciona como DEMUX si el dato entra por el Enable.</p>`,
        ctrl: tg("din", "D") + tg("s1", "A₁ = S₁") + tg("s0", "A₀ = S₀"),
        fig: `<svg class="fig" viewBox="0 0 1000 640" aria-label="DEMUX 1:4 comparado con un decodificador"></svg>`
      });
    demuxSymbol($("svg.fig", el), L);
    bindToggles(el, L);
    L.on(L => {
      $$("tr[data-row]", el).forEach((tr, i) => tr.classList.toggle("on", i === L.sel));
      $$("[data-dec]", el).forEach((td, i) => { td.textContent = [0, 1, 2, 3].map(j => (j === i ? 1 : 0)).reverse().join(""); });
      $$("[data-dmx]", el).forEach((td, i) => { td.textContent = [0, 1, 2, 3].map(j => (j === i ? L.st.din : 0)).reverse().join(""); });
    });
  }
});

/* =====================================================================
   CARLOS · DIO · Aplicaciones — el tiempo, la selección y los usos reales
   ===================================================================== */
const CAR = { mux: [], demux: [] };
/* anexo de DIO: conclusiones y referencias, fuera del recorrido normal;
   se abre con el botón secreto de la última diapositiva de DIO (MUX y DEMUX) */
const ANEXO = [];
const anexoBtn = () => `<button class="secreto-anexo" aria-label="Botón secreto: conclusiones y referencias"><svg viewBox="-50 -50 100 100" aria-hidden="true"><defs><linearGradient id="ab-oro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6DE8A"/><stop offset=".45" stop-color="#C9A13A"/><stop offset="1" stop-color="#7A5A14"/></linearGradient><linearGradient id="ab-papel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF3DD"/><stop offset="1" stop-color="#E2D3AE"/></linearGradient></defs><path class="ab-sombra" d="M-28-20Q-12-28 2-20Q16-28 32-20V32Q16 24 2 32Q-12 24-28 32Z"/><path class="ab-tapa" d="M-33-26Q-15-35 0-26Q15-35 33-26V30Q15 21 0 30Q-15 21-33 30Z"/><path class="ab-hojas" d="M-29-22Q-14-30 0-22Q14-30 29-22V25Q14 17 0 25Q-14 17-29 25Z"/><path class="lomo" d="M0-22V25M-22-12H-8M-22-5H-8M-22 2H-12M8-12H22M8-5H22M8 2H18"/><path class="ab-brillo" d="M-30-24Q-15-32 -2-25"/></svg></button>`;
const SENS = [["Temperatura", "24 °C"], ["Presión", "1,2 bar"], ["Nivel", "68 %"], ["Velocidad", "1450 rpm"]];
const secretBtn = () => `<button class="secret" aria-label="Botón secreto"><svg viewBox="-60 -60 120 120"><path d="${(() => {
  let d = ""; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, w = .14; d += `M${(Math.cos(a - w) * 16).toFixed(1)} ${(Math.sin(a - w) * 16).toFixed(1)}L${(Math.cos(a) * (i % 2 ? 36 : 50)).toFixed(1)} ${(Math.sin(a) * (i % 2 ? 36 : 50)).toFixed(1)}L${(Math.cos(a + w) * 16).toFixed(1)} ${(Math.sin(a + w) * 16).toFixed(1)}Z`; } return d; })()}"/><circle r="12"/></svg></button>`;

/* barrido automático de S1 S0 con un reloj; «detener el tiempo» lo congela */
function scanner(el, L, ms = 1300) {
  let iv = 0, frozen = false, phaseReady = false;
  const btn = $("[data-stop]", el);
  const tick = () => L.set({ s1: ((L.sel + 1) % 4) >> 1, s0: ((L.sel + 1) % 4) & 1 });
  const run = () => { clearInterval(iv); if (!frozen && !reduced && phaseReady) iv = setInterval(tick, ms); };
  const paintBtn = () => { btn.setAttribute("aria-pressed", frozen ? "true" : "false"); btn.textContent = frozen ? "▶ Reanudar el tiempo" : "⏸ Detener el tiempo"; el.classList.toggle("frozen", frozen); };
  btn.addEventListener("click", e => {
    e.stopPropagation();
    frozen = !frozen; paintBtn();
    if (frozen) { el.classList.remove("timestop"); void el.offsetWidth; el.classList.add("timestop"); }
    run();
  });
  onStation(el, () => { if (reduced) frozen = true; paintBtn(); run(); }, () => clearInterval(iv));
  queueMicrotask(() => {
    const station = el.closest('.st');
    station?.addEventListener('phasechange', e => { phaseReady=e.detail.ready; run(); });
    mq.addEventListener('change', () => { if (reduced) { frozen=true; paintBtn(); clearInterval(iv); } });
  });
  paintBtn();
  return { get frozen() { return frozen; } };
}

CAR.mux.push({
  title: "Sensores que comparten un ADC",
  layout: "ring",
  notes: "Aplicación clásica: varios sensores y un solo convertidor analógico-digital (ADC). Los sensores rodean al MUX como las horas de un reloj. Un contador de 2 bits, movido por el reloj, recorre S1 S0 = 00, 01, 10, 11: la manecilla apunta al sensor elegido, el MUX lo conecta al ADC y el microcontrolador lo lee. Detengan el tiempo para ver qué sensor se está leyendo; con el tiempo detenido pueden tocar un sensor para elegirlo.",
  build(el) {
    const L = Logic({ s1: 0, s0: 0 });
    // MUX al centro de la esfera; los cuatro sensores alrededor (arriba, izquierda arriba, izquierda abajo, abajo)
    const C = [1060, 470], R = 330, ANG = [-90, -150, 150, 90];
    const pos = ANG.map(a => [C[0] + Math.cos(a * Math.PI / 180) * R, C[1] + Math.sin(a * Math.PI / 180) * R]);
    const pins = [-84, -28, 28, 84].map(dy => [C[0] - 70, C[1] + dy]);
    const wire = i => {
      const [x, y] = pos[i], [px, py] = pins[i];
      const c1 = i === 0 ? [x - 40, y + 150] : i === 3 ? [x - 40, y - 150] : [x + 90, y];
      return `M${x.toFixed(1)} ${y.toFixed(1)}C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${px - 120} ${py} ${px} ${py}`;
    };
    const tick = (x, y, r1, r2, a) => `M${(x + Math.cos(a) * r1).toFixed(1)} ${(y + Math.sin(a) * r1).toFixed(1)}L${(x + Math.cos(a) * r2).toFixed(1)} ${(y + Math.sin(a) * r2).toFixed(1)}`;
    const deg = Math.PI / 180;
    el.innerHTML = `<div class="col-text ring-text">
        <p class="chip"><b>MUX</b>Aplicaciones · ${MEMBERS[3].name}</p>
        <h2>Un ADC, <em>cuatro</em> sensores</h2>
        <p class="lede">Un reloj recorre S₁S₀ y el MUX lleva cada sensor, por turno, al único ADC.</p>
        <p class="readout" data-r></p>
        <div class="ctrl"><button class="tg wide" data-stop aria-pressed="false">⏸ Detener el tiempo</button></div>
      </div>
      <svg class="fig ring-fig" viewBox="0 0 1920 1080" aria-label="Cuatro sensores alrededor de un MUX que alimenta un ADC">
        <g class="dial" aria-hidden="true"><circle cx="${C[0]}" cy="${C[1]}" r="${R + 112}"/><circle class="in" cx="${C[0]}" cy="${C[1]}" r="${R - 120}"/>
          <path d="${Array.from({ length: 60 }, (_, k) => tick(C[0], C[1], R + (k % 5 ? 98 : 80), R + 108, k * 6 * deg)).join("")}"/></g>
        ${pos.map((_, i) => `<path class="w" data-w="${i}" d="${wire(i)}"/>`).join("")}
        <g class="hand-g" aria-hidden="true" style="transform-origin:${C[0]}px ${C[1]}px"><path class="clock-hand" d="M${C[0] - 9} ${C[1]}L${C[0]} ${C[1] - R + 110}L${C[0] + 9} ${C[1]}Z"/></g>
        ${pins.map(([px, py], i) => `<path class="route" data-i="${i}" d="M${px} ${py}L${C[0] + 70} ${C[1]}"/>`).join("")}
        <polygon class="blk" points="${C[0] - 70},${C[1] - 130} ${C[0] + 70},${C[1] - 70} ${C[0] + 70},${C[1] + 70} ${C[0] - 70},${C[1] + 130}"/><text class="blk-t" x="${C[0]}" y="${C[1] + 12}">MUX</text>
        ${pos.map(([x, y], i) => `<g class="sensor gauge" data-s="${i}"><circle class="g-face" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="78"/>
            <path class="g-ticks" d="${Array.from({ length: 9 }, (_, k) => tick(x, y, 60, 70, (-210 + k * 30) * deg)).join("")}"/>
            <path class="g-needle" d="M${x.toFixed(1)} ${y.toFixed(1)}L${(x + Math.cos((-170 + i * 55) * deg) * 54).toFixed(1)} ${(y + Math.sin((-170 + i * 55) * deg) * 54).toFixed(1)}"/><circle class="g-hub" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"/>
            <text class="s-val" x="${x.toFixed(1)}" y="${(y + 44).toFixed(1)}">${SENS[i][1]}</text><text class="s-name" x="${x.toFixed(1)}" y="${(y + 114).toFixed(1)}">${SENS[i][0]}</text></g>`).join("")}
        <path class="w v1" d="M${C[0] + 70} ${C[1]}H1540"/>
        <g class="box adc"><rect x="1540" y="${C[1] - 70}" width="160" height="140" rx="14"/><text x="1620" y="${C[1] - 10}">ADC</text><text class="sub" x="1620" y="${C[1] + 36}" data-adc></text></g>
        <path class="w v1" d="M1700 ${C[1]}H1740"/>
        <g class="box"><rect x="1740" y="${C[1] - 70}" width="140" height="140" rx="14"/><text x="1810" y="${C[1] + 10}">µC</text></g>
        <g class="box clk"><rect x="${C[0] + 170}" y="${C[1] + 300}" width="230" height="56" rx="12"/><text x="${C[0] + 285}" y="${C[1] + 336}">contador 2 bits</text></g>
        <path class="w sel" d="M${C[0] + 170} ${C[1] + 328}H${C[0] + 30}V${C[1] + 88}"/><text class="lbl xs" x="${C[0] + 285}" y="${C[1] + 288}" data-b>S₁S₀</text>
      </svg>`;
    const sc = scanner(el, L);
    $$(".sensor", el).forEach((g, i) => tap(g, () => { if (sc.frozen) L.set({ s1: i >> 1, s0: i & 1 }); }));
    const hand = $(".hand-g", el);
    let turns = 0, last = 0;
    L.on(L => {
      $$(".sensor", el).forEach((g, i) => g.classList.toggle("on", i === L.sel));
      $$("[data-w]", el).forEach((w, i) => w.classList.toggle("v1", i === L.sel));
      $$(".route", el).forEach((r, i) => r.classList.toggle("on", i === L.sel));
      // la manecilla gira siempre en el mismo sentido, de sensor en sensor (como el contador)
      if (L.sel < last) turns++;
      last = L.sel;
      hand.style.transform = `rotate(${-turns * 360 - [0, 60, 120, 180][L.sel]}deg)`;
      $("[data-adc]", el).textContent = SENS[L.sel][1];
      $("[data-b]", el).textContent = `S₁S₀ = ${bits2(L.sel)}`;
      $("[data-r]", el).innerHTML = `${sub("S", 1)}${sub("S", 0)} = <b>${bits2(L.sel)}</b> → el ADC lee <b>${SENS[L.sel][0].toLowerCase()}</b>`;
    });
    DRESS.revealOn($(".fig", el), L, L => `${wire(L.sel)}L${C[0] + 70} ${C[1]}H1540`, () => $(".box.adc", el), { ms: 720 });
  }
});

/* línea de tiempo TDM (transmisor = MUX, receptor = DEMUX) */
function tdmFig(rx) {
  const C = ["A", "B", "C", "D"], slots = Array.from({ length: 16 }, (_, k) => k);
  return `<svg class="fig tdm" viewBox="0 0 1000 560" aria-label="Multiplexación por división de tiempo">
    ${C.map((c, i) => `<g class="chan" data-ch="${i}"><rect x="${rx ? 800 : 20}" y="${70 + i * 110}" width="180" height="70" rx="12"/><text x="${rx ? 890 : 110}" y="${114 + i * 110}">Canal ${c}</text></g>`).join("")}
    <polygon class="blk" points="${rx ? "640,140 740,60 740,460 640,380" : "260,60 360,140 360,380 260,460"}"/><text class="blk-t" x="${rx ? 690 : 310}" y="270">${rx ? "DEMUX" : "MUX"}</text>
    ${C.map((_, i) => `<path class="w" data-w="${i}" d="${rx ? `M740 ${105 + i * 110}H800` : `M200 ${105 + i * 110}H260`}"/>`).join("")}
    <line class="w" x1="${rx ? 260 : 360}" y1="260" x2="${rx ? 640 : 740}" y2="260"/>
    <g class="line"><clipPath id="clip${rx ? "R" : "T"}"><rect x="${rx ? 260 : 360}" y="220" width="380" height="80"/></clipPath>
      <g clip-path="url(#clip${rx ? "R" : "T"})"><g class="slots">${slots.map(k => `<g class="slot s${k % 4}"><rect x="${(rx ? 260 : 360) + k * 95 - 380}" y="232" width="86" height="56" rx="8"/><text x="${(rx ? 260 : 360) + k * 95 - 337}" y="268">${C[k % 4]}</text></g>`).join("")}</g></g></g>
    <text class="lbl xs" x="${rx ? 450 : 550}" y="340">un solo cable · ranuras de tiempo</text>
    <g class="box clk"><rect x="${rx ? 580 : 200}" y="490" width="220" height="56" rx="12"/><text x="${rx ? 690 : 310}" y="526">reloj sincronizado</text></g>
  </svg>`;
}

CAR.mux.push({
  title: "Comunicaciones: TDM",
  notes: "En multiplexación por división de tiempo (TDM), varios canales comparten un mismo cable turnándose: el MUX del transmisor toma un pedazo de cada canal en su ranura de tiempo (A, B, C, D, A, B…). El reloj avanza S1 S0 en cada ranura. Así funcionaban las líneas telefónicas digitales y muchos buses de datos.",
  build(el) {
    const L = Logic({ s1: 0, s0: 0 });
    el.innerHTML = shell("mux", 3, "Aplicaciones", "Un cable, <em>cuatro</em> conversaciones",
      "Cada canal usa el cable en su turno: multiplexación por división de tiempo (TDM).", {
        extra: `<p class="readout" data-r></p>`,
        ctrl: `<button class="tg wide" data-stop aria-pressed="false">⏸ Detener el tiempo</button>`,
        fig: tdmFig(false)
      });
    scanner(el, L, 950);
    L.on(L => {
      $$(".chan", el).forEach((g, i) => g.classList.toggle("on", i === L.sel));
      $$("[data-w]", el).forEach((w, i) => w.classList.toggle("v1", i === L.sel));
      $("[data-r]", el).innerHTML = `Ranura actual: ${sub("S", 1)}${sub("S", 0)} = <b>${bits2(L.sel)}</b> → transmite el canal <b>${"ABCD"[L.sel]}</b>`;
    });
  }
});
CAR.mux.push({
  title: "Dentro de un procesador",
  notes: "En la ruta de datos de un procesador, los MUX eligen en cada instrucción qué registro llega a la unidad aritmético-lógica (ALU). Las líneas de selección salen de la unidad de control. Es la misma idea de todo el recorrido: muchas fuentes, una sola entrada a la ALU. Siguen las conclusiones (Ana), las referencias y el respaldo de la simulación.",
  build(el) {
    const L = Logic({ s1: 1, s0: 0 });
    const R = [5, 12, 7, 3], ys = [110, 210, 310, 410];
    el.innerHTML = shell("mux", 3, "Aplicaciones", "Dentro de un <em>procesador</em>",
      "Un MUX elige qué registro entra a la ALU en cada instrucción.", {
        extra: `<p class="readout" data-r></p>`,
        ctrl: tg("s1", "S₁") + tg("s0", "S₀"),
        fig: `<svg class="fig" viewBox="0 0 1000 560" aria-label="Registros, MUX y ALU">
          ${ys.map((y, i) => `<g class="reg" data-g="${i}"><rect x="40" y="${y - 34}" width="200" height="68" rx="10"/><text x="80" y="${y + 9}">R${i}</text><text class="r-val" x="200" y="${y + 9}">${R[i]}</text></g>
            <path class="w" data-w="${i}" d="M240 ${y}H420"/><path class="route" data-i="${i}" d="M420 ${y}L540 260"/>`).join("")}
          <polygon class="blk" points="420,60 540,140 540,380 420,460"/><text class="blk-t" x="480" y="272">MUX</text>
          <path class="w v1" d="M540 260H660"/>
          <g class="box alu"><path d="M660 150L860 210V310L660 370L700 260Z"/><text x="790" y="268">ALU</text></g>
          <text class="lbl" x="780" y="410" data-alu></text>
          <g class="box clk"><rect x="370" y="490" width="220" height="56" rx="12"/><text x="480" y="526">unidad de control</text></g>
          <path class="w sel" d="M455 490V437M505 490V403"/>
        </svg>`
      });
    bindToggles(el, L);
    L.on(L => {
      $$(".reg", el).forEach((g, i) => g.classList.toggle("on", i === L.sel));
      $$("[data-w]", el).forEach((w, i) => w.classList.toggle("v1", i === L.sel));
      $$(".route", el).forEach((r, i) => r.classList.toggle("on", i === L.sel));
      $("[data-alu]", el).textContent = `entrada A = R${L.sel} = ${R[L.sel]}`;
      $("[data-r]", el).innerHTML = `${sub("S", 1)}${sub("S", 0)} = <b>${bits2(L.sel)}</b> → la ALU recibe <b>R${L.sel}</b>`;
    });
    DRESS.revealOn($(".fig", el), L, L => `M240 ${ys[L.sel]}H420L540 260H700`, () => $(".alu", el));
  }
});

/* ---- cierre de la ruta MUX de Carlos: conclusiones (Ana), referencias y respaldo de la simulación ---- */
const CONCL = [
  ["Optimización de recursos", "Comparten una línea de transmisión: menos cableado y menor costo en tarjetas PCB y redes.",
    `<path class="w" d="M8 14C60 14 70 50 112 50M8 38C60 38 70 50 112 50M8 62C60 62 70 50 112 50M8 86C60 86 70 50 112 50"/><path class="w v1" d="M112 50H172"/><circle class="pin one" cx="172" cy="50" r="8"/>`],
  ["Síntesis universal", "Un MUX implementa cualquier función booleana sin minimizar antes por Karnaugh.",
    `<path class="gate" d="M8 14h22a14 14 0 0 1 0 28H8z"/><path class="gate" d="M8 58h22a14 14 0 0 1 0 28H8z"/><text x="70" y="58" class="t-mini">=</text><polygon class="blk" points="100,12 150,30 150,70 100,88"/><path class="w v1" d="M150 50H176"/>`],
  ["Versatilidad industrial", "Adquisición de datos (ADC), telecomunicaciones (TDM) y procesadores (ALU).",
    `<g class="tags3"><rect x="4" y="8" width="80" height="36" rx="8"/><text x="44" y="33">ADC</text><rect x="96" y="8" width="80" height="36" rx="8"/><text x="136" y="33">TDM</text><rect x="50" y="56" width="80" height="36" rx="8"/><text x="90" y="81">ALU</text></g>`]
];
ANEXO.push({
  title: "Conclusiones",
  notes: "Conclusiones (las presenta Ana). 1) Optimización de recursos: el MUX y el DEMUX permiten que varias señales compartan una misma línea de transmisión, lo que reduce el cableado y el costo en tarjetas PCB y en redes. 2) Síntesis universal: un MUX puede reemplazar una red de compuertas, porque implementa cualquier función booleana sin minimizarla antes (lo comprobamos con F(A,B,C) = Σm(1,3,6,7)). 3) Versatilidad industrial: son indispensables en adquisición de datos (ADC), telecomunicaciones (TDM) y en la arquitectura de los procesadores (ALU). En una frase: el MUX decide qué información pasa; el DEMUX decide hacia dónde se dirige. Toquen una tarjeta para destacarla.",
  build(el) {
    el.innerHTML = `<div class="col-text">
        <p class="chip"><b>MUX</b>Conclusiones · Ana</p>
        <h2>Lo que nos <em>llevamos</em></h2>
        <p class="lede">El MUX decide <b>qué</b> información pasa; el DEMUX decide <b>hacia dónde</b> se dirige.</p>
      </div>
      <div class="fig concl-cards">${CONCL.map(([t, d, ic], i) => `<article class="concl-card" role="button" tabindex="0" style="--i:${i}">
          <svg class="fig concl-ic" viewBox="0 0 180 100" aria-hidden="true">${ic}</svg>
          <div><p class="concl-n">0${i + 1}</p><h3>${t}</h3><p>${d}</p></div>
        </article>`).join("")}</div>`;
    const cards = $$(".concl-card", el);
    cards.forEach(c => tap(c, () => cards.forEach(x => x.classList.toggle("on", x === c && !c.classList.contains("on")))));
    onStation(el, () => { el.classList.remove("shown"); void el.offsetWidth; el.classList.add("shown"); });
  }
});

const REFS = [
  ["Floyd, T. L. (2006).", "Fundamentos de sistemas digitales", "(9.ª ed.). Pearson Educación."],
  ["Mano, M. M., & Ciletti, M. D. (2013).", "Diseño digital", "(5.ª ed.). Pearson Educación."],
  ["Tocci, R. J., Widmer, N. S., & Moss, G. L. (2007).", "Sistemas digitales: principios y aplicaciones", "(10.ª ed.). Pearson Prentice Hall."],
  ["Wakerly, J. F. (2006).", "Digital design: Principles and practices", "(4th ed.). Pearson Prentice Hall."],
  ["Roth, C. H., & Kinney, L. L. (2014).", "Fundamentals of logic design", "(7th ed.). Cengage Learning."]
];
ANEXO.push({
  title: "Referencias bibliográficas",
  notes: "Referencias en formato APA. Floyd, Tocci y Mano/Ciletti son los textos base del curso para MUX, DEMUX, cascada y síntesis de funciones con MUX; Wakerly cubre los circuitos integrados comerciales (como el 74x151 y el 74x153) y Roth y Kinney la implementación de funciones con multiplexores.",
  build(el) {
    el.innerHTML = `<div class="col-text slim">
        <p class="chip"><b>MUX</b>Referencias · Carlos</p>
        <h2>Referencias <em>bibliográficas</em></h2>
        <p class="lede">Cinco fuentes, en formato APA.</p>
      </div>
      <ol class="fig refs">${REFS.map(([a, t, e]) => `<li>${a} <i>${t}</i> ${e}</li>`).join("")}</ol>`;
  }
});

CAR.mux.push({
  title: "Ejemplo resuelto y simulación",
  notes: "Ejemplo resuelto (lo presenta Carlos): F(A,B,C) = Σm(1,3,6,7) con un MUX 4:1. A y B van a la selección (S1 = A, S0 = B). Para AB = 00 la función vale 0 con C = 0 y 1 con C = 1, así que I0 = C; para AB = 01 pasa lo mismo, I1 = C; para AB = 10 vale 0 siempre, I2 = 0; para AB = 11 vale 1 siempre, I3 = 1. Un solo MUX reemplaza al circuito F = A'C + AB. La simulación en Python (simulacion/mux_funcion.py) recorre las 8 combinaciones: la tabla de la terminal muestra que el MUX y las compuertas coinciden en las 8, y en los trenes de pulso la curva del MUX (roja punteada) queda encima de la de compuertas (azul). Estas capturas son el respaldo por si falla la ejecución en vivo. Toquen «Tabla» o «Pulsos» para cambiar de captura.",
  build(el) {
    el.innerHTML = shell("mux", 3, "Simulación", "Ejemplo <em>resuelto</em>",
      `F = Σm(1, 3, 6, 7) con un MUX 4:1: ${sub("S", 1)} = A, ${sub("S", 0)} = B.`, {
        extra: `<ul class="map-in">${[["I", 0, "C"], ["I", 1, "C"], ["I", 2, "0"], ["I", 3, "1"]].map(([v, i, x]) => `<li>${sub(v, i)} = <b>${x}</b></li>`).join("")}</ul>
          <p class="readout">Python: <b>8 de 8</b> combinaciones coinciden</p>`,
        ctrl: seg("Captura", [["pulsos", "Pulsos"], ["tabla", "Tabla"]], "pulsos"),
        fig: `<figure class="fig sim-shot"><img src="assets/simulacion/pulsos.png" alt="Trenes de pulso de A, B, C y F: la salida del MUX coincide con la función en las 8 combinaciones" decoding="async">
          <figcaption>Captura de respaldo · simulacion/mux_funcion.py</figcaption></figure>${secretBtn()}${anexoBtn()}`
      });
    const img = $(".sim-shot img", el), ALT = {
      pulsos: "Trenes de pulso de A, B, C y F: la salida del MUX coincide con la función en las 8 combinaciones",
      tabla: "Tabla de verdad impresa en la terminal: F esperada, F con compuertas y F con MUX coinciden en las 8 filas"
    };
    bindSeg(el, v => { img.src = `assets/simulacion/${v}.png`; img.alt = ALT[v]; });
  }
});

const DEV = ["LED", "Motor", "Alarma", "Pantalla"];
CAR.demux.push({
  title: "Un dato, cuatro dispositivos",
  notes: "Un DEMUX distribuye una sola señal de control entre varios dispositivos: la orden (D) es la misma, y S1 S0 eligen a quién le llega. Solo el dispositivo elegido se activa cuando D = 1; los demás reciben 0. Así un microcontrolador con pocas patas controla muchos dispositivos.",
  build(el) {
    const L = Logic({ s1: 0, s0: 1, din: 1 });
    const ys = [100, 205, 310, 415];
    el.innerHTML = shell("demux", 3, "Aplicaciones", "Una orden, <em>cuatro</em> destinos",
      "El DEMUX lleva la misma orden solo al dispositivo elegido.", {
        extra: `<p class="readout" data-r></p>`,
        ctrl: tg("din", "Orden D") + tg("s1", "S₁") + tg("s0", "S₀"),
        fig: `<svg class="fig" viewBox="0 0 1000 560" aria-label="Un DEMUX controla cuatro dispositivos">
          <g class="box"><rect x="20" y="210" width="160" height="100" rx="14"/><text x="100" y="268">µC</text></g>
          <path class="w" data-wd d="M180 260H380"/>
          <polygon class="blk" points="380,190 500,90 500,430 380,330"/><text class="blk-t" x="440" y="272">DEMUX</text>
          ${ys.map((y, i) => `<path class="route" data-i="${i}" d="M380 260L500 ${y}"/><path class="w" data-w="${i}" d="M500 ${y}H700"/>
            <g class="device" data-g="${i}"><rect x="700" y="${y - 40}" width="270" height="80" rx="14"/><circle class="lamp" cx="740" cy="${y}" r="16"/><text x="775" y="${y + 9}">${DEV[i]}</text><text class="d-st" x="950" y="${y + 9}" data-st="${i}">0</text></g>`).join("")}
          <path class="w sel" d="M420 357V520M470 405V520"/><text class="lbl xs" x="420" y="548">S₁</text><text class="lbl xs" x="470" y="548">S₀</text>
        </svg>`
      });
    bindToggles(el, L);
    L.on(L => {
      $("[data-wd]", el).classList.toggle("v1", !!L.st.din);
      $$(".route", el).forEach((r, i) => r.classList.toggle("on", i === L.sel));
      $$("[data-w]", el).forEach((w, i) => w.classList.toggle("v1", !!L.demux(i)));
      $$(".device", el).forEach((g, i) => g.classList.toggle("on", !!L.demux(i)));
      $$("[data-st]", el).forEach((t, i) => { t.textContent = L.demux(i); });
      $("[data-r]", el).innerHTML = `${sub("S", 1)}${sub("S", 0)} = <b>${bits2(L.sel)}</b>, D = ${L.st.din} → <b>${DEV[L.sel]}</b> ${L.st.din ? "se activa" : "recibe 0"}`;
    });
    DRESS.revealOn($(".fig", el), L, L => `M180 260H380L500 ${ys[L.sel]}H724`, L => $$(".device", el)[L.sel]);
  }
});
CAR.demux.push({
  title: "Direccionamiento",
  notes: "En una computadora varios chips escribibles (memorias RAM y un puerto de salida) comparten el mismo bus de datos. Los bits de dirección actúan como líneas de selección de un DEMUX (o decodificador) que activa la señal de habilitación de un solo chip: así el dato se escribe en el lugar correcto. Cambien la dirección y pulsen Escribir.",
  build(el) {
    const L = Logic({ s1: 1, s0: 0, din: 1 });
    const CH = ["RAM 0", "RAM 1", "RAM 2", "E/S"], CHF = ["RAM 0", "RAM 1", "RAM 2", "Puerto E/S"], xs = [190, 390, 590, 790];
    el.innerHTML = shell("demux", 3, "Aplicaciones", "Elegir <em>a dónde</em> va el dato",
      "Los bits de dirección seleccionan qué chip recibe el dato del bus.", {
        extra: `<table class="ice-table compact" aria-label="Mapa de direcciones"><thead><tr><th>${sub("A", 1)}${sub("A", 0)}</th><th>chip habilitado</th></tr></thead>
          <tbody>${CHF.map((c, i) => `<tr data-row="${i}"><td>${bits2(i)}</td><td>${c}</td></tr>`).join("")}</tbody></table><p class="readout" data-r></p>`,
        ctrl: tg("s1", "A₁") + tg("s0", "A₀") + `<button class="tg wide" data-write>Escribir</button>`,
        fig: `<svg class="fig" viewBox="0 0 1000 560" aria-label="Un DEMUX selecciona el chip según la dirección">
          <path class="bus" d="M60 90H960"/><text class="lbl xs" x="80" y="70" text-anchor="start">bus de datos</text>
          ${xs.map((x, i) => `<path class="w thin" d="M${x + 60} 90V180"/><g class="chip" data-g="${i}"><rect x="${x}" y="180" width="120" height="150" rx="10"/><text x="${x + 60}" y="262">${CH[i]}</text><text class="cs" x="${x + 60}" y="315" data-cs="${i}">CS = 0</text></g>`).join("")}
          ${xs.map((x, i) => `<path class="w" data-w="${i}" d="M${x + 60} 330V400Q${x + 60} 430 ${500 + (i - 1.5) * 40} 450"/>`).join("")}
          <polygon class="blk" points="420,450 580,450 540,540 460,540"/><text class="blk-t sm" x="500" y="500">DEMUX</text>
          <circle class="pulse-dot" r="12" cx="0" cy="0" data-dot/>
        </svg>`
      });
    bindToggles(el, L);
    $("[data-write]", el).addEventListener("click", e => {
      e.stopPropagation();
      if (reduced) return;
      const dot = $("[data-dot]", el), x = xs[L.sel] + 60;
      dot.animate([{ transform: "translate(60px,90px)", opacity: 1 }, { transform: `translate(${x}px,90px)`, opacity: 1, offset: .6 }, { transform: `translate(${x}px,250px)`, opacity: 0 }], { duration: 1300, easing: "ease-in-out" });
    });
    L.on(L => {
      $$(".chip", el).forEach((g, i) => g.classList.toggle("on", i === L.sel));
      $$("[data-cs]", el).forEach((t, i) => { t.textContent = `CS = ${L.demux(i)}`; });
      $$("[data-w]", el).forEach((w, i) => w.classList.toggle("v1", !!L.demux(i)));
      $$("tr[data-row]", el).forEach((tr, i) => tr.classList.toggle("on", i === L.sel));
      $("[data-r]", el).innerHTML = `${sub("A", 1)}${sub("A", 0)} = <b>${bits2(L.sel)}</b> → destino: <b>${CHF[L.sel]}</b>`;
    });
  }
});
CAR.demux.push({
  title: "Comunicaciones: el receptor TDM",
  notes: "Del otro lado del cable, un DEMUX sincronizado con el mismo reloj reparte cada ranura de tiempo a su canal: A, B, C, D, A, B… Si el reloj del receptor se desfasara, los datos llegarían al canal equivocado; por eso la sincronización es esencial. Es el par del MUX transmisor: juntos, el MUX elige qué pasa y el DEMUX decide a dónde va. Esta es la última estación de Carlos en el DEMUX.",
  build(el) {
    const L = Logic({ s1: 0, s0: 0 });
    el.innerHTML = shell("demux", 3, "Aplicaciones", "Repartir a <em>tiempo</em>",
      "Un DEMUX sincronizado entrega cada ranura de tiempo a su canal.", {
        extra: `<p class="readout" data-r></p>`,
        ctrl: `<button class="tg wide" data-stop aria-pressed="false">⏸ Detener el tiempo</button>`,
        fig: tdmFig(true) + secretBtn() + anexoBtn()
      });
    scanner(el, L, 950);
    L.on(L => {
      $$(".chan", el).forEach((g, i) => g.classList.toggle("on", i === L.sel));
      $$("[data-w]", el).forEach((w, i) => w.classList.toggle("v1", i === L.sel));
      $("[data-r]", el).innerHTML = `Ranura ${sub("S", 1)}${sub("S", 0)} = <b>${bits2(L.sel)}</b> → llega al canal <b>${"ABCD"[L.sel]}</b>`;
    });
  }
});

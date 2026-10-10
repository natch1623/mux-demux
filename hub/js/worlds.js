"use strict";
/* =====================================================================
   Estaciones de cada mundo.
   Cada integrante tiene una ruta en el MUX y otra en el DEMUX;
   la de DEMUX es el espejo de la de MUX (misma composición, sentido inverso).
   ===================================================================== */
const ov = s => `<span class="ov">${s}</span>`;   // variable negada (barra encima)
const S1 = "S₁", S0 = "S₀";
const e = (v, i) => `${v}<sub>${i}</sub>`;   // subíndices reales (la serif no trae ₀₁₂₃)

/* ---------- Ameth · Tsaritsa · Funcionamiento lógico ---------- */
const L_MUX = Logic({ s1: 1, s0: 0, d: [1, 0, 0, 1] });
const L_DMX = Logic({ s1: 0, s0: 1, din: 1 });

const AMETH = {
  mux: [
    {
      title: "El MUX 4:1",
      notes: "Un multiplexor 4:1 tiene cuatro entradas de datos (D0 a D3), dos líneas de selección (S1 y S0) y una salida Y. Con dos bits se pueden formar cuatro combinaciones, una por entrada. Toquen las entradas para cambiar sus valores y las llaves S para elegir: la salida copia la entrada seleccionada y las otras quedan bloqueadas.",
      build(el) {
        el.innerHTML = `
          <div class="col-text">
            <p class="chip"><b>MUX</b>Funcionamiento lógico · Ameth</p>
            <h2>El MUX <em>4:1</em></h2>
            <p class="lede">Dos líneas de selección, ${S1} y ${S0}, eligen cuál de las cuatro entradas llega a la salida.</p>
            <p class="readout" data-r></p>
            <p class="hint">Toca las entradas D y las llaves S</p>
          </div>
          <svg class="fig" viewBox="0 0 1000 640" aria-label="MUX 4:1 interactivo"></svg>`;
        muxSymbol($(".fig", el), L_MUX);
        L_MUX.on(L => { $("[data-r]", el).innerHTML = `${S1}${S0} = <b>${L.st.s1}${L.st.s0}</b> → Y = D${SUB[L.sel]} = <b>${L.mux}</b>`; });
      }
    },
    {
      title: "Tabla y ecuación",
      layout: "center",
      notes: "La tabla de selección resume el MUX: para cada combinación de S1 S0 la salida es una de las entradas. De la tabla sale la ecuación: cada término es un producto que solo vale 1 con su combinación de selección, multiplicado por su entrada; el OR suma los cuatro términos. La ecuación se arma término por término, en el mismo orden de la tabla. Como solo un término puede estar activo a la vez, Y copia exactamente la entrada elegida. Toquen una columna de la tabla o un término para seleccionarlo.",
      build(el) {
        // de 00 a 11: el término i corresponde a la fila i de la tabla
        const T = [0, 1, 2, 3].map(i => [!(i >> 1), !(i & 1)]);
        el.innerHTML = `
          <div class="eq-stage">
            <p class="chip"><b>MUX</b>Tabla de selección · Ameth</p>
            <h2>Una fila, <em>una entrada</em></h2>
            <p class="eq hero" aria-label="Y igual a la suma de los cuatro términos de selección"><span class="eq-y">Y =</span>${T.map(([a, b], i) =>
              `${i ? `<span class="plus" style="--i:${i}">+</span>` : ""}<span class="term" data-t="${i}" style="--i:${i}"><span class="t-eq">${a ? ov(e("S", 1)) : e("S", 1)}${b ? ov(e("S", 0)) : e("S", 0)}${e("D", i)}</span><small>${i >> 1}${i & 1} → D${SUB[i]}</small></span>`).join("")}</p>
            <table class="ice-table strip" aria-label="Tabla de selección del MUX 4:1">
              <thead><tr><th>${S1}</th><th>${S0}</th><th>Y</th></tr></thead>
              <tbody>${[0, 1, 2, 3].map(i => `<tr data-row="${i}"><td>${i >> 1}</td><td>${i & 1}</td><td>D${SUB[i]} <small data-v></small></td></tr>`).join("")}</tbody>
            </table>
            <p class="lede sm">Cada término solo vale 1 con su combinación. El OR los junta: Y copia la entrada elegida.</p>
          </div>`;
        $$("tr[data-row]", el).forEach(tr => tap(tr, () => { const i = +tr.dataset.row; L_MUX.set({ s1: i >> 1, s0: i & 1 }); }));
        $$(".term", el).forEach(t => tap(t, () => { const i = +t.dataset.t; L_MUX.set({ s1: i >> 1, s0: i & 1 }); }));
        L_MUX.on(L => {
          $$("tr[data-row]", el).forEach((tr, i) => { tr.classList.toggle("on", i === L.sel); $("[data-v]", tr).textContent = `= ${L.st.d[i]}`; });
          $$(".term", el).forEach((t, i) => t.classList.toggle("on", i === L.sel));
        });
        buildInStages(el);
      }
    },
    {
      title: "El MUX con compuertas",
      notes: "Implementación: dos NOT generan S1 negado y S0 negado; cuatro AND de tres entradas, una por combinación, reciben su par de selección y su dato; un OR de cuatro entradas junta las salidas. Solo el AND de la fila seleccionada puede dar 1, y lo hace solo si su dato es 1. Las líneas encendidas valen 1. Toquen S1, S0 o cualquier D para comprobarlo.",
      build(el) {
        el.innerHTML = `
          <div class="col-text slim">
            <p class="chip"><b>MUX</b>Implementación</p>
            <h2>NOT, AND <em>y OR</em></h2>
            <ul class="legend">
              <li><b>2 NOT</b> generan ${ov(S1)} y ${ov(S0)}</li>
              <li><b>4 AND</b>, una por combinación</li>
              <li><b>1 OR</b> junta las cuatro</li>
            </ul>
            <p class="hint">Las líneas encendidas valen 1</p>
          </div>
          <svg class="fig wide" viewBox="0 0 1120 640" aria-label="MUX 4:1 con compuertas"></svg>`;
        muxGates($(".fig", el), L_MUX);
      }
    }
  ],
  demux: [
    {
      title: "El DEMUX 1:4",
      notes: "El demultiplexor hace lo contrario: una sola entrada D y cuatro salidas. Las líneas S1 y S0 deciden a qué salida llega D; las demás quedan en 0. Toquen D para cambiar el dato y las llaves S para mover el destino.",
      build(el) {
        el.innerHTML = `
          <div class="col-text">
            <p class="chip"><b>DEMUX</b>Funcionamiento lógico · Ameth</p>
            <h2>El DEMUX <em>1:4</em></h2>
            <p class="lede">Una sola entrada y cuatro destinos: ${S1} y ${S0} deciden hacia cuál sale la señal.</p>
            <p class="readout" data-r></p>
            <p class="hint">Toca D y las llaves S</p>
          </div>
          <svg class="fig" viewBox="0 0 1000 640" aria-label="DEMUX 1:4 interactivo"></svg>`;
        demuxSymbol($(".fig", el), L_DMX);
        L_DMX.on(L => { $("[data-r]", el).innerHTML = `${S1}${S0} = <b>${L.st.s1}${L.st.s0}</b> → Y${SUB[L.sel]} = D = <b>${L.st.din}</b>, las demás = 0`; });
      }
    },
    {
      title: "Tabla y ecuaciones",
      layout: "center",
      notes: "En la tabla del DEMUX cada fila tiene una sola salida igual a D y las otras en 0. Por eso hay una ecuación por salida: cada una es el producto de su combinación de selección por D. Las cuatro ecuaciones aparecen una a una, en el orden de la tabla. Toquen una fila o una ecuación para seleccionarla.",
      build(el) {
        el.innerHTML = `
          <div class="eq-stage">
            <p class="chip"><b>DEMUX</b>Tabla de selección · Ameth</p>
            <h2>Una fila, <em>un destino</em></h2>
            <div class="eq-grid">
              ${[[1, 1], [1, 0], [0, 1], [0, 0]].map(([a, b], i) =>
                `<p class="eq line" data-t="${i}" style="--i:${i}">${e("Y", i)} = ${a ? ov(e("S", 1)) : e("S", 1)}${b ? ov(e("S", 0)) : e("S", 0)}D<small>${i >> 1}${i & 1}</small></p>`).join("")}
            </div>
            <table class="ice-table compact" aria-label="Tabla de selección del DEMUX 1:4">
              <thead><tr><th>${S1}</th><th>${S0}</th>${[0, 1, 2, 3].map(i => `<th>Y${SUB[i]}</th>`).join("")}</tr></thead>
              <tbody>${[0, 1, 2, 3].map(i => `<tr data-row="${i}"><td>${i >> 1}</td><td>${i & 1}</td>${[0, 1, 2, 3].map(j => `<td>${i === j ? "D" : "0"}</td>`).join("")}</tr>`).join("")}</tbody>
            </table>
          </div>`;
        $$("tr[data-row]", el).forEach(tr => tap(tr, () => { const i = +tr.dataset.row; L_DMX.set({ s1: i >> 1, s0: i & 1 }); }));
        $$(".eq.line", el).forEach(t => tap(t, () => { const i = +t.dataset.t; L_DMX.set({ s1: i >> 1, s0: i & 1 }); }));
        L_DMX.on(L => {
          $$("tr[data-row]", el).forEach((tr, i) => tr.classList.toggle("on", i === L.sel));
          $$(".eq.line", el).forEach((t, i) => t.classList.toggle("on", i === L.sel));
        });
        buildInStages(el);
      }
    },
    {
      title: "El DEMUX con compuertas",
      notes: "Implementación: los mismos dos NOT para negar S1 y S0, y cuatro AND de tres entradas, una por salida. Cada AND recibe su combinación de selección y el dato D. No hace falta OR, porque cada AND ya es una salida. Toquen S1, S0 o D.",
      build(el) {
        el.innerHTML = `
          <div class="col-text slim">
            <p class="chip"><b>DEMUX</b>Implementación</p>
            <h2>NOT <em>y AND</em></h2>
            <ul class="legend">
              <li><b>2 NOT</b> generan ${ov(S1)} y ${ov(S0)}</li>
              <li><b>4 AND</b>, una por salida</li>
              <li>Sin OR: cada AND <b>es</b> una salida</li>
            </ul>
            <p class="hint">Las líneas encendidas valen 1</p>
          </div>
          <svg class="fig wide" viewBox="0 0 1120 640" aria-label="DEMUX 1:4 con compuertas"></svg>`;
        demuxGates($(".fig", el), L_DMX);
      }
    }
  ]
};

/* la ecuación se arma por etapas cada vez que la cámara llega a la estación */
function buildInStages(el) {
  onStation(el, () => {
    const box = $(".eq-stage", el);
    box.classList.remove("build"); void box.offsetWidth; box.classList.add("build");
  });
}

/* ---------- registro de rutas ----------
   Ana · Jonathan · Carlos vienen de content.js; Ameth está arriba. */
const ROUTES = { mux: [], demux: [] };
for (const side of ["mux", "demux"]) ROUTES[side] = [ANA[side], AMETH[side], JON[side], CAR[side]];

/* crea en el mundo todas las estaciones */
function buildStations(world) {
  const all = [];
  for (const side of ["mux", "demux"]) {
    ROUTES[side].forEach((list, m) => list.forEach((def, k) => {
      const [x, y] = stationPos(side, m, k);
      const el = html(`<section class="st w-${MEMBERS[m].theme} side-${side} lay-${def.layout || "split"}" data-id="${side}-${m}-${k}" data-m="${m}" style="left:${x - FW / 2}px;top:${y - FH / 2}px">
        <div class="st-bg" aria-hidden="true"></div><div class="st-in"></div></section>`);
      def.build($(".st-in", el));
      DRESS.station(el, MEMBERS[m].theme, side, k);
      world.append(el);
      Object.assign(def, { el, x, y, side, m, k });
      all.push(def);
    }));
  }
  return all;
}

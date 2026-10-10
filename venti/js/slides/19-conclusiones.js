/* 19 · Conclusiones propias (requisito 7) — una por integrante */
(function () {
  const C = [
    ["Ana", "Fundamentos", "El MUX resuelve un problema de costo: compartir un canal caro entre muchas señales."],
    ["Ameth", "Funcionamiento lógico", "Su expresión es una suma de productos: cada término decodifica S y deja pasar un dato."],
    ["Jonathan", "DEMUX y diseño", "El DEMUX es un decodificador con dato; MUX y DEMUX solo funcionan si van sincronizados."],
    ["Carlos", "Funciones y aplicaciones", "Un MUX 4:1 hace cualquier función de 3 variables: es lógica programable, como las LUT de una FPGA."]
  ];
  Deck.add({
    id: "conclusiones", title: "Conclusiones", who: "Todos", topic: "Cierre", time: 50,
    notes: C.map(([n, t, s]) => `${n}: ${s} (Decirlo con palabras propias, sin leer.)`).concat(["Idea que une todo: separar el control (S) de los datos permite elegir, repartir e incluso programar funciones con el mismo bloque."]),
    html: `
      <div class="kicker">Requisito 7 · conclusiones</div>
      <h1 class="title">Lo que nos <em>llevamos</em></h1>
      <div class="concl">${C.map(([n, t, s], k) => `<article class="cc panel" data-in="${k}"><header><b>${n}</b><span>${t}</span></header><p>${s}</p></article>`).join("")}</div>
      <p class="moral" data-in="4">Separar el <span class="g">control</span> de los <b>datos</b>: elegir, repartir y programar con el mismo bloque.</p>`
  });
})();

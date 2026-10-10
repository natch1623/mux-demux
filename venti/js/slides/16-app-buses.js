/* 16 · Aplicación 1: buses, registros y memoria (punto 8, requisito 5) */
(function () {
  const RY = [300, 420, 540, 660];
  const regs = RY.map((y, k) => `<g class="reg r${k}"><rect x="170" y="${y - 38}" width="170" height="76" rx="12"/><text x="255" y="${y}">R<tspan font-size="0.65em" dy="0.3em">${k}</tspan></text><path class="w base" d="M340 ${y} L470 ${y}"/></g>`).join("");
  const mems = RY.map((y, k) => `<g class="mem m${k}"><path class="w base" d="M1420 ${y} L1540 ${y}"/><rect x="1540" y="${y - 40}" width="210" height="80" rx="10"/><text x="1645" y="${y - 6}">Memoria ${k}</text><text class="cs" x="1645" y="${y + 24}">CS</text></g>`).join("");
  Deck.add({
    id: "app-buses", title: "Aplicación: buses y memoria", who: "Carlos", topic: "Funciones y aplicaciones", time: 60,
    notes: [
      "Primera aplicación, dentro de cualquier procesador. Hay muchos registros (R0 a R3) pero un solo bus interno que llega a la unidad aritmético-lógica (ALU).",
      "Para LEER un registro, un MUX pone en el bus el registro elegido. Las líneas de selección son parte de la instrucción: «sumar R2…» pone 10 en la selección. En un bus de 8 bits hay 8 MUX en paralelo con la misma selección.",
      "Para ESCRIBIR el resultado, un DEMUX lleva el dato al destino elegido. Aquí, el resultado de la ALU va a la memoria 1.",
      "Con memorias es igual: la dirección se decodifica (74HC139) y solo el chip elegido recibe su señal de habilitación CS (chip select). Los demás quedan desconectados del bus. Es la relación teoría-práctica más directa: sin MUX/DEMUX no hay bus compartido."
    ],
    extra: "Detalle real: en buses de microcontroladores también se usan búferes de tres estados; la idea de selección es la misma.",
    html: `
      <div class="kicker">Punto 8 · aplicación en sistemas digitales</div>
      <h1 class="title">Registros, <em>bus</em> y memoria</h1>
      <svg class="apps logic" viewBox="0 0 1920 1080">
        <g data-in="0">${regs}
          <path class="body3" d="M470 240 L580 300 L580 660 L470 720 Z"/><text x="525" y="480" class="lbl">MUX</text>
          <path class="w bus" d="M580 480 L900 480"/><text x="740" y="450" class="m" text-anchor="middle">bus</text>
          <rect class="alu" x="900" y="400" width="190" height="160" rx="16"/><text x="995" y="480" class="lbl">ALU</text>
          <path class="w bus2" d="M1090 480 L1310 480"/>
          <path class="body3" d="M1310 300 L1420 240 L1420 720 L1310 660 Z"/><text x="1365" y="480" class="lbl">DEMUX</text>
          ${mems}
          <path class="w s" d="M525 690 L525 760"/><text x="525" y="792" class="g" text-anchor="middle">leer: 10</text>
          <path class="w s" d="M1365 690 L1365 760"/><text x="1365" y="792" class="g" text-anchor="middle">escribir: 01</text>
        </g>
        <path class="gust" data-in="1" d="M340 540 L470 540 L580 480 L900 480" pathLength="100"/>
        <path class="gust" data-in="2" d="M1090 480 L1310 480 L1420 420 L1540 420" pathLength="100"/>
      </svg>
      <div class="says top">
        <p class="say" data-in="0" data-out="1">Muchos registros, <b>un solo bus</b> hacia la ALU.</p>
        <p class="say" data-in="1" data-out="2"><b>Leer</b>: un MUX pone en el bus el registro elegido (R<sub>2</sub>).</p>
        <p class="say" data-in="2" data-out="3"><b>Escribir</b>: un DEMUX lleva el resultado al destino (Memoria 1).</p>
        <p class="say" data-in="3">La dirección se decodifica: solo un chip recibe <b>CS</b>.</p>
      </div>`
  });
})();

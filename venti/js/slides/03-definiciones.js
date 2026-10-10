/* 3 · Definiciones: multiplexación y demultiplexación (punto 1 del Equipo 3) */
(function () {
  const YS = [350, 430, 510, 590];
  const muxPath = "M300 430 L480 430 L640 470 L800 470";
  const demuxPath = "M1120 470 L1280 470 L1440 430 L1620 430";
  const fullPath = "M300 430 L480 430 L640 470 L1280 470 L1440 430 L1620 430";
  Deck.add({
    id: "definiciones", title: "Definiciones", who: "Ana", topic: "Fundamentos", time: 55,
    notes: [
      "Multiplexar es seleccionar UNA de varias entradas de datos y enviarla a una única salida. El MUX es un «selector de datos»: muchas → una.",
      "Demultiplexar es lo contrario: tomar UNA entrada y llevarla a UNA de varias salidas. El DEMUX es un «distribuidor de datos»: una → muchas.",
      "Juntos resuelven el problema anterior: el MUX junta varias señales en un solo canal y el DEMUX las reparte al otro extremo.",
      "Lo que decide el camino no son los datos sino las líneas de selección (señales de control). En los dos extremos deben tener el mismo código, es decir, ir sincronizadas."
    ],
    extra: "Pregunta posible: ¿un MUX es combinacional o secuencial? → Combinacional: la salida depende solo de las entradas actuales (datos y selección), no tiene memoria.",
    html: `
      <div class="kicker">Punto 1 · definiciones</div>
      <h1 class="title">Elegir y <em>repartir</em></h1>
      <svg class="defs logic" viewBox="0 0 1920 1080">
        <g class="mx" data-in="0">
          ${YS.map(y => `<path class="w base" d="M300 ${y} L480 ${y}"/>`).join("")}
          <path class="body" d="M480 300 L640 390 L640 550 L480 640 Z"/>
          <path class="w base" d="M640 470 L800 470"/>
          <text x="560" y="470" class="sym">MUX</text>
          <path class="gust" d="${muxPath}" pathLength="100" data-in="0" data-out="2"/>
          <text x="270" y="430" class="m" text-anchor="end">I<tspan font-size="0.65em" dy="0.3em">1</tspan></text>
        </g>
        <g class="dx" data-in="1">
          <path class="w base" d="M1120 470 L1280 470"/>
          <path class="body" d="M1280 390 L1440 300 L1440 640 L1280 550 Z"/>
          ${YS.map(y => `<path class="w base" d="M1440 ${y} L1620 ${y}"/>`).join("")}
          <text x="1360" y="470" class="sym">DEMUX</text>
          <path class="gust" d="${demuxPath}" pathLength="100" data-in="1" data-out="2"/>
          <text x="1650" y="430" class="m" text-anchor="start">Y<tspan font-size="0.65em" dy="0.3em">1</tspan></text>
        </g>
        <g class="link" data-in="2">
          <path class="w chan" d="M800 470 L1120 470"/>
          <text x="960" y="430" class="m" text-anchor="middle">un solo canal</text>
          <path class="gust" d="${fullPath}" pathLength="100"/>
        </g>
        <g class="sels" data-in="3">
          <path class="w s v1" d="M535 609 L535 680 M585 581 L585 680"/>
          <path class="w s v1" d="M1335 581 L1335 680 M1385 609 L1385 680"/>
          <text x="510" y="660" class="g" text-anchor="end">S<tspan font-size="0.65em" dy="0.3em">1</tspan><tspan dy="-0.3em">S</tspan><tspan font-size="0.65em" dy="0.3em">0</tspan><tspan dy="-0.3em"> = 01</tspan></text>
          <text x="1410" y="660" class="g" text-anchor="start">S<tspan font-size="0.65em" dy="0.3em">1</tspan><tspan dy="-0.3em">S</tspan><tspan font-size="0.65em" dy="0.3em">0</tspan><tspan dy="-0.3em"> = 01</tspan></text>
          <path class="sync" d="M600 690 Q 960 760 1320 690"/>
          <text x="960" y="700" class="g" text-anchor="middle">sincronizadas</text>
        </g>
      </svg>
      <div class="def-card l" data-in="0"><h3>Multiplexar</h3><p>Elegir <b>una</b> de varias entradas y enviarla por <b>una sola</b> salida.</p></div>
      <div class="def-card r" data-in="1"><h3>Demultiplexar</h3><p>Llevar <b>una</b> entrada a la salida <b>elegida</b>.</p></div>
      <div class="says">
        <p class="say top" data-in="2" data-out="3">Juntos: varios emisores comparten <b>un solo canal</b>.</p>
        <p class="say top" data-in="3">Quien manda es el <span class="g">control</span>: las líneas de selección.</p>
      </div>`
  });
})();

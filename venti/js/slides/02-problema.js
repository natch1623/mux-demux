/* 2 · El problema: muchas señales, un solo canal (requisito 1: qué problema resuelve) */
(function () {
  const SRC = [300, 450, 600, 750];          // y de las fuentes A–D
  const NAMES = ["A", "B", "C", "D"];
  const GX = 900, GY = 540;                    // compuerta / embudo
  const wire = y => `M284 ${y} C 560 ${y}, 700 ${GY}, ${GX - 40} ${GY}`;
  const ang = y => { let a = (Math.atan2(y - GY, 250 - GX) * 180) / Math.PI - 180; while (a <= -180) a += 360; while (a > 180) a -= 360; return a; }; // giro del brazo (apunta a la izquierda en 0°)

  Deck.add({
    id: "problema", title: "El problema", who: "Ana", topic: "Fundamentos", time: 60,
    notes: [
      "Imaginen cuatro fuentes de datos: sensores, micrófonos o registros de un procesador. Todas quieren enviar información al mismo tiempo.",
      "Pero entre el emisor y el receptor hay un solo canal: un cable, un bus o una antena. Tender un cable por señal es caro y ocupa espacio.",
      "Si las cuatro señales entran a la vez, se mezclan: el receptor ve una «colisión» y no sabe qué dato era de quién. El dato se pierde.",
      "La solución: un selector que decide quién pasa. Solo una fuente llega al canal; las otras esperan. Eso es multiplexar.",
      "Y si el selector va cambiando de turno muy rápido, todas comparten el canal: es la idea de la multiplexación por división de tiempo, que retomará Carlos."
    ],
    html: `
      <div class="kicker">Introducción · el problema</div>
      <h1 class="title">Muchas señales, <em>un solo canal</em></h1>
      <svg class="prob" viewBox="0 0 1920 1080" data-sel="1">
        <defs>
          <radialGradient id="pb-orb"><stop offset="0" stop-color="var(--text-main)"/><stop offset=".45" stop-color="var(--signal-active)"/><stop offset="1" stop-color="var(--bg-horizon)"/></radialGradient>
        </defs>
        <text class="cap" x="250" y="222" data-in="0">fuentes</text>
        ${SRC.map((y, k) => `
          <g class="src s${k}" data-in="0">
            <path class="wire" d="${wire(y)}"/>
            <path class="gust" d="${wire(y)}" pathLength="100" style="animation-delay:${-k * 0.37}s"/>
            <circle class="orb" cx="250" cy="${y}" r="34"/>
            <text class="nm" x="250" y="${y + 2}">${NAMES[k]}</text>
          </g>`).join("")}
        <g class="chan" data-in="1">
          <rect x="${GX - 40}" y="${GY - 20}" width="680" height="40" rx="20"/>
          <path class="gust big" d="M${GX - 40} ${GY} L ${GX + 640} ${GY}" pathLength="100"/>
          <circle class="rx" cx="1700" cy="${GY}" r="50"/>
          <text class="rxl" x="1700" y="${GY + 2}">?</text>
          <text class="cap" x="1700" y="${GY - 90}">receptor</text>
          <text class="cap" x="${GX + 300}" y="${GY + 70}">un solo canal</text>
        </g>
        <g class="crash" data-in="2" data-out="3">
          <circle cx="${GX - 20}" cy="${GY}" r="70"/>
          <path d="M${GX - 50} ${GY - 30} l60 60 M${GX + 10} ${GY - 30} l-60 60"/>
          <text class="cap err" x="${GX - 20}" y="${GY + 120}">colisión</text>
        </g>
        <g class="gate" data-in="3">
          <circle cx="${GX - 40}" cy="${GY}" r="56"/>
          <g class="arm" style="--a:${ang(SRC[1])}deg"><line x1="${GX - 40}" y1="${GY}" x2="${GX - 128}" y2="${GY}"/><circle cx="${GX - 128}" cy="${GY}" r="9"/></g>
          <text class="cap gold" x="${GX - 40}" y="${GY + 100}">selector</text>
        </g>
      </svg>
      <div class="says">
        <p class="say" data-in="0" data-out="1">Cuatro fuentes quieren enviar datos <b>al mismo tiempo</b>.</p>
        <p class="say" data-in="1" data-out="2">Pero solo hay <b>un canal</b>: un cable, un bus, una antena.</p>
        <p class="say" data-in="2" data-out="3">Si entran todas a la vez, <span class="err">chocan</span>: el dato se pierde.</p>
        <p class="say" data-in="3" data-out="4">Un <span class="g">selector</span> decide quién pasa: eso es <b>multiplexar</b>.</p>
        <p class="say" data-in="4">Turno a turno, todas <b>comparten</b> el mismo canal.</p>
      </div>`,
    onPhase(ctx, p) {
      const svg = ctx.q(".prob");
      const set = k => {
        svg.dataset.sel = k;
        ctx.q(".arm").style.setProperty("--a", ang(SRC[k]) + "deg");
        ctx.q(".rxl").textContent = p >= 3 ? NAMES[k] : "?";
      };
      svg.classList.toggle("flowing", p >= 2);
      svg.classList.toggle("selecting", p >= 3);
      set(1);
      if (p >= 4) { let k = 1; ctx.every(() => { k = (k + 1) % 4; set(k); }, ctx.calm ? 2200 : 1300); }
    }
  });
})();

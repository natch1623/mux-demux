/* 17 · Aplicación 2: telecomunicaciones, multiplexación por división de tiempo (TDM) */
(function () {
  const YS = [320, 440, 560, 680], L = ["A", "B", "C", "D"];
  const MX = 540, DX = 1380, CY = 500, N = 8;
  const armAng = (hx, sy, left) => { let a = (Math.atan2(sy - CY, left ? -320 : 320) * 180) / Math.PI - (left ? 180 : 0); while (a <= -180) a += 360; while (a > 180) a -= 360; return a; }; // 0° = brazo en reposo
  const waveD = y => { let d = `M120 ${y}`; for (let x = 0; x <= 120; x += 6) d += ` L${130 + x} ${y + Math.sin(x / 9) * 16}`; return d; };
  Deck.add({
    id: "app-telecom", title: "Aplicación: telecomunicaciones", who: "Carlos", topic: "Funciones y aplicaciones", time: 60,
    notes: [
      "Segunda aplicación: telefonía y comunicaciones digitales. Cuatro conversaciones deben viajar por una sola línea (o un solo canal de radio).",
      "El MUX toma una muestra de cada voz por turnos: A, B, C, D, A, B… Cada muestra ocupa una «ranura de tiempo». Esto es multiplexación por división de tiempo (TDM). Las líneas de selección las mueve un contador.",
      "En el otro extremo, un DEMUX con la MISMA secuencia de selección reparte cada ranura a su oyente. Si el muestreo es suficientemente rápido, cada uno escucha su voz continua. Así funcionaban los enlaces E1/T1: 32 o 24 canales en un solo par de cables.",
      "Limitación práctica: los dos extremos deben estar sincronizados. Si el DEMUX se adelanta una ranura, la voz A llega al oyente B. Por eso las tramas llevan bits de sincronización.",
      "Otros usos reales: convertidores ADC de varios canales (un CD4051 elige qué sensor se mide), pantallas de 7 segmentos multiplexadas, teclados matriciales y las LUT de las FPGA, que son MUX."
    ],
    html: `
      <div class="kicker">Punto 8 · aplicación en telecomunicaciones</div>
      <h1 class="title">Cuatro voces, <em>una línea</em></h1>
      <svg class="tdm logic" viewBox="0 0 1920 1080">
        <g data-in="0">
          ${YS.map((y, k) => `<g class="src c${k}"><path class="wave" d="${waveD(y)}"/><text x="100" y="${y}" text-anchor="end">${L[k]}</text><path class="w base" d="M250 ${y} L${MX - 40} ${y + (CY - y) * 0.15}"/></g>`).join("")}
          ${YS.map((y, k) => `<g class="dst d${k}"><path class="w base" d="M${DX + 40} ${y + (CY - y) * 0.15} L1690 ${y}"/><circle cx="1720" cy="${y}" r="28"/><text x="1720" y="${y}">${L[k]}</text></g>`).join("")}
          <path class="w line" d="M${MX} ${CY} L${DX} ${CY}"/>
          <circle class="hub" cx="${MX}" cy="${CY}" r="40"/><circle class="hub" cx="${DX}" cy="${CY}" r="40"/>
          <text x="${MX}" y="${CY + 80}" class="g">MUX</text><text x="${DX}" y="${CY + 80}" class="g">DEMUX</text>
          <text x="140" y="250" class="m">voces</text><text x="1720" y="250" class="m">oyentes</text>
        </g>
        <g class="arm mxa" style="--a:0deg"><line x1="${MX}" y1="${CY}" x2="${MX - 70}" y2="${CY}"/></g>
        <g class="arm dxa" style="--a:0deg"><line x1="${DX}" y1="${CY}" x2="${DX + 70}" y2="${CY}"/></g>
        <g class="slots" data-in="1">${Array.from({ length: N }, (_, i) => `<g class="slot" data-i="${i}"><rect x="${MX + 60 + i * 92}" y="${CY - 34}" width="80" height="68" rx="10"/><text x="${MX + 100 + i * 92}" y="${CY}"></text></g>`).join("")}</g>
        <text class="err-t" x="${(MX + DX) / 2}" y="${CY + 110}" data-in="3" data-out="4">desfasado: la voz A llega a B</text>
      </svg>
      <div class="other panel" data-in="4">
        <h3>Otros usos reales</h3>
        <ul><li>ADC multicanal · <b>CD4051</b></li><li>Displays de 7 segmentos multiplexados</li><li>Teclados matriciales</li><li>FPGA: cada LUT es un <b>MUX</b></li></ul>
      </div>
      <div class="says">
        <p class="say" data-in="0" data-out="1">Cuatro llamadas, <b>una sola línea</b>.</p>
        <p class="say" data-in="1" data-out="2">El MUX toma una muestra de cada voz por turnos: <b>TDM</b>.</p>
        <p class="say" data-in="2" data-out="3">Un DEMUX <span class="g">sincronizado</span> reparte cada ranura.</p>
        <p class="say" data-in="3" data-out="4">Sin sincronía, la voz llega al <span class="err">oyente equivocado</span>.</p>
        <p class="say" data-in="4">Mismo principio en ADC, displays, teclados y FPGA.</p>
      </div>`,
    onPhase(ctx, p) {
      const svg = ctx.q(".tdm");
      const slots = ctx.qa(".slot");
      const seq = [];                               // contenido de las ranuras (índice de voz)
      let k = 0;
      const mxa = ctx.q(".mxa"), dxa = ctx.q(".dxa");
      svg.classList.toggle("running", p >= 1 && p <= 3);
      svg.classList.toggle("desync", p === 3);
      const render = () => {
        slots.forEach((g, i) => {
          const v = seq[i];
          g.querySelector("text").textContent = v == null ? "" : L[v];
          g.setAttribute("class", "slot" + (v == null ? "" : " c" + v));
        });
        mxa.style.setProperty("--a", armAng(MX, YS[k % 4], true) + "deg");
        const out = seq[N - 1];
        ctx.qa(".dst").forEach(d => d.classList.remove("hit", "bad"));
        if (p >= 2 && out != null) {
          const to = p === 3 ? (out + 1) % 4 : out;
          dxa.style.setProperty("--a", armAng(DX, YS[to], false) + "deg");
          ctx.q(".d" + to).classList.add(p === 3 ? "bad" : "hit");
        } else dxa.style.setProperty("--a", "0deg");
      };
      if (p === 0 || p === 4) { seq.length = 0; render(); mxa.style.setProperty("--a", "0deg"); return; }
      // relleno inicial para que la línea ya tenga ranuras
      for (let i = N - 1; i >= 0; i--) seq[i] = (N - 1 - i) % 4;
      k = N % 4;
      render();
      ctx.every(() => { seq.pop(); seq.unshift(k % 4); k++; render(); }, ctx.calm ? 1600 : 750);
    }
  });
})();

"use strict";
/* =====================================================================
   Escena de Tsaritsa (§2.4b, §2.8), Venom (§3.4b, §3.8) y DIO (§4.4b, §4.8):
   detalles de ambiente y estilo del mundo sobre la retícula común (chip «S₁S₀»).
   El fondo sigue siendo la ilustración de cada mundo (AMBIENCE, imágenes .webp),
   por decisión del usuario.
   Todo SVG/CSS propio; nada oficial.
   ===================================================================== */
(() => {
  const W = 1920, H = 1080;
  // aleatorio determinista por estación
  const semilla = s => { let x = [...String(s)].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7) || 1; return () => ((x = x * 16807 % 2147483647) & 0x7fffffff) / 2147483647; };
  const capa = (cls, cuerpo, vb = `0 0 ${W} ${H}`, par = "xMidYMid slice") =>
    `<div class="mw-capa ${cls}"><svg viewBox="${vb}" preserveAspectRatio="${par}" aria-hidden="true">${cuerpo}</svg></div>`;
  const montarFondo = (sec, clase, capas) => {
    const bg = $(".st-bg", sec);
    bg.innerHTML = `<div class="mw-fondo ${clase}">${capas.join("")}</div>`;
  };

  /* ---------- parallax compartido: solo la estación actual, sin cámara en movimiento ---------- */
  const PARALLAX = (() => {
    let tema = null, raf = 0, px = 0, py = 0, tx = 0, ty = 0, t0 = performance.now();
    const mover = e => { if (e.pointerType === "mouse") { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; } };
    function paso(now) {
      raf = requestAnimationFrame(paso);
      const sec = $(".st.cur.mundo"), world = $("#world");
      if (!sec || world?.classList.contains("moving") || reduced) return;
      px += (tx - px) * .06; py += (ty - py) * .06;
      const t = (now - t0) / 1000, dx = px + Math.sin(t * .11) * .12, dy = py + Math.cos(t * .09) * .08;
      $$(".mw-capa[data-f]", sec).forEach(c => { const f = +c.dataset.f; c.style.transform = `translate3d(${(-dx * f * 260).toFixed(1)}px,${(-dy * f * 140).toFixed(1)}px,0)`; });
    }
    return {
      iniciar(t) { tema = t; addEventListener("pointermove", mover); if (!raf && !reduced) raf = requestAnimationFrame(paso); },
      detener() { removeEventListener("pointermove", mover); cancelAnimationFrame(raf); raf = 0; tema = null; }
    };
  })();
  const ciclo = tema => ({
    iniciar() { PARALLAX.iniciar(tema); document.documentElement.classList.add("mw-" + tema); },
    detener() { PARALLAX.detener(); document.documentElement.classList.remove("mw-" + tema); }
  });

  /* ======================== TSARITSA (S₁S₀ = 01) ======================== */
  function montanas(r, y0, alto, n, cls) {
    let d = `M0 ${H}L0 ${y0}`;
    for (let i = 0; i <= n; i++) {
      const x = i / n * W, cima = y0 - alto * (.45 + r() * .55);
      d += `L${(x - W / n / 2).toFixed(0)} ${cima.toFixed(0)}L${x.toFixed(0)} ${(y0 - alto * r() * .25).toFixed(0)}`;
    }
    return `<path class="${cls}" d="${d}L${W} ${H}Z"/>`;
  }
  function palacio() {
    // torres de cristal simétricas alrededor del eje central
    const torre = (x, w, h) => `<path class="tz-torre" d="M${x - w / 2} 820V${820 - h}L${x} ${820 - h - w * 1.6}L${x + w / 2} ${820 - h}V820Z"/><path class="tz-torre-luz" d="M${x} ${820 - h - w * 1.6}V820"/>`;
    const t = [[960, 70, 330], [840, 46, 240], [1080, 46, 240], [730, 34, 170], [1190, 34, 170], [640, 26, 120], [1280, 26, 120]];
    return `<g class="tz-palacio">${t.map(([x, w, h]) => torre(x, w, h)).join("")}<path class="tz-muro" d="M600 820H1320V860H600Z"/></g>`;
  }
  const esquina = `<path d="M0 0H120M0 0V120M18 18H86M18 18V86M0 0L44 44M44 44l-10 0 10-10z"/><path class="tz-rombo" d="M44 34L54 44 44 54 34 44Z"/>`;
  MUNDOS.definir("tsaritsa", {
    ...ciclo("tsaritsa"),
    montar(sec) {
      // el fondo sigue siendo la ilustración del mundo (decisión del usuario)
      AMBIENCE.mount(sec, "tsaritsa");
      sec.insertAdjacentHTML("beforeend", `<div class="tz-copos" aria-hidden="true"></div>`);
    }
  });

  /* ========================= VENOM (S₁S₀ = 10) ========================= */
  function venas(r, n) {
    let d = "";
    for (let i = 0; i < n; i++) {
      let x = r() < .5 ? -20 : W + 20, y = r() * H, a = x < 0 ? 0 : Math.PI;
      d += `M${x.toFixed(0)} ${y.toFixed(0)}`;
      for (let k = 0; k < 7; k++) { a += (r() - .5) * 1.1; const l = 60 + r() * 120; const cx = x + Math.cos(a - .5) * l * .6, cy = y + Math.sin(a - .5) * l * .6; x += Math.cos(a) * l; y += Math.sin(a) * l; d += `Q${cx.toFixed(0)} ${cy.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`; }
    }
    return d;
  }
  // frases del susurro (cambian con cada diapositiva)
  const SUSURROS = ["nosotros elegimos la entrada", "deliciosa ramificación", "más bloques. más hambre.", "enable = 1: podemos comer", "las funciones saben a lógica", "abriendo ramas… ñam", "una salida a la vez, por ahora", "decodificar es masticar bits"];
  MUNDOS.definir("venom", {
    ...ciclo("venom"),
    montar(sec, info) {
      AMBIENCE.mount(sec, "venom");
      const k = (info.side === "mux" ? 0 : 4) + info.k;
      sec.insertAdjacentHTML("beforeend", `<p class="vn-susurro" aria-hidden="true">${SUSURROS[k % SUSURROS.length]}</p>`);
    }
  });

  /* ========================== DIO (S₁S₀ = 11) ========================== */
  const KATAKANA = ["ゴゴゴ", "ドドド", "メメタァ", "バァーン", "ズキュウウン", "ドォーン", "ゴゴゴゴ", "ザ・ワールド", "ムダ", "オラ"];
  // poses originales y genéricas (siluetas), una distinta por diapositiva
  const POSES = [
    "M60 20c14 0 22 12 18 26l-4 10 30 18 26-30 10 8-30 42-30-10 4 50 22 120h-20l-24-90-14 90H28l6-120-2-60-30 30-8-8 34-40 6-18c-6-18 8-38 26-38z",
    "M70 18c16 2 22 18 16 30l-6 8 6 30 44 22-6 12-44-14 10 50 6 124H74l-8-96-18 96H28l16-120-6-60-24-36 10-8 26 26 10-6-8-14c-6-16 6-26 24-24z",
    "M64 16c16 0 24 16 18 30l-6 10 36 4 30-26 8 10-32 36-40 2 10 60 20 118H86l-20-92-12 92H34l10-120-4-70-32-16 4-12 34 10c-8-20 4-36 18-36z",
    "M56 22c16-2 26 10 22 26l-6 10 10 40 40-40 10 8-42 58 10 42 26 94H104l-30-84-6 84H48l-2-110-22-40-20 10-4-12 30-18 4-14c-8-18 6-32 22-34z"
  ];
  MUNDOS.definir("dio", {
    ...ciclo("dio"),
    montar(sec, info) {
      const k = (info.side === "mux" ? 0 : 6) + info.k;
      AMBIENCE.mount(sec, "dio");
      sec.insertAdjacentHTML("beforeend", `<svg class="dio-pose" viewBox="0 0 180 300" aria-hidden="true"><path d="${POSES[k % POSES.length]}"/></svg>
        <p class="dio-kana" aria-hidden="true">${KATAKANA[(k + 3) % KATAKANA.length]}</p>`);
    }
  });
})();

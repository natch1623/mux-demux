"use strict";
/* =====================================================================
   Partículas en pantalla: nieve del HUB y destellos.
   La paleta cambia con el mundo en el que está la cámara.
   ===================================================================== */
const FX = (() => {
  const cv = $("#snow"), ctx = cv.getContext("2d");
  const PAL = {
    hub: ["#CFE6FF", "#9FD4FF", "#7FE3F0", "#F4E6C2"],
    tsaritsa: ["#CFE6FF", "#9FD4FF", "#E8F4FF", "#BFE3FF"],
    marceline: ["#E0344A", "#FF7A8A", "#8C1C2C", "#F4D9DD"],
    venom: ["#F3F1E8", "#63788E", "#CAD0D6", "#171C23"],
    dio: ["#F2C14E", "#FFE08A", "#C9862B", "#FFF4D0"],
    ending: ["#C9352F", "#E3B341", "#6E2A6B", "#F2E3C0"]
  };
  const sprites = {};
  const sprite = c => {
    if (sprites[c]) return sprites[c];
    const s = document.createElement("canvas");
    s.width = s.height = 64;
    const g = s.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(.14, c); gr.addColorStop(.42, c + "55"); gr.addColorStop(1, c + "00");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return sprites[c] = s;
  };
  let W = 0, H = 0, pal = PAL.hub, motes = [], flakes = [], sparks = [], snowOn = true, density = 1;
  const pick = () => pal[Math.floor(Math.random() * pal.length)];
  const mote = () => ({ x: Math.random() * W, y: Math.random() * H, s: 2 + Math.random() ** 2 * 12, vy: .18 + Math.random() * .5, f: .0006 + Math.random() * .0012, ph: Math.random() * 6.28, c: pick() });
  const flake = () => ({ x: Math.random() * W, y: Math.random() * H, s: 5 + Math.random() * 8, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .012, vy: .25 + Math.random() * .4, vx: (Math.random() - .5) * .3 });
  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes = Array.from({ length: reduced ? 20 : Math.round(clamp(W * H / 16000, 50, 120)) }, mote);
    flakes = Array.from({ length: reduced ? 0 : 12 }, flake);
  }
  function drawFlake(f) {
    ctx.save();
    ctx.translate(f.x, f.y); ctx.rotate(f.rot);
    ctx.globalAlpha = .42;
    ctx.strokeStyle = "#DDEEFF"; ctx.lineWidth = 1.1; ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.moveTo(0, 0); ctx.lineTo(0, -f.s);
      ctx.moveTo(0, -f.s * .55); ctx.lineTo(-f.s * .25, -f.s * .78);
      ctx.moveTo(0, -f.s * .55); ctx.lineTo(f.s * .25, -f.s * .78);
    }
    ctx.stroke();
    ctx.restore();
  }
  let last = 0, raf = 0;
  function tick(t) {
    raf = 0;
    if (reduced || document.hidden) { ctx.clearRect(0,0,W,H); return; }
    const dt = Math.min(3, (t - last) / 16.67 || 1); last = t;
    ctx.clearRect(0, 0, W, H);
    if (snowOn) {
      ctx.globalCompositeOperation = "source-over";
      for (const f of flakes) {
        f.y += f.vy * dt; f.x += (f.vx + Math.sin(t * .0007 + f.rot) * .25) * dt; f.rot += f.vr * dt;
        if (f.y > H + 30) { f.y = -30; f.x = Math.random() * W; }
        drawFlake(f);
      }
    }
    ctx.globalCompositeOperation = "lighter";
    const nm = Math.round(motes.length * density);
    for (let i = 0; i < nm; i++) {
      const m = motes[i];
      m.y += m.vy * dt; m.x += Math.sin(t * m.f + m.ph) * .35 * dt;
      if (m.y > H + 30) { m.y = -30; m.x = Math.random() * W; m.c = pick(); }
      ctx.globalAlpha = .22 + .28 * (1 + Math.sin(t * .0015 + m.ph)) / 2;
      const s = m.s * 2;
      ctx.drawImage(sprite(m.c), m.x - s / 2, m.y - s / 2, s, s);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.vx *= .955; p.vy = p.vy * .955 + .02;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.4);
      const s = p.s * (.6 + p.life / p.max * .6) * 2;
      ctx.drawImage(sprite(p.c), p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(tick);
  }
  function burst(x, y, n = 40, pow = 8, colors) {
    if (reduced) return;
    const P = colors || pal;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = pow * (.25 + Math.random() * .75);
      const max = 45 + Math.random() * 60;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, s: 3 + Math.random() * 9, c: P[Math.floor(Math.random() * P.length)] });
    }
    if (sparks.length > 800) sparks.splice(0, sparks.length - 800);
  }
  // quiet: dentro de una estación las partículas bajan para no competir con el contenido
  function setTheme(name, quiet = false) {
    pal = PAL[name] || PAL.hub;
    density = quiet ? .3 : name === "ending" ? .5 : 1;
    snowOn = name === "hub" || (name === "tsaritsa" && !quiet);
    motes.forEach(m => { m.c = pick(); });
  }
  resize();
  addEventListener("resize", resize);
  const resume = () => { cancelAnimationFrame(raf); raf=0; ctx.clearRect(0,0,W,H); if (!reduced && !document.hidden) raf=requestAnimationFrame(tick); };
  mq.addEventListener('change',resume);
  document.addEventListener('visibilitychange',resume);
  resume();
  return { burst, setTheme, PAL };
})();

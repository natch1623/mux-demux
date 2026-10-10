"use strict";
/* =====================================================================
   Simbionte de Venom (Jonathan) sobre su propio lienzo de pantalla:
   una masa negra y viscosa se arrastra por el cable junto a la señal.
   - cuerpo: contorno que ondula, cabeza más gruesa, borde morado y brillo húmedo
   - tentáculos: salen de la cabeza, se agarran del cable más adelante (o se agitan
     a los costados) y la masa se arrastra hasta ellos
   - hebras que envuelven el cable y gotas que se quedan atrás y escurren
   Igual que los murciélagos: mientras la cámara viaja, app.js dibuja cada cuadro
   justo después de moverla (frame); el resto del tiempo se anima solo.
   ===================================================================== */
const VENOM = (() => {
  const cv = $("#venom"), ctx = cv.getContext("2d");
  let W = 0, H = 0;
  let on = false, at = null, scale = () => 1, sig = 0, dir = 1, grow = 0, shrink = 1;
  let tendrils = [], drops = [], lastDrop = 0, lastSpawn = 0;
  let raf = 0, last = 0, driven = -1, clock = 0, speed = 0, prevSig = NaN;   // speed: unidades del mundo por ms

  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener("resize", resize);

  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const BODY = 620, LEAD = 60, HALF = 46;              // largo, adelanto de la cabeza y medio grosor (unidades del mundo)

  // punto del cable en pantalla y su normal, para un largo del recorrido
  function frameAt(len) {
    const [x, y] = at(len), [qx, qy] = at(len + 6 * dir);
    let tx = qx - x, ty = qy - y, n = Math.hypot(tx, ty);
    if (n < .3) { tx = dir; ty = 0; n = 1; }
    return { x, y, nx: -ty / n, ny: tx / n };
  }
  // ondulación orgánica (suma de senos: barata y sin repeticiones visibles)
  const wob = (u, t) => Math.sin(u * 13 + t * 3.1) * .5 + Math.sin(u * 29 - t * 4.7) * .3 + Math.sin(u * 7 + t * 1.3) * .2;
  // grosor a lo largo del cuerpo (u: 0 cola → 1 cabeza)
  const profile = u => smooth(0, .4, u) * (.8 + .2 * Math.sin(u * 19)) * (1 - .2 * smooth(.72, .86, u)) + .45 * Math.exp(-(((u - .93) / .07) ** 2));

  function spawnTendril() {
    const grab = Math.random() < .7;                   // la mayoría se agarra del cable; el resto se agita al costado
    const life = rnd(650, 950);
    tendrils.push({
      // se agarra lo bastante adelante como para que la masa tarde en alcanzarlo
      born: clock, life, anchor: sig + dir * (rnd(140, 330) + speed * life * .6), grab,
      side: Math.random() < .5 ? -1 : 1, amp: rnd(22, 55), off: grab ? 0 : rnd(80, 150),
      ph: rnd(0, 6.28), w: rnd(11, 17)
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (at && !isNaN(sig)) drawBody();
    if (blob) drawBlob();
  }

  /* velo: la masa se expande desde la cabeza hasta cubrir la pantalla (cover)
     y luego se retrae hacia el lado de donde venía (uncover) */
  let blob = null, headPt = null;
  function drawBlob() {
    const b = blob, t = clock / 1000;
    if (b.follow && headPt) { b.cx = headPt.x; b.cy = headPt.y; }
    const R = b.r, cx = b.cx + b.ox, cy = b.cy + b.oy;
    if (R < 1) return;
    // tentáculos que salen del borde hacia afuera
    ctx.lineCap = "round";
    for (const k of b.arms) {
      const a = k.a + Math.sin(t * 2 + k.ph) * .05, L = R * k.len * b.reach;
      const pts = [];
      for (let j = 0; j <= 10; j++) {
        const u = j / 10, d = R * .9 + L * u, sw = Math.sin(u * 6 + t * 5 + k.ph) * 10 * u;
        pts.push([cx + Math.cos(a) * d - Math.sin(a) * sw, cy + Math.sin(a) * d + Math.cos(a) * sw, u]);
      }
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? "#050208" : "rgba(154,107,255,.45)";
        for (let j = 1; j < pts.length; j++) {
          const w = k.w * (1 - pts[j][2] * .85);
          ctx.lineWidth = pass ? w : w + 6;
          ctx.beginPath(); ctx.moveTo(pts[j - 1][0], pts[j - 1][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
        }
      }
    }
    // la masa: contorno que ondula
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const a = i / 72 * Math.PI * 2, rr = R * (1 + .07 * wob(a, t) + .04 * Math.sin(a * 7 + t * 3));
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.lineJoin = "round";
    ctx.lineWidth = 12; ctx.strokeStyle = "rgba(154,107,255,.5)"; ctx.stroke();
    ctx.fillStyle = "#050208"; ctx.fill();
    // brillo húmedo en el borde
    ctx.strokeStyle = "rgba(225,210,255,.25)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, R * .93, -2.4, -1.2); ctx.stroke();
  }
  function newBlob() {
    return {
      cx: W / 2, cy: H / 2, ox: 0, oy: 0, r: 0, reach: 1, follow: true,
      arms: Array.from({ length: 16 }, (_, i) => ({ a: i / 16 * Math.PI * 2 + rnd(-.15, .15), len: rnd(.25, .6), w: rnd(14, 26), ph: rnd(0, 6.28) }))
    };
  }

  function drawBody() {
    const s = scale(), t = clock / 1000;
    const len = BODY * grow * shrink;
    const head = sig + dir * LEAD * grow * shrink;
    { const p = frameAt(head); headPt = p; }

    // gotas que quedan en el cable y escurren
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], age = (clock - d.born) / 1300;
      if (age >= 1) { drops.splice(i, 1); continue; }
      const p = frameAt(d.len);
      ctx.fillStyle = `rgba(8,4,14,${(1 - age) * .9})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + age * 26 * s, d.r * s * (1 - age * .5), d.r * s * (1.2 + age * .8), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (len < 2) return;
    // contorno del cuerpo: borde superior e inferior a lo largo del cable
    const N = 46, top = [], bot = [], mid = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, p = frameAt(head - dir * len * (1 - u));
      const w = HALF * s * (profile(u) * (1 + .26 * wob(u * 1.4, t)) + .12);
      const lift = 2.5 * s * wob(u * 2 + 1, t * 1.4);   // la masa se escurre un poco hacia abajo y arriba
      top.push([p.x + p.nx * w, p.y + p.ny * w + lift]);
      bot.push([p.x - p.nx * w * 1.08, p.y - p.ny * w * 1.08 + lift]);
      mid.push([p, w, u]);
    }
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(top[0][0], top[0][1]);
      for (let i = 1; i <= N; i++) ctx.lineTo(top[i][0], top[i][1]);
      for (let i = N; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
      ctx.closePath();
    };

    // tentáculos (debajo del cuerpo, para que nazcan de él)
    ctx.lineCap = "round";
    for (let i = tendrils.length - 1; i >= 0; i--) {
      const k0 = tendrils[i], age = (clock - k0.born) / k0.life;
      // se suelta cuando la masa lo alcanza o cuando termina su vida
      if (age >= 1 || dir * (k0.anchor - head) < 20) { tendrils.splice(i, 1); continue; }
      const ext = smooth(0, .35, age) * (1 - smooth(.72, 1, age));
      const steps = 14, pts = [];
      for (let j = 0; j <= steps; j++) {
        const k = j / steps, L = head + (k0.anchor - head) * k * ext, p = frameAt(L);
        const bend = k0.side * (k0.amp * Math.sin(k * Math.PI) + k0.off * k * ext) * s + Math.sin(k * 10 + t * 8 + k0.ph) * 3 * s;
        pts.push([p.x + p.nx * bend, p.y + p.ny * bend, k]);
      }
      // dos pasadas (halo morado y luego carne negra) para que no se vean las uniones entre tramos
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? "#07040D" : "rgba(154,107,255,.4)";
        for (let j = 1; j < pts.length; j++) {
          const [x0, y0] = pts[j - 1], [x, y, k] = pts[j], w = k0.w * s * (1 - k * .75);
          ctx.lineWidth = pass ? Math.max(1.4, w) : Math.max(2, w + 3 * s);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
        }
      }
      const [px, py] = pts[pts.length - 1];
      // punta que se agarra del cable
      if (k0.grab && ext > .85) {
        ctx.fillStyle = "#07040D";
        ctx.beginPath(); ctx.arc(px, py, 7 * s, 0, Math.PI * 2); ctx.fill();
      }
    }

    // cuerpo: halo morado, masa negra
    body();
    ctx.lineJoin = "round";
    ctx.lineWidth = 9 * s; ctx.strokeStyle = "rgba(154,107,255,.45)"; ctx.stroke();
    ctx.fillStyle = "#050208"; ctx.fill();

    // hebras que envuelven el cable
    ctx.lineWidth = Math.max(1, 2.4 * s);
    for (let h = 0; h < 2; h++) {
      ctx.strokeStyle = h ? "rgba(110,75,200,.35)" : "rgba(60,36,110,.6)";
      ctx.beginPath();
      mid.forEach(([p, w, u], i) => {
        if (u < .12) return;
        const o = w * .8 * Math.sin(u * 9 + h * 2.6 + t * 4);
        const x = p.x + p.nx * o, y = p.y + p.ny * o;
        i && u >= .12 + 1 / N ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    // brillo húmedo sobre el lomo
    ctx.strokeStyle = "rgba(225,210,255,.3)";
    ctx.lineWidth = Math.max(1.5, 4 * s);
    ctx.beginPath();
    mid.forEach(([p, w, u], i) => {
      if (u < .45 || u > .92) return;
      const x = p.x + p.nx * w * .5, y = p.y + p.ny * w * .5;
      u <= .45 + 1 / N ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function step(dt) {
    clock += dt * 16.67;
    if (isNaN(sig)) return;
    if (!isNaN(prevSig)) speed += (Math.abs(sig - prevSig) / (dt * 16.67) - speed) * .2;
    prevSig = sig;
    grow = Math.min(1, grow + .03 * dt);               // al empezar, la masa brota del orbe
    if (on) {
      // nuevos tentáculos (más seguido mientras avanza)
      if (clock - lastSpawn > 150 && tendrils.length < 6) { spawnTendril(); lastSpawn = clock; }
      // gotas: una cada tanto del recorrido
      if (Math.abs(sig - lastDrop) > 90) {
        drops.push({ len: sig - dir * BODY * .55, born: clock, r: rnd(6, 11) });
        lastDrop = sig;
      }
    }
    draw();
  }

  function tick(now) {
    const dt = Math.min(3, (now - last) / 16.67 || 1); last = now;
    if (now - driven > 8) step(dt);
    if (on || drops.length || shrink > 0 && at || blob) raf = requestAnimationFrame(tick);
    else { raf = 0; ctx.clearRect(0, 0, W, H); }
  }
  const run = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };

  return {
    // empieza a arrastrarse; at(largo) da el punto del cable en pantalla, sc() la escala de la cámara
    follow(sample, sc, { back = false } = {}) {
      if (reduced) return;
      at = sample; scale = sc; dir = back ? -1 : 1;
      on = true; grow = 0; shrink = 1; clock = 0;
      sig = back ? NaN : 0;                              // en la vuelta, el primer frame la ubica
      tendrils = []; drops = []; lastSpawn = -999; lastDrop = sig; speed = 0; prevSig = NaN;
      run();
    },
    // cuadro dibujado por la cámara: s es el largo recorrido por la señal
    frame(s) {
      if (!on) return;
      if (isNaN(lastDrop)) lastDrop = s;
      sig = s;
      const now = performance.now();
      step(Math.min(3, (now - last) / 16.67 || 1));
      last = now; driven = now;
    },
    // se recoge sobre sí misma y desaparece
    async retract(ms = 450) {
      if (!on) return;
      on = false; tendrils = [];
      await tween(ms, k => { shrink = 1 - k; }, ease.inOut);
      at = null; drops = [];
    },
    // cubre la pantalla: la masa crece desde la cabeza hasta tapar todo
    async cover(ms = 620) {
      if (reduced) return;
      blob = newBlob();
      blob.travel = headPt ? headPt.ny : -1;            // tangente de avance en pantalla (x) = normal.y
      run();
      const far = () => Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - blob.cx, y - blob.cy))) * 1.08;
      await tween(ms, k => { blob.r = far() * k; }, ease.in);
      blob.follow = false;
    },
    // se retrae hacia el lado de donde venía y deja ver la diapositiva
    async uncover(ms = 1000) {
      if (!blob) return;
      const b = blob, r0 = b.r;
      on = false; at = null; tendrils = []; drops = [];
      // de dónde venía: el lado opuesto al sentido en que avanzaba la cabeza en pantalla
      const ex = b.travel < 0 ? W * 1.15 : -W * .15;
      run();
      await tween(ms, k => {
        b.r = r0 * (1 - k) ** 1.15 + 30 * (1 - k);
        b.ox = (ex - b.cx) * ease.inOut(k);
        b.reach = 1 - k * .6;
      }, ease.inOut);
      blob = null;
    },
    stop() { on = false; at = null; blob = null; tendrils = []; drops = []; ctx.clearRect(0, 0, W, H); }
  };
})();

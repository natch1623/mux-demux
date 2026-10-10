"use strict";
/* =====================================================================
   Murciélagos de Marceline (Ana) sobre su propio lienzo de pantalla:
   - follow:  la bandada gira en espiral alrededor del cable, detrás de la señal,
              como el rotacional (las líneas de campo) alrededor de un conductor
   - cover:   al llegar, la bandada se multiplica y oscurece la pantalla (hace de velo)
   - scatter: se dispersan hacia la izquierda y se llevan la oscuridad; detrás queda la diapositiva
   Mientras la cámara viaja, app.js dibuja cada cuadro justo después de mover la cámara
   (frame), así la espiral queda pegada al cable; el resto del tiempo se anima sola.
   ===================================================================== */
const BATS = (() => {
  const cv = $("#bats"), ctx = cv.getContext("2d");
  let W = 0, H = 0, unit = 1;
  let bats = [], mode = "off", sample = null, sig = 0, spin = 0, dark = 0, wipe = 0;
  // órbita alrededor del bloque MUX/DEMUX: ringAt() da [cx, cy, rx, ry] en pantalla; ringW mezcla cable ↔ órbita
  let ringAt = null, ringOn = false, ringW = 0, orbit = 0, orbitT0 = 0, orbitMs = 1, orbitBase = 0;
  let dir = 1, scatterX = -1;                        // dir: -1 en la vuelta (la estela queda del otro lado)
  let raf = 0, last = 0, driven = -1;

  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight; unit = Math.min(W, H) / 720;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener("resize", resize);

  const rnd = (a, b) => a + Math.random() * (b - a);
  function bat(x, y, i = 0, n = 1, big = false) {
    return {
      x, y, vx: 0, vy: 0, z: 0,
      s: (big ? rnd(1.5, 2.8) : rnd(1.3, 2)) * unit,
      ph: rnd(0, 6.28), fs: rnd(.42, .62),               // aleteo
      d: 30 + (i / n) * 640 + rnd(-20, 20),               // distancia detrás de la señal (unidades del mundo)
      th: rnd(0, 6.28), r: rnd(85, 135),                  // ángulo y radio de la espiral
      tx: rnd(0, 1), ty: rnd(0, 1),                       // destino al cubrir la pantalla
      acc: rnd(.55, 1.1), bob: rnd(0, 6.28)               // empuje y vaivén al dispersarse
    };
  }

  /* silueta: cuerpo, orejas y alas festoneadas; u ∈ [-1, 1] es la fase del aleteo */
  function draw(b, rot, sc, alpha) {
    const u = Math.sin(b.ph), t = u * 11, m = u * 5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(b.x, b.y);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.beginPath();
    for (const d of [1, -1]) {
      ctx.moveTo(1.5 * d, -3);
      ctx.quadraticCurveTo(7 * d, -7 + m, 21 * d, -4 + t);
      ctx.quadraticCurveTo(18 * d, 1 + t * .6, 15.5 * d, 2 + t * .5);
      ctx.quadraticCurveTo(12.5 * d, t * .3, 10 * d, 3 + t * .3);
      ctx.quadraticCurveTo(6.5 * d, 1.5 + t * .15, 3.5 * d, 4.5);
      ctx.lineTo(1.5 * d, 3);
      ctx.closePath();
    }
    ctx.ellipse(0, .5, 3, 5.5, 0, 0, Math.PI * 2);
    ctx.moveTo(-2.6, -3.5); ctx.lineTo(-2.2, -8); ctx.lineTo(-.6, -4.6);
    ctx.moveTo(2.6, -3.5); ctx.lineTo(2.2, -8); ctx.lineTo(.6, -4.6);
    ctx.lineWidth = 1 / sc;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function step(dt) {
    ctx.clearRect(0, 0, W, H);
    // oscuridad del velo; al dispersarse se retira hacia la izquierda junto con la bandada
    if (dark > 0) {
      const edge = W * (1 - wipe), fade = 240 * unit;
      const g = ctx.createLinearGradient(edge - fade, 0, edge + fade * .2, 0);
      g.addColorStop(0, `rgba(12,2,6,${dark})`); g.addColorStop(1, "rgba(12,2,6,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, Math.min(W, edge + fade * .2), H);
      const r = ctx.createRadialGradient(W / 2, H * .55, 0, W / 2, H * .55, Math.max(W, H) * .6);
      r.addColorStop(0, `rgba(140,20,40,${.35 * dark * (1 - wipe)})`); r.addColorStop(1, "rgba(140,20,40,0)");
      ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    }
    spin += .085 * dt;
    // una vuelta completa durante la parada en el bloque (arranca y frena suave)
    orbit = orbitBase + 2 * Math.PI * sineInOut(clamp((performance.now() - orbitT0) / orbitMs, 0, 1));
    ringW += ((ringOn ? 1 : 0) - ringW) * Math.min(1, .08 * dt);
    for (let i = bats.length - 1; i >= 0; i--) {
      const b = bats[i], px = b.x, py = b.y;
      if (mode === "follow" && sample) {
        // punto del cable detrás de la señal y su dirección
        const L = sig - dir * b.d, [cx, cy] = sample(L), [qx, qy] = sample(L - 8);
        let tx = cx - qx, ty = cy - qy, n = Math.hypot(tx, ty);
        if (n < .5) { tx = -1; ty = 0; n = 1; }
        tx /= n; ty /= n;
        // giro alrededor del cable: la normal da el desplazamiento en pantalla, el seno la profundidad
        const th = b.th + spin - b.d * .011, c = Math.cos(th);
        b.z = Math.sin(th);
        const R = b.r * unit;
        let gx = cx - ty * R * c, gy = cy + tx * R * c;
        b.tan = Math.atan2(ty, tx);
        // dentro del bloque se abren y lo rodean entero (elipse; abajo = adelante)
        if (ringW > .001 && ringAt) {
          const [rx0, ry0, rx, ry] = ringAt(), f = b.ra + orbit;
          gx += (rx0 + Math.cos(f) * rx - gx) * ringW;
          gy += (ry0 + Math.sin(f) * ry - gy) * ringW;
          b.z += (Math.sin(f) - b.z) * ringW;
          b.ringTan = Math.atan2(Math.cos(f) * ry, -Math.sin(f) * rx);
        }
        const k = Math.min(1, .3 * dt);
        b.x += (gx - b.x) * k; b.y += (gy - b.y) * k;
      } else if (mode === "cover") {
        b.vx += ((b.tx * W - b.x) * .07 - b.vx * .16) * dt;
        b.vy += ((b.ty * H - b.y) * .07 - b.vy * .16) * dt;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.z += (0 - b.z) * .1 * dt;
      } else if (mode === "scatter") {
        b.vx += scatterX * b.acc * unit * dt;
        b.vy += (Math.sin(b.bob += .08 * dt) * .25 - .05) * unit * dt;
        b.vx *= .985; b.vy *= .96;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < -80 * b.s || b.x > W + 80 * b.s) { bats.splice(i, 1); continue; }
      }
      if (mode === "follow") { b.vx = b.x - px; b.vy = b.y - py; }
      b.ph += b.fs * (mode === "scatter" ? 1.5 : 1) * dt;
    }
    // los de atrás del cable primero (más chicos y tenues), los de adelante encima
    bats.sort((a, b) => a.z - b.z);
    ctx.fillStyle = "#3A0914";
    ctx.strokeStyle = "rgba(255,105,125,.4)";
    for (const b of bats) {
      // en la espiral se inclinan con el cable; sueltos, con su velocidad
      let rot = clamp(b.vx * .025 / unit, -.45, .45);
      if (mode === "follow" && b.tan != null) {
        let a = b.tan;
        if (a > Math.PI / 2) a -= Math.PI; else if (a < -Math.PI / 2) a += Math.PI;
        rot = a * .8 + Math.cos(b.th + spin) * .25;
        if (ringW > .001 && b.ringTan != null) {
          let r = b.ringTan;
          if (r > Math.PI / 2) r -= Math.PI; else if (r < -Math.PI / 2) r += Math.PI;
          rot += (r * .6 - rot) * ringW;
        }
      }
      draw(b, rot, b.s * (1 + .3 * b.z), (.45 + .55 * (b.z + 1) / 2) * (mode === "follow" ? b.fade ?? 1 : 1));
    }
  }

  function tick(now) {
    const dt = Math.min(3, (now - last) / 16.67 || 1); last = now;
    // si app.js ya dibujó este cuadro tras mover la cámara, no se repite
    if (now - driven > 8) step(dt);
    if (bats.length || dark > 0) raf = requestAnimationFrame(tick);
    else { raf = 0; mode = "off"; sample = null; ctx.clearRect(0, 0, W, H); }
  }
  const run = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const ramp = (ms, fn) => tween(ms, fn, ease.inOut);

  return {
    // empieza la espiral; at(largo) da el punto del cable en pantalla para un largo del recorrido
    follow(at, { back = false } = {}) {
      if (reduced) return;
      dir = back ? -1 : 1;
      sample = at; sig = 0; mode = "follow"; dark = 0; wipe = 0;
      // en la ida salen de la señal; en la vuelta entran volando desde la izquierda
      const [x0, y0] = at(0), x = back ? -60 * unit : x0, y = back ? H / 2 : y0;
      // el giro a lo largo del cable se compensa (+ d · 0,011) para que los ángulos queden repartidos
      const head = [0, 1, 2, 3].map(i => Object.assign(bat(x, y), {
        d: 12, th: i * Math.PI / 2 + 12 * .011, r: 110                      // 4 alrededor de la señal, a 90°
      }));
      const tail = [0, 1, 2, 3].map(i => {
        const d = 150 + i * 85, k = 1 - (i + 1) * .13;                    // estela: cada uno más atrás,
        const b = bat(x, y);                                               // más chico y más pegado al cable
        return Object.assign(b, { d, th: (i + .5) * Math.PI / 2 + d * .011, r: 95 - i * 16, s: b.s * k, fade: k });
      });
      bats = [...head, ...tail];
      bats.forEach((b, i) => { b.ra = i * Math.PI / 4; });   // repartidos en la órbita del bloque
      ringAt = null; ringOn = false; ringW = 0;
      run();
    },
    // cuadro dibujado por la cámara: s es el largo recorrido por la señal
    frame(s) {
      if (mode === "off") return;
      sig = s;
      const now = performance.now();
      step(Math.min(3, (now - last) / 16.67 || 1));
      last = now; driven = now;
    },
    // la señal entra al bloque (at = geometría de la órbita) o sale de él (null)
    ring(at, ms = 1200) {
      if (at) { ringAt = at; orbitBase = orbit; orbitT0 = performance.now(); orbitMs = Math.max(1, ms); }
      ringOn = !!at;
    },
    // cubre la pantalla: llegan más murciélagos y la oscuridad crece
    async cover() {
      if (reduced) return;
      mode = "cover";
      const [hx, hy] = sample ? sample(sig) : [W / 2, H / 2];
      for (let i = 0; i < 140; i++) {
        const fromEdge = i % 2;
        bats.push(bat(fromEdge ? W + rnd(20, 160) * unit : hx + rnd(-60, 60) * unit, fromEdge ? rnd(0, H) : hy + rnd(-40, 40) * unit, 0, 1, true));
      }
      run();
      await ramp(520, t => { dark = t; });
    },
    // se van volando a la izquierda y la oscuridad se retira con ellos
    async scatter(toX = -1) {
      if (reduced) { bats = []; dark = 0; return; }
      mode = "scatter"; scatterX = toX;
      bats.forEach(b => { b.vx = rnd(-3, 1) * unit; b.vy = rnd(-2, 2) * unit; });
      run();
      await ramp(900, t => { wipe = t; });
      dark = 0;
    },
    stop() { bats = []; dark = 0; mode = "off"; sample = null; }
  };
})();

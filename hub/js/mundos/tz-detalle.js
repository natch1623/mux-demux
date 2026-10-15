"use strict";
/* =====================================================================
   Tsaritsa · detalle de las transiciones: piezas dibujadas una sola vez en
   lienzos pequeños (sprites) y un motor de partículas que las coloca.
   - copo: cristal de nieve dendrítico (seis brazos con ramas, placa central)
   - niebla: nube suave de varios lóbulos
   - brillo: destello de cuatro puntas con halo
   - esquirla: fragmento tallado (caras claras y oscuras, arista de luz)
   - cristales: racimo de agujas de hielo prismáticas que brotan de una base
   - talisman: tira de papel ritual con borde dorado, trazos y sello rojo
   - runa: trazos de un glifo (para anillos y sellos SVG)
   Nada oficial: todo procedural.
   ===================================================================== */
const TZD = (() => {
  const { rng } = MAT;
  const cache = {};
  function sprite(clave, w, h, dibujar) {
    if (cache[clave]) return cache[clave];
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    dibujar(c.getContext("2d"), w, h);
    return (cache[clave] = c);
  }

  // cristal de nieve dendrítico
  const copo = v => sprite("copo" + v, 128, 128, (x, S) => {
    const r = rng(101 + v * 7), c = S / 2, R = S * .42;
    x.translate(c, c); x.lineCap = "round"; x.lineJoin = "round";
    x.shadowColor = "rgba(150,210,255,.95)"; x.shadowBlur = 5;
    x.strokeStyle = "#F6FCFF";
    const ramas = [{ p: .3 + r() * .1, l: .2 + r() * .14 }, { p: .55 + r() * .1, l: .15 + r() * .12 }, { p: .78 + r() * .06, l: .08 + r() * .06 }];
    const punta = v % 3;
    for (let i = 0; i < 6; i++) {
      x.save(); x.rotate(i * Math.PI / 3);
      x.lineWidth = S * .03; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -R); x.stroke();
      x.lineWidth = S * .019;
      for (const b of ramas) {
        const y = -R * b.p, l = R * b.l;
        x.beginPath(); x.moveTo(0, y); x.lineTo(-l * .78, y - l * .72); x.moveTo(0, y); x.lineTo(l * .78, y - l * .72); x.stroke();
        if (b.l > .2) { x.lineWidth = S * .012; x.beginPath(); x.moveTo(-l * .4, y - l * .37); x.lineTo(-l * .4 - l * .25, y - l * .37 + l * .05); x.moveTo(l * .4, y - l * .37); x.lineTo(l * .4 + l * .25, y - l * .37 + l * .05); x.stroke(); x.lineWidth = S * .019; }
      }
      if (punta === 1) { x.beginPath(); x.moveTo(0, -R * 1.02); x.lineTo(S * .03, -R * .92); x.lineTo(0, -R * .84); x.lineTo(-S * .03, -R * .92); x.closePath(); x.fillStyle = "#F6FCFF"; x.fill(); }
      if (punta === 2) { x.beginPath(); x.arc(0, -R * .92, S * .022, 0, 6.283); x.fillStyle = "#F6FCFF"; x.fill(); }
      x.restore();
    }
    x.shadowBlur = 0;
    x.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; x[i ? "lineTo" : "moveTo"](Math.cos(a) * R * .17, Math.sin(a) * R * .17); } x.closePath();
    x.fillStyle = "rgba(214,238,255,.55)"; x.fill(); x.lineWidth = S * .014; x.stroke();
  });

  // nube de niebla (lóbulos superpuestos)
  const niebla = v => sprite("niebla" + v, 256, 256, (x, S) => {
    const r = rng(211 + v * 13);
    for (let i = 0; i < 9; i++) {
      const cx = S * (.3 + r() * .4), cy = S * (.32 + r() * .36), R = Math.min(S * (.16 + r() * .2), cx, S - cx, cy, S - cy) * .98;   // nunca toca el borde: sin cantos rectos
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, "rgba(232,245,255,.32)"); g.addColorStop(.6, "rgba(214,236,252,.14)"); g.addColorStop(1, "rgba(214,236,252,0)");
      x.fillStyle = g; x.fillRect(0, 0, S, S);
    }
  });

  // destello de cuatro puntas
  const brillo = () => sprite("brillo", 64, 64, (x, S) => {
    const c = S / 2, g = x.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(.18, "rgba(200,232,255,.55)"); g.addColorStop(1, "rgba(160,210,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = "rgba(255,255,255,.95)"; x.lineCap = "round";
    x.lineWidth = 1.6; x.beginPath(); x.moveTo(2, c); x.lineTo(S - 2, c); x.stroke();
    x.lineWidth = 1.2; x.beginPath(); x.moveTo(c, 8); x.lineTo(c, S - 8); x.stroke();
  });

  // fragmento tallado
  const esquirla = v => sprite("esq" + v, 128, 128, (x, S) => {
    const r = rng(307 + v * 11), c = S / 2, n = 5 + (v % 3), ang = r() * Math.PI;
    const p = Array.from({ length: n }, (_, i) => { const a = i / n * 6.283 + (r() - .5) * .5, rr = S * (.18 + r() * .26) * (Math.abs(Math.cos(a - ang)) * .9 + .35); return [c + Math.cos(a) * rr, c + Math.sin(a) * rr]; });
    const g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, "rgba(240,250,255,.92)"); g.addColorStop(.45, "rgba(150,205,238,.7)"); g.addColorStop(1, "rgba(40,100,160,.8)");
    x.beginPath(); p.forEach(([a, b], i) => x[i ? "lineTo" : "moveTo"](a, b)); x.closePath(); x.fillStyle = g; x.fill();
    // caras: triángulos desde un punto interior, alternando luz y sombra
    const q = [c + (r() - .5) * S * .1, c + (r() - .5) * S * .1];
    p.forEach((a, i) => { const b = p[(i + 1) % n]; x.beginPath(); x.moveTo(...q); x.lineTo(...a); x.lineTo(...b); x.closePath(); x.fillStyle = i % 2 ? "rgba(255,255,255,.16)" : "rgba(10,40,80,.18)"; x.fill(); });
    x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 1; p.forEach(a => { x.beginPath(); x.moveTo(...q); x.lineTo(...a); x.stroke(); });
    x.beginPath(); p.forEach(([a, b], i) => x[i ? "lineTo" : "moveTo"](a, b)); x.closePath();
    x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 1.6; x.stroke();
    x.strokeStyle = "#FFFFFF"; x.lineWidth = 2.6; x.beginPath(); x.moveTo(...p[0]); x.lineTo(...p[1]); x.stroke();
  });

  // racimo de agujas de hielo (base abajo al centro)
  const cristales = v => sprite("crist" + v, 256, 256, (x, S) => {
    const r = rng(401 + v * 17), bx = S / 2, by = S * .94, n = 5 + (v % 3);
    const agujas = Array.from({ length: n }, (_, i) => ({ a: (i / (n - 1) - .5) * 1.3 + (r() - .5) * .25, l: S * (.42 + r() * .42), w: S * (.05 + r() * .05), z: r() }))
      .sort((a, b) => a.z - b.z);
    for (const g of agujas) {
      x.save(); x.translate(bx + Math.sin(g.a) * S * .04, by); x.rotate(g.a);
      const L = g.l * (.75 + g.z * .25), w = g.w, sh = L * .8, osc = .55 + g.z * .45;
      // cara izquierda (luz) y derecha (sombra)
      const gl = x.createLinearGradient(0, 0, 0, -L); gl.addColorStop(0, `rgba(120,180,225,${.75 * osc})`); gl.addColorStop(1, `rgba(244,251,255,${.95 * osc})`);
      x.beginPath(); x.moveTo(0, 0); x.lineTo(-w, -w * .4); x.lineTo(-w, -sh); x.lineTo(0, -L); x.closePath(); x.fillStyle = gl; x.fill();
      const gd = x.createLinearGradient(0, 0, 0, -L); gd.addColorStop(0, `rgba(20,60,110,${.85 * osc})`); gd.addColorStop(1, `rgba(120,185,230,${.85 * osc})`);
      x.beginPath(); x.moveTo(0, 0); x.lineTo(w, -w * .4); x.lineTo(w, -sh); x.lineTo(0, -L); x.closePath(); x.fillStyle = gd; x.fill();
      x.strokeStyle = `rgba(255,255,255,${.9 * osc})`; x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(-w, -w * .4); x.lineTo(-w, -sh); x.lineTo(0, -L); x.lineTo(w, -sh); x.lineTo(w, -w * .4); x.stroke();
      x.strokeStyle = `rgba(255,255,255,${.7 * osc})`; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -w * .2); x.lineTo(0, -L * .98); x.stroke();
      // grieta interior
      x.strokeStyle = "rgba(255,255,255,.3)"; x.beginPath(); x.moveTo(-w * .4, -L * .3); x.lineTo(w * .2, -L * .42); x.lineTo(-w * .1, -L * .55); x.stroke();
      x.restore();
    }
    // escarcha en la base
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(240,250,255,${.3 + r() * .5})`; const s = 1 + r() * 2.5; x.fillRect(bx + (r() - .5) * S * .5, by - r() * S * .1, s, s); }
  });

  // tira de papel ritual
  const talisman = v => sprite("tal" + v, 64, 176, (x, w, h) => {
    const r = rng(503 + v * 19);
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#F5F8FA"); g.addColorStop(1, "#D9E5EC");
    x.fillStyle = g; x.fillRect(6, 4, w - 12, h - 8);
    x.strokeStyle = "#C9A24A"; x.lineWidth = 2; x.strokeRect(10, 8, w - 20, h - 16);
    x.strokeStyle = "#7DB6DC"; x.lineWidth = 1; x.strokeRect(13, 11, w - 26, h - 22);
    // trazos del glifo: eje vertical con travesaños y ganchos
    x.strokeStyle = "#2D5F8C"; x.lineCap = "round"; x.lineWidth = 2.4;
    x.beginPath(); x.moveTo(w / 2, 26); x.lineTo(w / 2, h - 44); x.stroke();
    for (let i = 0; i < 6; i++) { const y = 32 + i * 18 + r() * 6, l = 6 + r() * 10; x.beginPath(); x.moveTo(w / 2 - l, y); x.lineTo(w / 2 + l, y + (r() - .5) * 4); x.stroke(); if (r() < .5) { x.beginPath(); x.moveTo(w / 2 + l, y); x.lineTo(w / 2 + l - 3, y + 6); x.stroke(); } }
    x.fillStyle = "#B23A48"; x.beginPath(); x.arc(w / 2, h - 30, 8, 0, 6.283); x.fill();
    x.strokeStyle = "#F5F8FA"; x.lineWidth = 1.4; x.beginPath(); x.moveTo(w / 2 - 4, h - 30); x.lineTo(w / 2 + 4, h - 30); x.moveTo(w / 2, h - 34); x.lineTo(w / 2, h - 26); x.stroke();
  });

  // glifo procedural (path SVG en una caja de 10×14 centrada en 0,0)
  function runa(r) {
    let d = `M0 -7V7`;
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) { const y = -6 + r() * 12, l = 2 + r() * 4, lado = r() < .5 ? -1 : 1; d += `M0 ${y.toFixed(1)}L${(lado * l).toFixed(1)} ${(y + (r() - .5) * 5).toFixed(1)}`; }
    if (r() < .5) d += `M-4 -7L4 -7`;
    if (r() < .4) d += `M-3 5L0 7L3 5`;
    return d;
  }

  /* motor de partículas sobre un lienzo 2D (unidades de t de la transición)
     p: { img, x, y, w, t0, vida, vx, vy, g, s0, s1, es, rot, vr, a, ent, sal, ay } */
  function motor(cv, x) {
    const d = cv.width / innerWidth, ps = [];
    return {
      ps,
      add(p) { ps.push(Object.assign({ vx: 0, vy: 0, g: 0, s0: 1, s1: 1, rot: 0, vr: 0, a: 1, vida: .3, ent: .12, sal: .4, ay: .5 }, p)); },
      draw(t) {
        for (const p of ps) {
          const u = t - p.t0; if (u < 0 || u > p.vida) continue;
          const k = u / p.vida, px = p.x + p.vx * u, py = p.y + p.vy * u + .5 * p.g * u * u;
          const ek = p.es ? p.es(k) : k, sc = (p.s0 + (p.s1 - p.s0) * ek) * p.w / p.img.width;
          const al = p.a * (p.ent ? Math.min(1, k / p.ent) : 1) * (1 - tramo(k, 1 - p.sal, 1));
          if (!(al > .005) || !(sc > 0)) continue;
          const ro = p.rot + p.vr * u, c = Math.cos(ro) * sc * d, s = Math.sin(ro) * sc * d;
          x.globalAlpha = al; x.setTransform(c, s, -s, c, px * d, py * d);
          x.drawImage(p.img, -p.img.width / 2, -p.img.height * p.ay);
        }
        x.setTransform(d, 0, 0, d, 0, 0); x.globalAlpha = 1;
      },
      // dibuja un sprite suelto (sin registrarlo)
      uno(img, px, py, w, { rot = 0, a = 1, ay = .5 } = {}) {
        const sc = w / img.width, c = Math.cos(rot) * sc * d, s = Math.sin(rot) * sc * d;
        x.globalAlpha = a; x.setTransform(c, s, -s, c, px * d, py * d); x.drawImage(img, -img.width / 2, -img.height * ay);
        x.setTransform(d, 0, 0, d, 0, 0); x.globalAlpha = 1;
      }
    };
  }
  const { tramo } = MAT;
  // precálculo en un momento libre (sin tirón en la primera transición)
  const libre = window.requestIdleCallback || (f => setTimeout(f, 1500));
  addEventListener("load", () => libre(() => { for (let v = 0; v < 4; v++) { copo(v); niebla(v); esquirla(v); cristales(v); talisman(v); } brillo(); }));
  return { copo, niebla, brillo, esquirla, cristales, talisman, runa, motor };
})();

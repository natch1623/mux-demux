"use strict";
/* =====================================================================
   Marceline · escena (S₁S₀ = 00). Especificación §1; contrato: docs/MUNDOS-CONTRATO.md §8.
   Sala de ensayo nocturna hecha a mano: nada es perfectamente recto.

   - montar: fondo en tres capas dentro de .st-bg (cueva lejana, ventana con luna,
     garabatos cercanos), papel arrugado, ruido de fondo, ojo de murciélago,
     murciélago posado sobre la letra inicial del título y capa de gotas.
     Todo es SVG propio con temblor de mano sembrado: el mismo dibujo en cada
     visita a una estación y uno distinto en cada estación.
   - iniciar / detener: parallax suave con el ratón y deriva lenta (en pantalla
     táctil, solo la deriva), ojo cada 20 s, gota de «sangre» al tocar fuera de
     las zonas activas y cursor de plectro. detener() lo deja todo como estaba.
   - mostrar: la estación pasa a ser la actual (el murciélago se vuelve a posar).
   Nunca toca bits: solo representación.
   ===================================================================== */
(() => {
  const raiz = document.documentElement;
  const mundo = () => $("#world");

  /* ---------- medidas (unidades de la estación, 1920 × 1080) ---------- */
  // .mc-fondo cubre la estación y sobresale 130 arriba y abajo (franjas a 4:3); recorta sus capas.
  // Cada capa sobresale un poco más para que el parallax nunca muestre su borde.
  const FONDO = { x: 0, y: -130, w: 1920, h: 1340 };
  const CAPA = { x: -90, y: -190, w: 2100, h: 1460 };
  const VB = `${CAPA.x} ${CAPA.y} ${CAPA.w} ${CAPA.h}`;
  // parte del movimiento de cada capa (§1.4b) · recorrido del puntero y de la deriva
  const CAPAS = [["lejana", .08], ["media", .14], ["cercana", .22]];
  const MOV = 150, DERIVA = 80;
  // zonas de la retícula que el fondo deja quietas y oscuras
  const ZONAS = [[77, 173, 1381, 778], [77, 778, 1381, 888], [1421, 173, 1843, 888]];
  /* borde derecho de la ventana con la luna: a 1280 × 720 las herramientas fijas empiezan en
     x ≈ 1446 (y ≤ 93) y el chip del mundo en x ≈ 1634; la ventana queda a la izquierda de ambos */
  const VENTANA_FIN = 1440;
  // zonas activas: ahí no cae la gota (contrato §8)
  const ACTIVAS = "button,[role=button],[role=radio],.tg,.seg,a,input,select,textarea,label,tr[data-row],.secret,.mc-activa";

  /* ---------- azar sembrado: el mismo trazo en cada visita ---------- */
  const hash = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  function azar(semilla) {
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const entre = (R, a, b) => a + (b - a) * R();

  /* ---------- trazos de mano ---------- */
  const F = n => Math.round(n * 10) / 10;
  const P = (x, y) => `${F(x)} ${F(y)}`;
  // curva suave que pasa por los puntos (Catmull-Rom → Bézier), abierta o cerrada
  function curva(p, cerrada) {
    const n = p.length;
    if (n < 2) return "";
    const at = i => cerrada ? p[(i + n) % n] : p[clamp(i, 0, n - 1)];
    let d = `M${P(...p[0])}`;
    for (let i = 0; i < (cerrada ? n : n - 1); i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${P(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)} ${P(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)} ${P(...p2)}`;
    }
    return d + (cerrada ? "Z" : "");
  }
  /* temblor de mano: remuestrea la polilínea cada `paso` unidades y desplaza cada punto
     en perpendicular con una onda lenta, otra rápida y un poco de azar */
  function mano(R, pts, { paso = 24, amp = 2.4, cerrada = false } = {}) {
    const out = [], n = pts.length, f1 = R() * 6.3, f2 = R() * 6.3, k1 = .3 + R() * .3;
    let s = 0;
    for (let i = 0; i < (cerrada ? n : n - 1); i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
      const L = Math.hypot(x1 - x0, y1 - y0) || 1, m = Math.max(1, Math.round(L / paso));
      const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
      for (let j = 0; j < m; j++, s++) {
        const t = j / m, w = amp * (Math.sin(s * k1 + f1) * .6 + Math.sin(s * 1.7 + f2) * .25 + (R() - .5) * .5);
        out.push([x0 + (x1 - x0) * t + nx * w, y0 + (y1 - y0) * t + ny * w]);
      }
    }
    if (!cerrada) { const [x, y] = pts[n - 1]; out.push([x + (R() - .5) * amp, y + (R() - .5) * amp]); }
    return curva(out, cerrada);
  }
  /* segmentos casi rectos con una leve comba: las esquinas quedan vivas (estrellas, marcos).
     Cerrada, el último punto no coincide del todo con el primero: el trazo no cierra perfecto */
  function quebrada(R, pts, { amp = 3, cerrada = false } = {}) {
    const n = pts.length, J = () => (R() - .5) * amp * .7;
    let [px, py] = pts[0];
    px += J(); py += J();
    let d = `M${P(px, py)}`;
    for (let i = 1; i <= (cerrada ? n : n - 1); i++) {
      let [x, y] = pts[i % n];
      x += J(); y += J();
      const L = Math.hypot(x - px, y - py) || 1, b = (R() - .5) * 2 * amp * Math.min(1, L / 60);
      d += `Q${P((px + x) / 2 - (y - py) / L * b, (py + y) / 2 + (x - px) / L * b)} ${P(x, y)}`;
      px = x; py = y;
    }
    return d;
  }
  // puntos de un óvalo (para pasarlos por la mano)
  const ovalo = (cx, cy, rx, ry, n = 14, giro = 0) => Array.from({ length: n }, (_, i) => {
    const a = i / n * Math.PI * 2, c = Math.cos(giro), s = Math.sin(giro), x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    return [cx + x * c - y * s, cy + x * s + y * c];
  });
  // un trazo de crayón: dos pasadas con distinto temblor (la segunda, más fina y tenue)
  const doble = (R, pts, cls, o = {}) =>
    `<path class="${cls}" d="${mano(R, pts, o)}"/><path class="${cls} mc-repaso" d="${mano(R, pts, { ...o, amp: (o.amp ?? 2.4) * 1.4 })}"/>`;
  const dentro = (x, y, [x0, y0, x1, y1], m = 0) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;

  /* =====================================================================
     Capa lejana: la cueva (techo con estalactitas, paredes y suelo), trazo grueso.
     Las formas se superponen: primero todos los contornos y después todos los
     rellenos, así solo queda a la vista el borde exterior de la unión.
     ===================================================================== */
  // colmillo de roca: estalactita (dir 1, cuelga) o estalagmita (dir −1, sube) desde y0
  function colmillo(R, x, y0, w, h, dir) {
    const sk = entre(R, -.2, .2) * w, Y = k => y0 + dir * h * k;
    return [[x - w / 2, y0 - dir * 30], [x - w / 2, Y(0)], [x - w * .36 + sk * .2, Y(.3)], [x - w * .17 + sk * .6, Y(.68)], [x + sk, Y(1)],
      [x + w * .08 + sk * .7, Y(.72)], [x + w * .3 + sk * .3, Y(.3)], [x + w / 2, Y(0)], [x + w / 2, y0 - dir * 30]];
  }
  function cueva(R, fin, ven) {
    const f = R() * 6.3, techo = x => 20 + Math.sin(x * .0049 + f) * 6, suelo = x => 1044 + Math.sin(x * .0041 + f * 1.7) * 6;
    // techo y suelo: dos franjas de roca de borde irregular (los lados quedan abiertos, en penumbra)
    const techoP = [[-160, -280], [2080, -280]], sueloP = [[2080, 1380], [-160, 1380]];
    for (let x = 2080; x >= -160; x -= 70) techoP.push([x, techo(x)]);
    for (let x = -160; x <= 2080; x += 70) sueloP.push([x, suelo(x)]);
    // estalactitas: largas en los márgenes (cuelgan de las masas de las esquinas), cortas sobre el rótulo
    // y el título, medianas en los huecos libres
    const est = [[entre(R, 30, 38), entre(R, 40, 50), entre(R, 150, 210), entre(R, 120, 150)], [entre(R, 1882, 1890), entre(R, 40, 50), entre(R, 150, 220), entre(R, 150, 180)]];
    for (let x = 250 + R() * 80; x < Math.min(fin, 860); x += entre(R, 170, 260)) est.push([x, entre(R, 40, 70), entre(R, 10, 18)]);
    for (let x = Math.max(fin, 880) + 70; x < ven.x0 - 70; x += entre(R, 130, 200)) est.push([x, entre(R, 56, 90), entre(R, 60, 120)]);
    for (let x = ven.x1 + 70; x < 1640; x += entre(R, 100, 150)) est.push([x, entre(R, 40, 60), entre(R, 26, 52)]);
    // estalagmitas en la franja inferior, fuera de la barra de fases
    const mit = [[entre(R, 130, 190), entre(R, 80, 110), entre(R, 100, 140)], [entre(R, 320, 400), entre(R, 46, 64), entre(R, 36, 64)],
      [entre(R, 1470, 1540), entre(R, 50, 74), entre(R, 46, 84)], [entre(R, 1720, 1790), entre(R, 80, 110), entre(R, 100, 140)]];
    // masas de roca en las cuatro esquinas y una panza en cada lado (en los márgenes)
    const masas = [ovalo(-40, 10, entre(R, 112, 124), entre(R, 140, 170), 16, R() * .2), ovalo(1966, 0, entre(R, 150, 170), entre(R, 160, 190), 16, R() * .2),
      ovalo(-40, 1092, entre(R, 190, 220), entre(R, 150, 180), 16, R() * .2), ovalo(1966, 1092, entre(R, 200, 230), entre(R, 150, 180), 16, R() * .2),
      ovalo(-34, entre(R, 480, 620), entre(R, 64, 74), entre(R, 100, 150), 14), ovalo(1956, entre(R, 600, 760), entre(R, 64, 74), entre(R, 100, 150), 14)];
    const formas = [
      { p: techoP, o: { paso: 18, amp: 2.6, cerrada: true } }, { p: sueloP, o: { paso: 18, amp: 2.6, cerrada: true } },
      ...masas.map(p => ({ p, o: { paso: 22, amp: 3, cerrada: true } })),
      ...est.map(([x, w, h, y]) => ({ p: colmillo(R, x, y ?? techo(x), w, h, 1), o: { paso: 10, amp: 1.6, cerrada: true } })),
      ...mit.map(([x, w, h]) => ({ p: colmillo(R, x, suelo(x), w, h, -1), o: { paso: 10, amp: 1.6, cerrada: true } }))
    ].map(o => ({ ...o, d: mano(R, o.p, o.o), d2: mano(R, o.p, { ...o.o, amp: o.o.amp * 2 }) }));
    // el fondo de la cueva: siluetas lejanas, apenas más claras que la noche
    let s = `<g class="mc-roca-lejos">`;
    for (let x = entre(R, 100, 200); x < 1800; x += entre(R, 170, 280)) s += `<path d="${mano(R, colmillo(R, x, -20, entre(R, 80, 170), entre(R, 140, 330), 1), { paso: 16, amp: 2, cerrada: true })}"/>`;
    for (let x = entre(R, 60, 160); x < 1860; x += entre(R, 200, 320)) s += `<path d="${mano(R, colmillo(R, x, 1100, entre(R, 90, 190), entre(R, 140, 240), -1), { paso: 16, amp: 2, cerrada: true })}"/>`;
    s += `</g>`;
    // contornos (debajo), rellenos (encima)
    s += `<g class="mc-roca-repaso">${formas.map(o => `<path d="${o.d2}"/>`).join("")}</g>`;
    s += `<g class="mc-roca-borde">${formas.map(o => `<path d="${o.d}"/>`).join("")}</g>`;
    s += `<g class="mc-roca">${formas.map(o => `<path d="${o.d}"/>`).join("")}</g>`;
    // vetas de crayón oscuro sobre la piedra
    let v = "";
    for (const [x, w, h, y] of est) if (h > 40) {
      const y0 = y ?? techo(x);
      v += `<path d="${mano(R, [[x - w * .2, y0 - 6], [x - w * .1, y0 + h * .5]], { paso: 24, amp: 1.2 })}"/><path d="${mano(R, [[x + w * .12, y0 + 4], [x + w * .05, y0 + h * .3]], { paso: 24, amp: 1.2 })}"/>`;
    }
    for (const [x, w, h] of mit) {
      const y0 = suelo(x);
      v += `<path d="${mano(R, [[x - w * .18, y0 + 6], [x - w * .08, y0 - h * .5]], { paso: 24, amp: 1.2 })}"/>`;
    }
    for (let y = 0; y < 1080; y += entre(R, 50, 90)) {
      if (y < 130 || y > 950) {
        v += `<path d="${mano(R, [[-60, y], [entre(R, 10, 40), y + entre(R, -16, 16)]], { paso: 20, amp: 1.4 })}"/>`;
        v += `<path d="${mano(R, [[1980, y + 26], [entre(R, 1880, 1900), y + 26 + entre(R, -16, 16)]], { paso: 20, amp: 1.4 })}"/>`;
      }
    }
    for (let x = 50; x < 1880; x += entre(R, 70, 130)) {
      if (!dentro(x, 0, [ven.x0 - 30, -200, ven.x1 + 30, 200])) v += `<path d="${mano(R, [[x, -40], [x + entre(R, 18, 36), entre(R, 0, 8)]], { paso: 20, amp: 1.2 })}"/>`;
      v += `<path d="${mano(R, [[x + 30, 1120], [x + entre(R, 44, 70), suelo(x + 50) + entre(R, 8, 16)]], { paso: 20, amp: 1.2 })}"/>`;
    }
    s += `<g class="mc-veta">${v}</g>`;
    // la luz de la luna roza el filo derecho de cada colmillo
    let luz = "";
    for (const [x, w, h, y] of est) if (h > 40) {
      const y0 = y ?? techo(x);
      luz += `<path d="${mano(R, [[x + w * .34, y0 + h * .08], [x + w * .2, y0 + h * .45], [x + w * .07, y0 + h * .78]], { paso: 12, amp: .9 })}"/>`;
    }
    for (const [x, w, h] of mit) {
      const y0 = suelo(x);
      luz += `<path d="${mano(R, [[x + w * .3, y0 - h * .1], [x + w * .12, y0 - h * .55]], { paso: 12, amp: .9 })}"/>`;
    }
    s += `<g class="mc-filo">${luz}</g>`;
    return s;
  }

  /* =====================================================================
     Capa media: la ventana de la sala, con la luna grande y nubes de borde irregular
     ===================================================================== */
  function ventana(R, ven, uid) {
    const { x0, x1 } = ven, y0 = -170, y1 = 164;           // marco (la parte de arriba sale del cuadro)
    const g = clamp(Math.round((x1 - x0) * .04), 15, 22), ix0 = x0 + g, ix1 = x1 - g, iy1 = y1 - 14;   // hueco con vidrio
    const gw = ix1 - ix0;
    const mx = (x0 + x1) / 2 + entre(R, -14, 14), my = entre(R, 6, 30);
    // la luna cabe entera en la parte visible del vidrio (de y 0 al alféizar), sin tocar los bordes
    const lr = clamp(gw * .34, 42, 62), lx = clamp(ix0 + gw * entre(R, .36, .5), ix0 + lr + 10, ix1 - lr - 10), ly = entre(R, lr + 14, lr + 20);
    const tor = (x, y) => [x + entre(R, -5, 5), y + entre(R, -4, 4)];
    const hueco = [tor(ix0, y0 + 10), tor(ix1, y0 + 10), tor(ix1, iy1), tor(ix0, iy1)];
    const huecoD = quebrada(R, hueco, { amp: 2, cerrada: true }) + "Z";
    let s = `<defs><clipPath id="${uid}-vidrio"><path d="${huecoD}"/></clipPath>
      <linearGradient id="${uid}-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2050"/><stop offset="1" stop-color="#1F1739"/></linearGradient>
      <radialGradient id="${uid}-halo"><stop offset=".55" stop-color="#9D82E8" stop-opacity=".2"/><stop offset="1" stop-color="#9D82E8" stop-opacity="0"/></radialGradient></defs>`;
    s += `<path fill="url(#${uid}-cielo)" d="${huecoD}"/><g clip-path="url(#${uid}-vidrio)">`;
    // estrellitas del cielo
    for (let i = 0; i < 9; i++) {
      const x = entre(R, ix0 + 10, ix1 - 10), y = entre(R, 14, 138);
      if (Math.hypot(x - lx, y - ly) < lr * 1.25) continue;
      const r = entre(R, 3, 7);
      s += `<path class="mc-astro" d="M${P(x, y - r)}Q${P(x, y)} ${P(x + r, y)}Q${P(x, y)} ${P(x, y + r)}Q${P(x, y)} ${P(x - r, y)}Q${P(x, y)} ${P(x, y - r)}Z"/>`;
    }
    // la luna: disco con temblor, luz del lado alto, cráteres y su halo
    s += `<circle cx="${F(lx)}" cy="${F(ly)}" r="${F(lr * 1.65)}" fill="url(#${uid}-halo)"/>`;
    const disco = ovalo(lx, ly, lr, lr * entre(R, .97, 1.02), 22, R());
    s += `<path class="mc-luna" d="${mano(R, disco, { paso: 30, amp: 1.6, cerrada: true })}"/>`;
    s += `<path class="mc-luna-luz" d="${mano(R, ovalo(lx - lr * .12, ly - lr * .12, lr * .78, lr * .74, 18, .4), { paso: 30, amp: 1.4, cerrada: true })}"/>`;
    for (let i = 0; i < 6; i++) {
      const a = R() * 6.3, d = Math.sqrt(R()) * lr * .7, r = entre(R, .07, .16) * lr;
      s += `<path class="mc-crater" d="${mano(R, ovalo(lx + Math.cos(a) * d, ly + Math.sin(a) * d, r, r * entre(R, .7, .9), 10, R()), { paso: 12, amp: .8, cerrada: true })}"/>`;
    }
    s += doble(R, disco, "mc-luna-borde", { paso: 26, amp: 1.8, cerrada: true });
    // nubes: lomo de bultos irregulares y base casi recta
    const nube = (x, y, w, h) => {
      const n = 3 + Math.floor(R() * 3), fz = R() * 3, top = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, env = Math.pow(Math.sin(Math.PI * t), .55), lomo = .6 + .4 * Math.abs(Math.sin(Math.PI * n * t + fz));
        top.push([x + w * t, y - h * env * lomo]);
      }
      const p = [...top, [x + w * .92, y + 5], [x + w * .5, y + entre(R, 6, 11)], [x + w * .08, y + 4]];
      const raya = [[x + w * .2, y - h * .12], [x + w * .5, y - h * .18], [x + w * .74, y - h * .1]];
      return `<path class="mc-nube" d="${mano(R, p, { paso: 14, amp: 1, cerrada: true })}"/><path class="mc-nube-raya" d="${mano(R, raya, { paso: 24, amp: 1.5 })}"/>` +
        `<path class="mc-nube-borde" d="${mano(R, p, { paso: 14, amp: 1.2, cerrada: true })}"/>`;
    };
    s += nube(lx - lr * entre(R, .2, 1.1), ly + lr * entre(R, .55, .8), lr * entre(R, 1.5, 1.9), lr * entre(R, .4, .5));
    s += nube(R() < .5 ? ix0 - 30 : ix1 - lr * 1.1, entre(R, 36, 54), lr * entre(R, .95, 1.25), lr * entre(R, .28, .36));
    // reflejo del vidrio y una grieta dibujada a mano
    const rx = Math.max(ix0 + 10, R() < .5 ? ix0 + 24 : ix1 - 112);
    s += `<g class="mc-reflejo"><path d="${mano(R, [[rx, 120], [rx + 60, 60]], { paso: 20, amp: 1 })}"/><path d="${mano(R, [[rx + 24, 132], [rx + 96, 60]], { paso: 20, amp: 1 })}"/></g>`;
    const gx = R() < .5 ? ix0 + 18 : ix1 - 18, gs = gx < mx ? 1 : -1;
    s += `<path class="mc-grieta" d="${quebrada(R, [[gx, 70], [gx + gs * 26, 88], [gx + gs * 18, 110], [gx + gs * 46, 128]], { amp: 2 })}"/>`;
    s += `</g>`;
    // marco de madera (con el hueco calado), parteluces y repisa
    const ext = [tor(x0, y0), tor(x1, y0), tor(x1 + 2, y1), tor(x0 - 2, y1)];
    s += `<path class="mc-marco" fill-rule="evenodd" d="${quebrada(R, ext, { amp: 3, cerrada: true })}Z${huecoD}"/>`;
    const barra = (a, b, w) => {
      const [ax, ay] = a, [bx, by] = b, L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L * w / 2, ny = (bx - ax) / L * w / 2;
      return `<path class="mc-marco" d="${quebrada(R, [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]], { amp: 1.6, cerrada: true })}Z"/>`;
    };
    // la ventana angosta (títulos largos) no lleva parteluz: la luna queda a la vista
    if (gw >= 300) s += barra([mx + entre(R, -4, 4), y0], [mx + entre(R, -4, 4), iy1], 13);
    s += barra([ix0, my], [ix1, my + entre(R, -6, 6)], 12);
    // vetas de la madera
    let vt = "";
    for (let i = 0; i < 3; i++) vt += `<path d="${mano(R, [[x0 + 8 + i * 5, y0 + 40 + R() * 40], [x0 + 6 + i * 5, y1 - 30 - R() * 50]], { paso: 40, amp: 1.5 })}"/>`;
    for (let i = 0; i < 3; i++) vt += `<path d="${mano(R, [[x1 - 8 - i * 5, y0 + 60 + R() * 40], [x1 - 7 - i * 5, y1 - 20 - R() * 60]], { paso: 40, amp: 1.5 })}"/>`;
    s += `<g class="mc-veta-madera">${vt}</g>`;
    s += doble(R, ext, "mc-marco-borde", { paso: 30, amp: 2, cerrada: true });
    s += `<path class="mc-marco-borde" d="${mano(R, hueco, { paso: 30, amp: 1.6, cerrada: true })}"/>`;
    const rep = [tor(x0 - 26, y1 - 8), tor(x1 + 26, y1 - 8), tor(x1 + 20, y1 + 10), tor(x0 - 20, y1 + 10)];
    s += `<path class="mc-repisa" d="${quebrada(R, rep, { amp: 2, cerrada: true })}Z"/>` + doble(R, rep, "mc-marco-borde", { paso: 30, amp: 1.4, cerrada: true });
    return s;
  }

  /* =====================================================================
     Capa cercana: garabatos sueltos (estrellas, notas, calaveritas) en los márgenes
     ===================================================================== */
  const garabatos = {
    estrella(R, s) {
      const p = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * entre(R, .38, .48) : s; return [Math.cos(a) * r, Math.sin(a) * r]; });
      return { cls: "mc-g-amarillo", d: `<path class="mc-relleno" d="${quebrada(R, p, { amp: 2, cerrada: true })}Z"/><path d="${quebrada(R, p, { amp: 2.4, cerrada: true })}"/>` };
    },
    chispa(R, s) {
      const k = s * .2, p = [[0, -s], [k, -k], [s * .8, 0], [k, k], [0, s], [-k, k], [-s * .8, 0], [-k, -k]];
      return { cls: "mc-g-amarillo", d: `<path class="mc-relleno-lleno" d="${quebrada(R, p, { amp: 1.4, cerrada: true })}Z"/>` };
    },
    nota(R, s) {
      const cab = ovalo(0, 0, s * .34, s * .25, 10, -.4);
      return { cls: "mc-g-morado", d: `<path class="mc-relleno-lleno" d="${mano(R, cab, { paso: 8, amp: .8, cerrada: true })}"/>` +
        `<path d="${mano(R, [[s * .3, -s * .1], [s * .32, -s * 1.15]], { paso: 20, amp: 1 })}"/>` +
        `<path d="${mano(R, [[s * .32, -s * 1.15], [s * .62, -s * .9], [s * .72, -s * .55], [s * .58, -s * .3]], { paso: 10, amp: .8 })}"/>` };
    },
    notas(R, s) {
      const a = ovalo(0, 0, s * .3, s * .22, 10, -.4), b = ovalo(s * .9, -s * .2, s * .3, s * .22, 10, -.4);
      const viga = [[s * .26, -s * 1.08], [s * 1.18, -s * 1.3], [s * 1.18, -s * 1.12], [s * .26, -s * .9]];
      return { cls: "mc-g-crayon", d: `<path class="mc-relleno-lleno" d="${mano(R, a, { paso: 8, amp: .8, cerrada: true })}"/><path class="mc-relleno-lleno" d="${mano(R, b, { paso: 8, amp: .8, cerrada: true })}"/>` +
        `<path d="${mano(R, [[s * .26, -s * .08], [s * .27, -s * 1.02]], { paso: 20, amp: .9 })}"/><path d="${mano(R, [[s * 1.16, -s * .28], [s * 1.18, -s * 1.24]], { paso: 20, amp: .9 })}"/>` +
        `<path class="mc-relleno-lleno" d="${quebrada(R, viga, { amp: 1.2, cerrada: true })}Z"/>` };
    },
    calavera(R, s) {
      const c = [[-s * .26, s * .52], [-s * .3, s * .26], [-s * .48, s * .06], [-s * .52, -s * .24], [-s * .38, -s * .52], [0, -s * .64], [s * .38, -s * .52],
        [s * .52, -s * .24], [s * .48, s * .06], [s * .3, s * .26], [s * .26, s * .52]];
      const ojo = x => mano(R, ovalo(x, -s * .1, s * .15, s * .17, 9), { paso: 8, amp: .7, cerrada: true });
      return { cls: "mc-g-hueso", d: `<path class="mc-hueso" d="${mano(R, c, { paso: 10, amp: 1, cerrada: true })}"/>` +
        `<path class="mc-hueco" d="${ojo(-s * .2)}"/><path class="mc-hueco" d="${ojo(s * .2)}"/>` +
        `<path class="mc-hueco" d="${quebrada(R, [[-s * .07, s * .16], [s * .07, s * .16], [0, s * .05]], { amp: .6, cerrada: true })}Z"/>` +
        `<path class="mc-diente" d="${[-s * .12, 0, s * .12].map(x => `M${P(x, s * .3)}L${P(x + (R() - .5) * 2, s * .48)}`).join("")}"/>` };
    },
    espiral(R, s) {
      const p = Array.from({ length: 30 }, (_, i) => { const t = i / 29, a = t * Math.PI * 4.2, r = s * (.1 + t * .9); return [Math.cos(a) * r, Math.sin(a) * r * .8]; });
      return { cls: "mc-g-crayon", d: `<path d="${mano(R, p, { paso: 6, amp: .9 })}"/>` };
    }
  };
  const TIPOS = [["estrella", 4], ["chispa", 3], ["nota", 3], ["notas", 2], ["calavera", 3], ["espiral", 1]];
  const tipo = R => { let r = R() * TIPOS.reduce((a, t) => a + t[1], 0); for (const [n, p] of TIPOS) if ((r -= p) < 0) return n; return "estrella"; };
  function cercana(R, fin, ven) {
    // huecos libres: márgenes de 77, franja inferior (a los lados de la barra de fases) y,
    // si el título es corto, el resto de la franja del título
    const huecos = [
      ...[250, 390, 530, 670, 820].map(y => [38, y, 22]),
      ...[260, 410, 560, 720, 860].map(y => [1882, y, 22]),
      ...[200, 330, 450, 1470, 1600].map(x => [x, 925, 26])
    ];
    for (let x = Math.max(fin, 560) + 70; x < ven.x0 - 60; x += 150) huecos.push([x, entre(R, 70, 140), 24]);
    const usados = [];
    let s = "", calaveras = 0;
    for (const [hx, hy, t] of huecos) {
      if (R() < .26) continue;
      let n = tipo(R);
      if (n === "calavera" && calaveras++ >= 3) n = "chispa";
      const x = hx + entre(R, -6, 6), y = hy + entre(R, -22, 22);
      if (ZONAS.some(z => dentro(x, y, z, 30)) || usados.some(([ux, uy]) => Math.hypot(ux - x, uy - y) < 80)) continue;
      usados.push([x, y]);
      const tam = t * entre(R, .75, 1.15), g = garabatos[n](R, tam);
      // una calaverita por estación va en rojo vino
      const cls = n === "calavera" && calaveras === 1 ? "mc-g-vino" : g.cls;
      s += `<g class="mc-garabato ${cls}" transform="translate(${F(x)} ${F(y)}) rotate(${F(entre(R, -22, 22))})">${g.d}</g>`;
    }
    return s;
  }

  /* =====================================================================
     Murciélago posado, ojo de la cueva y gota
     ===================================================================== */
  function murcielago(R) {
    const j = (x, y, a = 1.2) => [x + (R() - .5) * a, y + (R() - .5) * a];
    // alas plegadas como una capa: muñecas en punta a los lados de la cabeza y borde festoneado
    const alas = [j(19, 30), j(15, 45), j(15, 60), j(20, 71), j(27, 67), j(32, 77), j(38, 71), j(43, 79), j(48, 71), j(54, 77), j(59, 67), j(66, 71),
      j(71, 60), j(71, 45), j(67, 30), j(60, 38), j(43, 36), j(26, 38)];
    const cabeza = [j(33, 21), j(25, 2, .8), j(38, 13), j(43, 12), j(48, 13), j(61, 2, .8), j(53, 21), j(57, 28), j(55, 35), j(49, 40), j(43, 41), j(37, 40), j(31, 35), j(29, 28)];
    const dedos = mano(R, [j(20, 32), j(24, 52), j(27, 67)], { paso: 8, amp: .5 }) + mano(R, [j(66, 32), j(62, 52), j(59, 67)], { paso: 8, amp: .5 }) +
      mano(R, [j(29, 44), j(33, 62), j(38, 71)], { paso: 8, amp: .5 }) + mano(R, [j(57, 44), j(53, 62), j(48, 71)], { paso: 8, amp: .5 });
    return `<svg viewBox="0 0 86 88" aria-hidden="true"><g class="mc-bat">
      <path class="mc-bat-cuerpo" d="${mano(R, alas, { paso: 6, amp: .5, cerrada: true })}"/>
      <path class="mc-bat-pliegue" d="${dedos}"/>
      <path class="mc-bat-borde" d="${mano(R, alas, { paso: 6, amp: .6, cerrada: true })}"/>
      <path class="mc-bat-garra" d="M19 30L16.5 25.5M67 30L69.5 25.5"/>
      <path class="mc-bat-cuerpo" d="${quebrada(R, cabeza, { amp: .7, cerrada: true })}Z"/>
      <path class="mc-bat-oreja" d="M32 18.5L27.6 7.5L36 14.5ZM54 18.5L58.4 7.5L50 14.5Z"/>
      <path class="mc-bat-borde" d="${quebrada(R, cabeza, { amp: .8, cerrada: true })}"/>
      <ellipse class="mc-bat-mejilla" cx="33.6" cy="32" rx="3.3" ry="1.9"/><ellipse class="mc-bat-mejilla" cx="52.4" cy="32" rx="3.3" ry="1.9"/>
      <g class="mc-bat-ojos"><ellipse class="mc-bat-ojo" cx="37.4" cy="25.6" rx="3.7" ry="4.4"/><ellipse class="mc-bat-ojo" cx="48.6" cy="25.6" rx="3.7" ry="4.4"/>
        <circle class="mc-bat-pupila" cx="38.3" cy="26.5" r="1.7"/><circle class="mc-bat-pupila" cx="49.5" cy="26.5" r="1.7"/>
        <circle class="mc-bat-brillo" cx="36.6" cy="24.2" r=".9"/><circle class="mc-bat-brillo" cx="47.8" cy="24.2" r=".9"/></g>
      <path class="mc-bat-colmillo" d="M40.2 34.6L41.3 38.8L42.4 34.6ZM43.6 34.6L44.7 38.8L45.8 34.6Z"/>
      <path class="mc-bat-boca" d="M39 34.2Q43 36.4 47 34.2"/>
      <path class="mc-bat-pata" d="M37.6 77.5L36.4 85M40.6 78.5L40.4 85.6M45.4 78.5L45.6 85.6M48.4 77.5L49.6 85"/>
    </g></svg>`;
  }
  const OJO = `<svg viewBox="0 0 76 32" aria-hidden="true"><ellipse class="mc-ojo-halo" cx="38" cy="16" rx="36" ry="15"/>
    <g class="mc-ojo-par"><path class="mc-ojo-ojo" d="M8 16Q17 6 28 13Q19 21 8 16Z"/><path class="mc-ojo-ojo" d="M68 16Q59 6 48 13Q57 21 68 16Z"/>
    <g class="mc-ojo-pupilas"><path d="M18.5 10.6Q16.6 14 18.5 17.6Q20.4 14 18.5 10.6Z"/><path d="M57.5 10.6Q55.6 14 57.5 17.6Q59.4 14 57.5 10.6Z"/></g></g></svg>`;
  // esquinas libres para el ojo (lejos de las herramientas y de la navegación)
  const RINCONES = [[42, 24], [44, 872], [1878, 872], [1880, 600]];

  /* cifras del título: Permanent Marker dibuja el «1» como un palo (se lee «l» o «I»); van en
     span.mc-cifra con la letra del cuerpo (el CSS les da peso 700 para que pesen como el
     marcador). Los exponentes ya tienen su propia regla (sup). No cambia el texto ni su lectura */
  function cifras(h) {
    const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentElement.closest(".mc-cifra, .mc-posado, svg, sup, sub") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodos = [];
    for (let n; (n = w.nextNode());) if (/\d/.test(n.data)) nodos.push(n);
    for (const n of nodos) {
      const f = document.createDocumentFragment();
      n.data.split(/(\d+)/).forEach((t, i) => {
        if (!t) return;
        if (i % 2) { const s = document.createElement("span"); s.className = "mc-cifra"; s.textContent = t; f.append(s); }
        else f.append(t);
      });
      n.replaceWith(f);
    }
  }

  /* =====================================================================
     Montaje (una vez por estación)
     ===================================================================== */
  function montar(sec, info) {
    const bg = $(".st-bg", sec);
    if (!bg || $(".mc-fondo", bg)) return;
    const id = info.id || sec.dataset.id, base = hash("marceline:" + id);
    const h2 = $(".z-titulo h2", sec);
    if (h2) cifras(h2);
    // fin del título (Permanent Marker a 84 unidades: ≈ 45 por carácter, con holgura) y,
    // a su lado, la ventana: termina antes de las herramientas fijas y del chip del mundo
    const titulo = h2?.textContent.trim() || "";
    const fin = 77 + Math.max(6, titulo.length) * 45.5;
    const Rv = azar(base ^ 0x5bd1e995), x1 = VENTANA_FIN - entre(Rv, 0, 14);
    const ven = { x0: Math.round(Math.max(fin + 50, x1 - entre(Rv, 560, 600))), x1: Math.round(x1) };
    const uid = "mc-" + id;
    const caja = { x0: ven.x0 - 60, y0: -200, x1: ven.x1 + 60, y1: 200 };
    const fondo = html(`<div class="mc-fondo" aria-hidden="true">
      <div class="mc-capa mc-lejana"><svg viewBox="${VB}" preserveAspectRatio="none">${cueva(azar(base ^ 0x27d4eb2f), fin, ven)}</svg><div class="mc-ojo">${OJO}</div></div>
      <div class="mc-capa mc-media" style="left:${F(caja.x0 - FONDO.x)}px;top:${F(caja.y0 - FONDO.y)}px;width:${caja.x1 - caja.x0}px;height:${caja.y1 - caja.y0}px">
        <svg viewBox="${caja.x0} ${caja.y0} ${caja.x1 - caja.x0} ${caja.y1 - caja.y0}">${ventana(Rv, ven, uid)}</svg></div>
      <div class="mc-capa mc-cercana"><svg viewBox="${VB}" preserveAspectRatio="none">${cercana(azar(base ^ 0x165667b1), fin, ven)}</svg></div>
      <div class="mc-sombra"></div><div class="mc-papel"></div><div class="mc-ruido"></div>
    </div>`);
    // la luna aclara un poco la pared alrededor de la ventana
    const lx = (ven.x0 + ven.x1) / 2 - FONDO.x;
    fondo.style.setProperty("--mc-luz", `${F(lx / FONDO.w * 100)}% ${F((20 - FONDO.y) / FONDO.h * 100)}%`);
    // el ojo se asoma en una esquina distinta en cada estación
    const [ox, oy] = RINCONES[base % RINCONES.length];
    Object.assign($(".mc-ojo", fondo).style, { left: `${F(ox - 38 - CAPA.x)}px`, top: `${F(oy - 16 - CAPA.y)}px` });
    bg.append(fondo);
    // murciélago posado (se ubica en mostrar(), cuando la estación ya tiene caja)
    const t = $(".z-titulo", sec);
    if (t && !$(".mc-posado", t)) t.append(html(`<div class="mc-posado" aria-hidden="true">${murcielago(azar(base ^ 0x85ebca6b))}</div>`));
    // capa de las gotas, por encima del contenido
    if (!$(":scope > .mc-gotas", sec)) sec.append(html('<div class="mc-gotas" aria-hidden="true"></div>'));
  }

  /* =====================================================================
     Murciélago posado sobre la letra inicial del título
     ===================================================================== */
  const lienzo = document.createElement("canvas").getContext("2d");
  function primeraLetra(h) {
    const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      const i = n.data.search(/[\p{L}\p{N}]/u);
      if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); return r; }
    }
    return null;
  }
  function posar(sec) {
    const t = $(".z-titulo", sec), h = t && $("h2", t), bat = t && $(".mc-posado", t);
    if (!bat || !h) return;
    const r = primeraLetra(h), s = sec.getBoundingClientRect().width / FW;
    if (!r || !s) return;
    const a = r.getBoundingClientRect(), b = t.getBoundingClientRect();
    if (!a.width) return;
    // de la caja del carácter a la tinta: medida con la misma fuente en un lienzo
    const cs = getComputedStyle(r.startContainer.parentElement);
    lienzo.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = lienzo.measureText(r.toString());
    const tinta = (m.fontBoundingBoxAscent || 0) - (m.actualBoundingBoxAscent || 0);
    const x = ((a.left + a.right) / 2 - b.left) / s, y = (a.top - b.top) / s + tinta;
    bat.style.left = `${F(x)}px`;
    bat.style.top = `${F(y)}px`;
    // el rótulo empieza a la derecha del murciélago
    sec.style.setProperty("--mc-rotulo", `${Math.max(0, Math.round(x + 50 - (h.getBoundingClientRect().left - b.left) / s))}px`);
  }

  /* =====================================================================
     En pantalla: parallax, deriva, ojo, gota y cursor
     ===================================================================== */
  let vivo = false, actual = null, raf = 0, previo = 0, reloj = 0, obs = null, baja = null;
  const puntero = { x: 0, y: 0 }, suave = { x: 0, y: 0 };
  let capas = [];
  const enPantalla = () => vivo && actual?.isConnected && actual.classList.contains("cur");
  // el ambiente se mueve solo con la estación quieta en pantalla y con movimiento permitido
  const libre = () => enPantalla() && !reduced && !document.hidden && !mundo()?.classList.contains("moving") &&
    !raiz.classList.contains("puente") && !raiz.classList.contains("schematic");
  // los detalles (ojo, gota) además esperan a que no haya un vuelo ni una entrada en curso
  const tranquilo = () => libre() && !raiz.classList.contains("busy") && !actual.classList.contains("mc-entrando");

  function bucle(t) {
    raf = 0;
    if (!libre()) return;
    const dt = previo ? Math.min(64, t - previo) : 16, k = 1 - Math.exp(-dt / 320);
    previo = t;
    suave.x += (puntero.x - suave.x) * k;
    suave.y += (puntero.y - suave.y) * k;
    // deriva lenta: dos ondas largas por eje (ciclos de 19 a 41 s)
    const s = t / 1000, T = 2 * Math.PI;
    const dx = Math.sin(s * T / 41) * .75 + Math.sin(s * T / 23 + 1.3) * .25, dy = Math.cos(s * T / 33) * .7 + Math.sin(s * T / 19 + .4) * .3;
    for (const c of capas) {
      const x = (-suave.x * MOV + dx * DERIVA) * c.f, y = (-suave.y * MOV + dy * DERIVA) * c.f * .6;
      if (Math.abs(x - c.x) + Math.abs(y - c.y) < .02) continue;
      c.x = x; c.y = y;
      c.el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
    }
    raf = requestAnimationFrame(bucle);
  }
  function despertar() {
    if (raf || !libre()) return;
    previo = 0;
    raf = requestAnimationFrame(bucle);
  }
  // capas de la estación actual: compuestas (will-change) solo mientras se ven
  function tomarCapas(sec) {
    capas = CAPAS.map(([n, f]) => ({ el: $(`.mc-${n}`, sec), f, x: 0, y: 0 })).filter(c => c.el);
    sec.classList.add("mc-movil");
  }
  function soltarCapas(sec) {
    if (!sec) return;
    sec.classList.remove("mc-movil");
    $$(".mc-capa", sec).forEach(el => { el.style.transform = ""; });
    capas = [];
  }

  /* ojo de murciélago: cada 20 s se asoma, parpadea dos veces (≤ 3 por segundo) y se va */
  function programarOjo() { clearTimeout(reloj); if (vivo) reloj = setTimeout(mirar, 20000); }
  function mirar() {
    programarOjo();
    if (!tranquilo()) return;
    const ojo = $(".mc-ojo", actual);
    if (!ojo || ojo.getAnimations().length) return;
    const ms = 3400;
    ojo.animate([{ opacity: 0 }, { opacity: 1, offset: .14 }, { opacity: 1, offset: .84 }, { opacity: 0 }], { duration: ms, easing: "ease-in-out" });
    $(".mc-ojo-par", ojo).animate([{ transform: "scaleY(1)" }, { transform: "scaleY(1)", offset: .3 }, { transform: "scaleY(.08)", offset: .33 }, { transform: "scaleY(1)", offset: .36 },
      { transform: "scaleY(1)", offset: .56 }, { transform: "scaleY(.08)", offset: .59 }, { transform: "scaleY(1)", offset: .62 }, { transform: "scaleY(1)" }], { duration: ms });
    $(".mc-ojo-pupilas", ojo).animate([{ transform: "translateX(0)" }, { transform: "translateX(0)", offset: .2 }, { transform: "translateX(3px)", offset: .28 },
      { transform: "translateX(3px)", offset: .44 }, { transform: "translateX(-3px)", offset: .52 }, { transform: "translateX(-3px)", offset: .7 }, { transform: "translateX(0)", offset: .78 }, { transform: "translateX(0)" }], { duration: ms, easing: "ease-in-out" });
  }

  /* gota de «sangre»: cae desde el punto tocado fuera de las zonas activas y se desvanece */
  const GOTA = `<svg class="mc-gota" viewBox="-16 -30 32 46" aria-hidden="true"><path class="mc-gota-cuerpo" d="M0-27C3-17 13-6 13 3.5A13 13 0 0 1-13 3.5C-13-6-3-17 0-27Z"/>
    <path class="mc-gota-brillo" d="M-6.5-1.5Q-7 5-2.5 8.5"/></svg>`;
  function gota(cx, cy) {
    const capa = $(":scope > .mc-gotas", actual), r = actual.getBoundingClientRect(), s = r.width / FW;
    if (!capa || !s) return;
    while (capa.children.length > 2) capa.firstElementChild.remove();
    const g = html(GOTA);
    Object.assign(g.style, { left: `${F((cx - r.left) / s)}px`, top: `${F((cy - r.top) / s)}px` });
    capa.append(g);
    g.animate([
      { transform: "translate(-50%,-70%) scale(.2)", opacity: 0, easing: "cubic-bezier(.2,.8,.3,1)" },
      { transform: "translate(-50%,-70%) scale(1)", opacity: 1, offset: .16, easing: "cubic-bezier(.55,0,.85,.4)" },
      { transform: "translate(-50%,calc(-70% + 62px)) scale(.9,1.14)", opacity: .95, offset: .74, easing: "ease-out" },
      { transform: "translate(-50%,calc(-70% + 86px)) scale(.7,1.2)", opacity: 0 }
    ], { duration: 760, fill: "both" }).finished.catch(() => {}).finally(() => g.remove());
  }
  function alBajar(e) { baja = e.isPrimary && e.button === 0 ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null; }
  function alSoltar(e) {
    const b = baja;
    baja = null;
    if (!b || !e.isPrimary || Math.hypot(e.clientX - b.x, e.clientY - b.y) > 12 || e.timeStamp - b.t > 700 || !tranquilo()) return;
    const t = e.target;
    if (!(t instanceof Element) || !actual.contains(t) || t.closest(ACTIVAS)) return;
    gota(e.clientX, e.clientY);
  }

  /* puntero: solo el ratón mueve el parallax (en pantalla táctil queda la deriva) */
  function alMover(e) {
    if (e.pointerType !== "mouse") return;
    puntero.x = clamp(e.clientX / innerWidth * 2 - 1, -1, 1);
    puntero.y = clamp(e.clientY / innerHeight * 2 - 1, -1, 1);
  }
  function alSalir() { puntero.x = puntero.y = 0; }
  let cuadro = 0;
  function alCambiarTam() {
    cancelAnimationFrame(cuadro);
    cuadro = requestAnimationFrame(() => {
      if (!enPantalla()) return;
      posar(actual);
      // la escala cambió: las capas compuestas se vuelven a rasterizar nítidas
      actual.classList.remove("mc-movil");
      requestAnimationFrame(() => { if (enPantalla()) actual.classList.add("mc-movil"); });
    });
  }
  const alCambiarMovimiento = () => { if (reduced) { alSalir(); soltarCapas(actual); if (actual) tomarCapas(actual); } despertar(); };

  function iniciar() {
    if (vivo) return;
    vivo = true;
    raiz.classList.add("mc-vivo");
    addEventListener("pointermove", alMover, { passive: true });
    raiz.addEventListener("pointerleave", alSalir);
    addEventListener("pointerdown", alBajar, true);
    addEventListener("pointerup", alSoltar, true);
    addEventListener("resize", alCambiarTam);
    document.addEventListener("visibilitychange", despertar);
    mq.addEventListener?.("change", alCambiarMovimiento);
    // el bucle se apaga durante los vuelos y en el modo esquema, y vuelve solo
    obs = new MutationObserver(despertar);
    if (mundo()) obs.observe(mundo(), { attributes: true, attributeFilter: ["class"] });
    obs.observe(raiz, { attributes: true, attributeFilter: ["class"] });
    programarOjo();
  }
  function detener() {
    vivo = false;
    raiz.classList.remove("mc-vivo");
    removeEventListener("pointermove", alMover);
    raiz.removeEventListener("pointerleave", alSalir);
    removeEventListener("pointerdown", alBajar, true);
    removeEventListener("pointerup", alSoltar, true);
    removeEventListener("resize", alCambiarTam);
    document.removeEventListener("visibilitychange", despertar);
    mq.removeEventListener?.("change", alCambiarMovimiento);
    obs?.disconnect(); obs = null;
    cancelAnimationFrame(raf); raf = 0;
    cancelAnimationFrame(cuadro);
    clearTimeout(reloj);
    if (actual) {
      $$(".mc-ojo", actual).forEach(o => o.getAnimations({ subtree: true }).forEach(a => a.cancel()));
      $$(".mc-gota", actual).forEach(g => g.remove());
      soltarCapas(actual);
    }
    actual = null; baja = null;
    puntero.x = puntero.y = suave.x = suave.y = 0;
  }
  function mostrar(sec) {
    if (!sec) return;
    if (actual && actual !== sec) {
      $$(".mc-ojo", actual).forEach(o => o.getAnimations({ subtree: true }).forEach(a => a.cancel()));
      $$(".mc-gota", actual).forEach(g => g.remove());
      soltarCapas(actual);
    }
    actual = sec;
    tomarCapas(sec);
    posar(sec);
    // con la fuente del título ya cargada, la medida es la definitiva
    document.fonts?.load('84px "Permanent Marker"').then(() => { if (actual === sec) posar(sec); }, () => {});
    programarOjo();
    despertar();
  }

  MUNDOS.definir("marceline", { montar, iniciar, detener, mostrar });
})();

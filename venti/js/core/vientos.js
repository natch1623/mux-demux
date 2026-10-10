/* =====================================================================
   Vientos — transiciones coreografiadas entre diapositivas
   Cada cambio de diapositiva es una «habilidad» completa en cuatro tiempos:
     1. Anticipación: el viento se reúne y el contenido reacciona.
     2. Acción: el efecto principal (capa 2D + contenido + modelos 3D + cámara).
     3. Relevo: en el pico del efecto se cambia de diapositiva (enter()).
     4. Asentamiento: lo nuevo se arma siguiendo el efecto y quedan restos
        (plumas, notas, pétalos) que se posan después.
   Capas:
   - <div id="vientos"> con un <canvas> propio sobre las diapositivas (también en 2D).
   - Piezas = hijos directos de cada <section class="slide">, animadas con Web
     Animations sobre translate / rotate / scale individuales (no tocan transform,
     así no chocan con el diseño de cada diapositiva).
   - Grupos 3D de la escena saliente y entrante (Sky3D.instances) y trayectoria
     de cámara propia (Sky3D.travel(..., style)).
   M (calma), reduced-motion o doble toque → sin coreografía (transición mínima).
   Cualquier navegación durante una transición la completa al instante.
   Tiempos escritos para --dur-slide = 1100 ms y escalados con ese token.
   ===================================================================== */
(function () {
  "use strict";
  const W = 1920, H = 1080, CX = 960, CY = 540, TAU = Math.PI * 2;
  let layer, cv, g, RES = 1, run = null, ready = false;

  /* ---------- utilidades ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const bell = k => Math.sin(Math.PI * clamp01(k));
  const qb = (x0, y0, x1, y1, x2, y2, k) => { const u = 1 - k; return { x: u * u * x0 + 2 * u * k * x1 + k * k * x2, y: u * u * y0 + 2 * u * k * y1 + k * k * y2 }; };
  // busca t en [a, b] tal que f(t) = v (f monótona)
  function solve(f, v, a, b) { const inc = f(b) > f(a); for (let i = 0; i < 26; i++) { const m = (a + b) / 2; ((f(m) < v) === inc) ? (a = m) : (b = m); } return (a + b) / 2; }
  function rank(list, key) { const s = list.slice().sort((a, b) => key(a) - key(b)); const n = Math.max(1, s.length - 1); s.forEach((p, i) => { p.r = i / n; }); return list; }

  /* curvas de la guía (tokens.css) también para el lienzo */
  function bezier(str) {
    const m = /cubic-bezier\(([^)]+)\)/.exec(str || "");
    if (!m) return k => k;
    const [x1, y1, x2, y2] = m[1].split(",").map(parseFloat);
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 8; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (sx(t) - x) / d; } return sy(clamp01(t)); };
  }
  const E = {}, ES = {};
  const eIn3 = k => k * k * k, eOut3 = k => 1 - Math.pow(1 - k, 3);

  /* ---------- colores de la guía ---------- */
  const C = {}, RGB = {};
  function hexRgb(h) { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function readTokens() {
    const map = { act: "--signal-active", gold: "--selector-gold", err: "--signal-error", text: "--text-main", muted: "--text-muted",
      ivory: "--ornament-ivory", goldL: "--ornament-gold-light", goldD: "--ornament-gold-dark", teal: "--ornament-teal",
      pyro: "--fx-pyro", hydro: "--fx-hydro", cryo: "--fx-cryo", electro: "--fx-electro",
      abyss: "--bg-abyss", space: "--bg-space", horizon: "--bg-horizon", off: "--signal-inactive" };
    for (const k in map) { C[k] = Style.get(map[k]); RGB[k] = hexRgb(C[k]); }
    ES.in = Style.get("--ease-breeze-in"); ES.out = Style.get("--ease-breeze-out"); ES.float = Style.get("--ease-float"); ES.glide = Style.get("--ease-glide");
    E.in = bezier(ES.in); E.out = bezier(ES.out); E.float = bezier(ES.float); E.glide = bezier(ES.glide);
  }
  const rgba = (k, a) => `rgba(${RGB[k][0]},${RGB[k][1]},${RGB[k][2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const mixA = (ka, kb, m, a) => { const A = RGB[ka], B = RGB[kb]; return `rgba(${Math.round(lerp(A[0], B[0], m))},${Math.round(lerp(A[1], B[1], m))},${Math.round(lerp(A[2], B[2], m))},${Math.max(0, Math.min(1, a)).toFixed(3)})`; };

  /* =================================================================
     SPRITES (se dibujan una vez; las partículas solo los copian)
     ================================================================= */
  const S = { glow: {} };
  function sprite(w, h, fn) { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); return c; }
  function makeSprites() {
    ["act", "gold", "err", "text", "ivory", "pyro", "hydro", "cryo", "electro"].forEach(k => {
      S.glow[k] = sprite(64, 64, x => { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, rgba(k, 1)); gr.addColorStop(.3, rgba(k, .45)); gr.addColorStop(1, rgba(k, 0)); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); });
    });
    // pluma (apunta a la derecha): marfil → tono, raquis dorado y barbas
    const feather = tint => sprite(128, 40, x => {
      const gr = x.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, C.ivory); gr.addColorStop(.65, C.text); gr.addColorStop(1, tint);
      x.beginPath(); x.moveTo(4, 21); x.bezierCurveTo(30, 3, 86, 1, 124, 13); x.bezierCurveTo(92, 31, 38, 37, 4, 21); x.closePath();
      x.fillStyle = gr; x.globalAlpha = .92; x.fill(); x.globalAlpha = 1;
      x.strokeStyle = rgba("abyss", .18); x.lineWidth = 1; x.beginPath();
      for (let i = 0; i < 14; i++) { const u = 14 + i * 7.5; x.moveTo(u, 19 - i * .3); x.lineTo(u + 9, 8 + i * .2); x.moveTo(u, 20 - i * .3); x.lineTo(u + 8, 30 - i * .4); }
      x.stroke();
      x.strokeStyle = C.gold; x.lineWidth = 1.6; x.beginPath(); x.moveTo(2, 21); x.quadraticCurveTo(60, 18, 120, 13); x.stroke();
    });
    S.feather = feather(C.ivory); S.featherT = feather(C.act);
    // pluma de luz (alas): aditiva
    S.plume = sprite(160, 44, x => {
      const gr = x.createLinearGradient(0, 0, 160, 0); gr.addColorStop(0, rgba("goldL", .2)); gr.addColorStop(.4, rgba("text", .9)); gr.addColorStop(1, rgba("act", .5));
      x.beginPath(); x.moveTo(2, 22); x.bezierCurveTo(36, 2, 108, 0, 158, 14); x.bezierCurveTo(116, 34, 44, 42, 2, 22); x.closePath(); x.fillStyle = gr; x.fill();
      x.strokeStyle = rgba("goldL", .9); x.lineWidth = 2; x.beginPath(); x.moveTo(2, 22); x.quadraticCurveTo(80, 18, 154, 14); x.stroke();
    });
    // flor de cecilia (pétalo que cae)
    S.petal = sprite(56, 56, x => {
      x.translate(28, 28);
      for (let i = 0; i < 5; i++) { x.save(); x.rotate(i * TAU / 5); const gr = x.createLinearGradient(0, 0, 0, -24); gr.addColorStop(0, C.ivory); gr.addColorStop(1, C.text); x.fillStyle = gr; x.beginPath(); x.moveTo(0, -3); x.bezierCurveTo(-11, -12, -8, -24, 0, -26); x.bezierCurveTo(8, -24, 11, -12, 0, -3); x.fill(); x.restore(); }
      x.fillStyle = C.gold; x.beginPath(); x.arc(0, 0, 4, 0, TAU); x.fill();
    });
    // semilla de diente de león (vilano)
    S.seed = sprite(40, 64, x => {
      x.strokeStyle = rgba("text", .9); x.lineWidth = 1.2; x.beginPath(); x.moveTo(20, 60); x.lineTo(20, 24); x.stroke();
      x.lineWidth = .9; x.beginPath();
      for (let i = 0; i < 15; i++) { const a = -Math.PI / 2 + (i - 7) * .2; const l = 15 + (i % 3) * 2; x.moveTo(20, 24); x.lineTo(20 + Math.cos(a) * l, 24 + Math.sin(a) * l); }
      x.stroke(); x.fillStyle = C.ivory; x.beginPath(); x.ellipse(20, 60, 2.2, 3.5, 0, 0, TAU); x.fill();
    });
    // nota musical (corchea)
    const note = k => sprite(48, 64, x => {
      const finish = x.createLinearGradient(5, 8, 35, 56);
      finish.addColorStop(0, C.goldL); finish.addColorStop(.35, C[k]); finish.addColorStop(.58, C.text); finish.addColorStop(1, C[k]);
      x.shadowColor = C[k]; x.shadowBlur = 4; x.fillStyle = finish; x.strokeStyle = finish;
      x.beginPath(); x.ellipse(15, 50, 10, 7, -.45, 0, TAU); x.fill();
      x.lineWidth = 3; x.beginPath(); x.moveTo(24, 47); x.lineTo(24, 8); x.stroke();
      x.beginPath(); x.moveTo(24, 8); x.bezierCurveTo(36, 16, 42, 26, 34, 40); x.bezierCurveTo(36, 28, 32, 22, 24, 20); x.fill();
    });
    S.note = note("gold"); S.noteT = note("act");
    // hoja
    S.leaf = sprite(52, 26, x => {
      const gr = x.createLinearGradient(0, 0, 52, 0); gr.addColorStop(0, C.teal); gr.addColorStop(1, C.act);
      x.fillStyle = gr; x.beginPath(); x.moveTo(2, 13); x.quadraticCurveTo(24, -4, 50, 13); x.quadraticCurveTo(24, 30, 2, 13); x.fill();
      x.strokeStyle = rgba("text", .55); x.lineWidth = 1; x.beginPath(); x.moveTo(3, 13); x.lineTo(48, 13); x.stroke();
    });
    // nube suave
    S.cloud = sprite(256, 256, x => { const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, rgba("text", .55)); gr.addColorStop(.5, rgba("muted", .2)); gr.addColorStop(1, rgba("text", 0)); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); });
  }

  /* =================================================================
     PRIMITIVAS DE DIBUJO (coordenadas del escenario 1920×1080)
     ================================================================= */
  function add(on) { g.globalCompositeOperation = on ? "lighter" : "source-over"; }
  function flash(x, y, r, a, k) {
    if (a <= .005 || r <= 1) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(k, a)); gr.addColorStop(.35, rgba(k, a * .4)); gr.addColorStop(1, rgba(k, 0));
    add(true); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); add(false);
  }
  function ell(x, y, rx, ry, rot, style, lw) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); g.strokeStyle = style; g.lineWidth = lw; g.stroke(); }
  function streak(x1, y1, x2, y2, w, k, a) {
    if (a <= .005 || w <= .1) return;
    const gr = g.createLinearGradient(x1, y1, x2, y2); gr.addColorStop(0, rgba(k, 0)); gr.addColorStop(.75, rgba(k, a * .55)); gr.addColorStop(1, rgba(k, a));
    g.strokeStyle = gr; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  function diamond(x, y, r, style) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * .7, y); g.lineTo(x, y + r); g.lineTo(x - r * .7, y); g.closePath(); g.fillStyle = style; g.fill(); }
  // Cinta volumétrica: silueta, cuerpo translúcido y borde iluminado.
  // Los puntos definen la acción; el ancho se estrecha en ambos extremos.
  function silk(points, width, tint, a) {
    if (a <= .005 || points.length < 3) return;
    const left = [], right = [];
    points.forEach((p, i) => {
      const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
      const dx = next.x - prev.x, dy = next.y - prev.y, d = Math.hypot(dx, dy) || 1;
      const w = width * (.12 + .88 * Math.sin(Math.PI * i / (points.length - 1)));
      left.push({ x: p.x - dy / d * w, y: p.y + dx / d * w });
      right.push({ x: p.x + dy / d * w, y: p.y - dx / d * w });
    });
    const p = points[Math.floor(points.length / 2)];
    const shine = g.createLinearGradient(p.x - width * 3, p.y - width * 3, p.x + width * 3, p.y + width * 3);
    shine.addColorStop(0, rgba(tint, .02 * a));
    shine.addColorStop(.35, rgba(tint, .18 * a));
    shine.addColorStop(.58, rgba("ivory", .27 * a));
    shine.addColorStop(.7, rgba(tint, .42 * a));
    shine.addColorStop(1, rgba(tint, .03 * a));
    add(false); g.beginPath(); g.moveTo(left[0].x, left[0].y);
    left.slice(1).forEach(q => g.lineTo(q.x, q.y));
    right.reverse().forEach(q => g.lineTo(q.x, q.y));
    g.closePath(); g.fillStyle = shine; g.fill();
    g.beginPath(); left.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y));
    g.strokeStyle = rgba("ivory", .4 * a); g.lineWidth = 1.3; g.stroke();
  }
  // círculo de viento en perspectiva (dominio del soneto)
  function runeRing(cx, cy, rx, ry, spin, a) {
    if (a <= .01) return;
    const surface = g.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    surface.addColorStop(0, rgba("teal", .12 * a)); surface.addColorStop(.5, rgba("act", .22 * a)); surface.addColorStop(1, rgba("ivory", .1 * a));
    add(false); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.ellipse(cx, cy, rx * .82, ry * .82, 0, 0, TAU, true);
    g.fillStyle = surface; g.fill("evenodd");
    add(true);
    ell(cx, cy, rx * 1.1, ry * 1.1, 0, rgba("act", .16 * a), 12);
    ell(cx, cy, rx, ry, 0, rgba("act", .7 * a), 3);
    ell(cx, cy, rx * .86, ry * .86, 0, rgba("gold", .6 * a), 2);
    g.strokeStyle = rgba("gold", .85 * a); g.lineWidth = 2; g.beginPath();
    for (let i = 0; i < 48; i++) { const t = spin + i * TAU / 48, c = Math.cos(t), s = Math.sin(t), l = i % 4 === 0 ? 1 : .95; g.moveTo(cx + c * rx * .88, cy + s * ry * .88); g.lineTo(cx + c * rx * l * .99, cy + s * ry * l * .99); }
    g.stroke();
    for (let i = 0; i < 6; i++) { const t = -spin * 1.6 + i * TAU / 6; diamond(cx + Math.cos(t) * rx * .72, cy + Math.sin(t) * ry * .72, 9 + ry * .03, rgba("act", .9 * a)); }
    for (let i = 0; i < 3; i++) { const t0 = spin * 2.2 + i * TAU / 3; g.beginPath(); g.ellipse(cx, cy, rx * .52, ry * .52, 0, t0, t0 + 1.4); g.strokeStyle = rgba("text", .45 * a); g.lineWidth = 2.5; g.stroke(); }
    add(false);
    flash(cx, cy, rx * .75, .14 * a, "act");
  }
  // flecha de viento con emplumado
  function arrow(x, y, ang, len, a, k) {
    if (a <= .01) return;
    k = k || "act";
    g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = a;
    add(true); streak(-len, 0, 0, 0, 5, k, 1); streak(-len * .6, 0, 0, 0, 2, "text", 1);
    g.drawImage(S.feather, -len - 6, -16, 54, 14); g.scale(1, -1); g.drawImage(S.feather, -len - 6, -16, 54, 14); g.scale(1, -1);
    add(false);
    const metal = g.createLinearGradient(-len, -10, 28, 10);
    metal.addColorStop(0, C.goldD); metal.addColorStop(.48, C.goldL); metal.addColorStop(1, C[k]);
    g.fillStyle = metal; g.fillRect(-len, -2, len + 5, 4);
    g.beginPath(); g.moveTo(34, 0); g.lineTo(-8, -15); g.lineTo(2, 0); g.lineTo(-8, 15); g.closePath();
    g.fillStyle = metal; g.fill();
    g.beginPath(); g.moveTo(34, 0); g.lineTo(-8, -15); g.lineTo(2, 0); g.closePath();
    g.fillStyle = rgba("ivory", .72); g.fill();
    g.restore(); g.globalAlpha = 1;
    flash(x, y, 65, .22 * a, k);
  }
  // brazos del ojo de la tormenta
  function vortex(cx, cy, R, spin, a, goldMix) {
    if (a <= .01 || R < 2) return;
    const tint = run ? run.infusion : "act";
    // Ojo oscuro estable: los velos orbitan en profundidad alrededor de él.
    add(false);
    const eye = g.createRadialGradient(cx, cy, R * .08, cx, cy, R * .8);
    eye.addColorStop(0, rgba("abyss", .86 * a));
    eye.addColorStop(.32, rgba("space", .65 * a));
    eye.addColorStop(.66, rgba(tint, .16 * a * goldMix));
    eye.addColorStop(1, rgba("act", 0));
    g.fillStyle = eye; g.fillRect(cx - R, cy - R, R * 2, R * 2);
    for (let j = 0; j < 3; j++) {
      const points = Array.from({ length: 64 }, (_, s) => {
        const q = s / 63, r = R * (.12 + .88 * q), an = spin + j * TAU / 3 + q * 4.8;
        return { x: cx + Math.cos(an) * r, y: cy + Math.sin(an) * r * .68 };
      });
      silk(points, Math.max(4, R * .07), goldMix > .3 ? tint : "act", a);
    }
    add(true); g.lineCap = "round";
    for (let j = 0; j < 7; j++) {
      g.beginPath();
      for (let s = 0; s <= 44; s++) { const q = s / 44, r = R * (.06 + .94 * q), an = spin + j * TAU / 7 + q * 3.4; const x = cx + Math.cos(an) * r, y = cy + Math.sin(an) * r * .78; s ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = mixA("act", tint, goldMix, a * .1); g.lineWidth = 3; g.stroke();
      g.strokeStyle = mixA("text", tint, goldMix, a * .2); g.lineWidth = 1; g.stroke();
    }
    for (let i = 0; i < 5; i++) { const r = R * (.18 + .17 * i); g.beginPath(); g.ellipse(cx, cy, r, r * .78, 0, spin * (1.4 - i * .2), spin * (1.4 - i * .2) + 2.2); g.strokeStyle = mixA("act", "gold", goldMix, a * .45); g.lineWidth = 2; g.stroke(); }
    add(false);
    flash(cx, cy, R * .3, .12 * a, goldMix > .5 ? tint : "act");
  }
  // ala de luz: tres filas de plumas en abanico
  function wing(cx, cy, side, open, sc, a) {
    if (a <= .01) return;
    const rows = [[11, 430, 300], [8, 300, 220], [6, 190, 130]];
    add(false); g.globalAlpha = a * .28;
    rows.forEach(([n, l0, l1], r) => {
      for (let i = 0; i < n; i++) {
        const q = i / (n - 1);
        const th = lerp(1.62, lerp(-1.25 + r * .22, .32 - r * .1, q), E.out(open)); // plegada (abajo) → abierta (abanico)
        const len = lerp(l0, l1, q) * sc * (.55 + .45 * open);
        const rx = cx + side * (40 + q * 150 * open * sc) * (1 - r * .25), ry = cy - q * 30 * open * sc - r * 6;
        g.save(); g.translate(rx, ry); g.rotate(side > 0 ? th : Math.PI - th); if (side < 0) g.scale(1, -1);
        g.drawImage(S.plume, 0, -len * .14, len, len * .28); g.restore();
      }
    });
    g.globalAlpha = 1; add(false);
  }

  /* =================================================================
     PIEZAS: hijos directos de la diapositiva (con su caja en el escenario)
     ================================================================= */
  /* ambiente: escenografía de cada diapositiva (marco, atmósfera, ciudad);
     no viaja con el contenido, hace un fundido cruzado en el relevo */
  const ENV = ".mondstadt-frame, .frame-art, .scene-atmosphere, .city-art, [data-vt='fijo']";
  const envOf = el => Array.from(el.children).filter(c => c.matches(ENV));
  function pieces(el) {
    const out = [], sc = (window.Deck && Deck.scale) || 1, off = (window.Deck && Deck.offset) || { x: 0, y: 0 };
    const skip3d = window.Sky3D && Sky3D.ok; // en 3D las etiquetas siguen a su grupo (se anima el grupo)
    const walk = (node, depth) => {
      for (const c of node.children) {
        if (c.matches("script, style") || c.matches(ENV)) continue;
        if (skip3d && c.classList.contains("labels3d")) continue;
        const cs = getComputedStyle(c);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const r = c.getBoundingClientRect();
        const w = r.width / sc, h = r.height / sc;
        const isBox = !(c instanceof SVGElement) && !/^(IMG|CANVAS|VIDEO)$/.test(c.tagName);
        if (isBox && c.children.length && depth < 3 && (w * h > W * H * .55 || w < 2 || h < 2)) { walk(c, depth + 1); continue; }
        if (w < 2 || h < 2) continue;
        const x = (r.left - off.x) / sc, y = (r.top - off.y) / sc;
        out.push({ el: c, x, y, w, h, cx: x + w / 2, cy: y + h / 2, op: parseFloat(cs.opacity) || 0, filt: cs.filter !== "none", big: w * h > W * H * .3, r: 0 });
      }
    };
    walk(el, 0);
    return out;
  }
  // estado de una pieza → keyframe (x, y px · r grados · s escala · o opacidad relativa · b desenfoque)
  function kf(p, o) {
    const f = { translate: `${(o.x || 0).toFixed(1)}px ${(o.y || 0).toFixed(1)}px`, rotate: `${(o.r || 0).toFixed(2)}deg`, scale: `${o.s == null ? 1 : o.s}`, opacity: (o.o == null ? 1 : o.o) * p.op };
    if (o.off != null) f.offset = clamp01(o.off);
    if (o.e) f.easing = o.e;
    return f;
  }

  /* =================================================================
     Movimientos de los grupos 3D (o = THREE.Group, b = estado base, k 0→1)
     ================================================================= */
  const G3 = {
    // salidas
    blowL: (o, b, k) => { const e = E.out(k); o.position.x = b.p.x - 9 * e; o.position.y = b.p.y + 1.5 * e; o.rotation.y = b.r.y - .7 * e; },
    blowR: (o, b, k) => { const e = E.out(k); o.position.x = b.p.x + 9 * e; o.rotation.y = b.r.y + .7 * e; },
    launch: (o, b, k) => { const e = E.out(k); o.position.y = b.p.y + 13 * e; o.rotation.x = b.r.x - .6 * e; o.rotation.z = b.r.z + .25 * e; },
    suck: (o, b, k) => { const e = E.out(k); o.scale.setScalar(Math.max(.02, 1 - e)); o.rotation.z = b.r.z + 5 * e; },
    split: (o, b, k) => { const e = E.out(k); o.position.y = b.p.y - 8 * e; o.rotation.z = b.r.z + .35 * e; },
    drop: (o, b, k) => { const e = E.out(k); o.position.y = b.p.y - 14 * e; o.rotation.x = b.r.x + .3 * e; },
    spin: (o, b, k) => { const e = E.out(k); o.rotation.z = b.r.z + 1.6 * e; o.scale.setScalar(1 + .5 * e); o.position.z = b.p.z + 3 * e; },
    shatter: (o, b, k) => { const e = E.out(k); o.position.x = b.p.x + Math.sin(k * 90) * .08 * (1 - e) - 6 * e; o.position.y = b.p.y - 5 * e; o.rotation.z = b.r.z + .5 * e; },
    blast: (o, b, k) => { const e = E.out(k); o.scale.setScalar(1 + .6 * e); o.position.z = b.p.z + 8 * e; o.rotation.y = b.r.y + .5 * e; },
    bank: (o, b, k) => { const e = E.out(k); o.rotation.y = b.r.y + .9 * e; o.position.x = b.p.x - 7 * e; o.position.z = b.p.z - 3 * e; },
    recede: (o, b, k) => { const e = E.out(k); o.scale.setScalar(1 - .45 * e); o.position.z = b.p.z - 6 * e; },
    // entradas (en k = 1 vuelven exactamente al estado base)
    fall: (o, b, k) => { const e = 1 - E.float(k); o.position.y = b.p.y + 7 * e; o.rotation.z = b.r.z + .25 * e * Math.cos(k * 7); },
    rise: (o, b, k) => { const e = 1 - E.in(k); o.position.y = b.p.y - 8 * e; },
    fromR: (o, b, k) => { const e = 1 - E.in(k); o.position.x = b.p.x + 8 * e; o.rotation.y = b.r.y + .6 * e; },
    fromL: (o, b, k) => { const e = 1 - E.in(k); o.position.x = b.p.x - 8 * e; o.rotation.y = b.r.y - .6 * e; },
    emerge: (o, b, k) => { const e = E.in(k); o.scale.setScalar(Math.max(.02, e)); o.rotation.z = b.r.z - 3 * (1 - k) * (1 - k); },
    grow: (o, b, k) => { const e = E.in(k); o.scale.setScalar(.6 + .4 * e); o.position.z = b.p.z - 3 * (1 - e); },
    unspin: (o, b, k) => { const e = 1 - E.in(k); o.rotation.z = b.r.z - 1.4 * e; o.scale.setScalar(1 - .4 * e); },
    jitter: (o, b, k) => { o.position.x = b.p.x + Math.sin(k * 70) * .12 * (1 - k); },
    bankIn: (o, b, k) => { const e = 1 - E.glide(k); o.rotation.y = b.r.y - .8 * e; o.position.x = b.p.x + 6 * e; o.position.z = b.p.z - 3 * e; }
  };

  /* =================================================================
     RUN: una transición en curso
     ================================================================= */
  class Run {
    constructor(fx, o) {
      this.fx = fx; this.o = o;
      this.K = Math.max(.3, Style.ms("--dur-slide") / 1100) * parseFloat(Style.get("--transition-tempo"));
      this.from = o.from.el; this.to = o.to.el;
      this.dur = fx.dur; this.s = fx.swap;
      this.events = []; this.layers = []; this.fields = []; this.parts = []; this.anims = []; this.nodes = []; this.cleanups = []; this.bases = new Map();
      this.entered = false; this.done = false; this.t = 0;
      this.speaker = (o.from.who || "") !== (o.to.who || "");
      this.infusion = o.toIdx < 9 ? "hydro" : o.toIdx < 13 ? "cryo" : o.toIdx < 18 ? "electro" : "pyro";
      this.out = pieces(this.from);
      this.in = [];
    }
    /* --- calendario (tiempos en ms «de guion», escalados con K) --- */
    at(t, fn) { this.events.push({ t, fn }); }
    layer(t0, t1, fn, z) { this.layers.push({ t0, t1, fn, z: z || 0, fin: false }); }
    field(t0, t1, fn) { this.fields.push({ t0, t1, fn }); }
    stream(t0, t1, rate, fn) { let acc = 0; this.layer(t0, t1, (k, t, dt) => { if (k >= 1) return; acc += rate * .65 * dt; while (acc >= 1) { acc--; this.emit1(fn(k, t)); } }); }
    /* --- partículas --- */
    emit1(o) {
      if (this.parts.length > 360) return;
      this.parts.push(Object.assign({ img: S.glow.act, x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, grav: 0, drag: 0, rot: 0, vr: 0, size: 1, alpha: 1, life: 1, age: 0, add: true, fin: .12, fout: .35, sway: 0, swayF: 3, ph: rnd(0, TAU), flip: 0, face: false, path: null }, o));
    }
    emit(n, fn) { for (let i = 0; i < n; i++) this.emit1(fn(i)); }
    burst(x, y, k, n, sp) { this.emit(n || 14, () => { const a = rnd(0, TAU), v = rnd(.3, 1) * (sp || 420); return { img: S.glow[k || "act"], x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 3, life: rnd(.4, .8), size: rnd(.15, .35) }; }); }
    /* --- Web Animations --- */
    move(p, states, opt) {
      opt = opt || {};
      // Cada mecanismo conserva su física. La absorción puede converger al
      // centro y el impulso sale por arriba; el texto en reposo no rebota.
      const suction = this.name === "oda", lift = ["sonetoToque", "corriente"].includes(this.name);
      const frames = states.map(s => kf(p, Object.assign({}, s, {
        x: (s.x || 0) * (suction ? 1 : .55), y: (s.y || 0) * (suction || lift ? 1 : .55),
        r: Math.max(suction ? -24 : -5, Math.min(suction ? 24 : 5, s.r || 0)),
        s: Math.max(suction ? .18 : .94, Math.min(1.04, s.s == null ? 1 : s.s)), b: 0
      })));
      return this.animate(p.el, frames, { delay: opt.delay || 0, duration: opt.dur || 600, easing: opt.ease || "linear", fill: opt.enter ? "backwards" : "forwards" });
    }
    animate(el, frames, opt) {
      const o = Object.assign({ fill: "forwards" }, opt);
      o.delay = Math.max(0, (o.delay || 0) * this.K); o.duration = Math.max(1, (o.duration || 600) * this.K);
      const a = el.animate(frames, o); this.anims.push(a); return a;
    }
    /* estados de «toda la escena» (x, y, z px · s escala · ry giro en Y · o · b)
       aplicados pieza a pieza respecto al centro: se mueve como un bloque,
       pero el ambiente se queda quieto */
    rigid(list, states, opt) {
      opt = opt || {};
      list.forEach(p => {
        const frames = states.map(st => {
          const sc = st.s == null ? 1 : st.s, th = (st.ry || 0) * Math.PI / 180, dx = p.cx - CX, dy = p.cy - CY;
          const x = (st.x || 0) + dx * (sc * Math.cos(th) - 1), y = (st.y || 0) + dy * (sc - 1), z = (st.z || 0) - dx * sc * Math.sin(th);
          const f = { translate: `${x.toFixed(1)}px ${y.toFixed(1)}px ${z.toFixed(1)}px`, rotate: `y ${(st.ry || 0).toFixed(2)}deg`, scale: `${sc}`, opacity: (st.o == null ? 1 : st.o) * p.op };
          if (st.off != null) f.offset = clamp01(st.off);
          if (st.e) f.easing = st.e;
          return f;
        });
        this.animate(p.el, frames, { delay: opt.delay || 0, duration: opt.dur || 600, easing: opt.ease || "linear", fill: opt.enter ? "backwards" : "forwards" });
      });
    }
    persp(el) { const prev = el.style.perspective; el.style.perspective = "1800px"; this.cleanups.push(() => { el.style.perspective = prev; }); }
    env() {
      const fx = this.fx, a = fx.envOut || [this.s - 100, this.s + 500], b = fx.envIn || [Math.max(0, this.s - 350), this.s + 250];
      envOf(this.from).forEach(e => this.animate(e, [{ opacity: getComputedStyle(e).opacity }, { opacity: 0 }], { delay: a[0], duration: a[1] - a[0], easing: ES.float }));
      envOf(this.to).forEach(e => this.animate(e, [{ opacity: 0 }, { opacity: getComputedStyle(e).opacity }], { delay: b[0], duration: b[1] - b[0], easing: ES.float, fill: "backwards" }));
    }
    clone(el, clip) {
      const c = el.cloneNode(true);
      c.removeAttribute("id"); c.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
      c.classList.remove("current", "vt-out", "vt-hold", "vt-arrive", "leaving", "entering");
      c.classList.add("vt-clone"); c.style.clipPath = clip || ""; c.style.visibility = "";
      el.after(c); this.nodes.push(c); return c;
    }
    node(html, cls) { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; layer.appendChild(d); this.nodes.push(d); return d; }
    /* --- grupos 3D --- */
    g3(idx, t0, t1, name) {
      if (!name || !window.Sky3D || !Sky3D.ok) return;
      const inst = Sky3D.instances.get(idx); const o = inst && inst.ctx.group; if (!o) return;
      if (!this.bases.has(o)) this.bases.set(o, { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone() });
      const b = this.bases.get(o);
      this.layer(t0, t1, k => G3[name](o, b, k));
    }
    /* --- tarjeta de relevo de orador --- */
    card(t0, t1, opt) {
      opt = opt || {};
      const d = this.o.to, who = d.who === "Todos" ? "Todo el equipo" : d.who;
      this.at(t0, () => {
        const c = this.node(`<span class="vt-card-k">Toma la palabra</span><strong>${who}</strong><span class="vt-card-t">${d.topic || ""}</span>`, "vt-card");
        if (opt.y) c.style.top = opt.y + "px";
        const span = t1 - t0;
        this.animate(c, [
          { opacity: 0, scale: .97, translate: "0px 18px" },
          { opacity: 1, scale: 1, translate: "0px 0px", offset: .22, easing: ES.in },
          { opacity: 1, scale: 1, translate: "0px 0px", offset: .66, easing: ES.glide },
          { opacity: 0, scale: .97, translate: "0px -18px" }
        ], { duration: span, easing: "linear" });
      });
    }
    /* --- ciclo --- */
    start() {
      this.t0 = performance.now(); this.last = this.t0;
      this.env();
      this.breezeMaterials();
      this.cinema();
      this.fx.out(this);
      if (this.fx.g3out) this.g3(this.o.fromIdx, this.fx.g3out[1], this.fx.g3out[2], this.fx.g3out[0]);
      this.at(this.s, () => this.swap());
      this.at(this.dur, () => this.end(false));
      requestAnimationFrame(now => loop(this, now));
    }
    // Seda esmeralda, reflejos de oro y plumas de marfil en el relevo.
    // Una única capa compartida une las diecinueve coreografías.
    breezeMaterials() {
      // El barrido lateral pertenece a las ráfagas, no al ascenso ni al tornado.
      if (["sonetoToque", "sonetoMantenido", "corriente", "oda", "torbellino", "remolino", "notas", "lira", "alas", "disparo"].includes(this.name)) return;
      const dir = this.o.dir > 0 ? -1 : 1, pivot = this.s;
      const start = Math.max(0, pivot - 380), stop = Math.min(this.dur, pivot + 650);
      this.layer(start, stop, k => {
        const envelope = bell(k), progress = E.glide(k);
        const x = dir < 0 ? lerp(W + 680, -680, progress) : lerp(-680, W + 680, progress);
        g.save(); g.translate(x, 0);
        for (let j = 0; j < 3; j++) {
          const y = 265 + j * 250, tilt = Math.sin(k * Math.PI + j) * 80;
          const sheen = g.createLinearGradient(-440, y - 100, 380, y + 100);
          sheen.addColorStop(0, rgba("teal", 0));
          sheen.addColorStop(.35, rgba("act", .08 * envelope));
          sheen.addColorStop(.62, rgba("ivory", .22 * envelope));
          sheen.addColorStop(.72, rgba("goldL", .3 * envelope));
          sheen.addColorStop(1, rgba("act", 0));
          g.beginPath(); g.moveTo(-650, y + 100);
          g.bezierCurveTo(-140, y - 250 + tilt, 150, y + 200, 650, y - 120);
          g.bezierCurveTo(150, y + 255, -140, y - 140 + tilt, -650, y + 100);
          g.fillStyle = sheen; g.fill();
        }
        g.restore();
        // Plumas cercanas de mayor tamaño: lectura de material, no lluvia de puntos.
        for (let i = 0; i < 9; i++) {
          const y = 110 + i * 109 + Math.sin(k * TAU + i) * 28;
          g.save(); g.translate(x + (i % 3 - 1) * 145, y);
          g.rotate(dir * (.22 + Math.sin(k * Math.PI + i) * .3));
          g.globalAlpha = .75 * envelope;
          g.drawImage(i % 3 ? S.feather : S.featherT, -90, -28, 180, 56);
          g.restore();
        }
      }, 1);
      this.layer(pivot - 160, Math.min(this.dur, pivot + 560), k => {
        const a = bell(k) * .55;
        // Roseta de plumas sobre el borde superior; el centro de lectura queda libre.
        for (let i = 0; i < 6; i++) {
          g.save(); g.translate(CX, 70); g.rotate(i * TAU / 6 + k * .35);
          g.globalAlpha = a; g.drawImage(S.featherT, 22, -12, 92, 29); g.restore();
        }
        flash(CX, 70, 180, .12 * bell(k), "act");
        add(true);
        for (let i = 0; i < 10; i++) {
          const t = i * TAU / 10 + k * .3;
          diamond(CX + Math.cos(t) * (135 + k * 80), 70 + Math.sin(t) * 45, 3 + i % 3, rgba(i % 3 ? "act" : "goldL", a));
        }
        add(false);
      }, 1);
    }
    // Pase cinematográfico común (todas las coreografías): barras de cine,
    // líneas de velocidad, destello anamórfico con reflejos de lente, rayos,
    // onda de choque y sacudida de cámara en el relevo.
    cinema() {
      const s = this.s, dur = this.dur, fwd = this.o.dir > 0;
      const spot = [[1480, 300], [430, 280], [1520, 790], [400, 770], [960, 170]][this.o.toIdx % 5];
      const fx = fwd ? spot[0] : W - spot[0], fy = spot[1];       // fuente del destello (varía por diapositiva)
      const tint = this.infusion;
      // barras de cine (entran con la anticipación, salen al asentarse)
      this.layer(0, dur, (k, t) => {
        const a = E.glide(seg(t, 0, s * .8)) * (1 - E.glide(seg(t, s + 350, Math.min(dur, s + 1000))));
        if (a <= .002) return;
        const h = 64 * a;
        g.fillStyle = rgba("abyss", .96 * a); g.fillRect(0, 0, W, h); g.fillRect(0, H - h, W, h);
        const line = (y) => { const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, rgba("goldL", 0)); gr.addColorStop(.5, rgba("goldL", .55 * a)); gr.addColorStop(1, rgba("goldL", 0)); g.fillStyle = gr; g.fillRect(0, y, W, 1.5); };
        line(h - 1); line(H - h);
      }, 1);
      // líneas de velocidad en los bordes durante la acción
      const SL = Array.from({ length: 46 }, () => ({ a: rnd(0, TAU), o: rnd(0, 1), v: rnd(.6, 1.4), w: rnd(1, 3.5) }));
      this.layer(Math.max(0, s - 520), Math.min(dur, s + 520), (k, t) => {
        const env = bell(k); if (env < .01) return;
        add(true);
        for (const l of SL) {
          const q = (l.o + t * .0016 * l.v) % 1, r0 = 640 + q * 520, r1 = r0 + 90 + 260 * env;
          streak(CX + Math.cos(l.a) * r0, CY + Math.sin(l.a) * r0 * .62, CX + Math.cos(l.a) * r1, CY + Math.sin(l.a) * r1 * .62, l.w, q > .6 ? "ivory" : "act", .32 * env);
        }
        add(false);
        // viñeta de velocidad
        const vg = g.createRadialGradient(CX, CY, 420, CX, CY, 1150);
        vg.addColorStop(0, rgba("abyss", 0)); vg.addColorStop(1, rgba("abyss", .55 * env));
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
      }, 1);
      // destello anamórfico en el relevo
      this.layer(Math.max(0, s - 140), Math.min(dur + 300, s + 760), (k) => {
        const rise = E.out(seg(k, 0, .18)), fall = 1 - E.in(seg(k, .18, 1)), a = rise * fall;
        if (a < .005) return;
        add(true);
        // núcleo y halo
        flash(fx, fy, 260 + 140 * k, .55 * a, "text");
        flash(fx, fy, 520, .28 * a, tint);
        // estela horizontal (lente anamórfica): tres capas
        [[W * 1.1, 10, .5, "act"], [W * .7, 4, .75, "text"], [W * .45, 22, .16, tint]].forEach(([len, th, al, c]) => {
          const gr = g.createLinearGradient(fx - len / 2, 0, fx + len / 2, 0);
          gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(.5, rgba(c, al * a)); gr.addColorStop(1, rgba(c, 0));
          g.fillStyle = gr; g.beginPath(); g.ellipse(fx, fy, len / 2, th * (1 + .6 * k), 0, 0, TAU); g.fill();
        });
        // estrella de rayos que gira
        for (let i = 0; i < 14; i++) {
          const ang = i * TAU / 14 + k * .5, len = (i % 2 ? 180 : 320) * (.6 + .6 * rise);
          streak(fx, fy, fx + Math.cos(ang) * len, fy + Math.sin(ang) * len, i % 2 ? 1.5 : 3, i % 3 ? "ivory" : "goldL", .5 * a);
        }
        // reflejos de lente sobre la diagonal destello → centro → opuesto
        const dx = CX - fx, dy = CY - fy;
        [[.45, 34, "act", .22], [.8, 18, "goldL", .3], [1.25, 62, tint, .14], [1.6, 26, "ivory", .2], [1.95, 90, "act", .09]].forEach(([m, r, c, al]) => {
          const x = fx + dx * m, y = fy + dy * m;
          g.beginPath();
          for (let j = 0; j < 6; j++) { const t = j * TAU / 6 + .3; g[j ? "lineTo" : "moveTo"](x + Math.cos(t) * r, y + Math.sin(t) * r); }
          g.closePath(); g.fillStyle = rgba(c, al * a); g.fill();
          g.strokeStyle = rgba(c, al * 1.6 * a); g.lineWidth = 1.2; g.stroke();
        });
        add(false);
      }, 1);
      // onda de choque desde el centro
      this.layer(s - 20, Math.min(dur + 300, s + 620), (k) => {
        const r = 60 + 1150 * E.out(k), a = (1 - k) * (1 - k);
        if (a < .01) return;
        add(true);
        g.lineWidth = 26 * (1 - k) + 2;
        g.strokeStyle = rgba("act", .22 * a); g.beginPath(); g.ellipse(CX, CY, r, r * .62, 0, 0, TAU); g.stroke();
        g.lineWidth = 3; g.strokeStyle = rgba("ivory", .6 * a); g.beginPath(); g.ellipse(CX, CY, r * .97, r * .6, 0, 0, TAU); g.stroke();
        g.lineWidth = 2; g.strokeStyle = rgba("goldL", .45 * a); g.beginPath(); g.ellipse(CX, CY, r * .86, r * .53, 0, 0, TAU); g.stroke();
        add(false);
      }, 1);
      // sacudida de cámara amortiguada en el relevo
      const slides = document.getElementById("slides");
      if (slides && slides.animate) {
        const frames = Array.from({ length: 9 }, (_, i) => { const d = Math.pow(1 - i / 8, 2) * 9; return { translate: `${(i % 2 ? d : -d).toFixed(1)}px ${(i % 3 - 1) * d * .6}px` }; });
        this.animate(slides, frames, { delay: s - 30, duration: 420, easing: "linear", fill: "none" });
      }
    }
    liftVeils(cx, floor, t0, t1, radius) {
      this.layer(t0, t1, (k, t) => {
        const a = bell(k), height = 1040 * E.out(seg(k, 0, .65));
        for (let j = 0; j < 3; j++) {
          const points = Array.from({ length: 46 }, (_, i) => {
            const q = i / 45, spread = radius * (.5 + .5 * q);
            return { x: cx + Math.sin(q * 5.5 + t * .002 + j * TAU / 3) * spread,
              y: floor - q * height };
          });
          silk(points, 22 + j * 8, j === 1 ? "ivory" : "act", a * .8);
        }
      }, 1);
    }
    swap() {
      if (this.entered) return;
      this.entered = true;
      this.o.enter();
      this.to.classList.remove("vt-hold");
      this.in = pieces(this.to);
      this.fx.in(this);
      if (this.fx.g3in) this.g3(this.o.toIdx, this.s + this.fx.g3in[1], this.s + this.fx.g3in[1] + this.fx.g3in[2], this.fx.g3in[0]);
      if (this.speaker && !this.fx.card) this.card(this.s - 80, this.s + 1100);
    }
    flush() { // dispara todo lo pendiente en orden (incluidos eventos que se agenden al dispararse)
      for (let guard = 0; this.events.length && guard < 400; guard++) { this.events.sort((a, b) => a.t - b.t); this.events.shift().fn(); }
    }
    end(forced) {
      if (this.done) return;
      this.done = true;
      if (!this.entered) this.swap();
      this.anims.forEach(a => { try { a.cancel(); } catch (e) { /* ya terminada */ } });
      this.anims.length = 0;
      this.nodes.forEach(n => n.remove()); this.nodes.length = 0;
      this.cleanups.forEach(fn => fn()); this.cleanups.length = 0;
      for (const [o, b] of this.bases) { o.position.copy(b.p); o.rotation.copy(b.r); o.scale.copy(b.s); }
      this.bases.clear();
      this.from.classList.remove("vt-out"); this.from.style.visibility = ""; this.from.style.clipPath = "";
      this.to.classList.remove("vt-hold", "vt-arrive"); this.to.style.clipPath = "";
      document.documentElement.classList.remove("vt-on");
      if (forced) { this.kill(); if (window.Sky3D && Sky3D.land) Sky3D.land(); }
    }
    kill() { this.parts.length = 0; this.layers.length = 0; this.fields.length = 0; this.events.length = 0; this.dead = true; clear(); }
    step(now) {
      if (!this.done && quiet()) { this.flush(); this.end(true); return; }
      const t = (now - this.t0) / this.K, dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t = t;
      this.events.sort((a, b) => a.t - b.t);
      while (this.events.length && this.events[0].t <= t) this.events.shift().fn();
      if (this.dead) return;
      clear();
      g.setTransform(RES, 0, 0, RES, 0, 0);
      this.drawLayers(0, t, dt);
      this.particles(t, dt);
      g.setTransform(RES, 0, 0, RES, 0, 0); g.globalAlpha = 1; add(false);
      this.drawLayers(1, t, dt);
    }
    drawLayers(z, t, dt) {
      for (const l of this.layers) {
        if (l.z !== z || l.fin || t < l.t0) continue;
        const k = seg(t, l.t0, l.t1);
        g.setTransform(RES, 0, 0, RES, 0, 0); g.globalAlpha = 1; add(false);
        l.fn(k, t, dt);
        if (t >= l.t1) l.fin = true; // último cuadro con k = 1 garantizado
      }
    }
    particles(t, dt) {
      const P = this.parts, F = this.fields.filter(f => t >= f.t0 && t <= f.t1);
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.age += dt; const k = p.age / p.life;
        if (k >= 1) { P.splice(i, 1); continue; }
        if (p.path) { const q = p.path(k, p); p.x = q.x; p.y = q.y; if (q.rot != null) p.rot = q.rot; }
        else {
          for (const f of F) f.fn(p, dt, seg(t, f.t0, f.t1));
          p.vx += p.ax * dt; p.vy += (p.ay + p.grav) * dt;
          const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy *= dr;
          p.x += p.vx * dt + (p.sway ? Math.cos(p.age * p.swayF + p.ph) * p.sway * dt : 0);
          p.y += p.vy * dt;
          p.rot = p.face ? Math.atan2(p.vy, p.vx) : p.rot + p.vr * dt;
        }
        const a = p.alpha * Math.min(1, k / p.fin) * Math.min(1, (1 - k) / p.fout);
        if (a <= .01) continue;
        const s = p.size * RES, fy = p.flip ? Math.cos(p.age * p.flip + p.ph) : 1, c = Math.cos(p.rot), sn = Math.sin(p.rot);
        g.globalAlpha = a; add(p.add);
        g.setTransform(c * s, sn * s, -sn * s * fy, c * s * fy, p.x * RES, p.y * RES);
        g.drawImage(p.img, -p.img.width / 2, -p.img.height / 2);
      }
      g.globalAlpha = 1;
    }
    alive() {
      if (this.dead) return false;
      if (!this.done) return true;
      return this.t < this.dur + 6000 && (this.parts.length > 0 || this.layers.some(l => !l.fin));
    }
  }
  function loop(r, now) {
    if (r !== run && r.done) { return; }
    r.step(now);
    if (r.alive()) requestAnimationFrame(n => loop(r, n));
    else if (r === run) { clear(); run = null; }
  }
  function clear() { if (!g) return; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); }

  /* campos de fuerza para partículas */
  const swirl = (cx, cy, tang, pull, flat) => (p, dt) => { const dx = p.x - cx, dy = (p.y - cy) / (flat || 1), d = Math.hypot(dx, dy) + 40; p.vx += (-dy / d * tang - dx / d * pull) * dt; p.vy += (dx / d * tang - dy / d * pull) * dt * (flat || 1); };
  const attract = (x, y, pw) => (p, dt) => { p.vx += (x - p.x) * pw * dt; p.vy += (y - p.y) * pw * dt; };
  const wind = (ax, ay) => (p, dt) => { p.vx += ax * dt; p.vy += ay * dt; };
  // partícula que nace en un borde al azar
  function edgePoint(m) { m = m || 0; const s = Math.floor(rnd(0, 4)); return s === 0 ? { x: rnd(0, W), y: -m } : s === 1 ? { x: W + m, y: rnd(0, H) } : s === 2 ? { x: rnd(0, W), y: H + m } : { x: -m, y: rnd(0, H) }; }

  /* =================================================================
     LAS COREOGRAFÍAS (una por cada paso de diapositiva)
     ================================================================= */
  const FX = {};

  /* 1 → 2 · Obertura de la lira: cinco cuerdas doradas se pulsan; cada una
     se lleva lo que está a su altura convertido en notas, y las notas
     vuelan a armar la diapositiva siguiente. */
  FX.obertura = {
    dur: 2600, swap: 1150, g3out: ["blowL", 380, 1150], g3in: ["fall", 0, 1200],
    cam: { delay: 450, dur: 1700, lift: .6, path: k => ({ y: .9 * bell(k), ly: .6 * bell(k), gust: .25 + .6 * bell(k) }) },
    out(R) {
      const ys = [370, 455, 540, 625, 710], pl = ys.map((y, i) => 380 + i * 110);
      R.layer(0, 1500, (k, t) => {
        add(true);
        ys.forEach((y, i) => {
          const half = 1020 * E.out(seg(t, i * 45, 360 + i * 45)), tp = t - pl[i];
          const amp = tp > 0 ? 24 * Math.exp(-tp / 240) : 0, fl = tp > 0 ? Math.exp(-tp / 170) : 0, fade = 1 - seg(t, 1080, 1480);
          if (half < 2 || fade <= 0) return;
          g.beginPath();
          for (let s = 0; s <= 48; s++) { const u = s / 48, x = CX - half + u * 2 * half; const yy = y + amp * Math.sin(Math.PI * u) * Math.sin(tp * .07); s ? g.lineTo(x, yy) : g.moveTo(x, yy); }
          g.strokeStyle = rgba("gold", (.18 + .3 * fl) * fade); g.lineWidth = 10 + 10 * fl; g.stroke();
          g.strokeStyle = rgba("goldL", (.6 + .4 * fl) * fade); g.lineWidth = 2 + 2 * fl; g.stroke();
          if (tp > 0 && tp < 400) flash(CX, y, 260, .25 * fl, "gold");
        });
        add(false);
      });
      ys.forEach((y, i) => R.at(pl[i], () => R.emit(8, () => ({ img: Math.random() < .55 ? S.note : S.noteT, x: rnd(520, 1400), y: y + rnd(-10, 10), vx: rnd(-480, -160), vy: rnd(-280, -60), vr: rnd(-2, 2), drag: .7, life: rnd(1.1, 1.8), size: rnd(.6, 1), add: false, sway: 50, swayF: 6 }))));
      R.at(1080, () => ys.forEach(y => R.emit(16, () => ({ img: S.glow.gold, x: rnd(420, 1500), y: y + rnd(-5, 5), vx: rnd(-1000, -500), vy: rnd(-40, 40), drag: 1.5, life: rnd(.5, .9), size: rnd(.2, .4) }))));
      R.out.forEach(p => {
        let i = 0; ys.forEach((y, j) => { if (Math.abs(p.cy - y) < Math.abs(p.cy - ys[i])) i = j; });
        const t0 = Math.max(0, pl[i] - 40), tot = t0 + 780;
        R.move(p, [{}, { off: t0 / tot }, { y: 7, off: (t0 + 70) / tot }, { y: -5, off: (t0 + 150) / tot, e: ES.out }, { x: -420 - rnd(0, 180), y: -150 - rnd(0, 120), r: rnd(-10, 6), s: .9, o: 0, b: 8 }], { dur: tot });
      });
    },
    in(R) {
      rank(R.in, p => p.cy * 4 + p.cx);
      R.in.forEach(p => {
        const d = 300 + p.r * 650, x0 = 1990, y0 = p.cy + rnd(-220, 220), mx = (x0 + p.cx) / 2, my = Math.min(y0, p.cy) - 240;
        R.at(R.s + d - 360, () => R.emit1({ img: S.note, life: .38, size: 1.15, add: false, fin: .05, fout: .12, path: k => { const e = E.glide(k); const q = qb(x0, y0, mx, my, p.cx, p.cy, e); q.rot = .3 * Math.sin(k * 9); return q; } }));
        R.at(R.s + d, () => R.burst(p.cx, p.cy, "gold", 10, 300));
        R.move(p, [{ s: .9, y: 18, o: 0, b: 6 }, { s: 1.03, y: -4, o: 1, off: .5 }, {}], { delay: d, dur: 620, ease: ES.float, enter: true });
      });
    }
  };

  /* 2 → 3 · Ráfaga de plumas: un frente de plumas cruza de derecha a
     izquierda; lo viejo se inclina contra el viento y se lo lleva; detrás
     del frente ya está la diapositiva nueva. */
  FX.plumas = {
    dur: 2100, swap: 300, envOut: [1250, 1650], g3out: ["blowL", 300, 1200], g3in: ["fromR", 0, 1100],
    cam: { delay: 250, dur: 1500, lift: .5, path: k => ({ y: -.3 * bell(k), gust: .4 + .9 * bell(k) }) },
    out(R) {
      const front = t => lerp(2150, -380, E.glide(seg(t, 300, 1500)));
      R.front = front; R.to.style.clipPath = "inset(0 0 0 100%)";
      R.layer(300, 1520, (k, t) => { R.to.style.clipPath = `inset(0 0 0 ${Math.max(0, front(t) + 60).toFixed(0)}px)`; });
      R.layer(300, 1700, (k, t) => {
        const x = front(t), a = 1 - seg(t, 1450, 1700);
        add(true);
        for (let i = 0; i < 18; i++) { const y = 30 + i * 60 + Math.sin(i * 7.3 + t * .004) * 16, l = 260 + (i % 5) * 70; streak(x + l + 260, y, x + (i % 3) * 30, y, 2 + (i % 3), i % 4 ? "act" : "text", .55 * a); }
        flash(x + 80, CY, 520, .1 * a, "act");
        add(false);
      });
      R.stream(300, 1350, 150, () => ({ img: Math.random() < .5 ? S.feather : S.featherT, x: front(R.t) + rnd(0, 260), y: rnd(-20, 1100), vx: -rnd(1300, 1900), vy: rnd(-140, 140), vr: rnd(-3, 3), rot: rnd(-.4, .4), flip: rnd(4, 9), drag: .5, life: rnd(1, 1.4), size: rnd(.5, 1.1), add: false, fout: .3 }));
      R.stream(300, 1350, 110, () => ({ img: S.glow.act, x: front(R.t) + rnd(0, 320), y: rnd(0, 1080), vx: -rnd(1600, 2200), vy: rnd(-60, 60), life: rnd(.5, .8), size: rnd(.15, .3) }));
      R.out.forEach(p => {
        const tp = solve(front, p.x + p.w * .8, 300, 1500), tot = tp + 700;
        R.move(p, [{}, { x: 14, r: .7, off: 300 / tot, e: ES.float }, { x: 14, r: .7, off: tp / tot, e: ES.out }, { x: -560, y: rnd(-90, 60), r: rnd(-14, 4), s: .92, o: 0, b: 7 }], { dur: tot });
      });
    },
    in(R) {
      R.in.forEach(p => {
        const tp = solve(R.front, p.cx, 300, 1500);
        R.move(p, [{ x: 80, r: -1.5, o: 0, b: 5 }, {}], { delay: tp - R.s, dur: 650, ease: ES.in, enter: true });
      });
      R.at(1500, () => R.emit(16, () => ({ img: S.feather, x: rnd(0, 1920), y: rnd(-40, 300), vx: rnd(-160, -40), vy: rnd(30, 90), sway: 70, swayF: rnd(1.5, 3), flip: rnd(2, 4), rot: rnd(-.6, .6), life: rnd(2.2, 3.2), size: rnd(.5, .9), add: false, fin: .2 })));
    }
  };

  /* 3 → 4 · Soneto (toque): se abre un dominio de viento bajo el
     contenido, se comprime y estalla; todo sale lanzado al cielo y lo
     nuevo baja flotando. */
  FX.sonetoToque = {
    dur: 2500, swap: 1050, g3out: ["launch", 470, 1150], g3in: ["fall", 0, 1300],
    cam: { delay: 430, dur: 1800, lift: .4, path: k => ({ y: 2.4 * bell(k), ly: 3 * bell(k), gust: .4 + .9 * bell(k) }) },
    out(R) {
      const cx = 960, cy = 820;
      R.liftVeils(cx, cy, 220, 1450, 350);
      R.layer(0, 1250, (k, t) => {
        const grow = E.in(seg(t, 0, 380)), press = 1 - .1 * bell(seg(t, 230, 470)), b = seg(t, 470, 1150), ex = 1 + 1.2 * E.out(b);
        const sc = (.55 + .45 * grow) * press * ex;
        runeRing(cx, cy, 580 * sc, 135 * sc, t * .0013, grow * (1 - b));
      });
      R.layer(440, 900, k => { flash(cx, cy - 80, 750, .2 * (1 - k), "act"); flash(cx, cy, 320, .15 * (1 - k), "text"); }, 1);
      const cols = Array.from({ length: 34 }, () => ({ x: rnd(380, 1540), v: rnd(1.6, 3.2), l: rnd(120, 380), w: rnd(1.5, 4) }));
      R.layer(470, 1250, (k, t) => { add(true); cols.forEach(c => { const y = cy - (t - 470) * c.v; streak(c.x, y + c.l, c.x, y, c.w, "act", .7 * (1 - k)); }); add(false); });
      R.field(0, 470, swirl(cx, cy, 300, 900, .25));
      R.stream(0, 430, 100, () => ({ img: S.glow.act, x: rnd(200, 1720), y: rnd(560, 1080), life: .7, size: rnd(.15, .35) }));
      R.at(470, () => R.emit(32, () => ({ img: pick([S.leaf, S.feather, S.featherT, S.glow.act]), x: cx + rnd(-540, 540), y: cy + rnd(-60, 60), vx: rnd(-180, 180), vy: -rnd(1000, 1700), vr: rnd(-2, 2), drag: 1.4, grav: 420, life: rnd(1.1, 1.7), size: rnd(.5, 1), sway: 70, swayF: 3, flip: rnd(3, 7), add: false })));
      R.out.forEach(p => {
        const d = Math.hypot(p.cx - cx, (p.cy - cy) * 2.2), tl = 470 + Math.min(320, d * .22), tot = tl + 620;
        R.move(p, [{}, { y: 10, s: .985, off: 260 / tot, e: ES.float }, { y: 14, s: .98, off: tl / tot, e: ES.out }, { x: rnd(-140, 140), y: -(p.cy + p.h) - 280, r: rnd(-28, 28), s: .9, o: 0, b: 6 }], { dur: tot });
      });
    },
    in(R) {
      rank(R.in, p => Math.abs(p.cx - 960));
      R.in.forEach(p => {
        const sw = rnd(-6, 6);
        R.move(p, [{ y: -320, r: sw, o: 0, b: 6 }, { y: 26, r: -sw * .5, o: 1, off: .55, e: ES.float }, { y: -7, r: sw * .25, off: .8, e: ES.float }, {}], { delay: 80 + p.r * 420, dur: 1000, ease: "linear", enter: true });
      });
      R.stream(R.s, R.s + 800, 26, () => ({ img: S.feather, x: rnd(0, 1920), y: -40, vy: rnd(90, 170), vx: rnd(-60, 20), sway: 90, swayF: rnd(1.5, 3), flip: rnd(2, 4), life: rnd(2.2, 3), size: rnd(.5, .9), add: false }));
    }
  };

  /* 4 → 5 · Disparo cargado: la flecha se carga a la izquierda, sale con
     dos flechas gemelas y corta la diapositiva por la mitad; por la
     rendija se abre la siguiente. */
  FX.disparo = {
    dur: 2200, swap: 640, envOut: [950, 1500], g3out: ["split", 600, 1300], g3in: ["grow", 0, 1000],
    cam: { delay: 560, dur: 1250, lift: .3, path: k => ({ gust: .3 + 1.1 * bell(k) }) },
    out(R) {
      const ax = 170, ay = 540, fly = t => lerp(ax + 40, 2350, Math.pow(seg(t, 560, 780), .8));
      R.animate(R.from, [{ scale: 1 }, { scale: .99 }], { delay: 260, duration: 300, easing: ES.float });
      R.field(0, 560, attract(ax + 60, ay, 7));
      R.stream(0, 520, 130, () => { const a = rnd(0, TAU), r = rnd(160, 460); return { img: Math.random() < .3 ? S.glow.gold : S.glow.act, x: ax + 60 + Math.cos(a) * r, y: ay + Math.sin(a) * r, life: .5, size: rnd(.15, .35), drag: 2 }; });
      R.layer(0, 600, (k, t) => {
        const c = seg(t, 0, 560); add(true);
        for (let i = 0; i < 3; i++) { const q = (c * 2.2 + i / 3) % 1; ell(ax + 60, ay, 240 * (1 - q), 240 * (1 - q), 0, rgba("act", .55 * q * c), 2); }
        add(false); arrow(ax + 40, ay, 0, 170, c);
        flash(ax + 120, ay, 80 + 90 * c, .35 * c, "act");
      }, 1);
      R.layer(560, 1600, (k, t) => {
        const x = fly(t), tr = 1 - seg(t, 800, 1600);
        add(true); streak(ax, ay, x, ay, 22 * tr, "act", .5 * tr); streak(ax, ay, x, ay, 4 * tr, "text", tr); add(false);
        if (t < 790) arrow(x, ay, 0, 190, 1);
        [-1, 1].forEach(s => { const q = seg(t, 600, 860), a2 = s * .16; if (q > 0 && q < 1) { const d = lerp(80, 1500, q); arrow(ax + Math.cos(a2) * d, ay + Math.sin(a2) * d, a2, 120, .8 * (1 - q)); } });
      }, 1);
      R.at(560, () => { R.burst(ax + 120, ay, "text", 30, 700); R.burst(ax + 120, ay, "act", 30, 500); });
      R.at(640, () => {
        R.from.style.visibility = "hidden";
        ["inset(0 0 66.666% 0)", "inset(33.333% 0 33.333% 0)", "inset(66.666% 0 0 0)"].forEach((clip, j) => {
          const fragment = R.clone(R.from, clip);
          R.animate(fragment, [{ translate: "0px 0px", opacity: 1 }, { translate: `${(j - 1) * 55}px ${(j - 1) * 240}px`, opacity: 0 }], { duration: 650, easing: ES.out });
        });
        R.emit(24, () => ({ img: S.glow.act, x: rnd(200, 1900), y: ay + rnd(-4, 4), vx: rnd(-80, 80), vy: rnd(-1, 1) > 0 ? rnd(80, 380) : -rnd(80, 380), drag: 2.5, life: rnd(.6, 1.1), size: rnd(.15, .3) }));
      });
      R.to.style.clipPath = "inset(50% 0 50% 0)";
      R.layer(640, 1350, k => { const e = E.glide(k) * 50; R.to.style.clipPath = `inset(${(50 - e).toFixed(2)}% 0 ${(50 - e).toFixed(2)}% 0)`; });
      R.layer(640, 1400, k => { const h = E.glide(k) * 540; add(true); streak(0, ay - h, 1920, ay - h, 3, "act", .8 * (1 - k)); streak(1920, ay + h, 0, ay + h, 3, "act", .8 * (1 - k)); add(false); }, 1);
    },
    in(R) {
      rank(R.in, p => Math.abs(p.cy - 540));
      R.in.forEach(p => R.move(p, [{ s: .95, y: p.cy < 540 ? 40 : -40, o: 0, b: 5 }, {}], { delay: 100 + p.r * 420, dur: 720, ease: ES.in, enter: true }));
    }
  };

  /* 5 → 6 · Oda del viento (cambio de orador): flecha al centro, nace el
     ojo de la tormenta, absorbe el contenido y cambia de color (absorción
     elemental: turquesa → dorado), colapsa y estalla con la nueva escena. */
  FX.oda = {
    dur: 3000, swap: 1500, card: true, g3out: ["suck", 300, 1350], g3in: ["emerge", 0, 1100],
    cam: { delay: 260, dur: 2300, lift: .5, path: k => ({ z: 3.2 * bell(k), roll: .24 * Math.sin(k * TAU) * bell(k), gust: .6 + .9 * bell(k) }) },
    out(R) {
      const cx = 960, cy = 520;
      R.layer(0, 620, (k, t) => {
        const e = E.in(seg(t, 0, 260)), x = lerp(-120, cx, e), y = lerp(1200, cy, e), tr = 1 - seg(t, 260, 620);
        add(true); streak(-120, 1200, x, y, 8 * tr, "act", .8 * tr); add(false);
        if (t < 268) arrow(x, y, Math.atan2(cy - 1200, cx + 120), 170, 1);
      }, 1);
      R.layer(250, 700, k => flash(cx, cy, 220 + 320 * k, .2 * (1 - k), "act"), 1);
      R.layer(260, 1540, (k, t) => {
        const grow = E.out(seg(t, 260, 720)), col = seg(t, 850, 1250), col2 = E.in(seg(t, 1250, 1500));
        vortex(cx, cy, 560 * grow * (1 - col2 * .96), t * .006 * (1 + col2 * 3), 1 - col2 * .2, col);
        flash(cx, cy, 120 + 150 * col2, .12 + .15 * col2, col > .5 ? R.infusion : "act");
      });
      R.field(260, 1460, swirl(cx, cy, 2600, 1500, .78));
      R.stream(260, 1250, 100, () => { const e = edgePoint(20); return { img: pick([S.leaf, S.feather, S.glow.act, S.glow[R.infusion]]), x: e.x, y: e.y, vx: (cy - e.y) * .4, vy: (e.x - cx) * .3, drag: .8, life: rnd(1, 1.4), size: rnd(.4, .9), add: false, vr: rnd(-2, 2) }; });
      R.out.forEach(p => {
        const dx = p.cx - cx, dy = p.cy - cy, d = Math.hypot(dx, dy), a0 = Math.atan2(dy, dx), t0 = 300 + Math.min(330, d * .3), fr = [];
        for (let i = 0; i <= 8; i++) { const q = i / 8, e = eIn3(q) * .6 + q * .4, r = d * (1 - e), a = a0 + 2.6 * e; fr.push({ x: cx + Math.cos(a) * r - p.cx, y: cy + Math.sin(a) * r * .8 - p.cy, r: 300 * e, s: 1 - .96 * e, o: 1 - seg(q, .55, 1), off: q }); }
        R.move(p, fr, { delay: t0, dur: 850 });
      });
      R.at(1500, () => {
        R.emit(36, () => { const a = rnd(0, TAU), v = rnd(400, 1000); return { img: pick([S.glow[R.infusion], S.glow.act, S.feather, S.leaf]), x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.2, life: rnd(.6, 1.1), size: rnd(.3, .8), vr: rnd(-2, 2), add: false }; });
      });
      R.layer(1500, 2200, k => { const r = 80 + 1400 * E.out(k); add(true); ell(cx, cy, r, r * .78, 0, rgba(R.infusion, .3 * (1 - k)), 4 * (1 - k) + 1); ell(cx, cy, r * .82, r * .64, 0, rgba("act", .2 * (1 - k)), 2); add(false); flash(cx, cy, 420, .16 * (1 - k), R.infusion); }, 1);
      R.card(1560, 2850, { y: 520 });
    },
    in(R) {
      rank(R.in, p => Math.hypot(p.cx - 960, p.cy - 520));
      R.in.forEach(p => {
        const dx = 960 - p.cx, dy = 520 - p.cy;
        R.move(p, [{ x: dx * .9, y: dy * .9, s: .15, r: rnd(-60, 60), o: 0 }, { x: -dx * .04, y: -dy * .04, s: 1.03, r: 0, o: 1, off: .7, e: ES.float }, {}], { delay: 60 + p.r * 380, dur: 950, ease: "linear", enter: true });
      });
    }
  };

  /* 6 → 7 · Notas de la lira: aparece un pentagrama de viento; cada
     elemento se deshace en notas que corren por él y, del otro lado,
     las notas saltan a su lugar y se vuelven la diapositiva nueva. */
  FX.notas = {
    dur: 2600, swap: 900, g3out: ["blowL", 200, 1000], g3in: ["grow", 300, 1200],
    cam: { delay: 200, dur: 1900, lift: .5, path: k => ({ y: -.4 * bell(k), gust: .3 + .5 * bell(k) }) },
    out(R) {
      const sy = i => 430 + i * 44, wave = (x, t, i) => 18 * Math.sin(x * .006 - t * .004 + i * .3);
      R.staff = (x, t, i) => sy(i) + wave(x, t, i);
      R.layer(0, 2300, (k, t) => {
        const a = E.out(seg(t, 0, 350)) * (1 - seg(t, 1900, 2300)), reach = 1920 * E.glide(seg(t, 0, 420));
        add(true);
        for (let i = 0; i < 5; i++) { g.beginPath(); for (let s = 0; s <= 60; s++) { const x = 1920 - reach + s * reach / 60; const y = R.staff(x, t, i); s ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = rgba("gold", .4 * a); g.lineWidth = 2; g.stroke(); }
        add(false);
      });
      rank(R.out, p => p.cx);
      R.out.forEach(p => {
        const t0 = 150 + p.r * 450, n = Math.max(3, Math.min(9, Math.round(p.w * p.h / 30000)));
        R.move(p, [{}, { off: t0 / (t0 + 420) }, { s: .95, x: -36, o: 0, b: 6 }], { dur: t0 + 420, ease: ES.out });
        R.at(t0, () => R.emit(n, () => {
          const x0 = rnd(p.x, p.x + p.w), y0 = rnd(p.y, p.y + p.h), line = Math.floor(rnd(0, 5)), x1 = Math.max(-60, x0 - rnd(150, 300)), born = R.t;
          return { img: Math.random() < .6 ? S.note : S.noteT, life: rnd(1.1, 1.5), size: rnd(.7, 1), add: false, path: k => {
            const t = born + k * 1300;
            if (k < .35) { const e = E.glide(k / .35); return { x: lerp(x0, x1, e), y: lerp(y0, R.staff(x1, t, line), e) - 60 * bell(e), rot: 0 }; }
            const e = (k - .35) / .65, x = lerp(x1, -120, e * e); return { x, y: R.staff(x, t, line) - 14, rot: .15 * Math.sin(t * .02) };
          } };
        }));
      });
    },
    in(R) {
      rank(R.in, p => p.cx + p.cy * .3);
      R.in.forEach(p => {
        const d = 420 + p.r * 500, line = Math.floor(rnd(0, 5)), born = R.s + d - 420;
        R.at(born, () => R.emit(3, j => ({ img: j ? S.noteT : S.note, life: .42, size: .95, add: false, fout: .1, path: k => {
          const t = born + k * 420, xs = lerp(1980 + j * 60, p.cx + 260, Math.min(1, k / .6));
          if (k < .6) return { x: xs, y: R.staff(xs, t, line) - 14, rot: 0 };
          const e = E.glide((k - .6) / .4); return { x: lerp(p.cx + 260, p.cx + (j - 1) * 30, e), y: lerp(R.staff(p.cx + 260, t, line), p.cy, e) - 80 * bell(e), rot: 0 };
        } })));
        R.at(R.s + d, () => R.burst(p.cx, p.cy, "gold", 8, 260));
        R.move(p, [{ s: .97, y: 16, o: 0 }, {}], { delay: d, dur: 560, ease: ES.in, enter: true });
      });
    }
  };

  /* 7 → 8 · Corriente ascendente: columnas de viento suben desde el
     suelo; lo viejo se encoge, toma impulso y sale por arriba; lo nuevo
     sube con la corriente y se asienta con un leve rebote. */
  FX.corriente = {
    dur: 2400, swap: 1000, g3out: ["launch", 320, 1050], g3in: ["rise", 0, 1100],
    cam: { delay: 300, dur: 1900, lift: .4, path: k => ({ y: -1.6 * bell(k), ly: -1.1 * bell(k), gust: .4 + .8 * bell(k) }) },
    out(R) {
      const cols = [260, 610, 960, 1310, 1660];
      R.liftVeils(960, 1100, 150, 1800, 580);
      const pow = t => E.out(seg(t, 0, 350)) * (1 - seg(t, 1500, 2100));
      R.layer(0, 2100, (k, t) => {
        const a = pow(t); if (a <= 0) return;
        add(true);
        cols.forEach((x, i) => {
          const gr = g.createLinearGradient(0, 1080, 0, 0); gr.addColorStop(0, rgba("act", .2 * a)); gr.addColorStop(.6, rgba("act", .06 * a)); gr.addColorStop(1, rgba("act", 0));
          g.fillStyle = gr; g.fillRect(x - 110, 0, 220, 1080);
          for (let j = 0; j < 7; j++) { const y = 1120 - ((t * .9 + j * 170 + i * 60) % 1200); g.beginPath(); g.moveTo(x - 46, y + 26); g.lineTo(x, y); g.lineTo(x + 46, y + 26); g.strokeStyle = rgba("text", .35 * a); g.lineWidth = 3; g.stroke(); }
          for (let j = 0; j < 5; j++) { const xx = x + Math.sin(j * 9.1 + i) * 80, y = 1100 - ((t * 2.2 + j * 260) % 1300); streak(xx, y + 160, xx, y, 2, "act", .6 * a); }
        });
        add(false);
      });
      R.field(0, 1800, (p, dt) => { for (const x of cols) if (Math.abs(p.x - x) < 150) { p.vy -= 2600 * dt; break; } });
      R.stream(200, 1400, 90, () => ({ img: pick([S.leaf, S.feather, S.featherT, S.glow.act]), x: pick(cols) + rnd(-90, 90), y: 1100, vy: -rnd(300, 700), vx: rnd(-40, 40), drag: 1.2, sway: 80, swayF: 4, flip: rnd(3, 7), vr: rnd(-3, 3), life: rnd(1, 1.6), size: rnd(.5, 1), add: false }));
      rank(R.out, p => -(p.y + p.h));
      R.out.forEach(p => {
        const tl = 300 + p.r * 380, tot = tl + 760;
        R.move(p, [{}, { y: 12, s: .985, off: 260 / tot, e: ES.float }, { y: 12, s: .985, off: tl / tot, e: ES.out }, { x: rnd(-40, 40), y: -(p.y + p.h) * .5, r: rnd(-5, 5), off: (tl + 380) / tot }, { x: rnd(-60, 60), y: -(p.y + p.h) - 220, r: rnd(-9, 9), o: 0, b: 5 }], { dur: tot });
      });
    },
    in(R) {
      rank(R.in, p => p.cx);
      R.in.forEach(p => R.move(p, [{ y: 1080 - p.y + 140, r: rnd(-5, 5), o: 0, b: 4 }, { y: -16, r: 1, o: 1, off: .68, e: ES.float }, {}], { delay: 40 + p.r * 440, dur: 900, ease: ES.in, enter: true }));
    }
  };

  /* 8 → 9 · Dientes de león: cada elemento se deshace desde su borde en
     semillas que vuelan con el viento; lo nuevo se teje de izquierda a
     derecha mientras las semillas regresan a su borde. */
  FX.dientes = {
    dur: 2500, swap: 1050, g3out: ["blowL", 150, 1100], g3in: ["fromR", 100, 1200],
    cam: { delay: 150, dur: 2100, lift: .35, path: k => ({ gust: .3 + .6 * bell(k) }) },
    out(R) {
      const mask = "linear-gradient(to left, transparent 0%, transparent 40%, #000 60%, #000 100%)";
      R.field(0, 2500, wind(-160, -60));
      const rate = 260 / Math.sqrt(Math.max(1, R.out.length));
      rank(R.out, p => -p.cx);
      R.out.forEach(p => {
        const t0 = 100 + p.r * 420, dur = 720;
        setMask(R, p.el, mask);
        R.animate(p.el, [{ maskPosition: "0% 0%", webkitMaskPosition: "0% 0%" }, { maskPosition: "100% 0%", webkitMaskPosition: "100% 0%" }], { delay: t0, duration: dur, easing: "linear" });
        R.stream(t0 + dur / 6, t0 + dur * 5 / 6, rate * Math.min(1.6, Math.max(.5, p.h / 200)), () => {
          const q = seg(R.t, t0, t0 + dur), ex = p.x + p.w * (1.25 - 1.5 * q);
          return { img: S.seed, x: ex + rnd(-10, 10), y: rnd(p.y, p.y + p.h), vx: -rnd(80, 260), vy: -rnd(20, 140), sway: 50, swayF: rnd(2, 4), rot: rnd(-.5, .2), vr: rnd(-.6, .6), drag: .4, life: rnd(1.8, 2.8), size: rnd(.5, .85), add: false, fin: .05 };
        });
      });
    },
    in(R) {
      const mask = "linear-gradient(to left, transparent 0%, transparent 40%, #000 60%, #000 100%)";
      rank(R.in, p => p.cx);
      R.in.forEach(p => {
        const d = 80 + p.r * 460, dur = 820;
        setMask(R, p.el, mask);
        R.animate(p.el, [{ maskPosition: "100% 0%", webkitMaskPosition: "100% 0%" }, { maskPosition: "0% 0%", webkitMaskPosition: "0% 0%" }], { delay: d, duration: dur, easing: "linear", fill: "both" });
        R.stream(R.s + d + dur / 6, R.s + d + dur * 5 / 6, 60, () => {
          const q = seg(R.t + 250, R.s + d, R.s + d + dur), ex = p.x + p.w * (1.25 - 1.5 * (1 - q)), ey = rnd(p.y, p.y + p.h), x0 = ex - rnd(140, 320), y0 = ey + rnd(-90, 90);
          return { img: S.seed, life: .5, size: rnd(.5, .8), add: false, fin: .1, fout: .25, path: k => { const e = E.out(k); return { x: lerp(x0, ex, e), y: lerp(y0, ey, e) - 30 * bell(k), rot: -.3 * (1 - k) }; } };
        });
      });
    }
  };
  function setMask(R, el, m) {
    const s = el.style, prev = [s.maskImage, s.webkitMaskImage, s.maskSize, s.webkitMaskSize, s.maskRepeat, s.webkitMaskRepeat];
    s.maskImage = s.webkitMaskImage = m; s.maskSize = s.webkitMaskSize = "250% 100%"; s.maskRepeat = s.webkitMaskRepeat = "no-repeat";
    R.cleanups.push(() => { [s.maskImage, s.webkitMaskImage, s.maskSize, s.webkitMaskSize, s.maskRepeat, s.webkitMaskRepeat] = prev; });
  }

  /* 9 → 10 · Soneto (mantenido) (cambio de orador): un dominio enorme
     bajo el escenario; la cámara sale disparada al cielo (todo cae),
     entre nubes aparece el nuevo orador y se planea hacia la escena. */
  FX.sonetoMantenido = {
    dur: 3200, swap: 1500, card: true, g3out: ["drop", 500, 1400], g3in: ["fall", 0, 1500],
    cam: { delay: 470, dur: 2600, lift: .3, path: k => ({ y: 5.5 * bell(k), ly: 4.8 * bell(k), z: 1.5 * bell(k), gust: .5 + bell(k) }) },
    out(R) {
      const cx = 960, cy = 1000;
      R.liftVeils(cx, cy, 180, 1750, 750);
      R.layer(0, 950, (k, t) => {
        const grow = E.out(seg(t, 0, 420)), b = seg(t, 500, 950);
        runeRing(cx, cy, 1180 * grow * (1 + .3 * b), 200 * grow * (1 + .3 * b), t * .0009, grow * (1 - b));
        runeRing(cx, cy, 720 * grow, 120 * grow, -t * .0016, .75 * grow * (1 - b));
      });
      R.layer(470, 900, k => flash(cx, 900, 1300, .5 * (1 - k), "act"), 1);
      R.field(0, 500, swirl(cx, cy, 240, 700, .2));
      R.stream(0, 460, 100, () => ({ img: S.glow.act, x: rnd(0, 1920), y: rnd(700, 1080), life: .6, size: rnd(.15, .35) }));
      R.at(500, () => R.emit(60, () => ({ img: pick([S.leaf, S.feather, S.glow.act]), x: rnd(100, 1820), y: rnd(900, 1080), vy: -rnd(900, 1600), vx: rnd(-200, 200), drag: 1.6, grav: 300, life: rnd(1.2, 2), size: rnd(.5, 1), flip: rnd(3, 6), add: false })));
      R.rigid(R.out, [{}, { y: 14, s: .99, off: .37, e: ES.out }, { y: -1250, s: .96, o: 0 }], { dur: 1350 });
      const lines = Array.from({ length: 40 }, () => ({ x: rnd(0, 1920), v: rnd(1.4, 3), l: rnd(140, 420), o: rnd(0, 1300), w: rnd(1.5, 3.5) }));
      R.layer(500, 2900, (k, t) => {
        const up = t < 1500, a = up ? bell(seg(t, 500, 1700)) : .75 * bell(seg(t, 1300, 2900));
        add(true);
        lines.forEach(L => { const y = up ? ((L.o + (t - 500) * L.v) % 1500) - 200 : 1300 - ((L.o + (t - 1500) * L.v * .7) % 1500); streak(L.x, up ? y - L.l : y + L.l, L.x, y, L.w, "text", .45 * a); });
        add(false);
      });
      const clouds = Array.from({ length: 9 }, (_, i) => ({ x: rnd(-100, 2000), y0: rnd(-300, 1300), s: rnd(2.2, 4), v: rnd(.5, 1.1) }));
      R.layer(650, 2700, (k, t) => {
        const a = bell(k);
        clouds.forEach(c => { const y = t < 1500 ? c.y0 + (t - 650) * c.v : c.y0 + 850 * c.v - (t - 1500) * c.v * .8; g.globalAlpha = .22 * a; g.drawImage(S.cloud, c.x - 128 * c.s, y - 128 * c.s, 256 * c.s, 256 * c.s); });
        g.globalAlpha = 1;
      });
      R.stream(1000, 2000, 30, () => ({ img: S.feather, x: rnd(0, 1920), y: rnd(100, 980), vx: rnd(-50, 50), vy: rnd(-30, 30), sway: 40, swayF: 2, flip: rnd(2, 4), rot: rnd(-1, 1), life: rnd(1.6, 2.4), size: rnd(.5, .9), add: false, fin: .3 }));
      R.card(1100, 2700, { y: 500 });
    },
    in(R) {
      R.rigid(R.in, [{ y: 240, s: .97, o: 0 }, {}], { dur: 1000, ease: ES.in, enter: true });
    }
  };

  /* 10 → 11 · Cuatro vientos (DEMUX): una sola corriente entra, llega al
     nodo dorado de selección y se reparte en cuatro ramas Y0…Y3; cada
     rama barre su franja y deja la diapositiva nueva. */
  FX.cuatro = {
    dur: 2400, swap: 30, envOut: [1450, 1850], g3out: ["blowR", 300, 1300], g3in: ["fromL", 100, 1300],
    cam: { delay: 100, dur: 1800, lift: .4, path: k => ({ gust: .4 + .6 * bell(k) }) },
    out(R) {
      const nx = 640, bands = [135, 405, 675, 945], st = [380, 500, 620, 740];
      const xm = t => lerp(-60, nx, E.out(seg(t, 0, 380)));
      const xb = (b, t) => lerp(nx, 2160, E.glide(seg(t, st[b], st[b] + 900)));
      const rev = (b, t) => (t < st[b] ? Math.min(xm(t), nx) : xb(b, t));
      R.rev = rev; R.bands = bands;
      const clip = t => { const r = bands.map((_, b) => Math.max(0, rev(b, t)).toFixed(0)); return `polygon(0px 0px, ${r[0]}px 0px, ${r[0]}px 270px, ${r[1]}px 270px, ${r[1]}px 540px, ${r[2]}px 540px, ${r[2]}px 810px, ${r[3]}px 810px, ${r[3]}px 1080px, 0px 1080px)`; };
      R.to.style.clipPath = clip(0);
      R.layer(0, 1700, (k, t) => { R.to.style.clipPath = clip(t); });
      const draw = (path, a, t) => { add(true); g.lineCap = "round"; g.strokeStyle = rgba("act", .22 * a); g.lineWidth = 22; path(); g.stroke(); g.strokeStyle = rgba("text", .9 * a); g.lineWidth = 4; path(); g.stroke(); g.setLineDash([26, 80]); g.lineDashOffset = -t * .9; g.strokeStyle = rgba("act", a); g.lineWidth = 7; path(); g.stroke(); g.setLineDash([]); add(false); };
      R.layer(0, 2300, (k, t) => {
        const fade = 1 - seg(t, 1700, 2300);
        draw(() => { g.beginPath(); g.moveTo(-60, 540); g.lineTo(xm(t), 540); }, fade, t);
        bands.forEach((y, b) => {
          if (t < st[b]) return;
          const x = xb(b, t);
          g.save(); g.beginPath(); g.rect(0, 0, x, 1080); g.clip();
          draw(() => { g.beginPath(); g.moveTo(nx, 540); g.bezierCurveTo(nx + 140, 540, nx + 150, y, nx + 300, y); g.lineTo(2200, y); }, fade, t);
          g.restore();
          if (x < 2100) flash(x, y, 160, .45 * fade, "act");
        });
        const on = seg(t, 280, 420) * fade; diamond(nx, 540, 26, rgba("gold", on)); flash(nx, 540, 200, .5 * on * (1 + .3 * Math.sin(t * .02)), "gold");
      }, 1);
      R.out.forEach(p => {
        let b = 0; bands.forEach((y, j) => { if (Math.abs(p.cy - y) < Math.abs(p.cy - bands[b])) b = j; });
        const tp = solve(t => rev(b, t), p.cx, 0, st[b] + 900), tot = tp + 520;
        R.move(p, [{}, { off: tp / tot, e: ES.out }, { x: 280, y: (bands[b] - 540) * .08, r: rnd(-4, 4), o: 0, b: 6 }], { dur: tot });
      });
      R.stream(600, 1500, 60, () => { const b = Math.floor(rnd(0, 4)), y = bands[b], born = R.t; return { img: S.glow.text, life: .7, size: .4, path: k => { const x = xb(b, born + k * 700); const u = clamp01((x - nx) / 300); return { x: Math.min(x, lerp(nx, 2100, k)), y: u < 1 ? lerp(540, y, E.glide(u)) : y }; } }; });
    },
    in(R) {
      R.in.forEach(p => {
        let b = 0; R.bands.forEach((y, j) => { if (Math.abs(p.cy - y) < Math.abs(p.cy - R.bands[b])) b = j; });
        const tp = solve(t => R.rev(b, t), p.cx, 0, 2000);
        R.move(p, [{ x: -90, o: 0, b: 4 }, {}], { delay: Math.max(0, tp - R.s), dur: 620, ease: ES.in, enter: true });
      });
    }
  };

  /* 11 → 12 · Remolino de hojas: un anillo de hojas gira alrededor del
     centro; lo viejo entra en la órbita y sale despedido; lo nuevo baja
     en espiral desde la órbita hasta su lugar. */
  FX.remolino = {
    dur: 2400, swap: 1000, g3out: ["spin", 150, 1100], g3in: ["unspin", 0, 1200],
    cam: { delay: 200, dur: 1900, lift: .5, path: k => ({ roll: .17 * bell(k), gust: .5 + .6 * bell(k) }) },
    out(R) {
      const cx = 960, cy = 540;
      R.emit(130, () => { const a0 = rnd(0, TAU), r0 = rnd(380, 980), w = rnd(2.5, 4.5) * (Math.random() < .85 ? 1 : 1.3), ph = rnd(0, 1); return { img: Math.random() < .7 ? S.leaf : S.featherT, life: rnd(1.8, 2.4), size: rnd(.6, 1.1), add: false, fin: .15, fout: .3, flip: rnd(2, 5), path: k => { const a = a0 + w * k * (1 + .3 * ph), r = r0 * (.75 + .5 * bell(k)) + 120 * k; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * .62, rot: a + Math.PI / 2 }; } }; });
      R.layer(0, 2000, (k, t) => { const a = bell(k); add(true); for (let i = 0; i < 4; i++) { const r = 160 + i * 90; g.beginPath(); g.ellipse(cx, cy, r, r * .62, 0, t * .003 * (1 + i * .3) + i, t * .003 * (1 + i * .3) + i + 2.4); g.strokeStyle = rgba(i % 2 ? "gold" : "act", .35 * a); g.lineWidth = 3; g.stroke(); } add(false); flash(cx, cy, 300, .15 * a, "act"); });
      rank(R.out, p => -Math.hypot(p.cx - cx, p.cy - cy));
      R.out.forEach(p => {
        const dx = p.cx - cx, dy = (p.cy - cy) / .62, d0 = Math.hypot(dx, dy) + 1, a0 = Math.atan2(dy, dx), fr = [];
        for (let i = 0; i <= 6; i++) { const q = i / 6, a = a0 + 1.5 * q, r = d0 * (1 + .8 * q) + 180 * q; fr.push({ x: cx + Math.cos(a) * r - p.cx, y: cy + Math.sin(a) * r * .62 - p.cy, r: 45 * q, s: 1 - .15 * q, o: 1 - seg(q, .45, 1), off: q }); }
        R.move(p, fr, { delay: 120 + p.r * 320, dur: 860, ease: ES.out });
      });
    },
    in(R) {
      const cx = 960, cy = 540;
      rank(R.in, p => Math.hypot(p.cx - cx, p.cy - cy));
      R.in.forEach(p => {
        const dx = p.cx - cx, dy = (p.cy - cy) / .62, d0 = Math.hypot(dx, dy) + 1, a0 = Math.atan2(dy, dx), fr = [];
        for (let i = 0; i <= 6; i++) { const q = i / 6, a = a0 - 1.3 * (1 - q), r = d0 + (d0 * .8 + 220) * (1 - q); fr.push({ x: cx + Math.cos(a) * r - p.cx, y: cy + Math.sin(a) * r * .62 - p.cy, r: -40 * (1 - q), s: .85 + .15 * q, o: seg(q, 0, .45), off: q }); }
        R.move(p, fr, { delay: 60 + p.r * 340, dur: 900, ease: ES.glide, enter: true });
      });
    }
  };

  /* 12 → 13 · Cizalla de viento (limitaciones): el viento choca con un
     error; la diapositiva vibra en coral, se agrieta y sus fragmentos
     salen volando; lo nuevo llega con un temblor que se enfría. */
  FX.cizalla = {
    dur: 2200, swap: 720, g3out: ["shatter", 0, 1100], g3in: ["jitter", 0, 700],
    cam: { delay: 0, dur: 1700, lift: .4, path: k => ({ x: .1 * Math.sin(k * 80) * (1 - seg(k, 0, .25)), y: .08 * Math.sin(k * 67) * (1 - seg(k, 0, .25)), gust: .6 * bell(k) }) },
    out(R) {
      R.animate(R.from, [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ translate: i === 7 ? "0px 0px" : `${(i % 2 ? -1 : 1) * (10 - i)}px ${(Math.sin(i * 3) * 4).toFixed(1)}px` })), { duration: 330, delay: 0 });
      R.layer(0, 400, (k, t) => {
        const a = .5 * (1 - k), sd = Math.floor(t / 45);
        for (let i = 0; i < 7; i++) { const y = ((Math.sin(sd * 12.9 + i * 78.2) + 1) / 2) * 1080; g.fillStyle = rgba("err", a * (.25 + (i % 3) * .1)); g.fillRect(0, y, 1920, 3 + (i % 3) * 4); }
        const gr = g.createRadialGradient(CX, CY, 400, CX, CY, 1100); gr.addColorStop(0, rgba("err", 0)); gr.addColorStop(1, rgba("err", .35 * (1 - k))); g.fillStyle = gr; g.fillRect(0, 0, 1920, 1080);
      }, 1);
      const nx = 4, ny = 3, P = [];
      for (let i = 0; i <= nx; i++) { P[i] = []; for (let j = 0; j <= ny; j++) { const inner = i > 0 && i < nx && j > 0 && j < ny; const ex = i > 0 && i < nx, ey = j > 0 && j < ny; P[i][j] = [i * 480 + (ex ? rnd(-130, 130) : 0), j * 360 + (ey ? rnd(-110, 110) : 0)]; if (!inner) { /* bordes rectos */ } } }
      const hub = [1100, 470];
      R.at(330, () => {
        R.from.style.visibility = "hidden";
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          const q = [P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1]], c = q.reduce((a, v) => [a[0] + v[0] / 4, a[1] + v[1] / 4], [0, 0]);
          const sh = R.clone(R.from, `polygon(${q.map(v => `${v[0].toFixed(0)}px ${v[1].toFixed(0)}px`).join(",")})`);
          const dx = c[0] - hub[0], dy = c[1] - hub[1], d = Math.hypot(dx, dy) + 1;
          R.animate(sh, [{ translate: "0px 0px", rotate: "0deg", opacity: 1 }, { translate: `${(dx / d * 40).toFixed(0)}px ${(dy / d * 40).toFixed(0)}px`, rotate: "0deg", opacity: 1, offset: .12 }, { translate: `${(dx / d * 520 - 700).toFixed(0)}px ${(dy / d * 420 + 160).toFixed(0)}px`, rotate: `${rnd(-32, 32).toFixed(1)}deg`, opacity: 0 }], { delay: d * .22, duration: 780, easing: ES.out });
        }
        R.burst(hub[0], hub[1], "err", 40, 900); R.burst(hub[0], hub[1], "text", 20, 600);
      });
      R.layer(330, 560, k => {
        add(true); g.lineCap = "round";
        for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) { if (i < nx && j > 0 && j < ny) { g.beginPath(); g.moveTo(...P[i][j]); g.lineTo(...P[i + 1][j]); g.strokeStyle = rgba("err", .9 * (1 - k)); g.lineWidth = 3; g.stroke(); } if (j < ny && i > 0 && i < nx) { g.beginPath(); g.moveTo(...P[i][j]); g.lineTo(...P[i][j + 1]); g.strokeStyle = rgba("text", .8 * (1 - k)); g.lineWidth = 2; g.stroke(); } }
        add(false); flash(hub[0], hub[1], 600, .6 * (1 - k), "err");
      }, 1);
    },
    in(R) {
      R.layer(R.s, R.s + 800, k => { g.fillStyle = rgba("err", .14 * (1 - E.out(k))); g.fillRect(0, 0, 1920, 1080); }, 1);
      rank(R.in, p => p.cx);
      R.in.forEach(p => R.move(p, [{ x: 10, o: 0, b: 3 }, { x: -7, o: 1, off: .2 }, { x: 4, off: .4 }, { x: -2, off: .62 }, {}], { delay: 60 + p.r * 380, dur: 620, ease: ES.float, enter: true }));
    }
  };

  /* 13 → 14 · Torbellino elemental (cambio de orador): cuatro orbes
     (dato, control, problema, marfil) giran desde las esquinas, se
     funden en un remolino y la onda empuja todo hacia fuera. */
  FX.torbellino = {
    dur: 3100, swap: 1450, card: true, g3out: ["blast", 950, 1600], g3in: ["emerge", 0, 1100],
    cam: { delay: 0, dur: 2700, lift: .5, path: k => ({ z: 3.4 * bell(k), roll: .12 * Math.sin(k * Math.PI * 3) * bell(k), gust: .5 + bell(k) }) },
    out(R) {
      const cx = 960, cy = 540, cols = ["act", R.infusion, "act", "ivory"], start = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const orb = (i, t) => { const e = E.in(seg(t, 0, 780)) * .97 + seg(t, 0, 780) * .03, a0 = Math.atan2(start[i][1] * 650, start[i][0] * 1100), r = 1260 * (1 - e), a = a0 + 2.3 * e; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * .6 }; };
      R.layer(0, 820, (k, t) => {
        for (let i = 0; i < 4; i++) {
          for (let j = 14; j >= 0; j--) { const q = orb(i, t - j * 18); g.globalAlpha = .7 * (1 - j / 15); add(true); g.drawImage(S.glow[cols[i]], q.x - 40 + j, q.y - 40, 80 - j * 3, 80 - j * 3); }
          const q = orb(i, t); g.globalAlpha = 1; flash(q.x, q.y, 120, .7, cols[i]);
        }
        add(false); g.globalAlpha = 1;
      }, 1);
      R.layer(740, 1080, (k, t) => {
        const R0 = 260 * (1 - .55 * k); add(true); g.lineCap = "round";
        cols.forEach((c, i) => { g.beginPath(); for (let s = 0; s <= 30; s++) { const q = s / 30, an = t * .02 + i * TAU / 4 + q * 3, r = R0 * q; const x = cx + Math.cos(an) * r, y = cy + Math.sin(an) * r * .7; s ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = rgba(c, .85); g.lineWidth = 9; g.stroke(); });
        add(false); flash(cx, cy, 200 + 300 * k, .4 + .5 * k, "text");
      }, 1);
      R.layer(1000, 1750, k => { const r = 60 + 1500 * E.out(k); add(true); cols.forEach((c, i) => ell(cx, cy, Math.max(1, r - i * 46), Math.max(1, (r - i * 46) * .66), 0, rgba(c, .65 * (1 - k)), 10 * (1 - k) + 1)); add(false); flash(cx, cy, 900, .45 * (1 - k), "text"); }, 1);
      R.at(1000, () => R.emit(120, () => { const a = rnd(0, TAU), v = rnd(600, 1700); return { img: Math.random() < .5 ? S.glow[pick(cols)] : S.leaf, x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .7, drag: 2.4, life: rnd(.8, 1.5), size: rnd(.3, .9), vr: rnd(-6, 6), add: true }; }));
      R.field(0, 900, swirl(cx, cy, 500, 300, .7));
      R.out.forEach(p => {
        const dx = p.cx - cx, dy = p.cy - cy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, tb = 1000 + d * .17, tot = tb + 640;
        R.move(p, [{}, { x: -ux * 16, y: -uy * 16, s: .985, off: 480 / tot, e: ES.float }, { x: -ux * 26, y: -uy * 26, s: .975, off: tb / tot, e: ES.out }, { x: ux * 950, y: uy * 720, r: rnd(-30, 30), s: 1.1, o: 0, b: 6 }], { dur: tot });
      });
      R.card(1250, 2950, { y: 520 });
    },
    in(R) {
      rank(R.in, p => -Math.hypot(p.cx - 960, p.cy - 540));
      R.in.forEach(p => {
        const dx = p.cx - 960, dy = p.cy - 540, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
        R.move(p, [{ x: ux * 700, y: uy * 520, s: .82, r: rnd(-14, 14), o: 0 }, { x: -ux * 10, y: -uy * 10, s: 1.01, r: 0, o: 1, off: .74, e: ES.float }, {}], { delay: 200 + p.r * 380, dur: 920, ease: ES.in, enter: true });
      });
    }
  };

  /* 14 → 15 · Planeo: un planeador de plumas cruza en diagonal; la
     escena vieja se inclina y se aleja con él; la nueva entra girando
     desde el otro lado, como al aterrizar. */
  FX.planeo = {
    dur: 2300, swap: 950, g3out: ["bank", 250, 1150], g3in: ["bankIn", 0, 1200],
    cam: { delay: 150, dur: 2000, lift: .4, path: k => ({ roll: -.2 * bell(k), y: -.6 * bell(k), gust: .4 + .8 * bell(k) }) },
    out(R) {
      const G = t => { const e = E.glide(seg(t, 150, 1450)); const u = 1 - e; return { x: u * u * u * 2200 + 3 * u * u * e * 1300 + 3 * u * e * e * 640 + e * e * e * -300, y: u * u * u * 120 + 3 * u * u * e * 160 + 3 * u * e * e * 920 + e * e * e * 880, e }; };
      R.layer(150, 1450, (k, t) => {
        const a = G(t), b = G(t - 16), ang = Math.atan2(a.y - b.y, a.x - b.x), flap = .75 + .25 * Math.sin(t * .025);
        g.save(); g.translate(a.x, a.y); g.rotate(ang + Math.PI); g.translate(-a.x, -a.y);
        wing(a.x, a.y, 1, flap, .55, .9); wing(a.x, a.y, -1, flap, .55, .9); g.restore();
        flash(a.x, a.y, 220, .4, "goldL");
      }, 1);
      R.layer(150, 1700, (k, t) => { add(true); for (let j = 0; j < 24; j++) { const q1 = G(t - j * 22), q0 = G(t - j * 22 - 22); streak(q0.x, q0.y + Math.sin(j) * 40, q1.x, q1.y + Math.sin(j) * 40, 6 - j * .2, "act", .5 * (1 - j / 24) * (1 - seg(t, 1400, 1700))); } add(false); });
      R.stream(200, 1400, 90, () => { const q = G(R.t); return { img: pick([S.feather, S.featherT, S.glow.act]), x: q.x + rnd(-60, 60), y: q.y + rnd(-60, 60), vx: rnd(-40, 80), vy: rnd(20, 120), sway: 60, swayF: 2.5, flip: rnd(2, 5), rot: rnd(-1, 1), drag: .9, life: rnd(1.4, 2.4), size: rnd(.4, .9), add: false }; });
      R.persp(R.from); R.persp(R.to);
      R.rigid(R.out, [{}, { ry: 18, x: -560, y: 70, z: -320, o: 0, b: 6 }], { delay: 250, dur: 900, ease: ES.out });
    },
    in(R) {
      R.rigid(R.in, [{ ry: -16, x: 600, y: -50, z: -280, o: 0, b: 4 }, { o: 1, off: .45 }, {}], { dur: 1150, ease: ES.glide, enter: true });
    }
  };

  /* 15 → 16 · Bus de viento: ocho carriles paralelos (un bus); una ráfaga
     por carril se lleva su franja de contenido y una segunda ola
     entrega, carril por carril, la diapositiva nueva. */
  FX.bus = {
    dur: 2300, swap: 480, g3out: ["blowL", 120, 1000], g3in: ["fromR", 0, 1100],
    cam: { delay: 100, dur: 1700, lift: .3, path: k => ({ gust: .6 + .8 * bell(k) }) },
    out(R) {
      const N = 8, lane = i => 67.5 + i * 135, ord = [0, 3, 1, 5, 2, 6, 4, 7], st = ord.map(o => 120 + o * 60);
      const h1 = (i, t) => lerp(2120, -420, E.in(seg(t, st[i], st[i] + 700)) * .3 + seg(t, st[i], st[i] + 700) * .7);
      const h2 = (i, t) => lerp(2150, -380, seg(t, st[i] + 360, st[i] + 1120));
      R.lane = lane; R.st = st; R.N = N;
      R.layer(0, 2100, (k, t) => {
        const a = seg(t, 0, 220) * (1 - seg(t, 1600, 2100));
        g.setLineDash([14, 22]); g.lineDashOffset = t * .4;
        for (let i = 0; i <= N; i++) { g.beginPath(); g.moveTo(0, i * 135); g.lineTo(1920, i * 135); g.strokeStyle = rgba("gold", .22 * a); g.lineWidth = 2; g.stroke(); }
        g.setLineDash([]); add(true);
        for (let i = 0; i < N; i++) {
          const y = lane(i), x = h1(i, t), x2 = h2(i, t);
          if (t > st[i] && t < st[i] + 760) { streak(x + 520, y, x, y, 34, "act", .35); streak(x + 380, y, x, y, 6, "text", .95); flash(x, y, 90, .5, "act"); }
          if (t > st[i] + 360 && t < st[i] + 1180) { streak(x2 + 300, y, x2, y, 16, "gold", .3); streak(x2 + 200, y, x2, y, 3, "goldL", .8); }
          for (let j = 0; j < 4; j++) { const px = x + 120 + j * 110; if (t > st[i] && px < 1920 && t < st[i] + 760) { g.fillStyle = rgba("text", .8); g.fillRect(px, y - 4, 30, 8); } }
        }
        add(false);
      }, 1);
      R.out.forEach(p => {
        let i = 0; for (let j = 0; j < N; j++) if (Math.abs(p.cy - lane(j)) < Math.abs(p.cy - lane(i))) i = j;
        const tp = solve(t => h1(i, t), p.x + p.w, st[i], st[i] + 700), tot = tp + 600;
        R.move(p, [{}, { off: tp / tot, e: ES.out }, { x: -1150, o: 0, b: 4 }], { dur: tot });
      });
    },
    in(R) {
      R.in.forEach(p => {
        let i = 0; for (let j = 0; j < R.N; j++) if (Math.abs(p.cy - R.lane(j)) < Math.abs(p.cy - R.lane(i))) i = j;
        R.move(p, [{ x: 1050, o: 0, b: 4 }, { x: -12, o: 1, off: .8 }, {}], { delay: Math.max(0, R.st[i] + 380 - R.s), dur: 760, ease: "cubic-bezier(.15,.8,.25,1)", enter: true });
      });
    }
  };

  /* 16 → 17 · Ranuras de tiempo (TDM): un cursor dorado recorre seis
     ranuras; en su turno, cada ranura se barre de arriba abajo y
     transmite su parte de la diapositiva nueva. */
  FX.ranuras = {
    dur: 2400, swap: 60, envOut: [1500, 1900], g3out: ["drop", 150, 1600], g3in: ["fall", 0, 1500],
    cam: { delay: 100, dur: 2000, lift: .3, path: k => ({ x: .05 * Math.sin(k * Math.PI * 6) * bell(k), gust: .3 + .5 * bell(k) }) },
    out(R) {
      const N = 6, w = 320, tj = j => 150 + j * 230, fill = (j, t) => 1080 * E.glide(seg(t, tj(j), tj(j) + 320));
      R.tj = tj; R.w = w;
      const clip = t => { const y = Array.from({ length: N }, (_, j) => fill(j, t).toFixed(0)); let pts = ["0px 0px", "1920px 0px"]; for (let j = N - 1; j >= 0; j--) pts.push(`${(j + 1) * w}px ${y[j]}px`, `${j * w}px ${y[j]}px`); return `polygon(${pts.join(",")})`; };
      R.to.style.clipPath = clip(0);
      R.layer(0, tj(N - 1) + 340, (k, t) => { R.to.style.clipPath = clip(t); });
      R.layer(0, 2200, (k, t) => {
        const a = seg(t, 0, 150) * (1 - seg(t, 1700, 2200));
        g.font = `600 26px ${Style.get("--font-data")}`; g.textAlign = "center"; g.textBaseline = "middle";
        for (let j = 0; j < N; j++) {
          const on = t >= tj(j) && t < tj(j) + 330, x = j * w;
          g.strokeStyle = rgba("gold", (on ? .9 : .35) * a); g.lineWidth = on ? 3 : 1.5; g.strokeRect(x + 10, 18, w - 20, 44);
          g.fillStyle = rgba(on ? "goldL" : "muted", a); g.fillText(`t${"₀₁₂₃₄₅"[j]}`, x + w / 2, 41);
          if (on) {
            const y = fill(j, t), q = seg(t, tj(j), tj(j) + 330);
            const gr = g.createLinearGradient(0, y - 220, 0, y); gr.addColorStop(0, rgba("act", 0)); gr.addColorStop(1, rgba("act", .3 * bell(q))); g.fillStyle = gr; g.fillRect(x, y - 220, w, 220);
            add(true); streak(x, y, x + w, y, 4, "text", .9 * bell(q)); add(false);
            g.fillStyle = rgba("gold", .12 * bell(q)); g.fillRect(x, 0, w, 1080);
          }
        }
        const cur = clamp01((t - 150) / (N * 230)) * 1920; add(true); streak(cur, 1080, cur, 0, 3, "gold", .7 * a); add(false);
      }, 1);
      R.out.forEach(p => { const j = Math.min(N - 1, Math.max(0, Math.floor(p.cx / w))); R.move(p, [{}, { off: tj(j) / (tj(j) + 320) }, { y: 40, o: 0, b: 4 }], { dur: tj(j) + 320, ease: ES.out }); });
    },
    in(R) {
      R.in.forEach(p => { const j = Math.min(5, Math.max(0, Math.floor(p.cx / R.w))); R.move(p, [{ y: -34, o: 0, b: 3 }, {}], { delay: R.tj(j) + 120 - R.s, dur: 520, ease: ES.in, enter: true }); });
    }
  };

  /* 17 → 18 · La lira despierta (simulador): la lira alada aparece,
     se rasguea y sus ondas de sonido despejan la escena; luego se posa
     en el sello de la esquina y lo nuevo resuena desde el centro. */
  FX.lira = {
    dur: 2700, swap: 1150, card: true, g3out: ["recede", 0, 1150], g3in: ["grow", 0, 1200],
    cam: { delay: 200, dur: 2200, lift: .3, path: k => ({ z: -1.6 * bell(k), gust: .3 + .6 * bell(k) }) },
    out(R) {
      const cx = 960, cy = 500, rips = [520, 650, 780];
      const img = R.node(`<img src="assets/ornamentos/lira-alada.png" alt="">`, "vt-lyre");
      R.animate(img, [
        { opacity: 0, scale: .55, translate: "0px 50px" },
        { opacity: 1, scale: 1, translate: "0px 0px", offset: .17, easing: ES.float },
        { opacity: 1, scale: 1.06, translate: "0px 0px", offset: .2 },
        { opacity: 1, scale: 1, translate: "0px 0px", offset: .43, easing: ES.glide },
        { opacity: 0, scale: .12, translate: `${59 - cx}px ${1028 - cy}px` }
      ], { duration: 2650, easing: "linear" });
      R.layer(500, 1600, (k, t) => {
        add(true); g.lineCap = "round";
        rips.forEach((ts, i) => { const r = (t - ts) * 1.7; if (r > 0 && r < 1500) { const a = 1 - r / 1500; ell(cx, cy, r, r * .9, 0, rgba(i % 2 ? "gold" : "act", .7 * a), 7 * a + 1); ell(cx, cy, r * .96, r * .86, 0, rgba("text", .35 * a), 2); } });
        add(false);
      }, 1);
      R.layer(480, 900, k => flash(cx, cy, 500, .6 * bell(k), "goldL"), 1);
      if (R.speaker) R.card(1250, 2650, { y: 540 });
      R.at(520, () => R.emit(40, i => { const a = i / 40 * TAU, v = rnd(480, 760); return { img: i % 2 ? S.note : S.noteT, x: cx + Math.cos(a) * 120, y: cy + Math.sin(a) * 100, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 1.3, life: rnd(1.2, 1.7), size: rnd(.8, 1.1), add: false, vr: rnd(-2, 2) }; }));
      R.out.forEach(p => {
        const dx = p.cx - cx, dy = p.cy - cy, d = Math.hypot(dx, dy) || 1, tr = 520 + d / 1.7, tot = tr + 380;
        R.move(p, [{}, { s: .95, o: .35, b: 3, off: 440 / tot, e: ES.float }, { s: .95, o: .35, b: 3, off: tr / tot, e: ES.out }, { x: dx / d * 100, y: dy / d * 100, s: 1.07, o: 0, b: 8 }], { dur: tot });
      });
    },
    in(R) {
      R.layer(R.s, R.s + 900, (k, t) => { add(true); [0, 160].forEach((o, i) => { const r = Math.max(0, (t - R.s - o) * 1.8); if (r < 1400) ell(960, 500, r, r * .9, 0, rgba(i ? "gold" : "act", .5 * (1 - r / 1400)), 4); }); add(false); }, 1);
      R.in.forEach(p => { const d = Math.hypot(p.cx - 960, p.cy - 500); R.move(p, [{ s: .97, y: 16, o: 0 }, {}], { delay: d / 1.8, dur: 560, ease: ES.in, enter: true }); });
    }
  };

  /* 18 → 19 · Alas de luz (conclusiones): la luz se reúne en el centro,
     se abren dos alas enormes que cubren el escenario, destello, y al
     plegarse dejan las conclusiones bajo una lluvia de plumas. */
  FX.alas = {
    dur: 2900, swap: 1350, g3out: ["recede", 0, 1300], g3in: ["grow", 0, 1400],
    cam: { delay: 300, dur: 2400, lift: .4, path: k => ({ y: 1.2 * bell(k), z: 2 * bell(k), gust: .4 + .7 * bell(k) }) },
    out(R) {
      const cx = 960, cy = 600;
      R.field(0, 450, attract(cx, cy, 6));
      R.stream(0, 420, 120, () => { const e = edgePoint(0); return { img: Math.random() < .5 ? S.glow.goldL || S.glow.gold : S.glow.text, x: e.x, y: e.y, life: .6, size: rnd(.2, .45), drag: 1 }; });
      const open = t => seg(t, 400, 1200), fold = t => seg(t, 1400, 2100);
      R.layer(380, 2150, (k, t) => {
        const o = open(t), f = fold(t), sc = lerp(.35, 2.5, E.out(o)), a = seg(t, 380, 600) * (1 - f);
        flash(cx, cy, 300 + 900 * o, .35 * a, "goldL");
        wing(cx, cy - 200 * E.glide(f), 1, o * (1 - .6 * f), sc, a); wing(cx, cy - 200 * E.glide(f), -1, o * (1 - .6 * f), sc, a);
      }, 1);
      R.layer(1100, 2000, (k, t) => { const a = t < 1400 ? .9 * E.float(seg(t, 1100, 1400)) : .9 * (1 - E.out(seg(t, 1400, 2000))); g.fillStyle = rgba("act", a * .18); g.fillRect(0, 0, 1920, 1080); }, 1);
      R.at(1420, () => R.emit(70, () => ({ img: Math.random() < .6 ? S.feather : S.featherT, x: rnd(100, 1820), y: rnd(-60, 700), vx: rnd(-50, 50), vy: rnd(30, 110), sway: 80, swayF: rnd(1.5, 3), flip: rnd(2, 4), rot: rnd(-1, 1), life: rnd(2.4, 3.6), size: rnd(.6, 1.3), add: false, fin: .15 })));
      R.out.forEach(p => {
        const dx = p.cx - cx, dy = p.cy - cy, d = Math.hypot(dx, dy) || 1;
        R.move(p, [{}, { x: -dx / d * 22, y: -dy / d * 22, s: .97, o: .5, off: .35, e: ES.float }, { x: -dx / d * 30, y: -dy / d * 30, s: .95, o: 0, b: 6 }], { dur: 1250 });
      });
    },
    in(R) {
      rank(R.in, p => p.cy * 3 + p.cx);
      R.in.forEach(p => R.move(p, [{ s: 1.05, o: 0, b: 6 }, {}], { delay: 250 + p.r * 420, dur: 820, ease: ES.float, enter: true }));
    }
  };

  /* 19 → 20 · Despedida: brisa de cecilias; lo viejo cae suave como
     pétalos, entra la luz del atardecer y lo último aparece en calma. */
  FX.despedida = {
    dur: 2500, swap: 950, card: true, g3out: ["drop", 100, 1400], g3in: ["rise", 0, 1300],
    cam: { delay: 200, dur: 2100, lift: .5, path: k => ({ y: -.5 * bell(k), gust: .2 + .3 * bell(k) }) },
    out(R) {
      R.stream(0, 1900, 55, () => { const top = Math.random() < .75; return { img: S.petal, x: top ? rnd(0, 2000) : 1960, y: top ? -40 : rnd(0, 700), vx: -rnd(40, 130), vy: rnd(70, 170), sway: 70, swayF: rnd(1.5, 3), flip: rnd(1.5, 3.5), rot: rnd(0, TAU), vr: rnd(-1.5, 1.5), life: rnd(3.2, 4.6), size: rnd(.5, 1), add: false, fin: .1 }; });
      R.layer(0, 2500, k => {
        const a = bell(k);
        add(true);
        for (let i = 0; i < 5; i++) { const x = 200 + i * 300; g.save(); g.translate(x, -100); g.rotate(-.42); const gr = g.createLinearGradient(0, 0, 0, 1500); gr.addColorStop(0, rgba("goldL", .1 * a)); gr.addColorStop(1, rgba("goldL", 0)); g.fillStyle = gr; g.fillRect(-50 - i * 10, 0, 100 + i * 20, 1500); g.restore(); }
        add(false);
      });
      if (R.speaker) R.card(900, 2450, { y: 560 });
      R.out.forEach(p => { const sw = rnd(-5, 5); R.move(p, [{}, { x: -30, y: 50, r: sw * .5, o: .6, off: .5 }, { x: -70, y: 130, r: sw, o: 0, b: 4 }], { delay: rnd(0, 450), dur: 950, ease: ES.float }); });
    },
    in(R) {
      rank(R.in, p => p.cy * 3 + p.cx);
      R.in.forEach(p => R.move(p, [{ y: -20, o: 0, b: 3 }, {}], { delay: 120 + p.r * 520, dur: 900, ease: ES.float, enter: true }));
    }
  };

  /* ← Retorno (al retroceder): brisa contraria, rápida y discreta. */
  FX.retorno = {
    dur: 1050, swap: 300,
    cam: { delay: 0, dur: 1000, lift: .6, path: k => ({ gust: .5 * bell(k) }) },
    out(R) {
      R.layer(0, 900, (k, t) => { add(true); for (let i = 0; i < 12; i++) { const y = 60 + i * 88, x = lerp(-500, 2300, E.glide(seg(t, i * 18, 700 + i * 18))); streak(x - 420, y, x, y, 2 + (i % 3), "act", .45 * bell(k)); } add(false); }, 1);
      R.stream(0, 600, 70, () => ({ img: S.feather, x: -40, y: rnd(0, 1080), vx: rnd(1100, 1600), vy: rnd(-80, 80), flip: rnd(4, 8), vr: rnd(-3, 3), drag: .6, life: rnd(.9, 1.3), size: rnd(.5, .9), add: false }));
      rank(R.out, p => -p.cx);
      R.out.forEach(p => R.move(p, [{}, { x: 340, r: rnd(-3, 6), o: 0, b: 6 }], { delay: p.r * 180, dur: 520, ease: ES.out }));
    },
    in(R) {
      rank(R.in, p => p.cx);
      R.in.forEach(p => R.move(p, [{ x: -150, o: 0, b: 4 }, {}], { delay: p.r * 220, dur: 560, ease: ES.in, enter: true }));
    }
  };

  /* ⇢ Salto (Inicio, Fin, S, enlaces): túnel de viento radial. */
  FX.salto = {
    dur: 1400, swap: 480,
    cam: { delay: 0, dur: 1350, lift: 1, path: k => ({ gust: 1.2 * bell(k) }) },
    out(R) {
      const L = Array.from({ length: 60 }, () => ({ a: rnd(0, TAU), v: rnd(.8, 1.6), o: rnd(0, 1), w: rnd(1.5, 4) }));
      R.layer(0, 1300, (k, t) => { const a = bell(k); add(true); L.forEach(l => { const q = (l.o + t * .0011 * l.v) % 1, r0 = 80 + q * q * 1300, r1 = r0 + 120 + q * 300; streak(CX + Math.cos(l.a) * r0, CY + Math.sin(l.a) * r0, CX + Math.cos(l.a) * r1, CY + Math.sin(l.a) * r1, l.w, q > .5 ? "act" : "text", .6 * a * q); }); add(false); }, 1);
      R.rigid(R.out, [{}, { s: 1.2, o: 0, b: 8 }], { dur: 560, ease: ES.out });
    },
    in(R) { R.rigid(R.in, [{ s: .82, o: 0, b: 4 }, {}], { dur: 820, ease: ES.in, enter: true }); }
  };

  /* qué coreografía va en cada paso (por id de la diapositiva de origen) */
  const PLAN = {
    "portada": "obertura", "problema": "plumas", "definiciones": "sonetoToque", "mux41": "disparo",
    "relacion": "oda", "tabla-mux": "notas", "expresion-mux": "corriente", "compuertas-mux": "dientes",
    "ejemplo": "sonetoMantenido", "demux": "cuatro", "tabla-demux": "remolino", "compuertas-demux": "disparo",
    "limitaciones": "torbellino", "funcion-tabla": "planeo", "funcion-circuito": "bus", "app-buses": "ranuras",
    "app-telecom": "lira", "simulador": "alas", "conclusiones": "despedida"
  };

  /* =================================================================
     API pública
     ================================================================= */
  function mount() {
    if (ready) return true;
    const stage = document.getElementById("stage"); if (!stage || !window.Style) return false;
    layer = document.createElement("div"); layer.id = "vientos"; layer.setAttribute("aria-hidden", "true");
    cv = document.createElement("canvas"); layer.appendChild(cv);
    stage.insertBefore(layer, document.getElementById("hud"));
    g = cv.getContext("2d");
    readTokens(); makeSprites();
    ready = true; return true;
  }
  function size() {
    RES = Math.max(.5, Math.min(1.5, ((window.Deck && Deck.scale) || 1) * (window.devicePixelRatio || 1)));
    const w = Math.round(W * RES), h = Math.round(H * RES);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  const quiet = () => { const r = document.documentElement; return r.classList.contains("calm") || r.classList.contains("instant") || matchMedia("(prefers-reduced-motion: reduce)").matches; };

  const Vientos = {
    PLAN, FX,
    get busy() { return !!(run && !run.done); },
    /* devuelve { cam, start } o null (el motor usa entonces su transición mínima) */
    play(o) {
      if (quiet() || !mount()) return null;
      if (run) { run.end(true); run.kill(); run = null; }
      const adj = o.toIdx === o.fromIdx + 1 && o.dir > 0;
      const name = Vientos.force || (adj ? PLAN[o.from.id] : o.dir < 0 && o.toIdx === o.fromIdx - 1 ? "retorno" : "salto");
      const fx = FX[name] || FX.salto;
      size();
      const r = new Run(fx, o);
      r.name = name;
      o.from.el.classList.add("vt-out");
      o.to.el.classList.add("vt-hold", "vt-arrive");
      document.documentElement.classList.add("vt-on");
      run = r;
      const K = r.K, cam = Object.assign({}, fx.cam);
      const path = cam.path;
      if (path) cam.path = k => {
        const pose = path(k), settled = {};
        for (const key in pose) settled[key] = pose[key] * (key === "gust" ? .8 : .55);
        return settled;
      };
      cam.delay = (cam.delay || 0) * K; cam.dur = (cam.dur || fx.dur * .8) * K;
      return { cam, start: () => r.start() };
    },
    /* completa al instante la transición en curso (navegación rápida) */
    finish() { if (run && !run.done) { run.flush(); run.end(true); } },
    get current() { return run ? { name: run.name, t: run.t, done: run.done, parts: run.parts.length } : null; }
  };
  window.Vientos = Vientos;
})();

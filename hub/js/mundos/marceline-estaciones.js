"use strict";
/* =====================================================================
   Marceline · estaciones (S₁S₀ = 00): las cuatro estaciones de Ana.
   Especificación §1.5–1.8 (docs/ESPECIFICACION-MUNDOS.md); contrato: docs/MUNDOS-CONTRATO.md.
   - mux-0-0: el MUX es un amplificador de guitarra de 4 entradas (jacks, perilla de 0° a 270°,
     vúmetro), con cables de colores, palancas S₁/S₀, un parlante como Y y la setlist como tabla.
   - demux-0-0: el mismo amplificador reparte un cable D entre cuatro parlantes.
   - mux-0-1 / demux-0-1: el abanico N:1 / 1:N con cuerdas de colores y trazo de marcador.
   Cinco toques propios en las dos primeras; las otras dos usan la coreografía fase().
   Todas las clases propias llevan el prefijo mce- (la escena usa mc-).
   Solo representación: todos los bits salen de Logic().
   ===================================================================== */
(() => {
  const NOTAS = ["Mi", "La", "Re", "Sol"];
  const COLOR = ["#EE5B74", "#F2C14E", "#62ACF2", "#6FD196"];          // rojo, amarillo, azul, verde
  const NOMBRE_COLOR = ["rojo", "amarillo", "azul", "verde"];
  const W = 1304, H = 605;                                              // zona del componente (unidades de estación)
  const LIBRE = new URLSearchParams(location.search).has("libre");
  // hay movimiento: ni «Omitir transición» ni movimiento reducido (ni ?still)
  const mover = () => !reduced && !MOTION.skip;
  const enEscena = el => !!el.closest(".st")?.classList.contains("cur");

  /* =====================================================================
     Trazo a mano: todo es determinista (misma semilla, mismo garabato)
     ===================================================================== */
  function azar(semilla) {
    let s = (Math.imul(semilla | 0, 2654435761) >>> 0) || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  const n1 = v => Math.round(v * 10) / 10;
  const P = p => `${n1(p[0])} ${n1(p[1])}`;
  // curva suave que pasa por los puntos (Catmull-Rom → Bézier): misma cantidad de puntos, mismos comandos
  function curva(pts, cerrada = false) {
    const n = pts.length, Q = i => cerrada ? pts[(i % n + n) % n] : pts[clamp(i, 0, n - 1)];
    let d = "M" + P(pts[0]);
    for (let i = 0; i < (cerrada ? n : n - 1); i++) {
      const a = Q(i - 1), b = Q(i), c = Q(i + 1), e = Q(i + 2);
      d += `C${P([b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6])} ${P([c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6])} ${P(c)}`;
    }
    return d + (cerrada ? "Z" : "");
  }
  const poli = pts => "M" + pts.map(P).join("L");
  const acum = pts => pts.reduce((a, p, i) => (a.push(i ? a[i - 1] + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), a), []);
  // remuestrea una polilínea en m puntos equidistantes
  function remuestrear(pts, m) {
    const L = acum(pts), T = L[L.length - 1], out = [];
    let j = 0;
    for (let i = 0; i < m; i++) {
      const s = T * i / (m - 1);
      while (j < pts.length - 2 && L[j + 1] < s) j++;
      const k = (s - L[j]) / ((L[j + 1] - L[j]) || 1);
      out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * k, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * k]);
    }
    return out;
  }
  const normales = pts => pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
  // contorno cerrado → abierto, con un hueco exacto entre el final y el principio
  function abrir(pts, hueco) {
    const ext = [...pts, pts[0]], L = acum(ext), corte = L[L.length - 1] - hueco, out = [];
    for (let i = 0; i < ext.length - 1; i++) {
      out.push(ext[i]);
      if (L[i + 1] > corte) {
        const k = (corte - L[i]) / ((L[i + 1] - L[i]) || 1);
        if (k > .05) out.push([ext[i][0] + (ext[i + 1][0] - ext[i][0]) * k, ext[i][1] + (ext[i + 1][1] - ext[i][1]) * k]);
        break;
      }
    }
    return out;
  }
  /* caja a mano: esquinas redondeadas desiguales, bordes que ondulan apenas y la abertura de 4 px
     (§1.8: los bordes nunca cierran). El hueco suma el grosor del trazo: las puntas redondas lo cierran. */
  function contorno(x, y, w, h, { r = [24, 14, 28, 18], jit = 1.6, semilla = 1, hueco = 4, trazo = 5, inicio = .06 } = {}) {
    const rnd = azar(semilla), f = [rnd() * 6.3, rnd() * 6.3], k = [2 + Math.round(rnd() * 2), 5 + Math.round(rnd() * 3)];
    const [a, b, c, e] = r.map(v => Math.min(v, w / 2, h / 2));
    const pts = [];
    const recta = (x0, y0, x1, y1) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14)); for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); };
    const arco = (cx, cy, q, a0) => { const n = Math.max(2, Math.round(q / 6)); for (let i = 0; i < n; i++) { const t = a0 + Math.PI / 2 * i / n; pts.push([cx + Math.cos(t) * q, cy + Math.sin(t) * q]); } };
    recta(x + a, y, x + w - b, y); arco(x + w - b, y + b, b, -Math.PI / 2);
    recta(x + w, y + b, x + w, y + h - c); arco(x + w - c, y + h - c, c, 0);
    recta(x + w - c, y + h, x + e, y + h); arco(x + e, y + h - e, e, Math.PI / 2);
    recta(x, y + h - e, x, y + a); arco(x + a, y + a, a, Math.PI);
    const L = acum([...pts, pts[0]]), T = L[L.length - 1], nn = normales([pts[pts.length - 1], ...pts, pts[0]]).slice(1, -1);
    const ond = pts.map((p, i) => { const s = L[i] / T * Math.PI * 2, o = jit * (Math.sin(s * k[0] + f[0]) + .5 * Math.sin(s * k[1] + f[1])); return [p[0] + nn[i][0] * o, p[1] + nn[i][1] * o]; });
    if (!hueco) return curva(ond, true);
    const i0 = Math.round(inicio * ond.length) % ond.length;
    return curva(abrir([...ond.slice(i0), ...ond.slice(0, i0)], hueco + trazo));
  }
  // círculo a mano (con abertura opcional)
  function aro(cx, cy, r, { jit = 1, semilla = 1, hueco = 0, trazo = 3, inicio = -.25 } = {}) {
    const rnd = azar(semilla), f0 = rnd() * 6.3, f1 = rnd() * 6.3, n = Math.max(12, Math.round(r / 3));
    const pts = Array.from({ length: n }, (_, i) => {
      const t = (inicio + i / n) * Math.PI * 2, q = r + jit * (.7 * Math.sin(2 * t + f0) + .3 * Math.sin(3 * t + f1));
      return [cx + Math.cos(t) * q, cy + Math.sin(t) * q];
    });
    return hueco ? curva(abrir(pts, hueco + trazo)) : curva(pts, true);
  }
  // línea a mano por varios puntos
  function aMano(pts, { jit = 1.2, semilla = 1, paso = 16 } = {}) {
    const T = acum(pts).pop(), m = Math.max(2, Math.round(T / paso) + 1), q = remuestrear(pts, m), nn = normales(q), rnd = azar(semilla);
    return curva(q.map((p, i) => { const o = i === 0 || i === m - 1 ? 0 : (rnd() - .5) * 2 * jit; return [p[0] + nn[i][0] * o, p[1] + nn[i][1] * o]; }));
  }
  const bezier = (a, b, c, d, n = 16) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [0, 1].map(k => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]);
  });
  // eje de un cable que cuelga entre dos puntos: sale y llega horizontal; «caida» = cuánto cuelga
  function ejeCable(x0, y0, x1, y1, caida, n = 18) {
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n, s = Math.sin(Math.PI * Math.pow(t, .82)) ** 2, h = (1 - Math.cos(Math.PI * t)) / 2;
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * h + caida * s];
    });
  }
  // la onda que vibra alrededor de un cable con señal
  function ondaCable(eje, { amp = 9, vueltas = 4.5, fase = 0, semilla = 1 } = {}) {
    const m = Math.round(vueltas * 9) + 1, q = remuestrear(eje, m), nn = normales(q), rnd = azar(semilla);
    return curva(q.map((p, i) => {
      const t = i / (m - 1), env = Math.sin(Math.PI * t) ** .6, a = amp * env * (.8 + rnd() * .4) * Math.sin(t * vueltas * 2 * Math.PI + fase);
      return [p[0] + nn[i][0] * a, p[1] + nn[i][1] * a];
    }));
  }
  // garabato que tacha un texto (para la nota que se borra)
  function tachon(bb, semilla = 3) {
    const rnd = azar(semilla), pts = [];
    const n = Math.max(4, Math.round(bb.width / 16));
    for (let i = 0; i <= n; i++) pts.push([bb.x - 6 + (bb.width + 12) * i / n, bb.y + bb.height * (i % 2 ? .78 : .3) + (rnd() - .5) * 6]);
    return curva(pts);
  }
  // ángulos de la perilla (0° = arriba, horario): canal 2·S₁+S₀ → 0°, 90°, 180°, 270° de recorrido
  const ANG = ch => -135 + 90 * ch;
  const APAGADA = -165;
  const polar = (x, y, a, R) => [x + Math.sin(a * Math.PI / 180) * R, y - Math.cos(a * Math.PI / 180) * R];

  /* =====================================================================
     Piezas SVG
     ===================================================================== */
  const grupo = (p, cls, at = {}) => mk("g", { class: cls, ...at }, p);
  // trazo de marcador: la pasada y su eco (la segunda pasada, corrida y más fina)
  function marcador(p, d, cls, at = {}) {
    const a = mk("path", { class: cls, d, ...at }, p);
    mk("path", { class: cls + " mce-eco", d }, p);
    return a;
  }
  // texto SVG con subíndices: "I_0" → I con el 0 bajado (las fuentes a mano no traen ₀₁₂₃).
  // tam = tamaño real en unidades de estación (30 = 20 px a 1280 × 720)
  function rotulo(t, s, tam = 34) {
    t.textContent = "";
    t.style.fontSize = tam + "px";
    String(s).split(/_(\d+)/).forEach((parte, i) => {
      if (!parte) return;
      if (i % 2) { mk("tspan", { class: "mce-sub", dy: n1(tam * .24) }, t, parte); mk("tspan", { dy: n1(-tam * .24) }, t, " "); }
      else mk("tspan", {}, t, parte);
    });
    return t;
  }
  function texto(p, x, y, s, cls, tam, at = {}) { return rotulo(mk("text", { class: cls, x, y, ...at }, p), s, tam); }
  // trama de crayón (rejilla de los gabinetes); cada figura tiene sus propios ids
  function trama(svg, id) {
    const defs = mk("defs", {}, svg);
    const pt = mk("pattern", { id, width: 14, height: 14, patternUnits: "userSpaceOnUse", patternTransform: "rotate(38)" }, defs);
    mk("path", { class: "mce-trama-l", d: "M0 3H14M0 10H14" }, pt);
    return `url(#${id})`;
  }
  // jack: círculo de borde doble con un halo que brilla al encender
  function jack(p, x, y, s) {
    const g = grupo(p, "mce-jack");
    mk("circle", { class: "mce-jack-halo", cx: x, cy: y, r: 34, style: `transform-origin:${x}px ${y}px` }, g);
    mk("circle", { class: "mce-jack-fondo", cx: x, cy: y, r: 22 }, g);
    marcador(g, aro(x, y, 22, { semilla: s, jit: .9 }), "mce-jack-aro");
    mk("path", { class: "mce-jack-aro2", d: aro(x, y, 14, { semilla: s + 7, jit: .5 }) }, g);
    mk("circle", { class: "mce-jack-hueco", cx: x, cy: y, r: 7 }, g);
    return g;
  }
  // plug de guitarra entrando a un jack (dir = 1: viene de la izquierda; -1: de la derecha)
  function plug(p, x, y, s, dir = 1) {
    const g = grupo(p, "mce-plug"), X = v => x - dir * v;
    mk("path", { class: "mce-plug-funda", d: contorno(Math.min(X(64), X(30)), y - 12, 34, 24, { r: [8, 5, 7, 6], hueco: 0, semilla: s, jit: .5 }) }, g);
    mk("path", { class: "mce-plug-metal", d: `M${X(30)} ${y - 8}H${X(14)}V${y + 8}H${X(30)}Z` }, g);
    mk("path", { class: "mce-plug-raya", d: `M${X(24)} ${y - 8}V${y + 8}M${X(19)} ${y - 8}V${y + 8}` }, g);
    return g;
  }
  /* cable de color: funda de tinta, color, brillo, onda dibujada a mano y chispas.
     tenso = con señal (vale 1); si no, flojo y caído. */
  function cable(p, { x0, y0, x1, y1, caida, color, s, chispas = 3, onda = {}, guia = null }) {
    const g = grupo(p, "mce-cable", { style: `--c:${color}` });
    const ejeT = ejeCable(x0, y0, x1, y1, 7), ejeF = ejeCable(x0, y0, x1, y1, caida);
    const dT = curva(ejeT), dF = curva(ejeF);
    const clases = ["mce-cable-halo", "mce-cable-tinta", "mce-cable-color", "mce-cable-brillo"];
    // tramo fijo antes de que el cable cuelgue (de donde viene, con su etiqueta)
    if (guia != null) clases.forEach(c => mk("path", { class: c + " mce-guia", d: `M${guia} ${y0}H${x0 + 2}` }, g));
    const capas = clases.map(c => mk("path", { class: c, d: dF }, g));
    const ondas = grupo(g, "mce-ondas");
    mk("path", { class: "mce-onda a", d: ondaCable(ejeT, { semilla: s, ...onda }) }, ondas);
    mk("path", { class: "mce-onda b", d: ondaCable(ejeT, { semilla: s + 5, fase: Math.PI, ...onda }) }, ondas);
    const ch = grupo(g, "mce-chispas");
    const rnd = azar(s + 11);
    for (let i = 0; i < chispas; i++) {
      const q = ejeT[Math.round((.22 + .6 * i / Math.max(1, chispas - 1)) * (ejeT.length - 1))], dy = (i % 2 ? 1 : -1) * (17 + rnd() * 6);
      const c = grupo(ch, "mce-chispa", { style: `transform-origin:${n1(q[0])}px ${n1(q[1] + dy)}px;--i:${i}` });
      mk("path", { d: starPath(q[0], q[1] + dy, 9 + rnd() * 3, 11 + rnd() * 3, .2) }, c);
    }
    let tenso = null;
    return {
      g, ejeT, ejeF, get tenso() { return tenso; },
      set(v) {
        v = !!v;
        if (v === tenso) return;
        tenso = v;
        capas.forEach(e => e.style.setProperty("d", `path("${v ? dT : dF}")`));
        g.classList.toggle("tenso", v);
      }
    };
  }
  // insignia redonda con el bit (Courier Prime)
  function insignia(p, x, y, s, r = 25) {
    const g = grupo(p, "mce-insignia");
    mk("path", { class: "mce-insignia-fondo", d: aro(x, y, r, { semilla: s, jit: .8 }) }, g);
    const t = mk("text", { class: "mce-dato mce-insignia-t", x, y: y + 11 }, g, "0");
    return { g, set(v) { t.textContent = v; g.classList.toggle("v1", !!v); } };
  }
  // trozo de cinta de papel con algo escrito (las etiquetas de los cables)
  function cinta(p, x, y, w, escrito, s) {
    const g = grupo(p, "mce-cinta-cable", { transform: `rotate(${n1((azar(s)() - .5) * 7)} ${x + w / 2} ${y})` });
    const rnd = azar(s + 2), h = 22;
    // arriba y abajo rectos; los lados rasgados (zigzag irregular)
    const der = Array.from({ length: 7 }, (_, i) => [x + w + (i % 2 ? -4 : 2) + (rnd() - .5) * 3, y - h + 2 * h * i / 6]);
    const izq = Array.from({ length: 7 }, (_, i) => [x + (i % 2 ? 4 : -2) + (rnd() - .5) * 3, y + h - 2 * h * i / 6]);
    mk("path", { class: "mce-cinta-papel", d: poli([...der, ...izq]) + "Z" }, g);
    mk("path", { class: "mce-cinta-arruga", d: `M${x + 10} ${y - h + 7}L${x + w * .45} ${y - h + 5}M${x + w * .3} ${y + h - 6}L${x + w - 12} ${y + h - 8}` }, g);
    texto(g, x + w / 2, y + 11, escrito, "mce-rot mce-cinta-t", 32);
    return g;
  }
  /* nota al margen (Rock Salt, inclinada): vibra 100 ms al tocarla y cambia de texto con un borrado */
  const TAM_NOTA = 30;
  function nota(p, x, y, ang, s, cls = "") {
    const g = grupo(p, "mce-nota mc-activa " + cls, { transform: `translate(${x} ${y}) rotate(${ang})` });
    const v = grupo(g, "mce-nota-v");
    const t = mk("text", { class: "mce-nota-t", x: 0, y: 0 }, v);
    const n = { g, v, t, actual: null, tok: 0, anims: [], tachon: null };
    rotulo(t, s, TAM_NOTA); n.actual = s;
    g.addEventListener("click", () => vibrar(v));
    return n;
  }
  function vibrar(el) {
    if (!mover()) return;
    el.animate([{ transform: "none" }, { transform: "translate(2px,-1px) rotate(1.6deg)" }, { transform: "translate(-2px,1px) rotate(-1.4deg)" }, { transform: "translate(1px,0) rotate(.6deg)" }, { transform: "none" }], { duration: 100, easing: "linear" });
  }
  // cambia el texto de una nota: tachón, borrado y escritura nueva
  function reescribir(n, s) {
    if (n.actual === s) return;
    n.actual = s;
    const tok = ++n.tok;
    n.anims.forEach(a => a.cancel()); n.anims = [];
    n.tachon?.remove(); n.tachon = null;
    if (!mover() || !enEscena(n.g)) { rotulo(n.t, s, TAM_NOTA); return; }
    let bb; try { bb = n.t.getBBox(); } catch { bb = null; }
    if (!bb || !bb.width) { rotulo(n.t, s, TAM_NOTA); return; }
    const z = mk("path", { class: "mce-tachon", d: tachon(bb, tok + 2) }, n.v);
    n.tachon = z;
    const L = z.getTotalLength();
    const a1 = z.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }], { duration: 220, easing: "ease-in", fill: "forwards" });
    n.anims.push(a1);
    a1.finished.then(() => {
      if (tok !== n.tok) return;
      const a2 = n.v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: "forwards" });
      n.anims.push(a2);
      return a2.finished.then(() => {
        if (tok !== n.tok) return;
        z.remove(); n.tachon = null;
        rotulo(n.t, s, TAM_NOTA);
        a2.cancel();
        n.anims.push(n.v.animate([{ opacity: 0, transform: "translateX(-12px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" }));
      });
    }).catch(() => {});
  }
  // anillo de foco para los botones SVG (el contorno del navegador no se ve bien en SVG)
  const foco = (p, d) => mk("path", { class: "mce-foco", d }, p);

  /* ---------- marco a mano para cajas HTML (setlist, lectura, palancas): nunca cierra ----------
     relleno: la caja pierde su fondo rectangular y se pinta dentro del trazo (con su sombra dura corrida
     «sombra» = [dx, dy]); ese marco va debajo del contenido (.mce-con-fondo aísla la caja). */
  function marco(el, { semilla = 1, trazo = 3, inset = 2, r = [14, 8, 16, 10], inicio = .08, relleno = false, sombra = null } = {}) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("class", "mce-marco" + (relleno ? " mce-marco-fondo" : ""));
    s.setAttribute("aria-hidden", "true");
    const sh = sombra ? mk("path", { class: "mce-marco-s", transform: `translate(${sombra[0]} ${sombra[1]})` }, s) : null;
    const f = relleno ? mk("path", { class: "mce-marco-f" }, s) : null;
    const a = mk("path", { class: "mce-marco-l" }, s), b = mk("path", { class: "mce-marco-l mce-eco" }, s);
    if (relleno) el.classList.add("mce-con-fondo");
    el.append(s);
    const dibujar = () => {
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h || (s._w === w && s._h === h)) return;
      s._w = w; s._h = h;
      s.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const d = contorno(inset, inset, w - inset * 2, h - inset * 2, { r, semilla, trazo, jit: 1.1, inicio });
      a.setAttribute("d", d); b.setAttribute("d", d);
      if (f || sh) {
        // el mismo contorno, cerrado: el relleno llega justo al trazo y la sombra lo copia corrida
        const c = contorno(inset, inset, w - inset * 2, h - inset * 2, { r, semilla, trazo, jit: 1.1, inicio, hueco: 0 });
        f?.setAttribute("d", c); sh?.setAttribute("d", c);
      }
    };
    new ResizeObserver(dibujar).observe(el);
    return s;
  }

  /* ---------- controles HTML ---------- */
  // palanca de S (sigue siendo .tg: bindToggles la conecta con Logic)
  const palanca = (k, nombre, aria) => `<button class="tg mce-palanca" data-k="${k}" aria-pressed="false" aria-label="Palanca ${aria}">
      <span class="mce-pl-nom">${nombre}</span>
      <span class="mce-pl-placa" aria-hidden="true"><i class="mce-pl-m">0</i><i class="mce-pl-eje"><i class="mce-pl-brazo"></i></i><i class="mce-pl-m">1</i></span>
      <b>0</b><span class="mce-clac" aria-hidden="true">¡clac!</span></button>`;
  function clac(b) {
    if (!mover()) return;
    b.classList.remove("mce-clac-on"); void b.offsetWidth; b.classList.add("mce-clac-on");
    clearTimeout(b._clac); b._clac = setTimeout(() => b.classList.remove("mce-clac-on"), 520);
  }
  const flecha = `<svg class="mce-flecha" viewBox="0 0 54 22" aria-hidden="true"><path d="M3 12C15 9 28 13 44 10"/><path d="M35 3.5L46 10.5L36 17.5"/></svg>`;
  // fondo del resaltador amarillo de la fila activa (se «dibuja» de izquierda a derecha)
  const RESALTADOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 60' preserveAspectRatio='none'%3E%3Cpath d='M10 36C70 30 140 33 210 29S330 31 390 25' fill='none' stroke='%23F2C14E' stroke-width='38' stroke-linecap='round' stroke-opacity='.92'/%3E%3Cpath d='M16 47C120 42 250 45 384 38' fill='none' stroke='%23E5A92E' stroke-width='5' stroke-linecap='round' stroke-opacity='.55'/%3E%3C/svg%3E")`;
  // setlist: hoja de papel con cinta en las esquinas; filas escritas a mano
  function setlist({ titulo, cols, filas, aria, cls = "" }) {
    return `<figure class="mce-setlist legend ${cls}" aria-label="${aria}">
      <div class="mce-hoja">
        <figcaption class="mce-sl-tit">Setlist <span>${titulo}</span></figcaption>
        <table><thead><tr>${cols.map(c => `<th scope="col">${c}</th>`).join("")}</tr></thead>
        <tbody>${filas.join("")}</tbody></table>
      </div>
      <i class="mce-cinta a"></i><i class="mce-cinta b"></i><i class="mce-cinta c"></i><i class="mce-cinta d"></i>
    </figure>`;
  }
  const encabezado = (side, h2) => `<header class="z-titulo"><div class="z-tit"><p class="chip"><b>${side === "mux" ? "MUX" : "DEMUX"}</b>Fundamentos · Ana</p><h2>${h2}</h2></div></header>`;

  /* =====================================================================
     El amplificador y sus piezas
     ===================================================================== */
  const AMP = { x: 440, y: 72, w: 432, h: 460 };
  const CARRIL = [190, 282, 374, 466];                     // altura de los cuatro jacks y sus cables
  const PERILLA = { mux: { x: 702, y: 436, r: 44 }, demux: { x: 680, y: 436, r: 44 } };   // perilla de selección
  const PLACA = [514, 790];                                // centros de las palancas S₁ y S₀ (abajo, en z-sel)

  function amplificador(p, logo, s, idTrama) {
    const A = AMP, g = grupo(p, "mce-amp"), cx = A.x + A.w / 2;
    mk("ellipse", { class: "mce-piso", cx: cx + 10, cy: A.y + A.h + 24, rx: A.w * .58, ry: 15 }, g);
    [A.x + 54, A.x + A.w - 54].forEach((x, i) => mk("path", { class: "mce-amp-pata", d: contorno(x - 28, A.y + A.h - 8, 56, 24, { r: [3, 3, 10, 10], hueco: 0, semilla: s + i, jit: .6 }) }, g));
    // asa de cuero
    marcador(g, aMano([[cx - 96, A.y + 10], [cx - 84, A.y - 26], [cx - 30, A.y - 38], [cx + 30, A.y - 38], [cx + 84, A.y - 26], [cx + 96, A.y + 10]], { semilla: s + 4, jit: 1 }), "mce-amp-asa");
    // cuerpo #2A2140 con borde de marcador de 5 px que no cierra
    marcador(g, contorno(A.x, A.y, A.w, A.h, { r: [36, 18, 42, 24], semilla: s, jit: 1.9, trazo: 5, inicio: .035 }), "mce-amp-cuerpo");
    // franja de controles con el logo y el LED
    mk("path", { class: "mce-amp-franja", d: contorno(A.x + 18, A.y + 16, A.w - 36, 52, { r: [16, 8, 6, 9], hueco: 0, semilla: s + 2, jit: .9 }) }, g);
    texto(g, A.x + 42, A.y + 57, logo, "mce-logo", 42, { transform: `rotate(-2.5 ${A.x + 42} ${A.y + 57})` });
    const led = grupo(g, "mce-led");
    mk("circle", { class: "mce-led-halo", cx: A.x + A.w - 52, cy: A.y + 42, r: 22 }, led);
    mk("circle", { class: "mce-led-luz", cx: A.x + A.w - 52, cy: A.y + 42, r: 9 }, led);
    mk("path", { class: "mce-led-aro", d: aro(A.x + A.w - 52, A.y + 42, 13, { semilla: s + 8, jit: .5 }) }, led);
    // frente con rejilla de crayón
    const fr = contorno(A.x + 18, A.y + 84, A.w - 36, A.h - 106, { r: [14, 10, 18, 12], hueco: 0, semilla: s + 3, jit: 1.1 });
    mk("path", { class: "mce-amp-frente", d: fr }, g);
    mk("path", { class: "mce-amp-rejilla", d: fr, fill: idTrama }, g);
    // esquineros
    [[A.x + 6, A.y + 6, 0], [A.x + A.w - 6, A.y + 6, 90], [A.x + A.w - 6, A.y + A.h - 6, 180], [A.x + 6, A.y + A.h - 6, 270]].forEach(([x, y, a], i) =>
      mk("path", { class: "mce-esquinero", d: aMano([[x, y + 26], [x, y], [x + 26, y]], { semilla: s + 20 + i, jit: .6, paso: 8 }), transform: `rotate(${a} ${x} ${y})` }, g));
    return g;
  }
  function vumetro(p, V, s) {
    const g = grupo(p, "mce-vu");
    marcador(g, contorno(V.x, V.y, V.w, V.h, { r: [10, 16, 8, 13], semilla: s, trazo: 3.5, jit: 1 }), "mce-vu-ventana");
    const px = V.x + V.w / 2, py = V.y + V.h - 16, R = V.h - 46;
    const arco = (a0, a1, r) => `M${P(polar(px, py, a0, r))}A${r} ${r} 0 0 1 ${P(polar(px, py, a1, r))}`;
    mk("path", { class: "mce-vu-escala", d: arco(-52, 24, R) }, g);
    mk("path", { class: "mce-vu-rojo", d: arco(24, 48, R) }, g);
    mk("path", { class: "mce-vu-marcas", d: [-52, -36, -20, -4, 12, 28, 44].map(a => `M${P(polar(px, py, a, R + 2))}L${P(polar(px, py, a, R + 14))}`).join("") }, g);
    mk("text", { class: "mce-dato mce-vu-t", x: V.x + 18, y: V.y + V.h - 14 }, g, "VU");
    const aguja = grupo(g, "mce-aguja", { style: `transform-origin:${px}px ${py}px` });
    const tiembla = grupo(aguja, "mce-aguja-t", { style: `transform-origin:${px}px ${py}px` });
    mk("path", { class: "mce-aguja-l", d: `M${px} ${py + 4}L${n1(px + 1.5)} ${py - R - 8}` }, tiembla);
    mk("circle", { class: "mce-aguja-eje", cx: px, cy: py, r: 8 }, g);
    return { g, aguja, px, py };
  }
  // perilla: rótulos 00 01 10 11 alrededor, marca de «apagada» y el indicador que gira (botón)
  function perilla(p, K, s) {
    const g = grupo(p, "mce-perilla-zona");
    mk("path", { class: "mce-perilla-marcas", d: [0, 1, 2, 3].map(ch => `M${P(polar(K.x, K.y, ANG(ch), K.r + 9))}L${P(polar(K.x, K.y, ANG(ch), K.r + 21))}`).join("") }, g);
    mk("path", { class: "mce-perilla-arco", d: `M${P(polar(K.x, K.y, ANG(0), K.r + 15))}A${K.r + 15} ${K.r + 15} 0 1 1 ${P(polar(K.x, K.y, ANG(3), K.r + 15))}` }, g);
    const canales = [0, 1, 2, 3].map(ch => { const [tx, ty] = polar(K.x, K.y, ANG(ch), K.r + 46); return mk("text", { class: "mce-dato mce-canal", x: n1(tx), y: n1(ty + 11) }, g, bits2(ch)); });
    const [ox, oy] = polar(K.x, K.y, APAGADA, K.r + 16);
    mk("circle", { class: "mce-perilla-off", cx: n1(ox), cy: n1(oy), r: 4.5 }, g);
    const b = grupo(g, "mce-perilla mce-btn");
    mk("circle", { class: "mce-hit", cx: K.x, cy: K.y, r: K.r + 8 }, b);
    foco(b, aro(K.x, K.y, K.r + 11, { semilla: s + 3 }));
    const dientes = Array.from({ length: 30 }, (_, i) => { const a = i * 12; return `M${P(polar(K.x, K.y, a, K.r - 3))}L${P(polar(K.x, K.y, a, K.r + 4))}`; }).join("");
    mk("path", { class: "mce-perilla-dientes", d: dientes }, b);
    marcador(b, aro(K.x, K.y, K.r, { semilla: s, jit: .9 }), "mce-perilla-cuerpo");
    mk("path", { class: "mce-perilla-tapa", d: aro(K.x, K.y, K.r * .58, { semilla: s + 5, jit: .6 }) }, b);
    const ind = grupo(b, "mce-indicador", { style: `transform-origin:${K.x}px ${K.y}px;transform:rotate(${APAGADA}deg)` });
    mk("path", { class: "mce-indicador-l", d: `M${K.x} ${K.y - 4}L${K.x + .8} ${K.y - K.r + 7}` }, ind);
    mk("circle", { class: "mce-indicador-p", cx: K.x, cy: K.y - K.r + 10, r: 4.5 }, ind);
    return { b, ind, canales };
  }
  // parlante: gabinete, rejilla, cono con su tapa y ondas concéntricas (aparecen cuando suena)
  function parlante(p, C, s, r, idTrama, { ondas = [40, 72, 104], abre = 48 } = {}) {
    const g = grupo(p, "mce-parlante");
    marcador(g, contorno(C.x, C.y, C.w, C.h, { r: [18, 24, 14, 20].map(v => Math.min(v, C.w / 4)), semilla: s, trazo: 4, jit: 1.3 }), "mce-parl-caja");
    mk("path", { class: "mce-parl-rejilla", d: contorno(C.x + 10, C.y + 10, C.w - 20, C.h - 20, { r: [10, 12, 8, 10].map(v => Math.min(v, C.w / 5)), hueco: 0, semilla: s + 1, jit: .8 }), fill: idTrama }, g);
    const cx = C.x + C.w / 2, cy = C.y + C.h / 2;
    const cono = grupo(g, "mce-cono", { style: `transform-origin:${cx}px ${cy}px` });
    mk("circle", { class: "mce-cono-fondo", cx, cy, r }, cono);
    marcador(cono, aro(cx, cy, r, { semilla: s + 2 }), "mce-cono-borde");
    mk("path", { class: "mce-cono-susp", d: aro(cx, cy, r * .8, { semilla: s + 3, jit: .7 }) }, cono);
    mk("path", { class: "mce-cono-rayos", d: Array.from({ length: 8 }, (_, i) => { const a = i * 45 + 20; return `M${P(polar(cx, cy, a, r * .34))}L${P(polar(cx, cy, a, r * .74))}`; }).join("") }, cono);
    mk("path", { class: "mce-cono-tapa", d: aro(cx, cy, r * .28, { semilla: s + 4, jit: .5 }) }, cono);
    const og = grupo(g, "mce-ondas-parl");
    ondas.forEach((dr, k) => {
      const R = r + dr, a0 = 90 - abre, a1 = 90 + abre;
      const w = grupo(og, "mce-onda-parl", { style: `--k:${k};transform-origin:${cx}px ${cy}px` });
      mk("path", { d: aMano([...Array(9)].map((_, i) => polar(cx, cy, a0 + (a1 - a0) * i / 8, R)), { semilla: s + 30 + k, jit: 1.6, paso: 14 }) }, w);
    });
    return { g, cono, cx, cy };
  }

  /* ---------- esquema técnico (Ver esquema): símbolo trapezoidal estándar, mismo estado ---------- */
  function esquema(svg, L, mux) {
    const g = grupo(svg, "mce-esq"), ys = [130, 230, 330, 430];
    const blk = mux ? "M560 70L740 150V430L560 510Z" : "M560 150L740 70V510L560 430Z";
    const borde = x => mux ? 510 - (x - 560) * 80 / 180 : 430 + (x - 560) * 80 / 180;
    const rutas = ys.map(y => mk("path", { class: "mce-esq-ruta", d: mux ? `M560 ${y}L740 290` : `M560 290L740 ${y}` }, g));
    mk("path", { class: "mce-esq-blk", d: blk }, g);
    // rótulo en dos líneas: «DEMUX 1:4» en una sola desbordaba el bloque (180 de ancho)
    const bt = mk("text", { class: "mce-esq-blk-t", x: 650, y: 282 }, g);
    mk("tspan", { x: 650 }, bt, mux ? "MUX" : "DEMUX");
    mk("tspan", { x: 650, dy: 42 }, bt, mux ? "4:1" : "1:4");
    const cables = [], textos = [], botones = [];
    if (mux) ys.forEach((y, i) => {
      cables.push(mk("path", { class: "mce-esq-w", d: `M330 ${y}H560` }, g));
      const b = grupo(g, "mce-esq-btn");
      mk("rect", { class: "mce-hit", x: 150, y: y - 34, width: 200, height: 68 }, b);
      textos.push(mk("text", { class: "mce-esq-t", x: 318, y: y + 11, style: "text-anchor:end" }, b));
      tap(b, () => L.toggle("d", i)); botones.push(b);
    });
    else {
      cables.push(mk("path", { class: "mce-esq-w", d: "M330 290H560" }, g));
      const b = grupo(g, "mce-esq-btn");
      mk("rect", { class: "mce-hit", x: 150, y: 256, width: 200, height: 68 }, b);
      textos.push(mk("text", { class: "mce-esq-t", x: 318, y: 301, style: "text-anchor:end" }, b));
      tap(b, () => L.toggle("din")); botones.push(b);
    }
    const salidas = (mux ? [290] : ys).map(y => mk("path", { class: "mce-esq-w", d: `M740 ${y}H960` }, g));
    const yT = (mux ? [290] : ys).map(y => mk("text", { class: "mce-esq-t", x: 976, y: y + 11, style: "text-anchor:start" }, g));
    const sx = [612, 688];
    const sw = sx.map(x => mk("path", { class: "mce-esq-w", d: `M${x} ${n1(borde(x))}V560` }, g));
    const sT = [mk("text", { class: "mce-esq-t", x: 598, y: 594, style: "text-anchor:end" }, g), mk("text", { class: "mce-esq-t", x: 702, y: 594, style: "text-anchor:start" }, g)];
    return () => {
      const sel = L.sel;
      rutas.forEach((r, i) => r.classList.toggle("on", i === sel));
      if (mux) {
        cables.forEach((c, i) => c.classList.toggle("v1", !!L.st.d[i]));
        textos.forEach((t, i) => { t.textContent = `I${SUB[i]} = ${L.st.d[i]}`; botones[i].setAttribute("aria-label", `Entrada I${i} = ${L.st.d[i]}. Toca para cambiarla.`); });
        salidas[0].classList.toggle("v1", !!L.mux); yT[0].textContent = `Y = ${L.mux}`;
      } else {
        cables[0].classList.toggle("v1", !!L.st.din); textos[0].textContent = `D = ${L.st.din}`;
        botones[0].setAttribute("aria-label", `Entrada D = ${L.st.din}. Toca para cambiarla.`);
        salidas.forEach((c, i) => c.classList.toggle("v1", !!L.demux(i)));
        yT.forEach((t, i) => { t.textContent = `Y${SUB[i]} = ${L.demux(i)}`; });
      }
      ["s1", "s0"].forEach((k, j) => { sw[j].classList.toggle("v1", !!L.st[k]); sT[j].textContent = `S${SUB[1 - j]} = ${L.st[k]}`; });
    };
  }

  /* =====================================================================
     mux-0-0 y demux-0-0: el amplificador con los cinco toques
     ===================================================================== */
  const NOTAS_MUX = "Un multiplexor (MUX) tiene varias entradas de datos, unas líneas de selección y una sola salida. Aquí es un amplificador de guitarra con cuatro entradas: los cables de colores son I0 a I3; un cable con chispas vale 1 y uno flojo y caído vale 0 (se tocan para cambiarlos). Las palancas S1 y S0 mueven la perilla: el canal es 2·S1 + S0, así que 00 elige I0, 01 I1, 10 I2 y 11 I3. El vúmetro y el parlante muestran la salida Y, que copia al cable elegido; solo suena uno a la vez. La setlist es la tabla de verdad. Cinco toques: se enciende el amplificador, la perilla gira al canal, la señal viaja por el cable elegido, los otros tres se silencian y se marca la fila de la setlist.";
  const NOTAS_DEMUX = "El demultiplexor (DEMUX) hace lo opuesto: una sola entrada de datos D, unas líneas de selección y varias salidas. Aquí el mismo amplificador reparte un cable D entre cuatro parlantes, Y0 a Y3. Las palancas S1 y S0 giran la perilla y eligen qué parlante recibe la señal: ese copia a D y los demás quedan en silencio, es decir, en 0. Toquen el cable D para encenderlo o apagarlo y muevan las palancas. Cinco toques: se enciende el amplificador, la perilla elige la salida, la señal viaja hasta ese parlante, los otros tres se silencian y se marca la fila de la setlist.";

  function estacionAmp(el, def, info, side) {
    const mux = side === "mux", id = info.id, PER = PERILLA[side];
    const L = mux ? Logic({ s1: 0, s0: 1, d: [1, 1, 0, 1] }) : Logic({ s1: 1, s0: 0, din: 1 });
    def.notes = mux ? NOTAS_MUX : NOTAS_DEMUX;
    const filas = [0, 1, 2, 3].map(i => mux
      ? `<tr data-row="${i}" aria-label="S1 S0 = ${bits2(i)}: Y = I${i}"><td>${i >> 1} ${i & 1}</td><td>${flecha}</td><td>I<sub>${i}</sub> <small>${NOTAS[i]}</small></td></tr>`
      : `<tr data-row="${i}" aria-label="S1 S0 = ${bits2(i)}: Y${i} = D"><td>${i >> 1} ${i & 1}</td><td>${flecha}</td><td>Y<sub>${i}</sub> = D</td></tr>`);
    el.innerHTML = `${encabezado(side, mux ? "¿Qué es un <em>multiplexor</em>?" : "¿Qué es un <em>demultiplexor</em>?")}
      <div class="z-comp"><div class="mce-lienzo">
        <svg class="fig mce-fig" viewBox="0 0 ${W} ${H}" data-replay="true" role="group" aria-label="${mux
          ? "Amplificador de guitarra con cuatro entradas: los cables de colores I0 a I3 llegan a sus jacks, la perilla elige uno y el parlante Y suena con ese cable."
          : "Amplificador repartidor: el cable D entra por un jack, la perilla elige una de cuatro salidas y solo ese parlante suena."}"></svg>
        <svg class="mce-esquema" viewBox="0 0 ${W} ${H}" role="group" aria-label="Esquema técnico del ${mux ? "MUX 4:1" : "DEMUX 1:4"}"></svg>
      </div></div>
      <div class="z-sel"><div class="ctrl mce-palancas">${palanca("s1", "S<sub>1</sub>", "S1")}${palanca("s0", "S<sub>0</sub>", "S0")}</div></div>
      <div class="z-expl">
        <p class="lede">${mux ? "Elige <b>una</b> de varias entradas y la envía por <b>una sola</b> salida." : "Toma <b>una</b> entrada y la envía a <b>una</b> de varias salidas."}</p>
        ${setlist({ titulo: mux ? "MUX 4:1" : "DEMUX 1:4", cols: ["S<sub>1</sub> S<sub>0</sub>", "", mux ? "Y" : "sale por"], filas, aria: mux ? "Setlist: tabla de verdad del MUX 4:1" : "Setlist: tabla de verdad del DEMUX 1:4" })}
        <p class="readout mce-lectura" data-r aria-live="polite"><span class="mce-caja-t"></span></p>
      </div>`;
    const sec = el.closest(".st");
    const svg = $(".mce-fig", el), esq = $(".mce-esquema", el);
    const idTrama = trama(svg, `mce-trama-${id}`);
    const capa = {};
    ["fondo", "cables", "amp", "frente", "pulso", "notas"].forEach(k => { capa[k] = grupo(svg, "mce-c-" + k); });

    /* --- amplificador --- */
    amplificador(capa.amp, mux ? "MUX 4:1" : "DEMUX 1:4", mux ? 17 : 23, idTrama);
    const V = vumetro(capa.frente, { x: PER.x - 92, y: 168, w: 184, h: 118 }, 31);
    const K = perilla(capa.frente, PER, 41);
    tap(K.b, () => { const n = (L.sel + 1) % 4; L.set({ s1: n >> 1, s0: n & 1 }); });
    // cables de las palancas a la perilla (abajo, en z-sel, viven las palancas)
    const cablesS = PLACA.map((x, j) => mk("path", { class: "mce-cable-s", d: aMano(bezier([PER.x + (j ? 10 : -10), PER.y + PER.r - 2], [PER.x + (j ? 14 : -14), PER.y + 96], [x, H - 64], [x, H + 6], 10), { semilla: 50 + j, jit: 1 }) }, capa.fondo));
    // traza interna de la señal elegida (se ilumina cuando llega la señal)
    const traza = mk("path", { class: "mce-traza" }, capa.frente);
    const trazaVU = mk("path", { class: "mce-traza", d: aMano([[PER.x, PER.y], [PER.x, V.py + 10]], { semilla: 61, jit: .8 }) }, capa.frente);
    capa.frente.insertBefore(traza, capa.frente.firstChild); capa.frente.insertBefore(trazaVU, traza);
    // salida(s) del amplificador
    const xIn = AMP.x + 60, xOut = AMP.x + AMP.w - 36;
    const yIn = mux ? CARRIL : [328], yOut = mux ? [PER.y] : CARRIL;
    const jIn = yIn.map((y, i) => jack(capa.frente, xIn, y, 70 + i));
    const jOut = yOut.map((y, i) => jack(capa.frente, xOut, y, 80 + i));
    (mux ? jIn : jOut).forEach((_, i) => texto(capa.frente, mux ? xIn : xOut, CARRIL[i] - 32, `${mux ? "I" : "Y"}_${i}`, "mce-rot mce-jack-t", 36));
    texto(capa.frente, mux ? xOut : xIn, (mux ? yOut[0] : yIn[0]) - 32, mux ? "Y" : "D", "mce-rot mce-jack-t", 36);

    /* --- entradas (cables a la izquierda, se tocan) --- */
    const entradas = yIn.map((y, i) => {
      const g = grupo(capa.cables, "mce-entrada mce-btn", { style: `--k:${i}` });
      mk("rect", { class: "mce-hit", x: -62, y: y - 46, width: xIn - 20 + 62, height: 92 }, g);
      foco(g, contorno(-56, y - 42, 250, 84, { r: [16, 16, 16, 16], hueco: 0, semilla: 90 + i, jit: .6 }));
      const c = cable(g, { x0: 170, y0: y, x1: xIn - 62, y1: y, caida: mux ? 50 : 64, color: mux ? COLOR[i] : "#B08CFF", s: 100 + i * 7, onda: { vueltas: mux ? 4.5 : 6 }, guia: -70 });
      plug(g, xIn - 8, y, 120 + i);
      cinta(g, 2, y, mux ? 88 : 96, mux ? NOTAS[i] : "bajo", 130 + i);
      const b = insignia(g, 142, y, 140 + i);
      tap(g, () => mux ? L.toggle("d", i) : L.toggle("din"));
      return { g, c, b };
    });

    /* --- salidas: un parlante grande (MUX) o cuatro chicos (DEMUX) --- */
    let salidas;
    if (mux) {
      const C = { x: 990, y: 236, w: 236, h: 262 };
      const pc = cable(capa.cables, { x0: xOut + 62, y0: PER.y, x1: C.x + 4, y1: C.y + C.h - 58, caida: 24, color: "#F4EFE6", s: 160, chispas: 2, onda: { vueltas: 2.5, amp: 7 } });
      plug(capa.cables, xOut + 8, PER.y, 165, -1);
      const pa = parlante(capa.cables, C, 170, 80, idTrama);
      texto(capa.cables, C.x + 70, C.y - 30, "Y", "mce-rot mce-y-t", 52);
      const yb = insignia(capa.cables, C.x + 136, C.y - 46, 175, 27);
      yb.g.classList.add("mce-y-ins");
      salidas = [{ c: pc, pa, b: yb }];
    } else {
      salidas = CARRIL.map((y, i) => {
        const C = { x: 992, y: y - 41, w: 92, h: 82 };
        const g = grupo(capa.cables, "mce-salida", { style: `--k:${i}` });
        const c = cable(g, { x0: xOut + 62, y0: y, x1: C.x + 2, y1: y, caida: 26, color: COLOR[i], s: 180 + i * 5, chispas: 2, onda: { vueltas: 2, amp: 6 } });
        plug(g, xOut + 8, y, 190 + i, -1);
        const pa = parlante(g, C, 200 + i * 3, 29, idTrama, { ondas: [24, 38, 52], abre: 46 });
        const b = insignia(g, 1214, y, 210 + i, 25);
        texto(g, 1148, y + 12, `Y_${i}`, "mce-rot mce-ysal-t", 36);
        return { g, c, pa, b };
      });
    }

    /* --- notas al margen --- */
    const notaFija = mux ? nota(capa.notas, 6, 92, -6, "¡toca los cables!") : nota(capa.notas, 6, 232, -6, "¡toca el cable D!");
    const notaY = mux ? nota(capa.notas, 958, 556, -5, "", "mce-nota-y") : nota(capa.notas, 925, 66, -6, "", "mce-nota-y");
    notaFija.g.classList.add("mce-nota-fija");

    /* --- esquema --- */
    const pintarEsquema = esquema(esq, L, mux);

    /* --- HTML: palancas, setlist, lectura --- */
    bindToggles(el, L);
    $$(".mce-palanca", el).forEach((b, j) => { marco(b, { semilla: 300 + j, trazo: 3, r: [12, 6, 14, 8], relleno: true, sombra: [5, 6] }); b.addEventListener("click", () => clac(b)); });
    const hoja = $(".mce-hoja", el), lectura = $("[data-r]", el), lecturaT = $(".mce-caja-t", lectura);
    marco(hoja, { semilla: 310, trazo: 3, inset: 9, r: [10, 16, 8, 14] });
    // el texto va en .mce-caja-t: escribir en la caja borraría su marco
    marco(lectura, { semilla: 320, trazo: 3, r: [16, 7, 19, 10], relleno: true, sombra: [5, 6] });
    const trs = $$("tr[data-row]", el);
    trs.forEach(tr => tap(tr, () => { const i = +tr.dataset.row; L.set({ s1: i >> 1, s0: i & 1 }); }));

    /* ---------- estado visible: lógica + toque ---------- */
    const E = { fase: LIBRE ? 5 : 0, llego: true, pulso: null };
    const valor = () => mux ? L.mux : L.st.din;            // lo que viaja por la ruta elegida

    /* la ruta dentro del amplificador: jack → baja (o sube) por la izquierda → entra horizontal a la
       perilla (entre sus rótulos) → sale horizontal → sube o baja por la derecha → jack de salida */
    function rutaInterna(sel) {
      const jy = mux ? CARRIL[sel] : yIn[0], oy = mux ? PER.y : CARRIL[sel], xa = xIn + 62, xb = xOut - 34, my = (jy + PER.y) / 2, ny = (oy + PER.y) / 2;
      const a = [...bezier([xIn, jy], [xIn + 40, jy], [xa, jy + (my - jy) * .3], [xa, my], 6),
        ...bezier([xa, my], [xa, PER.y - (PER.y - my) * .3], [xa + 30, PER.y], [PER.x, PER.y], 8).slice(1)];
      const b = [...bezier([PER.x, PER.y], [PER.x + 60, PER.y], [xb, PER.y + (ny - PER.y) * .3], [xb, ny], 8),
        ...bezier([xb, ny], [xb, oy - (oy - ny) * .3], [xb + 12, oy], [xOut, oy], 6).slice(1)];
      return { a, b };
    }
    function pintar() {
      const f = E.fase, sel = L.sel, v = valor();
      const gira = f >= 2, senal = f >= 3, llego = senal && E.llego, calla = f >= 4, fila = f >= 5;
      const cls = el.classList;
      cls.toggle("mce-on", f >= 1); cls.toggle("mce-gira", gira); cls.toggle("mce-senal", senal);
      cls.toggle("mce-llego", llego); cls.toggle("mce-calla", calla); cls.toggle("mce-fila", fila);
      sec && (sec.dataset.toque = String(f));
      // perilla y vúmetro
      K.ind.style.transform = `rotate(${gira ? ANG(sel) : APAGADA}deg)`;
      K.canales.forEach((t, ch) => t.classList.toggle("activo", gira && ch === sel));
      K.b.setAttribute("aria-label", `Perilla de selección en el canal ${bits2(sel)}${gira ? "" : " (todavía apagada)"}. Toca para pasar al canal siguiente.`);
      const alto = llego && !!v;
      V.aguja.style.transform = `rotate(${alto ? 36 : -52}deg)`;
      V.g.classList.toggle("alto", alto);
      // la ruta elegida dentro del amplificador
      const r = rutaInterna(sel);
      traza.setAttribute("d", aMano([...r.a, ...r.b.slice(1)], { semilla: 60 + sel, jit: .8, paso: 18 }));
      if (mux) {
        entradas.forEach((e, i) => {
          const d = L.st.d[i], callada = calla && i !== sel;
          e.c.set(d && !callada);
          e.b.set(d);
          e.g.classList.toggle("v1", !!d); e.g.classList.toggle("callada", callada); e.g.classList.toggle("elegida", senal && i === sel);
          e.g.setAttribute("aria-pressed", d ? "true" : "false");
          e.g.setAttribute("aria-label", `Entrada I${i}: cable ${NOMBRE_COLOR[i]} (${NOTAS[i]}), vale ${d}. Toca para cambiarla.`);
          jIn[i].classList.toggle("elegido", senal && i === sel);
        });
        jOut[0].classList.toggle("elegido", llego);
        const s0 = salidas[0];
        s0.c.set(alto); s0.c.g.classList.toggle("v1", alto);
        s0.pa.g.classList.toggle("suena", alto);
        s0.b.set(v);
      } else {
        const e = entradas[0], d = L.st.din;
        e.c.set(!!d); e.b.set(d);
        e.g.classList.toggle("v1", !!d); e.g.classList.toggle("elegida", senal);
        e.g.setAttribute("aria-pressed", d ? "true" : "false");
        e.g.setAttribute("aria-label", `Entrada D: el cable del bajo, vale ${d}. Toca para cambiarla.`);
        jIn[0].classList.toggle("elegido", senal);
        salidas.forEach((s, i) => {
          const y = L.demux(i), callada = calla && i !== sel, suena = llego && !!y;
          s.c.set(suena); s.b.set(y);
          s.g.classList.toggle("callada", callada); s.g.classList.toggle("elegida", llego && i === sel);
          s.pa.g.classList.toggle("suena", suena);
          jOut[i].classList.toggle("elegido", llego && i === sel);
        });
      }
      // setlist, lectura y esquema
      trs.forEach((tr, i) => tr.classList.toggle("mce-marcada", fila && i === sel));
      lecturaT.innerHTML = mux
        ? `S<sub>1</sub>S<sub>0</sub> = <b>${bits2(sel)}</b><br>Y = I<sub>${sel}</sub> = <b>${L.mux}</b>`
        : `S<sub>1</sub>S<sub>0</sub> = <b>${bits2(sel)}</b><br>Y<sub>${sel}</sub> = D = <b>${L.st.din}</b><br><span class="mce-demas">las demás = 0</span>`;
      pintarEsquema();
      // la nota cambia con lo que suena
      reescribir(notaY, !senal ? (mux ? "¿qué sonará?" : "¿a cuál irá?")
        : mux ? (v ? (calla ? `¡solo suena ${NOTAS[sel]}!` : `¡suena ${NOTAS[sel]}!`) : `${NOTAS[sel]} está muda…`)
        : (v ? (calla ? `¡solo suena Y_${sel}!` : `¡suena Y_${sel}!`) : "D muda: todo en 0"));
    }
    // aplica sin transiciones (al retroceder, sin movimiento o al llegar)
    function quieto(fn) { el.classList.add("mce-quieto"); fn(); void el.offsetWidth; el.classList.remove("mce-quieto"); }

    /* la señal viaja: cable elegido → jack → perilla → (vúmetro) → salida → parlante */
    function cancelarPulso() {
      const p = E.pulso; E.pulso = null;
      if (!p) return;
      p.anims.forEach(a => a.cancel()); p.els.forEach(e => e.remove());
    }
    function rutaCompleta() {
      const sel = L.sel, r = rutaInterna(sel);
      if (mux) {
        const y = CARRIL[sel], c = entradas[sel].c, eje = c.tenso ? c.ejeT : c.ejeF, s0 = salidas[0];
        const ejeS = s0.c.tenso ? s0.c.ejeT : s0.c.ejeF;
        return [[-70, y], ...eje, [xIn, y], ...r.a.slice(1), ...r.b.slice(1), ...ejeS, [s0.pa.cx, s0.pa.cy]];
      }
      const y = yIn[0], c = entradas[0].c, eje = c.tenso ? c.ejeT : c.ejeF, s = salidas[sel];
      const ejeS = s.c.tenso ? s.c.ejeT : s.c.ejeF;
      return [[-70, y], ...eje, [xIn, y], ...r.a.slice(1), ...r.b.slice(1), ...ejeS, [s.pa.cx, s.pa.cy]];
    }
    function recorrido({ rapido = false } = {}) {
      cancelarPulso();
      if (E.fase < 3) return;
      if (!mover() || !enEscena(el)) { E.llego = true; pintar(); return; }
      E.llego = false; pintar();
      const pts = rutaCompleta(), d = poli(pts), frio = !valor();
      const halo = mk("path", { class: "mce-pulso-halo" + (frio ? " frio" : ""), d }, capa.pulso);
      const nucleo = mk("path", { class: "mce-pulso" + (frio ? " frio" : ""), d }, capa.pulso);
      const vu = mk("path", { class: "mce-pulso" + (frio ? " frio" : ""), d: poli([[PER.x, PER.y], [PER.x, V.py + 10]]) }, capa.pulso);
      const T = nucleo.getTotalLength(), seg = 64;
      const ms = rapido ? clamp(T * .55, 650, 1000) : clamp(T * .85, 1200, 1700);
      const corre = (e, len, dur, delay = 0) => e.animate([{ strokeDasharray: `${seg} ${len + seg}`, strokeDashoffset: seg }, { strokeDasharray: `${seg} ${len + seg}`, strokeDashoffset: -len }], { duration: dur, delay, easing: "linear", fill: "both" });
      // hasta la perilla: largo del tramo de entrada
      const hastaK = acum(pts.slice(0, pts.findIndex(q => q[0] === PER.x && q[1] === PER.y) + 1)).pop() || T * .5;
      const a = corre(nucleo, T, ms), b = corre(halo, T, ms), c = corre(vu, PER.y - V.py, ms * .22, ms * hastaK / T);
      const p = E.pulso = { anims: [a, b, c], els: [halo, nucleo, vu] };
      a.finished.then(() => {
        if (E.pulso !== p) return;
        cancelarPulso();
        E.llego = true; pintar();
        // el parlante (o el elegido) da un golpe al recibir
        const pa = mux ? salidas[0].pa : salidas[L.sel].pa;
        if (valor() && mover()) pa.cono.animate([{ transform: "scale(1)" }, { transform: "scale(1.09)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
      }).catch(() => {});
    }

    // cambios de la lógica: si cambia la ruta o lo que viaja con la señal ya mostrada, vuelve a viajar
    let antes = null;
    L.on(() => {
      const ahora = { sel: L.sel, v: valor() };
      const otra = antes && (antes.sel !== ahora.sel || antes.v !== ahora.v);
      antes = ahora;
      if (otra && E.fase >= 3 && mover() && enEscena(el)) recorrido({ rapido: true });
      else pintar();
    });
    svg.addEventListener("replay-signal", () => recorrido());
    sec?.addEventListener("leave", () => { cancelarPulso(); if (!E.llego) { E.llego = true; quieto(pintar); } });

    /* ---------- los cinco toques ---------- */
    function encender() {
      const amp = $(".mce-amp", svg);
      amp.animate([{ transform: "translateY(0)" }, { transform: "translateY(-5px)" }, { transform: "translateY(1px)" }, { transform: "none" }], { duration: 300, easing: "ease-out" });
      $$(".mce-jack-halo", svg).forEach((h, i) => h.animate([{ transform: "scale(.4)", opacity: 0 }, { transform: "scale(1.25)", opacity: .7 }, { transform: "scale(1)" }], { duration: 420, delay: 120 + i * 70, easing: "ease-out", fill: "backwards" }));
    }
    function aplicar(_sec, n, inf) {
      const prev = E.fase;
      E.fase = n;
      const anima = inf.adelante && mover() && enEscena(el);
      cancelarPulso();
      if (!anima) { E.llego = true; quieto(pintar); return; }
      if (prev < 3 && n >= 3) E.llego = false;
      if (prev < 4 && n >= 4) { el.classList.add("mce-callando"); setTimeout(() => el.classList.remove("mce-callando"), 1100); }
      pintar();
      if (prev < 1 && n >= 1) encender();
      if (prev < 2 && n >= 2) setTimeout(() => { if (E.fase >= 2 && enEscena(el)) REALMS.tone("marceline"); }, 480);
      if (prev < 3 && n >= 3) recorrido();
    }
    quieto(pintar);
    el._mce = { aplicar };
  }

  /* =====================================================================
     mux-0-1 y demux-0-1: N : 1 / 1 : N y 2ⁿ
     ===================================================================== */
  const DICHOS = {
    mux: ["", "¡2 cables!", "4, como el ampli", "8: ya es banda", "16… ¡qué enredo!"],
    demux: ["", "2 parlantes", "4, como antes", "8: un festival", "16… ¡qué ruido!"]
  };
  function abanico(svg, n, mux, plano) {
    svg.textContent = "";
    const N = 2 ** n, X = v => mux ? v : W - v, anc = mux ? "end" : "start";
    const g = grupo(svg, plano ? "mce-esq" : "mce-abanico");
    const ys = Array.from({ length: N }, (_, k) => 40 + (k + .5) * 520 / N);
    const blk = [[612, 72], [772, 158], [772, 446], [612, 532]];          // en el DEMUX, X() lo refleja
    const ancho = N <= 4 ? 7 : N <= 8 ? 5.5 : 3.6;
    // cuerdas
    const cu = grupo(g, "mce-cuerdas");
    ys.forEach((y, k) => {
      const ye = 302 + (y - 302) * .6, pts = bezier([X(132), y], [X(340), y], [X(440), ye], [X(612), ye], 18);
      if (plano) { mk("path", { class: "mce-esq-w", d: poli(pts) }, cu); return; }
      const c = grupo(cu, "mce-cuerda", { style: `--c:${COLOR[k % 4]};--w:${ancho};--k:${k}` });
      mk("path", { class: "mce-cuerda-tinta mce-trazo", d: aMano(pts, { semilla: 400 + k, jit: .9, paso: 20 }) }, c);
      mk("path", { class: "mce-cuerda-color mce-trazo", d: aMano(pts, { semilla: 400 + k, jit: .9, paso: 20 }) }, c);
    });
    // clavijas y rótulos
    ys.forEach((y, k) => {
      if (plano) mk("circle", { class: "mce-esq-pin", cx: X(132), cy: y, r: N > 8 ? 5 : 8 }, g);
      else mk("path", { class: "mce-clavija mce-trazo", d: aro(X(132), y, N > 8 ? 7 : 11, { semilla: 450 + k, jit: .6 }) }, g);
      if (N <= 8 || k === 0 || k === N - 1) {
        const t = mk("text", { class: plano ? "mce-esq-t" : "mce-rot mce-cuerda-t", x: X(112), y: y + 11, style: `text-anchor:${anc}` }, g);
        if (plano) t.textContent = usv(mux ? "I" : "Y", k); else rotulo(t, `${mux ? "I" : "Y"}_${k}`, N > 8 ? 30 : 32);
      }
    });
    // con 16 entradas solo se rotulan la primera y la última; en medio, tres puntos
    if (N > 8) [-22, 0, 22].forEach(dy => mk("circle", { class: plano ? "mce-esq-pin" : "mce-puntos", cx: X(92), cy: 302 + dy, r: 4.5 }, g));
    // bloque N:1 (1:N) con borde de marcador que no cierra
    const lado = blk.map(([x, y]) => [X(x), y]);
    if (plano) mk("path", { class: "mce-esq-blk", d: poli(lado) + "Z" }, g);
    else {
      mk("path", { class: "mce-blk-fondo", d: poli(lado) + "Z" }, g);
      marcador(g, aMano(abrirPoli(lado, 9), { semilla: 470 + n, jit: 1.2, paso: 12 }), "mce-blk mce-trazo");
    }
    const etiqueta = mux ? `${N}:1` : `1:${N}`;
    mk("text", { class: plano ? "mce-esq-blk-t" : "mce-blk-t", x: X(692), y: 324, style: plano ? "" : `font-size:${etiqueta.length > 3 ? 50 : 64}px` }, g, etiqueta);
    // salida (MUX) o entrada D (DEMUX)
    if (plano) {
      mk("path", { class: "mce-esq-w v1", d: `M${X(772)} 302H${X(1010)}` }, g);
      mk("text", { class: "mce-esq-t", x: X(1030), y: 313, style: `text-anchor:${mux ? "start" : "end"}` }, g, mux ? "Y" : "D");
    } else {
      const c = grupo(g, "mce-cuerda mce-unica", { style: `--c:${mux ? "#F4EFE6" : "#B08CFF"};--w:8` });
      const pts = [[X(772), 302], [X(890), 300], [X(1010), 303]];
      mk("path", { class: "mce-cuerda-tinta mce-trazo", d: aMano(pts, { semilla: 480, jit: .8 }) }, c);
      mk("path", { class: "mce-cuerda-color mce-trazo", d: aMano(pts, { semilla: 480, jit: .8 }) }, c);
      mk("path", { class: "mce-clavija mce-trazo", d: aro(X(1028), 302, 16, { semilla: 481 }) }, g);
      texto(g, X(1058), 316, mux ? "Y" : "D", "mce-rot mce-y-t", 46, { style: `text-anchor:${mux ? "start" : "end"}` });
    }
    /* líneas de selección: salen del borde de abajo del bloque y terminan en un pin con su rótulo debajo,
       lejos de los botones n (≥ 24 unidades libres). S de mayor peso siempre a la izquierda (también en el
       DEMUX espejado, como en el puente y en las palancas). */
    const y0 = x => 532 - (x - 612) * 86 / 160, yFin = 542, x0 = n === 4 ? 626 : 640, x1 = n === 4 ? 758 : 744;
    for (let j = 0; j < n; j++) {
      const x = n === 1 ? 692 : x0 + j * (x1 - x0) / (n - 1), xx = X(x), si = mux ? n - 1 - j : j;
      mk("path", { class: plano ? "mce-esq-w" : "mce-sel-l mce-trazo", d: plano ? `M${n1(xx)} ${n1(y0(x))}V${yFin}` : aMano([[xx, y0(x) + 2], [xx + 1, yFin]], { semilla: 490 + j, jit: .8, paso: 12 }) }, g);
      mk("circle", { class: plano ? "mce-esq-pin" : "mce-sel-pin", cx: n1(plano ? xx : xx + 1), cy: yFin, r: plano ? 5 : 5.5 }, g);
      const t = mk("text", { class: plano ? "mce-esq-t mce-esq-s" : "mce-rot mce-sel-t", x: n1(xx), y: 574, style: "text-anchor:middle" }, g);
      if (plano) t.textContent = usv("S", si); else rotulo(t, `S_${si}`, 30);
    }
  }
  // contorno de polígono (el bloque) abierto con la abertura de 4 px
  function abrirPoli(pts, hueco) {
    const denso = [];
    pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length], k = Math.max(2, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 20)); for (let j = 0; j < k; j++) denso.push([p[0] + (q[0] - p[0]) * j / k, p[1] + (q[1] - p[1]) * j / k]); });
    const i0 = 2;
    return abrir([...denso.slice(i0), ...denso.slice(0, i0)], hueco);
  }

  function estacionN(el, def, info, side) {
    const mux = side === "mux";
    const filas = [1, 2, 3, 4].map(n => `<tr data-n="${n}" aria-label="n = ${n}: N = ${2 ** n}, ${mux ? `${2 ** n}:1` : `1:${2 ** n}`}"><td>${n}</td><td>${2 ** n}</td><td>${mux ? `${2 ** n}:1` : `1:${2 ** n}`}</td></tr>`);
    el.innerHTML = `${encabezado(side, mux ? "N : 1 y <em>2<sup>n</sup></em>" : "1 : N y <em>2<sup>n</sup></em>")}
      <div class="z-comp"><div class="mce-lienzo">
        <div class="mce-capa-fig tree-box">
          <svg class="fig mce-fig" viewBox="0 0 ${W} ${H}" role="img" aria-label="${mux ? "Abanico de cuerdas: N entradas de colores llegan a un bloque N:1 con n líneas de selección" : "Abanico de cuerdas: una entrada D llega a un bloque 1:N que la reparte en N salidas"}"></svg>
          <svg class="mce-esquema" viewBox="0 0 ${W} ${H}" role="img" aria-label="Esquema técnico ${mux ? "N:1" : "1:N"}"></svg>
        </div>
        <svg class="mce-boceto" viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg>
      </div></div>
      <div class="z-sel"><div class="ctrl mce-ctrl-n">${seg("Líneas de selección n", [[1, "n = 1"], [2, "n = 2"], [3, "n = 3"], [4, "n = 4"]], 2)}</div></div>
      <div class="z-expl">
        <p class="lede">${mux ? "Con <b>n</b> líneas de selección se eligen <b>2<sup>n</sup></b> entradas." : "Con <b>n</b> líneas de selección se alcanzan <b>2<sup>n</sup></b> salidas."}</p>
        ${setlist({ titulo: mux ? "N : 1" : "1 : N", cols: ["n", "N = 2<sup>n</sup>", "nombre"], filas, aria: "Relación entre líneas de selección y tamaño", cls: "mce-setlist-n" })}
        <p class="formula mce-formula" data-f><span class="mce-caja-t"></span></p>
      </div>`;
    const svg = $(".mce-fig", el), esq = $(".mce-esquema", el);
    const hoja = $(".mce-hoja", el), formula = $("[data-f]", el), formulaT = $(".mce-caja-t", formula);
    marco(hoja, { semilla: 330 + (mux ? 0 : 5), trazo: 3, inset: 9, r: [10, 16, 8, 14] });
    marco(formula, { semilla: 340, trazo: 3, r: [16, 7, 19, 10], relleno: true, sombra: [5, 6] });
    $$(".seg button", el).forEach((b, j) => marco(b, { semilla: 350 + j, trazo: 2.6, r: [10, 6, 12, 7], relleno: true, sombra: [4, 5] }));
    const capaFig = grupo(svg, "mce-c-abanico"), capaNotas = grupo(svg, "mce-c-notas");
    // la nota fija va junto a las líneas de selección (a su derecha en el MUX, a su izquierda en el DEMUX)
    const NOTA_FIJA = [mux ? 800 : 196, 560];
    nota(capaNotas, ...NOTA_FIJA, -5, "+1 línea = ×2", "mce-nota-fija");
    const dicho = nota(capaNotas, mux ? 852 : 96, 92, -7, "", "mce-nota-y");
    /* «La idea» (fase 1 de 3, con la figura aún oculta): el mismo abanico como boceto a lápiz y la nota
       ya escrita, para que la hoja nunca llegue vacía; en «El circuito» se repasa con marcador. */
    const boceto = $(".mce-boceto", el), bocetoFig = grupo(boceto, "mce-c-abanico");
    nota(grupo(boceto, "mce-c-notas"), ...NOTA_FIJA, -5, "+1 línea = ×2", "mce-nota-fija");
    let n = 2;
    const trs = $$("tr[data-n]", el);
    function dibujar(nuevo, anima) {
      n = nuevo;
      abanico(capaFig, n, mux, false);
      abanico(bocetoFig, n, mux, false);
      abanico(esq, n, mux, true);
      const N = 2 ** n;
      formulaT.innerHTML = `N = 2<sup>${n}</sup> = <b>${N}</b><br>n = log<sub>2</sub> ${N} = <b>${n}</b>`;
      trs.forEach(tr => tr.classList.toggle("mce-marcada", +tr.dataset.n === n));
      $$(".seg button", el).forEach(b => b.setAttribute("aria-checked", String(+b.dataset.v === n)));
      reescribir(dicho, DICHOS[side][n]);
      if (anima && mover() && enEscena(el)) trazar($$(".mce-trazo", capaFig), { dur: 420, escalon: N > 8 ? 12 : 30 });
    }
    bindSeg(el, v => dibujar(+v, true));
    trs.forEach(tr => tap(tr, () => dibujar(+tr.dataset.n, true)));
    dibujar(2, false);
    reescribir(dicho, DICHOS[side][2]);
  }

  /* =====================================================================
     Coreografía de fases genéricas: lo que aparece se «dibuja» con crayón o marcador
     ===================================================================== */
  // dibuja trazos SVG (de su principio a su fin)
  function trazar(paths, { dur = 700, escalon = 30, retraso = 0 } = {}) {
    paths.forEach((p, i) => {
      let L = 0; try { L = p.getTotalLength(); } catch {}
      if (!L) return;
      p.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }], { duration: dur, delay: retraso + i * escalon, easing: "cubic-bezier(.5,0,.25,1)", fill: "backwards" });
    });
  }
  // escribe un bloque HTML de izquierda a derecha (como una mano con marcador)
  const escribir = (el, { dur = 620, retraso = 0 } = {}) => el?.animate([{ clipPath: "inset(-12px 100% -12px -12px)" }, { clipPath: "inset(-12px -12px -12px -12px)" }], { duration: dur, delay: retraso, easing: "cubic-bezier(.45,0,.3,1)", fill: "backwards" });
  function fase(sec, n, inf) {
    if (!inf.adelante || !mover()) return;
    const box = $(".st-in", sec);
    if (n >= 1 && (inf.previa ?? 0) < 1) {
      trazar($$(".mce-fig .mce-trazo", box), { dur: 760, escalon: 18 });
      const hoja = $(".mce-setlist", box);
      if (hoja) {
        hoja.animate([{ transform: "translateY(-26px) rotate(-5deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 480, easing: "cubic-bezier(.3,1.4,.5,1)", fill: "backwards" });
        // título y filas se escriben uno tras otro (las celdas de cada fila, juntas)
        escribir($(".mce-sl-tit", hoja), { dur: 380, retraso: 260 });
        $$("tr", hoja).forEach((r, i) => $$("th, td", r).forEach(c => escribir(c, { dur: 200, retraso: 370 + i * 110 + 220 * c.offsetLeft / (r.offsetWidth || 1) })));
      }
    }
    if (n >= 2 && (inf.previa ?? 0) < 2) {
      escribir($(".formula", box), { dur: 700, retraso: 120 });
      $$(".ctrl .seg button, .ctrl .tg", box).forEach((b, i) => b.animate([{ transform: "translateY(18px) rotate(-4deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 420, delay: i * 70, easing: "cubic-bezier(.3,1.5,.5,1)", fill: "backwards" }));
    }
  }

  /* =====================================================================
     Registro en el mundo
     ===================================================================== */
  const ETQ_MUX = ["Inicio", "Se enciende", "Gira la perilla", "Viaja la señal", "Las otras callan", "La setlist"];
  const ETQ_DEMUX = ["Inicio", "Se enciende", "Gira la perilla", "Viaja la señal", "Los otros callan", "La setlist"];
  const conFases = etiquetas => ({ etiquetas, aplicar(sec, n, inf) { $(".st-in", sec)?._mce?.aplicar(sec, n, inf); } });
  MUNDOS.definir("marceline", {
    fase,
    estaciones: {
      "mux-0-0": { build: (el, def, info) => estacionAmp(el, def, info, "mux"), fases: conFases(ETQ_MUX) },
      "demux-0-0": { build: (el, def, info) => estacionAmp(el, def, info, "demux"), fases: conFases(ETQ_DEMUX) },
      "mux-0-1": { build: (el, def, info) => estacionN(el, def, info, "mux") },
      "demux-0-1": { build: (el, def, info) => estacionN(el, def, info, "demux") }
    }
  });
})();

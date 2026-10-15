"use strict";
/* =====================================================================
   Entradas y salidas de Tsaritsa (§2.4, §2.9), Venom (§3.4, §3.9) y DIO (§4.4, §4.9).
   Estos mundos aún conservan su escena anterior: aquí solo se registran sus
   secuencias (MUNDOS.secuencias). Igual que Marceline:
   - entrar(ctx) crea su capa de forma síncrona (fondo del puente + el mismo cable
     de PUENTE.cable, con la señal llegando desde ctx.desde) y al terminar no deja nada;
   - salir(ctx) termina en el fondo del puente con el cable gris y devuelve esa capa.
   Unidades del cable: de diseño, con el origen en el centro de la pantalla.
   ===================================================================== */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const div = (c, cls, estilo = "") => { const d = html(`<div class="${cls}" style="${estilo}"></div>`); c.append(d); return d; };
  const g = (svg, cuerpo, cls = "") => { const e = document.createElementNS(NS, "g"); if (cls) e.setAttribute("class", cls); e.innerHTML = cuerpo; svg.append(e); return e; };
  const medida = svg => { const [x, y, w, h] = svg.getAttribute("viewBox").split(" ").map(Number); return { x, y, W: w, H: h }; };
  const titulo = sec => $(".z-titulo h2", sec) || $("h2", sec);
  const ESQUIRLAS = [[50, 0, 100, 0, 100, 34], [100, 34, 100, 72], [100, 72, 100, 100, 58, 100], [58, 100, 18, 100], [18, 100, 0, 100, 0, 64], [0, 64, 0, 22], [0, 22, 0, 0, 50, 0]];
  const poligono = p => { const v = [50, 50, ...p], o = []; for (let i = 0; i < v.length; i += 2) o.push(`${v[i]}% ${v[i + 1]}%`); return o.join(","); };
  const centroide = p => { const v = [50, 50, ...p], n = v.length / 2; let x = 0, y = 0; for (let i = 0; i < v.length; i += 2) { x += v[i]; y += v[i + 1]; } return [x / n - 50, y / n - 50]; };
  // copia del texto de un título, en su sitio, para efectos sobre las letras (brillo, tinta)
  function copiaTitulo(c, h2, cls) {
    if (!h2) return null;
    const r = h2.getBoundingClientRect(), cs = getComputedStyle(h2);
    const t = html(`<div class="${cls}"></div>`);
    t.textContent = h2.textContent;
    Object.assign(t.style, { position: "absolute", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width + 4}px`, height: `${r.height}px`, inset: "auto",
      font: cs.font, letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight, textTransform: cs.textTransform, textAlign: cs.textAlign,
      whiteSpace: "nowrap", transform: `scale(${parseFloat(cs.fontSize) ? 1 : 1})`, transformOrigin: "0 0" });
    // el título vive escalado por la cámara: se ajusta la fuente a su tamaño en pantalla
    const k = r.height / (h2.offsetHeight || r.height);
    t.style.fontSize = `${parseFloat(cs.fontSize) * k}px`;
    t.style.letterSpacing = cs.letterSpacing === "normal" ? "normal" : `${parseFloat(cs.letterSpacing) * k}px`;
    t.style.lineHeight = cs.lineHeight === "normal" ? "normal" : `${parseFloat(cs.lineHeight) * k}px`;
    t.style.whiteSpace = h2.scrollHeight > h2.clientHeight * 1.5 || r.height > parseFloat(t.style.fontSize) * 1.6 ? "normal" : "nowrap";
    c.append(t);
    return t;
  }
  // nieve lenta: 60 copos de 2 a 6 px en 3 velocidades (lienzo propio)
  function nieve(c, ms) {
    const cv = html('<canvas class="se-nieve"></canvas>'); c.append(cv);
    const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const x = cv.getContext("2d"); x.scale(dpr, dpr);
    // tres planos: 40 lejanos (pequeños, lentos), 22 medios y 6 cercanos (grandes, desenfocados)
    const plano = i => i < 40 ? 0 : i < 62 ? 1 : 2;
    const copos = Array.from({ length: 68 }, (_, i) => { const p = plano(i); return { x: (i * 97.3) % W, y: -((i * 53.7) % H), r: [1 + (i % 3) * .4, 2.2 + (i % 4) * .6, 9 + (i % 3) * 5][p], v: [26, 52, 96][p], f: i * .7, p }; });
    const t0 = performance.now(), k = RITMO.k;
    return new Promise(res => {
      const paso = now => {
        const t = (now - t0) / 1000 * k;
        if (MOTION.skip || t * 1000 > ms) { cv.remove(); res(); return; }
        x.clearRect(0, 0, W, H);
        const a = Math.min(1, t * 2, (ms / 1000 - t) * 2);
        copos.forEach(p => {
          const y = (p.y + p.v * t * 2.2 + H) % (H + 20) - 10, xx = p.x + Math.sin(t * 1.3 + p.f) * 14;
          if (p.p === 2) { const g = x.createRadialGradient(xx, y, 0, xx, y, p.r); g.addColorStop(0, "rgba(234,246,255,.55)"); g.addColorStop(1, "rgba(234,246,255,0)"); x.globalAlpha = a; x.fillStyle = g; }
          else { x.globalAlpha = a * (p.p ? .85 : .45); x.fillStyle = "#EAF6FF"; }
          x.beginPath(); x.arc(xx, y, p.r, 0, 6.283); x.fill();
        });
        requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });
  }

  /* ---------- estallido de hielo ----------
     Portado de «Estallido (15 → 16)» de la presentación de normas (TECNOLOGIA ELECTRICA,
     presentacion/web/js/main.js, shatter): la lámina se parte en fragmentos reales (copias
     recortadas a polígonos con juntas quebradas), las grietas se encienden sobre las juntas,
     las juntas se abren (tensión) y los fragmentos salen despedidos con giro y caída, con
     astillas, paneles de vidrio, resplandor y destellos. Aquí, en tonos de hielo.
     Resuelve cuando los fragmentos ya se separaron (siguen volando dentro de la capa). */
  async function estallido(c, hoja, [ox, oy], { anim, esperar }) {
    const W = innerWidth, H = innerHeight, k = W / 1920, R = Math.random;
    const poly = pts => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;
    const linea = pts => "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");
    const pts2 = pts => pts.map(p => p.map(v => v.toFixed(1)).join(",")).join(" ");
    const caja = (pts, m) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const x0 = Math.min(...xs) - m, y0 = Math.min(...ys) - m; return [x0, y0, Math.max(...xs) + m - x0, Math.max(...ys) + m - y0]; };
    const capaFx = ([x, y, w, h], cls, [cx, cy]) => {
      x = Math.floor(x); y = Math.floor(y); w = Math.ceil(w); h = Math.ceil(h);
      const l = document.createElementNS(NS, "svg");
      l.setAttribute("viewBox", `${x} ${y} ${w} ${h}`); l.setAttribute("class", `se-fx ${cls}`);
      l.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:visible;transform-origin:${(cx - x).toFixed(0)}px ${(cy - y).toFixed(0)}px`;
      c.append(l); return l;
    };
    const fx = (tag, at, padre) => { const e = document.createElementNS(NS, tag); for (const q in at) e.setAttribute(q, at[q]); padre.append(e); return e; };
    const astilla = (cx, cy, len, wid, a) => { const ca = Math.cos(a), sa = Math.sin(a), P = (u, v) => [cx + ca * u - sa * v, cy + sa * u + ca * v];
      return [P(-len / 2, 0), P(len * (-.15 + R() * .35), -wid * (.55 + R() * .45)), P(len / 2, 0), P(len * (-.3 + R() * .35), wid * (.25 + R() * .45))]; };
    const borde = (pts, tipo, centro) => { const l = capaFx(caja(pts, 8), tipo, centro);
      if (tipo === "ice") fx("polygon", { class: "fx-ice", points: pts2(pts) }, l);
      if (tipo !== "wedge") fx("polygon", { class: "fx-facet", points: pts2([pts[0], pts[1], pts[2]]) }, l);
      fx("polygon", { class: "fx-rim-glow", points: pts2(pts) }, l); fx("polygon", { class: "fx-rim", points: pts2(pts) }, l); return l; };
    // copia de la lámina recortada a un polígono, dentro de un marco del tamaño justo
    const fragmento = (pts, [cx, cy]) => {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const x0 = Math.floor(Math.max(-40, Math.min(...xs))), y0 = Math.floor(Math.max(-40, Math.min(...ys)));
      const x1 = Math.ceil(Math.min(W + 40, Math.max(...xs))), y1 = Math.ceil(Math.min(H + 40, Math.max(...ys)));
      const f = html(`<div class="se-frag"></div>`);
      f.style.cssText = `position:absolute;overflow:hidden;left:${x0}px;top:${y0}px;width:${Math.max(1, x1 - x0)}px;height:${Math.max(1, y1 - y0)}px;transform-origin:${(cx - x0).toFixed(0)}px ${(cy - y0).toFixed(0)}px`;
      // espesor: canto (la misma silueta, desplazada y oscura) y sombra sobre lo de atrás
      const sombra = html(`<div class="se-frag-sombra"></div>`), canto = html(`<div class="se-frag-canto"></div>`);
      const desp = (dx, dy) => `polygon(${pts.map(([x, y]) => `${(x - x0 + dx).toFixed(1)}px ${(y - y0 + dy).toFixed(1)}px`).join(",")})`;
      sombra.style.clipPath = desp(14 * k, 20 * k); canto.style.clipPath = desp(5 * k, 8 * k);
      const copia = hoja.cloneNode(true);
      copia.style.cssText = `position:absolute;inset:auto;left:${-x0}px;top:${-y0}px;width:${W}px;height:${H}px;clip-path:${poly(pts)}`;
      f.style.overflow = "visible";
      f.append(sombra, canto, copia); c.append(f); return f;
    };
    // juntas: radios quebrados desde el origen y un anillo irregular
    const n = 9, ang = Array.from({ length: n }, (_, j) => j / n * Math.PI * 2 + (R() - .5) * .45);
    const r1 = ang.map(() => (230 + R() * 260) * k), at = (j, r) => [ox + Math.cos(ang[j % n]) * r, oy + Math.sin(ang[j % n]) * r];
    const quiebre = (a, b) => [a, [(a[0] + b[0]) / 2 + (R() - .5) * 60 * k, (a[1] + b[1]) / 2 + (R() - .5) * 60 * k], b];
    const radios = ang.map((_, j) => quiebre(at(j, 0), at(j, r1[j])).concat([at(j, r1[j] * 2.2), at(j, 4000)]));
    const anillo = ang.map((_, j) => quiebre(at(j, r1[j]), at(j + 1, r1[(j + 1) % n])));
    const piezas = [];
    for (let j = 0; j < n; j++) {
      const q = (j + 1) % n;
      piezas.push({ pts: [...radios[j].slice(0, 3), ...anillo[j].slice(1, 2), ...radios[q].slice(0, 3).reverse()], dentro: true });
      piezas.push({ pts: [...radios[j].slice(2), ...radios[q].slice(2).reverse(), ...anillo[j].slice(1, 2)], dentro: false });
    }
    const hold = 260, fly = 1500, total = hold + fly;
    const corre = (e, frames, opt) => { anim(e, frames, opt); };
    piezas.forEach(({ pts, dentro }) => {
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const dx = cx - ox, dy = cy - oy, L = Math.hypot(dx, dy) || 1;
      const empuje = ((dentro ? 560 : 340) + R() * 260) * k, giro = (R() - .5) * (dentro ? 70 : 30);
      const f = fragmento(pts, [cx, cy]);
      // tensión (se abren las juntas) → estallido: sale rápido y frena, con algo de caída
      const vuelo = [
        { transform: "none", easing: "cubic-bezier(.5,0,.9,.5)" },
        { transform: `translate(${(dx / L * 8 * k).toFixed(1)}px,${(dy / L * 8 * k).toFixed(1)}px)`, offset: hold / total, easing: "cubic-bezier(.12,.75,.3,1)" },
        { transform: `translate(${(dx / L * empuje).toFixed(1)}px,${(dy / L * empuje + 160 * k).toFixed(1)}px) rotate(${giro.toFixed(0)}deg) scale(${dentro ? .62 : .85})` }];
      corre(f, vuelo, { duration: total, fill: "forwards" });
      corre(f, [{ opacity: 1 }, { opacity: 0 }], { duration: fly * .45, delay: hold + fly * .45, easing: "ease-in", fill: "forwards" });
      const arista = borde(pts, "wedge", [cx, cy]);
      corre(arista, vuelo, { duration: total, fill: "forwards" });
      corre(arista, [{ opacity: 0 }, { opacity: 1, offset: hold / total }, { opacity: 1, offset: (hold + fly * .45) / total }, { opacity: 0, offset: (hold + fly * .9) / total }, { opacity: 0 }], { duration: total, fill: "forwards" });
    });
    hoja.style.visibility = "hidden";                       // ya la reemplazan sus fragmentos
    // grietas sobre las juntas: se encienden en el instante del golpe y se apagan al separarse
    const grietas = document.createElementNS(NS, "svg");
    grietas.setAttribute("class", "se-grietas"); grietas.setAttribute("viewBox", `0 0 ${W} ${H}`);
    c.append(grietas);
    [...radios.map(r => r.slice(0, 4)), ...anillo].forEach((pts, i) => ["glow", "core"].forEach(cls => {
      const p = fx("path", { d: linea(pts), class: cls, pathLength: 1 }, grietas);
      corre(p, [{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: .35 }, { strokeDashoffset: 0, opacity: 0 }], { duration: hold + 500, delay: i < n ? 0 : 60, easing: "ease-out", fill: "both" });
    }));
    // astillas reales de la lámina y acentos de cristal, resplandor, paneles de vidrio y destellos
    requestAnimationFrame(() => {
      if (!c.isConnected) return;
      [...Array(18).fill("frag"), ...Array(8).fill("ice")].forEach((tipo, i) => {
        const a = tipo === "frag" ? i / 18 * Math.PI * 2 + R() * .3 : R() * Math.PI * 2;
        const r0 = (tipo === "frag" ? 120 + R() * 520 : 20 + R() * 180) * k, gran = tipo === "frag" ? 1.15 : .5;
        const len = (190 + R() * 260) * gran * k, wid = (34 + R() * 44) * gran * k, an = a + (R() - .5) * .35;
        const cx = ox + Math.cos(a) * r0, cy = oy + Math.sin(a) * r0, pts = astilla(cx, cy, len, wid, an);
        const v = (tipo === "frag" ? 420 + R() * 520 : 650 + R() * 800) * k;
        const mov = [{ transform: tipo === "frag" ? "none" : "scale(.3)" }, { transform: `translate(${(Math.cos(a) * v).toFixed(1)}px,${(Math.sin(a) * v + 120 * k).toFixed(1)}px) rotate(${((R() - .5) * (tipo === "ice" ? 200 : 60)).toFixed(0)}deg) scale(${tipo === "frag" ? .7 : 1})` }];
        const t = { duration: 1300 + R() * 500, delay: hold - 20 + R() * 60, easing: "cubic-bezier(.08,.75,.3,1)", fill: "both" };
        const fade = [{ opacity: tipo === "frag" ? 1 : 0 }, { opacity: 1, offset: .08 }, { opacity: 1, offset: tipo === "frag" ? .62 : .5 }, { opacity: 0 }];
        const blancos = [borde(pts, tipo, [cx, cy])];
        if (tipo === "frag") blancos.push(fragmento(pts, [cx, cy]));
        blancos.forEach(e => { corre(e, mov, t); corre(e, fade, { ...t, easing: "linear" }); });
      });
      const br = 460 * k, l = capaFx([ox - br, oy - br, 2 * br, 2 * br], "", [ox, oy]);
      fx("ellipse", { cx: ox.toFixed(0), cy: oy.toFixed(0), rx: br.toFixed(0), ry: br.toFixed(0), class: "fx-bloom" }, l);
      corre(l, [{ transform: "scale(.12,.04)", opacity: 0 }, { transform: "scale(1,1)", opacity: 1, offset: .18 }, { transform: "scale(1.2,1.45)", opacity: 0 }], { duration: 1300, delay: hold * .7, easing: "cubic-bezier(.2,.7,.3,1)", fill: "both" });
      for (let i = 0; i < 12; i++) {
        const a = R() * Math.PI * 2, r0 = (30 + R() * 200) * k, v = (450 + R() * 600) * k, w = (70 + R() * 100) * k, h = (45 + R() * 80) * k, an = a + (R() - .5);
        const cx = ox + Math.cos(a) * r0, cy = oy + Math.sin(a) * r0, ca = Math.cos(an), sa = Math.sin(an), sk = (R() - .5) * .5 * w;
        const P = (u, q) => [cx + ca * u - sa * q, cy + sa * u + ca * q], pts = [P(-w / 2 + sk, -h / 2), P(w / 2 + sk, -h / 2), P(w / 2 - sk, h / 2), P(-w / 2 - sk, h / 2)];
        const pl = capaFx(caja(pts, 8), "", [cx, cy]);
        ["fx-pane", "fx-rim-glow", "fx-rim"].forEach(cl => fx("polygon", { class: cl, points: pts2(pts) }, pl));
        const giro = (R() - .5) * 300, F = [0, .5, .78, .92, 1], S = [1, .12, -.85, .3, .9], tx = Math.cos(a) * v, ty = Math.sin(a) * v + 110 * k, dur = 1500 + R() * 600;
        corre(pl, F.map((f, i2) => ({ offset: i2 / 4, transform: `translate(${(tx * f).toFixed(1)}px,${(ty * f).toFixed(1)}px) rotate(${(giro * i2 / 4).toFixed(0)}deg) scaleX(${S[i2]})` })), { duration: dur, delay: hold, easing: "linear", fill: "both" });
        corre(pl, [{ opacity: 0 }, { opacity: 1, offset: .06 }, { opacity: 1, offset: .6 }, { opacity: 0 }], { duration: dur, delay: hold, fill: "both" });
      }
      for (let i = 0; i < 16; i++) {
        const a = R() * Math.PI * 2, r = (60 + R() * 560) * k, x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r, size = (14 + R() * 24) * k, alto = i % 3 === 0;
        const hy = alto ? size * 1.9 : size, hx = alto ? size * .42 : size, w = size * .16, m = 24;
        const gl = capaFx([x - hx - m, y - hy - m, 2 * (hx + m), 2 * (hy + m)], "", [x, y]);
        const g = fx("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, gl);
        fx("path", { class: "fx-glint", d: `M0 ${-hy} L${w} ${-w} L${hx} 0 L${w} ${w} L0 ${hy} L${-w} ${w} L${-hx} 0 L${-w} ${-w} Z` }, g);
        const rr = alto ? 0 : 35;
        corre(gl, [{ transform: `scale(0) rotate(${-rr}deg)`, opacity: 0 }, { transform: "scale(1) rotate(0deg)", opacity: 1, offset: .3 }, { transform: "scale(.85) rotate(0deg)", opacity: 1, offset: .6 }, { transform: `scale(0) rotate(${rr}deg)`, opacity: 0 }], { duration: 900, delay: hold + R() * 800, easing: "ease-in-out", fill: "both" });
      }
    });
    // la secuencia sigue cuando los fragmentos ya se abrieron; terminan de volar solos
    await esperar(hold + 520);
    hoja.remove();
  }

  /* ======================== TSARITSA (S₁S₀ = 01) ======================== */
  MUNDOS.secuencias("tsaritsa", {
    async entrar(ctx) {
      const { sec, anim, esperar, quitar } = ctx;
      const c = ctx.capa("mundo-puente se se-tz"), cable = PUENTE.cable(c, { desde: ctx.desde, senal: true });
      const h2 = titulo(sec);
      try {
        const { x, W } = medida(cable), lado = ctx.desde === "derecha" ? 1 : -1;
        // 0,0 s: el cable se cubre de cristales que avanzan con el pulso
        const n = 26, cristales = g(cable, Array.from({ length: n }, (_, i) => {
          const px = lado * (W / 2 - (i + .5) * W / n), s = 7 + (i * 7) % 9, up = i % 2 ? -1 : 1;
          return `<path class="se-tz-cristal" style="--i:${i}" d="M${px} 0L${px + s * .6} ${up * -s * 1.6}L${px} ${up * -s * 2.6}L${px - s * .6} ${up * -s * 1.6}Z"/>`;
        }).join(""), "se-tz-cristales");
        await Promise.all([
          anim(cable.pulso, [{ transform: "translateX(0)" }, { transform: `translateX(${-lado * W / 2}px)` }], { duration: 1150, easing: "cubic-bezier(.4,0,.6,1)" }),
          ...[...cristales.children].map((p, i) => anim(p, [{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1)" }], { duration: 300, delay: i * 1000 / n, easing: "cubic-bezier(.2,1.4,.4,1)" }))
        ]);
        // 1,2 s: la escarcha se expande desde el centro con patrón fractal
        const escarcha = div(c, "se-tz-escarcha");
        await anim(escarcha, [{ "--se-r": "0%" }, { "--se-r": "120%" }], { duration: 800, easing: "cubic-bezier(.3,0,.5,1)" });
        // 2,0 s: blanco azulado 150 ms, grieta en el centro y el hielo se rompe hacia afuera
        const blanco = div(c, "se-tz-blanco");
        await esperar(150);
        blanco.remove(); cable.remove(); cristales.remove();
        // la lámina de hielo que cubre la pantalla se parte de verdad desde el centro
        // (el mismo «estallido» de la presentación de normas, diapositiva 15 → 16)
        const hoja = div(c, "se-tz-escarcha llena hoja");
        escarcha.remove();
        c.style.background = "transparent";
        await estallido(c, hoja, [innerWidth / 2, innerHeight / 2], ctx);
        // 2,6 s: el paisaje del palacio ya se ve; 3,6 s: nieve lenta; 4,4 s: marco de hielo; 5,0 s: brillo dorado del título
        const marco = div(c, "se-tz-marco");
        marco.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect pathLength="1" x="1.4" y="2.4" width="97.2" height="95.2"/><rect class="fino" pathLength="1" x="2.3" y="3.9" width="95.4" height="92.2"/></svg>${["tl", "tr", "bl", "br"].map(k => `<i class="se-tz-orn ${k}"></i>`).join("")}`;
        marco.style.opacity = 0;
        const copos = nieve(c, 2600);
        await esperar(800);
        marco.style.opacity = "";
        await Promise.all([...$$("rect", marco).map(r => anim(r, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 600, easing: "cubic-bezier(.4,0,.2,1)" })),
          ...$$(".se-tz-orn", marco).map((o, i) => anim(o, [{ opacity: 0, transform: "scale(.3) rotate(-45deg)" }, { opacity: 1, transform: "scale(1) rotate(0)" }], { duration: 380, delay: 220 + i * 40, easing: "cubic-bezier(.2,1.3,.4,1)" }))]);
        const brillo = copiaTitulo(c, h2, "se-tz-brillo");
        if (brillo) await anim(brillo, [{ backgroundPosition: "130% 0" }, { backgroundPosition: "-30% 0" }], { duration: 700, easing: "cubic-bezier(.4,0,.2,1)" });
        await Promise.all([copos, anim(marco, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-in" })]);
      } finally { quitar(c); }
    },
    async salir(ctx) {
      const { anim, esperar } = ctx;
      const c = ctx.capa("se se-tz");
      c.style.background = "transparent";
      // la escarcha cubre, se derrite en gotas que caen y el palacio se va en niebla
      const escarcha = div(c, "se-tz-escarcha llena");
      await anim(escarcha, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: "ease-out" });
      const gotas = Array.from({ length: 22 }, (_, i) => div(c, "se-tz-gota", `left:${3 + i * 4.4 + (i % 3)}%;top:${8 + (i * 37) % 50}%`));
      const niebla = div(c, "se-tz-niebla");
      await Promise.all([
        ...gotas.map((d, i) => anim(d, [{ transform: "translateY(0) scaleY(.6)", opacity: 0 }, { opacity: 1, offset: .2 }, { transform: "translateY(70vh) scaleY(1.4)", opacity: 0 }], { duration: 760, delay: (i * 53) % 300, easing: "cubic-bezier(.5,0,1,1)" })),
        anim(escarcha, [{ opacity: 1, filter: "blur(0)" }, { opacity: 0, filter: "blur(10px)" }], { duration: 900, easing: "ease-in" }),
        anim(niebla, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: "ease-in-out" })
      ]);
      gotas.forEach(d => d.remove());
      // el fondo del puente y el cable, ya sin hielo
      c.classList.add("mundo-puente"); c.style.background = "";
      const cable = PUENTE.cable(c, { desde: ctx.desde, senal: false });
      await Promise.all([anim(niebla, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: "ease-out" }),
        anim(cable, [{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: "ease-out" })]);
      niebla.remove(); escarcha.remove();
      await esperar(120);
      return c;
    }
  });

  /* ========================= VENOM (S₁S₀ = 10) ========================= */
  // mancha de borde irregular (lóbulos), centrada en el origen, radio ~100
  const mancha = (k = 1) => {
    const n = 22, p = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = 100 * (1 + .18 * Math.sin(i * 2.7 + k) + .1 * Math.sin(i * 5.3)); p.push([Math.cos(a) * r, Math.sin(a) * r]); }
    return DRESS.smooth(p);
  };
  MUNDOS.secuencias("venom", {
    async entrar(ctx) {
      const { sec, anim, esperar, quitar } = ctx;
      const c = ctx.capa("mundo-puente se se-vn"), cable = PUENTE.cable(c, { desde: ctx.desde, senal: true });
      const h2 = titulo(sec);
      if (h2) h2.style.visibility = "hidden";
      try {
        const { W, H } = medida(cable);
        // 0,0 s: el pulso se detiene en un nodo y el cable se hincha
        const nodo = g(cable, `<ellipse class="se-vn-nodo" rx="34" ry="20"/><ellipse class="se-vn-nodo-brillo" rx="14" ry="5" cy="-7" cx="-8"/>`);
        await anim(nodo, [{ transform: "scale(.1)" }, { transform: "scale(1.15)", offset: .7 }, { transform: "scale(1)" }], { duration: 600, easing: "cubic-bezier(.3,1.3,.5,1)" });
        // 0,6 s: cae una gota negra, se expande y le brotan tentáculos por el cable
        const gota = g(cable, `<path class="se-vn-gota" d="M0 -26C9 -10 14 -2 14 6A14 14 0 1 1 -14 6C-14 -2 -9 -10 0 -26Z"/>`);
        await anim(gota, [{ transform: `translate(0px,${-H / 2 - 40}px)` }, { transform: "translate(0,0)" }], { duration: 340, easing: "cubic-bezier(.6,0,1,.6)" });
        const tent = g(cable, [-1, 1].map(s => `<path class="se-vn-tent" pathLength="1" d="M0 0C${s * W * .1} -26 ${s * W * .18} 22 ${s * W * .28} -8S${s * W * .44} 18 ${s * W * .56} 0"/>`).join(""));
        await Promise.all([anim(gota, [{ transform: "scale(1)" }, { transform: "scale(2.2,1.3)" }], { duration: 460, easing: "ease-out" }),
          ...[...tent.children].map(t => anim(t, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 460, easing: "cubic-bezier(.3,0,.3,1)" }))]);
        // 1,4 s: la mancha se extiende por toda la pantalla con borde irregular
        const m = g(cable, `<path class="se-vn-mancha" d="${mancha(1)}"/><path class="se-vn-mancha-borde" d="${mancha(1)}"/>`);
        const grande = Math.hypot(W, H) / 150;
        await anim(m, [{ transform: "scale(.05) rotate(0)" }, { transform: `scale(${grande}) rotate(20deg)` }], { duration: 800, easing: "cubic-bezier(.5,0,.3,1)" });
        // 2,2 s: casi negro, respira
        cable.remove(); c.classList.add("se-vn-negro");
        anim(c, [{ transform: "scale(1)" }, { transform: "scale(1.01)" }, { transform: "scale(1)" }], { duration: 2000, easing: "ease-in-out" });
        await esperar(600);
        // 2,8 s: dos formas blancas alargadas en la oscuridad, parpadean una vez
        const ojos = html(`<svg class="se-vn-ojos" viewBox="0 0 200 60"><path d="M10 14Q52 30 92 40L80 52Q34 50 10 14Z"/><path d="M190 14Q148 30 108 40L120 52Q166 50 190 14Z"/></svg>`); c.append(ojos);
        await anim(ojos, [{ opacity: 0, transform: "scaleY(.1)" }, { opacity: 1, transform: "scaleY(1)", offset: .3 }, { transform: "scaleY(.08)", offset: .55 }, { opacity: 1, transform: "scaleY(1)", offset: .75 }, { opacity: 1, transform: "scaleY(1)" }], { duration: 600, easing: "ease-in-out" });
        // 3,4 s: de la oscuridad se forma la diapositiva, chorreando hacia arriba
        c.classList.remove("se-vn-negro"); c.style.background = "transparent";
        const cortina = html(`<svg class="se-vn-cortina" viewBox="0 0 100 130" preserveAspectRatio="none"><path d="M0 0H100V100C97 112 94 101 91 107S85 128 82 104 76 99 73 109 66 122 62 103 55 98 51 111 44 126 40 104 33 98 29 108 22 119 18 102 11 99 7 110 2 117 0 103Z"/></svg>`); c.append(cortina);
        await Promise.all([anim(cortina, [{ transform: "translateY(0)" }, { transform: "translateY(-135%)" }], { duration: 800, easing: "cubic-bezier(.55,0,.35,1)" }),
          anim(ojos, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-in" })]);
        // 4,2 s: el título se escribe con goteo invertido (aparece de abajo hacia arriba)
        if (h2) {
          h2.style.visibility = "";
          await anim(h2, [{ clipPath: "inset(100% -4% -10% -4%)", translate: "0 18px", filter: "blur(3px)" }, { clipPath: "inset(-20% -4% -10% -4%)", translate: "0 0", filter: "blur(0)" }], { duration: 420, easing: "cubic-bezier(.3,0,.2,1)", fill: "none" });
        }
      } finally { if (h2) h2.style.visibility = ""; quitar(c); }
    },
    async salir(ctx) {
      const { anim, esperar } = ctx;
      const c = ctx.capa("se se-vn");
      c.style.background = "transparent";
      const svg = PUENTE.cable(c, { desde: ctx.desde, senal: false });
      const { W, H } = medida(svg);
      svg.firstChild.style.opacity = 0;   // el cable aparece al final
      const grande = Math.hypot(W, H) / 150;
      const m = g(svg, `<path class="se-vn-mancha" d="${mancha(2)}"/><path class="se-vn-mancha-borde" d="${mancha(2)}"/>`);
      // la mancha cubre la diapositiva…
      await anim(m, [{ transform: "scale(.05)" }, { transform: `scale(${grande})` }], { duration: 420, easing: "cubic-bezier(.4,0,.2,1)" });
      // …y debajo ya está el gris del puente: se contrae hacia un punto
      c.classList.add("mundo-puente"); c.style.background = "";
      svg.firstChild.style.opacity = "";
      await anim(m, [{ transform: `scale(${grande}) rotate(0)` }, { transform: "scale(.12) rotate(-30deg)" }], { duration: 640, easing: "cubic-bezier(.6,0,.4,1)" });
      // queda una gota que cae al cable y se escurre hacia el bloque
      const lado = ctx.desde === "derecha" ? 1 : -1;
      const gota = g(svg, `<path class="se-vn-gota" d="M0 -26C9 -10 14 -2 14 6A14 14 0 1 1 -14 6C-14 -2 -9 -10 0 -26Z"/>`);
      gota.style.transform = "translate(0,-40px) scale(.9)";
      await Promise.all([anim(m, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }),
        anim(gota, [{ transform: "translate(0,-40px) scale(.9)" }, { transform: "translate(0,0) scale(1.1,.8)" }], { duration: 260, easing: "cubic-bezier(.6,0,1,.6)" })]);
      m.remove();
      await anim(gota, [{ transform: "translate(0,0) scale(1.1,.8)", opacity: 1 }, { transform: `translate(${lado * W * .55}px,0) scale(.5,.4)`, opacity: .2 }], { duration: 620, easing: "cubic-bezier(.5,0,.8,.6)" });
      gota.remove();
      await esperar(80);
      return c;
    }
  });

  /* ========================== DIO (S₁S₀ = 11) ========================== */
  const reloj = `<circle class="se-dio-esfera" r="210"/><circle class="se-dio-aro" r="180"/>${
    Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<path class="se-dio-marca" d="M${Math.cos(a) * 150} ${Math.sin(a) * 150}L${Math.cos(a) * 190} ${Math.sin(a) * 190}"/>`; }).join("")
  }<path class="se-dio-aguja larga" d="M-7 14L0 -170L7 14Z"/><path class="se-dio-aguja corta" d="M-10 14L0 -110L10 14Z"/><circle class="se-dio-eje" r="14"/>`;
  // silueta de pose dramática (original y genérica): torso girado, brazo extendido, cabeza alta
  const pose = "M88 40C104 34 118 44 116 62C114 76 104 82 96 84L100 98C126 104 150 98 172 80L190 66L198 76L178 100C160 118 136 128 112 128L116 168C132 196 136 232 128 272L150 380L130 384L104 290L90 230L76 296L58 384L38 380L58 272C50 236 52 196 64 164L62 124C46 136 34 150 22 162L12 152C26 132 44 112 64 100L74 84C62 76 58 60 64 50C70 42 78 40 88 40Z";
  MUNDOS.secuencias("dio", {
    async entrar(ctx) {
      const { sec, anim, esperar, quitar } = ctx;
      const c = ctx.capa("mundo-puente se se-dio"), cable = PUENTE.cable(c, { desde: ctx.desde, senal: true });
      const h2 = titulo(sec);
      if (h2) h2.style.visibility = "hidden";
      try {
        const { W, H } = medida(cable), lado = ctx.desde === "derecha" ? 1 : -1;
        // 0,0 s: el cable se tensa, vibra y se vuelve rojo; el pulso se queda a mitad de camino
        const rojo = g(cable, `<path class="se-dio-rojo" pathLength="1" d="M${lado * (W / 2 + 20)} 0H${-lado * (W / 2 + 20)}"/>`);
        await Promise.all([
          anim(rojo.firstChild, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 520, easing: "cubic-bezier(.3,0,.3,1)" }),
          anim(cable.pulso, [{ transform: "translateX(0)" }, { transform: `translateX(${lado * W * .2}px)` }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" }),
          anim(cable, [{ translate: "0 0" }, { translate: "0 -2px" }, { translate: "0 2px" }, { translate: "0 -1px" }, { translate: "0 0" }], { duration: 300, delay: 420, easing: "linear" })
        ]);
        await esperar(260);
        // 0,8 s: tiempo detenido: un solo destello invertido de 120 ms y el reloj gigante
        c.classList.add("se-dio-invertido");
        await esperar(120);
        c.classList.remove("se-dio-invertido");
        const r = g(cable, reloj, "se-dio-reloj");
        await anim(r, [{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 220, easing: "cubic-bezier(.2,1.4,.4,1)" });
        await esperar(260);
        // 1,4 s: el reloj gira rápido y se detiene en las 12; destello blanco
        await Promise.all([
          anim($(".larga", r), [{ transform: "rotate(-1080deg)" }, { transform: "rotate(0)" }], { duration: 380, easing: "cubic-bezier(.2,.7,.25,1)" }),
          anim($(".corta", r), [{ transform: "rotate(-330deg)" }, { transform: "rotate(0)" }], { duration: 380, easing: "cubic-bezier(.2,.7,.25,1)" })
        ]);
        const blanco = div(c, "se-dio-blanco");
        await anim(blanco, [{ opacity: 0 }, { opacity: 1, offset: .35 }, { opacity: 1 }], { duration: 140, easing: "ease-out" });
        // 1,8 s: fresco de colores planos con líneas de velocidad; la diapositiva ya está detrás
        cable.remove();
        c.style.background = "transparent";
        const fresco = div(c, "se-dio-fresco");
        fresco.innerHTML = `<svg viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid slice">${Array.from({ length: 36 }, (_, i) => {
          const a = i / 36 * Math.PI * 2, w = .04 + (i % 3) * .015;
          return `<path class="${i % 2 ? "am" : "mg"}" d="M${Math.cos(a) * 46} ${Math.sin(a) * 46}L${Math.cos(a - w) * 160} ${Math.sin(a - w) * 160}L${Math.cos(a + w) * 160} ${Math.sin(a + w) * 160}Z"/>`; }).join("")}</svg><i class="banda arriba"></i><i class="banda abajo"></i>`;
        await anim(blanco, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-out" });
        blanco.remove();
        await esperar(500);
        // 2,6 s: ゴゴゴゴ detrás, temblando 2 px
        const gogo = div(c, "se-dio-gogo"); gogo.innerHTML = "<span>ゴ</span><span>ゴ</span><span>ゴ</span><span>ゴ</span>";
        await anim(gogo, [{ opacity: 0, transform: "scale(1.3)" }, { opacity: 1, transform: "scale(1)" }], { duration: 240, easing: "cubic-bezier(.2,1.3,.4,1)" });
        gogo.classList.add("tiembla");
        await esperar(560);
        // 3,4 s: una silueta de pose dramática se dibuja a la izquierda con contorno grueso
        const sil = html(`<svg class="se-dio-pose" viewBox="0 0 210 390"><path class="relleno" d="${pose}"/><path class="trazo" pathLength="1" d="${pose}"/></svg>`); c.append(sil);
        await Promise.all([anim($(".trazo", sil), [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 600, easing: "cubic-bezier(.4,0,.2,1)" }),
          anim($(".relleno", sil), [{ opacity: 0 }, { opacity: 0, offset: .5 }, { opacity: 1 }], { duration: 700, easing: "ease-out" })]);
        await esperar(120);
        anim(sil, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-in" });
        // 4,2 s: el título golpea la pantalla (escala 2,4 → 1 en 180 ms, rebote y temblor)
        if (h2) {
          h2.style.visibility = "";
          await anim(h2, [{ scale: 2.4, opacity: 0 }, { scale: .94, opacity: 1, offset: .75 }, { scale: 1, opacity: 1 }], { duration: 240, easing: "cubic-bezier(.5,0,.6,1.4)", fill: "none" });
          anim($("#viewport"), [{ translate: "0 0" }, { translate: "6px -4px" }, { translate: "-5px 3px" }, { translate: "3px 2px" }, { translate: "0 0" }], { duration: 200, easing: "linear", fill: "none" });
        }
        await esperar(420);
        await Promise.all([fresco, gogo].map(e => anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: "ease-in" })));
      } finally { if (h2) h2.style.visibility = ""; quitar(c); }
    },
    async salir(ctx) {
      const { anim, esperar } = ctx;
      const c = ctx.instantanea();
      c.classList.add("se", "se-dio");
      // el tiempo está detenido: la escena gris y el reloj que gira hacia atrás
      c.copia.style.filter = "grayscale(1) contrast(1.15) brightness(.8)";
      const svg = PUENTE.cable(c, { desde: ctx.desde, senal: false });
      svg.firstChild.style.opacity = 0;
      const r = g(svg, reloj, "se-dio-reloj");
      await anim(r, [{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 220, easing: "cubic-bezier(.2,1.4,.4,1)" });
      await Promise.all([
        anim($(".larga", r), [{ transform: "rotate(0)" }, { transform: "rotate(-900deg)" }], { duration: 700, easing: "cubic-bezier(.5,0,.5,1)" }),
        anim($(".corta", r), [{ transform: "rotate(0)" }, { transform: "rotate(-300deg)" }], { duration: 700, easing: "cubic-bezier(.5,0,.5,1)" })
      ]);
      // se descongela con un destello: vuelve el color y aparece el puente
      const blanco = div(c, "se-dio-blanco");
      await anim(blanco, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "ease-out" });
      c.copia.remove(); r.remove();
      c.classList.add("mundo-puente");
      svg.firstChild.style.opacity = "";
      // el cable vuelve sin tensión: se relaja de una curva a la recta
      const { W } = medida(svg);
      svg.firstChild.setAttribute("d", `M${-W / 2 - 20} 0Q0 46 ${W / 2 + 20} 0`);
      await Promise.all([
        anim(blanco, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-out" }),
        anim(svg.firstChild, [{ d: `path("M${-W / 2 - 20} 0Q0 46 ${W / 2 + 20} 0")` }, { d: `path("M${-W / 2 - 20} 0Q0 -12 ${W / 2 + 20} 0")`, offset: .6 }, { d: `path("M${-W / 2 - 20} 0Q0 0 ${W / 2 + 20} 0")` }], { duration: 520, easing: "ease-out" })
      ]);
      blanco.remove();
      svg.firstChild.setAttribute("d", `M${-W / 2 - 20} 0H${W / 2 + 20}`);
      await esperar(100);
      return c;
    }
  });
})();

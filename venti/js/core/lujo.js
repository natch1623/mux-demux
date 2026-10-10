/* =====================================================================
   Lujo — acabado de material para todos los diagramas SVG (svg.logic)
   - Inyecta degradados y filtros comunes (jade biselado, filo de marfil,
     incrustación dorada, gemas) leyendo los colores de tokens.css.
   - A cada cable .w le pone una funda (debajo) y un núcleo de energía
     (encima) que copian su estado: el núcleo solo fluye si el cable vale 1.
   No cambia la geometría ni la lógica de ninguna diapositiva.
   ===================================================================== */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const T = n => Style.get(n);

  function defs() {
    if (document.getElementById("lujo-defs")) return;
    const c = {
      act: T("--signal-active"), gold: T("--selector-gold"), goldL: T("--ornament-gold-light"), goldD: T("--ornament-gold-dark"),
      ivory: T("--ornament-ivory"), text: T("--text-main"), muted: T("--text-muted"), teal: T("--ornament-teal"),
      space: T("--bg-space"), horizon: T("--bg-horizon"), abyss: T("--bg-abyss"), off: T("--signal-inactive"), err: T("--signal-error")
    };
    // relieve: luz especular sobre el canal alfa desenfocado + incrustación interior + sombra
    const relief = (id, rim, glow) => `
      <filter id="${id}" x="-30%" y="-35%" width="160%" height="170%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="b"/>
        <feSpecularLighting in="b" surfaceScale="5" specularConstant=".8" specularExponent="20" lighting-color="${c.text}" result="sp">
          <feDistantLight azimuth="235" elevation="44"/></feSpecularLighting>
        <feComposite in="sp" in2="SourceAlpha" operator="in" result="spIn"/>
        <feMorphology in="SourceAlpha" operator="erode" radius="8" result="e1"/>
        <feMorphology in="SourceAlpha" operator="erode" radius="10" result="e2"/>
        <feComposite in="e1" in2="e2" operator="out" result="ring"/>
        <feFlood flood-color="${rim}" flood-opacity=".6"/><feComposite in2="ring" operator="in" result="inlay"/>
        <feOffset in="SourceAlpha" dy="9" result="o"/><feGaussianBlur in="o" stdDeviation="9" result="ob"/>
        <feFlood flood-color="${c.abyss}" flood-opacity=".8"/><feComposite in2="ob" operator="in" result="shadow"/>
        ${glow ? `<feGaussianBlur in="SourceAlpha" stdDeviation="14" result="gb"/><feFlood flood-color="${glow}" flood-opacity=".75"/><feComposite in2="gb" operator="in" result="aura"/>` : ""}
        <feMerge result="m">${glow ? '<feMergeNode in="aura"/>' : ""}<feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/><feMergeNode in="inlay"/></feMerge>
        <feComposite in="m" in2="spIn" operator="arithmetic" k2="1" k3=".55"/>
      </filter>`;
    const svg = document.createElementNS(NS, "svg");
    svg.id = "lujo-defs"; svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    svg.innerHTML = `<defs>
      <linearGradient id="lj-jade" x1="0" y1="0" x2=".35" y2="1">
        <stop offset="0" stop-color="${c.teal}"/><stop offset=".42" stop-color="${c.horizon}"/><stop offset="1" stop-color="${c.abyss}"/></linearGradient>
      <linearGradient id="lj-jade-on" x1="0" y1="0" x2=".35" y2="1">
        <stop offset="0" stop-color="${c.act}" stop-opacity=".95"/><stop offset=".5" stop-color="${c.teal}"/><stop offset="1" stop-color="${c.horizon}"/></linearGradient>
      <linearGradient id="lj-rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c.text}"/><stop offset=".45" stop-color="${c.ivory}"/><stop offset=".7" stop-color="${c.muted}"/><stop offset="1" stop-color="${c.ivory}"/></linearGradient>
      <linearGradient id="lj-rim-on" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c.text}"/><stop offset=".5" stop-color="${c.act}"/><stop offset="1" stop-color="${c.text}"/></linearGradient>
      <linearGradient id="lj-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c.goldL}"/><stop offset=".4" stop-color="${c.gold}"/><stop offset=".55" stop-color="${c.goldL}"/><stop offset="1" stop-color="${c.goldD}"/></linearGradient>
      <radialGradient id="lj-gem" cx=".35" cy=".3" r=".8">
        <stop offset="0" stop-color="${c.text}"/><stop offset=".35" stop-color="${c.act}"/><stop offset="1" stop-color="${c.teal}"/></radialGradient>
      <radialGradient id="lj-pearl" cx=".35" cy=".3" r=".8">
        <stop offset="0" stop-color="${c.text}"/><stop offset=".5" stop-color="${c.ivory}"/><stop offset="1" stop-color="${c.off}"/></radialGradient>
      ${relief("lj-relief", c.goldL, null)}
      ${relief("lj-relief-on", c.text, c.act)}
      <filter id="lj-soft" x="-50%" y="-50%" width="200%" height="200%"><feOffset in="SourceAlpha" dy="3"/><feGaussianBlur stdDeviation="3"/>
        <feComponentTransfer><feFuncA type="linear" slope=".7"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`;
    document.body.appendChild(svg);
  }

  // funda + núcleo que siguen la clase (v1, s) y la forma del cable original
  function sheathe(w) {
    if (w.__lujo) return;
    const mk = cls => { const p = document.createElementNS(NS, "path"); p.setAttribute("class", cls); p.setAttribute("d", w.getAttribute("d")); return p; };
    const sheath = mk("lj-sheath"), core = mk("lj-core");
    w.parentNode.insertBefore(sheath, w);
    w.parentNode.insertBefore(core, w.nextSibling);
    const sync = () => {
      const k = w.classList;
      const st = (k.contains("v1") ? " on" : "") + (k.contains("s") ? " sel" : "") + (k.contains("base") ? " base" : "") + (k.contains("chan") ? " chan" : "");
      sheath.setAttribute("class", "lj-sheath" + st);
      core.setAttribute("class", "lj-core" + st);
      const d = w.getAttribute("d"); if (sheath.getAttribute("d") !== d) { sheath.setAttribute("d", d); core.setAttribute("d", d); }
      // mientras el cable se «dibuja», la funda se dibuja con él
      if (k.contains("draw")) {
        const pl = w.getAttribute("pathLength");
        if (pl) sheath.setAttribute("pathLength", pl); else sheath.removeAttribute("pathLength");
        sheath.style.strokeDasharray = getComputedStyle(w).strokeDasharray;
        sheath.style.strokeDashoffset = getComputedStyle(w).strokeDashoffset;
      }
    };
    w.__lujo = { sheath, core, sync };
    new MutationObserver(sync).observe(w, { attributes: true, attributeFilter: ["class", "d"] });
    if (w.classList.contains("draw")) {
      w.addEventListener("transitionrun", () => requestAnimationFrame(function f() { sync(); if (w.getAnimations().length) requestAnimationFrame(f); }));
      w.addEventListener("transitionend", sync);
    }
    sync();
  }

  function enhance(root) {
    defs();
    (root || document).querySelectorAll("svg.logic path.w").forEach(sheathe);
  }

  window.Lujo = { enhance };
})();

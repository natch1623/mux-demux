"use strict";
/* Dirección de arte. Representación y coreografía; nunca calcula ni cambia bits. */
const REALMS = (() => {
  const names = { marceline: ["MARCELINE", "El taller de la noche"], tsaritsa: ["SNEZHNAYA", "La cámara de selección"], venom: ["VENOM", "El circuito asimilado"], dio: ["DIO", "El teatro del tiempo"] };
  const colors = { marceline: "#C63D50", tsaritsa: "#A8DCEC", venom: "#F3F1E8", dio: "#E4B63D" };
  const svg = (content, cls = "") => `<svg class="realm-art ${cls}" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${content}</svg>`;
  const bat = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 2C-18-28-40-23-58-38L-45 0Q-32-13-22 7Q-12-5 0 16Q12-5 22 7Q32-13 45 0L58-38C40-23 18-28 0 2Z" fill="#100F18"/>`;
  const bass = `<g transform="translate(1785 625) rotate(15)"><path d="M-14-280H14V65H-14Z" fill="#725043" stroke="#121019" stroke-width="6"/><path d="M-20-294L18-307L27-234L-20-224Z" fill="#A9A3BB" stroke="#121019" stroke-width="6"/><path d="M-7 18Q-64-54-93 22L-42 96Q-40 165 0 185Q40 165 42 96L93 22Q64-54 7 18Z" fill="#C63D50" stroke="#121019" stroke-width="10"/><path d="M-70 12L-35 82M70 12L35 82" stroke="#F4E7D1" stroke-width="13"/><rect x="-21" y="81" width="42" height="14" fill="#17151F"/><path d="M-8-245V132M-3-245V132M3-245V132M8-245V132" stroke="#EEE1C7" stroke-width="2"/></g>`;
  function scenery(theme) {
    if (theme === "marceline") return svg(`<rect width="1920" height="1080" fill="#17151F"/><path d="M0 0H1920V190L1800 85L1650 148L1480 38L1270 105L1010 20L850 98L670 48L480 125L250 55L110 192L0 420Z" fill="#393341"/><path d="M0 100L135 202L93 382L160 570L80 810L135 1080H0ZM1920 30L1785 132L1855 387L1805 600L1880 885L1770 1080H1920Z" fill="#302B38"/><path d="M0 972Q450 880 960 962T1920 933V1080H0Z" fill="#392B2C"/><path d="M0 1005Q390 940 780 998T1600 993M180 1040L440 1013M1180 1044L1650 1025" stroke="#725043" fill="none" stroke-width="5"/><g fill="none" stroke="#A9A3BB" opacity=".25" stroke-width="3"><path d="M110 173L198 118L245 143M1850 610L1818 686L1860 743M36 530L72 592L36 670"/></g>`, "realm-back") + svg(`${bass}${bat(220, 175, .75)}${bat(1620, 150, .45)}<g transform="translate(1420 70) rotate(5)"><path d="M0 0L208 5L198 111L-7 107Z" fill="#F4E7D1"/><path d="M14 34Q85 10 180 33M20 67L145 74" stroke="#725043" fill="none" stroke-width="3"/><text x="23" y="57" fill="#17151F" font-family="Patrick Hand, cursive" font-size="30">mi pequeño caos</text><path d="M18-9L72-7L67 13L13 9M140-4L183-1L182 16L142 12" fill="#A9A3BB" opacity=".8"/></g><path d="M40 857C180 829 123 1002 330 969S530 921 680 1030" fill="none" stroke="#0B0A10" stroke-width="14"/><path d="M40 857C180 829 123 1002 330 969S530 921 680 1030" fill="none" stroke="#C63D50" stroke-width="3"/>`, "realm-front");
    if (theme === "tsaritsa") return svg(`<rect width="1920" height="1080" fill="#081426"/><path d="M250 970V340Q250 42 960 20Q1670 42 1670 340V970" fill="#0E233C" stroke="#34546B" stroke-width="4"/><path d="M320 960V350Q320 100 960 64Q1600 100 1600 350V960" fill="#0A1B30" stroke="#C8AB69" stroke-opacity=".38" stroke-width="3"/>${[90, 1820].map(x => `<g transform="translate(${x} 0)"><path d="M-46 950L-27 200L0 115L27 200L46 950Z" fill="#17385B" stroke="#A8DCEC" stroke-opacity=".35" stroke-width="3"/><path d="M0 115V950M-46 950L0 902L46 950" fill="none" stroke="#A8DCEC" stroke-opacity=".4" stroke-width="3"/><path d="M-67 955H67V979H-67Z" fill="#C8AB69" opacity=".4"/></g>`).join("")}<path d="M0 970H1920V1080H0Z" fill="#112C46"/><path d="M0 997H1920M0 1045H1920M960 970L540 1080M960 970L1380 1080M250 970L0 1080M1670 970L1920 1080" fill="none" stroke="#A8DCEC" stroke-opacity=".16" stroke-width="2"/>`, "realm-back") + svg(`<g transform="translate(960 98)" stroke="#C8AB69" fill="none" opacity=".65"><path d="M0-64L55-32V32L0 64L-55 32V-32Z" stroke-width="2"/><path d="${flakePath(0,0,45)}" stroke-width="3"/><path d="M-190 0H-77M77 0H190"/></g><g transform="translate(1784 795)" fill="#A8DCEC" stroke="#F1F7FA" stroke-width="2"><path d="M-31 100H31L22 62H-22ZM-20 58H20L12-22H-12ZM-24-25H24L35-66L12-50L0-79L-12-50L-35-66Z" fill-opacity=".2"/><path d="M0-79V100" opacity=".3"/><path d="M-48 105H48V122H-48Z" fill="#C8AB69" fill-opacity=".5"/></g><path d="M0 1060L60 878L120 1050L175 940L202 1080M1690 1080L1740 973L1805 1060L1885 880L1920 1080" fill="#A8DCEC" opacity=".18"/>`, "realm-front");
    if (theme === "venom") return svg(`<rect width="1920" height="1080" fill="#050608"/><g fill="#171C23">${[0,1,2,3,4,5].map(i => `<path d="M${i*360-80} 0H${i*360+160}V${95+(i%3)*45}H${i*360-80}Z"/>`).join("")}<path d="M0 850L160 730L310 1080H0ZM1920 610L1770 720L1670 1080H1920Z"/></g><g fill="none" stroke="#63788E" stroke-width="2" opacity=".26"><path d="M200 0L170 145L50 190M1920 200L1770 180L1800 0M0 937L230 898L318 1080"/></g>`, "realm-back") + svg(`<g fill="none" stroke-linecap="round"><path d="M-40 80C265 10 370 170 210 256S-50 505 80 652S335 784 190 1100M1960-40C1700 90 1760 420 1870 493S1810 807 1620 940S1720 1100 1940 1010" stroke="#000" stroke-width="65"/><path d="M-40 62C265-8 350 156 193 240M1885 508C1820 680 1800 745 1670 839" stroke="#63788E" stroke-width="4" opacity=".65"/><path d="M0 1030C350 772 100 690 402 690M1920 200C1560 20 1650 340 1510 200" stroke="#000" stroke-width="25"/></g><g transform="translate(1790 800) rotate(-8) scale(.65)" fill="#F3F1E8"><path d="M-95-20Q-58 7-7 17L-20 45Q-85 70-95-20ZM95-20Q58 7 7 17L20 45Q85 70 95-20Z"/></g><g transform="translate(113 797)" fill="none" stroke="#F3F1E8" stroke-width="7" opacity=".7"><path d="M0-44V47M-12-20L-57-50L-70-20M12-20L57-50L70-20M-12-8L-72-12L-85 27M12-8L72-12L85 27M-12 7L-57 36L-66 69M12 7L57 36L66 69M-8 25L-30 73L-22 102M8 25L30 73L22 102"/></g>`, "realm-front");
    return svg(`<rect width="1920" height="1080" fill="#171020"/><path d="M210 940V220Q260 45 500 25H1420Q1660 45 1710 220V940" fill="#201725" stroke="#E4B63D" stroke-opacity=".3" stroke-width="4"/><path d="M290 935V256Q335 120 520 105H1400Q1585 120 1630 256V935" fill="#130F1B" stroke="#71A84B" stroke-opacity=".25" stroke-width="3"/><path d="M0 0H390Q210 210 182 434L73 544L0 900ZM1920 0H1530Q1710 210 1738 434L1847 544L1920 900Z" fill="#57233F"/><path d="M50 0Q158 132 62 471M135 0Q250 140 138 451M1870 0Q1762 132 1858 471M1785 0Q1670 140 1782 451" fill="none" stroke="#B7457C" stroke-opacity=".35" stroke-width="9"/><path d="M0 995H1920V1080H0Z" fill="#2C2331"/><path d="M0 1040L570 995H1240L1920 1040M960 995V1080" fill="none" stroke="#E4B63D" stroke-opacity=".2" stroke-width="4"/>`, "realm-back") + svg(`<path d="M1480 0L1810 0L1380 215H1330Z" fill="#71A84B" opacity=".3"/><path d="M0 0L260 0L60 490L0 640Z" fill="#050508"/><g transform="translate(1695 112) rotate(12)" fill="#E4B63D" stroke="#171020" stroke-width="2" paint-order="stroke" font-family="sans-serif" font-weight="900" font-size="64"><text>ゴゴゴ</text></g><g transform="translate(119 790)"><path d="M0-82L40-40L30 0L44 58L0 82L-44 58L-30 0L-40-40Z" fill="#E4B63D"/><path d="M0-26C-25-55-54-13 0 24C54-13 25-55 0-26Z" fill="#71A84B"/><path d="M-11 25L-20 68M11 25L20 68" stroke="#171020" stroke-width="5"/></g>`, "realm-front");
  }
  function mount(sec, theme) {
    if (typeof AMBIENCE !== 'undefined') { AMBIENCE.mount(sec,theme); return; }
    const bg = $(".st-bg", sec);
    bg.innerHTML = `<div class="realm-room">${scenery(theme)}<div class="realm-floor"></div></div>`;
    sec.dataset.realm = theme;
  }
  // A single cancellable transition surface, independent of electrical state.
  let curtain = null, activeAnimations = [];
  async function animate(el, frames, duration) {
    if (reduced || MOTION.skip) return;
    const a = el.animate(frames, { duration, easing: "cubic-bezier(.23,1,.32,1)", fill: "both" });
    activeAnimations.push(a);
    try { await a.finished; } catch (e) { if (e.name !== "AbortError") throw e; }
    finally { a.cancel(); activeAnimations = activeAnimations.filter(x => x !== a); }
  }
  async function transition(theme, commit, direction = 1) {
    // los mundos rediseñados tienen sus cuatro transiciones propias, en rotación
    if (MUNDOS.conTransiciones(theme)) return MUNDOS.transicion(theme, commit, direction);
    if (reduced || MOTION.skip) { commit(); return; }
    const c = curtain;
    c.className = `realm-curtain ${theme}`;
    c.innerHTML = theme === "dio" ? '<span>ZA WARUDO</span><i></i>' : theme === "marceline" ? '<span>la siguiente nota…</span><i></i>' : theme === "tsaritsa" ? '<span>◇</span><i></i>' : '<span></span><i></i>';
    c.hidden = false;
    const enter = theme === "marceline" ? [{ transform:`translateX(${direction*105}%) rotate(-5deg)` },{ transform:"translateX(0) rotate(0)" }]
      : theme === "venom" ? [{clipPath:"ellipse(2% 60% at 0% 50%)"},{clipPath:"ellipse(150% 140% at 0% 50%)"}]
      : theme === "tsaritsa" ? [{opacity:0,transform:"scale(.95)"},{opacity:1,transform:"scale(1)"}]
      : [{clipPath:"polygon(0 0,0 0,0 100%,0 100%)"},{clipPath:"polygon(0 0,100% 0,100% 100%,0 100%)"}];
    try {
      await animate(c, enter, theme === "tsaritsa" ? 260 : 220);
      commit();
      const exit = theme === "marceline" ? [{transform:"translateX(0) rotate(0)"},{transform:`translateX(${-direction*105}%) rotate(4deg)`}]
        : theme === "venom" ? [{clipPath:"ellipse(150% 140% at 100% 50%)"},{clipPath:"ellipse(0% 0% at 100% 50%)"}]
        : [{opacity:1,transform:"scale(1)"},{opacity:0,transform:theme === "dio" ? "translateX(10px)" : "scale(1.04)"}];
      await animate(c, exit, theme === "tsaritsa" ? 340 : 280);
    } finally { c.hidden = true; c.innerHTML = ""; }
  }
  function finish() { activeAnimations.forEach(a => { try { a.finish(); } catch {} }); }
  // confirmaciones sonoras con el timbre de cada mundo (js/sonido.js)
  function tone(theme, kind = "touch") { SONIDO.toque(theme, kind); }
  // cada fase suena según lo que aparece (su etiqueta); las de 5 toques suenan desde su dibujo
  function sonarFase(theme, p) { if (!p.custom) SONIDO.fase(theme, p.labels[p.phase]); }

  let selected = null, defs = [], guided = !new URLSearchParams(location.search).has("libre"), plain = false;
  const phases = new WeakMap();
  function prepare(def) {
    const sec = def.el, scope = $(".st-in", sec), groups = [];
    // estación con fases propias de su mundo (los 5 toques de un 4:1 suelto)
    const custom = MUNDOS.fases(def);
    if (custom) { phases.set(sec, { phase:0, groups, labels: custom.etiquetas, custom }); return; }
    const terms = $$(".eq-stage .term, .eq-stage .eq.line", sec);
    let labels;
    if (terms.length) {
      labels = ["La selección", ...terms.map((_,i) => `Combinación ${i.toString(2).padStart(2,"0")}`), "Tabla y comprobación"];
      terms.forEach((el,i) => groups.push([el, i+1]));
      $$(".eq-stage .plus", sec).forEach((el,i) => groups.push([el, i+2]));
      $$(".eq-stage .ice-table, .eq-stage .lede", sec).forEach(el => groups.push([el,labels.length-1]));
    } else {
      labels = ["La idea", "El circuito", "Toca y comprueba"];
      $$(".fig, .tree-box, .ph-emblem, .ice-table, .legend, .parts", scope).filter(el => !el.parentElement.closest(".fig,.tree-box")).forEach(el => groups.push([el,1]));
      $$(".ctrl, .readout, .formula, .hint", scope).forEach(el => groups.push([el,2]));
      if (!groups.length) labels = ["Explorar"];
    }
    phases.set(sec, { phase:0, groups, labels });
  }
  function renderPhase() {
    if (!selected) return;
    const p = phases.get(selected.el); if (!p) return;
    selected.el.classList.toggle("guided", guided);
    for (const [el, n] of p.groups) {
      const hide = guided && p.phase < n;
      // lo que aparece entra con su transición (sube y se aclara)
      // lo que aparece entra con el gesto de su mundo (js/mundos/aparicion.js), sin desenfoque
      const aparece = !hide && el.classList.contains("phase-hidden") && !reduced && !MOTION.skip;
      if (hide && el.contains(document.activeElement)) $("#phaseNext").focus({preventScroll:true});
      el.classList.toggle("phase-hidden", hide); el.inert = hide;
      if (aparece) APARICION.aparecer(el, selected.el.dataset.realm);
      if (hide) { if (!el.hasAttribute("data-phase-aria")) el.dataset.phaseAria = el.getAttribute("aria-hidden") ?? "absent"; el.setAttribute("aria-hidden", "true"); }
      else if (el.hasAttribute("data-phase-aria")) { if (el.dataset.phaseAria === "absent") el.removeAttribute("aria-hidden"); else el.setAttribute("aria-hidden",el.dataset.phaseAria); delete el.dataset.phaseAria; }
    }
    MUNDOS.fase(selected, guided ? p.phase : p.labels.length-1, { guiado: guided, total: p.labels.length, custom: p.custom });
    $("#phaseLabel").textContent = guided ? `${p.phase+1}/${p.labels.length} · ${p.labels[p.phase]}` : "Exploración libre";
    $("#phaseBack").disabled = !guided || p.phase === 0;
    $("#phaseNext").disabled = !guided || p.phase === p.labels.length-1;
    $("#phaseMode").textContent = guided ? "Ver todo" : "Paso a paso";
    $("#phaseMode").setAttribute("aria-pressed", String(guided));
    $("#realmReplay").disabled = !selected.el.querySelector('svg[data-replay="true"]') || (guided && p.phase < p.labels.length-1);
    selected.el.dispatchEvent(new CustomEvent("phasechange", {detail:{ready:!guided || p.phase===p.labels.length-1}}));
  }
  /* avance automático: al llegar a una estación, sus partes aparecen solas, una tras otra.
     Cualquier control manual (teclado, «Ver todo»…) lo detiene. */
  const PASO = 1800, PASO_TOQUE = 2200;
  let autoTimer = 0;
  const stopAuto = () => { clearTimeout(autoTimer); autoTimer = 0; };
  function auto(def) {
    stopAuto();
    if (STILL || !guided || selected !== def) return;
    const p = phases.get(def.el); if (!p) return;
    p.phase = 0; renderPhase();
    const next = () => {
      if (selected !== def || p.phase >= p.labels.length - 1) { autoTimer = 0; return; }
      if (document.documentElement.classList.contains("busy")) { autoTimer = setTimeout(next, 300); return; }
      p.phase++; renderPhase(); sonarFase(def.el.dataset.realm, p);
      autoTimer = setTimeout(next, p.custom ? PASO_TOQUE : PASO);
    };
    autoTimer = setTimeout(next, reduced ? 600 : 900);
  }
  function changePhase(dir) {
    if (!selected) return;
    stopAuto();
    const p = phases.get(selected.el); p.phase = clamp(p.phase+dir,0,p.labels.length-1);
    renderPhase(); if (dir > 0) sonarFase(selected.el.dataset.realm, p);
  }
  function select(def) {
    if (def !== selected) stopAuto();
    selected = def || null;
    MUNDOS.seleccionar(selected);
    if (!$("#realmControls")) return;
    $("#realmControls").hidden = !def;
    $("#realmSignature").hidden = !def;
    if (!def) return;
    const theme = def.el.dataset.realm;
    $("#realmSignature").innerHTML = `<b>${names[theme][0]}</b><span>${names[theme][1]}</span>`;
    document.documentElement.style.setProperty("--realm-accent",colors[theme]);
    renderPhase();
  }
  function init(stations) {
    defs = stations; stations.forEach(prepare);
    curtain = html('<div class="realm-curtain" aria-hidden="true" hidden></div>'); document.body.append(curtain);
    document.body.append(html('<div id="realmSignature" class="realm-signature" aria-hidden="true" hidden></div>'));
    const controls = html(`<div id="realmControls" class="realm-controls" role="group" aria-label="Fases de la explicación" hidden>
      <button id="phaseBack" aria-label="Paso anterior">‹</button><span id="phaseLabel" role="status"></span><button id="phaseNext" aria-label="Siguiente paso">›</button>
      <button id="phaseMode" aria-pressed="true">Ver todo</button><button id="realmReplay" title="Repetir la última propagación">↻ Recorrido</button><button id="realmPlain" aria-pressed="false">Ver esquema</button>
    </div>`); document.body.append(controls);
    controls.style.display = "none";   // no se muestra: las fases avanzan solas
    $("#phaseBack").onclick=()=>changePhase(-1); $("#phaseNext").onclick=()=>changePhase(1);
    $("#phaseMode").onclick=()=>{stopAuto();guided=!guided;renderPhase();};
    stations.forEach(d => { d.el.addEventListener("enter", () => auto(d)); d.el.addEventListener("leave", stopAuto); });
    $("#realmPlain").onclick=()=>{ plain=!plain; document.documentElement.classList.toggle("schematic",plain); $("#realmPlain").setAttribute("aria-pressed",String(plain)); $("#realmPlain").textContent=plain?"Volver al mundo":"Ver esquema"; };
    $("#realmReplay").onclick=()=>{ if (!selected) return; $$("svg.fig[data-replay]",selected.el).forEach(s=>s.dispatchEvent(new Event("replay-signal"))); };
    const soundBtn=html(`<button class="tbtn" id="realmSound" aria-pressed="${SONIDO.activo}" aria-label="${SONIDO.activo ? "Silenciar sonido" : "Activar sonido"}" title="Sonido sintetizado (activar o silenciar)">♪</button>`); $(".tools").append(soundBtn);
    soundBtn.onclick=()=>{ const on=!SONIDO.activo; SONIDO.activar(on); soundBtn.setAttribute("aria-pressed",String(on)); soundBtn.setAttribute("aria-label",on?"Silenciar sonido":"Activar sonido"); if(on) tone(selected?.el.dataset.realm||"hub"); };
    const skip=html('<button id="skipJourney" class="skip-journey">Omitir transición <kbd>Esc</kbd></button>'); document.body.append(skip);
    skip.onclick=()=>{MOTION.finish();finish();document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().iterations))try{a.finish();}catch{}});};
    document.addEventListener("click", e=>{
      const el=e.target.closest?.(".st.cur [role=button], .st.cur button, .st.cur [role=radio]");
      if(!el || el.closest(".phase-hidden")) return;
      tone(el.closest(".st").dataset.realm);
      const sec=el.closest(".st"); sec.classList.remove("touch-feedback");
      // Feedback is a state transition, not a delayed electrical update.
      sec.classList.add("touch-feedback"); clearTimeout(sec._feedback); sec._feedback=setTimeout(()=>sec.classList.remove("touch-feedback"),160);
    }, true);
    mq.addEventListener("change",()=>{if(reduced){MOTION.finish();finish();BATS.stop();VENOM.stop();}});
  }
  return { mount, init, select, transition, finish, tone, renderPhase };
})();

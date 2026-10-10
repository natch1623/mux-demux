/* Respaldo SVG: misma geometría, estado y controles que Rig3D. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  function create(ctx, options) {
    const opts = Object.assign({ type: "mux", at: [960, 540], scale: 1 }, options);
    const mux = opts.type === "mux", ys = [-225, -75, 75, 225];
    const st = { sel: 0, data: [0, 0, 0, 0], d: 0, y: 0, outs: [0, 0, 0, 0], live: true };
    const vis = { inputs: false, body: false, select: false, output: false, routes: false, labels: false };
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 1920 1080"); svg.setAttribute("class", "sim-rig-svg"); svg.setAttribute("role", "img");
    svg.style.cssText = "position:absolute;inset:0;width:1920px;height:1080px;overflow:visible;pointer-events:none";
    const title = document.createElementNS(NS, "title"); svg.appendChild(title); ctx.layer.appendChild(svg);
    function node(tag, attrs, parent) {
      const el = document.createElementNS(NS, tag);
      Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
      (parent || root).appendChild(el); return el;
    }
    const root = node("g", { transform: `translate(${opts.at[0]} ${opts.at[1]}) scale(${opts.scale})` }, svg);
    const groups = {};
    ["body", "routes", "inputs", "output", "select", "labels"].forEach(p => {
      groups[p] = node("g", { "data-part": p });
      groups[p].style.transition = "opacity var(--dur-gust) var(--ease-breeze-in)";
    });
    const hl = mux ? 300 : 160, hr = mux ? 160 : 300;
    node("path", { d: `M-130 ${-hl} L130 ${-hr} L130 ${hr} L-130 ${hl} Z`, class: "sim-rig-body" }, groups.body);
    const wire = (d, part, cls) => node("path", { d, class: "sim-rig-wire " + (cls || "") }, groups[part]);
    const inWires = [], outWires = [], routes = [], ins = [], outs = [];
    function orb(x, y, part) { return node("circle", { cx: x, cy: y, r: 34, class: "sim-rig-orb" }, groups[part]); }
    ys.forEach((y, k) => {
      if (mux) {
        ins.push(orb(-440, y, "inputs"));
        inWires.push(wire(`M-404 ${y} C-280 ${y} -170 ${y} -130 ${y * .95}`, "inputs"));
        routes.push(wire(`M-130 ${y * .95} C-20 ${y * .55} 80 0 130 0`, "routes"));
      } else {
        routes.push(wire(`M-130 0 C-80 0 20 ${y * .55} 130 ${y * .95}`, "routes"));
        outWires.push(wire(`M130 ${y * .95} C170 ${y} 280 ${y} 404 ${y}`, "output"));
        outs.push(orb(440, y, "output"));
      }
    });
    if (mux) { outs.push(orb(460, 0, "output")); outWires.push(wire("M130 0 L425 0", "output")); }
    else { ins.push(orb(-440, 0, "inputs")); inWires.push(wire("M-404 0 L-130 0", "inputs")); }
    const strings = [-45, 45].map(x => {
      const top = hl + (hr - hl) * ((x + 130) / 260) + 10;
      const s = wire(`M${x} ${top} L${x} 415`, "select", "sim-rig-string");
      node("circle", { cx: x, cy: 425, r: 20, class: "sim-rig-knob" }, groups.select); return s;
    });
    // HTML en el SVG conserva subíndices y el aspecto de las etiquetas 3D.
    const allLabels = [];
    function label(name, x, y, cls, part, width) {
      const w = width || 220;
      const box = node("foreignObject", { x: x - w / 2, y: y - 26, width: w, height: 64 }, groups.labels);
      const el = document.createElement("div"); el.className = "lbl3d rig " + cls;
      el.style.cssText = `position:static;justify-content:center;opacity:1;font-size:calc(var(--text-label) / ${opts.scale})`;
      el.innerHTML = `<span class="nm">${name}</span><b class="v">0</b>`;
      el.querySelector('.v').style.fontSize = `calc(var(--text-min) / ${opts.scale})`;
      box.appendChild(el); allLabels.push({ box, el, part }); return el;
    }
    const names = opts.inNames || (mux ? ys.map((_, k) => `I<sub>${k}</sub>`) : ["D"]);
    const inLabs = ins.map((_, k) => label(names[k], -560, mux ? ys[k] : 0, "in", "inputs", 320));
    const outLabs = outs.map((_, k) => label(mux ? (opts.outName || "Y") : `Y<sub>${k}</sub>`, mux ? 555 : 535, mux ? 0 : ys[k], "out", "output"));
    const selLabs = strings.map((_, k) => label(`S<sub>${1 - k}</sub>`, k ? 120 : -120, 425, "sel", "select"));
    if (opts.title) {
      const box = node("foreignObject", { x: -350, y: -390, width: 700, height: 70 }, groups.labels);
      const el = document.createElement("div"); el.className = "lbl3d rig title";
      el.style.cssText = `position:static;justify-content:center;opacity:1;font-size:calc(var(--text-h2) / ${opts.scale})`; el.innerHTML = opts.title;
      box.appendChild(el); allLabels.push({ box, el, part: "body" });
    }
    const packets = node("g", {}, root), gust = node("path", { class: "sim-rig-gust" }, packets);
    let disposed = false;
    const active = (el, v) => el.classList.toggle("sim-rig-active", !!v);
    function value(el, v, chosen) {
      el.querySelector(".v").textContent = v; el.classList.toggle("hi", !!v); el.classList.toggle("chosen", !!chosen);
    }
    function refresh() {
      st.y = mux ? (st.data[st.sel] ? 1 : 0) : 0;
      st.outs = mux ? [0, 0, 0, 0] : ys.map((_, k) => +(k === st.sel && !!st.d));
      const inputs = mux ? st.data : [st.d], outputs = mux ? [st.y] : st.outs;
      inputs.forEach((v, k) => { active(ins[k], v); active(inWires[k], v); value(inLabs[k], v, st.live && mux && k === st.sel); });
      outputs.forEach((v, k) => {
        active(outs[k], st.live && v); active(outWires[k], st.live && v);
        value(outLabs[k], st.live ? v : '?', st.live && !mux && k === st.sel);
        outLabs[k].classList.toggle('hi', st.live && !!v);
      });
      routes.forEach((el, k) => active(el, st.live && k === st.sel));
      strings.forEach((el, k) => {
        const b = (st.sel >> (1 - k)) & 1, changed = el.dataset.bit != null && +el.dataset.bit !== b;
        el.dataset.bit = b; active(el, b); value(selLabs[k], b);
        if (changed && !ctx.calm && el.animate && window.Style) {
          el.getAnimations().forEach(a => a.cancel());
          el.animate([{ transform: "translateX(0)" }, { transform: "translateX(8px)" }, { transform: "translateX(-6px)" }, { transform: "translateX(0)" }], { duration: Style.ms("--dur-gust"), easing: Style.get("--ease-float") });
        }
      });
      const y = ys[st.sel];
      gust.setAttribute("d", mux ? `M-404 ${y} L-130 ${y * .95} Q0 0 130 0 L425 0` : `M-404 0 L-130 0 Q0 0 130 ${y * .95} L404 ${y}`);
      packets.style.opacity = +(st.live && !!(mux ? st.y : st.d) && vis.inputs && vis.routes && vis.output);
      Object.keys(vis).forEach(p => { groups[p].style.opacity = +vis[p]; });
      allLabels.forEach(l => { l.box.style.opacity = +(vis.labels && vis[l.part]); });
      title.textContent = `${opts.title || (mux ? "MUX 4:1" : "DEMUX 1:4")}: S1 S0 = ${(st.sel >> 1) & 1} ${st.sel & 1}; ${!st.live ? 'sin selección todavía' : mux ? "Y = " + st.y : "salidas " + st.outs.join(", ")}`;
    }
    const api = {
      root: svg, type: opts.type,
      get state() { return { ...st, data: st.data.slice(), outs: st.outs.slice() }; },
      show(parts) { Object.keys(parts).forEach(p => { if (p in vis) vis[p] = !!parts[p]; }); refresh(); return api; },
      showAll(on) { Object.keys(vis).forEach(p => { vis[p] = on !== false; }); refresh(); return api; },
      set(o) {
        if (o.sel != null) st.sel = o.sel & 3;
        if (o.data) st.data = o.data.map(v => +!!v);
        if (o.d != null) st.d = +!!o.d;
        if (o.live != null) st.live = !!o.live;
        if (o.inNames) o.inNames.forEach((n, k) => { if (inLabs[k]) inLabs[k].querySelector(".nm").innerHTML = n; });
        refresh(); return api;
      },
      snap() {
        svg.classList.add("sim-rig-snap"); refresh();
        svg.querySelectorAll("*").forEach(el => el.getAnimations && el.getAnimations().forEach(a => { if (a.effect.getTiming().iterations !== Infinity) a.finish(); }));
        void svg.getBoundingClientRect(); svg.classList.remove("sim-rig-snap"); return api;
      },
      labels: { inputs: inLabs, outputs: outLabs, select: selLabs },
      dispose() { if (disposed) return; disposed = true; svg.remove(); }
    };
    ctx.onDispose(api.dispose); refresh(); return api;
  }
  window.RigSVG = { create };
})();

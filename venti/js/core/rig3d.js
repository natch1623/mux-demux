/* =====================================================================
   Rig3D — MUX 4:1 y DEMUX 1:4 en 3D (reutilizado por diapositivas y simulador)

   const rig = ctx.rig({ type: "mux" | "demux", at: [px, py], scale: 1,
                         inNames: ["I<sub>0</sub>", ...], outName: "Y", title: "MUX 4:1" });
   rig.show({ inputs, body, select, output, routes, labels })  // booleanos (parciales)
   rig.showAll(on = true)
   rig.set({ sel: 0..3, data: [i0,i1,i2,i3] (mux), d: 0|1 (demux), inNames?: [...] })
   rig.state   → { sel, data, d, y (mux), outs: [y0..y3] (demux) }
   rig.dispose()  (también se libera solo al descargar la escena)

   Semántica visual (guía de estilo):
     dato 1  = ráfaga turquesa que viaja por el cable
     dato 0  = cable en verde apagado, sin ráfaga
     ruta elegida dentro del cuerpo = se ilumina (compuerta abierta)
     S1, S0 = cuerdas doradas de lira; vibran al cambiar de valor
   ===================================================================== */
(function () {
  "use strict";
  const Y4 = [2.25, 0.75, -0.75, -2.25];   // I0 arriba … I3 abajo
  const XL = -4.4, XB0 = -1.3, XB1 = 1.3, XR = 4.4;

  function create(ctx, opts) {
    const THREE = ctx.THREE;
    opts = Object.assign({ type: "mux", at: [960, 540], scale: 1, title: null }, opts || {});
    const mux = opts.type === "mux";
    const root = new THREE.Group();
    root.position.copy(ctx.at(opts.at[0], opts.at[1], opts.z || 0));
    root.scale.setScalar(opts.scale);
    if (opts.tilt) root.rotation.y = opts.tilt;
    ctx.group.add(root);

    const st = { sel: 0, data: [0, 0, 0, 0], d: 0, y: 0, outs: [0, 0, 0, 0], live: true }; // live=false: aún no hay selección (salidas en «?»)
    const vis = { inputs: [0, 0], body: [0, 0], select: [0, 0], output: [0, 0], routes: [0, 0], labels: [0, 0] }; // [actual, objetivo]
    const mats = [];                 // materiales a liberar
    const flows = [];                // { mat, part, on:[cur,target] }

    /* ---------- materiales ---------- */
    const orbMat = (part) => {
      const m = new THREE.MeshPhysicalMaterial({ color: ctx.color("--signal-inactive"), emissive: ctx.color("--signal-active"), emissiveIntensity: 0, roughness: 0.12, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.35, envMapIntensity: 1.4, transparent: true, opacity: 0 });
      mats.push(m); m.userData.part = part; return m;
    };
    function flowTube(points, part, opt) {
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2] || 0)), false, "centripetal");
      const len = curve.getLength();
      const core = ctx.flowMaterial({ rep: Math.max(1, len / 1.6), speed: 0.9, ...(opt || {}) });
      const halo = ctx.flowMaterial({ rep: Math.max(1, len / 1.6), speed: 0.9, halo: true, additive: true, ...(opt || {}) });
      const r = (opt && opt.r) || 0.055;
      const g1 = new THREE.TubeGeometry(curve, Math.max(24, Math.round(len * 14)), r, 10, false);
      const g2 = new THREE.TubeGeometry(curve, Math.max(24, Math.round(len * 14)), r * 3.2, 10, false);
      const m1 = new THREE.Mesh(g1, core), m2 = new THREE.Mesh(g2, halo);
      root.add(m1); root.add(m2);
      const f = { core, halo, part, on: [0, 0], curve };
      flows.push(f);
      return f;
    }

    /* oro pulido (refleja el entorno de Sky3D) */
    const goldMat = (part, max) => {
      const m = new THREE.MeshStandardMaterial({ color: ctx.color("--selector-gold"), emissive: ctx.color("--ornament-gold-dark"), emissiveIntensity: 0.12, metalness: 1, roughness: 0.26, envMapIntensity: 1.6, transparent: true, opacity: 0 });
      m.userData.part = part; if (max) m.userData.max = max; mats.push(m); return m;
    };
    const gemMat = (part) => {
      const m = new THREE.MeshPhysicalMaterial({ color: ctx.color("--signal-active"), emissive: ctx.color("--signal-active"), emissiveIntensity: 0.55, roughness: 0.05, metalness: 0, clearcoat: 1, transparent: true, opacity: 0 });
      m.userData.part = part; mats.push(m); return m;
    };

    /* ---------- orbes de entrada / salida ---------- */
    const orbGeo = new THREE.IcosahedronGeometry(0.34, 3);
    const ringGeo = new THREE.TorusGeometry(0.5, 0.034, 12, 72);
    const ring2Geo = new THREE.TorusGeometry(0.43, 0.018, 8, 64);
    const studGeo = new THREE.OctahedronGeometry(0.06, 0);
    function orb(x, y, part) {
      const g = new THREE.Group(); g.position.set(x, y, 0);
      const m = new THREE.Mesh(orbGeo, orbMat(part));
      const rm = goldMat(part);
      const ring = new THREE.Mesh(ringGeo, rm);
      const ring2 = new THREE.Mesh(ring2Geo, rm); ring2.rotation.y = Math.PI / 2;
      // cuatro remaches-gema sobre el anillo exterior
      const sm = gemMat(part);
      for (let q = 0; q < 4; q++) { const st = new THREE.Mesh(studGeo, sm); const a = q * Math.PI / 2 + Math.PI / 4; st.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0); ring.add(st); }
      g.add(m); g.add(ring); g.add(ring2); root.add(g);
      return { g, m, ring, ring2, val: [0, 0] };
    }

    const ins = [], outs = [];
    const inWires = [], routes = [], outWires = [];
    if (mux) {
      Y4.forEach((y, k) => {
        ins.push(orb(XL, y, "inputs"));
        inWires.push(flowTube([[XL + 0.36, y], [XL + 1.6, y], [XB0 - 0.4, y * 0.97], [XB0, y * 0.95]], "inputs"));
        routes.push(flowTube([[XB0, y * 0.95, 0], [-0.2, y * 0.55, 0.15], [0.8, 0.08 * Math.sign(y), 0.1], [XB1, 0, 0]], "routes", { r: 0.045 }));
      });
      outs.push(orb(XR + 0.2, 0, "output"));
      outWires.push(flowTube([[XB1, 0], [2.6, 0], [XR - 0.15, 0]], "output", { r: 0.07 }));
    } else {
      ins.push(orb(XL, 0, "inputs"));
      inWires.push(flowTube([[XL + 0.36, 0], [XL + 1.6, 0], [XB0, 0]], "inputs", { r: 0.07 }));
      Y4.forEach((y, k) => {
        routes.push(flowTube([[XB0, 0, 0], [-0.8, 0.08 * Math.sign(y), 0.1], [0.2, y * 0.55, 0.15], [XB1, y * 0.95, 0]], "routes", { r: 0.045 }));
        outWires.push(flowTube([[XB1, y * 0.95], [XB1 + 0.4, y * 0.97], [XR - 1.6, y], [XR - 0.36, y]], "output"));
        outs.push(orb(XR, y, "output"));
      });
    }

    /* ---------- cuerpo: trapecio extruido translúcido con aristas doradas ---------- */
    const shape = new THREE.Shape();
    const hl = mux ? 3.0 : 1.6, hr = mux ? 1.6 : 3.0;
    shape.moveTo(XB0, -hl); shape.lineTo(XB1, -hr); shape.lineTo(XB1, hr); shape.lineTo(XB0, hl); shape.closePath();
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 3 });
    bodyGeo.translate(0, 0, -0.4);
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: ctx.color("--bg-horizon"), emissive: ctx.color("--signal-active"), emissiveIntensity: 0.04,
      roughness: 0.14, metalness: 0.0, transparent: true, opacity: 0, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 0.45, iridescenceIOR: 1.35, envMapIntensity: 1.3 });
    bodyMat.userData.part = "body"; bodyMat.userData.max = 0.58; mats.push(bodyMat);
    const body = new THREE.Mesh(bodyGeo, bodyMat); body.renderOrder = 2; root.add(body);
    const edgeMat = new THREE.LineBasicMaterial({ color: ctx.color("--selector-gold"), transparent: true, opacity: 0 });
    edgeMat.userData.part = "body"; edgeMat.userData.max = 0.35; mats.push(edgeMat);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo, 30), edgeMat); root.add(edges);

    /* ---------- engaste: marco de oro macizo, remaches, marco grabado y gemas ---------- */
    const trim = new THREE.Group(); root.add(trim);
    const gTrim = goldMat("body"), gGem = gemMat("body");
    const corners = [[XB0, -hl], [XB1, -hr], [XB1, hr], [XB0, hl]];
    const ring3 = (pts, z, grow) => {
      const cx = (XB0 + XB1) / 2;
      return pts.map(([x, y]) => new THREE.Vector3(cx + (x - cx) * grow + Math.sign(x - cx) * 0.12, y * grow + Math.sign(y) * 0.12 * (grow === 1 ? 1 : 0), z));
    };
    const frameTube = (pts, r, mat) => {
      const cp = new THREE.CurvePath();
      pts.forEach((p, i) => cp.add(new THREE.LineCurve3(p, pts[(i + 1) % pts.length])));
      const m = new THREE.Mesh(new THREE.TubeGeometry(cp, 160, r, 8, true), mat); trim.add(m); return m;
    };
    [0.5, -0.5].forEach(z => frameTube(ring3(corners, z, 1), 0.065, gTrim));
    const rivet = new THREE.SphereGeometry(0.11, 16, 12);
    ring3(corners, 0.5, 1).forEach(p => { const r = new THREE.Mesh(rivet, gTrim); r.position.copy(p); trim.add(r); });
    // marco grabado interior y gemas en sus esquinas
    const inner = corners.map(([x, y]) => new THREE.Vector3((XB0 + XB1) / 2 + (x - (XB0 + XB1) / 2) * 0.72, y * 0.82, 0.54));
    frameTube(inner, 0.022, gTrim);
    const gemGeo = new THREE.OctahedronGeometry(0.09, 0);
    inner.forEach(p => { const g = new THREE.Mesh(gemGeo, gGem); g.position.copy(p); g.scale.set(1, 1.5, 0.6); trim.add(g); });
    // filo de las aristas laterales (profundidad)
    ring3(corners, 0, 1).forEach(p => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.0, 10), gTrim);
      c.rotation.x = Math.PI / 2; c.position.copy(p); trim.add(c);
    });

    /* ---------- cuerdas de selección (lira) ---------- */
    const bottomY = x => { const f = (x - XB0) / (XB1 - XB0); return -(hl + (hr - hl) * f) - 0.1; };
    const strings = [-0.45, 0.45].map((x, bit) => {
      const N = 40, top = bottomY(x), bot = -4.15;
      const pos = new Float32Array(N * 3);
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({ color: ctx.color("--selector-gold"), transparent: true, opacity: 0 });
      mat.userData.part = "select"; mats.push(mat);
      const line = new THREE.Line(geo, mat); root.add(line);
      const kMat = new THREE.MeshStandardMaterial({ color: ctx.color("--selector-gold"), emissive: ctx.color("--selector-gold"), emissiveIntensity: 0.2, metalness: 0.9, roughness: 0.22, envMapIntensity: 1.5, transparent: true, opacity: 0 });
      kMat.userData.part = "select"; mats.push(kMat);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), kMat); knob.position.set(x, bot - 0.1, 0); root.add(knob);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.035, 10, 40), goldMat("select")); collar.rotation.x = Math.PI / 2.4; knob.add(collar);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 12), goldMat("select")); cap.position.y = 0.24; knob.add(cap);
      return { x, top, bot, N, pos, geo, line, knob, kMat, pluck: 0, val: [0, 0] };
    });
    function layoutString(s, t) {
      const amp = s.pluck * 0.22;
      for (let k = 0; k < s.N; k++) {
        const f = k / (s.N - 1);
        const y = s.top + (s.bot - s.top) * f;
        const x = s.x + Math.sin(f * Math.PI) * Math.sin(t * 38 + k * 0.0) * amp;
        s.pos[k * 3] = x; s.pos[k * 3 + 1] = y; s.pos[k * 3 + 2] = 0;
      }
      s.geo.attributes.position.needsUpdate = true;
    }

    /* ---------- paquetes (ráfagas) que viajan por la ruta activa ---------- */
    const PK = 3;
    const pkMat = new THREE.MeshBasicMaterial({ color: ctx.color("--text-main"), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    mats.push(pkMat);
    const packets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 12, 8), pkMat, PK);
    packets.frustumCulled = false; root.add(packets);
    const dummy = new THREE.Object3D();
    let path = null, pkAlpha = [0, 0];

    function buildPath() {
      const cp = new THREE.CurvePath();
      if (mux) { cp.add(inWires[st.sel].curve); cp.add(routes[st.sel].curve); cp.add(outWires[0].curve); }
      else { cp.add(inWires[0].curve); cp.add(routes[st.sel].curve); cp.add(outWires[st.sel].curve); }
      path = cp;
    }

    /* ---------- etiquetas HTML ancladas ---------- */
    const L = [];
    function lab(html, cls, x, y, anchor) { const e = ctx.label(html, "rig " + cls); ctx.pin(e, new THREE.Vector3(x, y, 0).applyMatrix4(new THREE.Matrix4().compose(root.position, root.quaternion, root.scale)), anchor); L.push(e); return e; }
    const inNames = opts.inNames || (mux ? [0, 1, 2, 3].map(k => `I<sub>${k}</sub>`) : ["D"]);
    const outNames = mux ? [opts.outName || "Y"] : [0, 1, 2, 3].map(k => `Y<sub>${k}</sub>`);
    const inLabs = ins.map((o, k) => lab(`<span class="nm">${inNames[k]}</span><b class="v">0</b>`, "in", o.g.position.x - 0.62, o.g.position.y, "right"));
    const outLabs = outs.map((o, k) => lab(`<span class="nm">${outNames[k]}</span><b class="v">0</b>`, "out", o.g.position.x + 0.62, o.g.position.y, "left"));
    const selLabs = strings.map((s, k) => lab(`<span class="nm">S<sub>${1 - k}</sub></span><b class="v">0</b>`, "sel", s.x + (k ? 0.36 : -0.36), s.bot - 0.1, k ? "left" : "right"));
    const titleLab = opts.title ? lab(opts.title, "title", 0, 4.05) : null;

    /* ---------- lógica ---------- */
    function compute() {
      if (mux) st.y = st.data[st.sel] ? 1 : 0;
      else st.outs = [0, 1, 2, 3].map(k => (k === st.sel && st.d ? 1 : 0));
    }
    function refresh() {
      compute();
      const live = st.live;
      const S1 = (st.sel >> 1) & 1, S0 = st.sel & 1;
      [S1, S0].forEach((b, k) => { if (strings[k].val[1] !== b) strings[k].pluck = 1; strings[k].val[1] = b; selLabs[k].querySelector(".v").textContent = b; selLabs[k].classList.toggle("hi", !!b); });
      if (mux) {
        st.data.forEach((v, k) => {
          inWires[k].on[1] = v ? 0.55 : 0;
          routes[k].on[1] = live && k === st.sel ? 1 : 0;
          ins[k].val[1] = v;
          inLabs[k].querySelector(".v").textContent = v;
          inLabs[k].classList.toggle("hi", !!v);
          inLabs[k].classList.toggle("chosen", live && k === st.sel);
        });
        outWires[0].on[1] = live && st.y ? 1 : 0.0;
        outs[0].val[1] = live ? st.y : 0;
        outLabs[0].querySelector(".v").textContent = live ? st.y : "?";
        outLabs[0].classList.toggle("hi", live && !!st.y);
      } else {
        inWires[0].on[1] = st.d ? 1 : 0;
        ins[0].val[1] = st.d;
        inLabs[0].querySelector(".v").textContent = st.d;
        inLabs[0].classList.toggle("hi", !!st.d);
        st.outs.forEach((v, k) => {
          routes[k].on[1] = live && k === st.sel ? 1 : 0;
          outWires[k].on[1] = live && v ? 1 : 0;
          outs[k].val[1] = live ? v : 0;
          outLabs[k].querySelector(".v").textContent = live ? v : "?";
          outLabs[k].classList.toggle("hi", live && !!v);
          outLabs[k].classList.toggle("chosen", live && k === st.sel);
        });
      }
      buildPath();
    }

    /* ---------- animación ---------- */
    const lerp = (a, b, k) => a + (b - a) * k;
    let lastT = 0;
    function update(t, dt) {
      lastT = t;
      const k = ctx.calm ? 1 : 1 - Math.pow(0.0015, dt);   // aproximación exponencial (~600 ms)
      for (const p in vis) vis[p][0] = lerp(vis[p][0], vis[p][1], k);
      const routeK = ctx.calm ? 1 : 1 - Math.pow(0.004, dt);
      for (const f of flows) {
        f.on[0] = lerp(f.on[0], f.on[1], routeK);
        const v = vis[f.part][0];
        f.core.uniforms.uOn.value = f.on[0]; f.core.uniforms.uVis.value = v * (f.part === "routes" ? 0.25 + 0.75 * f.on[0] : 1);
        f.halo.uniforms.uOn.value = f.on[0]; f.halo.uniforms.uVis.value = v;
      }
      for (const m of mats) if (m.userData.part) m.opacity = vis[m.userData.part][0] * (m.userData.max || 1);
      const orbs = ins.concat(outs);
      for (const o of orbs) {
        o.val[0] = lerp(o.val[0], o.val[1], routeK);
        const part = o.m.material.userData.part, v = vis[part][0];
        o.g.scale.setScalar(0.001 + v * (1 + 0.04 * Math.sin(t * 2 + o.g.position.y)));
        o.m.material.emissiveIntensity = 0.08 + o.val[0] * 1.3;
        o.ring.material.opacity = v;
        o.ring.material.emissiveIntensity = 0.12 + 0.5 * o.val[0];
        o.ring.rotation.z = t * 0.6; o.ring.rotation.x = 0.4 + Math.sin(t * 0.7 + o.g.position.y) * 0.25;
        o.ring2.rotation.x = -t * (0.5 + 0.6 * o.val[0]); o.ring2.rotation.z = 0.3 + Math.cos(t * 0.5 + o.g.position.y) * 0.2;
      }
      for (const s of strings) {
        s.pluck *= Math.pow(0.04, dt);
        s.val[0] = lerp(s.val[0], s.val[1], routeK);
        s.kMat.emissiveIntensity = 0.15 + 1.4 * s.val[0];
        layoutString(s, t);
      }
      body.rotation.y = ctx.calm ? 0 : Math.sin(t * 0.3) * 0.05;
      edges.rotation.y = body.rotation.y; trim.rotation.y = body.rotation.y;
      // paquetes: solo si la ruta transporta un 1
      const carrying = st.live && (mux ? st.y : st.d) && vis.routes[0] > 0.5 && vis.output[0] > 0.5 && vis.inputs[0] > 0.5;
      pkAlpha[1] = carrying ? 1 : 0; pkAlpha[0] = lerp(pkAlpha[0], pkAlpha[1], routeK);
      pkMat.opacity = pkAlpha[0] * 0.9;
      if (path && pkAlpha[0] > 0.01) {
        for (let q = 0; q < PK; q++) {
          const u = ((ctx.calm ? 0.5 : t * 0.32) + q / PK) % 1;
          dummy.position.copy(path.getPointAt(u)); dummy.scale.setScalar(0.7 + 0.5 * Math.sin(u * Math.PI)); dummy.updateMatrix();
          packets.setMatrixAt(q, dummy.matrix);
        }
        packets.instanceMatrix.needsUpdate = true;
      }
      const lv = vis.labels[0];
      L.forEach(e => { e.style.opacity = lv.toFixed(3); });
      inLabs.forEach(e => e.style.opacity = (lv * vis.inputs[0]).toFixed(3));
      outLabs.forEach(e => e.style.opacity = (lv * vis.output[0]).toFixed(3));
      selLabs.forEach(e => e.style.opacity = (lv * vis.select[0]).toFixed(3));
      if (titleLab) titleLab.style.opacity = (lv * vis.body[0]).toFixed(3);
    }
    ctx.onUpdate(update);

    refresh();

    const api = {
      root, type: opts.type,
      get state() { return JSON.parse(JSON.stringify(st)); },
      show(parts) { for (const p in parts) if (vis[p]) vis[p][1] = parts[p] ? 1 : 0; return api; },
      showAll(on) { on = on !== false; for (const p in vis) vis[p][1] = on ? 1 : 0; return api; },
      set(o) {
        if (o.sel != null) st.sel = o.sel & 3;
        if (o.data) st.data = o.data.map(v => (v ? 1 : 0));
        if (o.d != null) st.d = o.d ? 1 : 0;
        if (o.live != null) st.live = !!o.live;
        if (o.inNames) o.inNames.forEach((n, k) => { if (inLabs[k]) inLabs[k].querySelector(".nm").innerHTML = n; });
        refresh(); return api;
      },
      snap() { for (const p in vis) vis[p][0] = vis[p][1]; flows.forEach(f => (f.on[0] = f.on[1])); update(lastT, 60); return api; }, // aplica todo el estado visual al instante
      labels: { inputs: inLabs, outputs: outLabs, select: selLabs },
      dispose() { mats.forEach(m => m.dispose()); }
    };
    return api;
  }

  window.Rig3D = { create };
})();

/* =====================================================================
   Sky3D — cielo, viento y gestor de escenas 3D por diapositiva
   - Un único renderer (pixel ratio ≤ 1.5, baja a 1 si caen los fps).
   - Plumas y motas: UNA malla instanciada; el movimiento se calcula en
     el shader (cero trabajo de CPU por partícula).
   - Cada diapositiva vive en x = i·SPACING; la cámara vuela entre ellas.
   - Carga diferida: solo existen la escena actual y la siguiente; el
     resto se libera (geometrías, materiales, etiquetas).
   - Si WebGL falla: modo plano (body.no3d) y las mismas escenas se
     construyen con su versión SVG (ctx.is3d = false).
   ===================================================================== */
(function () {
  "use strict";
  const SPACING = 30;          // separación entre diapositivas en el mundo
  const UNIT = 100;            // 1 unidad = 100 px del escenario 1920×1080
  const CAM_Z = 5.4 / Math.tan(THREE_DEG(20)); // a z=0 se ven exactamente 10.8 u de alto
  function THREE_DEG(d) { return d * Math.PI / 180; }

  let THREE, renderer, scene, camera, clock, canvas;
  let defs = [], instances = new Map();
  let ok = false, current = 0, phaseOf = new Map();
  let sizeW = 1920, sizeH = 1080;
  const uniforms = { uTime: { value: 0 }, uGust: { value: 0 }, uCamX: { value: 0 }, uCalm: { value: 0 } };
  let travel = null, gustTarget = 0;
  const camPos = { x: 0, y: 0, z: CAM_Z }, camLook = { x: 0, y: 0, z: 0 };
  let fpsAvg = 60, slowFrames = 0, degraded = false, particles;

  /* ---------- colores de la guía en sRGB crudo (para shaders) ---------- */
  function hex(name) {
    const v = (window.Style ? Style.get(name) : "#ffffff").replace("#", "");
    return [parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255];
  }
  function v3(name) { const c = hex(name); return new THREE.Vector3(c[0], c[1], c[2]); }
  function col(name) { return new THREE.Color(Style.get(name)); }

  /* =================================================================
     CIELO: esfera con degradado, nubes de ruido y estrellas tenues
     ================================================================= */
  const NOISE = `
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
    float fbm(vec2 p){ float a=0.5, s=0.0; for(int k=0;k<5;k++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }`;

  function makeSky() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uTime: uniforms.uTime, uCamX: uniforms.uCamX, cAbyss: { value: v3("--bg-abyss") }, cSpace: { value: v3("--bg-space") },
        cHorizon: { value: v3("--bg-horizon") }, cWind: { value: v3("--signal-active") }, cGold: { value: v3("--selector-gold") } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: NOISE + `
        uniform float uTime, uCamX; uniform vec3 cAbyss, cSpace, cHorizon, cWind, cGold; varying vec3 vDir;
        void main(){
          float h = vDir.y;
          // la cámara mira al horizonte: el rango visible es h ≈ ±0.2
          vec3 c = mix(cHorizon, cSpace, smoothstep(-0.16, 0.02, h));
          c = mix(c, cAbyss, smoothstep(0.02, 0.24, h) * 0.85);
          c = mix(c, cAbyss, smoothstep(-0.12, -0.3, h) * 0.7);
          vec2 q = vec2(atan(vDir.z, vDir.x) * 2.2 + uCamX * 0.004, h * 3.0);
          float n = fbm(q * 1.6 + vec2(uTime * 0.012, 0.0));
          float band = smoothstep(0.45, 0.9, n) * (1.0 - abs(h) * 1.4);
          c += cWind * band * 0.07;
          float st = step(0.9965, hash(floor(q * 120.0))) * smoothstep(0.1, 0.6, h);
          c += vec3(st) * 0.35 * (0.6 + 0.4 * sin(uTime * 1.3 + q.x * 40.0));
          c += cGold * pow(max(0.0, 1.0 - abs(h + 0.05) * 3.0), 3.0) * 0.05;
          gl_FragColor = vec4(c, 1.0);
        }`
    });
    const m = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), mat);
    m.frustumCulled = false; m.renderOrder = -10;
    return m;
  }

  /* =================================================================
     CINTAS DE VIENTO: tiras curvas con ráfagas que corren
     ================================================================= */
  function makeRibbons() {
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1, 1, 180, 1);
    const specs = [
      [-3.6, -9, 0.9, 0.12, 0.0, 0.10], [3.9, -11, 1.3, 0.16, 1.7, 0.08], [-1.2, -14, 1.6, 0.10, 3.1, 0.07],
      [1.8, -7, 0.7, 0.18, 4.4, 0.09], [-5.4, -12, 1.1, 0.08, 5.2, 0.06], [5.6, -16, 1.9, 0.14, 2.3, 0.06], [0.2, -5, 0.5, 0.20, 0.9, 0.05]
    ];
    specs.forEach(([y, z, amp, freq, seed, alpha]) => {
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uTime: uniforms.uTime, uGust: uniforms.uGust, uCamX: uniforms.uCamX, uCalm: uniforms.uCalm,
          uY: { value: y }, uZ: { value: z }, uAmp: { value: amp }, uFreq: { value: freq }, uSeed: { value: seed }, uAlpha: { value: alpha },
          cA: { value: v3("--signal-active") }, cB: { value: v3("--text-main") } },
        vertexShader: `
          uniform float uTime, uCamX, uY, uZ, uAmp, uFreq, uSeed, uGust, uCalm; varying vec2 vUv;
          void main(){
            vUv = uv;
            float x = uCamX + (uv.x - 0.5) * 90.0;
            float t = uTime * mix(1.0, 0.15, uCalm);
            float y = uY + uAmp * sin(x * uFreq + t * 0.35 + uSeed) + 0.4 * sin(x * uFreq * 2.3 - t * 0.5 + uSeed * 2.0);
            y += (uv.y - 0.5) * (0.10 + 0.05 * sin(x * 0.3 + uSeed));
            float z = uZ + 0.8 * sin(x * 0.07 + uSeed);
            gl_Position = projectionMatrix * viewMatrix * vec4(x, y, z, 1.0);
          }`,
        fragmentShader: `
          uniform float uTime, uSeed, uAlpha, uGust, uCalm; uniform vec3 cA, cB; varying vec2 vUv;
          void main(){
            float t = uTime * mix(1.0, 0.15, uCalm);
            float s = fract(vUv.x * 7.0 - t * (0.05 + uGust * 0.5) + uSeed);
            float streak = smoothstep(0.0, 0.35, s) * smoothstep(1.0, 0.55, s);
            float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
            float ends = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
            vec3 c = mix(cA, cB, s * 0.4);
          gl_FragColor = vec4(c, (0.35 + streak) * edge * ends * uAlpha * (1.0 + uGust * 1.5) * 0.45);
          }`
      });
      const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = -5;
      g.add(m);
    });
    return g;
  }

  /* =================================================================
     PLUMAS Y MOTAS: una sola malla instanciada, animada en el shader
     ================================================================= */
  function makeParticles(count) {
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
    const seeds = new Float32Array(count * 4);
    for (let k = 0; k < count * 4; k++) seeds[k] = Math.random();
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
    geo.instanceCount = count;
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: uniforms.uTime, uGust: uniforms.uGust, uCamX: uniforms.uCamX, uCalm: uniforms.uCalm,
        cA: { value: v3("--signal-active") }, cB: { value: v3("--text-main") }, cG: { value: v3("--selector-gold") } },
      vertexShader: `
        attribute vec4 aSeed; uniform float uTime, uGust, uCamX, uCalm; varying vec2 vUv; varying float vKind, vFade;
        void main(){
          vUv = uv; vKind = aSeed.w;
          float t = uTime * mix(1.0, 0.12, uCalm);
          float span = 70.0;
          float drift = t * (0.6 + aSeed.w * 1.4) + uGust * 0.0;
          float lo = uCamX - span * 0.5;
          float x = lo + mod(aSeed.x * span + drift * 1.0 - lo + 1000.0 * span, span);
          float y = (aSeed.y - 0.5) * 15.0 + sin(t * 0.5 + aSeed.z * 6.283 + x * 0.18) * 0.9;
          float z = -1.5 - aSeed.z * 16.0;
          vec4 mv = viewMatrix * vec4(x, y, z, 1.0);
          bool feather = aSeed.w > 0.72;
          float size = feather ? 0.32 + aSeed.y * 0.30 : 0.05 + aSeed.y * 0.08;
          float ang = t * (0.25 + aSeed.z) + aSeed.x * 6.283;
          vec2 p = position.xy * vec2(feather ? 1.0 : 1.0, feather ? 0.28 : 1.0) * size;
          // estela: con ráfaga las partículas se estiran en la dirección del viento
          p.x *= 1.0 + uGust * (feather ? 1.5 : 12.0);
          float ca = cos(ang * (feather ? 1.0 : 0.0)), sa = sin(ang * (feather ? 1.0 : 0.0));
          mv.xy += vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);
          vFade = smoothstep(span * 0.5, span * 0.3, abs(x - uCamX));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 cA, cB, cG; varying vec2 vUv; varying float vKind, vFade;
        void main(){
          vec2 q = vUv - 0.5;
          float a;
          vec3 c;
          if (vKind > 0.72) {
            // pluma: óvalo con raquis y barbas
            float e = length(q * vec2(1.0, 1.9));
            a = smoothstep(0.5, 0.36, e);
            float spine = smoothstep(0.03, 0.0, abs(q.y)) * step(-0.5, q.x);
            float barbs = 0.65 + 0.35 * sin((q.x * 2.0 - abs(q.y)) * 60.0);
            c = mix(cB, cA, 0.35 + q.x) * barbs + spine * 0.4;
            a *= 0.30;
            if (vKind > 0.95) c = mix(c, cG, 0.6);
          } else {
            float d = length(q);
            a = smoothstep(0.5, 0.0, d);
            a = a * a * 0.85;
            c = mix(cA, cB, 0.5);
          }
          gl_FragColor = vec4(c, a * vFade * 0.45);
        }`
    });
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = -4;
    return m;
  }

  /* =================================================================
     Entorno de reflejos (solo se calcula una vez): cúpula con el cielo de
     la guía + tres «ventanas» de luz (blanca arriba, turquesa a la derecha,
     dorada abajo). Da al oro, al cristal y a los orbes reflejos reales.
     ================================================================= */
  function makeEnvironment() {
    try {
      const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { cTop: { value: v3("--text-muted") }, cMid: { value: v3("--bg-horizon") }, cLow: { value: v3("--bg-abyss") } },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 cTop, cMid, cLow; varying vec3 vP;
          void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(cMid, cTop * 0.8, smoothstep(0.0, 0.9, y)) : mix(cMid, cLow, smoothstep(0.0, -0.6, y)); gl_FragColor = vec4(c, 1.0); }`
      }));
      es.add(dome);
      const box = (color, k, w, h, x, y, z) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col(color).multiplyScalar(k), side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m);
      };
      box("--text-main", 6, 22, 9, -8, 18, 14);
      box("--signal-active", 3, 8, 26, 26, 2, -6);
      box("--selector-gold", 4, 26, 6, -6, -16, 12);
      box("--text-main", 2.5, 6, 6, 10, 6, 24);
      const env = pm.fromScene(es, 0.035).texture;
      pm.dispose();
      return env;
    } catch (e) { console.warn("sin entorno de reflejos", e); return null; }
  }

  /* =================================================================
     Material de "cable con viento": franjas que viajan por un tubo
     ================================================================= */
  function flowMaterial(opts) {
    opts = opts || {};
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uTime: uniforms.uTime, uCalm: uniforms.uCalm,
        uOn: { value: opts.on || 0 }, uVis: { value: opts.vis == null ? 1 : opts.vis },
        uRep: { value: opts.rep || 4 }, uSpeed: { value: opts.speed || 1.2 }, uDir: { value: opts.dir || 1 },
        cOn: { value: v3(opts.colorOn || "--signal-active") }, cOff: { value: v3(opts.colorOff || "--signal-inactive") },
        uHalo: { value: opts.halo ? 1 : 0 }
      },
      vertexShader: `varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime, uCalm, uOn, uVis, uRep, uSpeed, uDir, uHalo; uniform vec3 cOn, cOff; varying vec2 vUv; varying vec3 vN;
        void main(){
          float t = uTime * mix(1.0, 0.2, uCalm);
          float s = fract(vUv.x * uRep - t * uSpeed * uDir);
          float gust = smoothstep(0.0, 0.25, s) * smoothstep(0.75, 0.3, s);
          float rim = pow(1.0 - abs(vN.z), 1.5);
          vec3 base = mix(cOff, cOn, uOn);
          vec3 c = base * (0.75 + 0.35 * rim) + vec3(1.0) * gust * uOn * 0.55;
          float a = uHalo > 0.5 ? (0.10 + 0.25 * gust) * uOn * (1.0 - rim * 0.6) : mix(0.75, 1.0, uOn);
          gl_FragColor = vec4(c, a * uVis);
        }`
    });
  }

  /* =================================================================
     Contexto que recibe cada escena de diapositiva
     ================================================================= */
  function makeCtx(def, index) {
    const layer = def.labels;
    const group = ok ? new THREE.Group() : null;
    if (ok) { group.position.set(index * SPACING, 0, 0); scene.add(group); }
    const pins = [];
    const disposers = [];
    const updaters = [];
    const ctx = {
      is3d: ok, THREE, group, layer, index, def, uniforms,
      root: def.el,
      get calm() { return document.documentElement.classList.contains("calm") || matchMedia("(prefers-reduced-motion: reduce)").matches; },
      at(px, py, z) { return ok ? new THREE.Vector3((px - 960) / UNIT, (540 - py) / UNIT, z || 0) : { x: px, y: py, z: z || 0 }; },
      color: col, hex, v3,
      flowMaterial,
      label(html, cls) { const e = document.createElement("div"); e.className = "lbl3d " + (cls || ""); e.innerHTML = html; layer.appendChild(e); disposers.push(() => e.remove()); return e; },
      pin(elm, localVec, anchor) { pins.push({ elm, v: localVec, a: anchor === "right" ? "-100%" : anchor === "left" ? "0%" : "-50%" }); return elm; },
      onDispose(fn) { disposers.push(fn); },
      onUpdate(fn) { updaters.push(fn); },
      _pins: pins, _disposers: disposers, _updaters: updaters
    };
    ctx.rig = opts => (ok ? window.Rig3D.create(ctx, opts) : window.RigSVG.create(ctx, opts));
    return ctx;
  }

  function disposeObject(o) {
    o.traverse(n => {
      if (n.geometry) n.geometry.dispose();
      if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => m.dispose());
    });
  }

  /* ---------- ciclo de vida de escenas (actual + siguiente) ---------- */
  function ensure(i) {
    const keep = new Set([i - 1, i, i + 1]); // la anterior sigue viva durante la transición (Vientos la anima)
    for (const [k, inst] of instances) {
      if (!keep.has(k)) {
        try { inst.api.dispose && inst.api.dispose(); } catch (e) { console.warn(e); }
        inst.ctx._disposers.forEach(fn => fn());
        if (inst.ctx.group) { scene.remove(inst.ctx.group); disposeObject(inst.ctx.group); }
        instances.delete(k);
      }
    }
    keep.forEach(k => {
      const d = defs[k];
      if (!d || !d.scene || instances.has(k)) return;
      const ctx = makeCtx(d, k);
      const api = d.scene(ctx) || {};
      instances.set(k, { ctx, api });
      if (api.setPhase) api.setPhase(k === current ? (phaseOf.get(k) || 0) : 0, 1);
    });
  }

  /* ---------- proyección 3D → px del escenario ---------- */
  const tmp = { v: null };
  function project(worldVec) {
    tmp.v.copy(worldVec).project(camera);
    return { x: (tmp.v.x + 1) * 960, y: (1 - tmp.v.y) * 540, behind: tmp.v.z > 1 };
  }

  function updatePins(inst) {
    const pins = inst.ctx._pins;
    if (!pins.length) return;
    const g = inst.ctx.group;
    g.updateMatrixWorld();
    const w = new THREE.Vector3();
    for (const p of pins) {
      w.copy(p.v); g.localToWorld(w);
      const s = project(w);
      p.elm.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(${p.a}, -50%)`;
    }
  }

  /* ---------- bucle ---------- */
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function frame() {
    requestAnimationFrame(frame);
    tick(Math.min(clock.getDelta(), 0.1));
  }
  /* un paso de simulación + render (también usado por las pruebas automáticas) */
  function tick(dt) {
    uniforms.uTime.value += dt;
    const t = uniforms.uTime.value;
    uniforms.uCalm.value = document.documentElement.classList.contains("calm") || matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0;

    // vuelo de cámara entre diapositivas
    const def = defs[current] || {};
    const pose = def.cam || {};
    const tx = current * SPACING + (pose.x || 0), ty = pose.y || 0, tz = CAM_Z + (pose.z || 0);
    const lx = current * SPACING + (pose.lx || 0), ly = pose.ly || 0;
    let roll = 0;
    if (travel) {
      travel.t += dt / travel.dur;
      // trayectoria opcional de js/core/vientos.js: desplazamientos que valen 0 en k = 0 y k = 1
      const k0 = Math.max(0, Math.min(1, travel.t)), k = ease(k0);
      const st = travel.style, o = (st && st.path && st.path(k0)) || {}, lift = st && st.lift != null ? st.lift : 1;
      camPos.x = travel.x0 + (tx - travel.x0) * k + (o.x || 0);
      camPos.y = travel.y0 + (ty - travel.y0) * k + Math.sin(k * Math.PI) * 0.6 * lift + (o.y || 0);
      camPos.z = travel.z0 + (tz - travel.z0) * k + Math.sin(k * Math.PI) * 4.0 * lift + (o.z || 0);
      camLook.x = travel.lx0 + (lx - travel.lx0) * k + (o.lx || 0); camLook.y = travel.ly0 + (ly - travel.ly0) * k + (o.ly || 0);
      gustTarget = o.gust != null ? o.gust : Math.sin(k * Math.PI);
      roll = o.roll || 0;
      if (travel.t >= 1) { travel = null; gustTarget = 0; roll = 0; }
    } else {
      // respiración suave de la cámara (brisa)
      const b = uniforms.uCalm.value ? 0 : 1;
      camPos.x += (tx + Math.sin(t * 0.21) * 0.06 * b - camPos.x) * 0.08;
      camPos.y += (ty + Math.sin(t * 0.17) * 0.05 * b - camPos.y) * 0.08;
      camPos.z += (tz - camPos.z) * 0.08;
      camLook.x += (lx - camLook.x) * 0.08; camLook.y += (ly - camLook.y) * 0.08;
    }
    uniforms.uGust.value += (gustTarget - uniforms.uGust.value) * 0.15;
    camera.position.set(camPos.x, camPos.y, camPos.z);
    camera.lookAt(camLook.x, camLook.y, 0);
    if (roll) camera.rotateZ(roll);
    uniforms.uCamX.value = camPos.x;
    sky.position.copy(camera.position);

    for (const [k, inst] of instances) {
      for (const fn of inst.ctx._updaters) fn(t, dt, k === current);
      if (inst.api.update) inst.api.update(t, dt, k === current);
      if (Math.abs(k - current) <= 1) updatePins(inst);
    }
    renderer.render(scene, camera);

    // calidad adaptativa: si no llegamos a ~45 fps, bajar resolución y partículas
    fpsAvg = fpsAvg * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
    if (!degraded && !Sky3D.testing && fpsAvg < 45) { if (++slowFrames > 120) { degraded = true; renderer.setPixelRatio(1); particles.geometry.instanceCount = Math.floor(particles.geometry.instanceCount * 0.5); } }
    else slowFrames = Math.max(0, slowFrames - 1);
  }

  let sky;
  const Sky3D = {
    get ok() { return ok; },
    get fps() { return fpsAvg; },
    get instances() { return instances; },
    get camera() { return camera; },
    tick(dt, n) { for (let k = 0; k < (n || 1); k++) tick(dt || 1 / 60); },
    testing: false,
    get scene() { return scene; },
    SPACING, UNIT,
    init(cv, allDefs) {
      defs = allDefs; canvas = cv;
      THREE = window.THREE;
      try {
        if (!THREE || new URLSearchParams(location.search).has("plano")) throw new Error("modo plano forzado");
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
        if (!renderer.getContext()) throw new Error("sin contexto WebGL");
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setClearColor(new THREE.Color(Style.get("--bg-abyss")), 1);
        ok = true;
      } catch (e) {
        console.warn("WebGL no disponible → versión 2D", e);
        ok = false;
        document.body.classList.add("no3d");
        canvas.style.display = "none";
        return;
      }
      tmp.v = new THREE.Vector3();
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 900);
      camera.position.set(0, 0, CAM_Z);
      clock = new THREE.Clock();
      sky = makeSky(); scene.add(sky);
      scene.add(makeRibbons());
      particles = makeParticles(window.innerWidth < 900 ? 100 : 190);
      scene.add(particles);
      scene.add(new THREE.HemisphereLight(col("--text-main"), col("--bg-space"), 1.4));
      const key = new THREE.DirectionalLight(col("--text-main"), 1.6); key.position.set(-4, 6, 10); scene.add(key);
      const rim = new THREE.DirectionalLight(col("--signal-active"), 1.2); rim.position.set(6, -2, -6); scene.add(rim);
      scene.environment = makeEnvironment();
      Sky3D.resize(sizeW, sizeH);
      requestAnimationFrame(frame);
    },
    resize(w, h, ox, oy) {
      sizeW = w; sizeH = h;
      if (!ok) return;
      renderer.setSize(Math.round(w), Math.round(h), false);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      canvas.style.left = (ox || 0) + "px"; canvas.style.top = (oy || 0) + "px";
      camera.aspect = 16 / 9; camera.updateProjectionMatrix();
    },
    /* style (opcional, lo da Vientos): { delay, dur (ms), lift, path(k) → {x, y, z, lx, ly, roll, gust} } */
    travel(i, dir, instant, style) {
      const prevIdx = current;
      current = i;
      ensure(i);
      if (!ok) return;
      const def = defs[i] || {}; const pose = def.cam || {};
      if (instant || document.documentElement.classList.contains("calm") || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        camPos.x = i * SPACING + (pose.x || 0); camPos.y = pose.y || 0; camPos.z = CAM_Z + (pose.z || 0);
        camLook.x = i * SPACING + (pose.lx || 0); camLook.y = pose.ly || 0; travel = null; return;
      }
      const dur = style && style.dur ? style.dur / 1000 : Style.ms("--dur-slide") / 1000 * (Math.abs(i - prevIdx) > 1 ? 1.3 : 1);
      travel = { t: style && style.delay ? -style.delay / 1000 / dur : 0, dur, style: style || null, x0: camPos.x, y0: camPos.y, z0: camPos.z, lx0: camLook.x, ly0: camLook.y };
    },
    /* completa el vuelo en curso (navegación rápida durante una transición) */
    land() { if (travel) travel.t = 1; },
    setPhase(i, p, dir) {
      phaseOf.set(i, p);
      const inst = instances.get(i);
      if (inst && inst.api.setPhase) inst.api.setPhase(p, dir);
    },
    gust(v) { gustTarget = v; setTimeout(() => { if (!travel) gustTarget = 0; }, 500); },
    project(v) { return ok ? project(v) : { x: 0, y: 0 }; },
    flowMaterial: (o) => flowMaterial(o)
  };
  window.Sky3D = Sky3D;
})();

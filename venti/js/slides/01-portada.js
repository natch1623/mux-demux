/* 1 · Portada — un remolino de viento que converge en un selector */
Deck.add({
  id: "portada", title: "Portada", who: "Ana", topic: "Apertura", time: 30, hideHud: true,
  notes: [
    "(Silencio breve.) El viento sopla en todas direcciones: así llegan los datos a un sistema digital, desde muchas fuentes a la vez.",
    "El remolino converge en un solo punto dorado: un selector que decide qué ráfaga pasa. Esa es la idea de hoy.",
    "«Multiplexores y demultiplexores»: circuitos combinacionales que eligen y reparten información según señales de control.",
    "Presentar al equipo: Ana (fundamentos), Ameth (funcionamiento lógico), Jonathan (DEMUX y diseño), Carlos (funciones y aplicaciones)."
  ],
  html: `
    <div class="cover">
      <div class="cover-kicker" data-in="2">Circuitos Lógicos Electrónicos · Lógica combinacional</div>
      <h1 class="cover-title" data-in="2"><span>Multiplexores</span><em>y</em><span>Demultiplexores</span></h1>
      <p class="cover-sub" data-in="2">Cómo una señal de control decide el camino del viento</p>
      <ul class="cover-team" data-in="3">
        <li><b>Ana</b><span>Fundamentos</span></li>
        <li><b>Ameth</b><span>Funcionamiento lógico</span></li>
        <li><b>Jonathan</b><span>DEMUX y diseño</span></li>
        <li><b>Carlos</b><span>Funciones y aplicaciones</span></li>
      </ul>
      <div class="cover-team-tag" data-in="3">Equipo 3 · Ing. Mónica M. Magallón Mariscal, M.Sc.</div>
      <div class="cover-hint" data-in="0" data-out="1"><span>toca para empezar</span></div>
    </div>
    <svg class="cover-flat" viewBox="0 0 1920 1080" aria-hidden="true">
      <g class="vortex">${Array.from({ length: 9 }, (_, k) => `<ellipse cx="960" cy="470" rx="${120 + k * 70}" ry="${40 + k * 24}" transform="rotate(${k * 19} 960 470)"/>`).join("")}</g>
      <circle class="core" cx="960" cy="470" r="18"/>
    </svg>`,

  /* Escena 3D: espiral de partículas instanciadas; uConverge (0→1) las cierra hacia el selector */
  scene(ctx) {
    if (!ctx.is3d) return { setPhase() {} };
    const THREE = ctx.THREE;
    const N = 1400;
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
    const seeds = new Float32Array(N * 4);
    for (let k = 0; k < N * 4; k++) seeds[k] = Math.random();
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
    geo.instanceCount = N;
    const u = { uConverge: { value: 0 }, uShow: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: ctx.uniforms.uTime, uCalm: ctx.uniforms.uCalm, ...u, cA: { value: ctx.v3("--signal-active") }, cB: { value: ctx.v3("--text-main") }, cG: { value: ctx.v3("--selector-gold") } },
      vertexShader: `
        attribute vec4 aSeed; uniform float uTime, uConverge, uShow, uCalm; varying vec2 vUv; varying float vK, vR;
        void main(){
          vUv = uv; vK = aSeed.w;
          float t = uTime * mix(1.0, 0.15, uCalm);
          float r0 = 0.7 + pow(aSeed.x, 0.8) * 4.4;
          float r = mix(r0, 0.15 + aSeed.x * 0.5, uConverge);
          float ang = aSeed.y * 6.2832 + t * (0.9 / (0.6 + r * 0.35)) * (1.0 + uConverge * 2.0);
          float h = (aSeed.z - 0.5) * mix(2.6, 0.3, uConverge) + sin(ang * 2.0 + aSeed.x * 9.0) * 0.25;
          vec3 p = vec3(cos(ang) * r * 1.5, 0.7 + h * 0.8 + sin(ang) * r * 0.2, sin(ang) * r * 0.55 - 1.0);
          vR = r;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float size = (0.03 + aSeed.w * 0.06) * (1.0 + (1.0 - uConverge) * 0.4);
          vec2 q = position.xy * size;
          q.x *= 1.0 + 3.0 * (1.0 - uConverge * 0.7);   // estela tangente
          float ca = cos(ang + 1.57), sa = sin(ang + 1.57) * 0.25;
          mv.xy += vec2(q.x * ca - q.y * sa, q.x * sa + q.y * ca);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 cA, cB, cG; uniform float uShow, uConverge; varying vec2 vUv; varying float vK, vR;
        void main(){
          float d = length((vUv - 0.5) * vec2(1.0, 2.0));
          float a = smoothstep(0.5, 0.0, d);
          vec3 c = mix(cA, cB, vK * 0.6);
          c = mix(c, cG, uConverge * smoothstep(1.5, 0.2, vR));
          gl_FragColor = vec4(c, a * 0.75 * uShow);
        }`
    });
    const swirl = new THREE.Mesh(geo, mat); swirl.frustumCulled = false;
    ctx.group.add(swirl);

    // núcleo dorado: el "selector"
    const coreMat = new THREE.MeshStandardMaterial({ color: ctx.color("--selector-gold"), emissive: ctx.color("--selector-gold"), emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0 });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), coreMat);
    core.position.set(0, 0.7, -1); ctx.group.add(core);
    const ringMat = new THREE.MeshBasicMaterial({ color: ctx.color("--selector-gold"), transparent: true, opacity: 0 });
    const rings = [0.8, 1.15].map((r, k) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 96), ringMat); m.position.copy(core.position); ctx.group.add(m); return m; });

    const tgt = { conv: 0, show: 1, core: 0, lift: 0 };
    let cur = { conv: 0, show: 0, core: 0, lift: 0 };
    return {
      setPhase(p) {
        tgt.show = 1;
        tgt.conv = p >= 1 ? 1 : 0;
        tgt.core = p >= 1 ? 1 : 0;
        tgt.lift = p >= 2 ? 1 : 0;   // con el título, todo sube un poco para dejarle sitio
      },
      update(t, dt) {
        const k = ctx.calm ? 1 : 1 - Math.pow(0.12, dt);
        for (const key in tgt) cur[key] += (tgt[key] - cur[key]) * (key === "conv" ? k * 0.55 : k);
        u.uConverge.value = cur.conv; u.uShow.value = cur.show;
        coreMat.opacity = cur.core; ringMat.opacity = cur.core * 0.7;
        core.rotation.y = t * 0.8; core.rotation.x = 0.4;
        core.scale.setScalar(0.4 + cur.core * 0.6 + Math.sin(t * 2.2) * 0.04 * cur.core);
        rings[0].rotation.set(1.2 + Math.sin(t * 0.5) * 0.2, t * 0.4, 0);
        rings[1].rotation.set(1.4, -t * 0.3, 0.4);
        ctx.group.position.y = cur.lift * 1.6;
        ctx.group.scale.setScalar(1 - cur.lift * 0.25);
      }
    };
  }
});

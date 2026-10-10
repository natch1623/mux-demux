/* Simulador independiente del renderizador; las escenas solo representan el modelo. */
(function () {
  "use strict";
  const bit = v => v ? 1 : 0;
  const SimLogic = {
    mux(sel, data) { return bit(data[sel & 3]); },
    demux(sel, d) { return [0, 1, 2, 3].map(k => +(k === (sel & 3) && !!d)); },
    derive(f8) {
      return [0, 1, 2, 3].map(k => {
        const lo = bit(f8[2 * k]), hi = bit(f8[2 * k + 1]);
        return lo === hi ? String(lo) : lo ? "C'" : "C";
      });
    }
  };
  window.SimLogic = SimLogic;
  const example = [0, 1, 1, 0, 0, 0, 1, 1];
  const presets = { ejemplo: example, mayoria: [0, 0, 0, 1, 0, 1, 1, 1], xor: [0, 1, 1, 0, 1, 0, 0, 1], cero: Array(8).fill(0), uno: Array(8).fill(1) };
  const models = new WeakMap();
  const evalInput = (s, c) => s === "C" ? c : s === "C'" ? 1 - c : +s;
  const normalNames = [0, 1, 2, 3].map(k => `I<sub>${k}</sub>`);
  const button = (key, label, cls) => `<button type="button" class="sim-bit ${cls || ''}" data-bit="${key}" aria-pressed="false"><span>${label}</span><b data-value="${key}">0</b></button>`;
  const truthRows = Array.from({ length: 8 }, (_, k) => `<tr data-frow="${k}"><td>${k >> 2}</td><td>${(k >> 1) & 1}</td><td>${k & 1}</td><td><button type="button" class="sim-cell" data-row="${k}" aria-label="F para ${(k >> 2)} ${(k >> 1) & 1} ${k & 1}" aria-pressed="false">0</button></td><td class="sim-mark" aria-label="Sin comprobar"></td></tr>`).join("");
  function stop(m) { clearTimeout(m.timer); m.timer = null; m.running = false; }
  function mode(m, name) { stop(m); m.mode = name; render(m); }
  function dataFor(m) { return SimLogic.derive(m.f8).map(s => evalInput(s, m.c)); }
  function render(m) {
    const r = m.root, fun = m.mode === "funcion", demux = m.mode === "demux";
    r.dataset.mode = m.mode;
    r.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m.mode)));
    r.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== m.mode; });
    r.querySelector('.sim-presets').hidden = !fun;
    const vals = { s1: m.sel >> 1, s0: m.sel & 1, d: m.d, a: m.a, b: m.b, c: m.c };
    m.data.forEach((v, k) => { vals['i' + k] = v; });
    r.querySelectorAll('button[data-bit]').forEach(b => {
      const v = vals[b.dataset.bit]; b.setAttribute('aria-pressed', String(!!v)); b.querySelector('b').textContent = v;
    });
    const k = fun ? 2 * m.a + m.b : m.sel, data = fun ? dataFor(m) : m.data;
    const y = SimLogic.mux(k, data), outputs = SimLogic.demux(k, m.d);
    const description = fun ? 'MUX · A → S1 · B → S0' : demux ? 'DEMUX 1:4 · Una entrada, cuatro destinos' : 'MUX 4:1 · Cuatro entradas, una salida';
    r.querySelector('.sim-rig-caption').textContent = description;
    r.querySelector('.sim-result').innerHTML = fun ? `F(${m.a},${m.b},${m.c}) = ${m.f8[4 * m.a + 2 * m.b + m.c]} · Y = ${y} ${m.f8[4 * m.a + 2 * m.b + m.c] === y ? '✓' : '✗'}` : demux ? `Y<sub>${k}</sub> = D = ${m.d} · demás salidas = 0` : `Y = I<sub>${k}</sub> = ${y}`;
    r.querySelector('.sim-result').classList.toggle('sim-error', fun && m.f8[4 * m.a + 2 * m.b + m.c] !== y);
    if (fun) {
      const derived = SimLogic.derive(m.f8);
      r.querySelector('.sim-equation').innerHTML = `<span>A → S<sub>1</sub> · B → S<sub>0</sub></span><div>${derived.map((v, i) => `<span class="t ${i === k ? 'hot' : ''}">I<sub>${i}</sub> = ${v}</span>`).join(' ')}</div>`;
      const terms = m.f8.flatMap((v, i) => v ? [i] : []);
      r.querySelector('.sim-function-name').textContent = terms.length ? `F = Σm(${terms.join(', ')})` : 'F = 0';
      r.querySelectorAll('[data-frow]').forEach(row => {
        const i = +row.dataset.frow, b = row.querySelector('button'), mark = row.querySelector('.sim-mark');
        row.classList.toggle('hot', i === 4 * m.a + 2 * m.b + m.c);
        b.textContent = m.f8[i]; b.setAttribute('aria-pressed', String(!!m.f8[i]));
        mark.textContent = m.checked[i] == null ? '·' : m.checked[i] ? '✓' : '✗';
        mark.setAttribute('aria-label', m.checked[i] == null ? 'Sin comprobar' : m.checked[i] ? 'Correcta' : 'Error');
      });
      const passed = m.checked.filter(v => v === true).length;
      r.querySelector('.sim-check').textContent = m.running ? 'Detener comprobación' : 'Comprobar las 8 filas';
      r.querySelector('.sim-check-status').textContent = `${passed}/8 ${m.running ? '· comprobando…' : passed === 8 ? '· correcto ✓' : '· comprobadas'}`;
    } else {
      const sb = t => t.replace(/([SIY])(\d)/g, "$1<sub>$2</sub>");
      const terms = (demux ? ["D·S1'·S0'", "D·S1'·S0", "D·S1·S0'", 'D·S1·S0'] : ["S1'·S0'·I0", "S1'·S0·I1", "S1·S0'·I2", 'S1·S0·I3']).map(sb);
      r.querySelector('.sim-equation').innerHTML = demux ? terms.map((t, i) => `<span class="t ${i === k ? 'hot' : ''}">Y<sub>${i}</sub> = ${t}</span>`).join(' ') : 'Y = ' + terms.map((t, i) => `<span class="t ${i === k ? 'hot' : ''}">${t}</span>`).join('<span class="op">+</span>');
      const table = r.querySelector(`[data-pane="${m.mode}"] .sim-table-wrap`);
      table.innerHTML = `<table class="truth sim-table"><caption>Tabla de funcionamiento</caption><thead><tr><th>S<sub>1</sub></th><th>S<sub>0</sub></th>${demux ? [0, 1, 2, 3].map(i => `<th class="out">Y<sub>${i}</sub></th>`).join('') : '<th class="out">Y</th>'}</tr></thead><tbody>${[0, 1, 2, 3].map(i => `<tr class="${i === k ? 'hot' : ''}"><td>${i >> 1}</td><td>${i & 1}</td>${demux ? SimLogic.demux(i, m.d).map(v => `<td class="o">${v}</td>`).join('') : `<td class="o">I<sub>${i}</sub> = ${m.data[i]}</td>`}</tr>`).join('')}</tbody></table>`;
      r.querySelector('.sim-output-list').innerHTML = outputs.map((v, i) => `<span class="${i === k ? 'sim-chosen' : ''}">Y<sub>${i}</sub> = ${v}</span>`).join('');
    }
    // La escena escucha el modelo sin exponer objetos 3D al controlador.
    r.dispatchEvent(new Event('sim-change'));
  }
  function check(m) {
    if (m.running) { stop(m); render(m); return; }
    m.checked.fill(null); m.running = true;
    let row = 0;
    function step() {
      m.a = row >> 2; m.b = (row >> 1) & 1; m.c = row & 1;
      m.checked[row] = SimLogic.mux(2 * m.a + m.b, dataFor(m)) === m.f8[row];
      row++; if (row === 8) { m.running = false; m.timer = null; }
      render(m);
      if (row < 8) {
        if (m.ctx.calm) step();
        else m.timer = setTimeout(step, (Style.ms('--dur-gust') + Style.ms('--dur-data-travel')) / 2);
      }
    }
    step();
  }
  Deck.add({
    id: 'simulador', title: 'Simulador', who: 'Todos', topic: 'Demostración', time: 150, cls: 'sim',
    notes: [
      'AMETH (MUX, ~40 s): «Probemos en vivo.» Poner I0..I3 = 0101, recorrer S1S0 = 00, 01, 10, 11 y leer Y en voz alta: la fila resaltada de la tabla y el término resaltado de la expresión son el mismo. Cambiar un dato NO elegido para mostrar que Y no cambia.',
      'JONATHAN (DEMUX, ~35 s): D = 1 y recorrer S1S0: solo la salida elegida se enciende. Poner D = 0: todas en 0. Recordar que las no elegidas valen 0 (no guardan nada).',
      'CARLOS (FUNCIÓN, ~45 s): ejemplo Σm(1,2,6,7) → el simulador deriva C, C prima, 0 y 1, igual que en la diapositiva 14. Pulsar «Comprobar las 8 filas» → 8/8. Luego pedir a la docente (o al público) una función propia y editar la columna F.',
      'ANA (libre, ~30 s): «¿Alguna combinación que quieran probar?» Las pestañas funcionan en cualquier fase. Si no hay propuestas: preset Mayoría o XOR y comprobar 8/8.'
    ],
    extra: 'Si algo falla en vivo: capturas de respaldo en respaldo/capturas y el PDF respaldo/MUX-DEMUX-respaldo.pdf. El simulador también funciona sin WebGL (versión 2D automática).',
    html: `<div class="kicker">Laboratorio del viento</div><h1 class="title">Simulador <em>interactivo</em></h1>
      <nav class="sim-tabs" aria-label="Modo del simulador">${[['mux','MUX'],['demux','DEMUX'],['funcion','FUNCIÓN']].map(([v, t]) => `<button type="button" data-mode="${v}" aria-pressed="false">${t}</button>`).join('')}<button type="button" class="sim-reset">Reiniciar</button></nav>
      <div class="sim-presets" hidden aria-label="Funciones de ejemplo"><button type="button" data-preset="ejemplo">Ejemplo Σm(1,2,6,7)</button><button type="button" data-preset="mayoria">Mayoría Σm(3,5,6,7)</button><button type="button" data-preset="xor">XOR A⊕B⊕C</button><button type="button" data-preset="cero">Todo 0</button><button type="button" data-preset="uno">Todo 1</button></div>
      <p class="sim-rig-caption"></p><div class="sim-result" role="status" aria-live="polite"></div><div class="formula sim-equation"></div>
      <div class="panel sim-panel" data-ui>
        <div data-pane="mux"><h2>Selecciona la entrada</h2><div class="sim-controls sim-select">${button('s1','S<sub>1</sub>')}${button('s0','S<sub>0</sub>')}</div><h3>Datos · toca para alternar</h3><div class="sim-controls">${[0,1,2,3].map(k => button('i'+k,`I<sub>${k}</sub>`)).join('')}</div><div class="sim-table-wrap"></div></div>
        <div data-pane="demux" hidden><h2>Selecciona el destino</h2><div class="sim-controls sim-select">${button('s1','S<sub>1</sub>')}${button('s0','S<sub>0</sub>')}</div><h3>Dato de entrada</h3><div class="sim-controls">${button('d','D')}</div><div class="sim-output-list"></div><div class="sim-table-wrap"></div></div>
        <div data-pane="funcion" hidden><div class="sim-controls sim-variables">${button('a','A')}${button('b','B')}${button('c','C')}</div><h2 class="sim-function-name"></h2><table class="truth sim-table sim-edit"><caption>Toca F para editar la tabla</caption><thead><tr><th>A</th><th>B</th><th>C</th><th class="out">F</th><th>✓</th></tr></thead><tbody>${truthRows}</tbody></table><div class="sim-check-bar"><button type="button" class="sim-check">Comprobar las 8 filas</button><span class="sim-check-status" role="status" aria-live="polite">0/8</span></div></div>
      </div>`,
    init(ctx) {
      const m = { root: ctx.root, ctx, mode: 'mux', sel: 0, data: [0,1,0,1], d: 1, a: 0, b: 0, c: 0, f8: example.slice(), checked: Array(8).fill(null), running: false, timer: null };
      models.set(ctx.root, m);
      ctx.root.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || !ctx.root.contains(b)) return;
        if (b.dataset.mode) { mode(m, b.dataset.mode); return; }
        if (b.classList.contains('sim-check')) { check(m); return; }
        stop(m);
        if (b.classList.contains('sim-reset')) {
          if (m.mode === 'mux') { m.sel = 0; m.data = [0,1,0,1]; }
          else if (m.mode === 'demux') { m.sel = 0; m.d = 1; }
          else { m.a = m.b = m.c = 0; m.f8 = example.slice(); m.checked.fill(null); }
        } else if (b.dataset.preset) { m.f8 = presets[b.dataset.preset].slice(); m.checked.fill(null); }
        else if (b.dataset.row != null) { m.f8[+b.dataset.row] ^= 1; m.checked.fill(null); }
        else if (b.dataset.bit) {
          const key = b.dataset.bit;
          if (key === 's1' || key === 's0') m.sel ^= key === 's1' ? 2 : 1;
          else if (key[0] === 'i') m.data[+key[1]] ^= 1;
          else m[key] ^= 1;
        }
        render(m);
      });
      render(m);
    },
    onPhase(ctx, p) { mode(models.get(ctx.root), ['mux','demux','funcion','funcion'][p]); },
    onLeave(ctx) { const m = models.get(ctx.root); stop(m); render(m); },
    scene(ctx3) {
      const m = models.get(ctx3.root);
      const rigs = { mux: ctx3.rig({ type: 'mux', at: [700,520], scale: .75 }), demux: ctx3.rig({ type: 'demux', at: [700,520], scale: .75 }) };
      function sync() {
        const demux = m.mode === 'demux', fun = m.mode === 'funcion';
        Object.entries(rigs).forEach(([name, rig]) => {
          const on = (name === 'demux') === demux;
          if (ctx3.is3d) rig.root.visible = on; else rig.root.style.display = on ? '' : 'none';
          Object.values(rig.labels).flat().forEach(el => { el.style.visibility = on ? 'visible' : 'hidden'; });
          rig.showAll(on);
          if (on) rig.set({ sel: fun ? 2 * m.a + m.b : m.sel, data: fun ? dataFor(m) : m.data, d: m.d, inNames: fun ? SimLogic.derive(m.f8).map((s,k) => `I<sub>${k}</sub> = ${s}`) : name === 'mux' ? normalNames : ['D'] });
          if (ctx3.calm) rig.snap();
        });
      }
      ctx3.root.addEventListener('sim-change', sync);
      ctx3.onDispose(() => ctx3.root.removeEventListener('sim-change', sync));
      sync(); return { setPhase: sync };
    }
  });
})();

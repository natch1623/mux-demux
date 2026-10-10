/* Ornamentos originales: lira del bardo, alas, cecilias y ciudad del viento.
   Capa decorativa sin interacción; compatible con las escenas 3D y SVG. */
(function () {
  "use strict";
  const feather = `<path d="M0 0C18-30 42-52 76-58C65-25 35-5 0 0Z"/><path d="M0 0L62-47M19-14L21-31M32-24L35-41M32-24L51-25"/>`;
  const wing = `<path d="M0 0C-50-8-90-32-122-74C-104-65-90-65-78-62C-99-78-113-100-122-125C-65-104-28-67 0 0Z"/><path d="M-10-12C-45-29-77-48-104-75M-18-26C-47-53-73-77-104-101M-29-44L-66-80"/>`;
  const flower = `<g>${Array.from({length:6}, (_, i) => `<path transform="rotate(${i*60})" d="M0-5C-12-22-9-37 0-48C9-37 12-22 0-5Z"/>`).join("")}<circle r="6"/></g>`;
  const lyre = `<path class="lyre-body" d="M-75-90C-120-135-142-85-109-50C-82-20-78 44-66 74Q0 116 66 74C78 44 82-20 109-50C142-85 120-135 75-90M-75-90Q0-53 75-90M-66 74Q0 96 66 74"/><path d="M-83-66Q0-30 83-66M-56 69Q0 85 56 69"/>${[-48,-24,0,24,48].map(x => `<path class="lyre-string" d="M${x} ${-54-Math.abs(x)*.2}V${76-Math.abs(x)*.13}"/>`).join("")}<path class="lyre-gem" d="M0 42L15 62L0 84L-15 62Z"/><path d="M-90-97Q-116-108-110-84M90-97Q116-108 110-84"/>`;
  const windmill = `<path d="M-18 0L-12-95H12L18 0ZM-17-94L0-116L17-94"/><g transform="translate(0 -85) rotate(28)">${[0,90,180,270].map(a => `<g transform="rotate(${a})"><path d="M-4-8V-80H11V-12ZM-4-25H11M-4-42H11M-4-59H11"/></g>`).join("")}<circle r="7"/></g>`;
  const cathedral = `<path d="M-106 0V-166L-86-190L-66-166V0M66 0V-166L86-190L106-166V0M-106-166H-66M66-166H106M-86-190V-252M86-190V-252M-94-229H-78M78-229H94M-66-134L0-207L66-134V0M-66-134H66M-44 0V-108Q0-153 44-108V0M-20 0V-52Q0-90 20-52V0"/><circle cy="-126" r="22"/><path d="M0-148V-104M-22-126H22M-16-142L16-110M16-142L-16-110M-92-143V-116M-80-143V-116M80-143V-116M92-143V-116"/>`;
  const city = `<path class="city-fill" d="M0 1040V902L50 867L100 902V932L152 876L206 932V882L248 839L290 882V949L340 912L386 949V1040Z"/><path d="M0 902L50 867L100 902M115 916L152 876L206 932M206 882L248 839L290 882M303 936L340 912L386 949M28 922V967M66 922V967M140 949V982M170 949V982M238 897V929M261 897V929"/><use href="#md-windmill" x="320" y="910"/><use href="#md-cathedral" x="148" y="865"/><path d="M0 1005Q170 973 386 1014"/>`;
  function svg(cls, content, box = "0 0 1920 1080") {
    return `<svg class="${cls}" viewBox="${box}" aria-hidden="true" focusable="false">${content}</svg>`;
  }
  window.Mondstadt = { decorate() {
    if (document.getElementById("mondstadt-symbols")) return;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    defs.id = "mondstadt-symbols"; defs.setAttribute("aria-hidden", "true");
    defs.innerHTML = `<defs>
      <linearGradient id="md-metal" x1="0" y1="0" x2="1" y2="1"><stop class="metal-light"/><stop offset=".35" class="metal-mid"/><stop offset=".52" class="metal-light"/><stop offset="1" class="metal-dark"/></linearGradient>
      <linearGradient id="md-ivory" x1="0" y1="0" x2="1" y2="1"><stop class="ivory-light"/><stop offset=".65" class="ivory-mid"/><stop offset="1" class="ivory-dark"/></linearGradient>
      <linearGradient id="md-jade" x1="0" y1="0" x2="1" y2="1"><stop class="jade-light"/><stop offset=".45" class="jade-mid"/><stop offset="1" class="jade-dark"/></linearGradient>
      <g id="md-feather" class="material-feather">${feather}</g><g id="md-wing">${wing}</g><g id="md-flower" class="material-flower">${flower}</g><g id="md-lyre">${lyre}</g><g id="md-windmill" class="material-mill">${windmill}</g><g id="md-cathedral">${cathedral}</g></defs>`;
    document.body.appendChild(defs);
    document.querySelectorAll(".slide").forEach(sec => {
      sec.insertAdjacentHTML("afterbegin", svg("mondstadt-frame", `<path class="frame-line" d="M38 190V74Q38 38 74 38H190M1730 38H1846Q1882 38 1882 74V190M38 890V1006Q38 1042 74 1042H190M1730 1042H1846Q1882 1042 1882 1006V890"/><path class="frame-detail" d="M50 133V78L78 50H133M1787 50H1842L1870 78V133M50 947V1002L78 1030H133M1787 1030H1842L1870 1002V947"/><g transform="translate(44 44) rotate(90) scale(.7)"><use href="#md-feather"/></g><g transform="translate(1876 1036) rotate(-90) scale(.7)"><use href="#md-feather"/></g><path class="frame-gem" d="M960 27L971 38L960 49L949 38ZM960 1031L971 1042L960 1053L949 1042Z"/>`));
    });
    document.querySelectorAll('.slide:not(#s-portada)').forEach(sec => {
      sec.classList.add('illustrated-slide');
      const archiveSlides = ['s-relacion', 's-tabla-mux', 's-expresion-mux', 's-tabla-demux', 's-funcion-tabla', 's-limitaciones'];
      const windSlides = ['s-mux41', 's-ejemplo', 's-demux', 's-app-buses', 's-app-telecom'];
      if (archiveSlides.includes(sec.id)) sec.classList.add('scene-archive');
      if (windSlides.includes(sec.id)) sec.classList.add('scene-windmill');
      if (['s-funcion-circuito', 's-simulador'].includes(sec.id)) {
        sec.classList.add('scene-crystal');
        sec.insertAdjacentHTML('afterbegin', '<img class="crystal-insignia" src="assets/ornamentos/cristal-alado.png" alt="" aria-hidden="true" width="1536" height="1024">');
      }
      if (['s-problema', 's-definiciones', 's-conclusiones', 's-referencias'].includes(sec.id)) sec.classList.add('illustrated-story');
      sec.insertAdjacentHTML('afterbegin', '<div class="scene-atmosphere" aria-hidden="true"></div><div class="frame-art" aria-hidden="true"></div>');
    });
    const cover = document.querySelector("#s-portada");
    cover.insertAdjacentHTML("afterbegin", `<div class="city-art" aria-hidden="true"></div>`);
    cover.querySelector(".cover").insertAdjacentHTML("afterbegin", `
      <div class="bard-emblem" aria-hidden="true"><img src="assets/ornamentos/lira-alada.png" alt="" width="1536" height="1024"></div>`);
    document.querySelectorAll('.cc').forEach((card, i) => card.insertAdjacentHTML('beforeend', `<img class="card-illustration" src="assets/ornamentos/${i % 2 ? 'cristal-alado' : 'lira-alada'}.png" alt="" aria-hidden="true" width="1536" height="1024">`));
    document.querySelector('#s-referencias .ask').insertAdjacentHTML('afterbegin', '<img class="closing-illustration" src="assets/ornamentos/lira-alada.png" alt="" aria-hidden="true" width="1536" height="1024">');
    const badge = document.createElement("div"); badge.className = "mondstadt-seal"; badge.setAttribute("aria-hidden", "true");
    badge.innerHTML = `<img src="assets/ornamentos/lira-alada.png" alt="" width="1536" height="1024">`;
    document.getElementById("hud").appendChild(badge);
  }};
})();

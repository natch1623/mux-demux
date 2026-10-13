"use strict";
/* Escenografía ilustrada y detalles vectoriales. No modifica el estado lógico. */
const AMBIENCE = (() => {
  const icons = {
    marceline:'M-27 0Q-20-22-9-7L0-18L9-7Q20-22 27 0L17-5L11 9L0 4L-11 9L-17-5Z',
    tsaritsa:'M0-30V30M-26-15L26 15M-26 15L26-15M0-22L-7-15M0-22L7-15M0 22L-7 15M0 22L7 15M-19-11L-18-2M-19-11L-10-15M19 11L18 2M19 11L10 15M-19 11L-18 2M-19 11L-10 15M19-11L18-2M19-11L10-15',
    venom:'M-29-19Q-16-10-3-7L-8 9Q-28 17-29-19ZM29-19Q16-10 3-7L8 9Q28 17 29-19Z',
    dio:'M0 23C-47-3-22-40 0-15C22-40 47-3 0 23Z'
  };
  const svg=(body,cls='')=>`<svg class="${cls}" viewBox="0 0 1920 1080" aria-hidden="true">${body}</svg>`;
  function corner(theme,x,y,flip=1) {
    const d= theme==='marceline'?'M0 80L3 0L85 3M9 70L13 13L70 9M-6 40L6 34M40-6L34 6'
      :theme==='venom'?'M0 110Q28 61 2 0Q75 25 130 0M7 70Q37 16 73 6M15 5Q29 37 56 44'
      :theme==='dio'?'M0 100V0H100M12 72V12H72M-8 28L28-8M25 25L39 39'
      :'M0 94V0H94M10 76V10H76M0 40L20 20L40 0M-7 0L0-7L7 0L0 7Z';
    return `<g transform="translate(${x} ${y}) scale(${flip} ${y>500?-1:1})"><path d="${d}"/></g>`;
  }
  function mount(sec,theme) {
    const flake = `<path d="${icons[theme]}"/>`;
    const frame = svg(`${corner(theme,34,34)}${corner(theme,1886,34,-1)}${corner(theme,34,1046)}${corner(theme,1886,1046,-1)}<g transform="translate(960 42) scale(.62)">${flake}</g><path class="frame-rule" d="M116 34H878M1042 34H1804M116 1046H850M1070 1046H1804"/>`, 'scene-frame');
    const accents = theme==='tsaritsa' ? svg(`<g class="constellation"><path d="M1550 100L1660 165L1610 290L1790 380M1660 165L1820 155"/>${[[1550,100],[1660,165],[1610,290],[1790,380],[1820,155]].map(([x,y],i)=>`<g transform="translate(${x} ${y})"><path d="M0-${i?9:16}L4 0L0 ${i?9:16}L-4 0Z"/></g>`).join('')}</g>`,'scene-accent')
      :theme==='dio'?svg(`<g class="manga-marks" transform="translate(1770 185) rotate(13)"><text y="0">ゴ</text><text x="-12" y="113">ゴ</text><text x="-24" y="224">ゴ</text></g><g class="speed-ink">${Array.from({length:15},(_,i)=>`<path d="M${i*145-90} 0L${i*145+15} ${60+(i%4)*40}"/>`).join('')}</g>`,'scene-accent')
      :theme==='marceline'?svg(`<g class="cave-doodles"><path d="M63 284Q82 247 101 284Q110 308 127 268M1770 930Q1779 902 1795 923Q1808 901 1818 925L1795 951ZM83 936L75 952L94 948L86 969M1840 346L1860 346M1850 336V356"/><g transform="translate(1760 100) rotate(12)"><path d="M0 0H75V55H0Z"/><path d="M11 36Q22 13 35 36T63 36"/></g></g>`,'scene-accent')
      :svg(`<g class="symbiote-edge"><path d="M0 500Q60 550 45 715T105 952M1920 160Q1840 234 1895 350T1850 670M0 1035Q180 900 365 1022M1920 1030Q1720 952 1640 1070"/></g>`,'scene-accent');
    const bg=$('.st-bg',sec);
    bg.innerHTML=`<div class="scene-space"><div class="scene-paint" style="background-image:url('assets/worlds/${theme}-scene.webp')"></div><div class="scene-shade"></div><div class="scene-light"></div><div class="scene-grain"></div>${accents}${frame}<div class="scene-fog"></div></div>`;
    sec.classList.add('illustrated');sec.dataset.realm=theme;
  }
  function figure(svg,theme) {
    // Only physical casings receive decorative engravings; never gates or data labels.
    $$('.blk-src, polygon.blk',svg).forEach(body=>{
      if(body.dataset.detail) return; body.dataset.detail='1';
      const pts=(body.getAttribute('points')||'').trim().split(/\s+/).map(p=>p.split(',').map(Number));
      if(!pts.length||pts.some(p=>p.length!==2||!p.every(Number.isFinite)))return;
      const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
      if(w<95||h<150)return;
      const g=mk('g',{class:'detail-part','aria-hidden':'true','pointer-events':'none'},svg);
      const cx=x+w*.5,cy=y+h*.73,r=Math.min(20,w*.1);
      const seal=mk('g',{transform:`translate(${cx} ${cy}) scale(${r/30})`,class:'detail-seal'},g);
      mk('path',{d:icons[theme]},seal);
      if(theme==='tsaritsa') {
        mk('path',{d:`M${cx} ${cy-r*1.5}L${cx+r*1.5} ${cy}L${cx} ${cy+r*1.5}L${cx-r*1.5} ${cy}Z`,class:'detail-inlay'},g);
        for(let i=0;i<3;i++)mk('path',{d:`M${x+14+i*7} ${y+35}V${y+66-i*10}`,class:'detail-scratch'},g);
      } else if(theme==='marceline') {
        for(let i=0;i<3;i++) {mk('circle',{cx:x+w*.3+i*w*.2,cy:y+h*.14,r:6,class:'detail-knob'},g);mk('path',{d:`M${x+w*.3+i*w*.2} ${y+h*.14}v-4`,class:'detail-notch'},g);}
        mk('path',{d:`M${cx-25} ${cy+35}q25 8 50-2M${cx-18} ${cy+42}l28 2`,class:'detail-scratch'},g);
      } else if(theme==='venom') {
        for(let i=0;i<4;i++)mk('path',{d:`M${x+12+i*4} ${y+12}Q${cx-i*8} ${y+h*.2} ${x+w-18-i*4} ${y+h*.4}`,class:'detail-wet'},g);
      } else {
        mk('path',{d:`M${cx-33} ${cy+31}l33 12 33-12M${cx-35} ${cy-32}l-7-10M${cx+35} ${cy-32}l7-10`,class:'detail-inlay'},g);
        for(let i=0;i<8;i++)mk('path',{d:`M${x+12+i*5} ${y+25}l-5 13`,class:'detail-hatch'},g);
      }
    });
  }
  return { mount, figure, icons };
})();

(() => {
  'use strict';
  const root = document.documentElement;
  const hero = document.querySelector('.motion-hero');
  const stage = hero.querySelector('.motion-stage');
  const scene = hero.querySelector('.shop-scene');
  const pieces = [...hero.querySelectorAll('.cloth-piece')];
  const links = [...hero.querySelectorAll('.motion-categories a')];
  const toggle = document.querySelector('#motion-toggle');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let stopped = preference.matches, pending = false;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => n*n*(3-2*n);
  function paint() {
    pending = false;
    if(stopped || document.body.classList.contains('reading')) return;
    const bounds = hero.getBoundingClientRect();
    const progress = clamp(-bounds.top / Math.max(1, hero.offsetHeight - stage.offsetHeight));
    const zoom = ease(clamp((progress-.13)/.62));
    const door = ease(clamp((progress-.62)/.24));
    const scale = 1 + zoom * (innerWidth<700 ? 5 : 3.2);
    scene.style.transform = `translate(-50%,-50%) scale(${scale}) translate(${-21.6*zoom}%,${-12.1*zoom}%)`;
    stage.style.setProperty('--door', `${-83*door}deg`);
    stage.style.setProperty('--door-light',1-.45*door);
    stage.style.setProperty('--copy',1-clamp(progress/.25));
    stage.style.setProperty('--clothes',1-clamp((progress-.08)/.52));
    stage.style.setProperty('--exit',ease(clamp((progress-.9)/.1)));
    pieces.forEach((piece,i)=>{
      const depth=Number(piece.style.getPropertyValue('--depth'));
      piece.style.transform=`translate(calc(-50% + ${(i%2?1:-1)*progress*150*depth}px),calc(-50% + ${-progress*90*depth}px)) rotate(calc(var(--r) + ${progress*(i%2?18:-18)}deg))`;
    });
    // Keep both real links inside the viewport and keyboard reachable throughout.
    links.forEach((link,i)=>link.style.transform=`translateX(${(i?1:-1)*Math.sin(progress*Math.PI)* (innerWidth<700?8:55)}px)`);
    hero.dataset.progress=progress.toFixed(3);
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(paint);}}
  function applyMode(){
    root.classList.add('motion-enabled');
    root.classList.toggle('motion-off',stopped);
    toggle.setAttribute('aria-pressed',String(stopped));
    toggle.dataset.ko=stopped?'모션 켜기':'모션 끄기';
    toggle.dataset.en=stopped?'Turn motion on':'Turn motion off';
    toggle.textContent=root.lang==='en'?toggle.dataset.en:toggle.dataset.ko;
    const guide=hero.querySelector('.motion-bottom p');
    guide.dataset.ko=stopped?'모션을 끈 상태입니다. 이야기를 바로 골라보세요.':'아래로 스크롤하면, 세탁소 문이 열립니다.';
    guide.dataset.en=stopped?'Motion is off. Choose a story whenever you like.':'Scroll down to open the laundry door.';
    guide.textContent=root.lang==='en'?guide.dataset.en:guide.dataset.ko;
    schedule();
  }
  toggle.addEventListener('click',()=>{stopped=!stopped;applyMode();});
  preference.addEventListener('change',e=>{stopped=e.matches;applyMode();});
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('hashchange',schedule);
  applyMode();
})();
